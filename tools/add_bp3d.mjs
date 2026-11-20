// Dodaje mięśnie, których nie ma w Z-Anatomy, z BodyParts3D (STL, CC BY-SA 2.1 JP) – jako osobny plik
// public/models/muscles_extra.glb (wczytywany razem z mięśniami) i wpisy dopisane na końcu public/data/meta.json.
// Układ współrzędnych BodyParts3D → model aplikacji dopasowywany po kościach obecnych w obu źródłach.
//
// Użycie: node tools/add_bp3d.mjs <katalog_ze_stl>
//   katalog zawiera pliki FMA<id>.stl z repozytorium BodyParts3D (assets/BodyParts3D_data/stl),
//   m.in. kości referencyjne z listy REF poniżej i mięśnie z listy ADD.
// Skrypt można uruchamiać wielokrotnie – poprzednio dodane wpisy (src: 'bp3d') są zastępowane.
import fs from 'node:fs';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const DIR = process.argv[2];
if (!DIR) { console.error('Podaj katalog z plikami FMA*.stl'); process.exit(1); }
await MeshoptEncoder.ready; await MeshoptSimplifier.ready;

// kości obecne w obu modelach: FMA → [nazwa w meta.json, strona]
const REF = { 52735: ['Occipital bone', ''], 52748: ['Mandible', ''], 52749: ['Hyoid bone', ''], 12519: ['Atlas (C1)', ''], 12520: ['Axis (C2)', ''], 12525: ['Vertebra C7', ''], 13076: ['Vertebra L5', ''], 9165: ['Vertebra T1', ''],
  13322: ['Clavicle', 'r'], 13323: ['Clavicle', 'l'], 13395: ['Scapula', 'r'], 13396: ['Scapula', 'l'], 23130: ['Humerus', 'r'], 23131: ['Humerus', 'l'], 24474: ['Femur', 'r'], 24475: ['Femur', 'l'], 24477: ['Tibia', 'r'], 24478: ['Tibia', 'l'] };
// mięśnie do dodania: FMA → [nazwa, strona ('' = rozdziel na lewą/prawą po osi x), kolekcje]
const ADD = {
  22876: ['Semispinalis capitis muscle', 'r', ['Back', 'Neck']], 22877: ['Semispinalis capitis muscle', 'l', ['Back', 'Neck']],
  45856: ['Puborectalis muscle', 'r', ['Pelvis']], 45857: ['Puborectalis muscle', 'l', ['Pelvis']],
  71442: ['Anterior cervical intertransversarii', '', ['Neck']], 71443: ['Posterior cervical intertransversarii', '', ['Neck']],
};

function readStl(file) {
  const b = fs.readFileSync(file), n = b.readUInt32LE(80), P = new Float32Array(n * 9);
  if (84 + n * 50 !== b.length) throw new Error(`${file}: to nie jest binarny STL`);
  for (let i = 0; i < n; i++) for (let k = 0; k < 9; k++) P[i * 9 + k] = b.readFloatLE(84 + i * 50 + 12 + k * 4);
  return P;
}
const bbox = (P) => { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[i + k]); mx[k] = Math.max(mx[k], P[i + k]); } return [mn, mx]; };

const META = 'public/data/meta.json';
let meta = JSON.parse(fs.readFileSync(META, 'utf8')).filter((m) => m.src !== 'bp3d');

// ---------- dopasowanie układu: permutacja osi + znaki + skala + przesunięcie ----------
const pairs = Object.entries(REF).map(([fma, [n, s]]) => {
  const m = meta.find((x) => x.f === 'skeleton' && x.n === n && x.s === s);
  const [mn, mx] = bbox(readStl(path.join(DIR, `FMA${fma}.stl`)));
  return { a: mn.map((v, k) => (v + mx[k]) / 2), as: mx.map((v, k) => v - mn[k]), b: [0, 1, 2].map((k) => (m.bb[k] + m.bb[k + 3]) / 2), bs: [0, 1, 2].map((k) => m.bb[k + 3] - m.bb[k]) };
});
let fit = null;
for (const pm of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) for (let sg = 0; sg < 8; sg++) {
  const sign = [sg & 1 ? -1 : 1, sg & 2 ? -1 : 1, sg & 4 ? -1 : 1];
  const A = pairs.map((p) => pm.map((k, j) => sign[j] * p.a[k]));
  const sc = pairs.reduce((s, p) => s + pm.reduce((t, k, j) => t + p.bs[j] / p.as[k], 0) / 3, 0) / pairs.length;
  const t = [0, 1, 2].map((j) => pairs.reduce((s, p, i) => s + (p.b[j] - sc * A[i][j]), 0) / pairs.length);
  const res = Math.sqrt(pairs.reduce((s, p, i) => s + [0, 1, 2].reduce((u, j) => u + (sc * A[i][j] + t[j] - p.b[j]) ** 2, 0), 0) / pairs.length);
  if (!fit || res < fit.res) fit = { pm, sign, sc, t, res };
}
console.log(`dopasowanie: błąd średni ${(fit.res * 1000).toFixed(1)} mm`);
if (fit.res > 0.01) { console.error('Dopasowanie zbyt słabe – przerwano.'); process.exit(1); }
const det = (() => { const M = [0, 1, 2].map((j) => [0, 1, 2].map((k) => (fit.pm[j] === k ? fit.sign[j] : 0))); return M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]); })();
const tf = (x, y, z) => { const v = [x, y, z]; return fit.pm.map((k, j) => fit.sc * fit.sign[j] * v[k] + fit.t[j]); };

