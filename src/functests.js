// Klinika → Testy funkcjonalne: karta testu (cel, wykonanie, normy, interpretacja, dlaczego działa, błędy) i animacja
// 3D z fazami, podświetleniem pracujących mięśni, środkiem ciężkości i podstawą podparcia oraz wariantem z błędem.
import * as THREE from 'three';
import FT, { FT_GROUPS } from './data/func_tests.js';
import CT, { CT_GROUPS } from './data/clinical_tests.js';
import { createProps } from './props.js';
import { testProps } from './poses.js';
import { prefs } from './settings.js';

const HI = '#ff7a45'; // mięśnie pracujące w bieżącej fazie
// kierunek kamery dla animacji (domyślnie z boku): [x, y, z] w układzie sylwetki (przód = +z, prawa strona = −x)
const VIEW = { sls: [0.15, 0.2, -1], sls_error: [0.15, 0.2, -1], slsquat: [0.25, 0.15, 1], slsquat_error: [0.25, 0.15, 1], stepdown: [0.25, 0.15, 1], stepdown_error: [0.25, 0.15, 1],
  ybalance: [0.35, 0.45, 1], foursquare: [0.4, 0.6, 1], sidebridge: [0.15, 0.3, 1], sidebridge_error: [0.15, 0.3, 1], shoulder: [0.25, 0.1, -1], deepsquat: [1, 0.15, 0.6], deepsquat_error: [1, 0.15, 0.6],
  romberg: [1, 0.15, 0.5], tug: [1.2, 0.5, 0.2], gait: [1.2, 0.3, 0.1], hop: [1, 0.2, 0.2], hop3: [1, 0.25, 0.2] };
const DURATION = { tug: 16, gait: 11, hop3: 7, ybalance: 9, rotary: 7, foursquare: 8, romberg: 8, slump: 12, mennell: 10, mcmurray: 9, apley_knee: 9, apley_scratch: 8, valgus: 8, lachman: 7, drawer_ant: 7, drawer_post: 7, phalen: 8 };
Object.assign(VIEW, { neer: [-0.9, 0.3, 0.6], hawkins: [-1, 0.3, 0.35], phalen: [-0.5, 0.3, 1], finkelstein: [-0.5, 0.25, 1], cozen: [-0.9, 0.35, 0.7], jobe: [0.1, 0.25, 1], gerber: [-0.4, 0.25, -1], speed: [-1, 0.2, 0.3], yergason: [-0.8, 0.3, 0.8], apley_scratch: [0.1, 0.15, -1],
  fairbank: [-0.5, 1, 0.4], slr: [-1, 0.35, 0.15], bragard: [-1, 0.35, 0.15], slump: [-1, 0.2, 0.3], faber: [-0.3, 1, 0.6], faddir: [-0.8, 0.6, 0.6], fingerfloor: [-1, 0.15, 0.3], mennell: [-1, 0.5, 0.1], wallangel: [-0.3, 0.2, 1],
  lachman: [-1, 0.35, 0.2], drawer_ant: [-1, 0.3, 0.2], drawer_post: [-1, 0.3, 0.2], valgus: [-0.2, 1, 0.4], mcmurray: [-0.9, 0.5, 0.5], apley_knee: [-1, 0.4, 0.3], ober: [0.1, 0.35, 1], thomas: [-1, 0.3, 0.1], kendall: [-1, 0.3, 0.1], hip_ir: [0.05, 0.6, -1] });
// kadr na okolicę badaną (punkty ciała z src/poses.js) zamiast całej sylwetki – testy kończyny górnej i kolana
const UPR = ['vertex', 'acromion.l', 'acromion.r', 'elbow.r', 'fingertip.r', 'hand.r', 'asis.l', 'asis.r'], UPB = [...UPR, 'elbow.l', 'fingertip.l', 'hand.l'];
const KNEE = ['asis.l', 'asis.r', 'knee.l', 'knee.r', 'heel.r', 'heelBack.r', 'toeTip.r', 'toe.r', 'kneeLow.r'];
const FOCUS = { neer: UPR, hawkins: UPR, cozen: UPR, finkelstein: UPR, speed: UPR, yergason: UPR, gerber: UPR, phalen: UPB, jobe: UPB, apley_scratch: UPB, fairbank: [...UPR, 'sternum', 'sacrum'],
  lachman: KNEE, drawer_ant: KNEE, drawer_post: KNEE, valgus: KNEE, mcmurray: [...KNEE, 'sacrum'], apley_knee: [...KNEE, 'sacrum'] };
const ALL = { ...FT, ...CT };
const isClin = (t) => !!t?.dodatni;

