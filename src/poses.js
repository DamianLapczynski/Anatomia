// Pozy i animacje całego ciała dla testów funkcjonalnych (tryb Klinika → Testy funkcjonalne).
// Szkielet dzielony jest na segmenty (miednica, tułów, ramię, przedramię, ręka, udo, goleń, stopa) połączone w drzewo
// od miednicy. Animację opisują klatki kluczowe z kątami segmentów w układzie ciała (stojąc, przodem do +z):
//   kąty strzałkowe (stopnie): segment kończyny „zwisający” – dodatni = koniec dalszy do przodu (thigh, shank, arm,
//   forearm), tułów i miednica – dodatni = pochylenie do przodu, stopa (foot) – dodatni = palce w górę; domyślnie
//   tułów idzie za miednicą, kończyny wiszą pionowo, goleń i przedramię przedłużają udo i ramię, stopa leży poziomo;
//   kąty względne: hipZ / shZ – odwiedzenie, hipY / shY – rotacja wewnętrzna, shH – przywiedzenie poziome ramienia, trunkZ – skłon boczny (+ w prawo),
//   trunkY – skręt (+ w lewo), pelvisZ – przechylenie miednicy (+ = prawa strona w dół), neck – zgięcie szyi (+ = zgięcie);
//   pro – pronacja przedramienia (− supinacja), ulnar – odchylenie łokciowe ręki (− promieniowe), kneeY – rotacja
//   wewnętrzna goleni (− zewnętrzna), tib – przesunięcie piszczeli do przodu względem uda (m, − do tyłu; szuflada, Lachman);
//   rx / ry / rz – obrót całego ciała (leżenie, nawrót), x / y / z – przesunięcie (metry).
// „pin” przypina ciało do podłoża: lock – wskazane punkty (np. pięty) zostają w miejscu, floor – najniższy z punktów
// dotyka powierzchni o wysokości target (podłoga, blat kozetki, mata). Dzięki temu kontakt z podłożem wynika z geometrii.
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const HAND = /of hand$|metacarpal bone|^(Scaphoid|Lunate|Triquetrum|Pisiform|Trapezium|Trapezoid|Capitate|Hamate) bone/;
const FOOT = /of foot$|metatarsal bone|^(Calcaneus|Talus|Navicular bone|Cuboid bone)|cuneiform bone|^Sesamoid bones of foot/;
export const COUCH_TOP = 0.66; // wysokość blatu kozetki (m)
export const MAT_TOP = 0.012; // grubość maty
const D2R = Math.PI / 180;

/** Podział szkieletu na segmenty, osie stawów i nazwane punkty ciała (współrzędne spoczynkowe). */
export function bodyOf(kit) {
  if (kit.mo._body) return kit.mo._body;
  const { meta } = kit, eng = kit.mo.engine;
  const part = {};
  const add = (k, id) => (part[k] ??= new Set()).add(id);
  for (const m of meta) {
    if (m.f !== 'skeleton' || !eng.meshes[m.id]) continue;
    const s = m.s, n = m.n;
    if (s && FOOT.test(n)) add(`foot.${s}`, m.id);
    else if (s && /^(Tibia|Fibula|Patella)$/.test(n)) add(`shank.${s}`, m.id);
    else if (s && n === 'Femur') add(`thigh.${s}`, m.id);
    else if (s && HAND.test(n)) add(`hand.${s}`, m.id);
    else if (s && /^(Radius|Ulna)$/.test(n)) add(`forearm.${s}`, m.id);
    else if (s && n === 'Humerus') add(`arm.${s}`, m.id);
    else if (/^(Hip bone|Sacrum|Coccyx)$/.test(n)) add('pelvis', m.id);
    else add('trunk', m.id); // kręgosłup, klatka, obręcz barkowa, głowa
  }
  const mo = kit.mo, J = (j, s) => mo._joint(j, s).p.clone();
  const L5 = kit.id('Vertebra L5', ''), bb5 = meta[L5].bb;
  const piv = { 'L5S1': V((bb5[0] + bb5[3]) / 2, bb5[1], (bb5[2] + bb5[5]) / 2) };
  // głowa i szyja (C3 w górę, czaszka, krtań): osobny segment zginany na granicy szyjno-piersiowej (szczyt C7)
  const C7 = kit.id('Vertebra C7', '');
  if (C7 !== undefined) {
    const b7 = meta[C7].bb; piv.neck = V((b7[0] + b7[3]) / 2, b7[4], (b7[2] + b7[5]) / 2);
    for (const id of [...(part.trunk ?? [])]) { const q = meta[id].bb; if ((q[1] + q[4]) / 2 > b7[4]) { part.trunk.delete(id); add('head', id); } }
  }
  for (const s of ['l', 'r']) for (const j of ['hip', 'knee', 'ankle', 'shoulder', 'elbow', 'wrist']) piv[`${j}.${s}`] = J(j, s);
  piv.pelvis = piv['hip.l'].clone().add(piv['hip.r']).multiplyScalar(0.5);
  // nazwane punkty: [kość, kierunek „najdalej w stronę”]
  const pt = {};
  const P = (name, bone, side, d, len) => { const id = kit.id(bone, side); if (id !== undefined) pt[name] = { id, p: kit.extreme(id, d.normalize(), len) }; };
  for (const s of ['l', 'r']) {
    const sx = s === 'l' ? 1 : -1;
    P(`heel.${s}`, 'Calcaneus', s, V(0, -1, -0.35));
    P(`heelBack.${s}`, 'Calcaneus', s, V(0, -0.2, -1));
    P(`mt1.${s}`, 'First metatarsal bone', s, V(0, -1, 0.3));
    P(`mt5.${s}`, 'Fifth metatarsal bone', s, V(sx * 0.3, -1, 0.2));
    P(`toe.${s}`, 'Distal phalanx of first finger of foot', s, V(0, -0.3, 1));
    P(`toeTip.${s}`, 'Distal phalanx of first finger of foot', s, V(0, 0, 1));
    P(`knee.${s}`, 'Patella', s, V(0, 0, 1));
    P(`kneeLow.${s}`, 'Tibia', s, V(0, 0.6, 1), 0.01); // guzowatość piszczeli – podpór w klęku
    P(`calf.${s}`, 'Fibula', s, V(sx * 0.2, 0, -1));
    P(`thighBack.${s}`, 'Femur', s, V(0, 0, -1));
    P(`thighFront.${s}`, 'Femur', s, V(0, 0, 1));
    P(`ischium.${s}`, 'Hip bone', s, V(0, -1, -0.4));
    P(`asis.${s}`, 'Hip bone', s, V(0, 0.5, 1));
    P(`trochanter.${s}`, 'Femur', s, V(sx, 0.4, 0));
    P(`scap.${s}`, 'Scapula', s, V(0, 0, -1));
    P(`acromion.${s}`, 'Scapula', s, V(sx, 1, 0));
    P(`hand.${s}`, 'Third metacarpal bone', s, V(0, 0, 1));
    P(`palm.${s}`, 'Third metacarpal bone', s, V(0, 0, 1));
    P(`fingertip.${s}`, 'Distal phalanx of third finger of hand', s, V(0, -1, 0));
    P(`knuckles.${s}`, 'Proximal phalanx of third finger of hand', s, V(0, -1, 0));
    P(`elbow.${s}`, 'Ulna', s, V(0, 1, -1), 0.01);
    P(`forearm.${s}`, 'Ulna', s, V(-sx, 0, -1), 0.01);
    P(`forearmLat.${s}`, 'Ulna', s, V(sx, 0, 0), 0.01);
    P(`humerusLat.${s}`, 'Humerus', s, V(sx, 0, 0));
    P(`distForearm.${s}`, 'Radius', s, V(0, -1, 0.2));
    P(`bicGroove.${s}`, 'Humerus', s, V(sx * 0.15, 1.2, 1), 0.012);
    P(`latEpi.${s}`, 'Humerus', s, V(sx, -0.6, 0));
    P(`radStyloid.${s}`, 'Radius', s, V(sx * 0.7, -1, 0));
    P(`kneeLat.${s}`, 'Femur', s, V(sx, -0.8, 0));
    P(`kneeMed.${s}`, 'Femur', s, V(-sx, -0.8, 0));
    P(`jointMed.${s}`, 'Tibia', s, V(-sx, 0.8, 0.3), 0.01);
    P(`greaterTub.${s}`, 'Humerus', s, V(sx * 0.6, 1, 0.5), 0.01);
    P(`thumb.${s}`, 'Distal phalanx of first finger of hand', s, V(0, -1, 0));
    P(`shin.${s}`, 'Tibia', s, V(0, -0.5, 1));
    P(`ankleMed.${s}`, 'Tibia', s, V(sx * 0.4, -1, 0.2));
    // środki stawów przypięte do kości dalszej – punkty zaczepienia strzałek siły
    const jp = (name, bone, j) => { const id = kit.id(bone, s); if (id !== undefined) pt[`${name}.${s}`] = { id, p: piv[`${j}.${s}`].clone() }; };
    jp('kneeJ', 'Tibia', 'knee'); jp('elbowJ', 'Ulna', 'elbow'); jp('shoulderJ', 'Humerus', 'shoulder'); jp('hipJ', 'Femur', 'hip'); jp('wristJ', 'Third metacarpal bone', 'wrist'); jp('ankleJ', 'Talus', 'ankle');
  }
  // grubość tkanek miękkich pod punktem (m) – kość nie leży bezpośrednio na blacie / macie
  const OFF = { occiput: 0.006, sacrum: 0.015, scap: 0.012, heelBack: 0.012, calf: 0.035, thighBack: 0.045, asis: 0.02, knee: 0.008, kneeLow: 0.008, thighFront: 0.045, forearm: 0.008, forearmLat: 0.01, elbow: 0.006, palm: 0.012, toeTip: 0.006, toe: 0.006, trochanter: 0.03, humerusLat: 0.025, forehead: 0.006, sternum: 0.01, chin: 0.006, ischium: 0.03 };
  P('occiput', 'Occipital bone', '', V(0, 0.2, -1));
  P('forehead', 'Frontal bone', '', V(0, 0.3, 1));
  P('chin', 'Mandible', '', V(0, -0.4, 1));
  P('sacrum', 'Sacrum', '', V(0, 0.2, -1));
  P('sternum', 'Body of sternum', '', V(0, 0, 1));
  P('vertex', 'Parietal bone', 'l', V(0, 1, 0));
  P('t8', 'Vertebra T8', '', V(0, 0, -1));
  P('t12', 'Vertebra T12', '', V(0, 0, -1));
  P('s2', 'Sacrum', '', V(0, -0.3, -1));
  for (const [n, v] of Object.entries(pt)) { const base = n.split('.')[0]; if (OFF[base] !== undefined) v.off = OFF[base]; }
  // stopy stoją na podłodze (y = 0): grubość pod piętą / głowami kości śródstopia = wysokość punktu w spoczynku
  for (const s of ['l', 'r']) for (const n of ['heel', 'mt1', 'mt5']) if (pt[`${n}.${s}`]) pt[`${n}.${s}`].off = pt[`${n}.${s}`].p.y;
  // drzewo: segment → rodzic i staw
  const tree = { pelvis: null, trunk: 'pelvis', ...(part.head ? { head: 'trunk' } : {}) };
  for (const s of ['l', 'r']) Object.assign(tree, { [`arm.${s}`]: 'trunk', [`forearm.${s}`]: `arm.${s}`, [`hand.${s}`]: `forearm.${s}`, [`thigh.${s}`]: 'pelvis', [`shank.${s}`]: `thigh.${s}`, [`foot.${s}`]: `shank.${s}` });
  const desc = (seg) => { const out = new Set(part[seg] ?? []); for (const [c, p] of Object.entries(tree)) if (p === seg) for (const id of desc(c)) out.add(id); return out; };
  const all = new Set(Object.values(part).flatMap((x) => [...x]));
  return (kit.mo._body = { part, piv, pt, tree, desc, all });
}

