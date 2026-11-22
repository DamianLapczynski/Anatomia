// Tryb „Schorzenia”: baza najczęstszych schorzeń z wizualizacją 3D (struktury chore, nerwy, mózg i rdzeń, miejsce
// bólu, ruch prowokujący lub typowy chód), karta do nauki, quiz „Rozpoznaj schorzenie” i przypadki kliniczne.
import * as THREE from 'three';
import COND, { COND_GROUPS } from './data/conditions.js';
import CASES from './data/cases.js';
import FT from './data/func_tests.js';
import CT from './data/clinical_tests.js';
import { createProps } from './props.js';
import { testProps } from './poses.js';
import { prefs } from './settings.js';
import { store } from './store.js';
import { folder } from './folders.js';

const C = { bad: '#e5484d', inv: '#f5a524', nerve: '#f5cc33', joint: '#ff6b9a', bone: '#ff8a7a', cns: '#e5484d' };
const TESTS = { ...FT, ...CT };
// kadry na okolicę (punkty ciała z src/poses.js)
const FOCUS = {
  upr: ['vertex', 'acromion.l', 'acromion.r', 'elbow.r', 'fingertip.r', 'hand.r', 'asis.r'],
  knee: ['asis.l', 'asis.r', 'knee.l', 'knee.r', 'heel.r', 'heelBack.r', 'toeTip.r', 'kneeLow.r'],
  foot: ['knee.r', 'heel.r', 'toeTip.r', 'mt1.r', 'mt5.r', 'heel.l', 'toeTip.l'],
  head: ['vertex', 'chin', 'occiput', 'jaw.l', 'jaw.r', 'forehead', 'c6'],
  hands: ['fingertip.l', 'fingertip.r', 'elbow.l', 'elbow.r', 'hand.l', 'hand.r', 'sternum'],
  spine: ['vertex', 'sacrum', 't8', 'scap.l', 'scap.r', 'asis.l', 'asis.r'],
};
const BODY = ['vertex', 'heel.l', 'heel.r', 'toeTip.l', 'toeTip.r', 'fingertip.l', 'fingertip.r', 'occiput', 'sacrum', 'knee.l', 'knee.r'];
const DIR = { head: [-0.35, 0.1, 1], hands: [0.1, 0.6, 1], foot: [-0.6, 0.55, 0.55], spine: [0.3, 0.2, -1] };
const ANIM_DIR = { hemi_gait: [-1.2, 0.35, 0.25], park_gait: [-1.2, 0.35, 0.25], steppage: [-1.2, 0.3, 0.2], stenosis_walk: [-1, 0.3, 0.2], gait: [-1.2, 0.35, 0.2], ankle_inv: [-0.3, 0.3, 1], sls_error: [0.15, 0.2, -1], stepdown_error: [0.25, 0.15, 1], hip_ir_error: [0.05, 0.6, -1], fairbank: [-0.5, 1, 0.4], faber: [-0.3, 1, 0.6], hands_fwd: [0.1, 0.6, 1], jobe: [0.1, 0.25, 1], phalen: [-0.5, 0.3, 1], romberg: [1, 0.15, 0.5] };
const DURATION = { hemi_gait: 9, park_gait: 9, steppage: 8, stenosis_walk: 11, gait: 11, mcmurray: 9, hop3: 7, phalen: 8 };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const KEYS = Object.keys(COND);

