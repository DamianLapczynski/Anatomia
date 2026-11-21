// Rekwizyty do animacji testów funkcjonalnych (kozetka, mata, krzesło, stopień, taśmy, ściana z miarą, siatka Y,
// drążek, płotek) oraz nakładka „środek ciężkości i podstawa podparcia”. Bryły three.js w engine.overlay, ustawiane
// względem pozy wyliczonej przez Motion (pointAt), więc pasują do sylwetki niezależnie od jej położenia.
import * as THREE from 'three';
import { COUCH_TOP, MAT_TOP } from './poses.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.02, ...o });
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (r, h, m) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), m);

// segmenty ciała i ich udział w masie (Winter): do przybliżonego środka ciężkości
const MASS = { pelvis: 0.142, trunk: 0.436, 'arm.l': 0.028, 'arm.r': 0.028, 'forearm.l': 0.016, 'forearm.r': 0.016, 'hand.l': 0.006, 'hand.r': 0.006, 'thigh.l': 0.1, 'thigh.r': 0.1, 'shank.l': 0.0465, 'shank.r': 0.0465, 'foot.l': 0.0145, 'foot.r': 0.0145 };

export function createProps(engine, motion, model) {
  const group = new THREE.Group(); group.name = 'props';
  engine.overlay.add(group);
  let dyn = []; // rekwizyty aktualizowane w każdej klatce (np. drążek w dłoniach)
  const C = { wood: mat('#b08a5a'), metal: mat('#9aa3ad', { metalness: 0.5, roughness: 0.4 }), pad: mat('#3d5a73'), padLight: mat('#5f7f99'), mat: mat('#2f6f6a'), tape: mat('#f1c84b', { roughness: 0.6 }), white: mat('#e9edf1'), wall: mat('#c9ced4', { transparent: true, opacity: 0.35 }), ruler: mat('#f4e2a8'), red: mat('#e5484d') };
  const B = () => motion._body;
  const P = (n) => { const b = B(), q = b.pt[n]; return q ? motion.pointAt(q.p, q.id) : null; };
  const clear = () => { for (const c of [...group.children]) { group.remove(c); c.traverse?.((o) => o.geometry?.dispose()); } dyn = []; };
  const add = (o, x, y, z) => { o.position.set(x, y, z); group.add(o); return o; };

  /** Rozmieszcza rekwizyty dla bieżącej animacji. at – postęp (k), w którym liczona jest poza odniesienia. */
  function build(list, at = 0) {
    clear();
    if (!list?.length || !motion.active) return;
    const keep = motion.active.k ?? 0;
    motion.set(at);
    const b = B();
    const all = [...b.all].map((id) => { const m = model.meta[id].bb; return motion.pointAt(V((m[0] + m[3]) / 2, (m[1] + m[4]) / 2, (m[2] + m[5]) / 2), id); });
    const bb = new THREE.Box3().setFromPoints(all), cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
    for (const name of list) {
      if (name === 'couch' || name === 'couchSorensen') {
        // kozetka wzdłuż ciała; w teście Sørensena kończy się na wysokości kolców biodrowych (tułów poza krawędzią)
        const g = new THREE.Group();
        const alongZ = bb.max.z - bb.min.z > bb.max.x - bb.min.x;
        let len = 1.95, c0 = alongZ ? cz : cx;
        if (name === 'couchSorensen') {
          const asis = P('asis.l').add(P('asis.r')).multiplyScalar(0.5), heel = P('toeTip.l');
          const a = alongZ ? asis.z : asis.x, h = alongZ ? heel.z : heel.x, dir = Math.sign(h - a);
          len = 1.25; c0 = a + dir * (len / 2 - 0.02);
          // pas stabilizujący nad łydkami
          const calf = P('calf.l').add(P('calf.r')).multiplyScalar(0.5), strap = box(alongZ ? 0.7 : 0.06, 0.012, alongZ ? 0.06 : 0.7, C.pad);
          add(strap, alongZ ? cx : calf.x, Math.max(calf.y, COUCH_TOP + 0.1), alongZ ? calf.z : cz);
        }
        const top = box(alongZ ? 0.62 : len, 0.09, alongZ ? len : 0.62, C.pad); top.position.y = COUCH_TOP - 0.045; g.add(top);
        const frame = box(alongZ ? 0.56 : len - 0.06, 0.06, alongZ ? len - 0.06 : 0.56, C.metal); frame.position.y = COUCH_TOP - 0.12; g.add(frame);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = cyl(0.02, COUCH_TOP - 0.15, C.metal); leg.position.set(alongZ ? sx * 0.25 : sx * (len / 2 - 0.08), (COUCH_TOP - 0.15) / 2, alongZ ? sz * (len / 2 - 0.08) : sz * 0.25); g.add(leg); }
        add(g, alongZ ? cx : c0, 0, alongZ ? c0 : cz);
      } else if (name === 'mat') {
        const alongZ = bb.max.z - bb.min.z > bb.max.x - bb.min.x;
        add(box(alongZ ? 0.8 : Math.max(1.9, bb.max.x - bb.min.x + 0.3), MAT_TOP, alongZ ? Math.max(1.9, bb.max.z - bb.min.z + 0.3) : 0.8, C.mat), cx, MAT_TOP / 2, cz);
      } else if (name === 'chair') {
        const isch = P('ischium.l').add(P('ischium.r')).multiplyScalar(0.5), seat = isch.y - (b.pt['ischium.l'].off ?? 0.03);
        const g = new THREE.Group();
        const s = box(0.46, 0.04, 0.44, C.wood); s.position.y = seat - 0.02; g.add(s);
        const back = box(0.46, 0.45, 0.03, C.wood); back.position.set(0, seat + 0.25, -0.24); g.add(back);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = box(0.035, seat - 0.04, 0.035, C.wood); leg.position.set(sx * 0.2, (seat - 0.04) / 2, sz * 0.19); g.add(leg); }
        add(g, isch.x, 0, isch.z + 0.06);
      } else if (name === 'step' || name === 'stepUnder') {
        const h = name === 'stepUnder' ? 0.2 : 0.18, f = name === 'stepUnder' ? P('heel.r').add(P('mt1.r')).multiplyScalar(0.5) : V(cx, 0, cz + 0.35);
        add(box(0.42, h, 0.32, C.white), name === 'stepUnder' ? f.x + 0.06 : cx, h / 2, name === 'stepUnder' ? f.z : cz + 0.42);
      } else if (name === 'tape3' || name === 'tape10') {
        const L = name === 'tape3' ? 3 : 4, z0 = name === 'tape3' ? cz - 0.05 : cz - 1.5;
        add(box(0.05, 0.003, L, C.tape), cx, 0.0015, z0 + L / 2);
        for (let i = 0; i <= L; i++) add(box(0.25, 0.004, 0.03, C.tape), cx, 0.002, z0 + i);
        add(cyl(0.12, 0.45, C.red), cx, 0.225, z0 + L + 0.18); // pachołek na nawrót
      } else if (name === 'stepAt') {
        // stopień pod prawą stopą w chwili „at” (np. stopa postawiona na schodku), szeroki na obie stopy
        const h = P('heel.r'), top = h.y - (b.pt['heel.r'].off ?? 0.01);
        add(box(0.5, top, 0.34, C.white), (P('heel.l').x + h.x) / 2, top / 2, h.z + 0.08);
      } else if (name === 'wall') {
        // ściana z miarą na wysokości barku (Functional Reach) po prawej stronie badanego
        const ac = P('acromion.r'), tip = P('fingertip.r');
        const x = Math.min(ac.x, tip.x) - 0.12;
        add(box(0.02, 1.6, 2.2, C.wall), x - 0.02, 0.8, cz + 0.4);
        const r = add(box(0.012, 0.05, 0.9, C.ruler), x, ac.y, cz + 0.45);
        for (let i = 0; i <= 9; i++) add(box(0.014, 0.05 * (i % 5 === 0 ? 1 : 0.5), 0.004, C.red), x + 0.001, ac.y + 0.012, r.position.z - 0.45 + i * 0.1);
      } else if (name === 'ygrid') {
        const f = P('heel.r').add(P('mt1.r')).multiplyScalar(0.5);
        for (const ang of [0, 135, -135]) { const t = box(0.04, 0.003, 1, C.tape); t.rotation.y = (ang * Math.PI) / 180; const r = (ang * Math.PI) / 180; add(t, f.x + Math.sin(r) * 0.5, 0.0015, f.z + Math.cos(r) * 0.5); }
      } else if (name === 'hurdle') {
        const tt = P('kneeLow.r'), z = cz + 0.3;
        for (const sx of [-1, 1]) add(cyl(0.012, tt.y, C.white), cx + sx * 0.35, tt.y / 2, z);
        const bar = cyl(0.004, 0.7, C.red); bar.rotation.z = Math.PI / 2; add(bar, cx, tt.y, z);
      } else if (name === 'line') {
        add(box(0.14, 0.03, 1.6, C.wood), (P('heel.l').x + P('heel.r').x) / 2, 0.015, cz);
      } else if (name === 'foursquare') {
        for (const r of [0, Math.PI / 2]) { const c = cyl(0.012, 1.0, C.metal); c.rotation.z = Math.PI / 2; c.rotation.y = r; add(c, cx - 0.17, 0.012, cz + 0.17); }
      } else if (name === 'dowelHands') {
        const d = cyl(0.014, 1.2, C.wood); group.add(d);
        dyn.push(() => { const a = P('palm.l'), c = P('palm.r'); d.position.copy(a).add(c).multiplyScalar(0.5); const dir = c.clone().sub(a).normalize(); d.quaternion.setFromUnitVectors(V(0, 1, 0), dir); });
      }
    }
    motion.set(keep);
    update();
  }
  function update() { for (const f of dyn) f(); }

  // ---- środek ciężkości (COM) i podstawa podparcia (BOS) ----
  const com = new THREE.Group(); com.visible = false; engine.overlay.add(com);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.022, 20, 14), new THREE.MeshBasicMaterial({ color: '#ff3b6b', depthTest: false, transparent: true }));
  ball.renderOrder = 10; com.add(ball);
  const plumb = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, 1, 0)]), new THREE.LineDashedMaterial({ color: '#ff3b6b', dashSize: 0.03, gapSize: 0.02, depthTest: false, transparent: true }));
  plumb.renderOrder = 10; com.add(plumb);
  const foot = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.03, 24), new THREE.MeshBasicMaterial({ color: '#ff3b6b', depthTest: false, side: THREE.DoubleSide }));
  foot.rotation.x = -Math.PI / 2; foot.renderOrder = 10; com.add(foot);
  const bosLine = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#35c98a', depthTest: false, transparent: true }));
  bosLine.renderOrder = 9; com.add(bosLine);
  const bosFill = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: '#35c98a', transparent: true, opacity: 0.18, depthTest: false, side: THREE.DoubleSide }));
  bosFill.renderOrder = 8; com.add(bosFill);
  const segCenters = new Map();
  function comPoint() {
    const b = B(); let w = 0; const c = V(0, 0, 0);
    for (const [seg, m] of Object.entries(MASS)) {
      const ids = b.part[seg]; if (!ids?.size) continue;
      let cen = segCenters.get(seg);
      if (!cen) { const pts = [...ids].map((id) => { const q = model.meta[id].bb; return [id, V((q[0] + q[3]) / 2, (q[1] + q[4]) / 2, (q[2] + q[5]) / 2)]; }); cen = pts; segCenters.set(seg, cen); }
      const s = V(0, 0, 0); for (const [id, p] of cen) s.add(motion.pointAt(p, id)); s.multiplyScalar(1 / cen.length);
      c.addScaledVector(s, m); w += m;
    }
    return c.multiplyScalar(1 / w);
  }
  // podstawa podparcia: wypukła otoczka punktów stóp dotykających podłoża (≤ 2 cm)
  const hull = (pts) => {
    const p = pts.slice().sort((a, b) => a.x - b.x || a.z - b.z); if (p.length < 3) return p;
    const cross = (o, a, b) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  };
  function updateCom(on) {
    com.visible = !!on && !!motion.active; if (!com.visible) return null;
    const c = comPoint(), b = B();
    ball.position.copy(c);
    plumb.geometry.setFromPoints([c, V(c.x, 0.002, c.z)]); plumb.computeLineDistances();
    foot.position.set(c.x, 0.003, c.z);
    const names = ['heel', 'heelBack', 'mt1', 'mt5', 'toeTip'].flatMap((n) => [`${n}.l`, `${n}.r`]);
    const pts = names.map((n) => (b.pt[n] ? { n, v: motion.pointAt(b.pt[n].p, b.pt[n].id) } : null)).filter((x) => x && x.v.y - (b.pt[x.n].off ?? 0.01) < 0.02).map((x) => V(x.v.x, 0.003, x.v.z));
    const h = hull(pts);
    bosLine.geometry.setFromPoints(h.length ? h : [V(0, -1, 0)]);
    if (h.length >= 3) { const verts = []; for (let i = 1; i < h.length - 1; i++) verts.push(h[0], h[i], h[i + 1]); bosFill.geometry.setFromPoints(verts); bosFill.visible = true; } else bosFill.visible = false;
    // czy rzut środka ciężkości mieści się w podstawie podparcia
    let inside = h.length >= 3;
    for (let i = 0; i < h.length && inside; i++) { const a = h[i], d = h[(i + 1) % h.length]; if ((d.x - a.x) * (c.z - a.z) - (d.z - a.z) * (c.x - a.x) < 0) inside = false; }
    return { com: c, inside, bos: h.length };
  }

  return { build, update, clear: () => { clear(); com.visible = false; }, updateCom, comPoint };
}
