// Kontrola póz testów funkcjonalnych: w kluczowych klatkach mierzy punkty kontaktu z podłożem (kozetka, mata, podłoga,
// krzesło) i zapisuje zrzuty do przeglądu. Użycie: npm run build && node tools/pose_check.mjs [--shots katalog] [klucz…]
// Wymaga Playwright z Chromium (npm run reel:setup).
import { preview } from 'vite';
import fs from 'node:fs';

const args = process.argv.slice(2);
const at = args.indexOf('--shots');
const SHOTS = at >= 0 ? args[at + 1] : null;
const only = args.filter((a, i) => !a.startsWith('--') && (at < 0 || i !== at + 1));
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

let chromium;
try { ({ chromium } = await import('playwright')); } catch { const { createRequire } = await import('node:module'); ({ chromium } = createRequire(import.meta.url)('playwright')); }

const COUCH = 0.66, MAT = 0.012, TOL = 0.015;
// [klucz animacji, klatki (k), widok, kontrole: [opis, punkty, powierzchnia, tryb]]
// tryb 'touch' – co najmniej jeden z punktów leży na powierzchni (±TOL); 'each' – każdy z punktów na powierzchni;
// 'above' – żaden punkt nie przenika w głąb powierzchni o więcej niż TOL
const CASES = [
  ['aslr', [0, 0.55], 'side', [['tył ciała na blacie', ['occiput', 'sacrum', 'heelBack.l', 'heelBack.r', 'scap.l', 'scap.r'], COUCH, 'touch'], ['potylica, kość krzyżowa, pięta P na blacie', ['occiput', 'sacrum', 'heelBack.r'], COUCH, 'each'], ['nic nie przenika blatu', ['occiput', 'sacrum', 'heelBack.l', 'heelBack.r', 'scap.l', 'scap.r', 'calf.l', 'calf.r'], COUCH, 'above']]],
  ['sorensen', [0, 0.6], 'side', [['uda i kolana na blacie', ['asis.l', 'asis.r', 'knee.l', 'knee.r'], COUCH, 'touch'], ['miednica na blacie', ['asis.l', 'asis.r'], COUCH, 'touch'], ['nic nie przenika blatu', ['asis.l', 'asis.r', 'knee.l', 'knee.r', 'thighFront.l', 'thighFront.r', 'toeTip.l', 'toeTip.r'], COUCH, 'above']]],
  ['sidebridge', [0, 0.6], 'front', [['przedramię na macie', ['forearm.r', 'forearmLat.r', 'elbow.r'], MAT, 'touch'], ['stopa na macie', ['mt5.r', 'heel.r'], MAT, 'touch'], ['nic nie przenika maty', ['forearm.r', 'forearmLat.r', 'elbow.r', 'mt5.r', 'heel.r', 'trochanter.r', 'humerusLat.r'], MAT, 'above']]],
  ['pushup', [0, 0.5], 'side', [['dłonie na macie', ['palm.l', 'palm.r'], MAT, 'touch'], ['palce stóp na macie', ['toeTip.l', 'toeTip.r', 'mt1.l', 'mt1.r'], MAT, 'touch'], ['nic nie przenika maty', ['palm.l', 'palm.r', 'toeTip.l', 'toeTip.r', 'knee.l', 'knee.r', 'sternum', 'forehead', 'chin'], MAT, 'above']]],
  ['rotary', [0, 0.42], 'side', [['dłonie na macie', ['palm.l'], MAT, 'touch'], ['kolano na macie', ['kneeLow.r', 'knee.r'], MAT, 'touch'], ['nic nie przenika maty', ['palm.l', 'palm.r', 'kneeLow.l', 'kneeLow.r', 'knee.l', 'knee.r', 'toeTip.l', 'toeTip.r'], MAT, 'above']]],
  ['sts', [0, 0.3, 0.55], 'side', [['stopy na podłodze', ['heel.l', 'heel.r', 'mt1.l', 'mt1.r'], 'floor', 'each']]],
  ['tug', [0, 0.25, 0.5, 0.7], 'side', [['stopa na podłodze', ['heel.l', 'heel.r', 'mt1.l', 'mt1.r', 'mt5.l', 'mt5.r'], 'floor', 'touch'], ['nic pod podłogą', ['heel.l', 'heel.r', 'mt1.l', 'mt1.r', 'toeTip.l', 'toeTip.r'], 'floor', 'above']]],
  ['reach', [0, 0.6], 'side', [['stopy na podłodze', ['heel.l', 'heel.r', 'mt1.l', 'mt1.r'], 'floor', 'each']]],
  ['sls', [0.5], 'front', [['stopa podporowa na podłodze', ['heel.r', 'mt1.r'], 'floor', 'each']]],
  ['slsquat', [0.5], 'side', [['stopa podporowa na podłodze', ['heel.r', 'mt1.r'], 'floor', 'each']]],
  ['deepsquat', [0.5], 'side', [['stopy na podłodze', ['heel.l', 'heel.r', 'mt1.l', 'mt1.r'], 'floor', 'each']]],
  ['ybalance', [0.15, 0.45, 0.78], 'front', [['stopa podporowa', ['heel.r', 'mt1.r'], 'floor', 'each']]],
  ['lunge', [0.5], 'side', [['stopa przednia', ['heel.l', 'mt1.l'], 'floor', 'each'], ['palce tylnej stopy', ['mt1.r', 'toeTip.r'], 'floor', 'touch']]],
  ['hurdle', [0.3], 'side', [['stopa podporowa', ['heel.r', 'mt1.r'], 'floor', 'each']]],
  ['shoulder', [0.5], 'back', []],
  ['stepdown', [0.5], 'front', []],
  ['hop', [0.25, 0.55], 'side', []],
  ['gait', [0.2], 'side', [['stopa na podłodze', ['heel.l', 'heel.r', 'mt1.l', 'mt1.r'], 'floor', 'touch']]],
  ['stairs', [0.25, 0.42, 0.6], 'side', [['stopa na podłodze lub stopniu', ['heel.l', 'heel.r'], 'floor', 'above']]],
  ['sts_cross', [0.55], 'front', []],
  // warianty z błędem
  ['sls_error', [0.6], 'back', [['stopa podporowa na podłodze', ['heel.r', 'mt1.r'], 'floor', 'each']]],
  ['slsquat_error', [0.5], 'front', [['stopa podporowa na podłodze', ['heel.r', 'mt1.r'], 'floor', 'each']]],
  ['stepdown_error', [0.5], 'front', []],
  ['deepsquat_error', [0.5], 'side', [['stopy na podłodze', ['heel.l', 'heel.r', 'mt1.l', 'mt1.r'], 'floor', 'each']]],
  ['aslr_error', [0.55], 'side', [['nic nie przenika blatu', ['occiput', 'sacrum', 'heelBack.r', 'scap.l', 'scap.r'], COUCH, 'above']]],
  ['sorensen_error', [0.4, 0.8], 'side', [['miednica na blacie', ['asis.l', 'asis.r'], COUCH, 'touch']]],
  ['sidebridge_error', [0.6], 'front', [['przedramię na macie', ['forearm.r', 'forearmLat.r', 'elbow.r'], MAT, 'touch'], ['nic nie przenika maty', ['forearm.r', 'elbow.r', 'mt5.r', 'heel.r', 'trochanter.r'], MAT, 'above']]],
  ['pushup_error', [0.5], 'side', [['dłonie na macie', ['palm.l', 'palm.r'], MAT, 'touch'], ['nic nie przenika maty', ['palm.l', 'palm.r', 'toeTip.l', 'toeTip.r', 'knee.l', 'knee.r'], MAT, 'above']]],
  ['rotary_error', [0.5], 'side', [['nic nie przenika maty', ['palm.l', 'palm.r', 'kneeLow.l', 'kneeLow.r', 'knee.l', 'knee.r'], MAT, 'above']]],
  ['sts_error', [0.4], 'side', [['stopy na podłodze', ['heel.l', 'heel.r'], 'floor', 'each']]],
  ['reach_error', [0.6], 'side', [['stopy na podłodze', ['heel.l', 'heel.r'], 'floor', 'each']]],
  ['hop3', [0.17, 0.5], 'side', []],
  ['romberg', [0.7], 'side', []],
  ['foursquare', [0.45], 'front', []],
  // testy kliniczne z zajęć
  ['fairbank', [0, 0.6], 'side', [['tył ciała na blacie', ['occiput', 'sacrum'], COUCH, 'each'], ['nic nie przenika blatu', ['occiput', 'sacrum', 'scap.l', 'scap.r', 'heelBack.l', 'heelBack.r', 'calf.l', 'calf.r', 'thighBack.l', 'thighBack.r'], COUCH, 'above']]],
  ['slr', [0.6], 'side', [['potylica i kość krzyżowa na blacie', ['occiput', 'sacrum'], COUCH, 'each'], ['nic nie przenika blatu', ['occiput', 'sacrum', 'scap.l', 'scap.r', 'heelBack.l', 'heelBack.r', 'calf.l', 'calf.r', 'thighBack.l', 'thighBack.r'], COUCH, 'above']]],
  ['bragard', [0.7], 'side', [['kość krzyżowa na blacie', ['sacrum'], COUCH, 'each'], ['nic nie przenika blatu', ['occiput', 'sacrum', 'scap.l', 'scap.r', 'heelBack.l', 'heelBack.r', 'calf.l', 'calf.r', 'thighBack.l', 'thighBack.r'], COUCH, 'above']]],
  ['faber', [0.6], 'side', [['kość krzyżowa na blacie', ['sacrum', 'occiput'], COUCH, 'touch'], ['nic nie przenika blatu', [...['occiput', 'sacrum', 'scap.l', 'scap.r', 'heelBack.l', 'heelBack.r', 'calf.l', 'calf.r', 'thighBack.l', 'thighBack.r'], 'knee.r', 'heel.r', 'mt5.r'], COUCH, 'above']]],
  ['faddir', [0.6], 'side', [['tył ciała na blacie', ['sacrum', 'occiput'], COUCH, 'touch'], ['nic nie przenika blatu', ['occiput', 'sacrum', 'scap.l', 'scap.r', 'heelBack.l', 'heelBack.r', 'calf.l', 'calf.r', 'thighBack.l', 'thighBack.r'], COUCH, 'above']]],
  ['lachman', [0.45], 'side', [['tył ciała na blacie', ['sacrum', 'occiput'], COUCH, 'touch'], ['nic nie przenika blatu', ['occiput', 'sacrum', 'scap.l', 'scap.r', 'heelBack.l', 'heelBack.r', 'calf.l', 'calf.r', 'thighBack.l', 'thighBack.r'], COUCH, 'above']]],
  ['drawer_ant', [0.45], 'side', [['stopa na blacie', ['heel.r', 'mt1.r', 'heelBack.r'], COUCH, 'touch'], ['nic nie przenika blatu', [...['occiput', 'sacrum', 'scap.l', 'scap.r', 'heelBack.l', 'heelBack.r', 'calf.l', 'calf.r', 'thighBack.l', 'thighBack.r'], 'heel.r', 'mt1.r', 'mt5.r'], COUCH, 'above']]],
  ['drawer_post', [0.45], 'side', [['stopa na blacie', ['heel.r', 'mt1.r', 'heelBack.r'], COUCH, 'touch']]],
  ['valgus', [0.32], 'side', [['nic nie przenika blatu', ['occiput', 'sacrum', 'scap.l', 'scap.r', 'heelBack.l', 'heelBack.r', 'calf.l', 'calf.r', 'thighBack.l', 'thighBack.r'], COUCH, 'above']]],
  ['mcmurray', [0.15, 0.45], 'side', [['tył ciała na blacie', ['sacrum', 'occiput'], COUCH, 'touch'], ['nic nie przenika blatu', ['occiput', 'sacrum', 'scap.l', 'scap.r', 'heelBack.l', 'heelBack.r', 'calf.l', 'calf.r', 'thighBack.l', 'thighBack.r'], COUCH, 'above']]],
  ['thomas', [0.6], 'side', [['lewa kończyna na blacie', ['heelBack.l', 'thighBack.l'], COUCH, 'each'], ['nic nie przenika blatu', ['occiput', 'sacrum', 'scap.l', 'scap.r', 'heelBack.l', 'heelBack.r', 'calf.l', 'calf.r', 'thighBack.l', 'thighBack.r'], COUCH, 'above']]],
  ['thomas_error', [0.6], 'side', [['nic nie przenika blatu', ['occiput', 'sacrum', 'scap.l', 'scap.r', 'heelBack.l', 'heelBack.r', 'calf.l', 'calf.r', 'thighBack.l', 'thighBack.r'], COUCH, 'above']]],
  ['kendall', [0, 0.6], 'side', [['udo lewe na blacie', ['thighBack.l'], COUCH, 'each'], ['nic nie przenika blatu', ['occiput', 'sacrum', 'scap.l', 'scap.r', 'thighBack.l', 'thighBack.r'], COUCH, 'above']]],
  ['mennell', [0, 0.15, 0.48], 'side', [['przód ciała na blacie', ['asis.l', 'asis.r', 'sternum', 'knee.l', 'thighFront.l'], COUCH, 'touch'], ['nic nie przenika blatu', ['forehead', 'sternum', 'asis.l', 'asis.r', 'knee.l', 'knee.r', 'thighFront.l', 'thighFront.r', 'toeTip.l', 'toeTip.r'], COUCH, 'above']]],
  ['apley_knee', [0.25], 'side', [['przód ciała na blacie', ['asis.l', 'asis.r', 'knee.l', 'sternum', 'forehead'], COUCH, 'touch'], ['nic nie przenika blatu', ['forehead', 'sternum', 'asis.l', 'asis.r', 'knee.l', 'knee.r', 'thighFront.l', 'thighFront.r'], COUCH, 'above']]],
  ['hip_ir', [0.6], 'back', [['kolana na blacie', ['knee.l', 'knee.r'], COUCH, 'touch'], ['nic nie przenika blatu', ['forehead', 'sternum', 'asis.l', 'asis.r', 'knee.l', 'knee.r', 'thighFront.l', 'thighFront.r'], COUCH, 'above']]],
  ['ober', [0.35, 0.75], 'front', [['bok na blacie', ['trochanter.l', 'humerusLat.l', 'kneeLat.l'], COUCH, 'touch'], ['nic nie przenika blatu', ['trochanter.l', 'humerusLat.l', 'kneeLat.l', 'knee.l', 'ankleMed.l'], COUCH, 'above']]],
  ['slump', [0, 0.5], 'side', [['siad na kozetce', ['ischium.l', 'ischium.r'], COUCH, 'touch'], ['nic nie przenika blatu', ['ischium.l', 'ischium.r', 'thighBack.l', 'thighBack.r'], COUCH, 'above']]],
  ['wallangel', [0, 0.45], 'front', [['siad na podłodze', ['ischium.l', 'ischium.r'], 'floor', 'touch'], ['stopy na podłodze', ['heel.l', 'heel.r'], 'floor', 'touch']]],
  ['fingerfloor', [0.6], 'side', [['stopy na podłodze', ['heel.l', 'heel.r', 'mt1.l', 'mt1.r'], 'floor', 'each']]],
  // animacje schorzeń
  ['ankle_inv', [0.6], 'front', [['stopa podporowa na podłodze', ['heel.l', 'mt1.l'], 'floor', 'each']]],
  ['hemi_gait', [0.3, 0.6], 'side', [['stopa na podłodze', ['heel.l', 'heel.r', 'mt1.l', 'mt1.r', 'toeTip.r'], 'floor', 'touch'], ['nic pod podłogą', ['heel.l', 'heel.r', 'mt1.l', 'mt1.r'], 'floor', 'above']]],
  ['park_gait', [0.3, 0.6], 'side', [['stopa na podłodze', ['heel.l', 'heel.r', 'mt1.l', 'mt1.r'], 'floor', 'touch'], ['nic pod podłogą', ['heel.l', 'heel.r', 'mt1.l', 'mt1.r'], 'floor', 'above']]],
  ['steppage', [0.3, 0.6], 'side', [['stopa na podłodze', ['heel.l', 'heel.r', 'mt1.l', 'toeTip.r'], 'floor', 'touch'], ['nic pod podłogą', ['heel.l', 'heel.r', 'mt1.l', 'toeTip.r', 'toeTip.l'], 'floor', 'above']]],
  ['stenosis_walk', [0.3, 0.8], 'side', [['stopa na podłodze', ['heel.l', 'heel.r', 'mt1.l', 'mt1.r'], 'floor', 'touch']]],
  ['flexed_stand', [0.6], 'side', [['stopy na podłodze', ['heel.l', 'heel.r'], 'floor', 'each']]],
  ['golfer', [0.5], 'side', []], ['wrist_drop', [0.6], 'side', []], ['hands_fwd', [0.6], 'front', []], ['neck_ext', [0.6], 'side', []],
  ['neer', [0.5], 'side', []], ['hawkins', [0.6], 'front', []], ['phalen', [0.6], 'front', []], ['jobe', [0.6], 'front', []], ['gerber', [0.7], 'back', []],
];

