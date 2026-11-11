// Tryb rolki: deterministyczna animacja 1080×1920 jednego mięśnia (?reel=<klucz>).
// Cały obraz jest funkcją czasu t – window.__reel.seek(t) – dzięki czemu tools/make_reel.mjs
// może renderować klatka po klatce, a przeglądarka odtwarzać podgląd na żywo.
import * as THREE from 'three';
import '@fontsource/bricolage-grotesque/latin-800.css';
import '@fontsource/bricolage-grotesque/latin-ext-800.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-ext-600.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '@fontsource/jetbrains-mono/latin-ext-500.css';
import './reel.css';
import { MOVES } from './data/movements.js';
import { polishName } from './data/names.js';
import REEL_TEXTS from './data/reel_texts.js';

const W = 1080, H = 1920;
const NAVY = '#0F2A3D', BONE = '#F4EFE6', CORAL = '#FF6B4A';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const ramp = (t, a, b) => smooth((t - a) / (b - a));
const short = (s, n) => { s = (s ?? '').trim(); if (s.length <= n) return s; const c = s.slice(0, n); return `${c.slice(0, Math.max(c.lastIndexOf(' '), n * 0.6)).replace(/[\s,;:(–-]+$/, '')}…`; };
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const REACH = { shoulder: 0.55, elbow: 0.36, forearm: 0.3, wrist: 0.2, hip: 0.7, knee: 0.5, ankle: 0.26 };

