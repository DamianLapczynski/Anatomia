// Tryb „Nauka”: małe sektory mięśni (grupy z bazy wiedzy) oraz śledzenie drogi nerwu z mięśniami, które unerwia.
import * as THREE from 'three';
import { REGIONS, COMPLEXES, JOINTS } from './model.js';
import { store } from './store.js';
import { prefs } from './settings.js';
import { mine, isLearning, toggleLearning, addLearning, clearLearning, saveSet, deleteSet } from './mine.js';

const PALETTE = ['#ff6b4a', '#4c9dff', '#3ecf8e', '#ffb454', '#c084fc', '#f472b6', '#22d3ee', '#a3e635', '#fb7185', '#facc15', '#60a5fa', '#34d399', '#f97316'];

export function initLearn(ctx) {
  const { engine, model, view, applyView, panelBody, esc, card, MUSCLES, NERVES } = ctx;
  const S = { screen: 'home', kind: null, id: null, step: -1, side: prefs().side };
  const p = (t) => (t ? `<p>${esc(t)}</p>` : '');
  const depth = (k) => (MUSCLES[k].sup ? 'powierzchowny' : 'głęboki');

  // sektory = grupy (grp) w kolejności bazy, pogrupowane okolicami
  const sectors = new Map();
  for (const [k, m] of Object.entries(MUSCLES)) { if (!sectors.has(m.grp)) sectors.set(m.grp, { name: m.grp, reg: m.reg, keys: [] }); sectors.get(m.grp).keys.push(k); }
  const nerveMuscles = (nk) => {
    const keys = model.nerveMuscleKeys(nk);
    const y = (k) => { const ids = model.muscleEntity(k, S.side).ids; return ids.length ? engine.boxOf(ids).max.y : 0; };
    return keys.sort((a, b) => y(b) - y(a)); // od bliższych do dalszych (z góry na dół)
  };
  const nerveList = Object.keys(NERVES).map((k) => ({ k, n: NERVES[k], count: model.nerveMuscleKeys(k).length })).filter((x) => x.count && model.nerveEntity(x.k, 'r').ids.length);

  const extraIds = (cx) => (cx.extra ?? []).flatMap((n) => model.ids(n, S.side));
  // gotowe zestawy: cała okolica i jej warstwa powierzchowna
  const PRESETS = {};
  for (const [rk, rn] of REGIONS.slice(1)) {
    const all = Object.keys(MUSCLES).filter((k) => MUSCLES[k].reg === rk);
    if (!all.length) continue;
    PRESETS[`${rk}-all`] = { name: `${rn} – wszystkie mięśnie`, keys: all };
    const sup = all.filter((k) => MUSCLES[k].sup);
    if (sup.length && sup.length < all.length) PRESETS[`${rk}-sup`] = { name: `${rn} – warstwa powierzchowna`, keys: sup };
  }
  const valid = (keys) => keys.filter((k) => MUSCLES[k]);
  /** Zestaw: 'learning' (Uczę się), 'set:<id>' (własny), 'preset:<id>' (gotowy). */
  function custom(id) {
    if (id === 'learning') return { title: 'Uczę się', keys: valid(mine().learning), sub: 'Struktury zaznaczone gwiazdką' };
    if (id.startsWith('set:')) { const st = mine().sets.find((x) => `set:${x.id}` === id); return { title: st?.name ?? 'Zestaw', keys: valid(st?.keys ?? []), sub: 'Mój zestaw', set: st }; }
    const pr = PRESETS[id.slice(7)]; return { title: pr?.name ?? 'Zestaw', keys: valid(pr?.keys ?? []), sub: 'Gotowy zestaw' };
  }
  const cur = () => (S.kind === 'custom' ? custom(S.id) : S.kind === 'sector' ? { title: S.id, keys: sectors.get(S.id).keys, sub: 'Sektor mięśni' }
    : S.kind === 'complex' ? { title: COMPLEXES[S.id].pl, keys: COMPLEXES[S.id].keys, sub: COMPLEXES[S.id].lat, extra: extraIds(COMPLEXES[S.id]), cx: COMPLEXES[S.id],
      cxNerves: (COMPLEXES[S.id].nerves ?? []).flatMap((k) => (NERVES[k].mesh.length ? model.nerveEntity(k, S.side).ids : [])) } : { title: NERVES[S.id].pl, keys: nerveMuscles(S.id), sub: `${NERVES[S.id].lat} · ${NERVES[S.id].roots}`, nerve: ((e) => (e.textOnly ? { ids: [], nervePath: [] } : e))(model.nerveEntity(S.id, S.side)) });

  const lidOf = (kind, id) => `${kind}~${id}`;
  const prog = (kind, id) => { const r = store.get('learn', lidOf(kind, id)); return !r ? '' : r.done ? `<span class="prog">✔ ${r.best}%</span> · ` : r.best != null ? `<span class="prog seen">${r.best}%</span> · ` : r.seen ? '<span class="prog seen">przerobione</span> · ' : ''; };
  store.on((ns, id, remote) => { if ((ns === 'learn' || (ns === 'settings' && id === 'learnsets')) && remote && ctx.modeIs('learn') && S.screen === 'home') { S.keepScroll = true; home(); } });
  // które sekcje są rozwinięte – wygoda tego urządzenia, więc localStorage
  const OPEN_KEY = 'anatomia.learn.open';
  let open; try { open = new Set(JSON.parse(localStorage.getItem(OPEN_KEY)) ?? []); } catch { open = new Set(); }
  const sec = (id, title, count, body) => `<details class="sec" data-sec="${id}" ${open.has(id) ? 'open' : ''}><summary><span>${title}</span><small>${count}</small></summary><div class="list">${body}</div></details>`;
  const star = (k) => `<button class="star ${isLearning(k) ? 'on' : ''}" data-mark="${esc(k)}" aria-pressed="${isLearning(k)}" title="${isLearning(k) ? 'Usuń z „Uczę się”' : 'Dodaj do „Uczę się”'}">${isLearning(k) ? '★' : '☆'}</button>`;

  function home() {
    S.screen = 'home'; S.step = -1; view.iso = null; view.tints.clear(); applyView();
    const scroll = panelBody.scrollTop;
    const my = mine(), learning = valid(my.learning);
    let h = '<h2>Nauka</h2><p class="en">Małe porcje zamiast całego ciała naraz: wybierz sektor mięśni albo nerw i przejdź go krok po kroku, a potem sprawdź się w quizie z tego samego zakresu.</p>';
    // Moje: Uczę się + własne zestawy
    h += `<div class="card mine"><h5>★ Uczę się</h5>${learning.length
      ? `<p>${learning.length} ${learning.length === 1 ? 'mięsień' : learning.length < 5 ? 'mięśnie' : 'mięśni'}: ${learning.slice(0, 6).map((k) => esc(MUSCLES[k].pl.replace(/^Mięsień /, 'm. '))).join(', ')}${learning.length > 6 ? '…' : ''}</p>
         <div class="acts"><button class="primary" data-custom="learning">Ucz się po kolei</button><button data-act="quiz-learning">Quiz</button></div>
         <div class="saveset"><input id="setName" type="text" maxlength="60" placeholder="Nazwa zestawu" aria-label="Nazwa nowego zestawu"><button data-act="save-set">Zapisz jako zestaw</button></div>`
      : '<p class="en">Zaznacz gwiazdką ☆ mięśnie, których się uczysz – na liście sektora albo nerwu, w widoku krok po kroku lub w Atlasie. Trafią tutaj, a stąd możesz przejść je po kolei, zrobić z nich quiz albo zapisać jako zestaw.</p>'}</div>`;
    if (my.sets.length) h += `<h4>Moje zestawy</h4><div class="list">${my.sets.map((st) => `<div class="it" data-custom="set:${esc(st.id)}"><span>${esc(st.name)}</span><small>${prog('custom', `set:${st.id}`)}${valid(st.keys).length}<button class="x" data-del-set="${esc(st.id)}" aria-label="Usuń zestaw ${esc(st.name)}" title="Usuń zestaw">✕</button></small></div>`).join('')}</div>`;
    const regName = Object.fromEntries(REGIONS);
    h += sec('presets', 'Gotowe zestawy', Object.keys(PRESETS).length, Object.entries(PRESETS).map(([k, pr]) => `<div class="it" data-custom="preset:${k}"><span>${esc(pr.name)}</span><small>${prog('custom', `preset:${k}`)}${pr.keys.length}</small></div>`).join(''));
    h += sec('nerves', 'Drogi nerwów', nerveList.length, nerveList.map((x) => `<div class="it" data-nerve="${x.k}"><span>${esc(x.n.pl)}</span><small>${prog('nerve', x.k)}${esc(x.n.roots)} · ${x.count} mięśni</small></div>`).join(''));
    h += sec('joints', 'Stawy – budowa, więzadła, testy', Object.keys(JOINTS).length, Object.entries(JOINTS).map(([k, j]) => `<div class="it" data-joint="${k}"><span>${esc(j.pl)}</span><small>${esc(regName[j.reg] ?? '')} · ${j.tests.length} test${j.tests.length === 1 ? '' : 'y'}</small></div>`).join(''));
    h += sec('complexes', 'Kompleksy, kanały i przestrzenie', Object.keys(COMPLEXES).length, Object.entries(COMPLEXES).sort(([, a], [, b]) => REGIONS.findIndex(([r]) => r === a.reg) - REGIONS.findIndex(([r]) => r === b.reg))
      .map(([k, x]) => `<div class="it" data-complex="${k}"><span>◆ ${esc(x.pl)}</span><small>${prog('complex', k)}${esc(regName[x.reg] ?? '')} · ${x.keys.length}</small></div>`).join(''));
    for (const [rk, rn] of REGIONS.slice(1)) {
      const list = [...sectors.values()].filter((st) => st.reg === rk);
      if (list.length) h += sec(`sectors-${rk}`, `Sektory – ${rn}`, list.length, list.map((st) => `<div class="it" data-sector="${esc(st.name)}"><span>${esc(st.name)}</span><small>${prog('sector', st.name)}${st.keys.length}</small></div>`).join(''));
    }
    panelBody.innerHTML = h; panelBody.scrollTop = S.keepScroll ? scroll : 0; S.keepScroll = false;
  }
  panelBody.addEventListener('toggle', (e) => {
    const d = e.target; if (!ctx.modeIs('learn') || !d.matches?.('details.sec')) return;
    if (d.open) open.add(d.dataset.sec); else open.delete(d.dataset.sec);
    try { localStorage.setItem(OPEN_KEY, JSON.stringify([...open])); } catch { /* tryb prywatny */ }
  }, true);

  async function stage(refocus = true) {
    const c = cur();
    await ctx.need('bones', 'muscles', 'nerves', 'attachments', ...new Set((c.extra ?? []).map((id) => model.meta[id].layer)));
    view.tints.clear(); view.sel.clear(); view.only = null;
    const ents = c.keys.map((k) => model.muscleEntity(k, S.side));
    const all = new Set(ents.flatMap((e) => e.ids));
    const extra = c.extra ?? [];
    if (S.step < 0) {
      const iso = { focus: all, side: S.side, others: 'ghost', bonesOnly: true, show: { path: true, nerves: true }, nerves: new Set([...(c.nerve?.ids ?? []), ...(c.cxNerves ?? [])]), path: new Set(c.nerve?.nervePath ?? []) };
      ents.forEach((e, i) => e.ids.forEach((id) => view.tints.set(id, PALETTE[i % PALETTE.length])));
      // powięzi, kaletki, troczki – jasne; naczynia zostają w swoich kolorach
      extra.forEach((id) => { iso.focus.add(id); if (!['arteries', 'veins', 'heart', 'nerves'].includes(model.meta[id].layer)) view.tints.set(id, '#e8e2d0'); });
      if (c.cx) { iso.att = new Set(ents.flatMap((e) => e.att)); iso.show.att = true; }
      view.iso = iso; applyView();
      const sx = S.side === 'l' ? -1 : 1;
      // kanały i przestrzenie (mają „zawartość”) – kadr na ich ściany z troczków i naczyń, a nie na całe mięśnie i nerwy
      if (refocus && c.cx?.dir) engine.focus(c.cx.cont && extra.length ? extra : [...all, ...extra], { pad: c.cx.cont ? 2 : 1.35, dir: new THREE.Vector3(sx * c.cx.dir[0], c.cx.dir[1], c.cx.dir[2]).normalize() });
      else if (refocus && c.cx?.zoom === 'ins') { // kompleks z przyczepem wspólnym – zbliżenie na przyczep od strony przyśrodkowej
        const ins = [...iso.att].filter((i) => model.meta[i].role === 'insertion');
        engine.focus([...extra, ...ins], { pad: 2.6, dir: new THREE.Vector3(sx * 0.8, 0.15, 0.6).normalize() });
      } else if (refocus) engine.focus([...all, ...(c.nerve?.ids ?? [])], { pad: 1.3 });
    } else {
      const e = ents[S.step];
      view.iso = { focus: new Set(e.ids), side: S.side, others: 'ghost', bonesOnly: true, show: { att: true, bones: true, nerves: true, path: true, muscles: true },
        att: new Set(e.att), bones: new Set(e.bones), nerves: new Set(c.nerve ? c.nerve.ids : e.nerves), path: new Set(c.nerve ? c.nerve.nervePath : e.nervePath), muscles: new Set() };
      for (const id of all) if (!view.iso.focus.has(id)) view.tints.set(id, '#3b5568'); // pozostałe mięśnie sektora przygaszone
      view.iso.muscles = new Set([...all].filter((id) => !view.iso.focus.has(id)));
      applyView();
      if (refocus) engine.focus([...e.ids, ...e.att], { pad: 1.9, dir: ctx.entDir(e) });
    }
  }

  function overview(refocus = true) {
    S.screen = 'group'; S.step = -1; const c = cur();
    let h = `<div class="acts" style="margin-top:0"><button data-act="home">‹ Nauka</button><button data-act="side">Strona: ${S.side === 'r' ? 'prawa' : 'lewa'}</button></div>
      <h2>${esc(c.title)}</h2><div class="lat">${esc(c.sub)}</div>
      <div class="acts"><button class="primary" data-act="start">Ucz się po kolei (${c.keys.length})</button><button data-act="quiz">Quiz z tego zakresu</button></div>
      <div class="acts">${S.id === 'learning' && S.kind === 'custom' ? '<button data-act="clear-learning">Wyczyść „Uczę się”</button>' : `<button data-act="learn-all">☆ Wszystkie do „Uczę się”</button>`}${c.set ? `<button data-del-set="${esc(c.set.id)}">Usuń zestaw</button>` : ''}</div>`;
    if (S.kind === 'nerve') { const n = NERVES[S.id]; h += card('Droga nerwu', p(n.course), '#f5cc33') + card('Uszkodzenie – objawy', p(n.palsy), null, 'clin'); }
    const cx = S.kind === 'complex' ? COMPLEXES[S.id] : null;
    if (cx) h += card('Położenie', p(cx.loc), '#e62929') + card('Zawartość', p(cx.cont), '#4c9dff') + card('Unerwienie', p(cx.n), '#f5cc33') + card('Czynność', `<ul>${cx.f.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`, '#3ecf8e');
    h += card(S.kind === 'nerve' ? 'Mięśnie unerwiane – w kolejności wzdłuż nerwu' : S.kind === 'custom' ? 'Mięśnie zestawu' : 'Mięśnie sektora', `<div class="list">${c.keys.map((k, i) => `<div class="it" data-step="${i}"><span><i class="dot" style="display:inline-block;background:${PALETTE[i % PALETTE.length]};margin-right:8px"></i>${esc(MUSCLES[k].pl)}</span><small>${esc(MUSCLES[k].lat)} · ${depth(k)}${star(k)}</small></div>`).join('')}</div>`);
    if (S.kind === 'nerve' && NERVES[S.id].tip) h += card('Skojarzenie', p(NERVES[S.id].tip), null, 'tip');
    if (cx) h += card('Klinika i fizjoterapia', p(cx.k), null, 'clin') + card('Skojarzenie', p(cx.s), null, 'tip') + ctx.noteCard(`complex:${S.id}`, cx.pl);
    panelBody.innerHTML = h; panelBody.scrollTop = 0;
    stage(refocus);
  }

  function stepView(refocus = true) {
    S.screen = 'step'; const c = cur(), k = c.keys[S.step], m = MUSCLES[k], n = c.keys.length;
    panelBody.innerHTML = `<div class="acts" style="margin-top:0"><button data-act="group">‹ ${esc(c.title.length > 26 ? 'Lista' : c.title)}</button><span class="tag" style="align-self:center">${S.step + 1} / ${n}</span></div>
      <h2>${esc(m.pl)}</h2><div class="lat">${esc(m.lat)}</div>
      <div class="tags"><span class="tag">${esc(m.grp)}</span><span class="tag">${depth(k)}</span></div>
      <div class="acts"><button data-act="prev" ${S.step === 0 ? 'disabled' : ''}>‹ Poprzedni</button><button class="primary" data-act="next">${S.step === n - 1 ? 'Koniec – quiz →' : 'Następny ›'}</button><button data-act="atlas">Atlas</button><button class="${isLearning(k) ? 'on' : ''}" data-mark="${esc(k)}" aria-pressed="${isLearning(k)}">${isLearning(k) ? '★ Uczę się' : '☆ Uczę się'}</button></div>
      ${card('Przyczep początkowy', p(m.o), '#e62929')}${card('Przyczep końcowy', p(m.i), '#266bf2')}
      ${card('Unerwienie', p(m.n), '#f5cc33')}
      ${card('Czynność', `<ul>${m.f.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`, '#3ecf8e')}
      ${ctx.examCards(m)}${card('Klinika i fizjoterapia', p(m.k), null, 'clin')}${card('Skojarzenie', p(m.s), null, 'tip')}${ctx.noteCard(`muscle:${k}`, m.pl)}`;
    panelBody.scrollTop = 0;
    stage(refocus);
  }

  // odświeżenie bieżącego ekranu bez przewijania na górę i bez przestawiania kamery
  function rerender() {
    const sc = panelBody.scrollTop;
    if (S.screen === 'home') { S.keepScroll = true; home(); return; }
    if (S.screen === 'group') { const c = cur(); if (!c.keys.length) return home(); overview(false); }
    else if (S.screen === 'step') { const c = cur(); if (S.step >= c.keys.length) return overview(); stepView(false); }
    panelBody.scrollTop = sc;
  }
  panelBody.addEventListener('keydown', (e) => { if (ctx.modeIs('learn') && e.key === 'Enter' && e.target.id === 'setName') { e.preventDefault(); panelBody.querySelector('[data-act="save-set"]')?.click(); } });
  panelBody.addEventListener('click', (e) => {
    if (!ctx.modeIs('learn')) return;
    const t = e.target, X = t.closest('[data-complex]'), N = t.closest('[data-nerve]'), C = t.closest('[data-sector]'), P = t.closest('[data-step]'), A = t.closest('[data-act]');
    const J = t.closest('[data-joint]'), M = t.closest('[data-mark]'), U = t.closest('[data-custom]'), D = t.closest('[data-del-set]');
    if (M) { // gwiazdka – nie otwiera wiersza, na którym leży
      const on = toggleLearning(M.dataset.mark); ctx.hint(on ? 'Dodano do „Uczę się”' : 'Usunięto z „Uczę się”', on ? 'ok' : '', 1400);
      return rerender();
    }
    if (D) {
      const st = mine().sets.find((x) => x.id === D.dataset.delSet);
      if (st && confirm(`Usunąć zestaw „${st.name}”?`)) { deleteSet(st.id); if (S.kind === 'custom' && S.id === `set:${st.id}`) home(); else rerender(); }
      return;
    }
    if (U) {
      const c = custom(U.dataset.custom);
      if (!c.keys.length) return ctx.hint('Ten zestaw jest pusty – zaznacz mięśnie gwiazdką ☆', 'bad');
      S.kind = 'custom'; S.id = U.dataset.custom; return overview();
    }
    if (J) { ctx.setMode('atlas'); ctx.select(model.jointEntity(J.dataset.joint, S.side), { isolate: true }); return; }
    if (X) { S.kind = 'complex'; S.id = X.dataset.complex; overview(); }
    else if (N) { S.kind = 'nerve'; S.id = N.dataset.nerve; overview(); }
    else if (C) { S.kind = 'sector'; S.id = C.dataset.sector; overview(); }
    else if (P) { S.step = +P.dataset.step; stepView(); }
    else if (A) {
      const a = A.dataset.act, c = S.kind ? cur() : null;
      if (a === 'home') home();
      else if (a === 'quiz-learning') { const c2 = custom('learning'); if (c2.keys.length) ctx.quizScoped(c2.keys, 'Uczę się', lidOf('custom', 'learning')); }
      else if (a === 'save-set') {
        const name = panelBody.querySelector('#setName')?.value ?? '', keys = valid(mine().learning);
        if (!keys.length) return;
        saveSet(name || `Zestaw ${new Date().toLocaleDateString('pl-PL')}`, keys); ctx.hint('Zapisano zestaw', 'ok'); S.keepScroll = true; home();
      } else if (a === 'learn-all') { const n = addLearning(c.keys); ctx.hint(n ? `Dodano ${n} do „Uczę się”` : 'Wszystkie są już w „Uczę się”', 'ok'); rerender(); }
      else if (a === 'clear-learning') { if (confirm('Wyczyścić listę „Uczę się”?')) { clearLearning(); home(); } }
      else if (a === 'group') overview();
      else if (a === 'side') { S.side = S.side === 'r' ? 'l' : 'r'; overview(); }
      else if (a === 'start') { S.step = 0; stepView(); }
      else if (a === 'prev') { S.step--; stepView(); }
      else if (a === 'next') {
        if (S.step < c.keys.length - 1) { S.step++; stepView(); }
        else { const lid = lidOf(S.kind, S.id), prev = store.get('learn', lid); if (!prev?.seen) store.put('learn', lid, { ...(prev ?? {}), seen: true }); ctx.quizScoped(c.keys, c.title, lid); }
      } else if (a === 'quiz') ctx.quizScoped(c.keys, c.title, lidOf(S.kind, S.id));
      else if (a === 'atlas') { const ent = model.muscleEntity(c.keys[S.step], S.side); ctx.setMode('atlas'); ctx.select(ent, { isolate: true }); }
    }
  });

  return {
    enter() { if (S.screen === 'step') stepView(); else if (S.screen === 'group') overview(); else home(); },
    leave() { view.iso = null; view.tints.clear(); },
    onPick(hit) {
      if (!hit || S.screen === 'home') return true;
      const ent = model.entityOf(hit.id), c = cur();
      if (ent.type === 'muscle' && c.keys.includes(ent.key)) { S.step = c.keys.indexOf(ent.key); stepView(); }
      else ctx.hint(`${ent.title}${ent.lat ? ` – ${ent.lat}` : ''}`);
      return true;
    },
    openNerve(k) { S.kind = 'nerve'; S.id = k; S.screen = 'group'; },
    openComplex(k) { S.kind = 'complex'; S.id = k; S.screen = 'group'; },
  };
}
