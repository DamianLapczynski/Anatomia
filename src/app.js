// Aplikacja: stan widoku, interfejs atlasu, izolacja, ruch; quiz i powtórki w osobnych modułach.
import * as THREE from 'three';
import { Engine, FILES } from './engine.js';
import { buildModel, LAYERS, LAYER_FILE, REGIONS, MUSCLES, NERVES, JOINTS } from './model.js';
import { MOVES } from './data/movements.js';
import { Motion } from './motion.js';
import { initQuiz } from './quiz.js';
import { initSrs } from './srs.js';
import { initLearn } from './learn.js';
import { initClinic } from './clinic.js';
import { landmarkPL } from './data/landmarks.js';
import { polishName } from './data/names.js';
import { structDesc } from './data/struct_kb.js';
import { initKeys } from './keys.js';
import { store } from './store.js';
import { initSettings, prefs, THEMES, setStyle } from './settings.js';
// kroje stylów Atlas (Fraunces) i Noir (Instrument Serif) – przeglądarka pobiera je dopiero, gdy styl ich użyje
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/fraunces/latin-ext-600.css';
import '@fontsource/fraunces/latin-500-italic.css';
import '@fontsource/fraunces/latin-ext-500-italic.css';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-ext-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource/instrument-serif/latin-ext-400-italic.css';
import '@fontsource/bodoni-moda/latin-500.css';
import '@fontsource/bodoni-moda/latin-ext-500.css';
import '@fontsource/bodoni-moda/latin-500-italic.css';
import '@fontsource/bodoni-moda/latin-ext-500-italic.css';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BASE = import.meta.env.BASE_URL;
const app = $('#app'), panelBody = $('#panelBody'), left = $('#left'), hintEl = $('#hint'), marks = $('#marks');
const SIDE_PL = { r: 'strona prawa', l: 'strona lewa', '': '' };
const LAYER_PL = Object.fromEntries(LAYERS.map(([k, n]) => [k, n]));
const LAYER_COLOR = Object.fromEntries(LAYERS.map(([k, , c]) => [k, c]));
const REG_PL = Object.fromEntries(REGIONS);

const engine = new Engine($('#c'));
const view = {
  layers: { bones: true, joints: false, muscles: true, fascia: false, attachments: false, arteries: false, veins: false, heart: false, nerves: false, cns: false },
  side: 'both', region: 'all', depth: 'all', hidden: new Set(), sel: new Set(), extra: new Set(), tints: new Map(), iso: null, only: null,
};
let model, labels = [], motion, mode = 'atlas', current = null, descCache = {};
const modes = {};

// ---------- stan widoku ----------
const CTX = ['att', 'bones', 'nerves', 'path', 'arteries', 'muscles'];
function stateOf(m) {
  if (mode === 'atlas' && view.hidden.has(m.id) && !view.iso?.focus.has(m.id)) return null; // ukrycie działa tylko w atlasie
  const t = view.tints.get(m.id);
  if (t) return `tint:${t}`;
  const iso = view.iso;
  if (iso) {
    if (iso.focus.has(m.id)) return `base:${m.layer}`;
    for (const k of CTX) if (iso.show[k] && iso[k]?.has(m.id)) return k === 'path' ? 'tint:#b8922a' : `base:${m.layer}`;
    if (iso.others === 'hide') return null;
    if (m.layer === 'bones') return 'ghost';
    return m.layer === 'muscles' && !iso.bonesOnly && (!iso.side || !m.s || m.s === iso.side) ? 'ghost' : null;
  }
  if (view.only) return view.only.has(m.id) ? `base:${m.layer}` : null;
  if (view.extra.has(m.id)) return view.sel.has(m.id) ? `sel:${m.layer}` : `base:${m.layer}`;
  if (!view.layers[m.layer]) return null;
  if (m.layer === 'muscles' && view.depth !== 'all' && m.sup !== (view.depth === 'sup')) return null;
  if (view.side !== 'both' && m.s && m.s !== view.side) return null;
  if (view.region !== 'all' && m.reg !== view.region) return null;
  return view.sel.has(m.id) ? `sel:${m.layer}` : `base:${m.layer}`;
}
function applyView() { engine.apply(stateOf); }
function need(...layers) { return engine.ensureAll([...new Set(layers.map((l) => LAYER_FILE[l] ?? l))]).then(applyView); }

function hint(text, cls = '', ms = 2200) {
  hintEl.textContent = text; hintEl.className = `show ${cls}`;
  clearTimeout(hint.t); if (ms) hint.t = setTimeout(() => { hintEl.className = ''; }, ms);
}

