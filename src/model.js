// Model danych: łączy metadane siatek z bazą wiedzy (mięśnie, nerwy, nazwy).
import upper from './data/muscles_upper.js';
import lower from './data/muscles_lower.js';
import trunk from './data/muscles_trunk.js';
import NERVES from './data/nerves.js';
import COMPLEXES from './data/complexes.js';
import JOINTS from './data/joints.js';
import FUNC_TESTS from './data/func_tests.js';
import CLIN_TESTS from './data/clinical_tests.js';
import { polishName } from './data/names.js';
import { EXAM, FILL } from './data/muscle_exam.js';

export const MUSCLES = { ...upper, ...lower, ...trunk };
// badanie (palpacja, test siły, test długości) i brakujące pola opisów z muscle_exam.js
for (const [k, e] of Object.entries(EXAM)) if (MUSCLES[k]) Object.assign(MUSCLES[k], e);
for (const [k, e] of Object.entries(FILL)) if (MUSCLES[k]) for (const [f, v] of Object.entries(e)) MUSCLES[k][f] ||= v;
export { NERVES, COMPLEXES, JOINTS };

export const LAYERS = [
  ['bones', 'Kości', '#e6dcc2'], ['joints', 'Stawy i więzadła', '#cfcbb5'], ['muscles', 'Mięśnie', '#a83d36'],
  ['fascia', 'Powięzie, kaletki', '#c9bfae'], ['attachments', 'Przyczepy mięśni', '#e02929'], ['arteries', 'Tętnice', '#d12120'],
  ['veins', 'Żyły', '#2954bf'], ['heart', 'Serce', '#b0584f'], ['nerves', 'Nerwy', '#f5cc33'], ['cns', 'Mózg i rdzeń', '#d9a9a0'],
];
export const LAYER_FILE = { bones: 'skeleton', joints: 'joints', muscles: 'muscles', fascia: 'muscles', attachments: 'insertions', arteries: 'cardio', veins: 'cardio', heart: 'cardio', nerves: 'nerves', cns: 'cns' };
export const REGIONS = [['all', 'Całe ciało'], ['gs', 'Głowa i szyja'], ['tu', 'Tułów'], ['kg', 'Kończyna górna'], ['kd', 'Kończyna dolna']];
const FASCIA_MAT = new Set(['Bursa', 'Fascia', 'Articular capsule', 'Ligament']);
const FASCIA_NAME = /fascia|retinacul|septum|sheath|aponeurosis|bursa|Linea alba|ligament|Iliopectineal arch|tarsus|Common tendinous ring/i;

function layerOf(m) {
  switch (m.f) {
    case 'skeleton': return 'bones';
    case 'joints': return 'joints';
    case 'insertions': return 'attachments';
    case 'nerves': return 'nerves';
    case 'cns': return 'cns';
    case 'muscles': return FASCIA_MAT.has(m.mat) || FASCIA_NAME.test(m.n) ? 'fascia' : 'muscles';
    case 'cardio': return m.mat === 'Artery' || m.mat === 'Pulmonary artery' ? 'arteries' : m.mat === 'Vein' || m.mat === 'Pulmonary vein' ? 'veins' : 'heart';
  }
  return 'bones';
}

function regionOf(m) {
  const c = m.colls;
  if (c.some((x) => /upper limb/i.test(x))) return 'kg';
  if (c.some((x) => /lower limb/i.test(x))) return 'kd';
  if (c.includes('Head') || c.includes('Neck')) return 'gs';
  if (c.some((x) => ['Trunk', 'Thorax', 'Abdomen', 'Back', 'Pelvis'].includes(x))) return 'tu';
  const x = Math.abs((m.bb[0] + m.bb[3]) / 2), y = (m.bb[1] + m.bb[4]) / 2;
  if (y > 1.42) return 'gs';
  if (y < 0.88) return 'kd';
  if (x > 0.17) return 'kg';
  return 'tu';
}

