// Tryb „Egzamin” w Quizie: stała liczba pytań mieszanych z wybranego zakresu, limit czasu, bez podpowiedzi
// do końca, na końcu wynik ogólny, wg rodzaju pytania i okolicy, lista błędów i zapis w historii.
import { PRESETS, grade } from './data/exam_presets.js';
import { JOINTS } from './model.js';
import FT from './data/func_tests.js';
import CT from './data/clinical_tests.js';
import COND from './data/conditions.js';
import { store } from './store.js';
import { prefs } from './settings.js';

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
const TYPE_PL = { cond: 'Schorzenia', name: 'Rozpoznaj mięsień', fact: 'Przyczepy, unerwienie, czynność', nerveOf: 'Który nerw unerwia', nerve: 'Nerwy: korzenie i mięśnie', joint: 'Stawy i testy', func: 'Testy funkcjonalne' };
const REG_PL = { sch: 'Schorzenia', gs: 'Głowa i szyja', tu: 'Tułów', kg: 'Kończyna górna', kd: 'Kończyna dolna', nv: 'Nerwy', st: 'Stawy', ft: 'Testy funkcjonalne' };

export function initExam(ctx) {
  const { engine, model, view, applyView, panelBody, esc, MUSCLES, NERVES } = ctx;
  const E = { preset: 'kg', count: 20, run: null, timer: 0 };
  const side = () => prefs().side;

  // ---------- generatory pytań ----------
  // każde pytanie: { type, reg, kind, key, q, sub?, opts: [{ t, ok }], stage?: () => void, explain }
  const distract = (right, pool, n = 3) => { const used = new Set([right]), out = []; for (const v of shuffle(pool.slice())) { if (!v || used.has(v)) continue; used.add(v); out.push(v); if (out.length === n) break; } return out; };
  const mk = (base, right, wrong) => ({ ...base, opts: shuffle([{ t: right, ok: true }, ...wrong.map((t) => ({ t }))]) });
  const muscleStage = (k) => () => {
    const ent = model.muscleEntity(k, side());
    view.only = null; view.tints.clear(); view.iso = { focus: new Set(ent.ids), side: side(), others: 'ghost', show: {} };
    ent.ids.forEach((i) => view.tints.set(i, '#35c98a')); applyView(); engine.focus(ent.ids, { pad: 2.6, dir: ctx.entDir(ent) });
  };
  const G = {
    name(P, muscles) {
      const k = pickOne(muscles), m = MUSCLES[k];
      const sameReg = Object.keys(MUSCLES).filter((x) => x !== k && MUSCLES[x].reg === m.reg).map((x) => MUSCLES[x].pl);
      return mk({ type: 'name', reg: m.reg, kind: 'muscle', key: k, q: 'Co to za mięsień (podświetlony na zielono)?', stage: muscleStage(k), explain: `${m.pl} – ${m.lat}` }, m.pl, distract(m.pl, sameReg));
    },
    fact(P, muscles) {
      const k = pickOne(muscles), m = MUSCLES[k];
      const [f, ask] = pickOne([['n', 'Co unerwia'], ['o', 'Przyczep początkowy'], ['i', 'Przyczep końcowy'], ['f', 'Główna czynność']]);
      const val = (x) => { const v = MUSCLES[x][f]; return Array.isArray(v) ? v[0] : v; };
      const pool = Object.keys(MUSCLES).filter((x) => x !== k && (MUSCLES[x].grp === m.grp || MUSCLES[x].reg === m.reg)).map(val);
      return mk({ type: 'fact', reg: m.reg, kind: 'muscle', key: k, q: `${ask}: ${m.pl}?`, sub: m.lat, explain: val(k) }, val(k), distract(val(k), pool));
    },
    nerveOf(P, muscles) {
      const cand = muscles.filter((k) => model.nervesOfMuscle(k).length === 1); if (!cand.length) return null;
      const k = pickOne(cand), right = NERVES[model.nervesOfMuscle(k)[0]].pl;
      const pool = (P.nerves.length ? P.nerves : Object.keys(NERVES)).filter((n) => NERVES[n]).map((n) => NERVES[n].pl);
      return mk({ type: 'nerveOf', reg: MUSCLES[k].reg, kind: 'muscle', key: k, q: `Który nerw unerwia: ${MUSCLES[k].pl}?`, sub: MUSCLES[k].lat, explain: MUSCLES[k].n }, right, distract(right, pool));
    },
    nerve(P) {
      const keys = P.nerves.filter((n) => NERVES[n]); if (keys.length < 4) return null;
      const nk = pickOne(keys), n = NERVES[nk];
      if (Math.random() < 0.5) {
        const ms = shuffle(model.nerveMuscleKeys(nk).slice()).slice(0, 3); if (ms.length < 2) return null;
        return mk({ type: 'nerve', reg: 'nv', kind: 'nerve', key: nk, q: `Który nerw unerwia mięśnie: ${ms.map((x) => MUSCLES[x].pl.replace(/^Mięsień |^Mięśnie /, '')).join(', ')}?`, explain: n.motor }, n.pl, distract(n.pl, keys.filter((x) => x !== nk && !model.nerveMuscleKeys(x).some((m) => ms.includes(m))).map((x) => NERVES[x].pl)));
      }
      const SEG = /^(C|Th|L|S)\d/; // tylko nerwy rdzeniowe – nerwy czaszkowe mają w polu roots część pnia mózgu
      if (!SEG.test(n.roots)) return null;
      return mk({ type: 'nerve', reg: 'nv', kind: 'nerve', key: nk, q: `Z jakich segmentów rdzenia pochodzi: ${n.pl}?`, sub: n.lat, explain: `${n.roots} – ${n.course}` }, n.roots, distract(n.roots, Object.values(NERVES).map((x) => x.roots).filter((r) => SEG.test(r))));
    },
    joint(P) {
      const keys = P.joints.filter((j) => JOINTS[j]); if (!keys.length) return null;
      const jk = pickOne(keys), j = JOINTS[jk], others = Object.keys(JOINTS).filter((x) => x !== jk).map((x) => JOINTS[x]);
      const kind = pickOne(['closed', 'capsular', 'test', 'type']);
      if (kind === 'test' && j.tests.length) {
        const t = pickOne(j.tests);
        return mk({ type: 'joint', reg: 'st', kind: 'joint', key: jk, q: `Co ocenia: ${t.pl}?`, sub: j.pl, explain: `${t.cel}. ${t.jak}` }, t.cel, distract(t.cel, others.flatMap((o) => o.tests.map((x) => x.cel)).concat(j.tests.filter((x) => x !== t).map((x) => x.cel))));
      }
      if (kind === 'capsular' && j.capsular !== '—') return mk({ type: 'joint', reg: 'st', kind: 'joint', key: jk, q: `Wzorzec torebkowy: ${j.pl}?`, explain: j.capsular }, j.capsular, distract(j.capsular, others.map((o) => o.capsular).filter((x) => x !== '—')));
      if (kind === 'type') return mk({ type: 'joint', reg: 'st', kind: 'joint', key: jk, q: `Budowa i osie: ${j.pl}?`, explain: j.type }, j.type.split('. ')[0], distract(j.type.split('. ')[0], others.map((o) => o.type.split('. ')[0])));
      if (j.closed === '—') return null;
      return mk({ type: 'joint', reg: 'st', kind: 'joint', key: jk, q: `Pozycja zamknięta (najciaśniejsza): ${j.pl}?`, explain: j.closed }, j.closed, distract(j.closed, others.map((o) => o.closed).filter((x) => x !== '—')));
    },
  };
  G.func = (P) => {
    // połowa pytań z testów klinicznych z zajęć (co ocenia, który test, co sugeruje wynik dodatni)
    if (!P.func && Math.random() < 0.5) {
      const ck = Object.keys(CT), k = pickOne(ck), t = CT[k], others = ck.filter((x) => x !== k).map((x) => CT[x]);
      const base = { type: 'func', reg: 'ft', kind: 'functest', key: k };
      const kind = pickOne(['cel', 'which', 'plus']);
      if (kind === 'which') return mk({ ...base, q: `Który test: ${t.cel.replace(/\.$/, '')}?`, explain: `${t.pl}: ${t.wykonanie[0]}` }, t.pl, distract(t.pl, others.filter((o) => o.grp === t.grp || Math.random() < 0.3).map((o) => o.pl)));
      if (kind === 'plus') return mk({ ...base, q: `${t.pl} – co najczęściej sugeruje wynik dodatni?`, explain: t.dlaczego }, t.sugeruje, distract(t.sugeruje, others.map((o) => o.sugeruje)));
      return mk({ ...base, q: `Co ocenia ${t.pl}?`, explain: t.dlaczego }, t.cel, distract(t.cel, others.map((o) => o.cel)));
    }
    const keys = (P.func ?? Object.keys(FT)).filter((k) => FT[k]); if (keys.length < 4) return null;
    const k = pickOne(keys), t = FT[k], others = Object.keys(FT).filter((x) => x !== k).map((x) => FT[x]);
    const kind = pickOne(['cel', 'which', 'norm']);
    const base = { type: 'func', reg: 'ft', kind: 'functest', key: k };
    if (kind === 'which') return mk({ ...base, q: `Który test: ${t.cel.split(/[;:]/)[0].replace(/\.$/, '')}?`, explain: `${t.pl} (${t.skrot})` }, `${t.pl} (${t.skrot})`, distract(`${t.pl} (${t.skrot})`, others.filter((o) => o.grp === t.grp || Math.random() < 0.3).map((o) => `${o.pl} (${o.skrot})`)));
    if (kind === 'norm') {
      const [g, v] = pickOne(t.normy);
      return mk({ ...base, q: `${t.pl} (${t.skrot}) – ${g}?`, explain: t.interpretacja }, v, distract(v, others.flatMap((o) => o.normy.map(([, x]) => x)).concat(t.normy.map(([, x]) => x).filter((x) => x !== v))));
    }
    return mk({ ...base, q: `Co ocenia ${t.pl} (${t.skrot})?`, explain: t.dlaczego }, t.cel, distract(t.cel, others.map((o) => o.cel)));
  };
  G.cond = () => {
    const ck = Object.keys(COND), k = pickOne(ck), c = COND[k], others = ck.filter((x) => x !== k).map((x) => COND[x]);
    const base = { type: 'cond', reg: 'sch', kind: 'cond', key: k };
    const kind = pickOne(['which', 'mech', 'flag', 'fizjo']);
    if (kind === 'which') return mk({ ...base, q: `Objawy: ${c.objawy.slice(0, 2).map((x) => x.replace(/\.$/, '')).join('; ')}. Jakie to schorzenie?`, explain: c.def }, c.pl, distract(c.pl, others.filter((o) => o.grp === c.grp || Math.random() < 0.3).map((o) => o.pl)));
    if (kind === 'flag' && c.flagi) return mk({ ...base, q: `${c.pl} – co jest czerwoną flagą?`, explain: c.flagi }, c.flagi, distract(c.flagi, others.map((o) => o.flagi).filter(Boolean)));
    if (kind === 'fizjo') { const f = c.fizjo[0]; return mk({ ...base, q: `${c.pl} – co jest podstawą postępowania fizjoterapeutycznego?`, explain: c.fizjo.join(' ') }, f, distract(f, others.map((o) => o.fizjo[0]))); }
    return mk({ ...base, q: `${c.pl} – jak powstaje?`, explain: c.mech }, c.def, distract(c.def, others.map((o) => o.def)));
  };
  function build(P, n) {
    const muscles = [...new Set([...Object.keys(MUSCLES).filter((k) => P.regs.includes(MUSCLES[k].reg)), ...(P.extra ?? [])])];
    const types = P.types.filter((t) => (t === 'name' || t === 'fact' || t === 'nerveOf' ? muscles.length >= 4 : t === 'nerve' ? P.nerves.length >= 4 : t === 'func' || t === 'cond' ? true : P.joints.length));
    const out = [], seen = new Set();
    for (let guard = 0; out.length < n && guard < n * 30; guard++) {
      const t = types[out.length % types.length], q = G[t](P, muscles);
      if (!q || q.opts.length < 4) continue;
      const id = `${q.type}~${q.key}~${q.q}`; if (seen.has(id)) continue; seen.add(id); out.push(q);
    }
    return shuffle(out);
  }

  // ---------- ekrany ----------
  const history = () => Object.entries(store.all('learn')).filter(([id]) => id.startsWith('exam~')).map(([, v]) => v).sort((a, b) => b.date - a.date);
  function menu() {
    stop(); view.only = null; view.tints.clear(); view.iso = null; applyView(); ctx.home();
    const hist = history().slice(0, 8);
    panelBody.innerHTML = `<div class="acts" style="margin-top:0"><button data-ex="back">‹ Quiz</button></div><h2>Egzamin</h2>
      <p class="en">Pytania mieszane z wybranego zakresu, z limitem czasu i bez podpowiedzi – wynik dopiero na końcu, jak na kolokwium.</p>
      <h4>Zakres</h4><div class="list">${PRESETS.map((p) => `<div class="it col ${E.preset === p.id ? 'on' : ''}" data-ex-preset="${p.id}"><span>${esc(p.pl)}</span><small>${esc(p.desc)}</small></div>`).join('')}</div>
      <h4>Liczba pytań</h4><div class="seg">${[10, 20, 40, 60].map((n) => `<button data-ex-count="${n}" class="${E.count === n ? 'on' : ''}">${n}</button>`).join('')}</div>
      <p class="en" style="margin-top:8px">Czas: ${Math.round(E.count * 0.75)} min (45 s na pytanie).</p>
      <div class="acts"><button class="primary" data-ex="start">Rozpocznij egzamin</button></div>
      ${hist.length ? `<h4>Ostatnie wyniki</h4><div class="list">${hist.map((h) => `<div class="it"><span>${esc(h.label)}</span><small>${new Date(h.date).toLocaleDateString('pl-PL')} · ${h.pct}% · ${esc(grade(h.pct))}</small></div>`).join('')}</div>` : ''}
      <p class="note">Ocena jest orientacyjna (progi 60/69/77/85/93%). Pytania i dystraktory pochodzą z bazy aplikacji.</p>`;
    panelBody.scrollTop = 0;
  }
  function start() {
    const P = PRESETS.find((p) => p.id === E.preset), qs = build(P, E.count);
    if (!qs.length) { ctx.hint('Za mało pytań w tym zakresie', 'bad'); return; }
    E.run = { P, qs, i: 0, ans: [], t0: Date.now(), limit: Math.round(E.count * 0.75) * 60000 };
    E.timer = setInterval(tick, 1000);
    question();
  }
  function stop() { clearInterval(E.timer); E.timer = 0; }
  const left = () => Math.max(0, E.run.limit - (Date.now() - E.run.t0));
  const fmt = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  function tick() {
    if (!E.run || !ctx.modeIs('quiz')) return;
    const el = panelBody.querySelector('#exTimer'); if (el) { el.textContent = fmt(left()); el.classList.toggle('warn', left() < 60000); }
    if (left() <= 0) finish(true);
  }
  function question() {
    const R = E.run, q = R.qs[R.i];
    view.only = null; view.tints.clear(); view.iso = null;
    if (q.stage) ctx.need('bones', 'muscles').then(q.stage); else { applyView(); }
    panelBody.innerHTML = `<div class="exam-bar"><span>Pytanie <b>${R.i + 1}</b> / ${R.qs.length}</span><span class="exam-prog"><i style="width:${(100 * R.i) / R.qs.length}%"></i></span><span id="exTimer">${fmt(left())}</span></div>
      <p class="en">${esc(TYPE_PL[q.type])}</p><div class="qtext">${esc(q.q)}</div>${q.sub ? `<div class="lat">${esc(q.sub)}</div>` : ''}
      <div class="opts">${q.opts.map((o, i) => `<button data-exopt="${i}">${esc(o.t)}</button>`).join('')}</div>
      <div class="acts"><button data-ex="skip">Pomiń</button><button data-ex="end">Zakończ i oceń</button></div>`;
    panelBody.scrollTop = 0;
  }
  function answer(i) {
    const R = E.run, q = R.qs[R.i];
    R.ans[R.i] = i;
    const ok = i != null && q.opts[i].ok;
    store.inc('quiz', `${q.kind}~${q.key}~exam.${q.type}`, ok ? { ok: 1 } : { bad: 1 }, { kind: q.kind, key: q.key, q: `exam.${q.type}` });
    if (!ok && q.kind === 'muscle' && prefs().quizToSrs) ctx.srsFlag?.(q.key);
    if (++R.i >= R.qs.length) finish(false); else question();
  }
  function finish(timeout) {
    stop();
    const R = E.run; if (!R) return;
    const done = R.qs.map((q, i) => ({ q, a: R.ans[i], ok: R.ans[i] != null && q.opts[R.ans[i]].ok }));
    const ok = done.filter((x) => x.ok).length, pct = Math.round((100 * ok) / R.qs.length);
    store.put('learn', `exam~${R.t0}`, { label: R.P.pl, date: R.t0, pct, n: R.qs.length, ok, secs: Math.round((Date.now() - R.t0) / 1000) });
    const by = (f) => { const o = {}; for (const x of done) { const k = f(x.q), a = (o[k] ??= { ok: 0, n: 0 }); a.n++; if (x.ok) a.ok++; } return o; };
    const bar = (p) => `<span class="bar"><i style="width:${p}%;background:${p >= 80 ? 'var(--ok)' : p >= 60 ? 'var(--warn)' : 'var(--bad)'}"></i></span>`;
    const rows = (o, name) => Object.entries(o).map(([k, v]) => { const p = Math.round((100 * v.ok) / v.n); return `<div class="it"><span>${esc(name(k))}</span><small>${bar(p)} ${p}% · ${v.ok}/${v.n}</small></div>`; }).join('');
    const wrong = done.filter((x) => !x.ok);
    view.only = null; view.tints.clear(); view.iso = null; applyView(); ctx.home();
    panelBody.innerHTML = `<div class="acts" style="margin-top:0"><button data-ex="menu">‹ Egzamin</button></div>
      <h2>Wynik: ${pct}%</h2><div class="lat">${esc(R.P.pl)} · ocena orientacyjna ${esc(grade(pct))}${timeout ? ' · koniec czasu' : ''}</div>
      <div class="stat"><div><b>${ok}</b>dobrze</div><div><b>${wrong.length}</b>źle / pominięte</div><div><b>${fmt(Date.now() - R.t0)}</b>czas</div></div>
      <h4>Wg rodzaju pytania</h4><div class="list">${rows(by((q) => q.type), (k) => TYPE_PL[k])}</div>
      <h4>Wg okolicy</h4><div class="list">${rows(by((q) => q.reg), (k) => REG_PL[k] ?? k)}</div>
      ${wrong.length ? `<h4>Do powtórki (${wrong.length})</h4>${wrong.map((x) => `<div class="card clin exam-wrong" data-ex-open="${x.q.kind}:${esc(x.q.key)}"><p><b>${esc(x.q.q)}</b></p>${x.a != null ? `<p>Twoja odpowiedź: ${esc(x.q.opts[x.a].t)}</p>` : '<p>Pominięte</p>'}<p>Poprawnie: <b>${esc(x.q.opts.find((o) => o.ok).t)}</b></p><p class="note">${esc(x.q.explain ?? '')} · <span class="link">otwórz →</span></p></div>`).join('')}` : '<p class="en">Bez błędów – świetnie!</p>'}
      <div class="acts"><button class="primary" data-ex="start">Jeszcze raz</button><button data-ex="menu">Zmień zakres</button></div>`;
    E.run = null; panelBody.scrollTop = 0;
  }

  panelBody.addEventListener('click', (e) => {
    if (!ctx.modeIs('quiz')) return;
    const t = e.target, X = t.closest('[data-ex]'), PR = t.closest('[data-ex-preset]'), C = t.closest('[data-ex-count]'), O = t.closest('[data-exopt]'), OP = t.closest('[data-ex-open]');
    if (PR) { E.preset = PR.dataset.exPreset; menu(); }
    else if (C) { E.count = +C.dataset.exCount; menu(); }
    else if (O && E.run) answer(+O.dataset.exopt);
    else if (OP) { const [kind, ...r] = OP.dataset.exOpen.split(':'); ctx.openNote(`${kind}:${r.join(':')}`); }
    else if (X) {
      const a = X.dataset.ex;
      if (a === 'back') { stop(); E.run = null; ctx.quizMenu(); }
      else if (a === 'menu') menu();
      else if (a === 'start') start();
      else if (a === 'skip' && E.run) answer(null);
      else if (a === 'end' && E.run) finish(false);
    }
  });

  return { menu, active: () => !!E.run, leave() { stop(); E.run = null; } }; // wyjście z Quizu przerywa egzamin
}