// ---------- panel warstw ----------
function renderLeft() {
  left.innerHTML = `
    <h4>Warstwy</h4>
    ${LAYERS.map(([k, n, c]) => `<div class="layer ${view.layers[k] ? 'on' : ''}" data-layer="${k}" style="--c:${c}" role="switch" aria-checked="${!!view.layers[k]}" tabindex="0"><i></i><span>${n}</span></div>`).join('')}
    <h4>Warstwa mięśni</h4>
    <div class="seg" data-seg="depth">${[['all', 'Wszystkie'], ['sup', 'Powierzchowne'], ['deep', 'Głębokie']].map(([k, n]) => `<button data-v="${k}" class="${view.depth === k ? 'on' : ''}" aria-pressed="${view.depth === k}">${n}</button>`).join('')}</div>
    <h4>Strona ciała</h4>
    <div class="seg" data-seg="side">${[['both', 'Obie'], ['r', 'Prawa'], ['l', 'Lewa']].map(([k, n]) => `<button data-v="${k}" class="${view.side === k ? 'on' : ''}" aria-pressed="${view.side === k}">${n}</button>`).join('')}</div>
    <h4>Okolica</h4>
    <div class="seg" data-seg="region">${REGIONS.map(([k, n]) => `<button data-v="${k}" class="${view.region === k ? 'on' : ''}" aria-pressed="${view.region === k}">${n}</button>`).join('')}</div>
    <h4>Szybkie zestawy</h4>
    <div class="seg">
      <button data-preset="skeleton">Szkielet</button><button data-preset="muscles">Mięśnie</button>
      <button data-preset="neuro">Nerwy</button><button data-preset="vessels">Naczynia</button>
      <button data-preset="attach">Przyczepy</button><button data-preset="joints">Więzadła</button>
    </div>
    <h4>Wygląd</h4>
    <div class="themes">${THEMES.map(([k, n, bg, acc]) => `<button data-style="${k}" class="${theme() === k ? 'on' : ''}" style="--sw-acc:${acc}"><b style="background:${bg}"></b>${n}</button>`).join('')}</div>
    <h4>Widok</h4>
    <div class="seg"><button data-act="showall">Pokaż ukryte${view.hidden.size ? ` (${view.hidden.size})` : ''}</button><button data-act="reset">Reset</button></div>
    <p class="note">Modele 3D: Z-Anatomy / BodyParts3D (CC BY-SA 4.0). Treści opisowe do nauki – weryfikuj z podręcznikiem i prowadzącym.</p>`;
}
// ---------- dostępność z klawiatury ----------
// klikalne elementy list, chipy i linki w panelach dostają fokus i rolę przycisku; Enter / Spacja je uruchamia
const A11Y_SEL = '.list .it, .chip, .link, .test, .mark';
function a11yMark(root) { for (const el of root.querySelectorAll(A11Y_SEL)) if (!el.hasAttribute('tabindex')) { el.tabIndex = 0; if (!el.getAttribute('role')) el.setAttribute('role', 'button'); } }
for (const root of [panelBody, left, marks]) {
  new MutationObserver(() => a11yMark(root)).observe(root, { childList: true, subtree: true });
  root.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.(`${A11Y_SEL}, [data-layer]`)) { e.preventDefault(); e.stopPropagation(); e.target.click(); }
  });
}
// ---------- motywy ----------
// styl ustawia settings.js (applyLook); tu tylko scena 3D i podświetlenie miniatury w panelu warstw
const theme = () => document.documentElement.dataset.theme || 'graphite';
const setTheme = (k) => setStyle(k);
document.addEventListener('anatomia:look', (e) => { engine.setLook(e.detail); if (left.querySelector('.themes')) renderLeft(); });
// pływające panele na komputerze: model centrujemy w odsłoniętej części sceny
function updateInsets() {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width && r.height ? r : null; };
  if (!matchMedia('(min-width: 821px)').matches || document.body.matches('.post, .reel')) return engine.setInsets({});
  const L = vis(left), P = vis($('#panel')), T = vis($('#top'));
  engine.setInsets({ l: L ? L.right : 0, r: P ? innerWidth - P.left : 0, t: T ? T.bottom : 0 });
}
addEventListener('resize', updateInsets);
requestAnimationFrame(updateInsets);
engine.setLook(theme());
const PRESETS = {
  skeleton: ['bones'], muscles: ['bones', 'muscles'], neuro: ['bones', 'nerves', 'cns'], vessels: ['bones', 'arteries', 'veins', 'heart'],
  attach: ['bones', 'attachments'], joints: ['bones', 'joints'],
};
left.addEventListener('click', (e) => {
  // uwaga: nie data-theme – ten atrybut ma też <html>, więc closest() łapałby każde kliknięcie w panelu
  const T = e.target.closest('[data-style]');
  if (T) { setTheme(T.dataset.style); renderLeft(); return; }
  const L = e.target.closest('[data-layer]'), S = e.target.closest('[data-seg] button'), P = e.target.closest('[data-preset]'), A = e.target.closest('[data-act]');
  if (L) { const k = L.dataset.layer; view.layers[k] = !view.layers[k]; exitIso(false); if (view.layers[k]) { hintLoad(k); need(k); } }
  else if (S) { const k = S.parentElement.dataset.seg; view[k] = S.dataset.v; exitIso(false); if (k === 'depth' && !view.layers.muscles) { view.layers.muscles = true; need('muscles'); } if (k !== 'depth' && (view.region !== 'all' || view.side !== 'both')) focusVisible(); }
  else if (P) { for (const k in view.layers) view.layers[k] = PRESETS[P.dataset.preset].includes(k); exitIso(false); need(...PRESETS[P.dataset.preset]); }
  else if (A?.dataset.act === 'showall') view.hidden.clear();
  else if (A?.dataset.act === 'reset') { if (mode !== 'atlas') setMode('atlas'); resetView(); }
  else return;
  renderLeft(); applyView(); if (mode === 'atlas') renderAtlas();
});
function hintLoad(layer) { if (!engine.loaded.has(LAYER_FILE[layer])) hint(`Wczytywanie: ${LAYER_PL[layer]}…`, '', 1500); }
function resetView() {
  Object.assign(view.layers, { bones: true, joints: false, muscles: true, fascia: false, attachments: false, arteries: false, veins: false, heart: false, nerves: false, cns: false });
  view.side = 'both'; view.region = 'all'; view.depth = 'all'; view.hidden.clear(); view.sel.clear(); view.extra.clear(); view.tints.clear(); view.iso = null; view.only = null;
  current = null; clearMarks(); home(); if (mode === 'atlas') renderAtlas();
}
function home() { engine.focus(new THREE.Box3(new THREE.Vector3(-0.45, 0, -0.2), new THREE.Vector3(0.45, 1.72, 0.2)), { dir: new THREE.Vector3(0, 0, 1), pad: 1.06, frontal: true }); }
function visibleIds() { const out = []; for (const m of model.meta) if (engine.meshes[m.id]?.visible) out.push(m.id); return out; }
function focusVisible() { applyView(); const ids = visibleIds(); if (ids.length) engine.focus(ids, { pad: 1.1 }); }

// ---------- wyszukiwarka ----------
const q = $('#q'), results = $('#results');
const KIND_COLOR = { muscle: '#a83d36', nerve: '#f5cc33', complex: '#3ecf8e', landmark: '#ffb454', joint: '#cfcbb5' };
q.addEventListener('input', () => {
  const list = model ? model.find(q.value) : [];
  results.hidden = !list.length;
  results.innerHTML = list.map((r, i) => `<div class="r" data-i="${i}"><span class="dot" style="background:${KIND_COLOR[r.kind] ?? LAYERS.find((l) => l[0] === r.layer)?.[2] ?? '#888'}"></span><div><b>${esc(r.label)}</b><small>${esc(r.sub ?? '')}</small></div></div>`).join('');
  results._list = list;
});
results.addEventListener('click', (e) => {
  const r = e.target.closest('.r'); if (!r) return;
  const it = results._list[+r.dataset.i];
  results.hidden = true; q.blur();
  if (it.kind === 'complex') { modes.learn.openComplex(it.key); if (mode === 'learn') modes.learn.enter(); else setMode('learn'); return; }
  setMode('atlas');
  openItem(it);
});
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#searchbox')) results.hidden = true; });
q.addEventListener('keydown', (e) => { if (e.key === 'Enter' && results._list?.length && !results.hidden) { e.preventDefault(); results.querySelector('.r').click(); } });
q.addEventListener('focus', () => { if (q.value && results._list?.length) results.hidden = false; });
function defSide(kind, key) {
  const side = view.side !== 'both' ? view.side : prefs().side;
  return side;
}
function openItem(it) {
  let ent;
  if (it.kind === 'muscle') ent = model.muscleEntity(it.key, defSide());
  else if (it.kind === 'nerve') ent = model.nerveEntity(it.key, defSide());
  else if (it.kind === 'landmark') ent = model.landmarkEntity(it.li, defSide());
  else if (it.kind === 'joint') ent = model.jointEntity(it.key, defSide());
  else ent = model.structEntity(it.id);
  select(ent, { isolate: true });
}