export function initFuncTests(ctx) {
  const { engine, model, view, applyView, panelBody, esc, card } = ctx;
  const S = { active: false, id: null, err: false, com: false, playing: true, k: 0, last: 0, phase: -1, muscles: [] };
  let props = null;
  const p = (t) => (t ? `<p>${esc(t)}</p>` : '');
  const T = () => ALL[S.id];
  const animKey = () => (S.err && T().anim.error ? T().anim.error : T().anim.key);

  function list() {
    stop(); S.active = true; S.id = null;
    const item = ([k, t]) => `<div class="it col" data-ft-open="${k}"><span>${esc(t.pl)}</span><small>${esc(t.skrot)} · ${esc(t.cel.length > 90 ? `${t.cel.slice(0, 90)}…` : t.cel)}</small></div>`;
    let h = `<div class="acts" style="margin-top:0"><button data-ft="back">‹ Klinika</button></div><h2>Testy funkcjonalne</h2>
      <p class="en">Każdy test: jak go wykonać, jak ocenić i – w animacji – dlaczego działa: fazy ruchu, siła badającego, pracujące mięśnie, miejsce bólu i wynik dodatni.</p>
      <h3 class="ft-sec">Testy z zajęć</h3><p class="note">Wynik pojedynczego testu nie stanowi samodzielnego rozpoznania – interpretuj go łącznie z wywiadem, badaniem funkcjonalnym, porównaniem ze stroną przeciwną i innymi testami.</p>`;
    for (const [g, name, also] of CT_GROUPS) h += `<h4>${name}</h4><div class="list">${[...Object.entries(CT).filter(([, t]) => t.grp === g), ...also.filter((k) => FT[k]).map((k) => [k, FT[k]])].map(item).join('')}</div>`;
    h += '<h3 class="ft-sec">Równowaga, wydolność i sport</h3>';
    for (const [g, name] of FT_GROUPS) h += `<h4>${name}</h4><div class="list">${Object.entries(FT).filter(([, t]) => t.grp === g).map(item).join('')}</div>`;
    panelBody.innerHTML = h; panelBody.scrollTop = 0;
    view.only = null; view.tints.clear(); view.iso = null; applyView(); ctx.home();
  }

  function render() {
    const t = T(), a = t.anim, clin = isClin(t);
    const normy = clin ? '' : `<table class="ft-norms">${t.normy.map(([g, v]) => `<tr><td>${esc(g)}</td><td>${esc(v)}</td></tr>`).join('')}</table>`;
    const video = t.video ? card('Film z badaniem', `<p><a href="https://www.youtube.com/watch?v=${encodeURIComponent(t.video)}" target="_blank" rel="noopener">Obejrzyj wykonanie testu (YouTube) ↗</a></p>`, '#93a0b4') : '';
    const links = t.muscles.map((k) => `<span class="link" data-muscle="${k}">${esc(ctx.MUSCLES[k].pl.replace(/^Mięsień |^Mięśnie /, ''))}</span>`).join(' · ');
    const joints = (t.joints ?? []).map((k) => `<span class="link" data-joint="${k}">${esc(ctx.JOINTS[k].pl)}</span>`).join(' · ');
    panelBody.innerHTML = `<div class="acts" style="margin-top:0"><button data-ft="list">‹ Testy funkcjonalne</button></div>
      <h2>${esc(t.pl)}</h2><div class="lat">${esc(t.en)} · ${esc(t.skrot)}</div>
      <div class="card ft-anim"><h5><i style="background:${HI}"></i>Animacja</h5>
        <input id="ftk" type="range" min="0" max="1000" value="${Math.round(S.k * 1000)}" aria-label="Postęp animacji">
        <p id="ftPhase" class="ft-phase"></p>
        <div class="acts" style="margin-bottom:0"><button data-ft="play" class="primary">${S.playing ? 'Pauza' : 'Odtwórz'}</button>
          ${a.com ? `<button data-ft="com" class="${S.com ? 'on' : ''}" aria-pressed="${S.com}">Środek ciężkości i podparcie</button>` : ''}
          ${a.error ? `<button data-ft="err" class="${S.err ? 'on' : ''}" aria-pressed="${S.err}">${clin ? (S.err ? 'Pokaż wynik prawidłowy' : 'Pokaż wynik dodatni') : (S.err ? 'Pokaż poprawnie' : 'Pokaż częsty błąd')}</button>` : ''}</div>
        ${S.err ? `<p class="ft-err">⚠ ${esc(a.errorLabel)}</p>` : ''}
        ${clin ? '<p class="note"><b style="color:#ffb020">➜</b> ruch bierny lub opór badającego · <b style="color:#4c9dff">➜</b> stabilizacja · <b style="color:#ff2d55">●</b> typowe miejsce bólu przy wyniku dodatnim.</p>' : ''}
        ${S.com ? '<p class="note"><b style="color:#ff3b6b">●</b> środek ciężkości i jego rzut na podłoże · <b style="color:#35c98a">▬</b> podstawa podparcia (stopy w kontakcie z podłożem). <span id="ftCom"></span></p>' : ''}
        <p class="note">Animacja jest schematyczna: kości poruszają się jak sztywne segmenty, pokazane są tylko mięśnie istotne dla testu.</p></div>
      ${clin ? `${card('Cel', p(t.cel), '#4c9dff')}${card('Pozycja', p(t.pozycja), '#93a0b4')}
      ${card('Wykonanie', `<ol class="ft-steps">${t.wykonanie.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`, '#3ecf8e')}
      ${card('Wynik dodatni', p(t.dodatni), '#c084fc')}${card('Najczęściej sugeruje', p(t.sugeruje), '#c084fc')}
      ${card('Dlaczego test działa', p(t.dlaczego), null, 'tip')}${t.uwaga ? card('Uwaga kliniczna', p(t.uwaga), null, 'clin') : ''}${video}
      ${card('Mięśnie i stawy', `<p>${links}</p>${joints ? `<p style="margin-top:6px">Stawy: ${joints}</p>` : ''}`, '#a83d36')}
      ${ctx.noteCard(`functest:${S.id}`, t.pl)}
      <p class="note">Opracowano na podstawie materiałów z zajęć. Wynik pojedynczego testu nie stanowi samodzielnego rozpoznania.</p>` : `
      ${card('Cel', p(t.cel), '#4c9dff')}${card('Dla kogo', p(t.dla), '#93a0b4')}${card('Sprzęt', p(t.sprzet), '#93a0b4')}
      ${card('Wykonanie', `<ol class="ft-steps">${t.wykonanie.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`, '#3ecf8e')}
      ${card('Polecenie dla pacjenta', `<p class="ft-quote">${esc(t.polecenie)}</p>`, '#3ecf8e')}
      ${card('Pomiar i punktacja', p(t.pomiar), '#c084fc')}${card('Normy i punkty odcięcia', normy, '#c084fc')}
      ${card('Interpretacja', p(t.interpretacja), '#c084fc')}${t.mcid && t.mcid !== '—' ? card('Istotna zmiana (MCID / MDC)', p(t.mcid), '#c084fc') : ''}
      ${card('Dlaczego test działa', p(t.dlaczego), null, 'tip')}
      ${card('Częste błędy', `<ul>${t.bledy.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`, null, 'clin')}${video}
      ${card('Mięśnie i stawy', `<p>${links}</p>${joints ? `<p style="margin-top:6px">Stawy: ${joints}</p>` : ''}`, '#a83d36')}
      ${ctx.noteCard(`functest:${S.id}`, t.pl)}
      <p class="note">Źródła: ${esc(t.src)}. Normy są orientacyjne – zależą od populacji i protokołu.</p>`}`;
    S.phase = -1; updatePhase(true);
  }

  async function stage(refocus = true) {
    const t = T(), key = animKey();
    await ctx.need('bones', 'muscles');
    if (!S.active || T() !== t) return;
    S.muscles = [...new Set([...t.muscles, ...t.anim.phases.flatMap((x) => x.muscles)])];
    const ok = ctx.motion.setup({ rig: `test:${key}` }, 'r', S.muscles);
    if (!ok) { ctx.hint('Animacja niedostępna', 'bad'); return; }
    props ??= createProps(engine, ctx.motion, model);
    const tp = testProps(ctx.motion._body, key); props.build(tp.list, tp.at, tp.fx);
    // widoczne: szkielet + mięśnie testu (obie strony)
    const only = new Set(model.meta.filter((m) => m.f === 'skeleton').map((m) => m.id));
    for (const k of S.muscles) for (const sd of ['r', 'l']) for (const id of model.muscleEntity(k, sd).ids) only.add(id);
    view.iso = null; view.tints.clear(); view.only = only; applyView();
    ctx.motion.set(S.k); props.update();
    if (refocus) frame(key);
    S.phase = -1; updatePhase(true);
    engine.frameCallbacks.add(tick);
  }
  // kadr obejmuje całą animację (kilka klatek) i rekwizyty
  function frame(key) {
    const M = ctx.motion, B = M._body, box = new THREE.Box3(), keep = S.k;
    const pts = FOCUS[key.replace('_error', '')] ?? ['vertex', 'heel.l', 'heel.r', 'toeTip.l', 'toeTip.r', 'fingertip.l', 'fingertip.r', 'occiput', 'sacrum', 'knee.l', 'knee.r', 'palm.l', 'palm.r'];
    for (const k of [0, 0.2, 0.4, 0.6, 0.8, 1]) { M.set(k); for (const n of pts) if (B.pt[n]) box.expandByPoint(M.pointAt(B.pt[n].p, B.pt[n].id)); }
    M.set(keep); props.update();
    const d = VIEW[key] ?? [1, 0.18, 0.3];
    engine.focus(box, { pad: 1.12, dir: new THREE.Vector3(...d).normalize() });
  }
  function stop() {
    engine.frameCallbacks.delete(tick);
    if (ctx.motion.active) ctx.motion.reset();
    props?.clear(); view.only = null; view.tints.clear();
  }

  function tick(now) {
    if (!S.active || !S.id) return false;
    const dt = Math.min(0.05, (now - (S.last || now)) / 1000); S.last = now;
    if (S.playing) {
      const dur = (DURATION[animKey().replace('_error', '')] ?? 6) / (prefs().speed || 1);
      S.k += dt / dur; if (S.k > 1) S.k -= 1;
      ctx.motion.set(S.k); props?.update();
      const sl = panelBody.querySelector('#ftk'); if (sl) sl.value = Math.round(S.k * 1000);
    }
    updatePhase();
    if (S.com) { const r = props?.updateCom(true); const el = panelBody.querySelector('#ftCom'); if (el && r) el.textContent = r.bos ? (r.inside ? 'Rzut środka ciężkości w podstawie podparcia – pozycja stabilna.' : 'Rzut środka ciężkości poza podstawą podparcia – ruch / ryzyko utraty równowagi.') : 'Faza bez kontaktu stopy z podłożem.'; }
    return S.playing || S.com;
  }
  function updatePhase(force) {
    const t = T(); if (!t) return;
    const ph = t.anim.phases; let i = 0;
    for (let j = 0; j < ph.length; j++) if (S.k >= ph[j].t) i = j;
    if (i === S.phase && !force) return;
    S.phase = i;
    const el = panelBody.querySelector('#ftPhase'); if (el) el.innerHTML = `<b>Faza ${i + 1}/${ph.length}:</b> ${esc(ph[i].label)}`;
    view.tints.clear();
    for (const k of ph[i].muscles) for (const sd of ['r', 'l']) for (const id of ctx.model.muscleEntity(k, sd).ids) view.tints.set(id, HI);
    applyView();
  }

  function open(id) {
    stop(); S.active = true; S.id = id; S.err = false; S.k = 0; S.playing = true; S.last = 0;
    if (!ALL[id]?.anim.com && S.com) { S.com = false; props?.updateCom(false); } // środek ciężkości tylko w testach, które go pokazują
    render(); panelBody.scrollTop = 0; stage();
  }

  panelBody.addEventListener('input', (e) => {
    if (!S.active || e.target.id !== 'ftk') return;
    S.playing = false; S.k = e.target.value / 1000; ctx.motion.set(S.k); props?.update(); updatePhase(); if (S.com) props?.updateCom(true); engine.invalidate();
    const b = panelBody.querySelector('[data-ft=play]'); if (b) b.textContent = 'Odtwórz';
  });
  panelBody.addEventListener('click', (e) => {
    if (!S.active || !ctx.modeIs('clinic')) return;
    const t = e.target, A = t.closest('[data-ft]'), O = t.closest('[data-ft-open]'), M = t.closest('[data-muscle]'), J = t.closest('[data-joint]');
    if (O) { open(O.dataset.ftOpen); e.stopImmediatePropagation(); return; }
    if (M) { e.stopImmediatePropagation(); leave(); ctx.setMode('atlas'); ctx.select(model.muscleEntity(M.dataset.muscle, 'r'), { isolate: true }); return; }
    if (J) { e.stopImmediatePropagation(); leave(); ctx.setMode('atlas'); ctx.select(model.jointEntity(J.dataset.joint, 'r'), { isolate: true }); return; }
    if (!A) return;
    e.stopImmediatePropagation();
    const a = A.dataset.ft;
    if (a === 'back') { leave(); ctx.clinicHome(); }
    else if (a === 'list') list();
    else if (a === 'play') { S.playing = !S.playing; S.last = 0; A.textContent = S.playing ? 'Pauza' : 'Odtwórz'; engine.frameCallbacks.add(tick); engine.invalidate(); }
    else if (a === 'com') { S.com = !S.com; if (!S.com) props?.updateCom(false); render(); engine.frameCallbacks.add(tick); engine.invalidate(); }
    else if (a === 'err') { S.err = !S.err; S.k = 0; render(); stop(); S.active = true; stage(false); }
  }, true);

  function leave() { stop(); S.active = false; S.id = null; props?.updateCom(false); }
  return { list, open, leave, active: () => S.active, current: () => S.id };
}
