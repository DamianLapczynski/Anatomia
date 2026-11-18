// Wypala okluzję otoczenia (ambient occlusion) w kolorach wierzchołków kości.
// Zagłębienia (doły, otwory, szpary stawowe, okolice szwów) ciemnieją w ciepły odcień,
// dzięki czemu kość ma głębię także przy płaskim świetle i na słabym telefonie.
// Użycie: node tools/bake_ao.mjs [plik.glb …]   (domyślnie public/models/skeleton.glb)
// Uruchamiaj po każdym `npm run models` – skrypt czyta kolory bazowe ze źródła,
// więc ponowne wypalenie tego samego pliku przyciemniłoby go drugi raz (stąd znacznik w extras).
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { fixWinding } from '../src/geom.js';

const files = process.argv.slice(2).length ? process.argv.slice(2) : ['public/models/skeleton.glb'];
const RAYS = 64;
const SELF_DIST = 0.06; // m – zasięg zasłaniania przez tę samą kość
const NEIGH_DIST = 0.012; // m – sąsiednie kości liczą się tylko w szparach stawowych
const STRENGTH = 0.92;
const CAVITY = [0.46, 0.38, 0.3]; // mnożnik koloru w pełnym zagłębieniu (ciepły brąz)

await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

// kierunki na półkuli (Fibonacci, rozkład kosinusowy) – stałe dla powtarzalności
const DIRS = [];
for (let i = 0; i < RAYS; i++) {
  const u = (i + 0.5) / RAYS, phi = i * Math.PI * (3 - Math.sqrt(5));
  const r = Math.sqrt(u), z = Math.sqrt(1 - u);
  DIRS.push([r * Math.cos(phi), r * Math.sin(phi), z]);
}

for (const file of files) {
  const doc = await io.read(file);
  const root = doc.getRoot();
  if (root.getExtras()?.ao) { console.log(`${file}: już wypalony – pomijam (najpierw npm run models)`); continue; }
  const parts = [];
  for (const node of root.listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const M = new THREE.Matrix4().fromArray(node.getWorldMatrix());
    for (const prim of mesh.listPrimitives()) {
      const pa = prim.getAttribute('POSITION'), ia = prim.getIndices(), n = pa.getCount();
      const pos = new Float32Array(n * 3), v = new THREE.Vector3(), el = [0, 0, 0];
      for (let i = 0; i < n; i++) { pa.getElement(i, el); v.fromArray(el).applyMatrix4(M); v.toArray(pos, i * 3); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setIndex(new THREE.BufferAttribute(Uint32Array.from(ia.getArray()), 1));
      fixWinding(g); // ta sama poprawka co w aplikacji – inaczej lewa strona „patrzy do środka”
      g.computeVertexNormals();
      parts.push({ prim, g, bvh: new MeshBVH(g) });
    }
  }
  // jedna wspólna struktura dla sąsiadów
  const all = new THREE.BufferGeometry();
  { let nv = 0, ni = 0; for (const p of parts) { nv += p.g.attributes.position.count; ni += p.g.index.count; }
    const P = new Float32Array(nv * 3), I = new Uint32Array(ni); let ov = 0, oi = 0;
    for (const p of parts) { P.set(p.g.attributes.position.array, ov * 3); const src = p.g.index.array; for (let k = 0; k < src.length; k++) I[oi + k] = src[k] + ov; ov += p.g.attributes.position.count; oi += src.length; }
    all.setAttribute('position', new THREE.BufferAttribute(P, 3)); all.setIndex(new THREE.BufferAttribute(I, 1)); }
  const allBvh = new MeshBVH(all);

  const ray = new THREE.Ray(), o = new THREE.Vector3(), nrm = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), d = new THREE.Vector3();
  const t0 = Date.now(); let done = 0, total = 0, lastPc = -1;
  for (const p of parts) total += p.g.attributes.position.count;
  for (const p of parts) {
    const P = p.g.attributes.position, N = p.g.attributes.normal, n = P.count;
    const AO = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      nrm.fromBufferAttribute(N, i);
      t1.set(Math.abs(nrm.x) > 0.9 ? 0 : 1, Math.abs(nrm.x) > 0.9 ? 1 : 0, 0).cross(nrm).normalize(); t2.crossVectors(nrm, t1);
      o.fromBufferAttribute(P, i).addScaledVector(nrm, 0.0004);
      let occ = 0;
      for (const [x, y, z] of DIRS) {
        d.copy(t1).multiplyScalar(x).addScaledVector(t2, y).addScaledVector(nrm, z);
        ray.set(o, d);
        const hs = p.bvh.raycastFirst(ray, THREE.DoubleSide, 0, SELF_DIST);
        if (hs) { occ += 1 - (hs.distance / SELF_DIST) ** 2 * 0.5; continue; }
        const hn = allBvh.raycastFirst(ray, THREE.DoubleSide, 0, NEIGH_DIST);
        if (hn) occ += 0.7 * (1 - hn.distance / NEIGH_DIST);
      }
      AO[i] = 1 - Math.min(1, (occ / RAYS) * 2.1); // 1 = otwarte, 0 = pełne zagłębienie
    }
    // dwa przejścia wygładzania po sąsiadach – bez ziarna i „schodków” z próbkowania
    const idx = p.g.index.array;
    for (let pass = 0; pass < 2; pass++) {
      const sum = new Float32Array(n), cnt = new Uint16Array(n);
      for (let t = 0; t < idx.length; t += 3) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (a !== b) { sum[idx[t + a]] += AO[idx[t + b]]; cnt[idx[t + a]]++; }
      for (let i = 0; i < n; i++) if (cnt[i]) AO[i] = 0.5 * AO[i] + 0.5 * sum[i] / cnt[i];
    }
    const ca = p.prim.getAttribute('COLOR_0'), el = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const k = Math.pow(AO[i], 0.9);
      ca.getElement(i, el);
      for (let c = 0; c < 3; c++) el[c] *= 1 - STRENGTH * (1 - k) * (1 - CAVITY[c]);
      ca.setElement(i, el);
    }
    done += n;
    const pc = Math.floor((done / total) * 10); if (pc !== lastPc) { lastPc = pc; process.stdout.write(`\r${file}: ${pc * 10}%  `); }
  }
  root.setExtras({ ...(root.getExtras() ?? {}), ao: { rays: RAYS, self: SELF_DIST, neigh: NEIGH_DIST } });
  const before = fs.statSync(file).size;
  await io.write(file, doc);
  console.log(`\n${file}: ${total} wierzchołków, ${((Date.now() - t0) / 1000).toFixed(1)} s, ${Math.round(before / 1024)} → ${Math.round(fs.statSync(file).size / 1024)} kB`);
}