// ---------- zaznaczanie i izolacja ----------
function select(ent, { isolate = false, focus = true } = {}) {
  current = ent; clearMarks(); if (mode === 'atlas') view.tints.clear();
  view.sel = new Set(ent.ids); view.extra.clear();
  ent.ids.forEach((i) => view.hidden.delete(i)); // wybranie struktury z wyszukiwarki lub listy cofa jej ukrycie
  if (isolate || view.iso) isolateEntity(ent, focus);
  else if (ent.clicked && !view.layers.muscles) { // klik w pole przyczepu przy wyłączonych mięśniach: pokaż tylko ten mięsień
    ent.att.forEach((i) => view.sel.add(i)); view.extra = new Set(ent.ids); need('muscles');
  } else {
    const layers = new Set(ent.ids.map((i) => model.meta[i].layer));
    let changed = false;
    for (const l of layers) if (!view.layers[l]) { view.layers[l] = true; changed = true; }
    if (changed) renderLeft();
    need(...layers);
    if (focus) engine.focus(ent.ids, { pad: 2.2 });
  }
  if (mode === 'atlas') renderAtlas();
  app.classList.remove('sheet-min', 'sheet-max');
}
function isolateEntity(ent, focus = true) {
  const prev = view.iso;
  const iso = { focus: new Set(ent.ids), side: ent.side, others: prev?.others ?? 'ghost', show: prev?.show ?? { att: true, bones: true, nerves: true, path: true, arteries: true, muscles: true } };
  const files = ['bones'];
  if (ent.type === 'muscle') {
    iso.att = new Set(ent.att); iso.bones = new Set(ent.bones); iso.nerves = new Set(ent.nerves); iso.path = new Set(ent.nervePath); iso.arteries = new Set(ent.arteries);
    files.push('muscles', 'attachments', 'nerves', 'arteries');
  } else if (ent.type === 'landmark') {
    iso.bonesOnly = true; iso.att = new Set(); iso.muscles = new Set(); iso.show = { att: true, muscles: prev?.show?.muscles ?? false };
    files.push('attachments', 'muscles');
  } else if (ent.type === 'joint') {
    iso.bonesOnly = true; iso.bones = new Set(ent.bones); iso.show = { bones: true };
    files.push('joints');
  } else if (ent.type === 'nerve') {
    iso.path = new Set(ent.nervePath);
    iso.muscles = new Set(ent.muscles.flatMap((m) => m.mesh.flatMap((n) => model.ids(n, ent.side))));
    files.push('nerves', 'muscles');
  } else { files.push(ent.layer); iso.bonesOnly = ent.layer === 'bones' || ent.layer === 'joints'; }
  view.iso = iso;
  need(...files).then(() => {
    if (ent.type === 'landmark' && view.iso === iso) landmarkNear(ent, iso);
    if (!focus || view.iso !== iso) return;
    if (ent.type === 'landmark') return focusPoint(ent, entDirPoint(ent));
    if (ent.type === 'joint') { const d = ent.kb.dir ?? [0, 0, 1], sx = ent.side === 'l' ? -1 : 1; return engine.focus(ent.ids.length ? ent.ids : ent.bones, { pad: 1.7, dir: new THREE.Vector3(sx * d[0], d[1], d[2]).normalize() }); }
    engine.focus([...iso.focus, ...(iso.att ?? [])], { pad: ent.type === 'struct' ? 1.9 : 1.6, dir: entDir(ent) });
  });
  applyView();
}
// Kierunek patrzenia: od strony, po której mięsień leży względem kości, do których się przyczepia.
function entDir(ent) {
  if (ent.type !== 'muscle' || !ent.bones.length || !ent.ids.length) return null;
  const c = engine.boxOf(ent.ids).getCenter(new THREE.Vector3()), b = engine.boxOf(ent.bones).getCenter(new THREE.Vector3());
  const d = c.clone().sub(b); d.y *= 0.25;
  if (d.length() <= 0.012) return null;
  d.normalize();
  if (Math.abs(d.y) > 0.55) { // mięsień leży nad/pod kośćmi – patrzymy z boku ciała, lekko z góry, zamiast pionowo
    const h = new THREE.Vector3(c.x, 0, c.z).normalize();
    d.set(h.x * 0.85, 0.35 * Math.sign(d.y), h.z * 0.85).normalize();
  }
  return d;
}
// ---------- punkty kostne z wyszukiwarki: kość + przyczepy mięśni w pobliżu ----------
function landmarkNear(ent, iso) {
  const r = model.nearMuscles(ent, (id) => engine.meshes[id]?.geometry.attributes.position.array);
  ent.near = r.muscles;
  r.patches.forEach((i) => iso.att.add(i));
  for (const m of r.muscles) for (const id of model.muscleEntity(m.key, ent.side || 'r').ids) iso.muscles.add(id);
  applyView(); showPointMark(ent);
  if (mode === 'atlas' && current === ent) renderAtlasKeepScroll();
}
function showPointMark(ent) {
  clearMarks();
  const el = document.createElement('div'); el.className = 'mark act'; el.innerHTML = `<em>${esc(ent.title)}</em>`; marks.appendChild(el);
  markList = [{ el, v: new THREE.Vector3(...ent.point), l: null }]; placeMarks();
}
function entDirPoint(ent) { // patrzymy na punkt od zewnątrz kości
  const c = engine.boxOf(ent.bones).getCenter(new THREE.Vector3()), d = new THREE.Vector3(...ent.point).sub(c);
  d.y *= 0.3; // głównie z boku, lekko z góry/dołu – nie wzdłuż kości
  if (d.x * d.x + d.z * d.z < 1e-6) d.set(0, d.y, 1);
  return d.normalize();
}
function focusPoint(ent, dir) { engine.focus(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(...ent.point), new THREE.Vector3(0.1, 0.1, 0.1)), { pad: 1.3, dir }); }
function openLandmark(li, side) { const ent = model.landmarkEntity(li, side); if (ent) { setMode('atlas'); select(ent, { isolate: true }); } }

function exitIso(render = true) { if (!view.iso) return; view.iso = null; applyView(); if (render && mode === 'atlas') renderAtlas(); }

engine.addEventListener('pick', (e) => {
  const hit = e.detail;
  if (modes[mode]?.onPick && modes[mode].onPick(hit) !== false) return;
  if (mode !== 'atlas') return;
  if (!hit) { if (!view.iso) { view.sel.clear(); view.extra.clear(); current = null; clearMarks(); applyView(); renderAtlas(); } return; }
  const ent = model.entityOf(hit.id);
  select(ent, { focus: false });
  applyView();
});

// ---------- punkty kostne ----------
let markList = [];
function clearMarks() { markList = []; marks.innerHTML = ''; marks.classList.remove('always'); }
function showMarks(ent) {
  clearMarks();
  const m = ent.meta, key = m.s ? `${m.n}.r` : m.n;
  const list = labels.filter((l) => l.p === key);
  markList = list.map((l, i) => {
    const el = document.createElement('div'); el.className = 'mark'; el.dataset.i = i;
    el.innerHTML = `<em>${esc(landmarkPL(l.n) ?? model.latin[l.n] ?? l.n)}</em>`;
    marks.appendChild(el);
    return { el, v: new THREE.Vector3(m.s === 'l' ? -l.b[0] : l.b[0], l.b[1], l.b[2]), l };
  });
  placeMarks();
  return list;
}
/** Znaczniki punktów (np. dermatomy w trybie Klinika): [{ v: [x, y, z], label, act }]; withLabels – podpisy zawsze widoczne. */
function setPointMarks(list, withLabels = false) {
  clearMarks(); marks.classList.toggle('always', withLabels);
  markList = list.map(({ v, label, act }, i) => {
    const el = document.createElement('div'); el.className = `mark${act ? ' act' : ''}`; el.dataset.i = i; el.innerHTML = `<em>${esc(label)}</em>`; marks.appendChild(el);
    return { el, v: new THREE.Vector3(...v), l: null };
  });
  placeMarks();
}
function placeMarks() {
  for (const k of markList) { const p = engine.project(k.v); k.el.style.transform = `translate(${p.x}px,${p.y}px)`; k.el.style.display = p.behind ? 'none' : ''; }
}
engine.addEventListener('render', () => { if (markList.length) placeMarks(); });
function activateMark(i, scroll) {
  markList.forEach((k, j) => k.el.classList.toggle('act', j === i));
  panelBody.querySelectorAll('[data-mark]').forEach((el) => el.classList.toggle('on', +el.dataset.mark === i));
  if (scroll) panelBody.querySelector(`[data-mark="${i}"]`)?.scrollIntoView({ block: 'nearest' });
}
marks.addEventListener('click', (e) => { const el = e.target.closest('.mark'); if (el) activateMark(+el.dataset.i, true); });

