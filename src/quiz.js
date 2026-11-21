// Quiz na modelu 3D: wskaż strukturę, rozpoznaj podświetloną, pytania o fakty.
import { polishName } from './data/names.js';
import { REGIONS, JOINTS } from './model.js';
import { initExam } from './exam.js';
import { store } from './store.js';
import COND from './data/conditions.js';
import { prefs } from './settings.js';

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const SYS = [['muscles', 'Mięśnie'], ['bones', 'Kości'], ['nerves', 'Nerwy'], ['arteries', 'Tętnice']];
const TYPES = [['point', 'Wskaż na modelu'], ['name', 'Rozpoznaj strukturę'], ['facts', 'Fakty o mięśniach']];
const QNAME = { point: 'wskaż', name: 'rozpoznaj', 'facts.n': 'unerwienie', 'facts.i': 'przyczep końcowy', 'facts.o': 'przyczep początkowy', 'facts.f': 'czynność', clinic: 'przypadki kliniczne', 'exam.name': 'egzamin – rozpoznaj', 'exam.fact': 'egzamin – fakty', 'exam.nerveOf': 'egzamin – unerwienie', 'exam.nerve': 'egzamin – nerwy', 'exam.joint': 'egzamin – stawy', 'exam.func': 'egzamin – testy funkcjonalne', 'exam.cond': 'egzamin – schorzenia' };
const FACTS = [
  ['n', (m) => `Co unerwia: ${m.lat}?`], ['i', (m) => `Gdzie jest przyczep końcowy: ${m.lat}?`],
  ['o', (m) => `Gdzie jest przyczep początkowy: ${m.lat}?`], ['f', (m) => `Jaka jest główna czynność: ${m.lat}?`],
];

