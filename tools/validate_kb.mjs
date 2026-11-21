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
const JOINTS = (await import('../src/data/joints.js')).default;
for (const [id, j] of Object.entries(JOINTS)) {
  for (const n of [...j.bones, ...j.cap, ...j.lig.map(([m]) => m), ...j.tests.flatMap((t) => t.mesh)]) if (!names.all.has(n)) { console.log(`[staw ${id}] brak siatki: ${n}`); bad++; }
  for (const m of j.moves) if (!moveIds.has(m)) { console.log(`[staw ${id}] brak ruchu: ${m}`); bad++; }
  for (const f of ['pl', 'lat', 'reg', 'type', 'closed', 'rest', 'capsular', 'k', 's']) if (!j[f]) { console.log(`[staw ${id}] brak pola ${f}`); bad++; }
}
console.log(`stawy: ${Object.keys(JOINTS).length} | testy: ${Object.values(JOINTS).reduce((a, j) => a + j.tests.length, 0)}`);
// testy funkcjonalne
const FT = (await import('../src/data/func_tests.js')).default;
const { library } = await import('../src/poses.js');
const ANIM = library({});
for (const [id, t] of Object.entries(FT)) {
  for (const f of ['pl', 'en', 'grp', 'cel', 'dla', 'sprzet', 'wykonanie', 'polecenie', 'pomiar', 'normy', 'interpretacja', 'dlaczego', 'bledy', 'muscles', 'anim', 'src']) if (!t[f]) { console.log(`[test ${id}] brak pola ${f}`); bad++; }
  for (const k of [...t.muscles, ...t.anim.phases.flatMap((p) => p.muscles)]) if (!allKb[k]) { console.log(`[test ${id}] brak mięśnia: ${k}`); bad++; }
  for (const j of t.joints ?? []) if (!JOINTS[j]) { console.log(`[test ${id}] brak stawu: ${j}`); bad++; }
  for (const a of [t.anim.key, t.anim.error].filter(Boolean)) if (!ANIM[a]) { console.log(`[test ${id}] brak animacji: ${a}`); bad++; }
  const ts = t.anim.phases.map((p) => p.t); if (ts.some((v, i) => i && v <= ts[i - 1])) { console.log(`[test ${id}] fazy nie rosną w czasie`); bad++; }
}
for (const [k, a] of Object.entries(ANIM)) { const ts = a.frames.map((f) => f.t); if (ts.some((v, i) => i && v < ts[i - 1]) || ts[0] !== 0 || ts[ts.length - 1] !== 1) { console.log(`[animacja ${k}] klatki muszą rosnąć od 0 do 1`); bad++; } }
const { default: CT, CT_GROUPS } = await import('../src/data/clinical_tests.js');
for (const [id, t] of Object.entries(CT)) {
  if (FT[id]) { console.log(`[test ${id}] klucz powtórzony w func_tests.js`); bad++; }
  for (const f of ['pl', 'en', 'skrot', 'grp', 'cel', 'pozycja', 'wykonanie', 'dodatni', 'sugeruje', 'dlaczego', 'muscles', 'anim']) if (!t[f]) { console.log(`[test ${id}] brak pola ${f}`); bad++; }
  if (!CT_GROUPS.some(([g]) => g === t.grp)) { console.log(`[test ${id}] nieznana grupa ${t.grp}`); bad++; }
  for (const k of [...t.muscles, ...t.anim.phases.flatMap((p) => p.muscles)]) if (!allKb[k]) { console.log(`[test ${id}] brak mięśnia: ${k}`); bad++; }
  for (const j of t.joints ?? []) if (!JOINTS[j]) { console.log(`[test ${id}] brak stawu: ${j}`); bad++; }
  for (const a of [t.anim.key, t.anim.error].filter(Boolean)) if (!ANIM[a]) { console.log(`[test ${id}] brak animacji: ${a}`); bad++; }
  if (t.anim.error && !t.anim.errorLabel) { console.log(`[test ${id}] brak opisu wyniku dodatniego (errorLabel)`); bad++; }
  if (t.video && !/^[A-Za-z0-9_-]{11}$/.test(t.video)) { console.log(`[test ${id}] zły identyfikator filmu`); bad++; }
  const ts = t.anim.phases.map((p) => p.t); if (ts.some((v, i) => i && v <= ts[i - 1])) { console.log(`[test ${id}] fazy nie rosną w czasie`); bad++; }
}
for (const [, , also] of CT_GROUPS) for (const k of also) if (!FT[k]) { console.log(`[grupa] brak testu ${k}`); bad++; }
// schorzenia i przypadki kliniczne
const { default: COND, COND_GROUPS } = await import('../src/data/conditions.js');
const CASES = (await import('../src/data/cases.js')).default;
const NERVES_KB = (await import('../src/data/nerves.js')).default ?? (await import('../src/data/nerves.js')).NERVES;
const metaAll = JSON.parse(fs.readFileSync('public/data/meta.json', 'utf8'));
const boneNames = new Set(metaAll.filter((m) => m.f === 'skeleton').map((m) => m.n)), cnsNames = new Set(metaAll.filter((m) => m.f === 'cns').map((m) => m.n));
for (const [id, c] of Object.entries(COND)) {
  for (const f of ['pl', 'lat', 'grp', 'def', 'mech', 'ryzyko', 'objawy', 'badanie', 'roznic', 'fizjo', 'rokowanie', 'viz']) if (!c[f]) { console.log(`[schorzenie ${id}] brak pola ${f}`); bad++; }
  if (!COND_GROUPS.some(([g]) => g === c.grp)) { console.log(`[schorzenie ${id}] nieznana grupa ${c.grp}`); bad++; }
  const v = c.viz ?? {};
  if (!ANIM[v.anim]) { console.log(`[schorzenie ${id}] brak animacji ${v.anim}`); bad++; }
  for (const k of [...(v.muscles ?? []), ...(v.inv ?? [])]) if (!allKb[k]) { console.log(`[schorzenie ${id}] brak mięśnia: ${k}`); bad++; }
  for (const k of v.nerves ?? []) if (NERVES_KB && !NERVES_KB[k]) { console.log(`[schorzenie ${id}] brak nerwu: ${k}`); bad++; }
  for (const k of v.joints ?? []) if (!JOINTS[k]) { console.log(`[schorzenie ${id}] brak stawu: ${k}`); bad++; }
  for (const n of v.bones ?? []) if (!boneNames.has(n)) { console.log(`[schorzenie ${id}] brak kości: ${n}`); bad++; }
  for (const n of v.cns ?? []) if (!cnsNames.has(n.split('|')[0])) { console.log(`[schorzenie ${id}] brak struktury OUN: ${n}`); bad++; }
  for (const t of c.tests ?? []) if (!FT[t] && !CT[t]) { console.log(`[schorzenie ${id}] brak testu: ${t}`); bad++; }
  if (!v.caption) { console.log(`[schorzenie ${id}] brak opisu wizualizacji`); bad++; }
}
for (const c of CASES) {
  for (const k of [c.cond, ...c.dx]) if (!COND[k]) { console.log(`[przypadek ${c.id}] brak schorzenia: ${k}`); bad++; }
  if (new Set([c.cond, ...c.dx]).size !== 4) { console.log(`[przypadek ${c.id}] potrzebne 4 różne rozpoznania`); bad++; }
  if (!(c.step?.opts?.[c.step.ok])) { console.log(`[przypadek ${c.id}] zła odpowiedź w kroku 2`); bad++; }
}
console.log(`schorzenia: ${Object.keys(COND).length} | przypadki: ${CASES.length}`);
console.log(`testy funkcjonalne: ${Object.keys(FT).length} | kliniczne: ${Object.keys(CT).length} | animacje: ${Object.keys(ANIM).length}`);
const { ROOTS } = await import('../src/data/roots.js');
const labelNames = new Set(JSON.parse(fs.readFileSync('public/data/labels.json', 'utf8')).map((l) => l.n));
for (const [id, r] of Object.entries(ROOTS)) {
  if (r.myo) { if (!allKb[r.myo.muscle]) { console.log(`[korzeń ${id}] brak mięśnia: ${r.myo.muscle}`); bad++; } if (!moveIds.has(r.myo.move)) { console.log(`[korzeń ${id}] brak ruchu: ${r.myo.move}`); bad++; } }
  const at = r.derm?.at; if (!at) { console.log(`[korzeń ${id}] brak dermatomu`); bad++; continue; }
  if (at.lm && !labelNames.has(at.lm)) { console.log(`[korzeń ${id}] brak punktu kostnego: ${at.lm}`); bad++; }
  if (at.mesh && !names.all.has(at.mesh)) { console.log(`[korzeń ${id}] brak siatki: ${at.mesh}`); bad++; }
}
const { STRUCT_KEYS } = await import('../src/data/struct_kb.js');
for (const k of STRUCT_KEYS) if (!names.all.has(k)) { console.log(`[opis struktury] brak siatki: ${k}`); bad++; }
// pokrycie polskich nazw (siatki bez wpisu w bazie mięśni/nerwów wyświetlają się nazwą ze słownika)
const { polishName } = await import('../src/data/names.js');
const cov = {};
for (const m of meta) { if (m.f === 'insertions' || used.has(m.n)) continue; const c = (cov[m.f] ??= { ok: 0, all: 0 }); c.all++; if (polishName(m.n)) c.ok++; }
console.log('polskie nazwy:', Object.entries(cov).map(([f, c]) => `${f} ${Math.round((100 * c.ok) / c.all)}%`).join(' · '));
for (const [f, c] of Object.entries(cov)) if (c.ok / c.all < 0.95) { console.log(`[nazwy] warstwa ${f}: pokrycie poniżej 95%`); bad++; }
console.log('błędy:', bad, '| mięśnie bez opisu:', un.length, un.join('; '));
if (bad) process.exit(1);