// ---------- panel atlasu ----------
const card = (title, body, color, cls = '') => (body ? `<div class="card ${cls}"><h5>${color ? `<i style="background:${color}"></i>` : ''}${title}</h5>${body}</div>` : '');
const p = (t) => (t ? `<p>${esc(t)}</p>` : '');
/** Własna notatka przy strukturze (zapis w store „notes”, synchronizowany z kontem). */
function noteCard(id, title) {
  const n = store.get('notes', id);
  return `<details class="card note-card"${n?.text ? ' open' : ''}><summary><h5><i style="background:#ffd166"></i>Moja notatka${n?.text ? '' : ' – dodaj'}</h5></summary><textarea data-note="${esc(id)}" data-title="${esc(title)}" rows="3" placeholder="Skojarzenie, uwaga z zajęć, pytanie do prowadzącego…" aria-label="Moja notatka">${esc(n?.text ?? '')}</textarea></details>`;
}
let noteTimer = 0;
document.addEventListener('input', (e) => {
  const ta = e.target.closest?.('textarea[data-note]'); if (!ta) return;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => {
    const text = ta.value.trim(), id = ta.dataset.note;
    if (text) store.put('notes', id, { text, title: ta.dataset.title }); else if (store.get('notes', id)) store.del('notes', id);
  }, 400);
});
/** Otwiera strukturę, do której należy notatka (id: rodzaj:klucz). */
function openNote(id) {
  const [kind, ...rest] = id.split(':'), key = rest.join(':'), side = defSide();
  if (kind === 'complex') { modes.learn.openComplex(key); if (mode === 'learn') modes.learn.enter(); else setMode('learn'); return; }
  setMode('atlas');
  if (kind === 'muscle' && MUSCLES[key]) select(model.muscleEntity(key, side), { isolate: true });
  else if (kind === 'nerve' && NERVES[key]) select(model.nerveEntity(key, side), { isolate: true });
  else if (kind === 'joint' && JOINTS[key]) select(model.jointEntity(key, side), { isolate: true });
  else if (kind === 'struct') { const i = model.ids(key, side)[0] ?? model.names.get(key)?.[0]; if (i != null) select(model.structEntity(i), { isolate: true }); }
  else if (kind === 'landmark') { const li = labels.findIndex((l) => l.n === key); if (li >= 0) openLandmark(li, side); }
}
/** Badanie mięśnia: palpacja, test siły (Lovett), test długości. */
function examCards(k) {
  const rows = [['Palpacja', k.palp], ['Test siły', k.mmt], ['Test długości / rozciąganie', k.len]].filter(([, t]) => t && t !== '—');
  if (!rows.length) return '';
  return card('Badanie', rows.map(([t, x]) => `<p><b>${t}:</b> ${esc(x)}</p>`).join('<div style="height:6px"></div>') + '<p class="note">Skala Lovetta: 0 – brak skurczu, 1 – ślad skurczu, 2 – ruch bez grawitacji, 3 – pełny ruch przeciw grawitacji, 4 – przeciw umiarkowanemu oporowi, 5 – siła prawidłowa.</p>', '#c084fc');
}
function nerveLinks(kb) {
  const keys = new Set(model.nervesOfMuscle(kb.key));
  return [...keys].map((k) => `<span class="link" data-nerve="${k}">${esc(NERVES[k].pl)}</span>`).join(' · ');
}
function isoControls() {
  const iso = view.iso; if (!iso) return '';
  const chip = (k, label) => (iso[k]?.size ? `<span class="chip ${iso.show[k] ? 'on' : ''}" data-ctx="${k}">${label}</span>` : '');
  return `<div class="card"><h5>Izolacja – co pokazać</h5><div class="chips">
    ${chip('att', 'Przyczepy')}${chip('bones', 'Kości przyczepów')}${chip('nerves', 'Nerw')}${chip('path', 'Droga od korzeni')}${chip('arteries', 'Tętnica')}${chip('muscles', current?.type === 'landmark' ? 'Mięśnie' : 'Unerwiane mięśnie')}
    <span class="chip ${iso.others === 'ghost' ? 'on' : ''}" data-ctx="others">Reszta ciała półprzezroczysta</span></div>
    ${current?.type === 'muscle' ? '<div class="legend"><span><i style="background:#e62929"></i>przyczep początkowy</span><span><i style="background:#266bf2"></i>przyczep końcowy</span><span><i style="background:#f5cc33"></i>nerw</span><span><i style="background:#d12120"></i>tętnica</span></div>' : ''}</div>`;
}
function actions(ent) {
  const sides = ent.type !== 'struct' || ent.side ? `<button data-act="side">${ent.side === 'r' ? 'Pokaż lewą' : ent.side === 'l' ? 'Pokaż prawą' : ''}</button>` : '';
  return `<div class="acts">
    <button data-act="iso" class="${view.iso ? 'on' : 'primary'}">${view.iso ? 'Zakończ izolację' : 'Izoluj'}</button>
    <button data-act="center">Centruj</button><button data-act="hide">Ukryj</button>${ent.side ? sides : ''}
  </div>`;
}
function renderAtlas() {
  const ent = current;
  if (!ent) {
    panelBody.innerHTML = `<h2>Atlas 3D <small class="swipe">– dotknij strukturę; przeciągnij ten panel w górę</small></h2><div class="empty"><ul>
      <li><b>Dotknij / kliknij</b> strukturę, aby zobaczyć jej opis.</li>
      <li><b>Izoluj</b> – mięsień z polami przyczepów na kościach, nerwem i tętnicą.</li>
      <li><b>Ukryj</b> – zdejmuj kolejne warstwy, żeby dojść do głębokich mięśni.</li>
      <li>Obrót: przeciągnij · Przybliżenie: kółko / szczypanie · Przesunięcie: prawy przycisk / dwa palce.</li>
      <li>Warstwy i okolice ciała wybierasz w panelu po lewej${matchMedia('(max-width:820px)').matches ? ' (☰)' : ''}.</li></ul></div>
      <h4>Na start</h4><div class="chips">${['deltoid', 'supraspinatus', 'biceps_brachii', 'gluteus_medius', 'rectus_femoris', 'gastrocnemius', 'diaphragm', 'sternocleidomastoid'].map((k) => `<span class="chip" data-muscle="${k}">${esc(MUSCLES[k].pl.replace('Mięsień ', ''))}</span>`).join('')}
      ${['brachial_plexus', 'median', 'sciatic'].map((k) => `<span class="chip" data-nerve="${k}">${esc(NERVES[k].pl)}</span>`).join('')}</div>`;
    return;
  }
  let h = `<h2>${esc(ent.title)}</h2>${ent.lat ? `<div class="lat">${esc(ent.lat)}</div>` : ''}`;
  if (ent.type === 'muscle') {
    const k = ent.kb, moves = MOVES.filter((m) => m.ago.includes(ent.key) || m.syn.includes(ent.key));
    h += `<div class="tags"><span class="tag">${esc(k.grp)}</span><span class="tag">warstwa ${k.sup ? 'powierzchowna' : 'głęboka'}</span>${ent.side ? `<span class="tag">${SIDE_PL[ent.side]}</span>` : ''}</div>`;
    if (ent.clicked) h += `<p class="en">Kliknięto pole przyczepu ${ent.clicked.role === 'origin' ? '<b style="color:var(--orig)">początkowego</b>' : '<b style="color:var(--ins)">końcowego</b>'} na: ${esc(boneTitle(ent.clicked.bone))}${ent.clicked.shared.length ? ` (wspólne z: ${ent.clicked.shared.map((s) => esc(MUSCLES[s].lat)).join(', ')})` : ''}</p>`;
    else if (ent.part) h += `<p class="en">Kliknięta część: ${esc(polishName(ent.part) ?? model.latin[ent.part] ?? ent.part)}</p>`;
    h += actions(ent) + isoControls();
    h += card('Przyczep początkowy', p(k.o), '#e62929') + card('Przyczep końcowy', p(k.i), '#266bf2');
    h += card('Unerwienie', p(k.n) + (nerveLinks(k) ? `<p style="margin-top:6px">→ ${nerveLinks(k)}</p>` : ''), '#f5cc33');
    h += card('Unaczynienie', p(k.a), '#d12120');
    h += card('Czynność', `<ul>${k.f.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>${moves.length ? `<p style="margin-top:6px">Zobacz w ruchu: ${moves.map((m) => `<span class="link" data-move="${m.id}">${esc(m.pl)}</span>`).join(' · ')}</p>` : ''}`, '#3ecf8e');
    h += examCards(k);
    h += card('Klinika i fizjoterapia', p(k.k), null, 'clin') + card('Skojarzenie', p(k.s), null, 'tip') + noteCard(`muscle:${ent.key}`, k.pl);
    if (!ent.att.length) h += '<p class="note">Dla tego mięśnia model nie zawiera osobnych pól przyczepów – opis przyczepów powyżej.</p>';
  } else if (ent.type === 'landmark') {
    h += `<div class="en">${esc(ent.en)}</div><div class="tags"><span class="tag">Punkt kostny</span><span class="tag link" data-act="bone">${esc(ent.bonePl)}</span>${ent.side ? `<span class="tag">${SIDE_PL[ent.side]}</span>` : ''}</div>`;
    h += actions(ent) + isoControls();
    const near = ent.near;
    const role = (m) => [...m.roles].map((r) => (r === 'origin' ? '<b style="color:#ff6b6b">początek</b>' : '<b style="color:#6ea0ff">koniec</b>')).join(' · ');
    const how = (m) => (Number.isFinite(m.d) ? (m.d < 0.004 ? 'na punkcie' : `${(m.d * 100).toFixed(1).replace('.', ',')} cm`) : 'wg opisu');
    h += card('Przyczepy mięśni przy tym punkcie', !near ? '<p class="en">Szukam pól przyczepów…</p>'
      : near.length ? `<div class="list">${near.map((m) => `<div class="it" data-muscle="${m.key}"><span>${esc(MUSCLES[m.key].pl)}</span><small>${role(m)} · ${how(m)}</small></div>`).join('')}</div>
        <p class="note">Z modelu: pola przyczepów do 2 cm od punktu (czerwone – początkowe, niebieskie – końcowe). „Wg opisu” – punkt wymieniony w opisie przyczepu, choć w modelu pole leży dalej lub na innej strukturze (np. więzadło rzepki).</p>`
      : '<p class="en">Przy tym punkcie nie przyczepia się żaden mięsień z bazy (może to być powierzchnia stawowa, bruzda albo przyczep więzadła).</p>', '#ffb454');
    h += `<p style="margin-top:6px"><span class="link" data-act="bone">Pokaż całą kość i jej pozostałe punkty →</span></p>` + noteCard(`landmark:${ent.en}`, ent.title);
  } else if (ent.type === 'joint') {
    const j = ent.kb, moves = j.moves.map((id) => MOVES.find((m) => m.id === id)).filter(Boolean);
    h += `<div class="tags"><span class="tag">Staw</span>${ent.side ? `<span class="tag">${SIDE_PL[ent.side]}</span>` : ''}</div>`;
    h += actions(ent);
    h += card('Budowa', p(j.type), '#cfcbb5');
    h += card(`Więzadła i struktury (${j.lig.length})`, `<div class="list">${j.lig.map(([mesh, f], i) => `<div class="it col" data-lig="${i}"><span>${esc(polishName(mesh) ?? mesh)}</span><small>${esc(f)}</small></div>`).join('')}</div><p class="note">Kliknij więzadło albo test, żeby podświetlić badaną strukturę. <span class="link" data-joint="${ent.key}">Pokaż cały staw</span></p>`, '#e8e2d0');
    h += card('Pozycje stawu', `<p><b>Zamknięta (najciaśniejsza):</b> ${esc(j.closed)}</p><p style="margin-top:5px"><b>Spoczynkowa (luźna):</b> ${esc(j.rest)}</p><p style="margin-top:5px"><b>Wzorzec torebkowy:</b> ${esc(j.capsular)}</p>`, '#4c9dff');
    if (moves.length) h += card('Ruchy i zakresy', `<div class="list">${moves.map((m) => `<div class="it" data-move="${m.id}"><span>${esc(m.pl)}</span><small>${esc(m.rom ?? '')}</small></div>`).join('')}</div>`, '#3ecf8e');
    h += card(`Testy kliniczne (${j.tests.length})`, j.tests.map((t, i) => `<div class="test" data-test="${i}"><b class="link">${esc(t.pl)}</b><small> – ${esc(t.cel)}</small><p>${esc(t.jak)}</p><p><i>Wynik dodatni:</i> ${esc(t.plus)}</p></div>`).join(''), '#c084fc');
    h += card('Klinika i fizjoterapia', p(j.k), null, 'clin') + card('Skojarzenie', p(j.s), null, 'tip') + noteCard(`joint:${ent.key}`, j.pl);
  } else if (ent.type === 'nerve') {
    const k = ent.kb;
    h += `<div class="tags"><span class="tag">Nerw</span><span class="tag">${esc(k.roots)}</span>${ent.side ? `<span class="tag">${SIDE_PL[ent.side]}</span>` : ''}</div>`;
    if (ent.part && ent.part !== k.mesh[0]) h += `<p class="en">Kliknięta gałąź: ${esc(polishName(ent.part) ?? model.latin[ent.part] ?? ent.part)}</p>`;
    h += actions(ent) + isoControls();
    h += `<div class="acts"><button data-act="trace">Śledź drogę nerwu i jego mięśnie →</button></div>`;
    h += card('Przebieg', p(k.course), '#f5cc33') + card('Zakres ruchowy', p(k.motor) + (ent.muscles.length ? `<p style="margin-top:6px">${ent.muscles.map((m) => `<span class="link" data-muscle="${m.key}">${esc(m.lat)}</span>`).join(' · ')}</p>` : ''), '#a83d36');
    h += card('Zakres czuciowy', p(k.sensory), '#93a0b4') + card('Uszkodzenie – objawy', p(k.palsy), null, 'clin') + card('Skojarzenie', p(k.tip), null, 'tip') + noteCard(`nerve:${ent.key}`, k.pl);
  } else {
    const m = ent.meta;
    h += `<div class="en">${esc(ent.en)}</div><div class="tags"><span class="tag">${LAYER_PL[ent.layer]}</span><span class="tag">${REG_PL[m.reg]}</span>${ent.side ? `<span class="tag">${SIDE_PL[ent.side]}</span>` : ''}</div>`;
    h += actions(ent) + isoControls();
    if (ent.layer === 'bones') {
      const list = showMarks(ent);
      const att = model.meta.filter((x) => x.f === 'insertions' && x.par[0] === (m.s ? `${m.n}.${m.s}` : m.n));
      const mus = new Map();
      for (const a of att) for (const key of [model.entityOf(a.id)].filter((e) => e.type === 'muscle').map((e) => e.key)) { const r = mus.get(key) ?? { o: false, i: false }; r[a.role === 'origin' ? 'o' : 'i'] = true; mus.set(key, r); }
      if (mus.size) h += card('Mięśnie przyczepiające się do tej kości', `<div class="list">${[...mus].map(([key, r]) => `<div class="it" data-muscle="${key}"><span>${esc(MUSCLES[key].lat)}</span><small>${r.o ? '<b style="color:var(--orig)">początek</b>' : ''}${r.o && r.i ? ' · ' : ''}${r.i ? '<b style="color:var(--ins)">koniec</b>' : ''}</small></div>`).join('')}</div><p style="margin-top:6px"><span class="link" data-act="boneatt">Pokaż pola przyczepów na kości</span></p>`);
      if (list.length) h += card(`Punkty kostne (${list.length})`, `<div class="list">${list.map((l, i) => `<div class="it" data-mark="${i}"><span>${esc(landmarkPL(l.n) ?? model.latin[l.n] ?? l.n)}</span><small>${esc(landmarkPL(l.n) ? (model.latin[l.n] ?? l.n) : l.n)}</small></div>`).join('')}</div>`, '#ffb454');
    }
    const js = model.jointsOfMesh(ent.name);
    if (js.length) h += `<p style="margin:6px 0">Staw: ${js.map((k) => `<span class="link" data-joint="${k}">${esc(JOINTS[k].pl)}</span>`).join(' · ')}</p>`;
    const pd = structDesc(ent.name);
    if (pd) h += card('Opis', p(pd), LAYER_COLOR[ent.layer]);
    h += noteCard(`struct:${ent.name}`, ent.title);
    h += `<div id="desc"></div>`;
    loadDesc(ent.name, !!pd);
  }
  panelBody.innerHTML = h; panelBody.scrollTop = 0;
}
function boneTitle(par) { if (!par) return ''; const mm = par.match(/^(.*)\.([lr])$/); const n = mm ? mm[1] : par; const id = model.names.get(n)?.[0]; return id != null ? model.structEntity(id).title : n; }
async function loadDesc(name, hasPl) {
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0; h %= 16;
  try { descCache[h] ??= await (await fetch(`${BASE}data/desc/${h}.json`)).json(); } catch { return; }
  const t = descCache[h][name], el = $('#desc');
  if (!t || !el || current?.name !== name) return;
  // polski opis jest nadrzędny; angielski z Wikipedii zostaje jako rozwijane uzupełnienie
  el.innerHTML = `<details class="card en-desc"${hasPl ? '' : ' open'}><summary><h5>${hasPl ? 'Więcej (EN, Wikipedia)' : 'Opis (EN, Wikipedia / Z-Anatomy)'}</h5></summary>${t.split('\n').map(p).join('')}</details>`;
}

