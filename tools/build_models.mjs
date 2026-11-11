// Buduje skompresowane pliki GLB + metadane z surowego eksportu (tools/export_blend.py).
// Użycie: node tools/build_models.mjs <katalog_raw> [katalog_public]
import fs from 'node:fs';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const RAW = process.argv[2] ?? '../z-anatomy/raw';
const PUB = process.argv[3] ?? 'public';
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;

const { objects, labels } = JSON.parse(fs.readFileSync(path.join(RAW, 'index.json'), 'utf8'));
const srcMats = JSON.parse(fs.readFileSync(path.join(RAW, 'materials.json'), 'utf8'));
const bin = fs.readFileSync(path.join(RAW, 'geometry.bin'));

// ---------- paleta ----------
const C = {
  bone: [0.90, 0.86, 0.76], cartilage: [0.72, 0.82, 0.86], suture: [0.62, 0.58, 0.5],
  muscle: [0.66, 0.24, 0.21], tendon: [0.9, 0.87, 0.8], fascia: [0.84, 0.8, 0.74],
  bursa: [0.55, 0.75, 0.9], ligament: [0.8, 0.8, 0.72], capsule: [0.78, 0.78, 0.7],
  artery: [0.82, 0.13, 0.12], vein: [0.16, 0.33, 0.75], nerve: [0.96, 0.8, 0.2],
  origin: [0.9, 0.16, 0.16], insertion: [0.15, 0.42, 0.95],
};
function colorFor(mat, sys) {
  const m = mat ?? '';
  if (sys === 'insertions') return /^(End|Insertion)/i.test(m) ? C.insertion : C.origin;
  if (/^Bone/.test(m)) return C.bone;
  if (/^Suture/.test(m)) return C.suture;
  if (m === 'Cartilage') return C.cartilage;
  if (m === 'Tendon') return C.tendon;
  if (m === 'Fascia') return C.fascia;
  if (m === 'Bursa') return C.bursa;
  if (m === 'Ligament') return C.ligament;
  if (m === 'Articular capsule') return C.capsule;
  if (sys === 'muscles') return C.muscle;
  if (m === 'Artery' || m === 'Pulmonary vein') return C.artery;
  if (m === 'Vein' || m === 'Pulmonary artery') return C.vein;
  if (/^Nerve/.test(m)) return C.nerve;
  if (sys === 'skeleton') return C.bone;
  if (sys === 'joints') return C.ligament;
  const d = srcMats[m];
  return d ? d.slice(0, 3) : [0.7, 0.7, 0.7];
}

// ---------- grupy plików i budżety ----------
const fileOf = (o) => (o.sys === 'nervous' ? (o.kind === 'CURVE' || /nerve|plexus|trunk|ganglia|cauda|root/i.test(o.name) ? 'nerves' : 'cns') : o.sys);
const RATIO = { skeleton: 0.62, muscles: 0.36, insertions: 0.3, joints: 0.4, cardio: 0.75, nerves: 0.7, cns: 0.28 };
const ERR = { skeleton: 0.004, muscles: 0.012, insertions: 0.02, joints: 0.015, cardio: 0.01, nerves: 0.01, cns: 0.012 };

function parseName(name, sys) {
  let base = name, side = '', role = null, part = null;
  if (sys === 'insertions') {
    const m = name.match(/^(.*)\.([oe])(\d*)([lr])?$/);
    if (m) { base = m[1]; role = m[2] === 'o' ? 'origin' : 'insertion'; part = m[3] || null; side = m[4] ?? ''; }
  } else {
    const m = name.match(/^(.*)\.([lr])$/);
    if (m) { base = m[1]; side = m[2]; }
  }
  return { base: base.replace(/\.\d{3}$/, '').trim(), side, role, part };
}

