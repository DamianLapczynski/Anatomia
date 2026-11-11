// Model danych: łączy metadane siatek z bazą wiedzy (mięśnie, nerwy, nazwy).
import upper from './data/muscles_upper.js';
import lower from './data/muscles_lower.js';
import trunk from './data/muscles_trunk.js';
import NERVES from './data/nerves.js';
import { polishName } from './data/names.js';

export const MUSCLES = { ...upper, ...lower, ...trunk };
export { NERVES };

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
  for (const [key, e] of Object.entries(NERVES)) { e.key = key; e.type = 'nerve'; for (const n of e.mesh) if (!meshNerve.has(n)) meshNerve.set(n, key); }
  for (const m of meta) if (m.f === 'insertions' && attMuscle.has(m.n)) m.reg = MUSCLES[attMuscle.get(m.n)[0]].reg;
  for (const m of meta) if (m.f === 'muscles' && meshMuscle.has(m.n)) m.reg = MUSCLES[meshMuscle.get(m.n)].reg;

  const sidesOf = (list) => { const s = new Set(list.map((id) => meta[id].s)); return s; };

  function muscleEntity(key, side) {
    const e = MUSCLES[key];
    let meshIds = e.mesh.flatMap((n) => ids(n, side));
    if (!meshIds.length) meshIds = e.mesh.flatMap((n) => names.get(n) ?? []);
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
      ids(n, side).forEach((i) => nerveIds.add(i));
      const nk = meshNerve.get(n);
      if (nk) for (const p of NERVES[nk].path) ids(p, side).forEach((i) => pathIds.add(i));
    }
    const arteries = (e.ar ?? []).flatMap((n) => ids(n, side)).filter((id) => meta[id].layer === 'arteries');
    return { type: 'muscle', key, side, kb: e, title: e.pl, lat: e.lat, ids: meshIds, att, bones: [...bones], nerves: [...nerveIds], nervePath: [...pathIds], arteries };
  }

  function nerveEntity(key, side) {
    const e = NERVES[key];
    const meshIds = e.mesh.flatMap((n) => ids(n, side));
    const path = e.path.flatMap((n) => ids(n, side));
    const muscles = Object.values(MUSCLES).filter((m) => (m.nr ?? []).some((n) => e.mesh.includes(n)));
    return { type: 'nerve', key, side, kb: e, title: e.pl, lat: e.lat, ids: meshIds, nervePath: path, muscles };
  }

  function structEntity(id) {
    const m = meta[id];
    const pl = polishName(m.n), la = latin[m.n];
    return { type: 'struct', key: `${m.n}|${m.s}`, side: m.s, name: m.n, title: pl ?? la ?? m.n, lat: la, en: m.n, ids: byName.get(`${m.n}|${m.s}`), layer: m.layer, meta: m };
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
  for (const [key, e] of Object.entries(NERVES)) search.push({ kind: 'nerve', key, label: e.pl, sub: e.lat, text: `${e.pl} ${e.lat} ${e.mesh[0]}`.toLowerCase() });
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
    const rank = (s) => (s.kind === 'muscle' ? 0 : s.kind === 'nerve' ? 1 : 2) + (fold(s.label).startsWith(words[0]) ? -0.5 : 0);
    return out.sort((a, b) => rank(a) - rank(b) || a.label.length - b.label.length).slice(0, limit);
  }

  return { meta, latin, ids, entityOf, muscleEntity, nerveEntity, structEntity, find, sidesOf, meshMuscle, meshNerve, names };
}