panelBody.addEventListener('click', (e) => {
  if (mode !== 'atlas') return;
  const t = e.target, A = t.closest('[data-act]'), C = t.closest('[data-ctx]'), M = t.closest('[data-muscle]'), N = t.closest('[data-nerve]'), V = t.closest('[data-move]'), K = t.closest('[data-mark]');
  const LG = t.closest('[data-lig]'), TS = t.closest('[data-test]'), J = t.closest('[data-joint]');
  if (J) { select(model.jointEntity(J.dataset.joint, current?.side || defSide()), { isolate: true }); return; }
  if ((LG || TS) && current?.type === 'joint') { // podświetlenie więzadła / struktury badanej testem
    const meshes = LG ? [current.kb.lig[+LG.dataset.lig][0]] : current.kb.tests[+TS.dataset.test].mesh;
    const ids = meshes.flatMap((n) => model.ids(n, current.side)).filter((i) => model.meta[i].f !== 'skeleton');
    // podświetlona struktura bywa schowana w stawie (np. ACL) – reszta tkanek miękkich znika, kości stają się półprzezroczyste
    view.tints.clear(); ids.forEach((i) => view.tints.set(i, '#ff6b4a'));
    if (view.iso) { view.iso.focus = new Set(ids); view.iso.show = { bones: false }; }
    applyView();
    panelBody.querySelectorAll('.it.on, .test.on').forEach((el) => el.classList.remove('on')); (LG ?? TS).classList.add('on');
    if (ids.length) engine.focus(ids, { pad: 3, dir: (() => { const d = current.kb.dir ?? [0, 0, 1], sx = current.side === 'l' ? -1 : 1; return new THREE.Vector3(sx * d[0], d[1], d[2]).normalize(); })() });
    hint(meshes.map((n) => polishName(n) ?? n).join(', '));
    return;
  }
  const side = current?.side || defSide();
  if (C) { const k = C.dataset.ctx; if (k === 'others') view.iso.others = view.iso.others === 'ghost' ? 'hide' : 'ghost'; else view.iso.show[k] = !view.iso.show[k]; applyView(); renderAtlasKeepScroll(); }
  else if (K) { const l = markList[+K.dataset.mark]?.l; if (l) openLandmark(labels.indexOf(l), current?.side); }
  else if (M) select(model.muscleEntity(M.dataset.muscle, side), { isolate: true });
  else if (N) select(model.nerveEntity(N.dataset.nerve, side), { isolate: true });
  else if (V) { setMode('motion'); modes.motion.open(V.dataset.move, side); }
  else if (A) {
    const a = A.dataset.act;
    if (a === 'iso') { if (view.iso) exitIso(); else { isolateEntity(current); renderAtlas(); } }
    else if (a === 'trace') { const key = current.key; modes.learn.openNerve(key); setMode('learn'); }
    else if (a === 'center') { if (current.type === 'landmark') focusPoint(current, entDirPoint(current)); else engine.focus(current.ids, { pad: 1.8 }); }
    else if (a === 'bone') { const b = current.bones?.[0]; if (b !== undefined) { exitIso(false); select(model.structEntity(b), { isolate: true }); } }
    else if (a === 'hide') { current.ids.forEach((i) => view.hidden.add(i)); view.sel.clear(); view.extra.clear(); current = null; view.iso = null; clearMarks(); applyView(); renderLeft(); renderAtlas(); hint('Ukryto. „Pokaż ukryte” w panelu warstw przywraca.'); }
    else if (a === 'side') {
      const s = current.side === 'r' ? 'l' : 'r';
      const ent = current.type === 'landmark' ? model.landmarkEntity(current.li, s) : current.type === 'muscle' ? model.muscleEntity(current.key, s) : current.type === 'nerve' ? model.nerveEntity(current.key, s) : current.type === 'joint' ? model.jointEntity(current.key, s) : model.structEntity(model.ids(current.name, s)[0] ?? current.ids[0]);
      select(ent, { isolate: !!view.iso });
    } else if (a === 'boneatt') {
      const m = current.meta, par = m.s ? `${m.n}.${m.s}` : m.n;
      view.iso = { focus: new Set(current.ids), side: m.s, others: 'ghost', bonesOnly: true, show: { att: true }, att: new Set(model.meta.filter((x) => x.f === 'insertions' && x.par[0] === par).map((x) => x.id)) };
      need('attachments'); renderAtlasKeepScroll();
    }
  }
});
function renderAtlasKeepScroll() { const s = panelBody.scrollTop; renderAtlas(); panelBody.scrollTop = s; }

