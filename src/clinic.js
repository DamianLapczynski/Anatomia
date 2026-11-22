// Tryb „Klinika”: symulator uszkodzenia nerwu lub korzenia, badanie neurologiczne (miotomy, odruchy, punkty kluczowe
// dermatomów ISNCSCI na modelu) i quiz kliniczny „pacjent nie wykona X – który nerw / korzeń?”.
import * as THREE from 'three';
import { ROOTS, segmentsOf } from './data/roots.js';
import { MOVES } from './data/movements.js';
import { store } from './store.js';
import { prefs } from './settings.js';
import { initFuncTests } from './functests.js';
import { folder } from './folders.js';

const RED = '#e5484d', ORANGE = '#f5a524';
const MOTOR_ROOTS = ['C5', 'C6', 'C7', 'C8', 'Th1', 'L2', 'L3', 'L4', 'L5', 'S1'];
// uszkodzenie nerwu obejmuje jego dalsze gałęzie, które w bazie są osobnymi wpisami
const BRANCHES = {
  brachial_plexus: ['axillary', 'musculocutaneous', 'median', 'ulnar', 'radial', 'suprascapular', 'long_thoracic', 'dorsal_scapular', 'thoracodorsal', 'pectoral', 'subscapular', 'subclavian'],
  sciatic: ['tibial', 'common_fibular'], common_fibular: ['deep_fibular', 'superficial_fibular'], tibial: ['sural'], femoral: ['saphenous'],
};
const GROUPS = [
  ['Kończyna górna', ['brachial_plexus', 'axillary', 'musculocutaneous', 'median', 'ulnar', 'radial', 'suprascapular', 'long_thoracic', 'dorsal_scapular', 'thoracodorsal', 'subscapular', 'pectoral']],
  ['Kończyna dolna i miednica', ['femoral', 'obturator', 'sciatic', 'tibial', 'common_fibular', 'deep_fibular', 'superficial_fibular', 'superior_gluteal', 'inferior_gluteal', 'pudendal', 'lumbar_plexus']],
  ['Tułów, szyja i głowa', ['phrenic', 'intercostal', 'accessory', 'facial', 'trigeminal', 'oculomotor', 'trochlear', 'abducens', 'hypoglossal', 'vagus', 'ansa_cervicalis', 'dorsal_rami']],
];