export async function startReel({ engine, model, motion, MUSCLES, NERVES }, params) {
  const key = params.get('reel');
  const kb = MUSCLES[key];
  const rt = REEL_TEXTS[key] ?? {}; // teksty pisane pod rolkę mają pierwszeństwo przed skrótami z bazy
  document.body.classList.add('reel');
  const stage = document.getElementById('stage');
  const fitStage = () => document.documentElement.style.setProperty('--rs', Math.min(innerWidth / W, innerHeight / H));
  fitStage(); addEventListener('resize', fitStage);
  if (!kb) { stage.insertAdjacentHTML('beforeend', `<div class="rl-err">Nie znam mięśnia „${esc(key)}”.</div>`); document.getElementById('loading').classList.add('hide'); return; }
  const capture = params.get('capture') === '1';
  let side = params.get('side') === 'l' ? 'l' : 'r';
  let ent = model.muscleEntity(key, side);
  if (!ent.ids.length) { side = ''; ent = model.muscleEntity(key, ''); }
  const meta = model.meta;

  await engine.ensureAll(['skeleton', 'muscles', 'insertions', 'nerves']);
  await document.fonts.ready;
  engine.renderer.setAnimationLoop(null);
  engine.controls.enabled = false;
  if (capture) engine.renderer.setPixelRatio(1);
  engine.resize();
  const cam = engine.camera;
  cam.far = 60; cam.updateProjectionMatrix();

  // ---------- zbiory siatek ----------
  const big = (id) => { const b = meta[id].bb; return Math.max(b[3] - b[0], b[4] - b[1], b[5] - b[2]) >= 0.03; };
  const target = new Set(ent.ids.filter(big));
  const att = new Set(ent.att), attBones = new Set(ent.bones);
  const nerve = new Set(ent.nerves), path = new Set(ent.nervePath);
  const tBox = engine.boxOf([...target]), tC = tBox.getCenter(new THREE.Vector3()), tR = tBox.getBoundingSphere(new THREE.Sphere()).radius;
  const center = (id) => { const b = meta[id].bb; return new THREE.Vector3((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2); };

  // kierunek „od kości na zewnątrz” – stąd patrzymy na mięsień
  let out = null;
  if (ent.bones.length) { const d = tC.clone().sub(engine.boxOf(ent.bones).getCenter(new THREE.Vector3())); d.y *= 0.25; if (d.length() > 0.012) out = d.normalize(); }
  if (!out) out = new THREE.Vector3(side === 'l' ? 0.45 : -0.45, 0.1, 1).normalize();
  if (Math.abs(out.y) > 0.6) { out.y = 0.3 * Math.sign(out.y); out.z += 0.6; out.normalize(); }

  // mięśnie zasłaniające cel (bliżej kamery, w jego sąsiedztwie) – „przebijamy się” przez nie po kolei
  const cover = [];
  {
    const cand = meta.filter((m) => m.layer === 'muscles' && !target.has(m.id) && engine.meshes[m.id] && !(m.s && side && m.s !== side) && big(m.id)).map((m) => engine.meshes[m.id]);
    const rc = new THREE.Raycaster(), hits = new Map(); let rays = 0;
    for (const id of target) {
      const pos = engine.meshes[id].geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 45));
      for (let i = 0; i < pos.count; i += step) {
        const o = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).addScaledVector(out, 0.004);
        rc.set(o, out); rc.far = 0.35; rays++;
        const seen = new Set();
        for (const h of rc.intersectObjects(cand, false)) { const hid = h.object.userData.id; if (seen.has(hid)) continue; seen.add(hid); const r = hits.get(hid) ?? { n: 0, d: 0 }; r.n++; r.d += h.distance; hits.set(hid, r); }
      }
    }
    for (const [id, r] of hits) if (r.n / rays > 0.06) cover.push({ id, depth: r.d / r.n, share: r.n / rays });
  }
  cover.sort((a, b) => b.depth - a.depth);
  const coverIds = new Set(cover.map((c) => c.id));
  const coverNames = [...new Set(cover.map((c) => MUSCLES[model.meshMuscle.get(meta[c.id].n)]?.lat).filter((n) => n && n !== kb.lat))].slice(0, 4);
  const deep = !ent.ids.some((i) => meta[i].colls.includes('Superficial muscles')) || coverNames.length >= 2;

  // ---------- materiały ----------
  const std = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.02, ...o });
  const M = {
    target: std({ emissive: new THREE.Color(CORAL), emissiveIntensity: 0 }),
    rest: std({ transparent: true }), bone: std({}), boneRest: std({ transparent: true }),
    att: std({ transparent: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, roughness: 0.35, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0 }),
    nerve: new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xffb400, emissiveIntensity: 0.55, roughness: 0.4, transparent: true }),
    path: new THREE.MeshStandardMaterial({ color: 0xd9a520, emissive: 0xa97800, emissiveIntensity: 0.35, roughness: 0.5, transparent: true }),
  };
  cover.forEach((c, i) => { c.mat = std({ transparent: true }); c.i = i; });
  const groups = { rest: [], boneRest: [], bone: [], att: [], nerve: [], path: [], target: [] };
  for (const m of meta) {
    const mesh = engine.meshes[m.id]; if (!mesh) continue;
    mesh.visible = false;
    let g = null;
    if (target.has(m.id)) g = 'target';
    else if (coverIds.has(m.id)) { mesh.material = cover.find((c) => c.id === m.id).mat; mesh.userData.cover = true; continue; }
    else if (att.has(m.id)) g = 'att';
    else if (nerve.has(m.id)) g = 'nerve';
    else if (path.has(m.id)) g = 'path';
    else if (m.layer === 'bones') g = attBones.has(m.id) ? 'bone' : 'boneRest';
    else if (m.layer === 'muscles' && big(m.id)) g = 'rest';
    if (!g) continue;
    mesh.material = M[g]; groups[g].push(mesh);
  }
  const show = (list, op, mat) => { const v = op > 0.01; if (mat) { mat.opacity = op; mat.depthWrite = op > 0.55; } for (const mesh of list) mesh.visible = v; };

  // gwiazdy
  {
    const n = 1400, p = new Float32Array(n * 3), col = new Float32Array(n * 3); let s = 7;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = 14 + rnd() * 10, q = Math.sqrt(1 - u * u);
      p.set([r * q * Math.cos(a), r * u + 1, r * q * Math.sin(a)], i * 3);
      const c = rnd() < 0.08 ? [1, 0.42, 0.29] : [0.62 + rnd() * 0.3, 0.7 + rnd() * 0.25, 0.76 + rnd() * 0.24];
      col.set(c, i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    engine.scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: capture ? 2.6 : 2.6 * engine.renderer.getPixelRatio(), sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false })));
  }

  // ---------- scenariusz ----------
  const moves = MOVES.filter((m) => m.joint && m.ago.includes(key)).sort((a, b) => a.ago.indexOf(key) - b.ago.indexOf(key)).concat(MOVES.filter((m) => m.joint && m.syn.includes(key))).slice(0, 3);
  const canMove = side && moves.length;
  const ori = ent.att.filter((i) => meta[i].role === 'origin'), ins = ent.att.filter((i) => meta[i].role === 'insertion');
  // Tempo czytania: pismo ~24 znaki/s, po każdej linii pauza, na końcu segmentu czas na doczytanie.
  const CPS = 26, GAP = 0.4;
  const script = {
    intro: [[rt.hook ?? 'skan układu mięśniowego… ok'], [`cel: ${kb.lat}`, 'hi']],
    dive: [[`warstwa: ${deep ? 'głęboka' : 'powierzchowna'}`], ...coverNames.map((n) => [`zdejmuję: ${n}`, 'dim']), ['cel namierzony', 'hi']],
    func: [['CZYNNOŚĆ', 'head'], ...(rt.f ?? kb.f.slice(0, 2).map((f) => short(f, 54))).map((f) => [f])],
    att: [['PRZYCZEPY', 'head'], [`początek: ${rt.o ?? short(kb.o, 50)}`], [`koniec: ${rt.i ?? short(kb.i, 50)}`]],
    nerve: [['UNERWIENIE', 'head'], [rt.n ?? short(kb.n, 60)], ...(nerveKbOf()?.palsy ? [[`uszkodzenie: ${short(nerveKbOf().palsy, 54)}`, 'dim']] : [])],
    outro: [['zapis zakończony.', 'dim']],
  };
  function nerveKbOf() { return (kb.nr ?? []).map((n) => model.meshNerve.get(n)).filter(Boolean).map((k) => NERVES[k])[0]; }
  const need = (lines, start = 0.4) => { const chars = lines.reduce((a, l) => a + l[0].length, 0); return start + chars / CPS + lines.length * GAP + Math.max(1.2, Math.min(2.2, chars / 60)); };
  const segs = []; let T = 0;
  const seg = (name, dur, extra = {}) => { const s = { name, t0: T, t1: T + dur, ...extra }; segs.push(s); T += dur; return s; };
  seg('intro', Math.max(3.4, need(script.intro)));
  seg('dive', Math.max(3.6, need(script.dive, 0.5)));
  seg('func', Math.max(4.6, need(script.func)));
  if (ori.length || ins.length) seg('att', Math.max(5.4, need(script.att)));
  if (canMove) moves.forEach((mv, i) => { const lines = mv.rom ? [[`zakres: ${short(mv.rom, 34)}`, 'dim']] : []; seg('move', 3.5, { mv, lines }); });
  seg('nerve', Math.max(nerve.size ? 5 : 3.6, need(script.nerve)));
  seg('outro', 4.8);
  const S = (name) => segs.find((s) => s.name === name);
  const at = (t) => segs.find((s) => t < s.t1) ?? segs[segs.length - 1];

  // ---------- kamera ----------
  const aspect = W / H, tanF = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
  const fitDist = (box, pad) => { const s = box.getSize(new THREE.Vector3()); return Math.max(s.y / 2 / tanF, Math.hypot(s.x, s.z) / 2 / (tanF * aspect)) * pad + 0.05; };
  const yaw = (v, a) => v.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
  const bodyBox = new THREE.Box3(new THREE.Vector3(-0.45, 0, -0.2), new THREE.Vector3(0.45, 1.72, 0.2));
  const attBox = ent.att.length ? engine.boxOf([...target, ...ent.att]) : tBox;
  const nerveBox = nerve.size ? engine.boxOf([...target, ...nerve, ...path]) : tBox;
  const front = new THREE.Vector3(0, 0.05, 1).normalize();
  const keyOf = (s, t) => {
    const u = t - s.t0;
    switch (s.name) {
      case 'intro': return { target: new THREE.Vector3(0, 1.13, 0), dir: yaw(front, -0.55 + 0.22 * u), dist: fitDist(bodyBox, 1.5) };
      case 'dive': case 'func': return { target: tC, dir: yaw(out, 0.5 * Math.sin((t - S('dive').t0) * 0.42)), dist: fitDist(tBox, 2.0) };
      case 'att': return { target: attBox.getCenter(new THREE.Vector3()), dir: yaw(out, 0.42 * Math.sin(u * 0.5 + 0.4)), dist: fitDist(attBox, 1.75) };
      case 'move': {
        const j = motion._joint(s.mv.joint, side), b = tBox.clone().expandByPoint(j.p).expandByScalar(REACH[s.mv.joint] * 0.32);
        const sx = side === 'l' ? 1 : -1;
        const d = s.mv.axis === 'z' ? new THREE.Vector3(sx * 0.3, 0.12, /sh_abd/.test(s.mv.id) ? -1 : 1) : new THREE.Vector3(sx, 0.12, 0.5);
        return { target: b.getCenter(new THREE.Vector3()), dir: yaw(d.normalize(), 0.12 * Math.sin(u * 0.9)), dist: fitDist(b, 1.0) };
      }
      case 'nerve': return { target: nerveBox.getCenter(new THREE.Vector3()), dir: yaw(new THREE.Vector3(out.x * 0.8, 0.08, Math.abs(out.z) < 0.3 ? 0.9 : out.z).normalize(), 0.3 * Math.sin(u * 0.55)), dist: fitDist(nerveBox, 1.5) };
      default: return { target: tC, dir: yaw(out, 0.6 * Math.sin(u * 0.45)), dist: fitDist(tBox, 2.3) };
    }
  };
  const setCamera = (t) => {
    const s = at(t), i = segs.indexOf(s);
    let k = keyOf(s, t);
    if (i > 0) {
      const p = keyOf(segs[i - 1], t), e = smooth((t - s.t0) / (s.name === 'dive' ? 2.6 : 1.3));
      const q = new THREE.Quaternion().setFromUnitVectors(p.dir, k.dir), id = new THREE.Quaternion();
      k = { target: p.target.clone().lerp(k.target, e), dir: p.dir.clone().applyQuaternion(id.slerp(q, e)), dist: p.dist + (k.dist - p.dist) * e };
    }
    cam.position.copy(k.target).addScaledVector(k.dir, k.dist);
    cam.up.set(0, 1, 0); cam.lookAt(k.target); cam.updateMatrixWorld();
  };

  // ---------- nakładka ----------
  const bonesOf = (ids) => { const names = [...new Set(ids.map((i) => (meta[i].par[0] ?? '').replace(/\.[lr]$/, '')).filter(Boolean).map((n) => polishName(n) ?? model.latin[n] ?? n))]; return names.length > 4 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', '); };
  const anchor = (ids) => { if (!ids.length) return null; const c = new THREE.Vector3(); ids.forEach((i) => c.add(center(i))); c.multiplyScalar(1 / ids.length); let best = null, bd = Infinity; for (const i of ids) { const d = center(i).distanceTo(c); if (d < bd) { bd = d; best = i; } } return { id: best, p: center(best) }; };
  const nerveKb = (kb.nr ?? []).map((n) => model.meshNerve.get(n)).filter(Boolean).map((k) => NERVES[k])[0];
  const nerveAnchor = (() => { if (!nerve.size) return null; let best = null, bd = Infinity; for (const i of nerve) { const d = center(i).distanceTo(tC); if (d < bd) { bd = d; best = i; } } return { id: best, p: center(best) }; })();
  const labels = [];
  if (S('att')) {
    const a = S('att');
    if (ori.length) labels.push({ cls: 'o', head: 'PRZYCZEP POCZĄTKOWY', body: bonesOf(ori), a: anchor(ori), x: 64, y: 470, alignR: false, t0: a.t0 + 0.5, t1: a.t1 });
    if (ins.length) labels.push({ cls: 'i', head: 'PRZYCZEP KOŃCOWY', body: bonesOf(ins), a: anchor(ins), x: W - 64, y: 1010, alignR: true, t0: a.t0 + 0.5 + (a.t1 - a.t0) * 0.38, t1: a.t1 });
  }
  if (nerveAnchor) { const n = S('nerve'); labels.push({ cls: 'n', head: 'UNERWIENIE', body: `${nerveKb?.lat ?? short(kb.n, 40)}${nerveKb?.roots ? ` · ${nerveKb.roots}` : ''}`, a: nerveAnchor, x: W - 64, y: 480, alignR: true, t0: n.t0 + 0.7, t1: n.t1 }); }

  const term = []; // {t0, text, cls, seg}
  const say = (s, lines, start = 0.4) => { let t = s.t0 + start; for (const [text, cls] of lines) { term.push({ seg: s, t0: t, text, cls: cls ?? '', cps: CPS }); t += text.length / CPS + GAP; } };
  say(S('intro'), script.intro);
  say(S('dive'), script.dive, 0.5);
  say(S('func'), script.func);
  if (S('att')) say(S('att'), script.att);
  segs.filter((x) => x.name === 'move').forEach((x) => say(x, x.lines, 0.3));
  say(S('nerve'), script.nerve);
  const tip = rt.tip ?? (kb.s && kb.s.length <= 190 ? kb.s : short(kb.s || kb.k, 170));
  say(S('outro'), script.outro, 0.3);

  const ov = document.createElement('div'); ov.id = 'reel';
  const ep = params.get('ep'), of = params.get('of'), series = params.get('series'), next = params.get('next');
  const titleSize = kb.pl.length > 34 ? 62 : kb.pl.length > 24 ? 76 : kb.pl.length > 16 ? 92 : 112;
  ov.innerHTML = `
    <div class="rl-vig"></div><div class="rl-shade"></div><div class="rl-scan"></div>
    <div class="rl-top"><span>@fizjio_anatomia</span><span class="rl-ep">${series ? esc(series) : ''}${ep ? ` ${String(ep).padStart(2, '0')}${of ? ` / ${String(of).padStart(2, '0')}` : ''}` : ''}</span></div>
    <div class="rl-title"><div class="rl-kick">${esc(kb.grp.toUpperCase())}</div><h1 style="font-size:${titleSize}px">${esc(kb.pl)}</h1><div class="rl-lat">${esc(kb.lat)}</div></div>
    <div class="rl-mini"><b>${esc(kb.lat)}</b><span>${esc(kb.pl)}</span></div>
    <div class="rl-move"></div>
    <svg class="rl-lines" viewBox="0 0 ${W} ${H}"></svg>
    <div class="rl-labels">${labels.map((l, i) => `<div class="rl-label ${l.cls} ${l.alignR ? 'r' : ''}" data-i="${i}" style="${l.alignR ? `right:${W - l.x}px` : `left:${l.x}px`};top:${l.y}px"><div class="h">${l.head}</div><div class="b">${esc(l.body)}</div></div>`).join('')}</div>
    <div class="rl-term"></div>
    <div class="rl-tip"><div class="k">SKOJARZENIE</div><div class="t" style="font-size:${tip.length > 120 ? 40 : 48}px">${esc(tip)}</div></div>
    <div class="rl-next">${next ? `Dalej: <b>${esc(next)}</b>. ` : ''}Obserwuj, bo przecież na pewno ktoś to czyta.</div>
    <div class="rl-corners"><i></i><i></i><i></i><i></i></div>`;
  stage.appendChild(ov);
  const $ = (s) => ov.querySelector(s);
  const el = { title: $('.rl-title'), mini: $('.rl-mini'), move: $('.rl-move'), lines: $('.rl-lines'), term: $('.rl-term'), tip: $('.rl-tip'), next: $('.rl-next'), labels: [...ov.querySelectorAll('.rl-label')] };
  document.getElementById('loading').classList.add('hide');

  const proj = (v) => { const p = v.clone().project(cam); return { x: (p.x * 0.5 + 0.5) * W, y: (-p.y * 0.5 + 0.5) * H, ok: p.z < 1 }; };
  let moveSeg = null;

  // ---------- klatka ----------
  function seek(t) {
    t = clamp(t, 0, T - 1e-4);
    const s = at(t), intro = S('intro'), dive = S('dive'), nv = S('nerve'), outro = S('outro'), a = S('att');
    // ruch
    if (s.name === 'move') {
      if (moveSeg !== s) { motion.reset(); motion.setup(s.mv, side, [key]); moveSeg = s; }
      const u = (t - s.t0) / (s.t1 - s.t0);
      motion.set(smooth(u < 0.12 ? 0 : u < 0.5 ? (u - 0.12) / 0.38 : u < 0.62 ? 1 : 1 - (u - 0.62) / 0.34));
    } else if (moveSeg) { motion.reset(); moveSeg = null; }
    const moving = s.name === 'move';
    const mvFade = segs.some((x) => x.name === 'move') ? ramp(t, segs.find((x) => x.name === 'move').t0 - 0.5, segs.find((x) => x.name === 'move').t0) * (1 - ramp(t, nv.t0 - 0.1, nv.t0 + 0.5)) : 0;
    // widoczność
    const ghost = 0.045;
    const restOp = (1 - (1 - ghost) * ramp(t, dive.t0 + 0.9, dive.t0 + 2.4)) * (1 - mvFade);
    show(groups.rest, restOp, M.rest);
    for (const c of cover) { const f0 = dive.t0 + 0.5 + c.i * (1.5 / Math.max(cover.length, 1)); const op = (1 - ramp(t, f0, f0 + 0.7)) ; c.mat.opacity = op; c.mat.depthWrite = op > 0.55; engine.meshes[c.id].visible = op > 0.01; }
    show(groups.boneRest, 1 - 0.72 * ramp(t, dive.t0 + 1.2, dive.t1) * (1 - 0.6 * mvFade), M.boneRest);
    show(groups.bone, 1); show(groups.target, 1);
    M.target.emissiveIntensity = 0.1 * ramp(t, dive.t0 + 1.5, dive.t1) + (moving ? 0.22 : 0) + 0.07 * Math.sin(t * 3.2) * ramp(t, dive.t1, dive.t1 + 0.5);
    const attOn = a ? ramp(t, a.t0 + 0.2, a.t0 + 0.9) : 0;
    show(groups.att, attOn * (1 - 0.0), M.att);
    M.att.emissiveIntensity = a ? 0.35 * Math.max(0, Math.sin((t - a.t0) * 5)) * (1 - ramp(t, a.t0 + 2.5, a.t0 + 3.5)) : 0;
    const nOn = ramp(t, nv.t0, nv.t0 + 0.8);
    show(groups.nerve, nOn, M.nerve); show(groups.path, nOn * ramp(t, nv.t0 + 0.6, nv.t0 + 1.6), M.path);
    M.nerve.emissiveIntensity = 0.45 + 0.35 * Math.sin((t - nv.t0) * 4.5) ** 2;
    setCamera(t);
    engine.renderer.render(engine.scene, cam);

    // tekst
    el.title.style.opacity = ramp(t, 0.15, 0.7) * (1 - ramp(t, intro.t1 - 0.2, intro.t1 + 0.5));
    el.title.style.transform = `translateY(${(1 - ramp(t, 0.15, 0.9)) * 40}px)`;
    el.mini.style.opacity = ramp(t, dive.t0 + 0.6, dive.t0 + 1.2) * (1 - ramp(t, outro.t0, outro.t0 + 0.4));
    el.move.style.opacity = moving ? ramp(t, s.t0 + 0.1, s.t0 + 0.5) * (1 - ramp(t, s.t1 - 0.4, s.t1)) : 0;
    if (moving && el.move.dataset.id !== s.mv.id) { el.move.dataset.id = s.mv.id; el.move.innerHTML = `<small>${esc(s.mv.g.toUpperCase())}</small>${esc(s.mv.pl)}`; }
    const tipOn = ramp(t, outro.t0 + 0.3, outro.t0 + 0.9);
    el.tip.style.opacity = tipOn; el.tip.style.transform = `translateY(${(1 - tipOn) * 50}px)`;
    el.next.style.opacity = ramp(t, outro.t0 + 1.3, outro.t0 + 1.9);
    // terminal: linie bieżącego segmentu
    const cur = term.filter((l) => l.seg === s && t >= l.t0);
    const fade = 1 - ramp(t, s.t1 - 0.35, s.t1) * (s === outro ? 0 : 1);
    el.term.style.opacity = s === outro ? 1 - tipOn : fade;
    el.term.innerHTML = cur.map((l, i) => {
      const n = Math.floor((t - l.t0) * l.cps), done = n >= l.text.length, last = i === cur.length - 1;
      const cursor = last && (!done || Math.floor(t * 2.6) % 2 === 0) ? '<i class="cur"></i>' : '';
      return `<div class="ln ${l.cls}">${l.cls === 'head' ? '' : '<b>&gt;</b> '}${esc(l.text.slice(0, n))}${cursor}</div>`;
    }).join('');
    // etykiety z liniami
    let svg = '';
    labels.forEach((l, i) => {
      const d = el.labels[i], on = ramp(t, l.t0, l.t0 + 0.5) * (1 - ramp(t, l.t1 - 0.4, l.t1));
      d.style.opacity = ramp(t, l.t0 + 0.35, l.t0 + 0.8) * (1 - ramp(t, l.t1 - 0.4, l.t1));
      if (on < 0.01) return;
      const mesh = engine.meshes[l.a.id], p = proj(l.a.p.clone().applyMatrix4(mesh.matrixWorld));
      const r = { w: d.offsetWidth, h: d.offsetHeight }, ex = l.alignR ? l.x - r.w - 14 : l.x + r.w + 14, ey = l.y + 34;
      const g = ramp(t, l.t0, l.t0 + 0.55), col = l.cls === 'o' ? '#ff4d4d' : l.cls === 'i' ? '#4d8dff' : '#ffd23a';
      const kx = p.x + (ex - p.x) * 0.55, x2 = p.x + (kx - p.x) * Math.min(1, g * 2), y2 = p.y + (ey - p.y) * Math.min(1, g * 2);
      const x3 = kx + (ex - kx) * clamp(g * 2 - 1);
      svg += `<g opacity="${on}" stroke="${col}" fill="none" stroke-width="3"><circle cx="${p.x}" cy="${p.y}" r="${11 + 5 * Math.sin(t * 5)}" stroke-opacity=".45"/><circle cx="${p.x}" cy="${p.y}" r="7" fill="${col}" stroke="${NAVY}" stroke-width="3"/><polyline points="${p.x},${p.y} ${x2},${y2}${g > 0.5 ? ` ${x3},${ey}` : ''}"/></g>`;
    });
    el.lines.innerHTML = svg;
  }

  window.__reel = { duration: T, fps: 30, seek, key, title: kb.pl, lat: kb.lat, segments: segs.map((s) => [s.name, +s.t0.toFixed(2)]) };
  seek(0);
  window.ready = true;
  if (!capture) {
    let t0 = performance.now(), paused = false, tp = 0;
    const loop = (now) => { if (!paused) { tp = ((now - t0) / 1000) % (T + 0.8); seek(Math.min(tp, T)); } requestAnimationFrame(loop); };
    stage.addEventListener('pointerdown', () => { paused = !paused; if (!paused) t0 = performance.now() - tp * 1000; });
    requestAnimationFrame(loop);
  }
}
