// Sprawdza, czy nazwy struktur użyte w bazie wiedzy istnieją w modelu.
import fs from 'node:fs';
const meta = JSON.parse(fs.readFileSync('public/data/meta.json', 'utf8'));
const names = { muscles: new Set(), insertions: new Set(), nerves: new Set(), cardio: new Set(), all: new Set() };
for (const m of meta) { (names[m.f] ?? (names[m.f] = new Set())).add(m.n); names.all.add(m.n); }
let bad = 0; const used = new Set();
for (const f of ['muscles_upper', 'muscles_lower', 'muscles_trunk']) {
  const kb = (await import(`../src/data/${f}.js`)).default;
  for (const [id, e] of Object.entries(kb)) {
    for (const n of e.mesh) { used.add(n); if (!names.muscles.has(n)) { console.log(`[${id}] brak siatki: ${n}`); bad++; } }
    for (const n of e.att ?? []) if (!names.insertions.has(n)) { console.log(`[${id}] brak przyczepu: ${n}`); bad++; }
    for (const n of e.nr ?? []) if (!names.nerves.has(n)) { console.log(`[${id}] brak nerwu: ${n}`); bad++; }
    for (const n of e.ar ?? []) if (!names.cardio.has(n)) { console.log(`[${id}] brak tętnicy: ${n}`); bad++; }
  }
}
try {
  const nv = (await import('../src/data/nerves.js')).default;
  for (const [id, e] of Object.entries(nv)) for (const n of [...(e.mesh ?? []), ...(e.path ?? [])]) if (!names.all.has(n)) { console.log(`[nerw ${id}] brak: ${n}`); bad++; }
} catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }
// ruchy: klucze mięśni i mięśnie bez żadnego ruchu
const allKb = {};
for (const f of ['muscles_upper', 'muscles_lower', 'muscles_trunk']) Object.assign(allKb, (await import(`../src/data/${f}.js`)).default);
const { MOVES } = await import('../src/data/movements.js');
const inMove = new Set(), moveIds = new Set();
for (const m of MOVES) {
  if (moveIds.has(m.id)) { console.log(`[ruch ${m.id}] powtórzony identyfikator`); bad++; }
  moveIds.add(m.id);
  for (const k of [...m.ago, ...m.syn, ...m.ant]) { inMove.add(k); if (!allKb[k]) { console.log(`[ruch ${m.id}] brak mięśnia: ${k}`); bad++; } }
  const dup = m.ago.filter((k) => m.ant.includes(k) || m.syn.includes(k));
  if (dup.length) { console.log(`[ruch ${m.id}] mięsień jednocześnie agonistą i synergistą/antagonistą: ${dup.join(', ')}`); bad++; }
}
const COMPLEXES = (await import('../src/data/complexes.js')).default;
for (const [id, c] of Object.entries(COMPLEXES)) {
  for (const k of c.keys) if (!allKb[k]) { console.log(`[kompleks ${id}] brak mięśnia: ${k}`); bad++; }
  for (const n of c.extra ?? []) if (!names.all.has(n)) { console.log(`[kompleks ${id}] brak siatki: ${n}`); bad++; }
}
const noMove = Object.keys(allKb).filter((k) => !inMove.has(k));
console.log(`ruchy: ${MOVES.length} (z animacją: ${MOVES.filter((m) => m.joint || m.rig).length}) | mięśnie bez ruchu: ${noMove.length}${noMove.length ? ' – ' + noMove.join(', ') : ''}`);
const skip = /fascia|bursa|retinacul|septum|sheath|aponeurosis|ligament|capsule|arch|tendon|tarsus|Linea|ring|Trochlea/i;
const un = [...new Set(meta.filter((m) => m.f === 'muscles' && !used.has(m.n) && !skip.test(m.n) && !['Bursa', 'Fascia', 'Articular capsule', 'Ligament'].includes(m.mat)).map((m) => m.n))];
console.log('błędy:', bad, '| mięśnie bez opisu:', un.length, un.join('; '));
