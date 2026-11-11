// Aplikacja: stan widoku, interfejs atlasu, izolacja, ruch; quiz i powtórki w osobnych modułach.
import * as THREE from 'three';
import { Engine, FILES } from './engine.js';
import { buildModel, LAYERS, LAYER_FILE, REGIONS, MUSCLES, NERVES } from './model.js';
import { MOVES } from './data/movements.js';
import { Motion } from './motion.js';
import { initQuiz } from './quiz.js';
import { initSrs } from './srs.js';
import { landmarkPL } from './data/landmarks.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BASE = import.meta.env.BASE_URL;
const app = $('#app'), panelBody = $('#panelBody'), left = $('#left'), hintEl = $('#hint'), marks = $('#marks');
const SIDE_PL = { r: 'strona prawa', l: 'strona lewa', '': '' };
const LAYER_PL = Object.fromEntries(LAYERS.map(([k, n]) => [k, n]));
const REG_PL = Object.fromEntries(REGIONS);

const engine = new Engine($('#c'));
const view = {
  layers: { bones: true, joints: false, muscles: true, fascia: false, attachments: false, arteries: false, veins: false, heart: false, nerves: false, cns: false },
  side: 'both', region: 'all', hidden: new Set(), sel: new Set(), extra: new Set(), tints: new Map(), iso: null, only: null,
};
let model, labels = [], motion, mode = 'atlas', current = null, descCache = {};
const modes = {};