function processMesh(o) {
  const nv = o.nv, nt = o.nt;
  const at = bin.byteOffset + o.off;
  const pos = new Float32Array(bin.buffer.slice(at, at + nv * 12));
  const tri = new Uint32Array(bin.buffer.slice(at + nv * 12, at + nv * 12 + nt * 12));
  const tm = new Uint8Array(bin.buffer, at + nv * 12 + nt * 12, nt);
  // Blender Z-up -> three Y-up
  for (let i = 0; i < nv; i++) { const y = pos[i * 3 + 1], z = pos[i * 3 + 2]; pos[i * 3 + 1] = z; pos[i * 3 + 2] = -y; }
  // materiał wierzchołka (ścięgno wygrywa z brzuścem, żeby przejścia były czytelne)
  const vmat = new Int16Array(nv).fill(-1);
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) { const v = tri[t * 3 + k]; if (vmat[v] < tm[t]) vmat[v] = tm[t]; }
  // spawanie po pozycji
  const map = new Map(), remap = new Uint32Array(nv); let n = 0;
  const wp = [], wm = [];
  for (let i = 0; i < nv; i++) {
    const key = `${Math.round(pos[i * 3] * 2e4)},${Math.round(pos[i * 3 + 1] * 2e4)},${Math.round(pos[i * 3 + 2] * 2e4)}`;
    let j = map.get(key);
    if (j === undefined) { j = n++; map.set(key, j); wp.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); wm.push(vmat[i]); }
    else if (vmat[i] > wm[j]) wm[j] = vmat[i];
    remap[i] = j;
  }
  let idx = [];
  for (let t = 0; t < nt; t++) {
    const a = remap[tri[t * 3]], b = remap[tri[t * 3 + 1]], c = remap[tri[t * 3 + 2]];
    if (a !== b && b !== c && a !== c) idx.push(a, b, c);
  }
  let indices = new Uint32Array(idx);
  const P = new Float32Array(wp);
  const f = fileOf(o);
  if (indices.length / 3 > 160) {
    const target = Math.max(120 * 3, Math.floor((indices.length / 3) * RATIO[f]) * 3);
    indices = MeshoptSimplifier.simplify(indices, P, 3, target, ERR[f])[0];
  }
  // kompaktowanie
  const used = new Int32Array(n).fill(-1); let m = 0;
  for (let i = 0; i < indices.length; i++) { if (used[indices[i]] < 0) used[indices[i]] = m++; }
  const outP = new Float32Array(m * 3), outC = new Uint8Array(m * 3), outN = new Float32Array(m * 3);
  for (let i = 0; i < n; i++) {
    const j = used[i]; if (j < 0) continue;
    outP.set(P.subarray(i * 3, i * 3 + 3), j * 3);
    const c = colorFor(o.mats[Math.max(0, wm[i])], o.sys);
    outC[j * 3] = Math.round(c[0] * 255); outC[j * 3 + 1] = Math.round(c[1] * 255); outC[j * 3 + 2] = Math.round(c[2] * 255);
  }
  const outI = new Uint32Array(indices.length);
  for (let i = 0; i < indices.length; i++) outI[i] = used[indices[i]];
  // normalne ważone polem
  for (let t = 0; t < outI.length; t += 3) {
    const a = outI[t] * 3, b = outI[t + 1] * 3, c = outI[t + 2] * 3;
    const ux = outP[b] - outP[a], uy = outP[b + 1] - outP[a + 1], uz = outP[b + 2] - outP[a + 2];
    const vx = outP[c] - outP[a], vy = outP[c + 1] - outP[a + 1], vz = outP[c + 2] - outP[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const q of [a, b, c]) { outN[q] += nx; outN[q + 1] += ny; outN[q + 2] += nz; }
  }
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < m; i++) {
    const l = Math.hypot(outN[i * 3], outN[i * 3 + 1], outN[i * 3 + 2]) || 1;
    outN[i * 3] /= l; outN[i * 3 + 1] /= l; outN[i * 3 + 2] /= l;
    for (let k = 0; k < 3; k++) { const v = outP[i * 3 + k]; if (v < min[k]) min[k] = v; if (v > max[k]) max[k] = v; }
  }
  return { P: outP, N: outN, C: outC, I: outI, min, max };
}

const docs = {}, meta = [], stats = {};
const KEEP_COLL = (c) => !/^\d: /.test(c) && c !== 'Bonus collection';
for (const o of objects) {
  if (/^\?|^Lat_Fis/.test(o.name)) continue;
  const g = processMesh(o);
  if (g.I.length < 3) continue;
  const f = fileOf(o);
  if (!docs[f]) {
    const doc = new Document(); doc.createBuffer();
    docs[f] = { doc, scene: doc.createScene(f), mat: doc.createMaterial('m') };
  }
  const { doc, scene, mat } = docs[f], buf = doc.getRoot().listBuffers()[0];
  const id = meta.length;
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(g.P).setBuffer(buf))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(g.N).setBuffer(buf))
    .setAttribute('COLOR_0', doc.createAccessor().setType('VEC3').setNormalized(true).setArray(g.C).setBuffer(buf))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(g.I).setBuffer(buf))
    .setMaterial(mat);
  scene.addChild(doc.createNode(String(id)).setMesh(doc.createMesh(String(id)).addPrimitive(prim)));
  const pn = parseName(o.name, o.sys);
  const r = (v) => Math.round(v * 1e4) / 1e4;
  meta.push({
    id, n: pn.base, s: pn.side, f, ...(pn.role ? { role: pn.role, part: pn.part } : {}),
    mat: o.mats.find((x) => x && x !== 'Tendon') ?? o.mats[0] ?? null,
    colls: o.colls.filter(KEEP_COLL),
    par: o.parents.filter((p) => !/^(Skeletal system|Muscular system|Joints|Nervous system & Sense organs|Cardiovascular system)\.g$/.test(p)),
    bb: [...g.min.map(r), ...g.max.map(r)],
  });
  stats[f] = stats[f] ?? { objects: 0, tris: 0 };
  stats[f].objects++; stats[f].tris += g.I.length / 3;
}

fs.mkdirSync(path.join(PUB, 'models'), { recursive: true });
fs.mkdirSync(path.join(PUB, 'data'), { recursive: true });
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
for (const [f, { doc }] of Object.entries(docs)) {
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizePosition: 14, quantizeNormal: 8 }));
  const out = path.join(PUB, 'models', `${f}.glb`);
  await io.write(out, doc);
  stats[f].kB = Math.round(fs.statSync(out).size / 1024);
}
const yup = (p) => [p[0], p[2], -p[1]].map((v) => Math.round(v * 1e4) / 1e4);
const lab = labels.filter((l) => l.line.length === 2 && l.parent).map((l) => ({
  n: l.name, p: l.parent, a: yup(l.line[0]), b: yup(l.line[1]),
}));
fs.writeFileSync(path.join(PUB, 'data', 'meta.json'), JSON.stringify(meta));
fs.writeFileSync(path.join(PUB, 'data', 'labels.json'), JSON.stringify(lab));
console.table(stats);
console.log('razem trójkątów:', Object.values(stats).reduce((a, s) => a + s.tris, 0), 'etykiet:', lab.length);