export function initClinic(ctx) {
  const { engine, model, view, applyView, panelBody, esc, card, MUSCLES, NERVES } = ctx;
  const S = { screen: 'home', side: prefs().side, kind: null, key: null, quiz: null };
  ctx.clinicHome = () => home();
  const ft = initFuncTests(ctx);
  const p = (t) => (t ? `<p>${esc(t)}</p>` : '');
  const lc = (t) => t.charAt(0).toLowerCase() + t.slice(1);
  const segs = Object.fromEntries(Object.keys(MUSCLES).map((k) => [k, segmentsOf(MUSCLES[k].n)]));
  const NAME = (k) => NERVES[k]?.pl ?? k;

  // ---------- obliczenie skutków uszkodzenia ----------
  const lesionSet = (key) => { const out = new Set([key]); const add = (k) => (BRANCHES[k] ?? []).forEach((b) => { if (NERVES[b] && !out.has(b)) { out.add(b); add(b); } }); add(key); return out; };
  function lesion(kind, key) {
    const st = new Map(); // klucz mięśnia → 'par' (porażony / najbardziej osłabiony) | 'weak' (osłabiony)
    if (kind === 'nerve') {
      const set = lesionSet(key);
      for (const nk of set) for (const mk of model.nerveMuscleKeys(nk)) st.set(mk, model.nervesOfMuscle(mk).every((x) => set.has(x)) ? 'par' : 'weak');
    } else for (const [mk, s] of Object.entries(segs)) if (s.has(key)) st.set(mk, s.size === 1 ? 'par' : 'weak');
    const moves = [];
    for (const m of MOVES) {
      const a = m.ago.map((k) => st.get(k)), hit = a.filter(Boolean);
      if (!hit.length) continue;
      moves.push({ m, lost: kind === 'nerve' && a.every((x) => x === 'par'), ago: hit.length, of: a.length });
    }
    const first = kind === 'root' ? ROOTS[key]?.myo?.move : null; // przy korzeniu najpierw ruch z miotomu
    moves.sort((x, y) => ((y.m.id === first) - (x.m.id === first)) || (y.lost - x.lost) || (y.ago / y.of - x.ago / x.of));
    return { st, moves, nerves: kind === 'nerve' ? lesionSet(key) : new Set() };
  }

  // ---------- znaczniki dermatomów ----------
  const labels = () => ctx.labels();
  function pointOf(at, side) {
    const sgn = side === 'l' ? 1 : -1; // prawa strona ciała leży po ujemnej stronie osi x
    if (at.lm) {
      const l = labels().find((x) => x.n === at.lm); if (!l) return null;
      const paired = /\.[lr]$/.test(l.p);
      const v = [paired && side === 'l' ? -l.b[0] : l.b[0], l.b[1], l.b[2]], d = at.d ?? [0, 0, 0];
      return [v[0] + (paired ? sgn : Math.sign(v[0]) || sgn) * d[0], v[1] + d[1], v[2] + d[2]];
    }
    const ids = model.ids(at.mesh, side); if (!ids.length) return null;
    const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (const id of ids) { const b = model.meta[id].bb; for (let i = 0; i < 3; i++) { bb[i] = Math.min(bb[i], b[i]); bb[i + 3] = Math.max(bb[i + 3], b[i + 3]); } }
    const [fx, fy, fz] = at.f, cx = (bb[0] + bb[3]) / 2;
    const paired = model.meta[ids[0]].s;
    const medial = paired ? (sgn < 0 ? bb[3] : bb[0]) : cx, lateral = sgn < 0 ? bb[0] : bb[3];
    return [medial + fx * (lateral - medial), bb[1] + fy * (bb[4] - bb[1]), bb[2] + fz * (bb[5] - bb[2])];
  }
  function showDerm(keys, act) {
    // przy wielu punktach podpis to sam segment (pełny opis jest w liście), przy jednym – pełna nazwa miejsca
    const list = keys.map((k) => ({ k, v: pointOf(ROOTS[k].derm.at, S.side) })).filter((x) => x.v).map(({ k, v }) => ({ v, label: keys.length > 1 && k !== act ? k : `${k} – ${ROOTS[k].derm.pl}`, act: k === act }));
    ctx.setPointMarks(list, keys.length > 1);
  }

  // ---------- scena ----------
  async function stage(L) {
    await ctx.need('bones', 'muscles', 'nerves');
    view.tints.clear(); view.sel.clear(); view.only = null;
    for (const [mk, s] of L.st) for (const id of model.muscleEntity(mk, S.side).ids) view.tints.set(id, s === 'par' ? RED : ORANGE);
    const nerveIds = [...L.nerves].filter((k) => NERVES[k].mesh.length).flatMap((k) => model.nerveEntity(k, S.side).ids);
    const main = S.kind === 'nerve' && NERVES[S.key].mesh.length ? model.nerveEntity(S.key, S.side) : null;
    view.iso = { focus: new Set(view.tints.keys()), side: S.side, others: 'ghost', show: { nerves: true, path: true }, nerves: new Set(nerveIds), path: new Set(main?.nervePath ?? []) };
    applyView();
    const ids = [...view.iso.focus, ...nerveIds];
    if (ids.length) engine.focus(ids, { pad: 1.15, dir: new THREE.Vector3(S.side === 'l' ? 0.35 : -0.35, 0.1, 1).normalize() });
  }
  function clearStage() { view.iso = null; view.tints.clear(); ctx.clearMarks(); applyView(); }

  // ---------- ekrany ----------
  const legend = (kind) => `<div class="legend"><span><i style="background:${RED}"></i>${kind === 'nerve' ? 'porażony' : 'najsilniej osłabiony (jeden segment)'}</span><span><i style="background:${ORANGE}"></i>osłabiony${kind === 'nerve' ? ' (ma też inne unerwienie)' : ' (kilka segmentów)'}</span></div>`;
  function home() {
    S.screen = 'home'; clearStage();
    let h = `<h2>Klinika</h2><p class="en">Co się stanie, gdy uszkodzisz nerw albo korzeń? Model pokazuje porażone mięśnie, a lista – ruchy, które pacjent straci. Do tego badanie neurologiczne i quiz z przypadków.</p>
      <div class="acts"><button class="primary" data-act="quiz">Quiz kliniczny</button><button data-act="exam">Badanie neurologiczne</button><button data-act="ft">Testy funkcjonalne</button></div>
      ${folder('clinic:roots', 'Uszkodzenie korzenia (miotomy)', MOTOR_ROOTS.length, `<div class="chips">${MOTOR_ROOTS.map((r) => `<span class="chip" data-root="${r}">${r}</span>`).join('')}</div>`, { list: false })}`;
    for (const [g, keys] of GROUPS) {
      h += folder(`clinic:${g}`, `Uszkodzenie nerwu – ${g}`, keys.filter((k) => NERVES[k]).length, `${keys.filter((k) => NERVES[k]).map((k) => { const L = lesion('nerve', k); return `<div class="it" data-nerve="${k}"><span>${esc(NAME(k))}</span><small>${esc(NERVES[k].roots)} · ${L.st.size} mięśni · ${L.moves.filter((x) => x.lost).length} ruchów zniesionych</small></div>`; }).join('')}`);
    }
    h += '<p class="note">Symulacja opiera się na bazie unerwienia mięśni i ruchów z tej aplikacji. Prawdziwe uszkodzenia bywają częściowe, a unerwienie zmienne osobniczo.</p>';
    panelBody.innerHTML = h; panelBody.scrollTop = 0;
  }
  const muscleList = (L, which) => [...L.st].filter(([, s]) => s === which).map(([k]) => `<span class="link" data-muscle="${k}">${esc(MUSCLES[k].pl.replace(/^Mięsień |^Mięśnie /, ''))}</span>`).join(' · ');
  const moveList = (arr) => `<div class="list">${arr.map((x) => `<div class="it" data-move="${x.m.id}"><span>${esc(x.m.pl)}</span><small>${x.lost ? 'zniesiony' : `osłabiony · ${x.ago}/${x.of} mm. głównych`}</small></div>`).join('')}</div>`;
  function openLesion(kind, key) {
    S.screen = 'lesion'; S.kind = kind; S.key = key; ctx.clearMarks();
    const L = lesion(kind, key), lost = L.moves.filter((x) => x.lost), weak = L.moves.filter((x) => !x.lost);
    let h = `<div class="acts" style="margin-top:0"><button data-act="home">‹ Klinika</button><button data-act="side">Strona: ${S.side === 'r' ? 'prawa' : 'lewa'}</button></div>`;
    if (kind === 'nerve') {
      const n = NERVES[key];
      h += `<h2>Uszkodzenie: ${esc(n.pl)}</h2><div class="lat">${esc(n.lat)} · ${esc(n.roots)}</div>${legend(kind)}`;
      h += `<p class="note">Symulacja pokazuje uszkodzenie wysokie – na początku nerwu${L.nerves.size > 1 ? `, razem z dalszymi gałęziami (${[...L.nerves].slice(1).map((k) => esc(NAME(k))).join(', ')})` : ''}. Przy uszkodzeniu niżej gałęzie odchodzące wcześniej są zachowane – patrz „Objawy”.</p>`;
      h += card('Objawy', p(n.palsy), null, 'clin');
      h += card(`Ruchy zniesione (${lost.length})`, lost.length ? moveList(lost) : '<p class="en">Żaden ruch nie jest całkowicie zniesiony – inne mięśnie przejmują część pracy.</p>', RED);
      if (weak.length) h += card(`Ruchy osłabione (${weak.length})`, moveList(weak), ORANGE);
      h += card('Mięśnie', `${muscleList(L, 'par') ? `<p><b style="color:${RED}">Porażone:</b> ${muscleList(L, 'par')}</p>` : ''}${muscleList(L, 'weak') ? `<p style="margin-top:6px"><b style="color:${ORANGE}">Osłabione:</b> ${muscleList(L, 'weak')}</p>` : ''}`, '#a83d36');
      h += card('Czucie', p(n.sensory), '#93a0b4') + card('Skojarzenie', p(n.tip), null, 'tip');
      h += `<div class="acts"><button data-act="atlas">Nerw w atlasie</button></div>`;
    } else {
      const r = ROOTS[key];
      h += `<h2>Uszkodzenie korzenia ${esc(key)}</h2><div class="lat">miotom · odruch · dermatom</div>${legend(kind)}`;
      h += card('Badanie', `<p><b>Miotom (mięsień kluczowy):</b> ${esc(r.myo.pl)} – <span class="link" data-muscle="${r.myo.muscle}">${esc(MUSCLES[r.myo.muscle].pl)}</span> · <span class="link" data-move="${r.myo.move}">pokaż ruch</span></p>
        <p style="margin-top:6px"><b>Odruch:</b> ${esc(r.reflex ?? 'brak typowego odruchu dla tego korzenia')}</p><p style="margin-top:6px"><b>Dermatom – punkt kluczowy:</b> ${esc(r.derm.pl)} (znacznik na modelu)</p>`, '#c084fc');
      h += card('Typowa przyczyna i obraz', p(r.cause), null, 'clin');
      h += card(`Ruchy osłabione (${L.moves.length})`, moveList(L.moves), ORANGE);
      h += card('Mięśnie z udziałem tego segmentu', `${muscleList(L, 'par') ? `<p><b style="color:${RED}">Tylko ten segment:</b> ${muscleList(L, 'par')}</p>` : ''}<p style="margin-top:6px"><b style="color:${ORANGE}">Kilka segmentów:</b> ${muscleList(L, 'weak')}</p>`, '#a83d36');
      h += '<p class="note">Segmenty mięśni pochodzą z opisów unerwienia w bazie; podręczniki podają nieco różne zakresy – sprawdź z materiałami z zajęć.</p>';
    }
    panelBody.innerHTML = h; panelBody.scrollTop = 0;
    stage(L).then(() => { if (kind === 'root') showDerm([key], key); });
  }
  function exam() {
    S.screen = 'exam'; clearStage();
    const keys = Object.keys(ROOTS);
    let h = `<div class="acts" style="margin-top:0"><button data-act="home">‹ Klinika</button><button data-act="side">Strona: ${S.side === 'r' ? 'prawa' : 'lewa'}</button></div>
      <h2>Badanie neurologiczne</h2><p class="en">Punkty kluczowe dermatomów (ISNCSCI) są zaznaczone na modelu. Kliknij korzeń, żeby zobaczyć skutki jego uszkodzenia.</p>
      <div class="card"><h5><i style="background:#c084fc"></i>Miotomy i odruchy</h5><div class="list">${MOTOR_ROOTS.map((k) => `<div class="it col" data-root="${k}"><span><b>${k}</b> – ${esc(ROOTS[k].myo.pl)}</span><small>${esc(ROOTS[k].reflex ?? 'bez typowego odruchu')} · czucie: ${esc(ROOTS[k].derm.pl)}</small></div>`).join('')}</div></div>
      <div class="card"><h5><i style="background:#93a0b4"></i>Pozostałe punkty kluczowe dermatomów</h5><div class="list">${keys.filter((k) => !ROOTS[k].myo).map((k) => `<div class="it col" data-derm="${k}"><span><b>${k}</b></span><small>${esc(ROOTS[k].derm.pl)}${ROOTS[k].cause ? ` · ${esc(ROOTS[k].cause)}` : ''}</small></div>`).join('')}</div></div>
      ${card('Jak oceniać', '<p><b>Siła</b> – skala 0–5 (Lovett / MRC) w mięśniach kluczowych. <b>Czucie</b> – dotyk lekki i ukłucie: 0 – brak, 1 – zaburzone, 2 – prawidłowe, porównując z twarzą. <b>Odruchy</b> – 0 brak, 1+ osłabiony, 2+ prawidłowy, 3+ wygórowany, 4+ z klonusem. Objawy górnego neuronu (wygórowane odruchy, objaw Babińskiego, spastyczność) wskazują na uszkodzenie rdzenia lub mózgu, a nie korzenia.</p>', null, 'tip')}`;
    panelBody.innerHTML = h; panelBody.scrollTop = 0;
    ctx.need('bones').then(() => {
      view.iso = { focus: new Set(), side: S.side, others: 'ghost', show: {} }; applyView();
      showDerm(keys);
      engine.focus(new THREE.Box3(new THREE.Vector3(-0.45, 0, -0.2), new THREE.Vector3(0.45, 1.72, 0.2)), { dir: new THREE.Vector3(S.side === 'l' ? 0.25 : -0.25, 0, 1).normalize(), pad: 1.05 });
    });
  }

  // ---------- quiz ----------
  const sig = (L) => L.moves.map((x) => `${x.m.id}${x.lost ? '!' : ''}`).join(',');
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pool = { nerve: Object.keys(NERVES).filter((k) => NERVES[k].mesh.length || NERVES[k].keys).filter((k) => lesion('nerve', k).moves.length >= 2), root: MOTOR_ROOTS };
  function newQuestion() {
    const kind = Math.random() < 0.6 ? 'nerve' : 'root';
    const key = pool[kind][Math.floor(Math.random() * pool[kind].length)];
    const L = lesion(kind, key), s = sig(L);
    const others = shuffle(pool[kind].filter((k) => k !== key && sig(lesion(kind, k)) !== s && !(kind === 'nerve' && (lesionSet(k).has(key) || lesionSet(key).has(k))))).slice(0, 3);
    S.quiz.cur = { kind, key, opts: shuffle([key, ...others]), L, answered: null };
  }
  function quizView() {
    S.screen = 'quiz'; ctx.clearMarks();
    const q = S.quiz.cur, L = q.L;
    const lost = L.moves.filter((x) => x.lost).slice(0, 5), weak = L.moves.filter((x) => !x.lost).slice(0, 6);
    let h = `<div class="acts" style="margin-top:0"><button data-act="home">‹ Klinika</button><span class="tag" style="align-self:center">✔ ${S.quiz.ok} · ✘ ${S.quiz.bad}</span></div>
      <h2>Który ${q.kind === 'nerve' ? 'nerw' : 'korzeń'} jest uszkodzony?</h2>`;
    if (q.kind === 'nerve') {
      h += card('Badanie siły', `${lost.length ? `<p><b style="color:${RED}">Pacjent nie wykona:</b> ${lost.map((x) => esc(lc(x.m.pl))).join('; ')}</p>` : ''}${weak.length ? `<p style="margin-top:6px"><b style="color:${ORANGE}">Osłabione:</b> ${weak.map((x) => esc(lc(x.m.pl))).join('; ')}</p>` : ''}`, '#a83d36');
    } else {
      const r = ROOTS[q.key];
      h += card('Badanie', `<p><b>Osłabione:</b> ${esc(lc(r.myo.pl))}${weak.length ? `, a także m.in.: ${weak.filter((x) => x.m.id !== r.myo.move).slice(0, 3).map((x) => esc(lc(x.m.pl))).join('; ')}` : ''}</p><p style="margin-top:6px"><b>Odruch:</b> ${esc(r.reflex ? `osłabiony – ${r.reflex.replace(/\s*\(.*\)/, '')}` : 'odruchy prawidłowe')}</p><p style="margin-top:6px"><b>Czucie zaburzone:</b> ${esc(lc(r.derm.pl))}</p>`, '#a83d36');
    }
    h += `<div class="opts">${q.opts.map((k, i) => {
      const cls = q.answered == null ? '' : k === q.key ? 'ok' : k === q.answered ? 'bad' : '';
      return `<button class="opt ${cls}" data-opt="${i}" ${q.answered != null ? 'disabled' : ''}>${esc(q.kind === 'nerve' ? NAME(k) : `Korzeń ${k}`)}</button>`;
    }).join('')}</div>`;
    if (q.answered != null) {
      const good = q.answered === q.key;
      h += card(good ? 'Dobrze!' : `Odpowiedź: ${q.kind === 'nerve' ? NAME(q.key) : `korzeń ${q.key}`}`, q.kind === 'nerve' ? p(NERVES[q.key].palsy) : p(ROOTS[q.key].cause), null, good ? 'tip' : 'clin');
      h += `<div class="acts"><button class="primary" data-act="next">Następne pytanie</button><button data-act="show">Pokaż na modelu</button></div>`;
    }
    panelBody.innerHTML = h;
  }
  function answer(i) {
    const q = S.quiz.cur; if (q.answered != null) return;
    q.answered = q.opts[i];
    const good = q.answered === q.key;
    S.quiz[good ? 'ok' : 'bad']++;
    const id = `${q.kind}~${q.key}`, prev = store.get('quiz', `clinic~${id}`) ?? { kind: 'clinic', key: id, q: 'clinic', ok: 0, bad: 0 };
    store.put('quiz', `clinic~${id}`, { ...prev, ok: prev.ok + (good ? 1 : 0), bad: prev.bad + (good ? 0 : 1), last: Date.now() });
    quizView();
    stage(q.L);
  }

  panelBody.addEventListener('click', (e) => {
    if (!ctx.modeIs('clinic')) return;
    const t = e.target, A = t.closest('[data-act]'), N = t.closest('[data-nerve]'), R = t.closest('[data-root]'), M = t.closest('[data-muscle]'), V = t.closest('[data-move]'), O = t.closest('[data-opt]'), D = t.closest('[data-derm]');
    if (O) answer(+O.dataset.opt);
    else if (N) openLesion('nerve', N.dataset.nerve);
    else if (R) openLesion('root', R.dataset.root);
    else if (D) { showDerm([D.dataset.derm], D.dataset.derm); panelBody.querySelectorAll('.it.on').forEach((x) => x.classList.remove('on')); D.classList.add('on'); }
    else if (V) ctx.openMove(V.dataset.move, S.side);
    else if (M) { ctx.setMode('atlas'); ctx.select(model.muscleEntity(M.dataset.muscle, S.side), { isolate: true }); }
    else if (A) {
      const a = A.dataset.act;
      if (a === 'home') home();
      else if (a === 'exam') exam();
      else if (a === 'ft') { S.screen = 'ft'; S.ftLast = null; clearStage(); ft.list(); }
      else if (a === 'side') { S.side = S.side === 'r' ? 'l' : 'r'; if (S.screen === 'exam') exam(); else openLesion(S.kind, S.key); }
      else if (a === 'atlas') { ctx.setMode('atlas'); ctx.select(model.nerveEntity(S.key, S.side), { isolate: true }); }
      else if (a === 'quiz') { S.quiz = { ok: 0, bad: 0 }; newQuestion(); quizView(); clearStage(); }
      else if (a === 'next') { newQuestion(); quizView(); clearStage(); }
      else if (a === 'show') { const q = S.quiz.cur; openLesion(q.kind, q.key); }
    }
  });

  return {
    enter() { if (S.screen === 'ft') { const id = S.ftPending ?? S.ftLast; S.ftPending = null; if (id) ft.open(id); else ft.list(); return; } if (S.screen === 'lesion') openLesion(S.kind, S.key); else if (S.screen === 'exam') exam(); else if (S.screen === 'quiz' && S.quiz?.cur) quizView(); else home(); },
    leave() { S.ftLast = ft.current(); ft.leave(); clearStage(); },
    onPick(hit) {
      if (!hit) return true;
      if (ft.active()) { const ent = model.entityOf(hit.id); ctx.hint(`${ent.title}${ent.lat ? ` – ${ent.lat}` : ''}`); return true; }
      const ent = model.entityOf(hit.id);
      if (ent.type === 'muscle' && S.screen === 'lesion') {
        const st = lesion(S.kind, S.key).st.get(ent.key);
        ctx.hint(`${ent.title}: ${st === 'par' ? (S.kind === 'nerve' ? 'porażony' : 'najsilniej osłabiony') : st === 'weak' ? 'osłabiony' : 'bez zmian'}`);
      } else ctx.hint(`${ent.title}${ent.lat ? ` – ${ent.lat}` : ''}`);
      return true;
    },
    openLesion: (kind, key) => { S.kind = kind; S.key = key; S.screen = 'lesion'; },
    openFT: (id) => { S.screen = 'ft'; if (ctx.modeIs('clinic')) ft.open(id); else S.ftPending = id; },
  };
}