export function initConditions(ctx) {
  const { engine, model, view, applyView, panelBody, esc, card, MUSCLES, NERVES } = ctx;
  const S = { screen: 'home', id: null, filter: '', k: 0, playing: true, last: 0, quiz: null, cas: null, back: 'home' };
  let props = null, staged = null;
  const p = (t) => (t ? `<p>${esc(t)}</p>` : '');
  const ul = (a) => (a?.length ? `<ul>${a.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  const prog = (id) => store.get('learn', `cond:${id}`) ?? {};
  const solved = (id) => store.get('learn', `case:${id}`);
  const doneCount = () => KEYS.filter((k) => prog(k).done).length;
  const mName = (k) => (MUSCLES[k]?.pl ?? k).replace(/^Mięsień |^Mięśnie /, '');

  // ---------------- ekran główny ----------------
  function home() {
    stop(); S.screen = 'home'; S.id = null;
    const casesDone = CASES.filter((c) => solved(c.id)).length;
    panelBody.innerHTML = `<h2>Schorzenia</h2>
      <p class="en">${KEYS.length} najczęstszych schorzeń w fizjoterapii: jak powstają, co boli, jak je zbadać i leczyć. Każde z wizualizacją 3D – struktury chore, nerwy, mózg i rdzeń, miejsce bólu i ruch, który je prowokuje.</p>
      <div class="cond-stats"><div><b>${doneCount()}/${KEYS.length}</b><small>opanowane</small></div><div><b>${casesDone}/${CASES.length}</b><small>przypadki</small></div><div><b>${store.get('learn', 'condquiz')?.best ?? '–'}${store.get('learn', 'condquiz')?.best != null ? '%' : ''}</b><small>najlepszy quiz</small></div></div>
      <div class="acts"><button class="primary" data-cd="quiz">Quiz: rozpoznaj schorzenie</button><button data-cd="cases">Przypadki kliniczne</button></div>
      <input id="condq" type="search" placeholder="Filtruj: np. łokieć, kolano, nerw, rwa…" value="${esc(S.filter)}" aria-label="Filtruj schorzenia" autocomplete="off">
      <div id="condList"></div>`;
    renderList();
    panelBody.scrollTop = 0;
    view.only = null; view.tints.clear(); view.iso = null; applyView(); ctx.home();
  }
  function renderList() {
    const el = panelBody.querySelector('#condList'); if (!el) return;
    const q = S.filter.trim().toLowerCase();
    const match = (k, c) => !q || `${c.pl} ${c.lat} ${(c.alias ?? []).join(' ')}`.toLowerCase().includes(q);
    let h = '';
    for (const [g, name] of COND_GROUPS) {
      const items = KEYS.filter((k) => COND[k].grp === g && match(k, COND[k]));
      if (!items.length) continue;
      const done = items.filter((k) => prog(k).done).length;
      h += folder(`cond:${g}`, name, `${done ? `✔ ${done}/` : ''}${items.length}`, items.map((k) => { const c = COND[k]; return `<div class="it col" data-cond-open="${k}"><span>${prog(k).done ? '<b class="prog">✔</b> ' : ''}${esc(c.pl)}</span><small>${esc(c.lat)}</small></div>`; }).join(''), { force: !!q });
    }
    el.innerHTML = h || '<p class="note">Brak schorzeń pasujących do filtra.</p>';
  }

  // ---------------- karta schorzenia ----------------
  function open(id, back) {
    if (!COND[id]) return;
    stop(); S.screen = 'card'; S.id = id; S.k = 0; S.playing = true; S.last = 0; if (back) S.back = back;
    render(); panelBody.scrollTop = 0; stage();
  }
  function render() {
    const c = COND[S.id], v = c.viz, pr = prog(S.id);
    const testLinks = (c.tests ?? []).filter((k) => TESTS[k]).map((k) => `<span class="link" data-cond-test="${k}">${esc(TESTS[k].pl)}</span>`).join(' · ');
    const mus = [...(v.muscles ?? []), ...(v.inv ?? [])].filter((k) => MUSCLES[k]).map((k) => `<span class="link" data-muscle="${k}" style="color:${(v.muscles ?? []).includes(k) ? C.bad : C.inv}">${esc(mName(k))}</span>`).join(' · ');
    const nerves = (v.nerves ?? []).filter((k) => NERVES[k]).map((k) => `<span class="link" data-nerve="${k}">${esc(NERVES[k].pl)}</span>`).join(' · ');
    const legend = [v.muscles?.length && `<b style="color:${C.bad}">■</b> mięśnie / ścięgna chore`, v.inv?.length && `<b style="color:${C.inv}">■</b> zaangażowane`, v.nerves?.length && `<b style="color:${C.nerve}">■</b> nerwy`, v.joints?.length && `<b style="color:${C.joint}">■</b> staw / więzadła`, v.bones?.length && `<b style="color:${C.bone}">■</b> kości`, v.cns?.length && `<b style="color:${C.cns}">■</b> mózg / rdzeń (czaszka i kręgi ukryte)`, v.pain?.length && '<b style="color:#ff2d55">●</b> miejsce bólu', '<b style="color:#ffb020">➜</b> siła / ruch'].filter(Boolean).join(' · ');
    const cases = CASES.filter((x) => x.cond === S.id);
    panelBody.innerHTML = `<div class="acts" style="margin-top:0"><button data-cd="back">‹ ${S.back === 'quiz' ? 'Quiz' : S.back === 'case' ? 'Przypadek' : 'Schorzenia'}</button></div>
      <h2>${esc(c.pl)}</h2><div class="lat">${esc(c.lat)}</div>
      ${c.alias?.length ? `<p class="note">Też: ${esc(c.alias.slice(0, 5).join(', '))}</p>` : ''}
      <div class="card ft-anim"><h5><i style="background:${C.bad}"></i>Jak to wygląda</h5>
        <input id="cdk" type="range" min="0" max="1000" value="0" aria-label="Postęp animacji">
        <p class="ft-phase">${esc(v.caption)}</p>
        <div class="acts" style="margin-bottom:0"><button data-cd="play" class="primary">${S.playing ? 'Pauza' : 'Odtwórz'}</button><button data-cd="mark" class="${pr.done ? 'on' : ''}" aria-pressed="${!!pr.done}">${pr.done ? '✔ Opanowane' : 'Oznacz jako opanowane'}</button></div>
        <p class="note">${legend}</p><p class="note">Wizualizacja schematyczna – pokazuje okolicę i mechanizm, nie obraz samej choroby (np. zwyrodnienia czy zapalenia tkanki).</p></div>
      ${card('Definicja', p(c.def), '#4c9dff')}
      ${card('Jak to działa (patomechanika)', p(c.mech), null, 'tip')}
      ${card('Czynniki ryzyka', p(c.ryzyko), '#93a0b4')}
      ${card('Objawy', ul(c.objawy), '#3ecf8e')}
      ${card('Badanie', `${ul(c.badanie)}${testLinks ? `<p style="margin-top:6px"><b>Testy w aplikacji:</b> ${testLinks}</p>` : ''}`, '#3ecf8e')}
      ${card('Różnicowanie', ul(c.roznic), '#c084fc')}
      ${card('Fizjoterapia', ul(c.fizjo), '#3ecf8e')}
      ${c.flagi ? card('Czerwone flagi', p(c.flagi), null, 'clin') : ''}
      ${card('Rokowanie', p(c.rokowanie), '#93a0b4')}
      ${mus || nerves ? card('Struktury', `${mus ? `<p>${mus}</p>` : ''}${nerves ? `<p style="margin-top:6px">Nerwy: ${nerves}</p>` : ''}`, '#a83d36') : ''}
      ${cases.length ? card('Przypadki kliniczne', `<div class="list">${cases.map((x) => `<div class="it" data-case-open="${x.id}"><span>${solved(x.id) ? '✔ ' : ''}${esc(x.title)}</span></div>`).join('')}</div>`, '#ff7a45') : ''}
      ${ctx.noteCard(`cond:${S.id}`, c.pl)}
      <p class="note">Materiał dydaktyczny – orientacyjny, nie zastępuje podręcznika ani diagnostyki lekarskiej.</p>`;
  }
  const idsOf = (list, fn) => (list ?? []).flatMap(fn);
  async function stage() {
    const id = S.id, c = COND[id], v = c.viz;
    const layers = ['bones', 'muscles', ...(v.nerves?.length ? ['nerves'] : []), ...(v.cns?.length ? ['cns'] : []), ...(v.joints?.length ? ['joints'] : [])];
    await ctx.need(...layers);
    if (S.screen !== 'card' || S.id !== id || !ctx.modeIs('cond')) return;
    const both = c.grp === 'reu' || v.both;
    const sides = both ? ['r', 'l'] : ['r'];
    const nerveIds = idsOf(v.nerves, (k) => model.nerveEntity(k, 'r').ids);
    const jointIds = idsOf(v.joints, (k) => sides.flatMap((sd) => model.jointEntity(k, sd).ids));
    const cnsIds = idsOf(v.cns, (n) => { const [name, sd = ''] = n.split('|'); return model.ids(name, sd); });
    const cnsAll = v.cns?.length ? model.meta.filter((m) => m.f === 'cns' && engine.meshes[m.id]).map((m) => m.id) : []; // cały mózg i rdzeń jako tło
    const boneIds = idsOf(v.bones, (n) => sides.flatMap((sd) => model.ids(n, sd))).filter((i) => model.meta[i].f === 'skeleton');
    const muscles = [...new Set([...(v.muscles ?? []), ...(v.inv ?? [])])].filter((k) => MUSCLES[k]);
    const ok = ctx.motion.setup({ rig: `test:${v.anim}`, extraIds: [...new Set([...nerveIds, ...jointIds, ...cnsAll])] }, 'r', muscles);
    if (!ok) { ctx.hint('Wizualizacja niedostępna', 'bad'); return; }
    const B = ctx.motion._body;
    props ??= createProps(engine, ctx.motion, model);
    const tp = testProps(B, v.anim);
    props.build(tp.list, tp.at, { arrows: tp.fx.arrows, marks: (v.pain ?? []).map((pt) => ({ pt })) });
    // widoczne: szkielet (bez czaszki i kręgów, gdy pokazujemy mózg / rdzeń), mięśnie schorzenia, nerwy, stawy, OUN
    const hideBone = new Set(v.cns?.length ? [...(B.part.head ?? []), ...model.meta.filter((m) => m.f === 'skeleton' && /^Vertebra|^Atlas|^Axis/.test(m.n)).map((m) => m.id)] : []);
    const only = new Set(model.meta.filter((m) => m.f === 'skeleton' && !hideBone.has(m.id)).map((m) => m.id));
    for (const k of muscles) for (const sd of ['r', 'l']) for (const i of model.muscleEntity(k, sd).ids) only.add(i);
    for (const i of [...nerveIds, ...jointIds, ...cnsAll]) only.add(i);
    view.iso = null; view.tints.clear(); view.only = only;
    const tint = (ids, col) => { for (const i of ids) view.tints.set(i, col); };
    for (const sd of sides) { for (const k of v.inv ?? []) if (MUSCLES[k]) tint(model.muscleEntity(k, sd).ids, C.inv); for (const k of v.muscles ?? []) if (MUSCLES[k]) tint(model.muscleEntity(k, sd).ids, C.bad); }
    tint(nerveIds, C.nerve); tint(jointIds, C.joint); tint(boneIds.filter((i) => !hideBone.has(i)), C.bone); tint(cnsIds, C.cns);
    applyView();
    ctx.motion.set(S.k); props.update();
    frame(v);
    staged = id;
    engine.frameCallbacks.add(tick);
  }
  function frame(v) {
    const M = ctx.motion, B = M._body, box = new THREE.Box3(), keep = S.k;
    const pts = FOCUS[v.focus] ?? BODY;
    for (const k of [0, 0.25, 0.5, 0.75, 1]) { M.set(k); for (const n of pts) if (B.pt[n]) box.expandByPoint(M.pointAt(B.pt[n].p, B.pt[n].id)); }
    if (v.cns?.length) box.expandByPoint(new THREE.Vector3(0, 1.75, 0));
    M.set(keep); props?.update();
    const d = v.dir ?? DIR[v.focus] ?? ANIM_DIR[v.anim] ?? [-1, 0.2, 0.35];
    engine.focus(box, { pad: 1.15, dir: new THREE.Vector3(...d).normalize() });
  }
  function tick(now) {
    if (S.screen !== 'card' || staged !== S.id) return false;
    const dt = Math.min(0.05, (now - (S.last || now)) / 1000); S.last = now;
    if (S.playing) {
      const dur = (DURATION[COND[S.id].viz.anim] ?? 6) / (prefs().speed || 1);
      S.k += dt / dur; if (S.k > 1) S.k -= 1;
      ctx.motion.set(S.k);
      const sl = panelBody.querySelector('#cdk'); if (sl) sl.value = Math.round(S.k * 1000);
    }
    props?.update();
    return true; // pulsujące punkty bólu wymagają odświeżania także w pauzie
  }
  function stop() {
    engine.frameCallbacks.delete(tick); staged = null;
    if (ctx.motion.active) ctx.motion.reset();
    props?.clear(); view.only = null; view.tints.clear();
  }

  // ---------------- quiz „Rozpoznaj schorzenie” ----------------
  function quizSetup() {
    stop(); S.screen = 'quizSetup';
    panelBody.innerHTML = `<div class="acts" style="margin-top:0"><button data-cd="home">‹ Schorzenia</button></div><h2>Rozpoznaj schorzenie</h2>
      <p class="en">10 pytań: z objawów, z dodatnich testów albo z mechanizmu powstawania – wybierz właściwe schorzenie. Po każdej odpowiedzi możesz otworzyć kartę.</p>
      <h4>Zakres</h4><div class="list"><div class="it" data-cd-scope="all"><span>Wszystkie schorzenia (${KEYS.length})</span></div>${COND_GROUPS.map(([g, n]) => `<div class="it" data-cd-scope="${g}"><span>${n} (${KEYS.filter((k) => COND[k].grp === g).length})</span></div>`).join('')}</div>`;
    view.only = null; view.tints.clear(); applyView();
  }
  function makeQ(pool) {
    for (let tries = 0; tries < 30; tries++) {
      const k = pick(pool), c = COND[k];
      const kinds = ['objawy', 'mech', ...((c.tests ?? []).filter((t) => TESTS[t]).length ? ['test'] : [])];
      const kind = pick(kinds);
      let q;
      if (kind === 'objawy') q = `Objawy: ${shuffle([...c.objawy]).slice(0, 2).map((x) => x.replace(/\.$/, '')).join('; ')}. Jakie to schorzenie?`;
      else if (kind === 'test') { const ts = (c.tests ?? []).filter((t) => TESTS[t]); q = `Dodatni wynik: ${shuffle(ts).slice(0, 2).map((t) => TESTS[t].pl).join(' oraz ')}. Które schorzenie najlepiej pasuje?`; }
      else { const s = c.mech.split(/(?<=\.)\s/).slice(0, 2).join(' '); q = `Mechanizm: „${s}” – o jakim schorzeniu mowa?`; }
      // ukryj nazwę schorzenia, jeśli pojawia się w treści
      for (const w of [c.pl, ...(c.alias ?? [])]) if (w.length > 4) q = q.split(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')).join('…');
      const same = KEYS.filter((x) => x !== k && COND[x].grp === c.grp), other = KEYS.filter((x) => x !== k && COND[x].grp !== c.grp);
      const dis = [...shuffle(same).slice(0, 2), ...shuffle(other)].filter((x, i, a) => a.indexOf(x) === i).slice(0, 3);
      return { key: k, kind, q, opts: shuffle([k, ...dis]), ans: null };
    }
    return null;
  }
  function quizStart(scope) {
    const pool = scope === 'all' ? KEYS : KEYS.filter((k) => COND[k].grp === scope);
    const used = new Set(), qs = [];
    for (let i = 0; i < 40 && qs.length < 10; i++) { const q = makeQ(pool.filter((k) => !used.has(k)).length ? pool.filter((k) => !used.has(k)) : pool); if (q) { used.add(q.key); qs.push(q); } }
    S.quiz = { scope, qs, i: 0, ok: 0 }; S.screen = 'quiz'; quizRender();
  }
  function quizRender() {
    const Q = S.quiz, q = Q.qs[Q.i];
    if (!q) return quizEnd();
    const ans = q.ans;
    panelBody.innerHTML = `<div class="acts" style="margin-top:0"><button data-cd="home">‹ Schorzenia</button></div>
      <h2>Pytanie ${Q.i + 1}/${Q.qs.length}</h2><p class="cond-q">${esc(q.q)}</p>
      <div class="list">${q.opts.map((k, i) => `<div class="it ${ans != null ? (k === q.key ? 'ok' : i === ans ? 'bad' : '') : ''}" data-cd-opt="${i}"><span>${esc(COND[k].pl)}</span></div>`).join('')}</div>
      ${ans != null ? `<p class="${q.opts[ans] === q.key ? 'cond-ok' : 'cond-bad'}">${q.opts[ans] === q.key ? '✔ Dobrze!' : `✗ Poprawnie: ${esc(COND[q.key].pl)}`}</p>
        <p class="note">${esc(COND[q.key].def)}</p>
        <div class="acts"><button class="primary" data-cd="next">${Q.i + 1 < Q.qs.length ? 'Dalej' : 'Wynik'}</button><button data-cd-card="${q.key}">Otwórz kartę</button></div>` : ''}`;
    panelBody.scrollTop = 0;
  }
  function quizEnd() {
    const Q = S.quiz, pct = Math.round((Q.ok / Q.qs.length) * 100);
    const prev = store.get('learn', 'condquiz') ?? {};
    store.put('learn', 'condquiz', { best: Math.max(prev.best ?? 0, pct), n: (prev.n ?? 0) + 1, last: pct });
    const wrong = Q.qs.filter((q) => q.opts[q.ans] !== q.key);
    S.screen = 'quizEnd';
    panelBody.innerHTML = `<div class="acts" style="margin-top:0"><button data-cd="home">‹ Schorzenia</button></div><h2>Wynik: ${pct}%</h2>
      <p class="en">${Q.ok} z ${Q.qs.length} poprawnie.</p>
      ${wrong.length ? folder('cond:quizwrong', 'Do powtórki', wrong.length, wrong.map((q) => `<div class="it col" data-cd-card="${q.key}"><span>${esc(COND[q.key].pl)}</span><small>${esc(q.q.slice(0, 110))}${q.q.length > 110 ? '…' : ''}</small></div>`).join(''), { force: true }) : '<p class="cond-ok">Bez błędów – świetnie!</p>'}
      <div class="acts"><button class="primary" data-cd-scope="${Q.scope}">Jeszcze raz</button><button data-cd="quiz">Zmień zakres</button></div>`;
    panelBody.scrollTop = 0;
  }

  // ---------------- przypadki kliniczne ----------------
  function casesList() {
    stop(); S.screen = 'cases';
    panelBody.innerHTML = `<div class="acts" style="margin-top:0"><button data-cd="home">‹ Schorzenia</button></div><h2>Przypadki kliniczne</h2>
      <p class="en">Pacjent, wywiad i wyniki badania → rozpoznanie → kolejne pytanie kliniczne (test, postępowanie, czerwona flaga). Przypadki są fikcyjne, dydaktyczne.</p>
      ${COND_GROUPS.map(([g, name]) => { const cs = CASES.filter((c) => COND[c.cond]?.grp === g); if (!cs.length) return ''; const dn = cs.filter((c) => solved(c.id)).length; return folder(`cases:${g}`, name, `${dn ? `✔ ${dn}/` : ''}${cs.length}`, cs.map((c) => `<div class="it col" data-case-open="${c.id}"><span>${solved(c.id) ? '<b class="prog">✔</b> ' : ''}${esc(c.title)}</span><small>${esc(c.pacjent)}</small></div>`).join(''), { open: true }); }).join('')}`;
    panelBody.scrollTop = 0; view.only = null; view.tints.clear(); applyView();
  }
  function caseOpen(id) {
    const c = CASES.find((x) => x.id === id); if (!c) return;
    stop(); S.screen = 'case'; S.cas = { id, step: 0, dxOpts: shuffle([c.cond, ...c.dx]), a1: null, a2: null };
    caseRender();
  }
  function caseRender() {
    const st = S.cas, c = CASES.find((x) => x.id === st.id), cond = COND[c.cond];
    const opt1 = st.dxOpts.map((k, i) => `<div class="it ${st.a1 != null ? (k === c.cond ? 'ok' : i === st.a1 ? 'bad' : '') : ''}" data-case-a1="${i}"><span>${esc(COND[k].pl)}</span></div>`).join('');
    const opt2 = c.step.opts.map((t, i) => `<div class="it ${st.a2 != null ? (i === c.step.ok ? 'ok' : i === st.a2 ? 'bad' : '') : ''}" data-case-a2="${i}"><span>${esc(t)}</span></div>`).join('');
    panelBody.innerHTML = `<div class="acts" style="margin-top:0"><button data-cd="cases">‹ Przypadki</button></div>
      <h2>${esc(c.title)}</h2>
      ${card('Pacjent', p(c.pacjent), '#93a0b4')}${card('Wywiad', p(c.wywiad), '#4c9dff')}${card('Badanie', ul(c.badanie), '#3ecf8e')}
      <h4>1. Najbardziej prawdopodobne rozpoznanie?</h4><div class="list">${opt1}</div>
      ${st.a1 != null ? `<p class="${st.dxOpts[st.a1] === c.cond ? 'cond-ok' : 'cond-bad'}">${st.dxOpts[st.a1] === c.cond ? '✔ Dobrze' : `✗ To ${esc(cond.pl)}`}</p><p class="note">${esc(cond.def)}</p>
        <h4>2. ${esc(c.step.q)}</h4><div class="list">${opt2}</div>` : ''}
      ${st.a2 != null ? `<p class="${st.a2 === c.step.ok ? 'cond-ok' : 'cond-bad'}">${st.a2 === c.step.ok ? '✔ Dobrze' : `✗ Poprawnie: ${esc(c.step.opts[c.step.ok])}`}</p>${card('Wyjaśnienie', p(c.step.why), null, 'tip')}
        <div class="acts"><button class="primary" data-cd-card="${c.cond}">Karta: ${esc(cond.pl)}</button><button data-cd="nextcase">Następny przypadek</button></div>` : ''}`;
  }

  // ---------------- zdarzenia ----------------
  panelBody.addEventListener('input', (e) => {
    if (!ctx.modeIs('cond')) return;
    if (e.target.id === 'condq') { S.filter = e.target.value; renderList(); }
    else if (e.target.id === 'cdk' && staged) { S.playing = false; S.k = e.target.value / 1000; ctx.motion.set(S.k); props?.update(); engine.invalidate(); const b = panelBody.querySelector('[data-cd=play]'); if (b) b.textContent = 'Odtwórz'; }
  });
  panelBody.addEventListener('click', (e) => {
    if (!ctx.modeIs('cond')) return;
    const t = e.target, A = t.closest('[data-cd]'), O = t.closest('[data-cond-open]'), T = t.closest('[data-cond-test]'), M = t.closest('[data-muscle]'), N = t.closest('[data-nerve]');
    const SC = t.closest('[data-cd-scope]'), OP = t.closest('[data-cd-opt]'), CC = t.closest('[data-cd-card]'), CO = t.closest('[data-case-open]'), A1 = t.closest('[data-case-a1]'), A2 = t.closest('[data-case-a2]');
    const hit = A || O || T || M || N || SC || OP || CC || CO || A1 || A2; if (!hit) return;
    e.stopImmediatePropagation();
    if (O) return open(O.dataset.condOpen, 'home');
    if (T) { stop(); ctx.setMode('clinic'); ctx.openFT?.(T.dataset.condTest); return; }
    if (M) { stop(); ctx.setMode('atlas'); ctx.select(model.muscleEntity(M.dataset.muscle, 'r'), { isolate: true }); return; }
    if (N) { stop(); ctx.setMode('atlas'); ctx.select(model.nerveEntity(N.dataset.nerve, 'r'), { isolate: true }); return; }
    if (SC) return quizStart(SC.dataset.cdScope);
    if (OP) { const q = S.quiz.qs[S.quiz.i]; if (q.ans != null) return; q.ans = +OP.dataset.cdOpt; const right = q.opts[q.ans] === q.key; if (right) S.quiz.ok++; const pr = prog(q.key); store.put('learn', `cond:${q.key}`, { ...pr, ok: (pr.ok ?? 0) + (right ? 1 : 0), bad: (pr.bad ?? 0) + (right ? 0 : 1) }); return quizRender(); }
    if (CC) return open(CC.dataset.cdCard, S.screen === 'case' ? 'case' : S.screen.startsWith('quiz') ? 'quiz' : 'home');
    if (CO) return caseOpen(CO.dataset.caseOpen);
    if (A1) { if (S.cas.a1 != null) return; S.cas.a1 = +A1.dataset.caseA1; return caseRender(); }
    if (A2) { if (S.cas.a2 != null) return; S.cas.a2 = +A2.dataset.caseA2; const c = CASES.find((x) => x.id === S.cas.id); store.put('learn', `case:${c.id}`, { done: true, ok: S.cas.dxOpts[S.cas.a1] === c.cond && S.cas.a2 === c.step.ok }); return caseRender(); }
    const a = A.dataset.cd;
    if (a === 'home') home();
    else if (a === 'back') { if (S.back === 'quiz' && S.quiz) { stop(); S.screen = S.quiz.i >= S.quiz.qs.length ? 'quizEnd' : 'quiz'; if (S.screen === 'quiz') quizRender(); else quizEnd(); } else if (S.back === 'case' && S.cas) { stop(); S.screen = 'case'; caseRender(); } else home(); }
    else if (a === 'quiz') quizSetup();
    else if (a === 'cases') casesList();
    else if (a === 'next') { S.quiz.i++; quizRender(); }
    else if (a === 'nextcase') { const i = CASES.findIndex((x) => x.id === S.cas.id); caseOpen(CASES[(i + 1) % CASES.length].id); }
    else if (a === 'play') { S.playing = !S.playing; S.last = 0; A.textContent = S.playing ? 'Pauza' : 'Odtwórz'; engine.invalidate(); }
    else if (a === 'mark') { const pr = prog(S.id); store.put('learn', `cond:${S.id}`, { ...pr, done: !pr.done }); A.classList.toggle('on', !pr.done); A.setAttribute('aria-pressed', String(!pr.done)); A.textContent = !pr.done ? '✔ Opanowane' : 'Oznacz jako opanowane'; }
  }, true);

  return {
    enter() {
      if (S.pending) { const id = S.pending; S.pending = null; open(id, 'home'); return; }
      if (S.screen === 'card' && S.id) open(S.id); else if (S.screen === 'quiz' && S.quiz) quizRender(); else if (S.screen === 'quizEnd' && S.quiz) quizEnd(); else if (S.screen === 'quizSetup') quizSetup(); else if (S.screen === 'cases') casesList(); else if (S.screen === 'case' && S.cas) caseRender(); else home();
    },
    leave() { stop(); },
    onPick(hit) { if (hit) { const ent = model.entityOf(hit.id); ctx.hint(`${ent.title}${ent.lat ? ` – ${ent.lat}` : ''}`); } return true; },
    /** Otwiera kartę schorzenia (z wyszukiwarki / notatki); gdy tryb nieaktywny – po wejściu. */
    open(id) { if (ctx.modeIs('cond')) open(id, 'home'); else S.pending = id; },
  };
}
