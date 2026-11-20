// „Rigi” ruchów wielostawowych: łańcuchy obrotów (i przesunięć) kości dla palców, kciuka, stopy, obręczy barkowej,
// kręgosłupa, głowy, żuchwy, miednicy, oddychania i połykania. Każdy krok łańcucha:
//   { bones: Set(id) – kości przesuwane tym krokiem, pivot: Vector3, axis: Vector3, deg – kąt maks. (stopnie),
//     probe: { p, d } – punkt i kierunek: znak obrotu dobierany tak, by punkt p ruszył w stronę d (bez zgadywania stron ciała),
//     pre: true – krok zawsze w pełni wykonany (pozycja wyjściowa, np. zgięte kolano przed rotacją),
//     move: Vector3 – przesunięcie maks., rel: indeks kroku, którego kąt (ze znakiem) przejąć z mnożnikiem deg }
// Kolejność kroków: od zewnętrznego do wewnętrznego (kość = T1 · T2 · … dla kroków, które ją zawierają).
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const FINGER = ['first', 'second', 'third', 'fourth', 'fifth'];
const RIB = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth'];
const RIBL = RIB.map((r) => r.toLowerCase());
const COL = ['Vertebra L5', 'Vertebra L4', 'Vertebra L3', 'Vertebra L2', 'Vertebra L1', ...Array.from({ length: 12 }, (_, i) => `Vertebra T${12 - i}`), 'Vertebra C7', 'Vertebra C6', 'Vertebra C5', 'Vertebra C4', 'Vertebra C3', 'Axis (C2)', 'Atlas (C1)'];
const HEAD = 25, IDX = Object.fromEntries(COL.map((n, i) => [n, i + 1]));
const UPPER = /^(Clavicle|Scapula|Humerus|Radius|Ulna)$|of hand$|metacarpal bone|^(Scaphoid|Lunate|Triquetrum|Pisiform|Trapezium|Trapezoid|Capitate|Hamate) bone/;
const LOWER = /^(Hip bone|Sacrum|Coccyx|Femur|Patella|Tibia|Fibula)$|of foot$|metatarsal bone|^(Calcaneus|Talus|Navicular bone|Cuboid bone)|cuneiform bone/;
const ARM = /^(Humerus|Radius|Ulna)$|of hand$|metacarpal bone|^(Scaphoid|Lunate|Triquetrum|Pisiform|Trapezium|Trapezoid|Capitate|Hamate) bone/;
const LARYNX = /^(Hyoid bone|Thyroid cartilage|Cricoid cartilage|Arytenoid cartilage|Corniculate cartilage)$/;