// ---------- tryb RUCH ----------
const COL = { ago: '#e0453c', syn: '#f0a030', ant: '#3d7fe2' };
modes.motion = (() => {
  let move = null, side = 'r', playing = true, showAnt = false, k = 0, dir = 1, last = 0;
  const anim = (m) => !!(m.joint || m.rig);
  const pulseMat = () => engine.material(`tint:${COL.ago}`);
  const tick = (t) => {
    if (mode !== 'motion' || !move) return false;
    if (!motion.active) { if (anim(move)) return false; pulseMat().emissiveIntensity = 0.18 + 0.5 * (0.5 + 0.5 * Math.sin(t / 280)); return true; } // ruch bez kości: pulsują mięśnie główne
    if (!playing) return false;
    const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
    k += dir * dt * prefs().speed / 1.6; if (k >= 1) { k = 1; dir = -1; } else if (k <= 0) { k = 0; dir = 1; }
    const e = k * k * (3 - 2 * k); motion.set(e);
    const s = $('#mvk'); if (s) s.value = Math.round(e * 100);
    return true;
  };
  function list() {
    move = null; motion.reset(); view.only = null; view.tints.clear(); applyView();
    let h = '<h2>Ruchy w stawach</h2><p class="en">Wybierz ruch, aby zobaczyć pracę szkieletu oraz mięśnie główne, wspomagające i antagonistyczne.</p>', g = '';
    for (const m of MOVES) { if (m.g !== g) { g = m.g; h += `<div class="grp">${g}</div><div class="list">`; } h += `<div class="it" data-move="${m.id}"><span>${esc(m.pl)}</span><small>${anim(m) ? '▶ animacja' : 'mięśnie'}</small></div>`; if (MOVES[MOVES.indexOf(m) + 1]?.g !== g) h += '</div>'; }
    panelBody.innerHTML = h; panelBody.scrollTop = 0;
  }
  async function open(id, s = side) {
    move = MOVES.find((m) => m.id === id); side = s || 'r'; k = 0; dir = 1; playing = true;
    await engine.ensureAll(['skeleton', 'muscles', 'insertions']);
    stage(); render();
  }
  function stage() {
    motion.reset(); view.tints.clear(); view.iso = null; view.sel.clear(); pulseMat().emissiveIntensity = 0.18;
    const only = new Set(model.meta.filter((m) => m.layer === 'bones').map((m) => m.id));
    const groups = [['ago', move.ago], ['syn', move.syn], ...(showAnt ? [['ant', move.ant]] : [])];
    const keys = [];
    for (const [g, list] of groups) for (const key of list) { keys.push(key); for (const id of model.muscleEntity(key, side).ids) { const b = model.meta[id].bb; if (Math.max(b[3] - b[0], b[4] - b[1], b[5] - b[2]) < 0.03) continue; only.add(id); view.tints.set(id, COL[g]); } }
    view.only = only; applyView();
    const animated = motion.setup(move, side, keys);
    const ids = keys.flatMap((key) => model.muscleEntity(key, side).ids);
    const box = engine.boxOf(ids);
    if (animated && move.rig && !/^(spine|breath)/.test(move.rig)) box.copy(engine.boxOf(motion.active.moving)).expandByPoint(motion.active.j.p).expandByScalar(/^swallow/.test(move.rig) ? 0.06 : 0.035); // kadr na poruszające się kości
    else if (animated) box.expandByPoint(motion.active.j.p).expandByScalar(move.rig ? 0.05 : 0.12);
    if (move.view) { engine.focus(box, { pad: 1.25, dir: new THREE.Vector3(move.view[0] * (side === 'l' ? 1 : -1), move.view[1], move.view[2]).normalize() }); return; }
    engine.focus(box, { pad: 1.25, dir: move.axis === 'z' || /^(sc_|tr_ext|nk_ext)/.test(move.id) ? new THREE.Vector3(side === 'l' ? 0.35 : -0.35, 0.15, /sh_abd|sc_|tr_ext|nk_ext/.test(move.id) ? -1 : 1) : new THREE.Vector3(side === 'l' ? 1 : -1, 0.12, 0.55) });
  }
  const mlist = (keys, c) => keys.map((key) => `<div class="it" data-muscle="${key}"><span><i class="dot" style="display:inline-block;background:${c};margin-right:8px"></i>${esc(MUSCLES[key].pl)}</span><small>${esc(MUSCLES[key].lat)}</small></div>`).join('');
  function render() {
    const m = move;
    panelBody.innerHTML = `<div class="acts" style="margin-top:0"><button data-act="back">‹ Lista ruchów</button><button data-act="side">${side === 'r' ? 'Strona: prawa' : 'Strona: lewa'}</button></div>
      <h2>${esc(m.pl)}</h2><div class="tags"><span class="tag">${esc(m.g)}</span>${m.rom ? `<span class="tag">zakres: ${esc(m.rom)}</span>` : ''}</div>
      ${anim(m) ? `<div class="card"><h5>Animacja</h5><input id="mvk" type="range" min="0" max="100" value="0"><div class="acts" style="margin-bottom:0"><button data-act="play" class="primary">${playing ? 'Pauza' : 'Odtwórz'}</button><span class="chip ${showAnt ? 'on' : ''}" data-act="ant">Pokaż antagonistów</span></div></div>` : `<div class="card"><p>Ten ruch nie przesuwa kości – mięśnie główne pulsują na czerwono.</p><div class="chips" style="margin-top:8px"><span class="chip ${showAnt ? 'on' : ''}" data-act="ant">Pokaż antagonistów</span></div></div>`}
      ${card('Mięśnie główne (agoniści)', `<div class="list">${mlist(m.ago, COL.ago)}</div>`)}
      ${m.syn.length ? card('Mięśnie wspomagające (synergiści)', `<div class="list">${mlist(m.syn, COL.syn)}</div>`) : ''}
      ${m.ant.length ? card('Antagoniści', `<div class="list">${mlist(m.ant, COL.ant)}</div>`) : ''}
      ${card('Warto wiedzieć', p(m.note), null, 'tip')}
      <p class="note">Animacja jest uproszczona: kości poruszają się jako sztywne segmenty${m.rig ? ' (w kilku stawach naraz, np. kręg po kręgu), a mięśnie podążają za najbliższymi kośćmi' : ' wokół jednej osi, a mięśnie są „zginane” w osi stawu'} – pokazuje kierunek i zakres ruchu, nie rzeczywistą zmianę kształtu brzuśca.</p>`;
    panelBody.scrollTop = 0;
  }
  panelBody.addEventListener('input', (e) => { if (mode === 'motion' && e.target.id === 'mvk') { playing = false; const b = panelBody.querySelector('[data-act="play"]'); if (b) b.textContent = 'Odtwórz'; const v = e.target.value / 100; k = v; motion.set(v); } });
  panelBody.addEventListener('click', (e) => {
    if (mode !== 'motion') return;
    const V = e.target.closest('[data-move]'), A = e.target.closest('[data-act]'), M = e.target.closest('[data-muscle]');
    if (V) open(V.dataset.move);
    else if (A) {
      const a = A.dataset.act;
      if (a === 'back') list();
      else if (a === 'side') { side = side === 'r' ? 'l' : 'r'; stage(); render(); }
      else if (a === 'play') { playing = !playing; last = performance.now(); A.textContent = playing ? 'Pauza' : 'Odtwórz'; }
      else if (a === 'ant') { showAnt = !showAnt; stage(); render(); }
    } else if (M) { const key = M.dataset.muscle; leave(); setMode('atlas'); select(model.muscleEntity(key, side), { isolate: true }); }
  });
  function leave() { move = null; motion.reset(); view.only = null; view.tints.clear(); pulseMat().emissiveIntensity = 0.18; }
  const stepMove = (d) => { if (!move) return false; const i = MOVES.indexOf(move); open(MOVES[(i + d + MOVES.length) % MOVES.length].id); return true; };
  return { stepMove, enter() { engine.frameCallbacks.add(tick); list(); }, leave() { engine.frameCallbacks.delete(tick); leave(); applyView(); }, open, onPick(hit) { if (hit) { const ent = model.entityOf(hit.id); hint(`${ent.title}${ent.lat ? ` – ${ent.lat}` : ''}`); } } };
})();

