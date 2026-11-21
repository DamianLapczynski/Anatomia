// Animacja ruchów w stawach: sztywne segmenty kostne + mięśnie „zginane” w osi stawu.
import * as THREE from 'three';
import { RigKit } from './rigs.js';

/** Wartość kanału animacji w chwili k (0..1): keys = [[t, v], …] posortowane po t, przejścia wygładzone (smoothstep). */
export function keyAt(keys, k) {
  if (k <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    if (k <= t1) { const [t0, v0] = keys[i - 1], u = t1 > t0 ? (k - t0) / (t1 - t0) : 1, e = u * u * (3 - 2 * u); return v0 + (v1 - v0) * e; }
  }
  return keys[keys.length - 1][1];
}

const HAND = /of hand$|metacarpal bone|^(Scaphoid|Lunate|Triquetrum|Pisiform|Trapezium|Trapezoid|Capitate|Hamate) bone/;
const FOOT = /of foot$|metatarsal bone|^(Calcaneus|Talus|Navicular bone|Cuboid bone)|cuneiform bone/;
const SEG = {
  shoulder: (n) => /^(Humerus|Radius|Ulna)$/.test(n) || HAND.test(n),
  elbow: (n) => /^(Radius|Ulna)$/.test(n) || HAND.test(n),
  forearm: (n) => n === 'Radius' || HAND.test(n),
  wrist: (n) => HAND.test(n),
  hip: (n) => /^(Femur|Patella|Tibia|Fibula)$/.test(n) || FOOT.test(n),
  knee: (n) => /^(Patella|Tibia|Fibula)$/.test(n) || FOOT.test(n),
  ankle: (n) => FOOT.test(n),
};

export class Motion {
  constructor(engine, model) {
    this.engine = engine; this.model = model;
    this.orig = new Map(); // id -> Float32Array pozycji wyjściowych
    this.skinCache = new Map(); // wagi „skórowania” mięśni dla ruchów wielostawowych (liczone raz na ruch i stronę)
    this.active = null;
  }

  _pos(id) {
    let o = this.orig.get(id);
    if (!o) { o = this.engine.meshes[id].geometry.attributes.position.array.slice(); this.orig.set(id, o); }
    return o;
  }

  _centroid(id, pred) {
    const p = this._pos(id), c = new THREE.Vector3(); let n = 0;
    for (let i = 0; i < p.length; i += 3) if (!pred || pred(p[i], p[i + 1], p[i + 2])) { c.x += p[i]; c.y += p[i + 1]; c.z += p[i + 2]; n++; }
    return n ? c.multiplyScalar(1 / n) : null;
  }

  _bone(name, side) { return this.model.ids(name, side).find((i) => this.model.meta[i].f === 'skeleton'); }

  _end(name, side, top, len) {
    const id = this._bone(name, side), bb = this.model.meta[id].bb;
    return top ? this._centroid(id, (x, y) => y > bb[4] - len) : this._centroid(id, (x, y) => y < bb[1] + len);
  }