// ---------- stan widoku ----------
const CTX = ['att', 'bones', 'nerves', 'path', 'arteries', 'muscles'];
function stateOf(m) {
  if (view.hidden.has(m.id)) return null;
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
    ${LAYERS.map(([k, n, c]) => `<div class="layer ${view.layers[k] ? 'on' : ''}" data-layer="${k}" style="--c:${c}"><i></i><span>${n}</span></div>`).join('')}
    <h4>Strona ciała</h4>
    <div class="seg" data-seg="side">${[['both', 'Obie'], ['r', 'Prawa'], ['l', 'Lewa']].map(([k, n]) => `<button data-v="${k}" class="${view.side === k ? 'on' : ''}">${n}</button>`).join('')}</div>
    <h4>Okolica</h4>
    <div class="seg" data-seg="region">${REGIONS.map(([k, n]) => `<button data-v="${k}" class="${view.region === k ? 'on' : ''}">${n}</button>`).join('')}</div>
    <h4>Szybkie zestawy</h4>
    <div class="seg">
      <button data-preset="skeleton">Szkielet</button><button data-preset="muscles">Mięśnie</button>
      <button data-preset="neuro">Nerwy</button><button data-preset="vessels">Naczynia</button>
      <button data-preset="attach">Przyczepy</button><button data-preset="joints">Więzadła</button>
    </div>
    <h4>Widok</h4>
    <div class="seg"><button data-act="showall">Pokaż ukryte${view.hidden.size ? ` (${view.hidden.size})` : ''}</button><button data-act="reset">Reset</button></div>
    <p class="note">Modele 3D: Z-Anatomy / BodyParts3D (CC BY-SA 4.0). Treści opisowe do nauki – weryfikuj z podręcznikiem i prowadzącym.</p>`;
}
const PRESETS = {
  skeleton: ['bones'], muscles: ['bones', 'muscles'], neuro: ['bones', 'nerves', 'cns'], vessels: ['bones', 'arteries', 'veins', 'heart'],
  attach: ['bones', 'attachments'], joints: ['bones', 'joints'],
};
left.addEventListener('click', (e) => {
  const L = e.target.closest('[data-layer]'), S = e.target.closest('[data-seg] button'), P = e.target.closest('[data-preset]'), A = e.target.closest('[data-act]');
  if (L) { const k = L.dataset.layer; view.layers[k] = !view.layers[k]; exitIso(false); if (view.layers[k]) { hintLoad(k); need(k); } }
  else if (S) { view[S.parentElement.dataset.seg] = S.dataset.v; exitIso(false); if (view.region !== 'all' || view.side !== 'both') focusVisible(); }
  else if (P) { for (const k in view.layers) view.layers[k] = PRESETS[P.dataset.preset].includes(k); exitIso(false); need(...PRESETS[P.dataset.preset]); }
  else if (A?.dataset.act === 'showall') view.hidden.clear();
  else if (A?.dataset.act === 'reset') { if (mode !== 'atlas') setMode('atlas'); resetView(); }
  else return;
  renderLeft(); applyView(); if (mode === 'atlas') renderAtlas();
});
function hintLoad(layer) { if (!engine.loaded.has(LAYER_FILE[layer])) hint(`Wczytywanie: ${LAYER_PL[layer]}…`, '', 1500); }
function resetView() {
  Object.assign(view.layers, { bones: true, joints: false, muscles: true, fascia: false, attachments: false, arteries: false, veins: false, heart: false, nerves: false, cns: false });
  view.side = 'both'; view.region = 'all'; view.hidden.clear(); view.sel.clear(); view.extra.clear(); view.tints.clear(); view.iso = null; view.only = null;
  current = null; clearMarks(); home(); if (mode === 'atlas') renderAtlas();
}
function home() { engine.focus(new THREE.Box3(new THREE.Vector3(-0.45, 0, -0.2), new THREE.Vector3(0.45, 1.72, 0.2)), { dir: new THREE.Vector3(0, 0, 1), pad: 1.05 }); }
function visibleIds() { const out = []; for (const m of model.meta) if (engine.meshes[m.id]?.visible) out.push(m.id); return out; }
function focusVisible() { applyView(); const ids = visibleIds(); if (ids.length) engine.focus(ids, { pad: 1.1 }); }

// ---------- wyszukiwarka ----------
const q = $('#q'), results = $('#results');
const KIND_COLOR = { muscle: '#a83d36', nerve: '#f5cc33' };
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
  setMode('atlas');
  openItem(it);
});
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#searchbox')) results.hidden = true; });
q.addEventListener('keydown', (e) => { if (e.key === 'Enter' && results._list?.length && !results.hidden) { e.preventDefault(); results.querySelector('.r').click(); } });
q.addEventListener('focus', () => { if (q.value && results._list?.length) results.hidden = false; });
function defSide(kind, key) {
  const side = view.side !== 'both' ? view.side : 'r';
  return side;
}
function openItem(it) {
  let ent;
  if (it.kind === 'muscle') ent = model.muscleEntity(it.key, defSide());
  else if (it.kind === 'nerve') ent = model.nerveEntity(it.key, defSide());
  else ent = model.structEntity(it.id);
  select(ent, { isolate: true });
}

// ---------- zaznaczanie i izolacja ----------
function select(ent, { isolate = false, focus = true } = {}) {
  current = ent; clearMarks();
  view.sel = new Set(ent.ids); view.extra.clear();
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
  app.classList.remove('sheet-min');
}
function isolateEntity(ent, focus = true) {
  const prev = view.iso;
  const iso = { focus: new Set(ent.ids), side: ent.side, others: prev?.others ?? 'ghost', show: prev?.show ?? { att: true, bones: true, nerves: true, path: true, arteries: true, muscles: true } };
  const files = ['bones'];
  if (ent.type === 'muscle') {
    iso.att = new Set(ent.att); iso.bones = new Set(ent.bones); iso.nerves = new Set(ent.nerves); iso.path = new Set(ent.nervePath); iso.arteries = new Set(ent.arteries);
    files.push('muscles', 'attachments', 'nerves', 'arteries');
  } else if (ent.type === 'nerve') {
    iso.path = new Set(ent.nervePath);
    iso.muscles = new Set(ent.muscles.flatMap((m) => m.mesh.flatMap((n) => model.ids(n, ent.side))));
    files.push('nerves', 'muscles');
  } else { files.push(ent.layer); iso.bonesOnly = ent.layer === 'bones' || ent.layer === 'joints'; }
  view.iso = iso;
  need(...files).then(() => {
    if (!focus || view.iso !== iso) return;
    engine.focus([...iso.focus, ...(iso.att ?? [])], { pad: ent.type === 'struct' ? 1.9 : 1.6, dir: entDir(ent) });
  });
  applyView();
}
// Kierunek patrzenia: od strony, po której mięsień leży względem kości, do których się przyczepia.
function entDir(ent) {
  if (ent.type !== 'muscle' || !ent.bones.length || !ent.ids.length) return null;
  const c = engine.boxOf(ent.ids).getCenter(new THREE.Vector3()), b = engine.boxOf(ent.bones).getCenter(new THREE.Vector3());
  const d = c.sub(b); d.y *= 0.25;
  return d.length() > 0.012 ? d.normalize() : null;
}
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
function clearMarks() { markList = []; marks.innerHTML = ''; }
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
function nerveLinks(kb) {
  const keys = new Set((kb.nr ?? []).map((n) => model.meshNerve.get(n)).filter(Boolean));
  return [...keys].map((k) => `<span class="link" data-nerve="${k}">${esc(NERVES[k].pl)}</span>`).join(' · ');
}
function isoControls() {
  const iso = view.iso; if (!iso) return '';
  const chip = (k, label) => (iso[k]?.size ? `<span class="chip ${iso.show[k] ? 'on' : ''}" data-ctx="${k}">${label}</span>` : '');
  return `<div class="card"><h5>Izolacja – co pokazać</h5><div class="chips">
    ${chip('att', 'Przyczepy')}${chip('bones', 'Kości przyczepów')}${chip('nerves', 'Nerw')}${chip('path', 'Droga od korzeni')}${chip('arteries', 'Tętnica')}${chip('muscles', 'Unerwiane mięśnie')}
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
    panelBody.innerHTML = `<h2>Atlas 3D</h2><div class="empty"><ul>
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
    h += `<div class="tags"><span class="tag">${esc(k.grp)}</span>${ent.side ? `<span class="tag">${SIDE_PL[ent.side]}</span>` : ''}</div>`;
    if (ent.clicked) h += `<p class="en">Kliknięto pole przyczepu ${ent.clicked.role === 'origin' ? '<b style="color:#ff6b6b">początkowego</b>' : '<b style="color:#6ea0ff">końcowego</b>'} na: ${esc(boneTitle(ent.clicked.bone))}${ent.clicked.shared.length ? ` (wspólne z: ${ent.clicked.shared.map((s) => esc(MUSCLES[s].lat)).join(', ')})` : ''}</p>`;
    else if (ent.part) h += `<p class="en">Kliknięta część: ${esc(model.latin[ent.part] ?? ent.part)}</p>`;
    h += actions(ent) + isoControls();
    h += card('Przyczep początkowy', p(k.o), '#e62929') + card('Przyczep końcowy', p(k.i), '#266bf2');
    h += card('Unerwienie', p(k.n) + (nerveLinks(k) ? `<p style="margin-top:6px">→ ${nerveLinks(k)}</p>` : ''), '#f5cc33');
    h += card('Unaczynienie', p(k.a), '#d12120');
    h += card('Czynność', `<ul>${k.f.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>${moves.length ? `<p style="margin-top:6px">Zobacz w ruchu: ${moves.map((m) => `<span class="link" data-move="${m.id}">${esc(m.pl)}</span>`).join(' · ')}</p>` : ''}`, '#3ecf8e');
    h += card('Klinika i fizjoterapia', p(k.k), null, 'clin') + card('Skojarzenie', p(k.s), null, 'tip');
    if (!ent.att.length) h += '<p class="note">Dla tego mięśnia model nie zawiera osobnych pól przyczepów – opis przyczepów powyżej.</p>';
  } else if (ent.type === 'nerve') {
    const k = ent.kb;
    h += `<div class="tags"><span class="tag">Nerw</span><span class="tag">${esc(k.roots)}</span>${ent.side ? `<span class="tag">${SIDE_PL[ent.side]}</span>` : ''}</div>`;
    if (ent.part && ent.part !== k.mesh[0]) h += `<p class="en">Kliknięta gałąź: ${esc(model.latin[ent.part] ?? ent.part)}</p>`;
    h += actions(ent) + isoControls();
    h += card('Przebieg', p(k.course), '#f5cc33') + card('Zakres ruchowy', p(k.motor) + (ent.muscles.length ? `<p style="margin-top:6px">${ent.muscles.map((m) => `<span class="link" data-muscle="${m.key}">${esc(m.lat)}</span>`).join(' · ')}</p>` : ''), '#a83d36');
    h += card('Zakres czuciowy', p(k.sensory), '#93a0b4') + card('Uszkodzenie – objawy', p(k.palsy), null, 'clin') + card('Skojarzenie', p(k.tip), null, 'tip');
  } else {
    const m = ent.meta;
    h += `<div class="en">${esc(ent.en)}</div><div class="tags"><span class="tag">${LAYER_PL[ent.layer]}</span><span class="tag">${REG_PL[m.reg]}</span>${ent.side ? `<span class="tag">${SIDE_PL[ent.side]}</span>` : ''}</div>`;
    h += actions(ent) + isoControls();
    if (ent.layer === 'bones') {
      const list = showMarks(ent);
      const att = model.meta.filter((x) => x.f === 'insertions' && x.par[0] === (m.s ? `${m.n}.${m.s}` : m.n));
      const mus = new Map();
      for (const a of att) for (const key of [model.entityOf(a.id)].filter((e) => e.type === 'muscle').map((e) => e.key)) { const r = mus.get(key) ?? { o: false, i: false }; r[a.role === 'origin' ? 'o' : 'i'] = true; mus.set(key, r); }
      if (mus.size) h += card('Mięśnie przyczepiające się do tej kości', `<div class="list">${[...mus].map(([key, r]) => `<div class="it" data-muscle="${key}"><span>${esc(MUSCLES[key].lat)}</span><small>${r.o ? '<b style="color:#ff6b6b">początek</b>' : ''}${r.o && r.i ? ' · ' : ''}${r.i ? '<b style="color:#6ea0ff">koniec</b>' : ''}</small></div>`).join('')}</div><p style="margin-top:6px"><span class="link" data-act="boneatt">Pokaż pola przyczepów na kości</span></p>`);
      if (list.length) h += card(`Punkty kostne (${list.length})`, `<div class="list">${list.map((l, i) => `<div class="it" data-mark="${i}"><span>${esc(landmarkPL(l.n) ?? model.latin[l.n] ?? l.n)}</span><small>${esc(landmarkPL(l.n) ? (model.latin[l.n] ?? l.n) : l.n)}</small></div>`).join('')}</div>`, '#ffb454');
    }
    h += `<div id="desc"></div>`;
    loadDesc(ent.name);
  }
  panelBody.innerHTML = h; panelBody.scrollTop = 0;
}
function boneTitle(par) { if (!par) return ''; const mm = par.match(/^(.*)\.([lr])$/); const n = mm ? mm[1] : par; const id = model.names.get(n)?.[0]; return id != null ? model.structEntity(id).title : n; }
async function loadDesc(name) {
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0; h %= 16;
  try { descCache[h] ??= await (await fetch(`${BASE}data/desc/${h}.json`)).json(); } catch { return; }
  const t = descCache[h][name], el = $('#desc');
  if (t && el && current?.name === name) el.innerHTML = card('Opis (EN, Wikipedia / Z-Anatomy)', t.split('\n').map(p).join(''));
}

panelBody.addEventListener('click', (e) => {
  if (mode !== 'atlas') return;
  const t = e.target, A = t.closest('[data-act]'), C = t.closest('[data-ctx]'), M = t.closest('[data-muscle]'), N = t.closest('[data-nerve]'), V = t.closest('[data-move]'), K = t.closest('[data-mark]');
  const side = current?.side || defSide();
  if (C) { const k = C.dataset.ctx; if (k === 'others') view.iso.others = view.iso.others === 'ghost' ? 'hide' : 'ghost'; else view.iso.show[k] = !view.iso.show[k]; applyView(); renderAtlasKeepScroll(); }
  else if (K) { activateMark(+K.dataset.mark); engine.focus(new THREE.Box3().setFromCenterAndSize(markList[+K.dataset.mark].v, new THREE.Vector3(0.09, 0.09, 0.09)), { pad: 1.2 }); }
  else if (M) select(model.muscleEntity(M.dataset.muscle, side), { isolate: true });
  else if (N) select(model.nerveEntity(N.dataset.nerve, side), { isolate: true });
  else if (V) { setMode('motion'); modes.motion.open(V.dataset.move, side); }
  else if (A) {
    const a = A.dataset.act;
    if (a === 'iso') { if (view.iso) exitIso(); else { isolateEntity(current); renderAtlas(); } }
    else if (a === 'center') engine.focus(current.ids, { pad: 1.8 });
    else if (a === 'hide') { current.ids.forEach((i) => view.hidden.add(i)); view.sel.clear(); view.extra.clear(); current = null; view.iso = null; clearMarks(); applyView(); renderLeft(); renderAtlas(); hint('Ukryto. „Pokaż ukryte” w panelu warstw przywraca.'); }
    else if (a === 'side') {
      const s = current.side === 'r' ? 'l' : 'r';
      const ent = current.type === 'muscle' ? model.muscleEntity(current.key, s) : current.type === 'nerve' ? model.nerveEntity(current.key, s) : model.structEntity(model.ids(current.name, s)[0] ?? current.ids[0]);
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
  const tick = (t) => {
    if (mode !== 'motion' || !move || !motion.active || !playing) return false;
    const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
    k += dir * dt / 1.6; if (k >= 1) { k = 1; dir = -1; } else if (k <= 0) { k = 0; dir = 1; }
    const e = k * k * (3 - 2 * k); motion.set(e);
    const s = $('#mvk'); if (s) s.value = Math.round(e * 100);
    return true;
  };
  function list() {
    move = null; motion.reset(); view.only = null; view.tints.clear(); applyView();
    let h = '<h2>Ruchy w stawach</h2><p class="en">Wybierz ruch, aby zobaczyć pracę szkieletu oraz mięśnie główne, wspomagające i antagonistyczne.</p>', g = '';
    for (const m of MOVES) { if (m.g !== g) { g = m.g; h += `<div class="grp">${g}</div><div class="list">`; } h += `<div class="it" data-move="${m.id}"><span>${esc(m.pl)}</span><small>${m.joint ? '▶ animacja' : 'mięśnie'}</small></div>`; if (MOVES[MOVES.indexOf(m) + 1]?.g !== g) h += '</div>'; }
    panelBody.innerHTML = h; panelBody.scrollTop = 0;
  }
  async function open(id, s = side) {
    move = MOVES.find((m) => m.id === id); side = s || 'r'; k = 0; dir = 1; playing = true;
    await engine.ensureAll(['skeleton', 'muscles', 'insertions']);
    stage(); render();
  }
  function stage() {
    motion.reset(); view.tints.clear(); view.iso = null; view.sel.clear();
    const only = new Set(model.meta.filter((m) => m.layer === 'bones').map((m) => m.id));
    const groups = [['ago', move.ago], ['syn', move.syn], ...(showAnt ? [['ant', move.ant]] : [])];
    const keys = [];
    for (const [g, list] of groups) for (const key of list) { keys.push(key); for (const id of model.muscleEntity(key, side).ids) { const b = model.meta[id].bb; if (Math.max(b[3] - b[0], b[4] - b[1], b[5] - b[2]) < 0.03) continue; only.add(id); view.tints.set(id, COL[g]); } }
    view.only = only; applyView();
    const animated = motion.setup(move, side, keys);
    const ids = keys.flatMap((key) => model.muscleEntity(key, side).ids);
    const box = engine.boxOf(ids);
    if (animated) box.expandByPoint(motion.active.j.p).expandByScalar(0.12);
    engine.focus(box, { pad: 1.25, dir: move.axis === 'z' || /^(sc_|tr_ext|nk_ext)/.test(move.id) ? new THREE.Vector3(side === 'l' ? 0.35 : -0.35, 0.15, /sh_abd|sc_|tr_ext|nk_ext/.test(move.id) ? -1 : 1) : new THREE.Vector3(side === 'l' ? 1 : -1, 0.12, 0.55) });
  }
  const mlist = (keys, c) => keys.map((key) => `<div class="it" data-muscle="${key}"><span><i class="dot" style="display:inline-block;background:${c};margin-right:8px"></i>${esc(MUSCLES[key].pl)}</span><small>${esc(MUSCLES[key].lat)}</small></div>`).join('');
  function render() {
    const m = move;
    panelBody.innerHTML = `<div class="acts" style="margin-top:0"><button data-act="back">‹ Lista ruchów</button><button data-act="side">${side === 'r' ? 'Strona: prawa' : 'Strona: lewa'}</button></div>
      <h2>${esc(m.pl)}</h2><div class="tags"><span class="tag">${esc(m.g)}</span>${m.rom ? `<span class="tag">zakres: ${esc(m.rom)}</span>` : ''}</div>
      ${m.joint ? `<div class="card"><h5>Animacja</h5><input id="mvk" type="range" min="0" max="100" value="0"><div class="acts" style="margin-bottom:0"><button data-act="play" class="primary">${playing ? 'Pauza' : 'Odtwórz'}</button><span class="chip ${showAnt ? 'on' : ''}" data-act="ant">Pokaż antagonistów</span></div></div>` : `<div class="card"><p>Dla tego ruchu pokazuję same mięśnie (bez animacji szkieletu).</p><div class="chips" style="margin-top:8px"><span class="chip ${showAnt ? 'on' : ''}" data-act="ant">Pokaż antagonistów</span></div></div>`}
      ${card('Mięśnie główne (agoniści)', `<div class="list">${mlist(m.ago, COL.ago)}</div>`)}
      ${m.syn.length ? card('Mięśnie wspomagające (synergiści)', `<div class="list">${mlist(m.syn, COL.syn)}</div>`) : ''}
      ${m.ant.length ? card('Antagoniści', `<div class="list">${mlist(m.ant, COL.ant)}</div>`) : ''}
      ${card('Warto wiedzieć', p(m.note), null, 'tip')}
      <p class="note">Animacja jest uproszczona: kości poruszają się jako sztywne segmenty wokół jednej osi, a mięśnie są „zginane” w osi stawu – pokazuje kierunek i zakres ruchu, nie rzeczywistą zmianę kształtu brzuśca.</p>`;
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
  function leave() { move = null; motion.reset(); view.only = null; view.tints.clear(); }
  return { enter() { engine.frameCallbacks.add(tick); list(); }, leave() { engine.frameCallbacks.delete(tick); leave(); applyView(); }, open, onPick(hit) { if (hit) { const ent = model.entityOf(hit.id); hint(`${ent.title}${ent.lat ? ` – ${ent.lat}` : ''}`); } } };
})();

modes.atlas = { enter() { renderAtlas(); if (current?.layer === 'bones') showMarks(current); }, leave() { clearMarks(); } };

// ---------- tryby ----------
function setMode(m) {
  if (m === mode) return;
  modes[mode]?.leave?.();
  mode = m; app.dataset.mode = m;
  document.querySelectorAll('#modes button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
  app.classList.remove('sheet-min', 'menu');
  modes[m].enter();
  applyView();
}
$('#modes').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setMode(b.dataset.mode); });
$('#menuBtn').addEventListener('click', () => app.classList.toggle('menu'));
$('#stage').addEventListener('pointerdown', () => app.classList.remove('menu'));
$('#grip').addEventListener('click', () => {
  if (app.classList.contains('sheet-min')) app.classList.remove('sheet-min');
  else if (app.classList.contains('sheet-max')) { app.classList.remove('sheet-max'); app.classList.add('sheet-min'); }
  else app.classList.add('sheet-max');
  setTimeout(() => engine.resize(), 250);
});
$('#hud').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.view) engine.view(b.dataset.view); else home(); });
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input,select,textarea')) { if (e.key === 'Escape') e.target.blur(); return; }
  if (e.key === '/') { e.preventDefault(); q.focus(); }
  else if (mode === 'atlas' && current && e.key.toLowerCase() === 'h') panelBody.querySelector('[data-act="hide"]')?.click();
  else if (mode === 'atlas' && current && e.key.toLowerCase() === 'i') panelBody.querySelector('[data-act="iso"]')?.click();
  else if (e.key === 'Escape' && mode === 'atlas') exitIso();
});

// ---------- start ----------
(async () => {
  try {
    const [meta, latin, lab] = await Promise.all([engine.init(), fetch(`${BASE}data/latin.json`).then((r) => r.json()), fetch(`${BASE}data/labels.json`).then((r) => r.json())]);
    model = buildModel(meta, latin); labels = lab; motion = new Motion(engine, model);
    const ctx = { engine, model, view, applyView, need, hint, panelBody, esc, card, setMode, select, entDir, MUSCLES, NERVES, modeIs: (m) => mode === m, home };
    modes.quiz = initQuiz(ctx); modes.srs = initSrs(ctx);
    renderLeft(); renderAtlas();
    await engine.ensureAll(['skeleton', 'muscles']);
    applyView(); home();
    $('#loading').classList.add('hide');
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
