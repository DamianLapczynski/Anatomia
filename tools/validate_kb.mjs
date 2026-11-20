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
  const kbKeys = new Set();
  for (const f of ['muscles_upper', 'muscles_lower', 'muscles_trunk']) for (const k of Object.keys((await import(`../src/data/${f}.js`)).default)) kbKeys.add(k);
  for (const [id, e] of Object.entries(nv)) {
    for (const n of [...(e.mesh ?? []), ...(e.path ?? [])]) if (!names.all.has(n)) { console.log(`[nerw ${id}] brak: ${n}`); bad++; }
    for (const k of e.keys ?? []) if (!kbKeys.has(k)) { console.log(`[nerw ${id}] brak mięśnia: ${k}`); bad++; }
    for (const f of ['pl', 'lat', 'roots', 'course', 'motor', 'sensory', 'palsy']) if (!e[f]) { console.log(`[nerw ${id}] brak pola ${f}`); bad++; }
    if (!e.mesh?.length && !e.keys?.length) { console.log(`[nerw ${id}] bez siatki i bez listy mięśni`); bad++; }
  }
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
  const NV = (await import('../src/data/nerves.js')).default;
  for (const k of c.nerves ?? []) if (!NV[k]) { console.log(`[kompleks ${id}] brak nerwu: ${k}`); bad++; }
  for (const f of ['pl', 'lat', 'reg', 'loc', 'n', 'f', 'k', 's', 'alias']) if (!c[f]) { console.log(`[kompleks ${id}] brak pola ${f}`); bad++; }
}
const { EXAM, FILL } = await import('../src/data/muscle_exam.js');
for (const k of [...Object.keys(EXAM), ...Object.keys(FILL)]) if (!allKb[k]) { console.log(`[badanie] brak mięśnia: ${k}`); bad++; }
const miss = Object.entries(allKb).filter(([k, m]) => ['k', 's', 'a'].some((f) => !m[f] && !FILL[k]?.[f])).map(([k]) => k);
console.log(`badanie mięśni: ${Object.keys(EXAM).length} | bez kliniki/skojarzenia/unaczynienia: ${miss.length}${miss.length ? ' – ' + miss.join(', ') : ''}`);
const noMove = Object.keys(allKb).filter((k) => !inMove.has(k));
console.log(`ruchy: ${MOVES.length} (z animacją: ${MOVES.filter((m) => m.joint || m.rig).length}) | mięśnie bez ruchu: ${noMove.length}${noMove.length ? ' – ' + noMove.join(', ') : ''}`);
const skip = /fascia|bursa|retinacul|septum|sheath|aponeurosis|ligament|capsule|arch|tendon|tarsus|Linea|ring|Trochlea/i;
const un = [...new Set(meta.filter((m) => m.f === 'muscles' && !used.has(m.n) && !skip.test(m.n) && !['Bursa', 'Fascia', 'Articular capsule', 'Ligament'].includes(m.mat)).map((m) => m.n))];
// pokrycie polskich nazw (siatki bez wpisu w bazie mięśni/nerwów wyświetlają się nazwą ze słownika)
const { polishName } = await import('../src/data/names.js');
const cov = {};
for (const m of meta) { if (m.f === 'insertions' || used.has(m.n)) continue; const c = (cov[m.f] ??= { ok: 0, all: 0 }); c.all++; if (polishName(m.n)) c.ok++; }
console.log('polskie nazwy:', Object.entries(cov).map(([f, c]) => `${f} ${Math.round((100 * c.ok) / c.all)}%`).join(' · '));
for (const [f, c] of Object.entries(cov)) if (c.ok / c.all < 0.95) { console.log(`[nazwy] warstwa ${f}: pokrycie poniżej 95%`); bad++; }
console.log('błędy:', bad, '| mięśnie bez opisu:', un.length, un.join('; '));
if (bad) process.exit(1);