  _joint(joint, side) {
    const X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);
    switch (joint) {
      case 'shoulder': { const p = this._end('Humerus', side, true, 0.04); return { p, long: this._end('Humerus', side, false, 0.02).sub(p).normalize(), X, Z }; }
      case 'elbow': return { p: this._end('Humerus', side, false, 0.022), X, Z };
      case 'forearm': { const p = this._end('Radius', side, true, 0.02); return { p, long: this._end('Ulna', side, false, 0.02).sub(p).normalize(), X, Z }; }
      case 'wrist': { const bb = this.model.meta[this._bone('Lunate bone', side)].bb; return { p: new THREE.Vector3((bb[0] + bb[3]) / 2, (bb[1] + bb[4]) / 2, (bb[2] + bb[5]) / 2), X, Z }; }
      case 'hip': {
        const id = this._bone('Femur', side), bb = this.model.meta[id].bb, lim = side === 'l' ? bb[0] + 0.045 : bb[3] - 0.045;
        const p = this._centroid(id, (x, y) => y > bb[4] - 0.05 && (side === 'l' ? x < lim : x > lim));
        return { p, long: this._end('Femur', side, false, 0.03).sub(p).normalize(), X, Z };
      }
      case 'knee': return { p: this._end('Femur', side, false, 0.03), X, Z };
      case 'ankle': { const bb = this.model.meta[this._bone('Talus', side)].bb; return { p: new THREE.Vector3((bb[0] + bb[3]) / 2, (bb[1] + bb[4]) / 2, (bb[2] + bb[5]) / 2), X, Z }; }
    }
    return null;
  }

  /** Przygotowuje ruch: zwraca false, jeśli ruch nie ma animacji kości. */
  setup(move, side, muscleKeys) {
    this.reset();
    if (move.rig) return this._setupRig(move, side, muscleKeys);
    if (!move.joint) return false;
    const { meta } = this.model, eng = this.engine;
    const j = this._joint(move.joint, side);
    const sign = side === 'l' ? 1 : -1;
    const axis = move.axis === 'x' ? j.X : move.axis === 'z' ? j.Z : j.long;
    const max = THREE.MathUtils.degToRad(move.axis === 'x' ? move.deg : move.axis === 'z' ? move.deg * sign : -sign * move.deg);
    const moving = new Set();
    for (const m of meta) if (m.f === 'skeleton' && m.s === side && SEG[move.joint](m.n) && eng.meshes[m.id]) moving.add(m.id);
    const rigid = new Set(moving);
    const sideBones = meta.filter((m) => m.f === 'skeleton' && (m.s === side || m.s === '') && eng.meshes[m.id]);
    const boneOfPatch = (id) => {
      const p = meta[id].par[0]; if (!p) return null;
      const mm = p.match(/^(.*)\.([lr])$/);
      return this.model.ids(mm ? mm[1] : p, mm ? mm[2] : '').find((b) => meta[b].f === 'skeleton');
    };
    const center = (id) => { const b = meta[id].bb; return new THREE.Vector3((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2); };
    const box = new THREE.Box3();
    const movesAt = (pt, patches) => {
      let best = null, bd = Infinity;
      for (const pid of patches) { const d = center(pid).distanceTo(pt); if (d < bd) { bd = d; best = pid; } }
      if (best !== null) { const b = boneOfPatch(best); if (b !== undefined && b !== null) return moving.has(b); }
      let bb = null; bd = Infinity;
      for (const m of sideBones) { box.min.set(m.bb[0], m.bb[1], m.bb[2]); box.max.set(m.bb[3], m.bb[4], m.bb[5]); const d = box.distanceToPoint(pt); if (d < bd) { bd = d; bb = m.id; } }
      return moving.has(bb);
    };
    const skins = [];
    const sides = /^test/.test(move.rig) ? ['r', 'l'] : [side]; // testy funkcjonalne: całe ciało, obie strony
    for (const key of muscleKeys) for (const sd of sides) {
      const e = this.model.muscleEntity(key, sd);
      const ori = e.att.filter((i) => meta[i].role === 'origin'), ins = e.att.filter((i) => meta[i].role === 'insertion');
      for (const pid of e.att) { const b = boneOfPatch(pid); if (b != null && moving.has(b)) rigid.add(pid); }
      for (const id of e.ids) {
        if (!eng.meshes[id]) continue;
        { const b = meta[id].bb; if (Math.max(b[3] - b[0], b[4] - b[1], b[5] - b[2]) < 0.03) continue; } // centymetrowe duplikaty siatek
        const P = this._pos(id), n = P.length / 3;
        let a;
        if (ori.length && ins.length) {
          const co = new THREE.Vector3(), ci = new THREE.Vector3();
          ori.forEach((i) => co.add(center(i))); ins.forEach((i) => ci.add(center(i)));
          a = ci.multiplyScalar(1 / ins.length).sub(co.multiplyScalar(1 / ori.length)).normalize();
        } else { const b = meta[id].bb, d = [b[3] - b[0], b[4] - b[1], b[5] - b[2]]; const k = d.indexOf(Math.max(...d)); a = new THREE.Vector3(k === 0 ? 1 : 0, k === 1 ? -1 : 0, k === 2 ? 1 : 0); }
        const t = new Float32Array(n); let lo = Infinity, hi = -Infinity;
        for (let i = 0; i < n; i++) { const v = P[i * 3] * a.x + P[i * 3 + 1] * a.y + P[i * 3 + 2] * a.z; t[i] = v; if (v < lo) lo = v; if (v > hi) hi = v; }
        const span = hi - lo || 1, A = new THREE.Vector3(), B = new THREE.Vector3(); let na = 0, nb = 0;
        for (let i = 0; i < n; i++) {
          if (t[i] < lo + 0.08 * span) { A.x += P[i * 3]; A.y += P[i * 3 + 1]; A.z += P[i * 3 + 2]; na++; }
          else if (t[i] > hi - 0.08 * span) { B.x += P[i * 3]; B.y += P[i * 3 + 1]; B.z += P[i * 3 + 2]; nb++; }
        }
        A.multiplyScalar(1 / (na || 1)); B.multiplyScalar(1 / (nb || 1));
        const both = ori.length && ins.length;
        const mA = movesAt(A, both ? ori : []), mB = movesAt(B, both ? ins : []);
        const w = new Float32Array(n);
        if (mA === mB) { if (mA) w.fill(1); else continue; }
        else {
          const tj = j.p.dot(a), band = 0.05;
          for (let i = 0; i < n; i++) { let k = THREE.MathUtils.smoothstep(t[i], tj - band, tj + band); w[i] = mB ? k : 1 - k; }
        }
        skins.push({ id, P, w, n });
      }
    }
    this.active = { j, axis, max, rigid, skins, reverse: !!move.reverse };
    this.set(0);
    return true;
  }

  /** k: 0..1 – postęp ruchu. */
  set(k) {
    const a = this.active; if (!a) return;
    if (a.rig) return this._setRig(k);
    const kk = a.reverse ? 1 - k : k;
    const M = new THREE.Matrix4().makeTranslation(a.j.p.x, a.j.p.y, a.j.p.z)
      .multiply(new THREE.Matrix4().makeRotationAxis(a.axis, a.max * kk))
      .multiply(new THREE.Matrix4().makeTranslation(-a.j.p.x, -a.j.p.y, -a.j.p.z));
    for (const id of a.rigid) { const m = this.engine.meshes[id]; if (!m) continue; m.matrix.copy(M); m.matrixWorldNeedsUpdate = true; }
    const e = M.elements;
    for (const s of a.skins) {
      const g = this.engine.meshes[s.id].geometry, out = g.attributes.position.array, P = s.P, w = s.w;
      for (let i = 0; i < s.n; i++) {
        const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], q = w[i];
        if (q === 0) { out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z; continue; }
        const mx = e[0] * x + e[4] * y + e[8] * z + e[12], my = e[1] * x + e[5] * y + e[9] * z + e[13], mz = e[2] * x + e[6] * y + e[10] * z + e[14];
        out[i * 3] = x + (mx - x) * q; out[i * 3 + 1] = y + (my - y) * q; out[i * 3 + 2] = z + (mz - z) * q;
      }
      g.attributes.position.needsUpdate = true;
      g.computeVertexNormals();
    }
    this.engine.invalidate();
  }

  /** Położenie punktu p (współrzędne spoczynkowe) kości id w bieżącej klatce animacji rigu. */
  pointAt(p, id) {
    const a = this.active, v = p.clone(); if (!a?.SM) return v;
    const M = new THREE.Matrix4(); for (const j of a.sigOf.get(id) ?? []) M.multiply(a.SM[j]);
    return v.applyMatrix4(M);
  }

  reset() {
    const a = this.active; if (!a) return;
    for (const id of (a.rig ? a.rigid.keys() : a.rigid)) { const m = this.engine.meshes[id]; if (m) { m.matrix.identity(); m.matrixWorldNeedsUpdate = true; } }
    for (const s of a.skins) {
      const g = this.engine.meshes[s.id].geometry;
      g.attributes.position.array.set(s.P); g.attributes.position.needsUpdate = true;
      g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
    }
    this.active = null;
    this.engine.invalidate();
  }

  // ---------- ruchy wielostawowe (src/rigs.js) ----------
  _stepMatrix(st, k) {
    if (st.pin) return new THREE.Matrix4();
    const kk = st.pre ? 1 : st.keys ? keyAt(st.keys, k) : k, p = st.pivot, M = new THREE.Matrix4();
    if (st.move) M.makeTranslation(st.move.x * kk, st.move.y * kk, st.move.z * kk);
    if (st.ang) M.multiply(new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)).multiply(new THREE.Matrix4().makeRotationAxis(st.axis, st.ang * kk)).multiply(new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z));
    return M;
  }

  _setupRig(move, side, muscleKeys) {
    const { meta } = this.model, eng = this.engine;
    let steps;
    try { steps = new RigKit(this, side).build(move.rig); } catch (e) { console.warn('rig', move.rig, e); return false; }
    steps = steps.filter((st) => st && st.pivot && (st.bones.size || st.move));
    if (!steps.length) return false;
    // znaki obrotów: punkt kontrolny ma ruszyć w stronę probe.d (od kroków wewnętrznych do zewnętrznych)
    for (let i = steps.length - 1; i >= 0; i--) {
      const st = steps[i]; st.bones.delete(undefined);
      if (st.rel !== undefined) continue;
      st.ang = st.axis ? THREE.MathUtils.degToRad(st.deg ?? 0) : 0; if (st.axis) st.axis = st.axis.clone().normalize();
      if (!st.ang || !st.probe) continue;
      const pt = st.probe.p.clone();
      if (st.probe.bone !== undefined) for (let j = steps.length - 1; j > i; j--) if (steps[j].bones.has(st.probe.bone)) pt.applyMatrix4(this._stepMatrix(steps[j], 1));
      const q = pt.clone().applyMatrix4(this._stepMatrix({ ...st, ang: 0.05, move: null, pre: true }, 1));
      if (q.sub(pt).dot(st.probe.d) < 0) st.axis.negate();
    }
    for (const st of steps) if (st.rel !== undefined) { const rel = [].concat(st.rel); st.axis = steps[rel[0]].axis.clone(); st.ang = rel.reduce((a, i) => a + steps[i].ang, 0) * st.deg; } // kąt przejęty z innych kroków (kompensacja)
    // grupy kości o tym samym zestawie kroków = ten sam ruch
    const sigOf = new Map(), groups = [[]], gIndex = new Map([['', 0]]);
    steps.forEach((st, i) => { for (const id of st.bones) sigOf.set(id, [...(sigOf.get(id) ?? []), i]); });
    const groupOf = (id) => { const sig = (sigOf.get(id) ?? []).join(','); if (!gIndex.has(sig)) { gIndex.set(sig, groups.length); groups.push(sig.split(',').map(Number)); } return gIndex.get(sig); };
    const rigid = new Map();
    for (const id of sigOf.keys()) if (eng.meshes[id]) rigid.set(id, groupOf(id));
    const boneOfPatch = (pid) => {
      const p = meta[pid].par[0]; if (!p) return null;
      const mm = p.match(/^(.*)\.([lr])$/);
      return this.model.ids(mm ? mm[1] : p, mm ? mm[2] : '').find((b) => meta[b].f === 'skeleton');
    };
    // kości kandydujące do „skórowania” mięśni: strona ruchu + linia pośrodkowa (+ druga strona dla ruchów obustronnych)
    const both = /^(spine|breath|swallow|jaw|test)/.test(move.rig);
    const bones = meta.filter((m) => m.f === 'skeleton' && eng.meshes[m.id] && (both || m.s === side || m.s === '')).map((m) => m.id);
    const samples = new Map(); // id kości → Float32Array punktów
    const sample = (id) => {
      let S = samples.get(id); if (S) return S;
      const P = this._pos(id), n = P.length / 3, step = Math.max(1, Math.floor(n / 90)), out = [];
      for (let i = 0; i < n; i += step) out.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
      S = new Float32Array(out); samples.set(id, S); return S;
    };
    const skins = [];
    for (const key of muscleKeys) {
      const e = this.model.muscleEntity(key, side);
      for (const pid of e.att) { const b = boneOfPatch(pid); if (b != null && sigOf.has(b)) rigid.set(pid, groupOf(b)); }
      for (const id of e.ids) {
        if (!eng.meshes[id]) continue;
        const b = meta[id].bb; if (Math.max(b[3] - b[0], b[4] - b[1], b[5] - b[2]) < 0.03) continue;
        const pad = 0.06, cand = bones.filter((bi) => { const c = meta[bi].bb; return c[0] < b[3] + pad && c[3] > b[0] - pad && c[1] < b[4] + pad && c[4] > b[1] - pad && c[2] < b[5] + pad && c[5] > b[2] - pad; });
        const cg = cand.map(groupOf);
        if (!cg.length || cg.every((g) => g === cg[0])) { if (cg.length && cg[0] !== 0) rigid.set(id, cg[0]); continue; }
        const P = this._pos(id), n = P.length / 3, G = groups.length, ck = `${move.rig}|${side}|${id}|${groups.length}`;
        const hit = this.skinCache.get(ck);
        if (hit) { skins.push({ id, P, n, ...hit }); continue; }
        const gi = new Uint8Array(n * 3), gw = new Float32Array(n * 3), dist = new Float32Array(G);
        const pts = cand.map((bi, j) => [sample(bi), cg[j]]);
        for (let v = 0; v < n; v++) {
          const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
          dist.fill(1e9);
          for (const [S, g] of pts) { let m = dist[g]; for (let i = 0; i < S.length; i += 3) { const dx = S[i] - x, dy = S[i + 1] - y, dz = S[i + 2] - z, d = dx * dx + dy * dy + dz * dz; if (d < m) m = d; } dist[g] = m; }
          let sum = 0;
          for (let r = 0; r < 3; r++) { // trzy najbliższe grupy, waga ~ 1/d^4
            let best = -1, bd = 1e9; for (let g = 0; g < G; g++) if (dist[g] < bd) { bd = dist[g]; best = g; }
            if (best < 0 || bd >= 1e9) break;
            const w = 1 / (bd * bd + 1e-12); gi[v * 3 + r] = best; gw[v * 3 + r] = w; sum += w; dist[best] = 1e9;
          }
          for (let r = 0; r < 3; r++) gw[v * 3 + r] /= sum || 1;
        }
        let dy = null;
        if (move.rig === 'breath' && key === 'diaphragm') { // kopuła przepony schodzi przy wdechu
          dy = new Float32Array(n); const lo = b[1] + 0.35 * (b[4] - b[1]);
          for (let v = 0; v < n; v++) dy[v] = -0.018 * THREE.MathUtils.smoothstep(P[v * 3 + 1], lo, b[4]);
        }
        this.skinCache.set(ck, { gi, gw, dy });
        skins.push({ id, P, n, gi, gw, dy });
      }
    }
    this.active = { rig: true, steps, groups, rigid, skins, sigOf, reverse: !!move.reverse, j: { p: steps.find((st) => !st.pre && st.ang)?.pivot ?? steps[0].pivot }, moving: [...sigOf.keys()] };
    this.set(0);
    return true;
  }

  /** Macierze kroków rigu w chwili kk (z przypięciami). */
  _rigSM(kk) {
    const a = this.active;
    const SM = a.steps.map((st) => (st.pin ? new THREE.Matrix4() : this._stepMatrix(st, kk)));
    // „przypięcie”: przesunięcie całego ciała tak, by stopa została w miejscu (lock) albo najniższy z punktów dotykał
    // powierzchni (floor: podłoga, blat kozetki, mata) – kontakt z podłożem wynika z geometrii, a nie z ręcznego strojenia
    a.steps.forEach((st, i) => {
      if (!st.pin) return;
      const P = Array.isArray(st.pin) ? (st.pin.find((x) => kk <= x.until) ?? st.pin[st.pin.length - 1]) : st.pin;
      const place = (list, M0 = SM) => list.map(({ id, p, off = 0 }) => { const M = new THREE.Matrix4(); for (const j of a.sigOf.get(id) ?? []) if (j !== i) M.multiply(M0[j]); const v = p.clone().applyMatrix4(M); v.y -= off; return v; }); // off – grubość tkanek miękkich pod kością
      let cur = P.mode === 'lock' ? place(P.pts.map((x) => ({ ...x, off: 0 }))) : place(P.pts), R = new THREE.Matrix4();
      if (P.mode === 'support') {
        // podpór na dwóch grupach punktów (np. dłonie i palce stóp, przedramię i stopa): obrót całego ciała wokół osi
        // poziomej przez najniższy punkt grupy A, aż najniższy punkt grupy B znajdzie się na tej samej wysokości
        const curB = place(P.ptsB), low = (arr) => arr.reduce((m, v) => (v.y < m.y ? v : m), arr[0]);
        const A = low(cur), Bp = low(curB), ax = P.axis === 'x' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
        const d = Bp.clone().sub(A);
        const phi = P.axis === 'x' ? Math.atan(d.y / (d.z || 1e-6)) : -Math.atan(d.y / (d.x || 1e-6));
        R = new THREE.Matrix4().makeTranslation(A.x, A.y, A.z).multiply(new THREE.Matrix4().makeRotationAxis(ax, phi)).multiply(new THREE.Matrix4().makeTranslation(-A.x, -A.y, -A.z));
        cur = [...cur, ...curB].map((v) => v.applyMatrix4(R));
      }
      const T = new THREE.Vector3();
      if (P.mode === 'lock') {
        // at: stopa zostaje tam, gdzie była w chwili at (np. postawiona na stopniu), a nie w pozycji spoczynkowej
        if (P.at !== undefined && !P._off) {
          const SMa = this._rigSM(P.at), pos = place(P.pts.map((x) => ({ ...x, off: 0 })), SMa).map((v, j) => v.applyMatrix4(SMa[i]).sub(P.pts[j].p));
          P._off = pos.reduce((acc, v) => acc.add(v), new THREE.Vector3()).multiplyScalar(1 / pos.length);
        }
        P.pts.forEach(({ p }, j) => T.add(p).sub(cur[j])); T.multiplyScalar(1 / P.pts.length);
        if (P._off) T.add(P._off);
      } else T.y = P.target - Math.min(...cur.map((v) => v.y));
      if (P.lift) T.y += keyAt(P.lift, kk);
      SM[i] = new THREE.Matrix4().makeTranslation(T.x, T.y, T.z).multiply(R);
    });
    return SM;
  }

  _setRig(k) {
    const a = this.active, kk = a.reverse ? 1 - k : k;
    a.k = kk;
    const SM = this._rigSM(kk);
    a.SM = SM;
    const GM = a.groups.map((sig) => { const M = new THREE.Matrix4(); for (const i of sig) if (!Number.isNaN(i)) M.multiply(SM[i]); return M; });
    for (const [id, g] of a.rigid) { const m = this.engine.meshes[id]; if (!m) continue; m.matrix.copy(GM[g]); m.matrixWorldNeedsUpdate = true; }
    const E = GM.map((M) => M.elements);
    for (const s of a.skins) {
      const g = this.engine.meshes[s.id].geometry, out = g.attributes.position.array, { P, gi, gw, dy } = s;
      for (let v = 0; v < s.n; v++) {
        const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2]; let ox = 0, oy = 0, oz = 0;
        for (let r = 0; r < 3; r++) {
          const w = gw[v * 3 + r]; if (!w) continue; const e = E[gi[v * 3 + r]];
          ox += w * (e[0] * x + e[4] * y + e[8] * z + e[12]); oy += w * (e[1] * x + e[5] * y + e[9] * z + e[13]); oz += w * (e[2] * x + e[6] * y + e[10] * z + e[14]);
        }
        out[v * 3] = ox; out[v * 3 + 1] = oy + (dy ? dy[v] * kk : 0); out[v * 3 + 2] = oz;
      }
      g.attributes.position.needsUpdate = true; g.computeVertexNormals();
    }
    this.engine.invalidate();
  }
}