// ---------- siatki ----------
function mesh(tris) { // tris: Float32Array (9 liczb na trójkąt) w układzie aplikacji
  const map = new Map(), P = [], I = [];
  const vid = (x, y, z) => { const key = `${Math.round(x * 2e4)},${Math.round(y * 2e4)},${Math.round(z * 2e4)}`; let j = map.get(key); if (j === undefined) { j = P.length / 3; map.set(key, j); P.push(x, y, z); } return j; };
  for (let i = 0; i < tris.length; i += 9) {
    const a = vid(tris[i], tris[i + 1], tris[i + 2]), b = vid(tris[i + 3], tris[i + 4], tris[i + 5]), c = vid(tris[i + 6], tris[i + 7], tris[i + 8]);
    if (a !== b && b !== c && a !== c) det > 0 ? I.push(a, b, c) : I.push(a, c, b);
  }
  const pos = new Float32Array(P);
  let idx = new Uint32Array(I);
  if (idx.length / 3 > 160) idx = MeshoptSimplifier.simplify(idx, pos, 3, Math.max(360, Math.floor((idx.length / 3) * 0.36) * 3), 0.012)[0];
  const used = new Int32Array(pos.length / 3).fill(-1); let m = 0;
  for (const i of idx) if (used[i] < 0) used[i] = m++;
  const oP = new Float32Array(m * 3), oN = new Float32Array(m * 3), oC = new Uint8Array(m * 3), oI = new Uint32Array(idx.length);
  for (let i = 0; i < used.length; i++) if (used[i] >= 0) oP.set(pos.subarray(i * 3, i * 3 + 3), used[i] * 3);
  for (let i = 0; i < idx.length; i++) oI[i] = used[idx[i]];
  for (let t = 0; t < oI.length; t += 3) {
    const a = oI[t] * 3, b = oI[t + 1] * 3, c = oI[t + 2] * 3;
    const ux = oP[b] - oP[a], uy = oP[b + 1] - oP[a + 1], uz = oP[b + 2] - oP[a + 2], vx = oP[c] - oP[a], vy = oP[c + 1] - oP[a + 1], vz = oP[c + 2] - oP[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const q of [a, b, c]) { oN[q] += nx; oN[q + 1] += ny; oN[q + 2] += nz; }
  }
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < m; i++) {
    const l = Math.hypot(oN[i * 3], oN[i * 3 + 1], oN[i * 3 + 2]) || 1;
    for (let k = 0; k < 3; k++) { oN[i * 3 + k] /= l; mn[k] = Math.min(mn[k], oP[i * 3 + k]); mx[k] = Math.max(mx[k], oP[i * 3 + k]); }
    oC.set([168, 61, 54], i * 3); // kolor mięśnia jak w build_models.mjs
  }
  return { P: oP, N: oN, C: oC, I: oI, mn, mx };
}

const doc = new Document(); const buf = doc.createBuffer(); const scene = doc.createScene('muscles_extra'); const mat = doc.createMaterial('m');
const r4 = (v) => Math.round(v * 1e4) / 1e4;
for (const [fma, [name, side, colls]] of Object.entries(ADD)) {
  const raw = readStl(path.join(DIR, `FMA${fma}.stl`)), T = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i += 3) T.set(tf(raw[i], raw[i + 1], raw[i + 2]), i);
  const parts = side ? [[side, T]] : ['r', 'l'].map((s) => { // zestaw obustronny → osobno lewa i prawa (prawa strona ciała ma x < 0)
    const out = []; for (let i = 0; i < T.length; i += 9) { const cx = (T[i] + T[i + 3] + T[i + 6]) / 3; if ((cx < 0) === (s === 'r')) out.push(...T.subarray(i, i + 9)); } return [s, new Float32Array(out)];
  });
  for (const [s, tris] of parts) {
    const g = mesh(tris), id = meta.length;
    const prim = doc.createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(g.P).setBuffer(buf))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(g.N).setBuffer(buf))
      .setAttribute('COLOR_0', doc.createAccessor().setType('VEC3').setNormalized(true).setArray(g.C).setBuffer(buf))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(g.I).setBuffer(buf)).setMaterial(mat);
    scene.addChild(doc.createNode(String(id)).setMesh(doc.createMesh(String(id)).addPrimitive(prim)));
    meta.push({ id, n: name, s, f: 'muscles', mat: 'Extension', colls, par: [], bb: [...g.mn.map(r4), ...g.mx.map(r4)], src: 'bp3d' });
    console.log(`+ ${name} (${s}) – ${g.I.length / 3} trójkątów, x ${r4(g.mn[0])}…${r4(g.mx[0])}`);
  }
}
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizePosition: 14, quantizeNormal: 8 }));
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await io.write('public/models/muscles_extra.glb', doc);
fs.writeFileSync(META, JSON.stringify(meta));
// nazwy łacińskie (TA2)
const LAT = 'public/data/latin.json', latin = JSON.parse(fs.readFileSync(LAT, 'utf8'));
Object.assign(latin, { 'Semispinalis capitis muscle': 'Musculus semispinalis capitis', 'Puborectalis muscle': 'Musculus puborectalis',
  'Anterior cervical intertransversarii': 'Musculi intertransversarii anteriores cervicis', 'Posterior cervical intertransversarii': 'Musculi intertransversarii posteriores cervicis' });
fs.writeFileSync(LAT, JSON.stringify(latin));
console.log(`zapisano public/models/muscles_extra.glb (${Math.round(fs.statSync('public/models/muscles_extra.glb').size / 1024)} kB), meta: ${meta.length} pozycji`);