// ---------- klatki → kroki rigu ----------
const SAG = ['pelvis', 'trunk', 'arm.l', 'arm.r', 'forearm.l', 'forearm.r', 'hand.l', 'hand.r', 'thigh.l', 'thigh.r', 'shank.l', 'shank.r', 'foot.l', 'foot.r'];
const UP = new Set(['pelvis', 'trunk']); // segmenty skierowane w górę (dodatni kąt = pochylenie do przodu)
/** Kąt strzałkowy segmentu w układzie ciała (radiany obrotu wokół +X) z wartości klatki, z domyślnymi zasadami. */
function worldSag(p, seg) {
  const v = p[seg];
  if (v !== undefined) return seg.startsWith('foot') ? -v * D2R : UP.has(seg) ? v * D2R : -v * D2R;
  if (seg === 'trunk') return worldSag(p, 'pelvis');
  if (seg === 'pelvis') return 0;
  if (seg.startsWith('foot')) return 0; // stopa poziomo
  if (seg.startsWith('shank')) return worldSag(p, seg.replace('shank', 'thigh'));
  if (seg.startsWith('forearm')) return worldSag(p, seg.replace('forearm', 'arm'));
  if (seg.startsWith('hand')) return worldSag(p, seg.replace('hand', 'forearm'));
  return 0; // udo i ramię zwisają pionowo
}
const PARENT = (seg) => (seg === 'trunk' ? 'pelvis' : seg.startsWith('arm') ? 'trunk' : seg.startsWith('forearm') ? seg.replace('forearm', 'arm') : seg.startsWith('hand') ? seg.replace('hand', 'forearm') : seg.startsWith('thigh') ? 'pelvis' : seg.startsWith('shank') ? seg.replace('shank', 'thigh') : seg.replace('foot', 'shank'));
const JOINT_OF = (seg) => (seg === 'trunk' ? 'L5S1' : seg.startsWith('arm') ? `shoulder.${seg.slice(-1)}` : seg.startsWith('forearm') ? `elbow.${seg.slice(-1)}` : seg.startsWith('hand') ? `wrist.${seg.slice(-1)}` : seg.startsWith('thigh') ? `hip.${seg.slice(-1)}` : seg.startsWith('shank') ? `knee.${seg.slice(-1)}` : `ankle.${seg.slice(-1)}`);

/** Zamienia opis animacji na kroki rigu (format src/rigs.js + keys/pin z src/motion.js). */
export function buildPose(kit, spec) {
  const B = bodyOf(kit), frames = spec.frames;
  const steps = [];
  const chan = (fn) => frames.map((f) => [f.t, fn(f.p)]);
  const nonzero = (keys) => keys.some(([, v]) => Math.abs(v) > 1e-6);
  const rot = (bones, pivot, axis, keys) => { if (nonzero(keys)) steps.push({ bones, pivot, axis, deg: 1, keys }); };
  const mv = (axis, keys) => { if (nonzero(keys)) steps.push({ bones: new Set(B.all), pivot: B.piv.pelvis, move: axis, keys }); };
  const X = V(1, 0, 0), Y = V(0, 1, 0), Z = V(0, 0, 1);
  // przypięcie (najbardziej zewnętrzne)
  if (spec.pin) {
    const res = (P) => ({ ...P, pts: P.pts.map((n) => B.pt[n]).filter(Boolean), ptsB: (P.ptsB ?? []).map((n) => B.pt[n]).filter(Boolean) });
    steps.push({ bones: new Set(B.all), pivot: V(0, 0, 0), pin: Array.isArray(spec.pin) ? spec.pin.map(res) : res(spec.pin) });
  }
  mv(X, chan((p) => p.x ?? 0)); mv(Y, chan((p) => p.y ?? 0)); mv(Z, chan((p) => p.z ?? 0));
  rot(new Set(B.all), B.piv.pelvis, Y, chan((p) => p.ry ?? 0));
  rot(new Set(B.all), B.piv.pelvis, Z, chan((p) => p.rz ?? 0));
  rot(new Set(B.all), B.piv.pelvis, X, chan((p) => p.rx ?? 0));
  // miednica (cały ciężar ciała obraca się wokół środka między stawami biodrowymi)
  rot(new Set(B.all), B.piv.pelvis, X, chan((p) => worldSag(p, 'pelvis') / D2R));
  rot(new Set(B.all), B.piv.pelvis, Z, chan((p) => p.pelvisZ ?? 0));
  const segJoint = (seg) => {
    const bones = B.desc(seg), piv = B.piv[JOINT_OF(seg)], s = seg.slice(-1), sx = s === 'l' ? 1 : -1;
    rot(bones, piv, X, chan((p) => (worldSag(p, seg) - worldSag(p, PARENT(seg))) / D2R));
    if (seg === 'trunk') { rot(bones, piv, Z, chan((p) => p.trunkZ ?? 0)); rot(bones, piv, Y, chan((p) => p.trunkY ?? 0)); }
    if (seg.startsWith('arm')) { rot(bones, piv, Y, chan((p) => -sx * (p[`shH.${s}`] ?? 0))); rot(bones, piv, Z, chan((p) => sx * (p[`shZ.${s}`] ?? 0))); rot(bones, piv, Y, chan((p) => -sx * (p[`shY.${s}`] ?? 0))); }
    if (seg.startsWith('thigh')) { rot(bones, piv, Z, chan((p) => sx * (p[`hipZ.${s}`] ?? 0))); rot(bones, piv, Y, chan((p) => -sx * (p[`hipY.${s}`] ?? 0))); }
    if (seg.startsWith('shank')) {
      rot(bones, piv, Z, chan((p) => sx * (p[`kneeZ.${s}`] ?? 0))); // koślawienie (−) / szpotawienie (+)
      rot(bones, piv, B.piv[`ankle.${s}`].clone().sub(piv).normalize().negate(), chan((p) => -sx * (p[`kneeY.${s}`] ?? 0))); // rotacja goleni wokół jej osi długiej
      const tk = chan((p) => p[`tib.${s}`] ?? 0); if (nonzero(tk)) steps.push({ bones, pivot: piv, move: Z, keys: tk }); // szuflada / Lachman
    }
    if (seg.startsWith('forearm')) rot(bones, piv, B.piv[`wrist.${s}`].clone().sub(piv).normalize().negate(), chan((p) => -sx * (p[`pro.${s}`] ?? 0))); // wokół osi przedramienia
    if (seg.startsWith('hand')) rot(bones, piv, Z, chan((p) => -sx * (p[`ulnar.${s}`] ?? 0)));
  };
  for (const seg of SAG) if (seg !== 'pelvis') segJoint(seg);
  if (B.part.head && B.piv.neck) rot(B.desc('head'), B.piv.neck, X, chan((p) => p.neck ?? 0));
  return steps;
}