const server = await preview({ preview: { port: 4183, strictPort: false }, logLevel: 'silent' });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${url}?debug`, { waitUntil: 'load' });
await page.waitForSelector('#loading', { state: 'hidden', timeout: 120000 });
await page.addStyleTag({ content: '#left,#panel,#top,#hud{display:none!important}' });
await page.evaluate(() => { window.__engine.setInsets({}); window.__engine.resize(); });

let fails = 0;
// punkty strzałek, znaczników bólu i przypięć istnieją w modelu
const missing = await page.evaluate(() => window.__ptCheck?.() ?? ['brak __ptCheck']);
for (const m of missing) { console.log('✗ brak punktu:', m); fails++; }
for (const [key, ks, view, checks] of CASES) {
  if (only.length && !only.includes(key)) continue;
  for (const k of ks) {
    const res = await page.evaluate(async ({ key, k, view, checks }) => {
      const M = window.__motion, E = window.__engine, model = window.__model;
      const ok = M.setup({ rig: `test:${key}` }, 'r', []);
      if (!ok) return { err: 'setup' };
      M.set(k);
      if (window.__props) window.__props(key);
      const B = M._body, floor = 0;
      E.apply((m) => (m.f === 'skeleton' ? 'base:bones' : null));
      const ids = model.meta.filter((m) => m.f === 'skeleton').map((m) => m.id);
      const V3 = E.camera.position.constructor, Box3 = E.boxOf([]).constructor;
      const pts = ids.map((id) => { const b = model.meta[id].bb; return M.pointAt(new V3((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2), id); });
      const bx = new Box3().setFromPoints(pts);
      const dir = view === 'side' ? [1, 0.15, 0.15] : view === 'back' ? [0.2, 0.15, -1] : [0.15, 0.15, 1];
      E.focus(bx, { dir: new V3(...dir).normalize(), pad: 1.15, ms: 0 });
      const out = [];
      for (const [label, names, surf, mode] of checks) {
        const y0 = surf === 'floor' ? floor : surf;
        const d = names.filter((n) => B.pt[n]).map((n) => ({ n, dy: M.pointAt(B.pt[n].p, B.pt[n].id).y - (B.pt[n].off ?? 0) - y0 }));
        const tol = 0.015;
        const pass = mode === 'touch' ? d.some((x) => Math.abs(x.dy) <= tol) : mode === 'each' ? d.every((x) => Math.abs(x.dy) <= 0.025) : d.every((x) => x.dy >= -tol);
        out.push({ label, pass, d: d.map((x) => `${x.n} ${(x.dy * 100).toFixed(1)}`).join(', ') });
      }
      return { out };
    }, { key, k, view, checks });
    await page.waitForTimeout(250);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${key}-${String(k).replace('.', '_')}.png` });
    if (res.err) { console.log(`✗ ${key} k=${k}: ${res.err}`); fails++; continue; }
    for (const c of res.out) { console.log(`${c.pass ? '✓' : '✗'} ${key} k=${k} – ${c.label}${c.pass ? '' : ` [cm: ${c.d}]`}`); if (!c.pass) fails++; }
    if (!res.out.length) console.log(`· ${key} k=${k} (tylko zrzut)`);
  }
}
if (errors.length) { console.log('Błędy strony:', errors); fails += errors.length; }
await browser.close();
await new Promise((r) => server.httpServer.close(r));
console.log(fails ? `\n${fails} niezgodności` : '\nOK');
process.exit(fails ? 1 : 0);
