// Tryb posta: karuzela 5 slajdów 1080×1350 o jednym mięśniu (?post=<klucz>&slide=1..5).
// Układ jak w dotychczasowych postach @fizjio_anatomia, ale z renderem 3D z modelu.
import * as THREE from 'three';
import '@fontsource/bricolage-grotesque/latin-800.css';
import '@fontsource/bricolage-grotesque/latin-ext-800.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-ext-600.css';
import './post.css';
import { MOVES } from './data/movements.js';
import REEL_TEXTS from './data/reel_texts.js';

const W = 1080, H = 1350, CORAL = '#FF6B4A', NAVY = '#0F2A3D';
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const short = (s, n) => { s = (s ?? '').trim(); if (s.length <= n) return s; const c = s.slice(0, n); return `${c.slice(0, Math.max(c.lastIndexOf(' '), n * 0.6)).replace(/[\s,;:(–-]+$/, '')}…`; };
const sentences = (s) => (s ?? '').split(/(?<=[.!?])\s+(?=[A-ZŁŚŻŹĆÓ„])/).map((x) => x.trim()).filter(Boolean);
export const SLIDES = ['okladka', 'co-robi', 'przyczepy', 'unerwienie', 'klinika'];

export async function startPost({ engine, model, motion, MUSCLES, NERVES }, params) {
  const key = params.get('post'), slide = Math.min(5, Math.max(1, Number(params.get('slide') ?? 1)));
  const kb = MUSCLES[key];
  document.body.classList.add('post');
  const stage = document.getElementById('stage');
  const fitStage = () => document.documentElement.style.setProperty('--rs', Math.min(innerWidth / W, innerHeight / H));
  fitStage(); addEventListener('resize', fitStage);
  document.getElementById('loading').classList.add('hide');
  if (!kb) { stage.insertAdjacentHTML('beforeend', `<div class="ps-err">Nie znam mięśnia „${esc(key)}”.</div>`); return; }
  const pt = REEL_TEXTS[key]?.post ?? {};
  let side = params.get('side') === 'l' ? 'l' : 'r';
  let ent = model.muscleEntity(key, side);
  if (!ent.ids.length) { side = ''; ent = model.muscleEntity(key, ''); }
  const meta = model.meta;
  await engine.ensureAll(['skeleton', 'muscles', 'insertions', 'nerves']);
  await document.fonts.ready;
  engine.renderer.setAnimationLoop(null); engine.controls.enabled = false;
  if (params.get('capture') === '1') engine.renderer.setPixelRatio(1);
  const cam = engine.camera;

  // ---------- treść slajdu ----------
  const light = slide === 2 || slide === 4;
  const nerveKb = (kb.nr ?? []).map((n) => model.meshNerve.get(n)).filter(Boolean).map((k) => NERVES[k])[0];
  const title = kb.pl.replace(/^Mięsień\s+/, '').replace(/^./, (c) => c.toUpperCase());
  const next = params.get('next');
  const bar = `<div class="ps-bar"><span>@fizjio_anatomia</span><span class="n">0${slide} / 05</span></div>`;
  const step = (n, t) => `<div class="ps-step"><i>${n}</i><div class="fit">${esc(t)}</div></div>`;
  const item = (n, t, d) => `<div class="ps-item"><i>${n}</i><div><div class="h">${t}</div><div class="d">${esc(d)}</div></div></div>`;
  const cardHtml = (l, t, d) => `<div class="ps-card"><div class="l">${l}</div><div class="t">${esc(t)}</div><div class="d">${esc(d)}</div></div>`;
  const clinic = sentences(kb.k), funcs = pt.f ?? kb.f;
  let html = '', view = 'muscle';
  if (slide === 1) {
    const longest = Math.max(...title.split(/[\s-]+/).map((w) => w.length)), lines = Math.ceil(title.length / 14);
    const size = Math.round(Math.min(118, 640 / (longest * 0.6), 420 / (lines * 0.98)));
    html = `${bar}<div class="ps-cover"><div class="k">${esc(kb.grp.toUpperCase())}</div><h1 style="font-size:${size}px">${esc(title)}</h1><div class="lat">${esc(kb.lat)}</div>
      <p>${esc(pt.hook ?? short(funcs[0], 120))}.</p></div><div class="ps-foot">PRZESUŃ. ZOBACZ, CO ROBI<br>I GDZIE SIĘ TRZYMA →</div>`;
  } else if (slide === 2) {
    view = 'move';
    html = `${bar}<h2>Co robi?</h2><p class="sub">${esc(kb.lat)} · warstwa ${kb.sup ? 'powierzchowna' : 'głęboka'}</p>
      <div class="ps-steps">${funcs.slice(0, 3).map((f, i) => step(i + 1, short(f, 120))).join('')}</div><div class="ps-win"></div>`;
  } else if (slide === 3) {
    view = 'att';
    html = `${bar}<div class="ps-col"><h2>Przyczepy</h2><p class="sub">Skąd – dokąd. Bez tego funkcja to zgadywanie.</p>
      <div class="ps-items">${item(1, 'Początek', pt.o ?? kb.o)}${item(2, 'Koniec', pt.i ?? kb.i)}</div></div><svg class="ps-lines" viewBox="0 0 ${W} ${H}"></svg>`;
  } else if (slide === 4) {
    view = 'nerve';
    html = `${bar}<h2>Unerwienie</h2><div class="ps-cards">${cardHtml('NERW', nerveKb?.lat ?? short(kb.n, 40), `${pt.n ?? kb.n} Segmenty różnią się między podręcznikami – sprawdź w swoim skrypcie.`)}
      ${nerveKb?.palsy ? cardHtml('GDY NERW ZAWIEDZIE', '', short(nerveKb.palsy, 190)) : kb.a ? cardHtml('UNACZYNIENIE', '', kb.a) : ''}</div><div class="ps-win"></div>`;
  } else {
    const pts = clinic.length ? clinic.slice(0, 2) : funcs.slice(0, 2);
    const tip = pt.tip ?? kb.s;
    html = `${bar}<h2>${clinic.length ? 'Klinika' : 'W skrócie'}${tip ? '<br>i skojarzenie' : ''}</h2>
      <div class="ps-clin"><div class="l">${clinic.length ? 'KLINIKA' : 'CZYNNOŚĆ'}</div>${pts.map((x) => `<p class="fit">${esc(short(x, 230))}</p>`).join('')}</div>
      ${tip ? `<div class="ps-tip"><div class="l">SKOJARZENIE</div><div class="t fit">${esc(short(tip, 210))}</div></div>` : ''}
      <div class="ps-foot2">${next ? `Dalej: ${esc(next)}. ` : ''}Obserwuj, bo przecież na pewno ktoś to czyta.</div>`;
  }
  const ov = document.createElement('div'); ov.id = 'post'; ov.className = `${light ? 'light' : 'dark'} s${slide}`; ov.innerHTML = (light ? '' : '<div class="ps-scrim"></div>') + html;
  stage.appendChild(ov); stage.classList.add(light ? 'light' : 'dark', `s${slide}`);
  // dopasowanie tekstu: zmniejszaj czcionkę, aż blok zmieści się w swoim polu
  for (const box of ov.querySelectorAll('.ps-steps,.ps-items,.ps-cards,.ps-clin,.ps-tip,.ps-cover')) {
    let k = 1; while (box.scrollHeight > box.clientHeight + 2 && k > 0.6) { k -= 0.04; box.style.setProperty('--k', k); }
  }

  // ---------- scena ----------
  const win = ov.querySelector('.ps-win'), canvas = engine.canvas;
  const rect = win ? { x: win.offsetLeft, y: win.offsetTop, w: win.offsetWidth, h: win.offsetHeight } : { x: 0, y: 0, w: W, h: H };
  Object.assign(canvas.style, { position: 'absolute', left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px`, borderRadius: win ? '28px' : '0' });
  engine.resize();
  const big = (id) => { const b = meta[id].bb; return Math.max(b[3] - b[0], b[4] - b[1], b[5] - b[2]) >= 0.03; };
  const target = new Set(ent.ids.filter(big)), att = new Set(ent.att), attBones = new Set(ent.bones), nerve = new Set(ent.nerves), path = new Set(ent.nervePath);
  const std = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.02, ...o });
  const M = {
    target: std({ emissive: new THREE.Color(CORAL), emissiveIntensity: 0.08 }), bone: std({}),
    boneRest: std({ transparent: true, opacity: view === 'move' ? 0.55 : 0.3 }),
    rest: new THREE.MeshStandardMaterial({ color: 0x9fb0c8, transparent: true, opacity: 0.07, depthWrite: false, roughness: 1 }),
    att: std({ side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, roughness: 0.35 }),
    nerve: new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xffb400, emissiveIntensity: 0.6, roughness: 0.4 }),
    path: new THREE.MeshStandardMaterial({ color: 0xd9a520, emissive: 0xa97800, emissiveIntensity: 0.35, roughness: 0.5 }),
  };
  for (const m of meta) {
    const mesh = engine.meshes[m.id]; if (!mesh) continue;
    let g = null;
    if (target.has(m.id)) g = 'target';
    else if (att.has(m.id)) g = view === 'att' ? 'att' : null;
    else if (nerve.has(m.id)) g = view === 'nerve' ? 'nerve' : null;
    else if (path.has(m.id)) g = view === 'nerve' ? 'path' : null;
    else if (m.layer === 'bones') g = attBones.has(m.id) ? 'bone' : 'boneRest';
    else if (m.layer === 'muscles' && big(m.id) && !(m.s && side && m.s !== side) && view !== 'move') g = 'rest';
    mesh.visible = !!g; if (g) mesh.material = M[g];
  }
  const tBox = engine.boxOf([...target]), tC = tBox.getCenter(new THREE.Vector3());
  let out = null;
  if (ent.bones.length) { const d = tC.clone().sub(engine.boxOf(ent.bones).getCenter(new THREE.Vector3())); d.y *= 0.25; if (d.length() > 0.012) out = d.normalize(); }
  if (!out) out = new THREE.Vector3(side === 'l' ? 0.45 : -0.45, 0.1, 1).normalize();
  if (Math.abs(out.y) > 0.55) { const h = new THREE.Vector3(tC.x, 0, tC.z).normalize(); out.set(h.x * 0.85, 0.35 * Math.sign(out.y), h.z * 0.85).normalize(); }
  const yaw = (v, a) => v.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a);

  let box = tBox, dir = yaw(out, -0.25), pad = 1.9, cx = 0.5, cy = 0.5;
  if (view === 'muscle') { cx = 0.68; cy = 0.64; pad = 1.75; }
  if (view === 'att') { box = ent.att.length ? engine.boxOf([...target, ...ent.att]) : tBox; cx = 0.74; cy = 0.56; pad = 1.9; dir = yaw(out, 0.2); }
  if (view === 'nerve') { box = tBox.clone().expandByScalar(0.06); pad = 1.25; // kadr na mięsień; nerw widać tam, gdzie do niego dochodzi
 dir = yaw(new THREE.Vector3(out.x * 0.8, 0.08, Math.abs(out.z) < 0.3 ? 0.9 : out.z).normalize(), 0.15); }
  if (view === 'move') {
    const f0 = (funcs[0] ?? '').toLowerCase(), hit = (m) => (f0.includes(m.pl.split(' ')[0].toLowerCase().slice(0, 6)) ? 0 : 1); // ruch z pierwszej wypisanej czynności ma pierwszeństwo
    const mv = side ? MOVES.filter((m) => m.joint && m.ago.includes(key)).sort((a, b) => hit(a) - hit(b) || a.ago.indexOf(key) - b.ago.indexOf(key))[0] ?? MOVES.find((m) => m.joint && m.syn.includes(key)) : null;
    if (mv) {
      motion.setup(mv, side, [key]); motion.set(mv.reverse ? 0.15 : 0.85);
      const j = motion._joint(mv.joint, side), sx = side === 'l' ? 1 : -1;
      box = tBox.clone().expandByPoint(j.p).expandByScalar(0.16);
      dir = (mv.axis === 'z' ? new THREE.Vector3(sx * 0.3, 0.12, /sh_abd/.test(mv.id) ? -1 : 1) : new THREE.Vector3(sx, 0.12, 0.5)).normalize(); pad = 1.05;
      win.insertAdjacentHTML('beforeend', `<span class="cap">${esc(mv.pl)}</span>`);
    } else for (const m of meta) { const mesh = engine.meshes[m.id]; if (mesh && m.layer === 'muscles' && big(m.id) && !target.has(m.id) && !(m.s && side && m.s !== side)) { mesh.visible = true; mesh.material = M.rest; } }
  }
  const aspect = rect.w / rect.h, tanF = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), s = box.getSize(new THREE.Vector3());
  const dist = Math.max(s.y / 2 / tanF, Math.hypot(s.x, s.z) / 2 / (tanF * aspect)) * pad + 0.05, c = box.getCenter(new THREE.Vector3());
  cam.position.copy(c).addScaledVector(dir, dist); cam.up.set(0, 1, 0); cam.lookAt(c);
  cam.setViewOffset(rect.w, rect.h, (0.5 - cx) * rect.w, (0.5 - cy) * rect.h, rect.w, rect.h); // przesuwa cel kadru poza środek, pod tekst
  cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  engine.renderer.render(engine.scene, cam);

  // odnośniki 1 i 2 na slajdzie przyczepów
  if (view === 'att') {
    const center = (id) => { const b = meta[id].bb; return new THREE.Vector3((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2); };
    const anchor = (ids) => { if (!ids.length) return null; const m = new THREE.Vector3(); ids.forEach((i) => m.add(center(i))); m.multiplyScalar(1 / ids.length); return ids.map(center).sort((a, b) => a.distanceTo(m) - b.distanceTo(m))[0]; };
    const proj = (v) => { const p = v.clone().project(cam); return { x: (p.x * 0.5 + 0.5) * W, y: (-p.y * 0.5 + 0.5) * H }; };
    let svg = '';
    [[ent.att.filter((i) => meta[i].role === 'origin'), 1, '#ff4d4d'], [ent.att.filter((i) => meta[i].role === 'insertion'), 2, '#4d8dff']].forEach(([ids, n, col]) => {
      const a = anchor(ids); if (!a) return;
      const p = proj(a), bx = Math.min(W - 70, Math.max(p.x + 120, 640)), by = Math.max(210, Math.min(H - 120, p.y + (n === 1 ? -110 : 110)));
      svg += `<line x1="${p.x}" y1="${p.y}" x2="${bx}" y2="${by}" stroke="${col}" stroke-width="4"/><circle cx="${p.x}" cy="${p.y}" r="9" fill="${col}" stroke="${NAVY}" stroke-width="3"/><circle cx="${bx}" cy="${by}" r="30" fill="${col}"/><text x="${bx}" y="${by + 11}" text-anchor="middle" font-size="32" fill="${NAVY}" font-family="Bricolage Grotesque" font-weight="800">${n}</text>`;
    });
    ov.querySelector('.ps-lines').innerHTML = svg;
  }
  window.__post = { key, slide, name: SLIDES[slide - 1] };
  window.ready = true;
}