// ---------- generatory fragmentów ----------
/** Klatki chodu (w miejscu) między t0 a t1: n kroków, z opcjonalnym przesunięciem z0→z1 i stałymi wartościami base. */
export function gait(t0, t1, n, base = {}, { z0, z1, amp = 1 } = {}) {
  const out = [];
  for (let i = 0; i <= n * 2; i++) {
    const t = t0 + ((t1 - t0) * i) / (n * 2), ph = i % 4; // 0: kontakt P, 1: podpór P / przeniesienie L, 2: kontakt L, 3: podpór L
    const L = ph === 2 || ph === 3, R = !L;
    const lead = ph % 2 === 0; // faza kontaktu – kroki rozstawione; faza środkowa – kończyna przenoszona pod tułowiem
    const p = { ...base };
    const front = lead ? 22 * amp : 5 * amp, back = lead ? -12 * amp : 0, swing = lead ? 0 : 25 * amp;
    const sw = R ? 'l' : 'r', st = R ? 'r' : 'l';
    p[`thigh.${st}`] = lead ? front : -6 * amp; p[`shank.${st}`] = lead ? front - 3 : -8 * amp;
    p[`thigh.${sw}`] = lead ? back : swing; p[`shank.${sw}`] = lead ? back - 25 * amp : swing - 55 * amp;
    p[`foot.${sw}`] = lead ? 0 : 5;
    p[`arm.${st}`] = lead ? -14 * amp : 0; p[`arm.${sw}`] = lead ? 16 * amp : 0;
    p[`forearm.${st}`] = p[`arm.${st}`] + 10; p[`forearm.${sw}`] = p[`arm.${sw}`] + 18;
    if (z0 !== undefined) p.z = z0 + ((z1 - z0) * i) / (n * 2);
    out.push({ t, p });
  }
  return out;
}

const STAND = { trunk: 0 };
const SIT = { pelvis: 8, trunk: 4, 'thigh.l': 88, 'thigh.r': 88, 'shank.l': 2, 'shank.r': 2, 'arm.l': 12, 'arm.r': 12, 'forearm.l': 70, 'forearm.r': 70 };
const SIT_LEAN = { ...SIT, pelvis: 30, trunk: 42 };
const SEAT_OFF = { pelvis: 28, trunk: 40, 'thigh.l': 70, 'thigh.r': 70, 'shank.l': -12, 'shank.r': -12, 'arm.l': 20, 'arm.r': 20, 'forearm.l': 60, 'forearm.r': 60 };
const CROSS = { 'arm.l': 25, 'arm.r': 25, 'forearm.l': 120, 'forearm.r': 120, 'shY.l': 55, 'shY.r': 55, 'shZ.l': 8, 'shZ.r': 8 }; // ręce skrzyżowane na klatce
const SQUAT = (d, lean = 0) => ({ pelvis: 10 + 25 * d + lean, trunk: 15 + 25 * d + lean, 'thigh.l': 95 * d, 'thigh.r': 95 * d, 'shank.l': -32 * d, 'shank.r': -32 * d });
const FEET = ['heel.l', 'heel.r', 'mt1.l', 'mt1.r', 'mt5.l', 'mt5.r'];
const lockFeet = { mode: 'lock', pts: ['heel.l', 'heel.r'] };
const lockOne = (s) => ({ mode: 'lock', pts: [`heel.${s}`, `mt1.${s}`] });
const floorFeet = (target) => ({ mode: 'floor', pts: FEET, target });
const BACK_PTS = ['occiput', 'scap.l', 'scap.r', 'sacrum', 'heelBack.l', 'heelBack.r', 'calf.l', 'calf.r', 'thighBack.l', 'thighBack.r'];
const FRONT_PTS = ['forehead', 'sternum', 'asis.l', 'asis.r', 'knee.l', 'knee.r', 'thighFront.l', 'thighFront.r', 'toeTip.l', 'toeTip.r'];

