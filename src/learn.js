// Tryb „Nauka”: małe sektory mięśni (grupy z bazy wiedzy) oraz śledzenie drogi nerwu z mięśniami, które unerwia.
import * as THREE from 'three';
import { REGIONS, COMPLEXES } from './model.js';
import { store } from './store.js';
import { prefs } from './settings.js';

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
  const cur = () => (S.kind === 'sector' ? { title: S.id, keys: sectors.get(S.id).keys, sub: 'Sektor mięśni' }
    : S.kind === 'complex' ? { title: COMPLEXES[S.id].pl, keys: COMPLEXES[S.id].keys, sub: COMPLEXES[S.id].lat, extra: extraIds(COMPLEXES[S.id]), cx: COMPLEXES[S.id],
      cxNerves: (COMPLEXES[S.id].nerves ?? []).flatMap((k) => (NERVES[k].mesh.length ? model.nerveEntity(k, S.side).ids : [])) } : { title: NERVES[S.id].pl, keys: nerveMuscles(S.id), sub: `${NERVES[S.id].lat} · ${NERVES[S.id].roots}`, nerve: ((e) => (e.textOnly ? { ids: [], nervePath: [] } : e))(model.nerveEntity(S.id, S.side)) });

  const lidOf = (kind, id) => `${kind}~${id}`;
  const prog = (kind, id) => { const r = store.get('learn', lidOf(kind, id)); return !r ? '' : r.done ? `<span class="prog">✔ ${r.best}%</span> · ` : r.best != null ? `<span class="prog seen">${r.best}%</span> · ` : r.seen ? '<span class="prog seen">przerobione</span> · ' : ''; };
  store.on((ns, id, remote) => { if (ns === 'learn' && remote && ctx.modeIs('learn') && S.screen === 'home') home(); });
  function home() {
    S.screen = 'home'; S.step = -1; view.iso = null; view.tints.clear(); applyView();
    let h = '<h2>Nauka</h2><p class="en">Małe porcje zamiast całego ciała naraz: wybierz sektor mięśni albo nerw i przejdź go krok po kroku, a potem sprawdź się w quizie z tego samego zakresu.</p>';
    h += '<h4>Drogi nerwów</h4><div class="list">' + nerveList.map((x) => `<div class="it" data-nerve="${x.k}"><span>${esc(x.n.pl)}</span><small>${prog('nerve', x.k)}${esc(x.n.roots)} · ${x.count} mięśni</small></div>`).join('') + '</div>';
    const regName = Object.fromEntries(REGIONS);
    h += '<h4>Kompleksy, kanały i przestrzenie</h4><div class="list">' + Object.entries(COMPLEXES).sort(([, a], [, b]) => REGIONS.findIndex(([r]) => r === a.reg) - REGIONS.findIndex(([r]) => r === b.reg))
      .map(([k, x]) => `<div class="it" data-complex="${k}"><span>◆ ${esc(x.pl)}</span><small>${prog('complex', k)}${esc(regName[x.reg] ?? '')} · ${x.keys.length}</small></div>`).join('') + '</div>';
    for (const [rk, rn] of REGIONS.slice(1)) {
      h += `<h4>Sektory – ${rn}</h4><div class="list">` + [...sectors.values()].filter((s) => s.reg === rk).map((s) => `<div class="it" data-sector="${esc(s.name)}"><span>${esc(s.name)}</span><small>${prog('sector', s.name)}${s.keys.length}</small></div>`).join('') + '</div>';
    }
    panelBody.innerHTML = h; panelBody.scrollTop = 0;
  }

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

  function overview() {
    S.screen = 'group'; S.step = -1; const c = cur();
    let h = `<div class="acts" style="margin-top:0"><button data-act="home">‹ Nauka</button><button data-act="side">Strona: ${S.side === 'r' ? 'prawa' : 'lewa'}</button></div>
      <h2>${esc(c.title)}</h2><div class="lat">${esc(c.sub)}</div>
      <div class="acts"><button class="primary" data-act="start">Ucz się po kolei (${c.keys.length})</button><button data-act="quiz">Quiz z tego zakresu</button></div>`;
    if (S.kind === 'nerve') { const n = NERVES[S.id]; h += card('Droga nerwu', p(n.course), '#f5cc33') + card('Uszkodzenie – objawy', p(n.palsy), null, 'clin'); }
    const cx = S.kind === 'complex' ? COMPLEXES[S.id] : null;
    if (cx) h += card('Położenie', p(cx.loc), '#e62929') + card('Zawartość', p(cx.cont), '#4c9dff') + card('Unerwienie', p(cx.n), '#f5cc33') + card('Czynność', `<ul>${cx.f.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`, '#3ecf8e');
    h += card(S.kind === 'nerve' ? 'Mięśnie unerwiane – w kolejności wzdłuż nerwu' : 'Mięśnie sektora', `<div class="list">${c.keys.map((k, i) => `<div class="it" data-step="${i}"><span><i class="dot" style="display:inline-block;background:${PALETTE[i % PALETTE.length]};margin-right:8px"></i>${esc(MUSCLES[k].pl)}</span><small>${esc(MUSCLES[k].lat)} · ${depth(k)}</small></div>`).join('')}</div>`);
    if (S.kind === 'nerve' && NERVES[S.id].tip) h += card('Skojarzenie', p(NERVES[S.id].tip), null, 'tip');
    if (cx) h += card('Klinika i fizjoterapia', p(cx.k), null, 'clin') + card('Skojarzenie', p(cx.s), null, 'tip');
    panelBody.innerHTML = h; panelBody.scrollTop = 0;
    stage();
  }

  function stepView() {
    S.screen = 'step'; const c = cur(), k = c.keys[S.step], m = MUSCLES[k], n = c.keys.length;
    panelBody.innerHTML = `<div class="acts" style="margin-top:0"><button data-act="group">‹ ${esc(c.title.length > 26 ? 'Lista' : c.title)}</button><span class="tag" style="align-self:center">${S.step + 1} / ${n}</span></div>
      <h2>${esc(m.pl)}</h2><div class="lat">${esc(m.lat)}</div>
      <div class="tags"><span class="tag">${esc(m.grp)}</span><span class="tag">${depth(k)}</span></div>
      <div class="acts"><button data-act="prev" ${S.step === 0 ? 'disabled' : ''}>‹ Poprzedni</button><button class="primary" data-act="next">${S.step === n - 1 ? 'Koniec – quiz →' : 'Następny ›'}</button><button data-act="atlas">Atlas</button></div>
      ${card('Przyczep początkowy', p(m.o), '#e62929')}${card('Przyczep końcowy', p(m.i), '#266bf2')}
      ${card('Unerwienie', p(m.n), '#f5cc33')}
      ${card('Czynność', `<ul>${m.f.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`, '#3ecf8e')}
      ${card('Klinika i fizjoterapia', p(m.k), null, 'clin')}${card('Skojarzenie', p(m.s), null, 'tip')}`;
    panelBody.scrollTop = 0;
    stage();
  }

  panelBody.addEventListener('click', (e) => {
    if (!ctx.modeIs('learn')) return;
    const t = e.target, X = t.closest('[data-complex]'), N = t.closest('[data-nerve]'), C = t.closest('[data-sector]'), P = t.closest('[data-step]'), A = t.closest('[data-act]');
    if (X) { S.kind = 'complex'; S.id = X.dataset.complex; overview(); }
    else if (N) { S.kind = 'nerve'; S.id = N.dataset.nerve; overview(); }
    else if (C) { S.kind = 'sector'; S.id = C.dataset.sector; overview(); }
    else if (P) { S.step = +P.dataset.step; stepView(); }
    else if (A) {
      const a = A.dataset.act, c = S.kind ? cur() : null;
      if (a === 'home') home();
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