export class RigKit {
  constructor(motion, side) {
    this.mo = motion; this.model = motion.model; this.meta = motion.model.meta; this.side = side;
    this.sx = side === 'l' ? 1 : -1; // V(sx,0,0) = bocznie po stronie ruchu, V(-sx,0,0) = przyśrodkowo (prawa strona ciała ma x < 0)
  }
  id(name, side = this.side) { return this.model.ids(name, side).find((i) => this.meta[i].f === 'skeleton' && this.mo.engine.meshes[i]); }
  ids(names, side = this.side) { return names.map((n) => this.id(n, side)).filter((i) => i !== undefined); }
  pos(id) { return this.mo._pos(id); }
  center(id) { const b = this.meta[id].bb; return V((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2); }
  centroid(id, pred) { return this.mo._centroid(id, pred); }
  /** środek wierzchołków najdalej w kierunku d (pas o grubości len) */
  extreme(id, d, len = 0.006) {
    const P = this.pos(id); let mx = -Infinity;
    for (let i = 0; i < P.length; i += 3) mx = Math.max(mx, P[i] * d.x + P[i + 1] * d.y + P[i + 2] * d.z);
    return this.centroid(id, (x, y, z) => x * d.x + y * d.y + z * d.z > mx - len);
  }
  /** koniec kości bliższy / dalszy względem punktu odniesienia */
  endNear(id, ref, len = 0.006) { const d = this.center(id).sub(ref).normalize().negate(); return this.extreme(id, d, len); }
  endFar(id, ref, len = 0.006) { const d = this.center(id).sub(ref).normalize(); return this.extreme(id, d, len); }
  sideBones(re, side = this.side) { return this.meta.filter((m) => m.f === 'skeleton' && m.s === side && re.test(m.n) && this.mo.engine.meshes[m.id]).map((m) => m.id); }

  // ---------- ręka ----------
  hand() {
    if (this._hand) return this._hand;
    const mc = (f) => this.id(`${FINGER[f]} metacarpal bone`.replace(/^./, (c) => c.toUpperCase()));
    const ph = (kind, f) => this.id(`${kind} phalanx of ${FINGER[f]} finger of hand`);
    const wrist = this.center(this.id('Capitate bone'));
    const tip3 = this.center(ph('Distal', 2));
    const d = tip3.clone().sub(wrist).normalize(); // kierunek palców
    const across = this.center(mc(1)).sub(this.center(mc(4))); across.addScaledVector(d, -across.dot(d)).normalize(); // od V do II (ku kciukowi)
    const n = across.clone().cross(d).multiplyScalar(this.side === 'l' ? -1 : 1).normalize(); // strona dłoniowa
    return (this._hand = { mc, ph, wrist, d, across, n });
  }
  finger(f, flex, deg) { // f: 1..4 (II–V); deg: [MCP, PIP, DIP]
    const H = this.hand(), steps = [];
    const m = H.mc(f), p = H.ph('Proximal', f), mi = H.ph('Middle', f), di = H.ph('Distal', f);
    const chain = [[m, [p, mi, di]], [p, [mi, di]], [mi, [di]]];
    chain.forEach(([base, moved], j) => {
      if (!deg[j]) return;
      const pivot = this.endFar(base, H.wrist);
      steps.push({ bones: new Set(moved), pivot, axis: flex ? H.across.clone() : H.n.clone(), deg: deg[j], probe: { p: this.center(di), d: flex ? H.n : H.across.clone().multiplyScalar(flex === false && f >= 3 ? -1 : 1) } });
    });
    return steps;
  }
  thumb(kind) {
    const H = this.hand(), mc1 = H.mc(0), p1 = H.ph('Proximal', 0), d1 = H.ph('Distal', 0), trap = this.center(this.id('Trapezium bone'));
    const cmc = this.endNear(mc1, trap), mcp = this.endFar(mc1, trap), ip = this.endFar(p1, this.center(mc1));
    const tip = this.center(d1), ulnar = H.across.clone().negate();
    const st = (bones, pivot, axis, deg, d) => ({ bones: new Set(bones), pivot, axis: axis.clone(), deg, probe: { p: tip, d } });
    if (kind === 'flex') return [st([mc1, p1, d1], cmc, H.n, 15, ulnar), st([p1, d1], mcp, H.n, 45, ulnar), st([d1], ip, H.n, 70, ulnar)];
    if (kind === 'ext') return [st([mc1, p1, d1], cmc, H.n, -20, ulnar), st([d1], ip, H.n, -15, ulnar)];
    if (kind === 'abd') return [st([mc1, p1, d1], cmc, H.across, 45, H.n)];
    // opozycja: odwiedzenie + zgięcie w stawie siodełkowym, lekkie zgięcie MCP i IP; palec V wychodzi naprzeciw
    const mc5 = H.mc(4);
    return [st([mc1, p1, d1], cmc, H.across, 40, H.n), st([mc1, p1, d1], cmc, H.n, 35, ulnar), st([p1, d1], mcp, H.n, 20, ulnar), st([d1], ip, H.n, 20, ulnar),
      { bones: new Set([mc5, H.ph('Proximal', 4), H.ph('Middle', 4), H.ph('Distal', 4)]), pivot: this.endNear(mc5, H.wrist), axis: H.across.clone(), deg: 15, probe: { p: this.center(H.ph('Distal', 4)), d: H.n } }];
  }
  fingers(kind) {
    if (kind === 'flex') return [1, 2, 3, 4].flatMap((f) => this.finger(f, true, [80, 95, 65]));
    if (kind === 'ext') return [1, 2, 3, 4].flatMap((f) => this.finger(f, true, [-30, 0, 0]));
    if (kind === 'abd') return [1, 3, 4].flatMap((f) => this.finger(f, false, [f === 4 ? 25 : 15, 0, 0]));
    // opozycja palca małego: zgięcie kości V śródręcza ku dłoni + częściowe zgięcie palca
    const H = this.hand(), mc5 = H.mc(4);
    return [{ bones: new Set([mc5, H.ph('Proximal', 4), H.ph('Middle', 4), H.ph('Distal', 4)]), pivot: this.endNear(mc5, H.wrist), axis: H.across.clone(), deg: 20, probe: { p: this.center(H.ph('Distal', 4)), d: H.n } },
      ...this.finger(4, true, [40, 45, 25])];
  }

  // ---------- stopa ----------
  toes(kind) {
    const mt = (f) => this.id(`${FINGER[f]} metatarsal bone`.replace(/^./, (c) => c.toUpperCase()));
    const ph = (k, f) => this.id(`${k} phalanx of ${FINGER[f]} finger of foot`);
    const heel = this.center(this.id('Calcaneus')), down = V(0, -1, 0), med = V(-this.sx, 0, 0);
    const toe = (f, deg) => {
      const chain = [[mt(f), [ph('Proximal', f), ph('Middle', f), ph('Distal', f)]], [ph('Proximal', f), [ph('Middle', f), ph('Distal', f)]], [ph('Middle', f), [ph('Distal', f)]]].filter(([b]) => b !== undefined);
      const tip = this.center(ph('Distal', f));
      return chain.map(([base, moved], j) => (deg[j] ? { bones: new Set(moved.filter((x) => x !== undefined)), pivot: this.endFar(base, heel), axis: V(1, 0, 0), deg: deg[j], probe: { p: tip, d: down } } : null)).filter(Boolean);
    };
    if (kind === 'flex') return [1, 2, 3, 4].flatMap((f) => toe(f, [30, 45, 30]));
    if (kind === 'ext') return [1, 2, 3, 4].flatMap((f) => toe(f, [-40, 0, 0]));
    if (kind === 'hal_flex') return toe(0, [35, 50]);
    if (kind === 'hal_ext') return toe(0, [-60, 0]);
    // odwodzenie palucha: obrót wokół osi pionowej w stawie MTP I – ku przyśrodkowi
    const p = ph('Proximal', 0), d = ph('Distal', 0);
    return [{ bones: new Set([p, d]), pivot: this.endFar(mt(0), heel), axis: V(0, 1, 0), deg: 15, probe: { p: this.center(d), d: med } }];
  }

  // ---------- kolano i bark z pozycją wyjściową ----------
  kneeRot(deg) {
    const fem = this.id('Femur'), tib = this.id('Tibia'), talus = this.id('Talus');
    const knee = this.mo._end('Femur', this.side, false, 0.03), ankle = this.center(talus);
    const leg = [tib, this.id('Fibula'), ...this.sideBones(/of foot$|metatarsal bone|^(Calcaneus|Talus|Navicular bone|Cuboid bone)|cuneiform bone/)];
    const toe = this.center(this.id('Second metatarsal bone'));
    return [
      { bones: new Set([...leg, this.id('Patella')]), pivot: knee, axis: V(1, 0, 0), deg: 90, pre: true, probe: { p: ankle, d: V(0, 0, -1) } },
      { bones: new Set(leg), pivot: knee, axis: ankle.clone().sub(knee).normalize(), deg, probe: { p: toe, d: V(-this.sx, 0, 0) } }, // + = rotacja wewnętrzna (palce do przyśrodka)
    ].map((s) => (s.bones.delete(undefined), s)).filter(() => fem !== undefined);
  }
  shoulderHoriz(deg) {
    const arm = this.sideBones(ARM);
    const sh = this.mo._end('Humerus', this.side, true, 0.04), elbow = this.mo._end('Humerus', this.side, false, 0.02);
    return [
      { bones: new Set(arm), pivot: sh, axis: V(0, 1, 0), deg, probe: { p: elbow, d: V(this.sx, 0, 0), bone: this.id('Humerus') } }, // + = odwiedzenie poziome (łokieć na zewnątrz)
      { bones: new Set(arm), pivot: sh, axis: V(1, 0, 0), deg: 90, pre: true, probe: { p: elbow, d: V(0, 0, 1) } },
    ];
  }

  // ---------- obręcz barkowa ----------
  girdle(kind) {
    const clav = this.id('Clavicle'), scap = this.id('Scapula');
    const arm = this.sideBones(ARM);
    const sc = this.extreme(clav, V(-this.sx, 0, 0)), ac = this.extreme(clav, V(this.sx, 0, 0));
    const all = new Set([clav, scap, ...arm]);
    // ramię „wisi” dalej pionowo: staw ramienny kompensuje obrót obręczy (krok wewnętrzny o przeciwnym kącie)
    const gh = this.mo._end('Humerus', this.side, true, 0.04), hang = (i) => ({ bones: new Set(arm), pivot: gh, rel: i, deg: -1 });
    if (kind === 'el') return [{ bones: all, pivot: sc, axis: V(0, 0, 1), deg: 18, probe: { p: ac, d: V(0, 1, 0) } }, hang(0)];
    if (kind === 'dep') return [{ bones: all, pivot: sc, axis: V(0, 0, 1), deg: -8, probe: { p: ac, d: V(0, 1, 0) } }, hang(0)];
    if (kind === 'pro') return [{ bones: all, pivot: sc, axis: V(0, 1, 0), deg: 20, probe: { p: ac, d: V(0, 0, 1) } }, hang(0)];
    if (kind === 'ret') return [{ bones: all, pivot: sc, axis: V(0, 1, 0), deg: -15, probe: { p: ac, d: V(0, 0, 1) } }, hang(0)];
    // rotacja górna: łopatka (z ramieniem) obraca się w płaszczyźnie czołowej, panewka w górę; obojczyk lekko się unosi
    const glen = this.extreme(scap, V(this.sx, 0, 0)), pivot = this.center(scap);
    return [{ bones: all, pivot: sc, axis: V(0, 0, 1), deg: 10, probe: { p: ac, d: V(0, 1, 0) } },
      { bones: new Set([scap, ...arm]), pivot, axis: V(0, 0, 1), deg: 30, probe: { p: glen, d: V(0, 1, 0) } }, hang(0), hang(1)];
  }

  // ---------- kręgosłup, głowa, miednica ----------
  levels() {
    if (this._lv) return this._lv;
    const lv = new Map(), headMin = this.meta[this.id('Vertebra C3', '')].bb[4]; // żuchwa i zęby leżą na wysokości C1–C2, ale należą do głowy
    for (const m of this.meta) {
      if (m.f !== 'skeleton' || !this.mo.engine.meshes[m.id]) continue;
      let l;
      if (IDX[m.n]) l = IDX[m.n];
      else if (LOWER.test(m.n)) l = 0;
      else if (UPPER.test(m.n)) l = IDX['Vertebra T3'];
      else if (LARYNX.test(m.n)) l = IDX['Vertebra C4'];
      else if (/^(Manubrium of sternum|Body of sternum|Xiphoid process)$/.test(m.n)) l = IDX['Vertebra T4'];
      else { const r = RIBL.findIndex((x) => m.n.toLowerCase().startsWith(`${x} rib`) || m.n.toLowerCase().endsWith(` ${x} rib`)); if (r >= 0) l = IDX[`Vertebra T${r + 1}`]; else if ((m.bb[1] + m.bb[4]) / 2 > headMin) l = HEAD; else l = IDX['Vertebra T1']; }
      lv.set(m.id, l);
    }
    return (this._lv = lv);
  }
  vbody(i) { // środek trzonu kręgu (przednia połowa siatki)
    const id = this.id(COL[i - 1], ''), c = this.center(id);
    return this.centroid(id, (x, y, z) => z > c.z) ?? c;
  }
  /** Staw między poziomem i (0 = kość krzyżowa) a i+1: przesuwa wszystko powyżej. */
  joint(i) {
    const lv = this.levels(), bones = new Set([...lv].filter(([, l]) => l > i).map(([id]) => id));
    let pivot;
    if (i === 0) { const s = this.id('Sacrum', ''); pivot = this.extreme(s, V(0, 1, 0), 0.01).lerp(this.vbody(1), 0.5); }
    else if (i >= 24) pivot = this.extreme(this.id('Atlas (C1)', ''), V(0, 1, 0), 0.006); // staw szczytowo-potyliczny
    else pivot = this.vbody(i).lerp(this.vbody(i + 1), 0.5);
    return { bones, pivot };
  }
  spine(kind) {
    const up = this.center(this.id('Vertebra C7', '')), head = this.center(this.id('Mandible', '')), stern = this.center(this.id('Body of sternum', ''));
    const toSide = V(this.sx, 0, 0); // ku stronie ruchu (bocznie)
    const spread = (from, to, total, axis, probe) => { const n = to - from + 1; return Array.from({ length: n }, (_, k) => ({ ...this.joint(from + k), axis: axis.clone(), deg: total / n, probe })); };
    const fwd = V(0, 0, 1), X = V(1, 0, 0), Y = V(0, 1, 0), Z = V(0, 0, 1);
    const trunk = { p: up, d: fwd };
    // ręce zwisają swobodnie: staw ramienny oddaje sumaryczny kąt pochylenia tułowia
    const hang = (steps) => [...steps, ...['l', 'r'].map((s) => ({ bones: new Set(this.sideBones(ARM, s)), pivot: this.mo._end('Humerus', s, true, 0.04), rel: steps.map((_, i) => i), deg: -1 }))];
    switch (kind) {
      case 'tr_flex': return hang([...spread(0, 5, 40, X, trunk), ...spread(6, 16, 30, X, trunk)]);
      case 'tr_ext': return hang([...spread(0, 5, -20, X, trunk), ...spread(6, 16, -10, X, trunk)]);
      case 'tr_lat': return hang([...spread(0, 5, 15, Z, { p: up, d: toSide }), ...spread(6, 16, 15, Z, { p: up, d: toSide })]);
      case 'tr_rot': return [...spread(0, 5, 5, Y, { p: stern, d: toSide }), ...spread(6, 16, 30, Y, { p: stern, d: toSide })];
      case 'nk_flex': return spread(17, 22, 40, X, { p: head, d: fwd });
      case 'nk_ext': return spread(17, 22, -50, X, { p: head, d: fwd });
      case 'nk_lat': return spread(17, 22, 35, Z, { p: head, d: toSide });
      case 'nk_rot': return [{ ...this.joint(23), axis: Y, deg: 35, probe: { p: head, d: toSide } }, ...spread(17, 22, 30, Y, { p: head, d: toSide })];
      case 'nk_nod': return [{ ...this.joint(24), axis: X, deg: 18, probe: { p: head, d: V(0, -0.3, 1).normalize() } }];
      default: { // pochylenie miednicy: miednica + wszystko powyżej wokół osi głów kości udowych, lędźwia kompensują
        const lv = this.levels(), hip = this.mo._joint('hip', 'l').p.add(this.mo._joint('hip', 'r').p).multiplyScalar(0.5);
        const pel = new Set([...lv].filter(([id, l]) => l > 0 || /^(Hip bone|Sacrum|Coccyx)$/.test(this.meta[id].n)).map(([id]) => id));
        const asis = this.extreme(this.id('Hip bone', 'r'), V(0, 0, 1), 0.01);
        const tilt = kind === 'pelv_ant' ? 15 : -12;
        return [{ bones: pel, pivot: hip, axis: X, deg: tilt, probe: { p: asis, d: V(0, -1, 0) } }, ...Array.from({ length: 5 }, (_, k) => ({ ...this.joint(k), axis: X.clone(), rel: 0, deg: -1 / 5 }))];
      }
    }
  }

  // ---------- żuchwa, połykanie, oddychanie ----------
  jaw(kind) {
    const mand = this.id('Mandible', ''), bones = new Set([mand, ...this.meta.filter((m) => m.f === 'skeleton' && /^Lower /.test(m.n) && this.mo.engine.meshes[m.id]).map((m) => m.id)]);
    const b = this.meta[mand].bb, top = b[4];
    const cond = (s) => this.centroid(mand, (x, y, z) => y > top - 0.012 && (s ? Math.sign(x) === s : true) && z < (b[2] + b[5]) / 2);
    const tmj = cond(0), chin = this.extreme(mand, V(0, -0.5, 1).normalize(), 0.01);
    if (kind === 'open') return [{ bones, pivot: tmj, axis: V(1, 0, 0), deg: 24, probe: { p: chin, d: V(0, -1, 0) }, move: V(0, -0.003, 0.006) }];
    if (kind === 'pro') return [{ bones, pivot: tmj, axis: V(1, 0, 0), deg: 0, move: V(0, -0.002, 0.007) }];
    return [{ bones, pivot: cond(this.sx), axis: V(0, 1, 0), deg: 7, probe: { p: chin, d: V(this.sx, 0, 0) }, move: V(this.sx * 0.002, 0, 0) }];
  }
  swallow() {
    const bones = new Set(this.meta.filter((m) => m.f === 'skeleton' && LARYNX.test(m.n) && this.mo.engine.meshes[m.id]).map((m) => m.id));
    return [{ bones, pivot: this.center(this.id('Hyoid bone', '')), axis: V(1, 0, 0), deg: 0, move: V(0, 0.018, 0.008) }];
  }
  breath() {
    const steps = [];
    for (let r = 0; r < 10; r++) for (const s of ['l', 'r']) {
      const rib = this.id(`${RIB[r]} rib`, s); if (rib === undefined) continue;
      const cart = this.id(`Costal cartilage of ${RIBL[r]} rib`, s);
      const vb = this.center(this.id(`Vertebra T${r + 1}`, ''));
      const head = this.endNear(rib, vb, 0.01), neck = this.centroid(rib, (x, y, z) => (x - head.x) ** 2 + (y - head.y) ** 2 + (z - head.z) ** 2 < 0.035 ** 2) ?? head;
      const axis = neck.clone().sub(head); axis.y = 0; if (axis.lengthSq() < 1e-8) axis.set(1, 0, 0); axis.normalize();
      steps.push({ bones: new Set([rib, cart].filter((x) => x !== undefined)), pivot: head, axis, deg: r < 6 ? 5 : 7, probe: { p: this.extreme(rib, V(0, 0, 1), 0.01), d: V(0, 1, 0) } });
    }
    const st = new Set(this.ids(['Manubrium of sternum', 'Body of sternum', 'Xiphoid process'], ''));
    steps.push({ bones: st, pivot: V(0, 0, 0), axis: V(1, 0, 0), deg: 0, move: V(0, 0.006, 0.009) });
    return steps;
  }

  build(rig) {
    const [name, arg] = rig.split(':');
    switch (name) {
      case 'fingers': return this.fingers(arg);
      case 'thumb': return this.thumb(arg);
      case 'toes': return this.toes(arg);
      case 'knee_rot': return this.kneeRot(Number(arg));
      case 'sh_horiz': return this.shoulderHoriz(Number(arg));
      case 'girdle': return this.girdle(arg);
      case 'spine': return this.spine(arg);
      case 'jaw': return this.jaw(arg);
      case 'swallow': return this.swallow();
      case 'breath': return this.breath();
    }
    throw new Error(`Nieznany rig: ${rig}`);
  }
}
