// Animacja ruchów w stawach: sztywne segmenty kostne + mięśnie „zginane" w osi stawu.
import * as THREE from 'three';

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
    for (const key of muscleKeys) {
      const e = this.model.muscleEntity(key, side);
      const ori = e.att.filter((i) => meta[i].role === 'origin'), ins = e.att.filter((i) => meta[i].role === 'insertion');
      for (const pid of e.att) { const b = boneOfPatch(pid); if (b != null && moving.has(b)) rigid.add(pid); }
      for (const id of e.ids) {
        if (!eng.meshes[id]) continue;
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

  reset() {
    const a = this.active; if (!a) return;
    for (const id of a.rigid) { const m = this.engine.meshes[id]; if (m) { m.matrix.identity(); m.matrixWorldNeedsUpdate = true; } }
    for (const s of a.skins) {
      const g = this.engine.meshes[s.id].geometry;
      g.attributes.position.array.set(s.P); g.attributes.position.needsUpdate = true;
      g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
    }
    this.active = null;
    this.engine.invalidate();
  }
}