export function initQuiz(ctx) {
  const { engine, model, view, applyView, panelBody, esc, MUSCLES, NERVES } = ctx;
  const S = { sys: 'muscles', reg: 'all', type: 'point', deep: false, side: prefs().side, ok: 0, bad: 0, streak: 0, cur: null, answered: false, last: null, scope: null };

  const superficial = (key) => model.muscleEntity(key, 'r').ids.some((i) => model.meta[i].colls.includes('Superficial muscles'));
  function pool() {
    if (S.scope) return S.scope.keys.map((k) => ({ kind: 'muscle', key: k, title: MUSCLES[k].pl, lat: MUSCLES[k].lat }));
    if (S.type === 'facts' || S.sys === 'muscles') {
      let ks = Object.keys(MUSCLES).filter((k) => S.reg === 'all' || MUSCLES[k].reg === S.reg);
      if (S.type === 'point') ks = ks.filter((k) => superficial(k) !== S.deep);
      return ks.map((k) => ({ kind: 'muscle', key: k, title: MUSCLES[k].pl, lat: MUSCLES[k].lat }));
    }
    if (S.sys === 'nerves') return Object.keys(NERVES).filter((k) => NERVES[k].mesh.length && model.nerveEntity(k, 'r').ids.length).map((k) => ({ kind: 'nerve', key: k, title: NERVES[k].pl, lat: NERVES[k].lat }));
    const layer = S.sys, out = [], seen = new Set();
    for (const m of model.meta) {
      if (m.layer !== layer || seen.has(m.n) || m.s === 'l' || (S.reg !== 'all' && m.reg !== S.reg)) continue;
      seen.add(m.n);
      const pl = polishName(m.n);
      if (!pl || /Chrząstka|Trzonowiec|Siekacz|Kieł|Przedtrzonowiec/.test(pl)) continue;
      out.push({ kind: 'struct', key: m.n, id: m.id, title: pl, lat: model.latin[m.n] ?? m.n });
    }
    return out;
  }
  const entOf = (it) => (it.kind === 'muscle' ? model.muscleEntity(it.key, S.side) : it.kind === 'nerve' ? model.nerveEntity(it.key, S.side) : model.structEntity(model.ids(it.key, model.meta[it.id].s ? S.side : '')[0] ?? it.id));
  const sameItem = (ent, it) => (it.kind === 'struct' ? ent.type === 'struct' && ent.name === it.key : ent.type === it.kind && ent.key === it.key);

  function scoreHtml() { return `<div class="score"><span>Dobrze: <b>${S.ok}</b></span><span>Źle: <b>${S.bad}</b></span><span>Seria: <b>${S.streak}</b></span></div>`; }
  function menu() {
    S.cur = null; view.only = null; view.tints.clear(); view.iso = null; applyView();
    const minPool = S.scope ? 1 : 4;
    panelBody.innerHTML = `<h2>Quiz</h2>${scoreHtml()}
      ${S.scope ? `<div class="card"><h5>Zakres</h5><p><b>${esc(S.scope.label)}</b> (${S.scope.keys.length} mięśni) <span class="link" data-act="unscope">usuń zakres</span></p></div>` : ''}
      <h4>Rodzaj pytań</h4><div class="seg" data-k="type">${TYPES.map(([k, n]) => `<button data-v="${k}" class="${S.type === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      ${S.type !== 'facts' && !S.scope ? `<h4>Układ</h4><div class="seg" data-k="sys">${SYS.map(([k, n]) => `<button data-v="${k}" class="${S.sys === k ? 'on' : ''}">${n}</button>`).join('')}</div>` : ''}
      ${(S.sys !== 'nerves' || S.type === 'facts') && !S.scope ? `<h4>Okolica</h4><div class="seg" data-k="reg">${REGIONS.map(([k, n]) => `<button data-v="${k}" class="${S.reg === k ? 'on' : ''}">${n}</button>`).join('')}</div>` : ''}
      ${S.type === 'point' && S.sys === 'muscles' && !S.scope ? `<h4>Warstwa mięśni</h4><div class="seg" data-k="deep"><button data-v="0" class="${!S.deep ? 'on' : ''}">Powierzchowne</button><button data-v="1" class="${S.deep ? 'on' : ''}">Głębokie</button></div>` : ''}
      <p class="en" style="margin-top:12px">Pula pytań: <b>${pool().length}</b></p>
      <div class="acts"><button class="primary" data-act="start" ${pool().length < minPool ? 'disabled' : ''}>Start</button><button data-act="zero">Wyzeruj wynik</button></div>
      <div class="acts"><button data-act="stats">Statystyki i słabe punkty</button><button data-act="exam">Egzamin (na czas)</button></div>
      <p class="note">${prefs().quizToSrs ? 'Błędne odpowiedzi dotyczące mięśni trafiają od razu do Powtórek.' : 'Błędne odpowiedzi nie trafiają do Powtórek (zmienisz to w Ustawieniach).'} Każda odpowiedź zapisuje się w statystykach${ctx.cloudUser?.() ? ' (synchronizowanych z kontem)' : ''}.</p>`;
  }
  // ---- statystyki z całej historii odpowiedzi ----
  const titleOf = (r) => (r.kind === 'muscle' ? MUSCLES[r.key]?.pl : r.kind === 'nerve' ? NERVES[r.key]?.pl : r.kind === 'joint' ? JOINTS[r.key]?.pl : r.kind === 'cond' ? COND[r.key]?.pl : r.kind === 'clinic' ? `Klinika: ${r.key.startsWith('root~') ? `korzeń ${r.key.slice(5)}` : NERVES[r.key.slice(6)]?.pl ?? r.key}` : polishName(r.key) ?? r.key);
  function itemStats() { // łączy typy pytań: wynik na strukturę
    const by = new Map();
    for (const r of Object.values(store.all('quiz'))) {
      if (!r.kind || (r.kind === 'muscle' && !MUSCLES[r.key])) continue;
      const k = `${r.kind}~${r.key}`, x = by.get(k) ?? { kind: r.kind, key: r.key, ok: 0, bad: 0, last: 0, q: {} };
      x.ok += r.ok ?? 0; x.bad += r.bad ?? 0; x.last = Math.max(x.last, r.last ?? 0);
      const qq = (x.q[r.q] ??= { ok: 0, bad: 0 }); qq.ok += r.ok ?? 0; qq.bad += r.bad ?? 0;
      by.set(k, x);
    }
    return [...by.values()].map((x) => ({ ...x, n: x.ok + x.bad, pct: Math.round((100 * x.ok) / Math.max(1, x.ok + x.bad)) }));
  }
  const weakList = (min = 3) => itemStats().filter((x) => x.n >= min && x.pct < 80).sort((a, b) => a.pct - b.pct || b.n - a.n);
  function stats() {
    S.cur = null; view.only = null; view.tints.clear(); view.iso = null; applyView(); ctx.home();
    const all = itemStats(), n = all.reduce((a, x) => a + x.n, 0), ok = all.reduce((a, x) => a + x.ok, 0);
    const pctBar = (p) => `<span class="bar"><i style="width:${p}%;background:${p >= 80 ? 'var(--ok)' : p >= 50 ? 'var(--warn)' : 'var(--bad)'}"></i></span>`;
    const byQ = {}, byReg = {};
    for (const r of Object.values(store.all('quiz'))) {
      if (!r.q) continue;
      const a = (byQ[r.q] ??= { ok: 0, n: 0 }); a.ok += r.ok ?? 0; a.n += (r.ok ?? 0) + (r.bad ?? 0);
      const reg = r.kind === 'muscle' ? MUSCLES[r.key]?.reg : r.kind === 'nerve' ? 'nv' : null;
      if (reg) { const b = (byReg[reg] ??= { ok: 0, n: 0 }); b.ok += r.ok ?? 0; b.n += (r.ok ?? 0) + (r.bad ?? 0); }
    }
    const rows = (obj, name) => Object.entries(obj).filter(([, v]) => v.n).map(([k, v]) => { const p = Math.round((100 * v.ok) / v.n); return `<div class="it"><span>${esc(name(k))}</span><small>${pctBar(p)} ${p}% · ${v.n}</small></div>`; }).join('');
    const weak = weakList();
    const weakM = weak.filter((x) => x.kind === 'muscle');
    panelBody.innerHTML = `<div class="acts" style="margin-top:0"><button data-act="menu">‹ Quiz</button></div><h2>Statystyki</h2>
      ${n ? `<div class="stat"><div><b>${n}</b>odpowiedzi</div><div><b>${Math.round((100 * ok) / n)}%</b>poprawnych</div><div><b>${all.length}</b>struktur</div></div>` : '<p class="en">Jeszcze nie ma odpowiedzi – zrób kilka quizów.</p>'}
      ${weakM.length ? `<div class="acts"><button class="primary" data-act="weak">Ćwicz słabe mięśnie (${Math.min(weakM.length, 20)})</button></div>` : ''}
      ${weak.length ? `<h4>Najsłabsze (min. 3 próby, poniżej 80%)</h4><div class="list">${weak.slice(0, 25).map((x) => `<div class="it"><span>${esc(titleOf(x))}</span><small>${pctBar(x.pct)} ${x.pct}% · ${x.n} · ${Object.entries(x.q).filter(([, v]) => v.bad).map(([q]) => QNAME[q] ?? q).join(', ')}</small></div>`).join('')}</div>` : ''}
      ${Object.keys(byQ).length ? `<h4>Wg rodzaju pytania</h4><div class="list">${rows(byQ, (q) => QNAME[q] ?? q)}</div>` : ''}
      ${Object.keys(byReg).length ? `<h4>Wg okolicy</h4><div class="list">${rows(byReg, (r) => (r === 'nv' ? 'Nerwy' : REGIONS.find((x) => x[0] === r)?.[1] ?? r))}</div>` : ''}`;
    panelBody.scrollTop = 0;
  }

  async function next() {
    const P = pool(); if (P.length < (S.scope ? 1 : 4)) return menu();
    const ALL = Object.keys(MUSCLES).map((k) => ({ kind: 'muscle', key: k, title: MUSCLES[k].pl, lat: MUSCLES[k].lat })); // rezerwa błędnych odpowiedzi dla małych zakresów
    let it; do { it = P[Math.floor(Math.random() * P.length)]; } while (S.last && it.key === S.last && P.length > 1);
    S.last = it.key; S.answered = false; view.tints.clear(); view.iso = null; view.sel.clear();
    const ent = entOf(it);
    const layer = it.kind === 'muscle' ? 'muscles' : it.kind === 'nerve' ? 'nerves' : S.sys;
    await ctx.need('bones', layer);
    if (S.type === 'point') {
      const reg = it.kind === 'muscle' ? MUSCLES[it.key].reg : it.kind === 'struct' ? model.meta[it.id].reg : null;
      const only = new Set();
      for (const m of model.meta) {
        if (m.s && m.s !== S.side) continue;
        if (m.layer === 'bones' && (layer !== 'bones' || !reg || S.reg === 'all' || m.reg === reg)) only.add(m.id);
        else if (m.layer === layer && (S.reg === 'all' || !reg || m.reg === reg)) {
          if (S.scope) { if (!S.scope.ids.has(m.id)) continue; } else if (layer === 'muscles' && S.deep && m.colls.includes('Superficial muscles')) continue;
          only.add(m.id);
        }
      }
      view.only = only; applyView();
      if (S.reg !== 'all') engine.focus([...only].filter((i) => model.meta[i].layer === layer), { pad: 1.15 }); else ctx.home();
      S.cur = { it, ent };
      panelBody.innerHTML = `${scoreHtml()}<p class="en">Wskaż na modelu:</p><div class="qtext">${esc(it.title)}</div><div class="lat">${esc(it.lat)}</div>
        <div id="fb"></div><div class="acts"><button data-act="skip">Nie wiem – pokaż</button><button data-act="menu">Zakończ</button></div>`;
      ctx.hint(`Wskaż: ${it.title}`, '', 0);
    } else if (S.type === 'name') {
      view.only = null;
      view.iso = { focus: new Set(ent.ids), side: S.side, others: 'ghost', show: {} };
      ent.ids.forEach((i) => view.tints.set(i, '#35c98a'));
      applyView(); engine.focus(ent.ids, { pad: 2.6, dir: ctx.entDir(ent) });
      const pick = shuffle(P.filter((x) => x.key !== it.key)); if (pick.length < 3 && it.kind === 'muscle') pick.push(...shuffle(ALL.filter((x) => x.key !== it.key && !pick.some((q) => q.key === x.key) && MUSCLES[x.key].reg === MUSCLES[it.key].reg)));
      const opts = shuffle([it, ...pick.slice(0, 3)]);
      S.cur = { it, ent, opts };
      panelBody.innerHTML = `${scoreHtml()}<div class="qtext">Co to za struktura (podświetlona na zielono)?</div>
        <div class="opts">${opts.map((o, i) => `<button data-opt="${i}"><b>${esc(o.title)}</b><br><span class="lat">${esc(o.lat)}</span></button>`).join('')}</div>
        <div id="fb"></div><div class="acts"><button data-act="menu">Zakończ</button></div>`;
    } else {
      const [field, ask] = FACTS[Math.floor(Math.random() * FACTS.length)];
      const val = (k) => { const v = MUSCLES[k][field]; return Array.isArray(v) ? v[0] : v; };
      const right = val(it.key), used = new Set([right]), opts = [{ t: right, ok: true }];
      for (const o of shuffle(P.filter((x) => x.key !== it.key && MUSCLES[x.key].grp === MUSCLES[it.key].grp).concat(shuffle(P.slice()), shuffle(ALL.filter((x) => MUSCLES[x.key].reg === MUSCLES[it.key].reg)), shuffle(ALL.slice())))) {
        if (o.key === it.key) continue;
        const v = val(o.key); if (!v || used.has(v)) continue; used.add(v); opts.push({ t: v }); if (opts.length === 4) break;
      }
      view.only = null; view.iso = { focus: new Set(ent.ids), side: S.side, others: 'ghost', show: {} }; applyView(); engine.focus(ent.ids, { pad: 2.2, dir: ctx.entDir(ent) });
      S.cur = { it, ent, opts: shuffle(opts), field };
      panelBody.innerHTML = `${scoreHtml()}<div class="qtext">${esc(ask(MUSCLES[it.key]))}</div><p class="en">${esc(it.title)}</p>
        <div class="opts">${S.cur.opts.map((o, i) => `<button data-opt="${i}">${esc(o.t)}</button>`).join('')}</div>
        <div id="fb"></div><div class="acts"><button data-act="menu">Zakończ</button></div>`;
    }
    panelBody.scrollTop = 0;
  }

  function record(ok) {
    const it = S.cur.it, q = S.type === 'facts' ? `facts.${S.cur.field}` : S.type;
    store.inc('quiz', `${it.kind}~${it.key}~${q}`, ok ? { ok: 1 } : { bad: 1 }, { kind: it.kind, key: it.key, q });
    const sc = S.scope; if (!sc?.lid) return;
    sc.n++; if (ok) sc.ok++;
    if (sc.n >= Math.max(5, sc.keys.length)) { // wynik zakresu z Nauki: co najmniej jedno pytanie na mięsień
      const pct = Math.round((100 * sc.ok) / sc.n), prev = store.get('learn', sc.lid) ?? {};
      if (pct > (prev.best ?? -1) || (pct >= 80 && !prev.done)) store.put('learn', sc.lid, { ...prev, done: prev.done || pct >= 80, best: Math.max(pct, prev.best ?? 0) });
    }
  }
  function finish(ok, extra = '') {
    S.answered = true; record(ok);
    if (ok) { S.ok++; S.streak++; } else { S.bad++; S.streak = 0; if (S.cur.it.kind === 'muscle' && prefs().quizToSrs) ctx.srsFlag?.(S.cur.it.key); }
    const it = S.cur.it;
    ctx.hint(ok ? 'Dobrze!' : `Źle – to: ${it.title}`, ok ? 'ok' : 'bad', 2500);
    const fb = panelBody.querySelector('#fb');
    panelBody.querySelector('[data-act="skip"]')?.parentElement.remove();
    panelBody.querySelectorAll('.acts [data-act="menu"]').forEach((b) => { if (b.parentElement.children.length === 1) b.parentElement.remove(); });
    if (fb) fb.innerHTML = `<div class="card ${ok ? '' : 'clin'}"><h5>${ok ? '✔ Dobrze' : '✘ Poprawna odpowiedź'}</h5><p><b>${esc(it.title)}</b> – <span class="lat">${esc(it.lat)}</span></p>${extra}</div>${about(it)}
      <div class="acts"><button class="primary" data-act="next">Dalej →</button><button data-act="show">Zobacz w atlasie</button><button data-act="menu">Zakończ</button></div>`;
    panelBody.querySelector('.score')?.replaceWith(Object.assign(document.createElement('div'), { innerHTML: scoreHtml() }).firstChild);
    fb?.scrollIntoView({ block: 'nearest' });
  }
  // pełniejsza informacja po odpowiedzi – żeby każde pytanie czegoś uczyło
  function about(it) {
    const c = (t, b, col) => `<div class="card"><h5>${col ? `<i style="background:${col}"></i>` : ''}${t}</h5>${b}</div>`;
    if (it.kind === 'muscle') {
      const m = MUSCLES[it.key];
      return c('Przyczepy', `<p><b style="color:var(--orig)">Początek:</b> ${esc(m.o)}</p><p style="margin-top:5px"><b style="color:var(--ins)">Koniec:</b> ${esc(m.i)}</p>`)
        + c('Unerwienie', `<p>${esc(m.n)}</p>`, '#f5cc33') + c('Czynność', `<ul>${m.f.slice(0, 4).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`, '#3ecf8e')
        + (m.s ? `<div class="card tip"><h5>Skojarzenie</h5><p>${esc(m.s)}</p></div>` : '') + `<p class="en">${esc(m.grp)} · warstwa ${m.sup ? 'powierzchowna' : 'głęboka'}</p>`;
    }
    if (it.kind === 'nerve') { const n = NERVES[it.key]; return c('Korzenie i zakres ruchowy', `<p><b>${esc(n.roots)}</b></p><p style="margin-top:5px">${esc(n.motor)}</p>`, '#f5cc33') + `<div class="card clin"><h5>Uszkodzenie</h5><p>${esc(n.palsy)}</p></div>`; }
    return '';
  }
  function reveal() { S.cur.ent.ids.forEach((i) => view.tints.set(i, '#35c98a')); applyView(); engine.focus(S.cur.ent.ids, { pad: 2.6 }); }

  panelBody.addEventListener('click', (e) => {
    if (!ctx.modeIs('quiz')) return;
    const B = e.target.closest('[data-k] button'), A = e.target.closest('[data-act]'), O = e.target.closest('[data-opt]');
    if (B) { const k = B.parentElement.dataset.k; S[k] = k === 'deep' ? B.dataset.v === '1' : B.dataset.v; if (S.type === 'facts') S.sys = 'muscles'; menu(); }
    else if (O && !S.answered) {
      const i = +O.dataset.opt, o = S.cur.opts[i], ok = S.type === 'name' ? o.key === S.cur.it.key : !!o.ok;
      panelBody.querySelectorAll('[data-opt]').forEach((b, j) => { const oo = S.cur.opts[j]; const good = S.type === 'name' ? oo.key === S.cur.it.key : oo.ok; if (good) b.classList.add('ok'); else if (j === i) b.classList.add('bad'); b.disabled = true; });
      const kb = MUSCLES[S.cur.it.key];
      finish(ok);
    } else if (A) {
      const a = A.dataset.act;
      if (a === 'start' || a === 'next') next();
      else if (a === 'menu') menu();
      else if (a === 'stats') stats();
      else if (a === 'exam') exam.menu();
      else if (a === 'weak') { const ks = weakList().filter((x) => x.kind === 'muscle').slice(0, 20).map((x) => x.key); api.scoped(ks, 'Słabe punkty'); }
      else if (a === 'zero') { S.ok = S.bad = S.streak = 0; menu(); }
      else if (a === 'unscope') { S.scope = null; menu(); }
      else if (a === 'skip' && !S.answered) { reveal(); finish(false); }
      else if (a === 'show') { const ent = S.cur.ent; ctx.setMode('atlas'); ctx.select(ent, { isolate: true }); }
    }
  });

  const api = {
    enter: menu,
    scoped(keys, label, lid = null) { S.scope = { keys, label, lid, ok: 0, n: 0, ids: new Set(keys.flatMap((k) => model.muscleEntity(k, S.side).ids)) }; S.sys = 'muscles'; if (S.type === 'point' && keys.length < 2) S.type = 'facts'; menu(); },
    leave() { exam.leave(); view.only = null; view.tints.clear(); view.iso = null; ctx.hint('', '', 1); },
    onPick(hit) {
      if (S.type !== 'point' || !S.cur || S.answered) return true;
      if (!hit) return true;
      const ent = model.entityOf(hit.id);
      if (model.meta[hit.id].layer === 'bones' && !(S.cur.it.kind === 'struct' && S.sys === 'bones')) return true; // kość w tle – ignoruj
      const ok = sameItem(ent, S.cur.it);
      if (!ok) ent.ids.forEach((i) => view.tints.set(i, '#ff5a5a'));
      reveal();
      finish(ok, ok ? '' : `<p class="en">Wskazano: ${esc(ent.title)}</p>`);
      return true;
    },
  };
  ctx.quizMenu = menu;
  const exam = initExam(ctx);
  return api;
}