modes.atlas = { enter() { renderAtlas(); if (current?.layer === 'bones') showMarks(current); else if (current?.type === 'landmark' && current.near) showPointMark(current); }, leave() { clearMarks(); } };

// ---------- tryby ----------
function setMode(m) {
  if (m === mode) return;
  modes[mode]?.leave?.();
  mode = m; app.dataset.mode = m;
  document.querySelectorAll('#modes button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === m); if (b.dataset.mode === m) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  app.classList.remove('sheet-min', 'sheet-max', 'menu');
  modes[m].enter();
  applyView();
}
$('#modes').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setMode(b.dataset.mode); });
$('#menuBtn').addEventListener('click', () => app.classList.toggle('menu'));
$('#stage').addEventListener('pointerdown', () => app.classList.remove('menu'));
// Dolny panel na telefonie: trzy wysokości (zwinięty / połowa / pełny); przeciągnięcie uchwytu lub stuknięcie.
const isPhone = () => matchMedia('(max-width:820px)').matches;
const sheetLevel = () => (app.classList.contains('sheet-min') ? 0 : app.classList.contains('sheet-max') ? 2 : 1);
function setSheet(level) {
  app.classList.toggle('sheet-min', level <= 0); app.classList.toggle('sheet-max', level >= 2);
  setTimeout(() => engine.resize(), 260);
}
{
  const grip = $('#grip'), panel = $('#panel'); let d = null;
  grip.addEventListener('pointerdown', (e) => { d = { y: e.clientY, h: panel.offsetHeight, moved: false }; grip.setPointerCapture(e.pointerId); });
  grip.addEventListener('pointermove', (e) => {
    if (!d) return; const dy = e.clientY - d.y;
    if (Math.abs(dy) > 6) d.moved = true;
    if (d.moved) { panel.style.transition = 'none'; panel.style.height = `${Math.max(56, d.h - dy)}px`; }
  });
  const end = (e) => {
    if (!d) return; const dy = e.clientY - d.y, lv = sheetLevel(); panel.style.transition = ''; panel.style.height = '';
    if (!d.moved) setSheet(lv === 0 ? 1 : 0);
    else if (dy > 30) setSheet(dy > 260 ? 0 : lv - 1);
    else if (dy < -30) setSheet(dy < -260 ? 2 : lv + 1);
    d = null;
  };
  grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
}
$('#hud').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.view) engine.view(b.dataset.view); else home(); });
// skróty klawiszowe: src/keys.js (inicjowane po wczytaniu modelu)