export function buildModel(meta, latin) {
  const byName = new Map(); // "nazwa|strona" -> [id]
  const names = new Map(); // nazwa -> [id]
  for (const m of meta) {
    m.layer = layerOf(m);
    m.reg = regionOf(m);
    const k = `${m.n}|${m.s}`;
    (byName.get(k) ?? byName.set(k, []).get(k)).push(m.id);
    (names.get(m.n) ?? names.set(m.n, []).get(m.n)).push(m.id);
  }
  // nazwy z uwzględnieniem strony; struktury nieparzyste zwracane dla każdej strony
  const ids = (name, side) => {
    const out = [...(byName.get(`${name}|${side}`) ?? [])];
    if (side) out.push(...(byName.get(`${name}|`) ?? []));
    else if (!out.length) out.push(...(names.get(name) ?? []));
    return out;
  };

  const meshMuscle = new Map(), attMuscle = new Map(), meshNerve = new Map();
  for (const [key, e] of Object.entries(MUSCLES)) {
    e.key = key; e.type = 'muscle';
    for (const n of e.mesh) meshMuscle.set(n, key);
    for (const n of new Set([...e.mesh, ...(e.att ?? [])])) (attMuscle.get(n) ?? attMuscle.set(n, []).get(n)).push(key);
  }
  // siatka należy do nerwu, dla którego jest główną (mesh[0]) – np. n. łydkowy jest osobnym wpisem, choć leży też na liście n. piszczelowego
  for (const [key, e] of Object.entries(NERVES)) { e.key = key; e.type = 'nerve'; if (e.mesh[0] && !meshNerve.has(e.mesh[0])) meshNerve.set(e.mesh[0], key); }
  for (const [key, e] of Object.entries(NERVES)) for (const n of e.mesh) if (!meshNerve.has(n)) meshNerve.set(n, key);
  for (const m of meta) if (m.f === 'insertions' && attMuscle.has(m.n)) m.reg = MUSCLES[attMuscle.get(m.n)[0]].reg;
  for (const m of meta) if (m.f === 'muscles' && meshMuscle.has(m.n)) m.reg = MUSCLES[meshMuscle.get(m.n)].reg;
  // warstwa: mięsień jest powierzchowny, jeśli którakolwiek jego część należy w modelu do „Superficial muscles”
  for (const e of Object.values(MUSCLES)) e.sup = false;
  for (const m of meta) if (m.f === 'muscles' && m.colls.includes('Superficial muscles') && meshMuscle.has(m.n)) MUSCLES[meshMuscle.get(m.n)].sup = true;
  for (const m of meta) if (m.f === 'muscles') m.sup = meshMuscle.has(m.n) ? MUSCLES[meshMuscle.get(m.n)].sup : m.colls.includes('Superficial muscles');

  const sidesOf = (list) => { const s = new Set(list.map((id) => meta[id].s)); return s; };

  function muscleEntity(key, side) {
    const e = MUSCLES[key];
    const isM = (id) => meta[id].f === 'muscles';
    let meshIds = e.mesh.flatMap((n) => ids(n, side)).filter(isM);
    if (!meshIds.length) meshIds = e.mesh.flatMap((n) => names.get(n) ?? []).filter(isM);
    const attNames = [...new Set([...e.mesh, ...(e.att ?? [])])];
    const att = attNames.flatMap((n) => ids(n, side)).filter((id) => meta[id].f === 'insertions');
    const bones = new Set();
    for (const id of att) {
      const p = meta[id].par[0]; if (!p) continue;
      const mm = p.match(/^(.*)\.([lr])$/);
      for (const b of ids(mm ? mm[1] : p, mm ? mm[2] : '')) if (meta[b].f === 'skeleton') bones.add(b);
    }
    const nerveIds = new Set(), pathIds = new Set();
    for (const n of e.nr ?? []) {
      ids(n, side).filter((i) => meta[i].f === 'nerves').forEach((i) => nerveIds.add(i));
      const nk = meshNerve.get(n);
      if (nk) for (const p of NERVES[nk].path) ids(p, side).forEach((i) => pathIds.add(i));
    }
    const arteries = (e.ar ?? []).flatMap((n) => ids(n, side)).filter((id) => meta[id].layer === 'arteries');
    return { type: 'muscle', key, side, kb: e, title: e.pl, lat: e.lat, ids: meshIds, att, bones: [...bones], nerves: [...nerveIds], nervePath: [...pathIds], arteries };
  }

  /** Klucze mięśni unerwianych przez nerw: jawna lista `keys` z bazy nerwów + mięśnie, których `nr` wskazuje siatkę nerwu. */
  function nerveMuscleKeys(key) {
    const e = NERVES[key], out = new Set(e.keys ?? []);
    for (const [k, m] of Object.entries(MUSCLES)) if ((m.nr ?? []).some((n) => e.mesh.includes(n))) out.add(k);
    return [...out];
  }
  /** Nerwy (klucze) unerwiające mięsień – przez siatki z `nr` i przez jawne listy `keys`. */
  function nervesOfMuscle(mk) {
    const out = new Set((MUSCLES[mk].nr ?? []).map((n) => meshNerve.get(n)).filter(Boolean));
    for (const [k, e] of Object.entries(NERVES)) if (e.keys?.includes(mk)) out.add(k);
    return [...out];
  }

  function nerveEntity(key, side) {
    const e = NERVES[key];
    const isN = (id) => meta[id].f === 'nerves';
    const meshIds = e.mesh.flatMap((n) => ids(n, side)).filter(isN);
    const path = e.path.flatMap((n) => ids(n, side)).filter(isN);
    const muscles = nerveMuscleKeys(key).map((k) => MUSCLES[k]);
    // nerw bez siatki w modelu (np. n. pośladkowy dolny): na modelu pokazujemy jego mięśnie
    const textOnly = !e.mesh.length;
    const entIds = textOnly ? muscles.flatMap((m) => m.mesh.flatMap((n) => ids(n, side))).filter((i) => meta[i].f === 'muscles') : meshIds;
    return { type: 'nerve', key, side, kb: e, title: e.pl, lat: e.lat, ids: entIds, nervePath: path, muscles, textOnly };
  }

  // stawy: siatka więzadła / torebki → klucze stawów, do których należy (np. torebka kolana: kolanowy i rzepkowo-udowy)
  const meshJoint = new Map();
  for (const [key, j] of Object.entries(JOINTS)) for (const n of [...j.cap, ...j.lig.map(([m]) => m)]) (meshJoint.get(n) ?? meshJoint.set(n, []).get(n)).push(key);
  function jointEntity(key, side) {
    const j = JOINTS[key];
    const soft = [...j.cap, ...j.lig.map(([m]) => m)].flatMap((n) => ids(n, side)).filter((i) => meta[i].f === 'joints');
    const bones = j.bones.flatMap((n) => ids(n, side)).filter((i) => meta[i].f === 'skeleton');
    return { type: 'joint', key, side, kb: j, title: j.pl, lat: j.lat, ids: soft, bones };
  }
  const jointsOfMesh = (name) => meshJoint.get(name) ?? [];

  function structEntity(id) {
    const m = meta[id];
    const pl = polishName(m.n), la = latin[m.n];
    return { type: 'struct', key: `${m.n}|${m.s}`, side: m.s, name: m.n, title: pl ?? la ?? m.n, lat: la, en: m.n, ids: byName.get(`${m.n}|${m.s}`).filter((i) => meta[i].f === m.f), layer: m.layer, meta: m };
  }

  function entityOf(id) {
    const m = meta[id];
    if (m.f === 'insertions') {
      const keys = attMuscle.get(m.n);
      if (keys) { const e = muscleEntity(keys[0], m.s); e.clicked = { role: m.role, bone: m.par[0], shared: keys.slice(1) }; return e; }
    }
    if (m.f === 'muscles' && meshMuscle.has(m.n)) { const e = muscleEntity(meshMuscle.get(m.n), m.s); e.part = e.kb.mesh.length > 1 ? m.n : null; return e; }
    if (m.f === 'nerves' && meshNerve.has(m.n)) { const e = nerveEntity(meshNerve.get(m.n), m.s); e.part = m.n; return e; }
    return structEntity(id);
  }

  // indeks wyszukiwania
  const search = [];
  for (const [key, e] of Object.entries(MUSCLES)) search.push({ kind: 'muscle', key, label: e.pl, sub: e.lat, text: `${e.pl} ${e.lat} ${e.mesh.join(' ')}`.toLowerCase() });
  for (const [key, t] of Object.entries(FUNC_TESTS)) search.push({ kind: 'functest', key, label: t.pl, sub: `${t.skrot} · test funkcjonalny`, text: `${t.pl} ${t.en} ${t.skrot}`.toLowerCase() });
  for (const [key, t] of Object.entries(CLIN_TESTS)) search.push({ kind: 'functest', key, label: t.pl, sub: `${t.skrot} · test kliniczny`, text: `${t.pl} ${t.en} ${t.skrot}`.toLowerCase() });
  for (const [key, j] of Object.entries(JOINTS)) search.push({ kind: 'joint', key, label: j.pl, sub: `${j.lat} · staw`, text: `${j.pl} ${j.lat} ${j.alias.join(' ')}`.toLowerCase() });
  for (const [key, e] of Object.entries(COMPLEXES)) search.push({ kind: 'complex', key, label: e.pl, sub: `${e.lat} · ${e.keys.length} mięśnie`, text: `${e.pl} ${e.lat} ${e.alias.join(' ')}`.toLowerCase() });
  for (const [key, e] of Object.entries(NERVES)) search.push({ kind: 'nerve', key, label: e.pl, sub: e.lat, text: `${e.pl} ${e.lat} ${e.mesh[0] ?? ''} ${(e.alias ?? []).join(' ')}`.toLowerCase() });
  for (const [n, list] of names) {
    const m = meta[list[0]];
    if (m.f === 'insertions' || meshMuscle.has(n) || (meshNerve.has(n) && NERVES[meshNerve.get(n)].mesh[0] === n)) continue;
    const pl = polishName(n), la = latin[n];
    search.push({ kind: 'struct', id: list.find((i) => meta[i].s !== 'l') ?? list[0], label: pl ?? la ?? n, sub: pl ? (la ?? n) : n, text: `${pl ?? ''} ${la ?? ''} ${n}`.toLowerCase(), layer: m.layer });
  }
  const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
  for (const s of search) s.text = fold(s.text);
  function find(q, limit = 30) {
    const words = fold(q).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const out = [];
    for (const s of search) if (words.every((w) => s.text.includes(w))) { out.push(s); }
    const rank = (s) => (s.kind === 'complex' || s.kind === 'joint' || s.kind === 'functest' ? -1 : s.kind === 'muscle' ? 0 : s.kind === 'nerve' ? 1 : s.kind === 'landmark' ? 1.5 : 2) + (fold(s.label).startsWith(words[0]) ? -0.5 : 0);
    return out.sort((a, b) => rank(a) - rank(b) || a.label.length - b.label.length).slice(0, limit);
  }

  // ---- punkty kostne (labels.json): wyszukiwarka + mięśnie przyczepiające się w ich pobliżu ----
  let landmarks = [];
  function addLandmarks(labels, plName) {
    landmarks = [];
    labels.forEach((l, li) => {
      const bone = l.p.replace(/\.[lr]$/, ''), paired = bone !== l.p;
      const bid = names.get(bone)?.find((i) => meta[i].f === 'skeleton'); if (bid === undefined) return; // punkty narządów pomijamy
      const pl = plName(l.n), la = latin[l.n], bonePl = polishName(bone) ?? latin[bone] ?? bone;
      const lm = { li, n: l.n, b: l.b, bone, paired, title: pl ?? la ?? l.n, lat: la ?? l.n, bonePl };
      landmarks.push(lm);
      search.push({ kind: 'landmark', li, label: lm.title, sub: `Punkt kostny · ${bonePl}`, text: fold(`${pl ?? ''} ${la ?? ''} ${l.n} ${bonePl}`) });
    });
  }
  const norm = (s) => fold(s).replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim();
  /** Encja punktu kostnego. near: mięśnie z polami przyczepów do ~2 cm od punktu (wymaga wczytanych przyczepów) + mięśnie, których opis przyczepu wymienia ten punkt. */
  function landmarkEntity(li, side) {
    const lm = landmarks.find((x) => x.li === li); if (!lm) return null;
    const s = lm.paired ? (side || 'r') : '';
    const boneIds = ids(lm.bone, s).filter((i) => meta[i].f === 'skeleton');
    const point = [s === 'l' ? -lm.b[0] : lm.b[0], lm.b[1], lm.b[2]];
    return { type: 'landmark', key: `lm${li}`, li, side: s, title: lm.title, lat: lm.lat, en: lm.n, bonePl: lm.bonePl, boneKey: lm.paired ? `${lm.bone}.${s}` : lm.bone, ids: boneIds, bones: boneIds, point };
  }
  function nearMuscles(ent, posOf, radius = 0.02) {
    const out = new Map(), [px, py, pz] = ent.point;
    const add = (key, role, d, how) => { const r = out.get(key) ?? { key, roles: new Set(), d: Infinity, how: new Set() }; r.roles.add(role); r.d = Math.min(r.d, d); r.how.add(how); out.set(key, r); };
    const patches = [];
    for (const m of meta) {
      if (m.f !== 'insertions' || m.par[0] !== ent.boneKey) continue;
      const P = posOf(m.id); if (!P) continue;
      let d2 = Infinity; for (let i = 0; i < P.length; i += 3) { const dx = P[i] - px, dy = P[i + 1] - py, dz = P[i + 2] - pz, d = dx * dx + dy * dy + dz * dz; if (d < d2) d2 = d; }
      const d = Math.sqrt(d2); if (d > radius) continue;
      patches.push(m.id);
      for (const key of attMuscle.get(m.n) ?? []) add(key, m.role, d, 'model');
    }
    // opis w bazie wiedzy: nazwa punktu (PL lub łac.) w tekście przyczepu początkowego / końcowego
    // polska odmiana: porównujemy początki kolejnych słów („krętarz większy” ~ „krętarza większego”, „guzowatość kości piszczelowej” ~ „guzowatość piszczeli”)
    const lm = landmarks.find((x) => x.li === ent.li);
    const words = (t) => norm(t).split(/[^a-z0-9]+/).filter(Boolean);
    const stems = (t) => words(t).filter((w) => !/^(kosc|kosci|m|mm|n)$/.test(w)).map((w) => w.slice(0, Math.max(3, Math.ceil(w.length * 0.6))));
    const qs = [lm && plNameOf(lm), latin[ent.en]].filter(Boolean).map(stems).filter((q) => q.join('').length >= 6);
    const has = (text, q) => { const w = words(text); for (let i = 0; i + q.length <= w.length; i++) if (q.every((st, j) => w[i + j].startsWith(st))) return true; return false; };
    for (const [key, e] of Object.entries(MUSCLES)) for (const q of qs) {
      if (has(e.o ?? '', q)) add(key, 'origin', Infinity, 'opis');
      if (has(e.i ?? '', q)) add(key, 'insertion', Infinity, 'opis');
    }
    return { patches, muscles: [...out.values()].sort((a, b) => a.d - b.d) };
  }
  const plNameOf = (lm) => (lm.title !== lm.lat && lm.title !== lm.n ? lm.title : null);

  return { meta, latin, ids, entityOf, muscleEntity, nerveEntity, nerveMuscleKeys, nervesOfMuscle, jointEntity, jointsOfMesh, structEntity, find, sidesOf, meshMuscle, meshNerve, names, addLandmarks, landmarkEntity, nearMuscles, landmarks: () => landmarks };
}