// ---------- biblioteka animacji (klucz → { frames, pin, props }) ----------
// floorY: wysokość podłogi w modelu (najniższy punkt pięt w spoczynku) – podawana przy budowaniu
export function library(B) {
  const floorY = 0; // podłoga; stopy mają grubość pięty w polu off
  const L = {};
  // siad → wstawanie → stanie → siad (STS, 30CST, 5xSTS)
  const sts = (arms) => [
    { t: 0, p: { ...SIT, ...arms } }, { t: 0.18, p: { ...SIT_LEAN, ...arms } }, { t: 0.3, p: { ...SEAT_OFF, ...arms } },
    { t: 0.5, p: { ...STAND, ...arms, pelvis: 2, trunk: 2 } }, { t: 0.62, p: { ...STAND, ...arms } },
    { t: 0.8, p: { ...SEAT_OFF, ...arms, pelvis: 22, trunk: 32 } }, { t: 1, p: { ...SIT, ...arms } },
  ];
  L.sts = { frames: sts({}), pin: lockFeet, props: ['chair'] };
  L.sts_cross = { frames: sts(CROSS), pin: lockFeet, props: ['chair'] };
  L.sts_error = { frames: [ // błąd: odpychanie rękami od ud / podłokietników
    { t: 0, p: { ...SIT, 'arm.l': 25, 'arm.r': 25, 'forearm.l': 80, 'forearm.r': 80 } }, { t: 0.25, p: { ...SIT_LEAN, 'arm.l': 50, 'arm.r': 50, 'forearm.l': 100, 'forearm.r': 100 } },
    { t: 0.4, p: { ...SEAT_OFF, 'arm.l': 40, 'arm.r': 40, 'forearm.l': 85, 'forearm.r': 85 } }, { t: 0.6, p: { pelvis: 12, trunk: 18 } }, { t: 1, p: { ...SIT } }], pin: lockFeet, props: ['chair'] };
  // TUG: wstań, 3 m, nawrót, powrót, siad
  const tug = [
    { t: 0, p: { ...SIT } }, { t: 0.05, p: { ...SIT_LEAN } }, { t: 0.09, p: { ...SEAT_OFF } }, { t: 0.13, p: { pelvis: 3, trunk: 4 } },
    ...gait(0.14, 0.42, 6, { trunk: 4 }, { z0: 0, z1: 2.6 }).map((f) => ({ ...f, p: { ...f.p, ry: 0 } })),
    { t: 0.44, p: { trunk: 3, z: 2.75, ry: 0 } }, { t: 0.52, p: { trunk: 3, z: 2.75, ry: 180, 'thigh.l': 18, 'shank.l': -10 } }, { t: 0.54, p: { trunk: 3, z: 2.7, ry: 180 } },
    ...gait(0.55, 0.83, 6, { trunk: 4, ry: 180 }, { z0: 2.6, z1: 0.35 }),
    { t: 0.86, p: { trunk: 3, z: 0.2, ry: 180 } }, { t: 0.92, p: { trunk: 3, z: 0, ry: 360 } }, { t: 0.95, p: { ...SEAT_OFF, ry: 360 } }, { t: 1, p: { ...SIT, ry: 360 } },
  ];
  L.tug = { frames: tug, pin: [{ until: 0.135, ...lockFeet }, { until: 0.93, ...floorFeet(floorY) }, lockFeet], props: ['chair', 'tape3'] };
  // chód na odcinku (10MWT / 6MWT): przejście 4 m tam i z powrotem
  L.gait = { frames: [...gait(0, 0.48, 8, { trunk: 3 }, { z0: -1.2, z1: 1.6 }), { t: 0.5, p: { trunk: 3, z: 1.75 } }, { t: 0.56, p: { trunk: 3, z: 1.75, ry: 180 } }, ...gait(0.57, 1, 8, { trunk: 3, ry: 180 }, { z0: 1.6, z1: -1.2 })].map((f) => ({ ...f, p: { ...f.p, ry: f.p.ry ?? 0 } })), pin: floorFeet(floorY), props: ['tape10'] };
  // schody: wejście na stopień prawą nogą, dostawienie lewej, zejście w odwrotnej kolejności
  const UPR = { trunk: 6, 'thigh.r': 58, 'shank.r': -8, 'arm.l': 10, 'arm.r': -8 };
  const PUSH_ = { trunk: 12, pelvis: 6, 'thigh.r': 22, 'shank.r': -6, 'thigh.l': -14, 'shank.l': -40, 'foot.l': -25, 'arm.l': -10, 'arm.r': 12 };
  L.stairs = { frames: [{ t: 0, p: {} }, { t: 0.25, p: UPR }, { t: 0.42, p: PUSH_ }, { t: 0.55, p: { trunk: 2 } }, { t: 0.6, p: { trunk: 2 } }, { t: 0.72, p: PUSH_ }, { t: 0.85, p: UPR }, { t: 1, p: {} }],
    pin: [{ until: 0.25, mode: 'lock', pts: ['heel.l'] }, { until: 0.85, mode: 'lock', pts: ['heel.r', 'mt1.r'], at: 0.25 }, { mode: 'lock', pts: ['heel.l'] }], props: ['stepAt'], propsAt: 0.25 };
  // sięganie w przód (Functional Reach)
  const REACH0 = { 'arm.l': 90, 'arm.r': 90 };
  L.reach = { frames: [{ t: 0, p: {} }, { t: 0.2, p: { ...REACH0 } }, { t: 0.55, p: { ...REACH0, pelvis: 8, trunk: 32, 'arm.l': 98, 'arm.r': 98, 'thigh.l': -6, 'thigh.r': -6, 'shank.l': -6, 'shank.r': -6, foot: 0 } }, { t: 0.75, p: { ...REACH0, pelvis: 8, trunk: 32, 'arm.l': 98, 'arm.r': 98, 'thigh.l': -6, 'thigh.r': -6, 'shank.l': -6, 'shank.r': -6 } }, { t: 1, p: {} }], pin: lockFeet, props: ['wall'] };
  L.reach_error = { frames: [{ t: 0, p: {} }, { t: 0.2, p: { ...REACH0 } }, { t: 0.55, p: { ...REACH0, trunk: 20, trunkY: 25, 'arm.r': 110, 'arm.l': 60, 'shZ.l': 10 } }, { t: 0.75, p: { ...REACH0, trunk: 20, trunkY: 25, 'arm.r': 110, 'arm.l': 60 } }, { t: 1, p: {} }], pin: lockFeet, props: ['wall'] };
  // stanie (Romberg) – kołysanie: małe przy oczach otwartych, większe przy zamkniętych
  const sway = []; for (let i = 0; i <= 20; i++) { const t = i / 20, a = (t < 0.5 ? 1 : 2.6) * Math.sin(i * 1.7); sway.push({ t, p: { 'shank.l': a, 'shank.r': a, 'thigh.l': a * 0.6, 'thigh.r': a * 0.6, trunk: a * 0.4, pelvis: a * 0.4, 'hipZ.l': -3, 'hipZ.r': -3 } }); }
  L.romberg = { frames: sway, pin: lockFeet, props: [] };
  // stanie jednonóż (lewa noga uniesiona)
  const SLS = { 'thigh.l': 35, 'shank.l': -55, 'arm.l': 0, 'arm.r': 0 };
  L.sls = { frames: [{ t: 0, p: {} }, { t: 0.2, p: { ...SLS, pelvisZ: 0, 'hipZ.r': 0 } }, { t: 0.8, p: { ...SLS } }, { t: 1, p: {} }], pin: lockOne('r'), props: [] };
  L.sls_error = { frames: [{ t: 0, p: {} }, { t: 0.2, p: { ...SLS } }, { t: 0.45, p: { ...SLS, pelvisZ: -9, 'hipZ.r': -9, 'hipZ.l': 9, trunkZ: 10 } }, { t: 0.8, p: { ...SLS, pelvisZ: -9, 'hipZ.r': -9, 'hipZ.l': 9, trunkZ: 10 } }, { t: 1, p: {} }], pin: lockOne('r'), props: [] };
  // przysiad jednonóż (prawa podporowa, lewa w przód)
  const SLSQ = (d) => ({ pelvis: 10 + 20 * d, trunk: 18 + 18 * d, 'thigh.r': 70 * d, 'shank.r': -28 * d, 'thigh.l': 30 + 15 * d, 'shank.l': 25 + 15 * d, 'arm.l': 60, 'arm.r': 60 });
  L.slsquat = { frames: [{ t: 0, p: SLSQ(0) }, { t: 0.45, p: SLSQ(1) }, { t: 0.6, p: SLSQ(1) }, { t: 1, p: SLSQ(0) }], pin: lockOne('r'), props: [] };
  L.slsquat_error = { frames: [{ t: 0, p: SLSQ(0) }, { t: 0.45, p: { ...SLSQ(1), 'hipZ.r': -10, 'hipY.r': 18, 'kneeZ.r': -6, pelvisZ: -7, trunkZ: 8 } }, { t: 0.6, p: { ...SLSQ(1), 'hipZ.r': -10, 'hipY.r': 18, 'kneeZ.r': -6, pelvisZ: -7, trunkZ: 8 } }, { t: 1, p: SLSQ(0) }], pin: lockOne('r'), props: [] };
  // lateral step-down: stoi na stopniu prawą, lewa opuszcza się bokiem do lekkiego dotknięcia pięty
  const SD = (d) => ({ pelvis: 6 + 10 * d, trunk: 10 + 10 * d, 'thigh.r': 50 * d, 'shank.r': -25 * d, 'thigh.l': 8, 'shank.l': 8, 'hipZ.l': 4, 'arm.l': 10, 'arm.r': 10, 'shZ.l': 20, 'shZ.r': 20 });
  L.stepdown = { frames: [{ t: 0, p: SD(0) }, { t: 0.45, p: SD(1) }, { t: 0.55, p: SD(1) }, { t: 1, p: SD(0) }], pin: { ...lockOne('r'), lift: [[0, 0.2], [1, 0.2]] }, props: ['stepUnder'] };
  L.stepdown_error = { frames: [{ t: 0, p: SD(0) }, { t: 0.45, p: { ...SD(1), 'hipZ.r': -10, 'hipY.r': 15, 'kneeZ.r': -6, pelvisZ: -8, trunkZ: 10 } }, { t: 0.55, p: { ...SD(1), 'hipZ.r': -10, 'hipY.r': 15, 'kneeZ.r': -6, pelvisZ: -8, trunkZ: 10 } }, { t: 1, p: SD(0) }], pin: { ...lockOne('r'), lift: [[0, 0.2], [1, 0.2]] }, props: ['stepUnder'] };
  // Y-Balance (prawa podporowa): sięganie lewą przód, tył-przyśrodkowo, tył-bocznie
  const YB = (dir) => {
    const base = { pelvis: 22, trunk: 30, 'thigh.r': 55, 'shank.r': -30, 'arm.l': 0, 'arm.r': 0, 'shZ.l': 25, 'shZ.r': 25 };
    if (dir === 'ant') return { ...base, pelvis: 8, trunk: 20, 'thigh.l': 55, 'shank.l': 55 };
    if (dir === 'pm') return { ...base, 'thigh.l': -25, 'shank.l': -25, 'hipZ.l': -25, 'hipY.l': 10 };
    return { ...base, 'thigh.l': -25, 'shank.l': -25, 'hipZ.l': 30 };
  };
  L.ybalance = { frames: [{ t: 0, p: {} }, { t: 0.15, p: YB('ant') }, { t: 0.28, p: {} }, { t: 0.45, p: YB('pm') }, { t: 0.6, p: {} }, { t: 0.78, p: YB('pl') }, { t: 1, p: {} }], pin: lockOne('r'), props: ['ygrid'] };
  // skoki jednonóż: przykucnięcie, lot, lądowanie i utrzymanie
  const HOP0 = { 'thigh.l': 25, 'shank.l': -60, 'arm.l': 0, 'arm.r': 0 };
  const hopFr = (n) => {
    const fr = [{ t: 0, p: { ...HOP0, z: 0 } }]; const d = 1 / n;
    for (let i = 0; i < n; i++) {
      const t0 = i * d, z0 = i * 0.55;
      fr.push({ t: t0 + d * 0.25, p: { ...HOP0, pelvis: 20, trunk: 30, 'thigh.r': 45, 'shank.r': -25, 'arm.l': -35, 'arm.r': -35, z: z0 } });
      fr.push({ t: t0 + d * 0.55, p: { ...HOP0, pelvis: 5, trunk: 8, 'thigh.r': 10, 'shank.r': -5, 'foot.r': -30, 'arm.l': 70, 'arm.r': 70, z: z0 + 0.3 } });
      fr.push({ t: t0 + d * 0.8, p: { ...HOP0, pelvis: 18, trunk: 26, 'thigh.r': 40, 'shank.r': -22, 'arm.l': 30, 'arm.r': 30, z: z0 + 0.55 } });
      fr.push({ t: t0 + d, p: { ...HOP0, z: z0 + 0.55 } });
    }
    return fr;
  };
  const lift = (n) => { const out = [[0, 0]]; const d = 1 / n; for (let i = 0; i < n; i++) out.push([i * d + d * 0.35, 0], [i * d + d * 0.55, 0.22], [i * d + d * 0.75, 0]); out.push([1, 0]); return out; };
  L.hop = { frames: hopFr(1), pin: { ...floorFeet(floorY), pts: ['heel.r', 'mt1.r', 'mt5.r', 'toe.r'], lift: lift(1) }, props: ['tape3'] };
  L.hop3 = { frames: hopFr(3), pin: { ...floorFeet(floorY), pts: ['heel.r', 'mt1.r', 'mt5.r', 'toe.r'], lift: lift(3) }, props: ['tape3'] };
  // głęboki przysiad FMS z drążkiem nad głową
  const OVER = { 'arm.l': 170, 'arm.r': 170, 'forearm.l': 170, 'forearm.r': 170, 'shZ.l': 12, 'shZ.r': 12 };
  L.deepsquat = { frames: [{ t: 0, p: { ...OVER } }, { t: 0.45, p: { ...OVER, pelvis: 30, trunk: 25, 'thigh.l': 115, 'thigh.r': 115, 'shank.l': -40, 'shank.r': -40, 'hipZ.l': 10, 'hipZ.r': 10 } }, { t: 0.6, p: { ...OVER, pelvis: 30, trunk: 25, 'thigh.l': 115, 'thigh.r': 115, 'shank.l': -40, 'shank.r': -40, 'hipZ.l': 10, 'hipZ.r': 10 } }, { t: 1, p: { ...OVER } }], pin: lockFeet, props: ['dowelHands'] };
  L.deepsquat_error = { frames: [{ t: 0, p: { ...OVER } }, { t: 0.45, p: { ...OVER, 'arm.l': 120, 'arm.r': 120, 'forearm.l': 120, 'forearm.r': 120, pelvis: 50, trunk: 60, 'thigh.l': 85, 'thigh.r': 85, 'shank.l': -25, 'shank.r': -25, 'hipZ.l': -4, 'hipZ.r': -4, 'kneeZ.l': 6, 'kneeZ.r': 6 } }, { t: 0.6, p: { ...OVER, 'arm.l': 120, 'arm.r': 120, 'forearm.l': 120, 'forearm.r': 120, pelvis: 50, trunk: 60, 'thigh.l': 85, 'thigh.r': 85, 'shank.l': -25, 'shank.r': -25, 'hipZ.l': -4, 'hipZ.r': -4, 'kneeZ.l': 6, 'kneeZ.r': 6 } }, { t: 1, p: { ...OVER } }], pin: lockFeet, props: ['dowelHands'] };
  // przejście przez płotek (FMS) – lewa przenoszona nad płotkiem
  const HS = { 'arm.l': 0, 'arm.r': 0, 'shY.l': 0 };
  L.hurdle = { frames: [{ t: 0, p: HS }, { t: 0.3, p: { ...HS, 'thigh.l': 75, 'shank.l': -15, 'foot.l': 10 } }, { t: 0.5, p: { ...HS, 'thigh.l': 40, 'shank.l': 30, 'foot.l': 0 } }, { t: 0.7, p: { ...HS, 'thigh.l': 75, 'shank.l': -15 } }, { t: 1, p: HS }], pin: lockOne('r'), props: ['hurdle'] };
  // wykrok w linii (FMS): lewa z przodu
  const LUNGE = (d) => ({ trunk: 2, 'thigh.l': 20 + 62 * d, 'shank.l': 18 - 22 * d, 'thigh.r': -15 + 2 * d, 'shank.r': -15 - 72 * d, 'foot.r': -30 * d, 'arm.l': 0, 'arm.r': 0 });
  L.lunge = { frames: [{ t: 0, p: LUNGE(0) }, { t: 0.45, p: LUNGE(1) }, { t: 0.6, p: LUNGE(1) }, { t: 1, p: LUNGE(0) }], pin: { mode: 'lock', pts: ['heel.l', 'mt1.l'] }, props: ['line'] };
  // ruchomość barków (FMS): prawa ręka od góry za głową, lewa od dołu za plecami
  L.shoulder = { frames: [{ t: 0, p: {} }, { t: 0.45, p: { 'arm.r': 170, 'forearm.r': 30, 'shY.r': -60, 'shZ.r': 10, 'arm.l': -50, 'forearm.l': 70, 'shY.l': 70, 'shZ.l': -10 } }, { t: 0.65, p: { 'arm.r': 170, 'forearm.r': 30, 'shY.r': -60, 'shZ.r': 10, 'arm.l': -50, 'forearm.l': 70, 'shY.l': 70, 'shZ.l': -10 } }, { t: 1, p: {} }], pin: lockFeet, props: [] };
  // ---- pozy leżące na kozetce ----
  // ASLR: leżenie tyłem, ręce wzdłuż tułowia, uniesienie prostej lewej kończyny
  const SUP = { rx: -90, 'arm.l': 0, 'arm.r': 0, 'foot.l': 0, 'foot.r': 0 };
  L.aslr = { frames: [{ t: 0, p: SUP }, { t: 0.45, p: { ...SUP, 'thigh.l': 75 } }, { t: 0.65, p: { ...SUP, 'thigh.l': 75 } }, { t: 1, p: SUP }], pin: { mode: 'floor', pts: BACK_PTS, target: COUCH_TOP }, props: ['couch'] };
  L.aslr_error = { frames: [{ t: 0, p: SUP }, { t: 0.45, p: { ...SUP, 'thigh.l': 70, 'shank.l': 50, 'thigh.r': 15, 'shank.r': 15, pelvis: -8 } }, { t: 0.65, p: { ...SUP, 'thigh.l': 70, 'shank.l': 50, 'thigh.r': 15, 'shank.r': 15, pelvis: -8 } }, { t: 1, p: SUP }], pin: { mode: 'floor', pts: BACK_PTS, target: COUCH_TOP }, props: ['couch'] };
  // Biering-Sørensen: leżenie przodem, miednica na krawędzi kozetki, tułów poza nią (utrzymanie poziomu), ręce skrzyżowane
  const PRONE_LEGS = ['asis.l', 'asis.r', 'knee.l', 'knee.r', 'thighFront.l', 'thighFront.r', 'toeTip.l', 'toeTip.r'];
  const SOR = { rx: 90, ...CROSS, 'foot.l': -40, 'foot.r': -40 };
  L.sorensen = { frames: [{ t: 0, p: { ...SOR, trunk: 45 } }, { t: 0.35, p: { ...SOR, trunk: 0 } }, { t: 0.85, p: { ...SOR, trunk: 0 } }, { t: 1, p: { ...SOR, trunk: 45 } }], pin: { mode: 'floor', pts: PRONE_LEGS, target: COUCH_TOP }, props: ['couchSorensen'] };
  L.sorensen_error = { frames: [{ t: 0, p: { ...SOR, trunk: 0 } }, { t: 0.4, p: { ...SOR, trunk: -22 } }, { t: 0.8, p: { ...SOR, trunk: 22 } }, { t: 1, p: { ...SOR, trunk: 0 } }], pin: { mode: 'floor', pts: PRONE_LEGS, target: COUCH_TOP }, props: ['couchSorensen'] };
  // ---- pozy podporowe na macie ----
  // podpór bokiem McGilla (na prawym przedramieniu). W układzie ciała (przed obrotem rz) mata jest po prawej stronie:
  // ramię prawe odwiedzone ok. 90° (łokieć pod barkiem), przedramię w przód; lewa ręka na prawym barku.
  // Start: biodro na macie (tułów zgięty bocznie), potem miednica unosi się do linii bark–stopy.
  const SIDE = (lift) => ({ rz: 90, 'shZ.r': 85 + 5 * lift, 'forearm.r': 90, 'arm.l': 25, 'forearm.l': 120, 'shY.l': 55, 'thigh.l': 8, 'thigh.r': -2, trunkZ: -24 * (1 - lift) });
  const FOREARM = ['forearm.r', 'forearmLat.r', 'elbow.r'], FOOT_R = ['mt5.r', 'heel.r'];
  const sb = (pts) => ({ mode: 'support', axis: 'z', pts: FOREARM, ptsB: pts, target: MAT_TOP });
  L.sidebridge = { frames: [{ t: 0, p: SIDE(0) }, { t: 0.35, p: SIDE(1) }, { t: 0.85, p: SIDE(1) }, { t: 1, p: SIDE(0) }], pin: sb(FOOT_R), props: ['mat'] };
  const SAG_ = { ...SIDE(1), trunkZ: -12, 'hipZ.l': 8, 'hipZ.r': -8, 'thigh.l': 25, 'thigh.r': 20, trunk: 8 };
  L.sidebridge_error = { frames: [{ t: 0, p: SIDE(1) }, { t: 0.4, p: SAG_ }, { t: 0.8, p: SAG_ }, { t: 1, p: SIDE(1) }], pin: sb(FOOT_R), props: ['mat'] };
  // pompka stabilizacyjna FMS: leżenie przodem, ramiona odwiedzone i zrotowane zewnętrznie (dłonie przy czole),
  // wypchnięcie ciała jako całości do podporu na dłoniach i palcach stóp
  const PRONE = (h) => ({ rx: 90, 'shH.l': 60 * (1 - h), 'shH.r': 60 * (1 - h), 'shZ.l': 88 * (1 - h), 'shZ.r': 88 * (1 - h), 'shY.l': -90 * (1 - h), 'shY.r': -90 * (1 - h), 'arm.l': 125 * h, 'arm.r': 125 * h, 'forearm.l': 90 * (1 - h) + 125 * h, 'forearm.r': 90 * (1 - h) + 125 * h, ...(h > 0 ? { 'hand.l': 90 * (1 - h) + 180 * h, 'hand.r': 90 * (1 - h) + 180 * h } : {}), 'foot.l': -12, 'foot.r': -12 });
  const PALMS = ['palm.l', 'palm.r'], TOES = ['toeTip.l', 'toeTip.r', 'mt1.l', 'mt1.r'];
  const pu = { mode: 'support', axis: 'x', pts: PALMS, ptsB: TOES, target: MAT_TOP };
  L.pushup = { frames: [{ t: 0, p: PRONE(0) }, { t: 0.4, p: PRONE(1) }, { t: 0.6, p: PRONE(1) }, { t: 1, p: PRONE(0) }], pin: [{ until: 0.12, mode: 'floor', pts: [...PALMS, ...TOES, ...FRONT_PTS], target: MAT_TOP }, { until: 0.9, ...pu }, { mode: 'floor', pts: [...PALMS, ...TOES, ...FRONT_PTS], target: MAT_TOP }], props: ['mat'] };
  L.pushup_error = { frames: [{ t: 0, p: PRONE(0) }, { t: 0.4, p: { ...PRONE(1), trunk: -16, pelvis: -4 } }, { t: 0.6, p: { ...PRONE(1), trunk: -16, pelvis: -4 } }, { t: 1, p: PRONE(0) }], pin: [{ until: 0.12, mode: 'floor', pts: [...PALMS, ...TOES, ...FRONT_PTS], target: MAT_TOP }, { until: 0.9, ...pu }, { mode: 'floor', pts: [...PALMS, ...TOES, ...FRONT_PTS], target: MAT_TOP }], props: ['mat'] };
  // stabilność rotacyjna FMS: klęk podparty (barki i biodra ok. 90°), wyprost przeciwnej ręki i nogi, potem łokieć do kolana
  // w układzie ciała obróconego przodem w dół: arm 90 = ramię pionowo w dół, thigh 90 = udo pionowo w dół, shank 0 = goleń na macie
  const QUAD = { rx: 90, 'arm.l': 90, 'arm.r': 90, 'hand.l': 180, 'hand.r': 180, 'thigh.l': 90, 'thigh.r': 90, 'shank.l': 0, 'shank.r': 0, 'foot.l': -90, 'foot.r': -90 };
  const BIRD = { ...QUAD, 'arm.r': 180, 'hand.r': 180, 'thigh.l': 0, 'foot.l': -20 };
  const TUCK = { ...QUAD, 'arm.r': 120, 'forearm.r': 30, 'hand.r': 30, 'thigh.l': 125, 'shank.l': 35, trunk: 10 };
  const rq = { mode: 'support', axis: 'x', pts: ['palm.l', 'palm.r'], ptsB: ['kneeLow.l', 'kneeLow.r', 'knee.l', 'knee.r'], target: MAT_TOP };
  L.rotary = { frames: [{ t: 0, p: QUAD }, { t: 0.35, p: BIRD }, { t: 0.5, p: BIRD }, { t: 0.72, p: TUCK }, { t: 1, p: QUAD }], pin: rq, props: ['mat'] };
  L.rotary_error = { frames: [{ t: 0, p: QUAD }, { t: 0.4, p: { ...BIRD, trunkY: 16, pelvisZ: 8, trunk: -10 } }, { t: 0.6, p: { ...BIRD, trunkY: 16, pelvisZ: 8, trunk: -10 } }, { t: 1, p: QUAD }], pin: rq, props: ['mat'] };
  // test 4 kwadratów: kroki przód, bok, tył, bok
  L.foursquare = { frames: [{ t: 0, p: {} }, { t: 0.12, p: { 'thigh.l': 30, 'shank.l': -30 } }, { t: 0.22, p: { z: 0.35 } }, { t: 0.34, p: { z: 0.35, 'thigh.r': 30, 'shank.r': -30, 'hipZ.r': 15 } }, { t: 0.45, p: { z: 0.35, x: -0.35 } }, { t: 0.57, p: { z: 0.35, x: -0.35, 'thigh.r': -20, 'shank.r': -50 } }, { t: 0.68, p: { z: 0, x: -0.35 } }, { t: 0.8, p: { z: 0, x: -0.35, 'thigh.l': 25, 'shank.l': -30, 'hipZ.l': 15 } }, { t: 1, p: { x: 0, z: 0 } }], pin: floorFeet(floorY), props: ['foursquare'] };

  // ===================== TESTY KLINICZNE (z zajęć) =====================
  // Badana strona: prawa. Badający nie jest modelowany – jego ręce zastępują strzałki: pomarańczowa – ruch bierny / opór,
  // niebieska – stabilizacja. Czerwony pulsujący punkt – typowe miejsce bólu przy wyniku dodatnim.
  const STAB = '#4c9dff';
  const hold = (a, b, t1 = 0.4, t2 = 0.7) => [{ t: 0, p: a }, { t: t1, p: b }, { t: t2, p: b }, { t: 1, p: a }];
  const SUPINE = { mode: 'floor', pts: BACK_PTS, target: COUCH_TOP };
  const PRONE_PTS = ['forehead', 'sternum', 'asis.l', 'asis.r', 'knee.l', 'knee.r', 'thighFront.l', 'thighFront.r'];
  const PRONE_PIN = { mode: 'support', axis: 'x', pts: ['sternum', 'forehead'], ptsB: ['asis.l', 'asis.r', 'knee.l', 'knee.r', 'thighFront.l', 'thighFront.r'], target: COUCH_TOP };
  const PR = { rx: 90, 'foot.l': -45, 'foot.r': -45 }; // leżenie przodem, stopy w zgięciu podeszwowym
  const SU = { ...SUP }; // leżenie tyłem
  // --- kończyna górna (stanie) ---
  L.neer = { frames: hold({}, { 'arm.r': 165, 'shY.r': 55, 'pro.r': 70, 'shH.r': 10 }, 0.45, 0.7), pin: lockFeet, props: [],
    arrows: [{ pt: 'elbowJ.r', dirB: [0, 0, 1], from: 0.05, to: 0.45 }, { pt: 'acromion.r', dir: [0, -1, 0], color: STAB }], marks: [{ pt: 'greaterTub.r', from: 0.4, to: 0.72 }] };
  const HK = { 'arm.r': 90, 'forearm.r': 180, 'shH.r': 15 };
  L.hawkins = { frames: [{ t: 0, p: { ...HK, 'shY.r': 20 } }, { t: 0.2, p: { ...HK, 'shY.r': 20 } }, { t: 0.5, p: { ...HK, 'shY.r': 125 } }, { t: 0.72, p: { ...HK, 'shY.r': 125 } }, { t: 1, p: { ...HK, 'shY.r': 20 } }], pin: lockFeet, props: [],
    arrows: [{ pt: 'distForearm.r', dirB: [0, 0, 1], from: 0.2, to: 0.5 }, { pt: 'elbowJ.r', dir: [0, 1, 0], color: STAB }], marks: [{ pt: 'greaterTub.r', from: 0.45, to: 0.75 }] };
  const PH = (d) => { const o = {}; for (const sd of ['l', 'r']) Object.assign(o, { [`arm.${sd}`]: 40, [`shZ.${sd}`]: 15, [`shY.${sd}`]: 84, [`forearm.${sd}`]: 130, [`pro.${sd}`]: 165, [`hand.${sd}`]: 130 + 88 * d }); return o; };
  L.phalen = { frames: hold(PH(0), PH(1), 0.3, 0.85), pin: lockFeet, props: [], marks: [{ pt: 'palm.r', from: 0.45, to: 0.85 }, { pt: 'palm.l', from: 0.45, to: 0.85 }] };
  const FK = { 'forearm.r': 90, 'pro.r': 90, 'arm.r': 5 };
  L.finkelstein = { frames: hold({ ...FK }, { ...FK, 'ulnar.r': 32 }, 0.45, 0.72), pin: lockFeet, props: [],
    arrows: [{ pt: 'hand.r', dir: [0, -1, 0], from: 0.15, to: 0.45 }, { pt: 'distForearm.r', dir: [0, 1, 0], color: STAB, from: 0.1, to: 0.8 }], marks: [{ pt: 'radStyloid.r', from: 0.42, to: 0.75 }] };
  const CZ = { 'arm.r': 10, 'forearm.r': 95, 'pro.r': 170 };
  L.cozen = { frames: hold({ ...CZ, 'hand.r': 95 }, { ...CZ, 'hand.r': 60 }, 0.35, 0.75), pin: lockFeet, props: [],
    arrows: [{ pt: 'hand.r', dir: [0, -1, 0], from: 0.3, to: 0.78 }, { pt: 'latEpi.r', dirB: [-1, 0, 0], color: STAB }], marks: [{ pt: 'latEpi.r', from: 0.38, to: 0.78 }] };
  const JB = (sd) => ({ [`shZ.${sd}`]: 88, [`shH.${sd}`]: 30, [`shY.${sd}`]: 45, [`pro.${sd}`]: 90 });
  L.jobe = { frames: hold({}, { ...JB('l'), ...JB('r') }, 0.3, 0.85), pin: lockFeet, props: [],
    arrows: [{ pt: 'distForearm.r', dir: [0, -1, 0], from: 0.35, to: 0.85 }, { pt: 'distForearm.l', dir: [0, -1, 0], from: 0.35, to: 0.85 }], marks: [{ pt: 'greaterTub.r', from: 0.4, to: 0.85 }] };
  const GB = { 'arm.r': -25, 'shY.r': 80, 'forearm.r': 55, 'shZ.r': 10 };
  L.gerber = { frames: [{ t: 0, p: {} }, { t: 0.25, p: GB }, { t: 0.4, p: GB }, { t: 0.6, p: { ...GB, 'arm.r': -45, 'forearm.r': 40 } }, { t: 0.8, p: { ...GB, 'arm.r': -45, 'forearm.r': 40 } }, { t: 1, p: {} }], pin: lockFeet, props: [],
    arrows: [{ pt: 'palm.r', dir: [0, 0, 1], from: 0.55, to: 0.82 }] };
  L.gerber_error = { frames: [{ t: 0, p: {} }, { t: 0.25, p: GB }, { t: 0.4, p: GB }, { t: 0.6, p: { ...GB, 'arm.r': -28 } }, { t: 0.8, p: { ...GB, 'arm.r': -27 } }, { t: 1, p: {} }], pin: lockFeet, props: [] };
  L.speed = { frames: hold({}, { 'arm.r': 60, 'forearm.r': 65 }, 0.3, 0.8), pin: lockFeet, props: [],
    arrows: [{ pt: 'distForearm.r', dir: [0, -1, 0], from: 0.32, to: 0.8 }], marks: [{ pt: 'bicGroove.r', from: 0.35, to: 0.8 }] };
  const YG = { 'forearm.r': 90, 'arm.r': 0 };
  L.yergason = { frames: hold({ ...YG, 'pro.r': 80 }, { ...YG, 'pro.r': -15, 'shY.r': -20 }, 0.45, 0.75), pin: lockFeet, props: [],
    arrows: [{ pt: 'distForearm.r', dirB: [1, 0, 0], from: 0.1, to: 0.75 }, { pt: 'elbowJ.r', dir: [0, -1, 0], color: STAB, from: 0.1, to: 0.75 }], marks: [{ pt: 'bicGroove.r', from: 0.4, to: 0.78 }] };
  const SCR1 = { 'arm.r': 170, 'forearm.r': 30, 'shY.r': -60, 'shZ.r': 10, 'arm.l': -50, 'forearm.l': 70, 'shY.l': 70, 'shZ.l': -10 };
  const SCR2 = { 'arm.l': 170, 'forearm.l': 30, 'shY.l': -60, 'shZ.l': 10, 'arm.r': -50, 'forearm.r': 70, 'shY.r': 70, 'shZ.r': -10 };
  L.apley_scratch = { frames: [{ t: 0, p: {} }, { t: 0.22, p: SCR1 }, { t: 0.4, p: SCR1 }, { t: 0.5, p: {} }, { t: 0.72, p: SCR2 }, { t: 0.9, p: SCR2 }, { t: 1, p: {} }], pin: lockFeet, props: [] };
  const SCR1E = { ...SCR1, 'arm.r': 140, 'forearm.r': 70, 'shY.r': -30, 'arm.l': -30, 'forearm.l': 40, 'shY.l': 45 };
  L.apley_scratch_error = { frames: [{ t: 0, p: {} }, { t: 0.22, p: SCR1E }, { t: 0.4, p: SCR1E }, { t: 0.5, p: {} }, { t: 0.72, p: SCR2 }, { t: 0.9, p: SCR2 }, { t: 1, p: {} }], pin: lockFeet, props: [] };
  // test obawy (Fairbank): leżenie tyłem, odwiedzenie 90°, łokieć 90°, rotacja zewnętrzna
  const FB = (er) => ({ ...SU, 'shZ.r': 88, 'forearm.r': 90, 'shY.r': -er });
  L.fairbank = { frames: hold(FB(0), FB(85), 0.45, 0.75), pin: SUPINE, props: ['couch'],
    arrows: [{ pt: 'distForearm.r', dirB: [-1, 0, 0], from: 0.05, to: 0.45 }], marks: [{ pt: 'greaterTub.r', from: 0.45, to: 0.78 }] };
  // --- kręgosłup i tułów ---
  const SLR = (h) => ({ ...SU, 'thigh.r': h, 'foot.r': h });
  L.slr = { frames: hold(SLR(0), SLR(70), 0.5, 0.75), pin: SUPINE, props: ['couch'],
    arrows: [{ pt: 'heelBack.r', dirB: [0, 0, 1], from: 0.05, to: 0.5 }, { pt: 'knee.r', dirB: [0, 0, -1], color: STAB, from: 0.05, to: 0.75 }], marks: [{ pt: 'thighBack.r', from: 0.3, to: 0.75 }, { pt: 'calf.r', from: 0.4, to: 0.75 }] };
  L.bragard = { frames: [{ t: 0, p: SLR(0) }, { t: 0.3, p: SLR(65) }, { t: 0.45, p: SLR(55) }, { t: 0.6, p: { ...SLR(55), 'foot.r': 55 + 22 } }, { t: 0.8, p: { ...SLR(55), 'foot.r': 55 + 22 } }, { t: 1, p: SLR(0) }], pin: SUPINE, props: ['couch'],
    arrows: [{ pt: 'toe.r', dirB: [0, 1, 0], from: 0.45, to: 0.8 }], marks: [{ pt: 'calf.r', from: 0.6, to: 0.82 }, { pt: 'thighBack.r', from: 0.25, to: 0.32 }] };
  // Slump: siad na brzegu kozetki, ręce za plecami
  const SL = { pelvis: 0, trunk: 0, 'thigh.l': 90, 'thigh.r': 90, 'shank.l': 0, 'shank.r': 0, 'foot.l': -10, 'foot.r': -10, 'arm.l': -25, 'arm.r': -25, 'shY.l': 60, 'shY.r': 60, 'forearm.l': 45, 'forearm.r': 45 };
  const SL1 = { ...SL, pelvis: -12, trunk: 32 }, SL2 = { ...SL1, neck: 40 }, SL3 = { ...SL2, 'shank.r': 80, 'foot.r': 80 }, SL4 = { ...SL3, 'foot.r': 100 }, SL5 = { ...SL4, neck: 0 };
  L.slump = { frames: [{ t: 0, p: SL }, { t: 0.14, p: SL1 }, { t: 0.28, p: SL2 }, { t: 0.45, p: SL3 }, { t: 0.58, p: SL4 }, { t: 0.74, p: SL5 }, { t: 0.86, p: SL5 }, { t: 1, p: SL }], pin: { mode: 'floor', pts: ['ischium.l', 'ischium.r', 'thighBack.l', 'thighBack.r'], target: COUCH_TOP }, props: ['couchSit'],
    arrows: [{ pt: 't8', dir: [0, -0.6, 0.8], color: STAB, from: 0.1, to: 0.9 }, { pt: 'vertex', dirB: [0, -0.3, 1], from: 0.16, to: 0.7 }], marks: [{ pt: 'thighBack.r', from: 0.5, to: 0.72 }, { pt: 'calf.r', from: 0.52, to: 0.72 }] };
  // FABER (Patrick): stopa na przeciwległym kolanie, docisk kolana ku kozetce
  const FA = (d) => ({ ...SU, 'thigh.r': 50, 'shank.r': -45, 'hipZ.r': 30 + 22 * d, 'hipY.r': -35 - 15 * d, 'foot.r': -45 });
  L.faber = { frames: hold(FA(0), FA(1), 0.4, 0.75), pin: SUPINE, props: ['couch'],
    arrows: [{ pt: 'knee.r', dirB: [1, 0, 0], from: 0.2, to: 0.75 }, { pt: 'asis.l', dir: [0, -1, 0], color: STAB, from: 0.1, to: 0.8 }], marks: [{ pt: 'hipJ.r', from: 0.4, to: 0.78 }, { pt: 'sacrum', from: 0.4, to: 0.78 }] };
  L.faber_error = { frames: hold(FA(0), { ...FA(0), 'hipZ.r': 34, 'hipY.r': -38 }, 0.4, 0.75), pin: SUPINE, props: ['couch'], marks: [{ pt: 'hipJ.r', from: 0.4, to: 0.78 }] };
  const FD = (d) => ({ ...SU, 'thigh.r': 92, 'shank.r': 2, 'foot.r': 2, 'hipZ.r': -18 * d, 'hipY.r': 32 * d });
  L.faddir = { frames: [{ t: 0, p: SU }, { t: 0.25, p: FD(0) }, { t: 0.5, p: FD(1) }, { t: 0.75, p: FD(1) }, { t: 1, p: SU }], pin: SUPINE, props: ['couch'],
    arrows: [{ pt: 'knee.r', dirB: [0, 0, 1], from: 0.05, to: 0.25 }, { pt: 'ankleMed.r', dirB: [-1, 0, 0], from: 0.28, to: 0.5 }], marks: [{ pt: 'hipJ.r', from: 0.48, to: 0.78 }] };
  // palce–podłoga
  const FF = (d) => ({ pelvis: 75 * d, trunk: 128 * d, neck: 15 * d, 'arm.l': 0, 'arm.r': 0 });
  L.fingerfloor = { frames: hold(FF(0), FF(1), 0.45, 0.75), pin: lockFeet, props: ['mat'] };
  L.fingerfloor_error = { frames: hold(FF(0), { pelvis: 35, trunk: 80, neck: 10 }, 0.45, 0.75), pin: lockFeet, props: ['mat'], marks: [{ pt: 'thighBack.r', from: 0.4, to: 0.75 }] };
  // trójfazowy test Mennella: leżenie przodem, bierny wyprost prawego biodra, trzy miejsca stabilizacji
  const MN = { ...PR, 'arm.l': 0, 'arm.r': 0 }, MX = { ...MN, 'thigh.r': -18, 'hipY.r': 8 };
  L.mennell = { frames: [{ t: 0, p: MN }, { t: 0.15, p: MX }, { t: 0.28, p: MN }, { t: 0.48, p: MX }, { t: 0.61, p: MN }, { t: 0.81, p: MX }, { t: 1, p: MN }], pin: { mode: 'floor', pts: [...PRONE_PTS, 'toeTip.l', 'toeTip.r'], target: COUCH_TOP }, props: ['couch'],
    arrows: [{ pt: 'ischium.r', dir: [0, -0.7, 0.7], color: STAB, from: 0, to: 0.3 }, { pt: 's2', dir: [0, -0.7, 0.7], color: STAB, from: 0.33, to: 0.63 }, { pt: 't12', dir: [0, -0.7, 0.7], color: STAB, from: 0.66, to: 1 },
      { pt: 'kneeLow.r', dir: [0, 1, 0], from: 0.03, to: 0.15 }, { pt: 'kneeLow.r', dir: [0, 1, 0], from: 0.36, to: 0.48 }, { pt: 'kneeLow.r', dir: [0, 1, 0], from: 0.69, to: 0.81 }],
    marks: [{ pt: 'hipJ.r', from: 0.1, to: 0.28 }, { pt: 'sacrum', from: 0.43, to: 0.61 }, { pt: 't12', from: 0.76, to: 0.95 }] };
  // ślizg kończyn górnych przy ścianie w siadzie
  const WA0 = { pelvis: -5, trunk: -3, 'thigh.l': 130, 'thigh.r': 130, 'shank.l': 50, 'shank.r': 50, 'foot.l': 20, 'foot.r': 20 };
  const WAW = (d) => { const o = { ...WA0 }; for (const sd of ['l', 'r']) Object.assign(o, { [`shZ.${sd}`]: 85 + 75 * d, [`shY.${sd}`]: -90 * (1 - d), [`forearm.${sd}`]: 90 * (1 - d) }); return o; };
  const WAPIN = { mode: 'support', axis: 'x', pts: ['ischium.l', 'ischium.r'], ptsB: ['heel.l', 'heel.r'], target: 0 };
  L.wallangel = { frames: [{ t: 0, p: WAW(0) }, { t: 0.35, p: WAW(1) }, { t: 0.5, p: WAW(1) }, { t: 0.85, p: WAW(0) }, { t: 1, p: WAW(0) }], pin: WAPIN, props: ['wallBack'] };
  const WAE = (d) => ({ ...WAW(d * 0.7), 'arm.l': 25, 'arm.r': 25, trunk: -10, neck: -10 });
  L.wallangel_error = { frames: [{ t: 0, p: WAE(0) }, { t: 0.35, p: WAE(1) }, { t: 0.5, p: WAE(1) }, { t: 0.85, p: WAE(0) }, { t: 1, p: WAE(0) }], pin: WAPIN, props: ['wallBack'] };
  // --- kończyna dolna ---
  const LA = (t) => ({ ...SU, 'thigh.r': 22, 'shank.r': -3, 'foot.r': -3, 'tib.r': t });
  L.lachman = { frames: [{ t: 0, p: SU }, { t: 0.25, p: LA(0) }, { t: 0.45, p: LA(0.006) }, { t: 0.6, p: LA(0) }, { t: 0.75, p: LA(0.006) }, { t: 0.88, p: LA(0) }, { t: 1, p: SU }], pin: SUPINE, props: ['couch'],
    arrows: [{ pt: 'shin.r', dirB: [0, 0, 1], from: 0.3, to: 0.85 }, { pt: 'thighFront.r', dirB: [0, 0, -1], color: STAB, from: 0.25, to: 0.88 }] };
  L.lachman_error = { ...L.lachman, frames: [{ t: 0, p: SU }, { t: 0.25, p: LA(0) }, { t: 0.45, p: LA(0.02) }, { t: 0.6, p: LA(0) }, { t: 0.75, p: LA(0.02) }, { t: 0.88, p: LA(0) }, { t: 1, p: SU }] };
  const DR = (t) => ({ ...SU, 'thigh.r': 42, 'shank.r': -54, 'foot.r': -90, 'tib.r': t });
  const drawer = (amp) => [{ t: 0, p: SU }, { t: 0.25, p: DR(0) }, { t: 0.45, p: DR(amp) }, { t: 0.6, p: DR(0) }, { t: 0.75, p: DR(amp) }, { t: 0.88, p: DR(0) }, { t: 1, p: SU }];
  L.drawer_ant = { frames: drawer(0.005), pin: SUPINE, props: ['couch'], arrows: [{ pt: 'shin.r', dirB: [0, 0, 1], from: 0.3, to: 0.85 }, { pt: 'toe.r', dir: [0, -1, 0], color: STAB, from: 0.25, to: 0.88 }] };
  L.drawer_ant_error = { ...L.drawer_ant, frames: drawer(0.018) };
  L.drawer_post = { frames: drawer(-0.004), pin: SUPINE, props: ['couch'], arrows: [{ pt: 'shin.r', dirB: [0, 0, -1], from: 0.3, to: 0.85, gap: 0.005 }, { pt: 'toe.r', dir: [0, -1, 0], color: STAB, from: 0.25, to: 0.88 }] };
  L.drawer_post_error = { ...L.drawer_post, frames: drawer(-0.016) };
  const VV = (z) => ({ ...SU, 'thigh.r': 18, 'shank.r': -6, 'foot.r': -6, 'kneeZ.r': z });
  const vv = (a) => [{ t: 0, p: SU }, { t: 0.15, p: VV(0) }, { t: 0.32, p: VV(-a) }, { t: 0.45, p: VV(0) }, { t: 0.62, p: VV(a) }, { t: 0.75, p: VV(0) }, { t: 1, p: SU }];
  L.valgus = { frames: vv(2.5), pin: SUPINE, props: ['couch'],
    arrows: [{ pt: 'kneeLat.r', dirB: [1, 0, 0], color: STAB, from: 0.15, to: 0.45 }, { pt: 'ankleMed.r', dirB: [-1, 0, 0], from: 0.15, to: 0.45 }, { pt: 'kneeMed.r', dirB: [-1, 0, 0], color: STAB, from: 0.46, to: 0.75 }, { pt: 'ankleMed.r', dirB: [1, 0, 0], from: 0.46, to: 0.75, gap: 0.06 }],
    marks: [{ pt: 'kneeMed.r', from: 0.28, to: 0.45 }, { pt: 'kneeLat.r', from: 0.58, to: 0.75 }] };
  L.valgus_error = { ...L.valgus, frames: vv(9) };
  const MC = (flex, rot, z) => ({ ...SU, 'thigh.r': 95, 'shank.r': 95 - flex, 'foot.r': 95 - flex, 'kneeY.r': rot, 'kneeZ.r': z });
  L.mcmurray = { frames: [{ t: 0, p: SU }, { t: 0.15, p: MC(135, 0, 0) }, { t: 0.25, p: MC(135, -25, -4) }, { t: 0.45, p: MC(90, -25, -4) }, { t: 0.55, p: MC(135, 0, 0) }, { t: 0.65, p: MC(135, 25, 4) }, { t: 0.85, p: MC(90, 25, 4) }, { t: 1, p: SU }], pin: SUPINE, props: ['couch'],
    arrows: [{ pt: 'jointMed.r', dir: [0, 1, 0], color: STAB, from: 0.15, to: 0.9, len: 0.1 }, { pt: 'heelBack.r', dirB: [-1, 0, 0], from: 0.2, to: 0.45 }, { pt: 'heelBack.r', dirB: [1, 0, 0], from: 0.6, to: 0.85 }],
    marks: [{ pt: 'jointMed.r', from: 0.35, to: 0.47 }, { pt: 'kneeLat.r', from: 0.75, to: 0.87 }] };
  const AP = (rot) => ({ ...PR, 'arm.l': 0, 'arm.r': 0, 'shank.r': -90, 'foot.r': -90, 'kneeY.r': rot });
  L.apley_knee = { frames: [{ t: 0, p: PR }, { t: 0.12, p: AP(0) }, { t: 0.25, p: AP(25) }, { t: 0.35, p: AP(-25) }, { t: 0.45, p: AP(0) }, { t: 0.6, p: AP(25) }, { t: 0.72, p: AP(-25) }, { t: 0.85, p: AP(0) }, { t: 1, p: PR }], pin: PRONE_PIN, props: ['couch'],
    arrows: [{ pt: 'heelBack.r', dirB: [0, 1, 0], from: 0.12, to: 0.47 }, { pt: 'ankleMed.r', dirB: [0, -1, 0], from: 0.5, to: 0.86, color: '#c084fc' }, { pt: 'thighBack.r', dir: [0, -1, 0], color: STAB, from: 0.1, to: 0.9 }],
    marks: [{ pt: 'jointMed.r', from: 0.2, to: 0.45 }] };
  // Ober: leżenie na lewym boku, prawa kończyna odwiedziona i wyprostowana, potem opada do przywiedzenia
  const OB = (abd) => ({ rz: -90, 'thigh.l': 45, 'shank.l': -45, 'arm.l': 90, 'forearm.l': 150, 'arm.r': 0, 'thigh.r': -10, 'hipZ.r': abd });
  const OBPIN = { mode: 'floor', pts: ['trochanter.l', 'humerusLat.l', 'kneeLat.l'], target: COUCH_TOP };
  L.ober = { frames: [{ t: 0, p: OB(0) }, { t: 0.3, p: OB(32) }, { t: 0.4, p: OB(32) }, { t: 0.7, p: OB(-12) }, { t: 0.85, p: OB(-12) }, { t: 1, p: OB(0) }], pin: OBPIN, props: ['couch'],
    arrows: [{ pt: 'ankleMed.r', dirB: [1, 0, 0], from: 0.05, to: 0.3 }, { pt: 'asis.r', dir: [0, -1, 0], color: STAB, from: 0.05, to: 0.9 }] };
  L.ober_error = { ...L.ober, frames: [{ t: 0, p: OB(0) }, { t: 0.3, p: OB(32) }, { t: 0.4, p: OB(32) }, { t: 0.7, p: OB(18) }, { t: 0.85, p: OB(18) }, { t: 1, p: OB(0) }], marks: [{ pt: 'kneeLat.r', from: 0.6, to: 0.9 }] };
  // Thomas: przyciągnięcie prawego kolana do klatki, obserwacja lewej kończyny
  const TH = (d) => ({ ...SU, 'thigh.r': 125 * d, 'shank.r': 125 * d - 135 * d, 'foot.r': -10 * d, 'arm.l': 32 * d, 'arm.r': 32 * d, 'forearm.l': 52 * d, 'forearm.r': 52 * d, 'shH.l': 45 * d, 'shH.r': 22 * d });
  L.thomas = { frames: hold(TH(0), TH(1), 0.4, 0.8), pin: SUPINE, props: ['couch'] };
  L.thomas_error = { frames: hold(TH(0), { ...TH(1), 'thigh.l': 18, 'shank.l': 10, 'foot.l': 10 }, 0.4, 0.8), pin: SUPINE, props: ['couch'], marks: [{ pt: 'hipJ.l', from: 0.4, to: 0.82 }] };
  // Kendall: leżenie tyłem na brzegu kozetki, podudzia zwisają; obserwacja lewej kończyny
  const KD = { ...SU, 'shank.l': -90, 'shank.r': -90, 'foot.l': -90, 'foot.r': -90 };
  const KD1 = { ...KD, 'thigh.r': 125, 'shank.r': -10, 'foot.r': -10, 'arm.l': 32, 'arm.r': 32, 'forearm.l': 52, 'forearm.r': 52, 'shH.l': 45, 'shH.r': 22 };
  const KPIN = { mode: 'floor', pts: ['occiput', 'scap.l', 'scap.r', 'sacrum', 'thighBack.l'], target: COUCH_TOP };
  L.kendall = { frames: hold(KD, KD1, 0.4, 0.8), pin: KPIN, props: ['couchKnee'] };
  L.kendall_error = { frames: hold(KD, { ...KD1, 'thigh.l': 10, 'shank.l': -45, 'foot.l': -45 }, 0.4, 0.8), pin: KPIN, props: ['couchKnee'], marks: [{ pt: 'thighFront.l', from: 0.4, to: 0.82 }] };
  // rotacja wewnętrzna bioder w leżeniu przodem (kolana zgięte 90°, podudzia opadają na zewnątrz)
  const IR = (r, l) => ({ ...PR, 'arm.l': 0, 'arm.r': 0, 'shank.l': -90, 'shank.r': -90, 'foot.l': -90, 'foot.r': -90, 'hipY.r': r, 'hipY.l': l });
  L.hip_ir = { frames: hold(IR(0, 0), IR(38, 38), 0.45, 0.75), pin: PRONE_PIN, props: ['couch'], arrows: [{ pt: 'knee.r', dir: [0, -1, 0], color: STAB, from: 0.05, to: 0.9 }] };
  L.hip_ir_error = { frames: hold(IR(0, 0), IR(14, 38), 0.45, 0.75), pin: PRONE_PIN, props: ['couch'], marks: [{ pt: 'hipJ.r', from: 0.45, to: 0.78 }] };
  return L;
}

/** Kroki rigu dla testu (src/rigs.js → case 'test'). */
export function buildTest(kit, key) {
  const B = bodyOf(kit), spec = library(B)[key];
  if (!spec) throw new Error(`Nieznana animacja testu: ${key}`);
  return buildPose(kit, spec);
}
export const testProps = (B, key) => { const L = library(B)[key]; return { list: L?.props ?? [], at: L?.propsAt ?? 0, fx: { arrows: L?.arrows ?? [], marks: L?.marks ?? [] } }; };