// ---------- start ----------
(async () => {
  try {
    const [meta, latin, lab] = await Promise.all([engine.init(), fetch(`${BASE}data/latin.json`).then((r) => r.json()), fetch(`${BASE}data/labels.json`).then((r) => r.json())]);
    model = buildModel(meta, latin); labels = lab; model.addLandmarks(lab, landmarkPL); motion = new Motion(engine, model);
    const rp = new URLSearchParams(location.search);
    if (rp.get('post')) { // tryb posta: slajd karuzeli 1080×1350
      const { startPost } = await import('./post.js');
      await startPost({ engine, model, motion, MUSCLES, NERVES }, rp);
      return;
    }
    if (rp.get('reel')) { // tryb rolki: pionowa animacja jednego mięśnia zamiast interfejsu atlasu
      const { startReel } = await import('./reel.js');
      await startReel({ engine, model, motion, MUSCLES, NERVES }, rp);
      return;
    }
    if (rp.has('debug')) Object.assign(window, { __motion: motion, __model: model, __engine: engine }); // testy automatyczne
    const ctx = { engine, model, view, applyView, need, hint, panelBody, esc, card, examCards, noteCard, openNote, setMode, select, entDir, MUSCLES, NERVES, modeIs: (m) => mode === m, home };
    modes.settings = initSettings(ctx);
    modes.quiz = initQuiz(ctx); modes.srs = initSrs(ctx);
    ctx.quizScoped = (keys, label, lid) => { setMode('quiz'); modes.quiz.scoped(keys, label, lid); };
    modes.learn = initLearn(ctx);
    Object.assign(ctx, { labels: () => labels, setPointMarks, clearMarks, openMove: (id, side) => { setMode('motion'); modes.motion.open(id, side); } });
    modes.clinic = initClinic(ctx);
    renderLeft(); renderAtlas();
    if (isPhone()) app.classList.add('sheet-min');
    await engine.ensureAll(['skeleton', 'muscles']);
    applyView(); home();
    $('#loading').classList.add('hide');
    initKeys({
      engine, model, view, panelBody, left, modes, MUSCLES, MOVES, q, results,
      getMode: () => mode, getCurrent: () => current, setMode, select, exitIso, home, applyView,
      stepMuscle: (d) => { // poprzedni / następny mięsień w tej samej grupie
        if (current?.type !== 'muscle') return false;
        const keys = Object.keys(MUSCLES).filter((k) => MUSCLES[k].grp === current.kb.grp), i = keys.indexOf(current.key);
        if (keys.length < 2) return false;
        select(model.muscleEntity(keys[(i + d + keys.length) % keys.length], current.side || 'r'), { isolate: !!view.iso });
        return true;
      },
    });
    window.__app = { engine, model, view, applyView, select, setMode, modes, motion };
    window.ready = true;
    // pozostałe układy dociągamy w tle
    for (const f of FILES) await engine.ensure(f).catch(() => {});
    applyView();
  } catch (err) {
    console.error(err);
    $('#loading').innerHTML = `<span>Nie udało się wczytać modelu: ${esc(err.message)}</span>`;
  }
})();
if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register(`${BASE}sw.js`).catch(() => {});
