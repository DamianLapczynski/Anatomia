// Test dymny: uruchamia zbudowaną aplikację (dist/) w Chromium, przechodzi przez tryby i typowe akcje,
// a na końcu zgłasza błędy konsoli. Użycie: npm test (najpierw build) albo node tools/smoke.mjs [--shots katalog].
// Wymaga Playwright z Chromium (npm run reel:setup instaluje oba).
import { preview } from 'vite';
import fs from 'node:fs';

const shotsAt = process.argv.indexOf('--shots');
const SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

let chromium, devices;
try { ({ chromium, devices } = await import('playwright')); } catch {
  const { createRequire } = await import('node:module');
  ({ chromium, devices } = createRequire(import.meta.url)('playwright'));
}

const server = await preview({ preview: { port: 4174, strictPort: false }, logLevel: 'silent' });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const failures = [];

async function run(name, ctxOpt, steps) {
  const ctx = await browser.newContext(ctxOpt);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForSelector('#loading', { state: 'hidden', timeout: 120000 });
  const shot = async (n) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-${n}.png` }); };
  for (const [label, fn] of steps) {
    try { await fn(page); await page.waitForTimeout(700); await shot(label); } catch (e) { errors.push(`${label}: ${e.message.split('\n')[0]}`); }
  }
  // błędy sieci z zewnętrznych usług (np. logowanie) nie są błędami aplikacji
  const real = errors.filter((e) => !/firebase|googleapis|ERR_|Failed to load resource/i.test(e));
  console.log(`${name}: ${steps.length} kroków, błędy: ${real.length}`);
  real.forEach((e) => console.log('  ✗', e));
  failures.push(...real.map((e) => `${name}: ${e}`));
  await ctx.close();
}

const mode = (m) => async (p) => { await p.click(`#modes [data-mode=${m}]`); };
const search = (text) => async (p) => {
  await p.fill('#q', text); await p.waitForSelector('#results .r', { timeout: 5000 }); await p.click('#results .r');
};
const clickText = (sel, text) => async (p) => { await p.locator(sel, { hasText: text }).first().click(); };

const common = [
  ['atlas', mode('atlas')],
  ['szukaj-miesien', search('naramienny')],
  ['szukaj-nerw', search('przeponowy')],
  ['szukaj-nerw-skorny', search('skórny boczny uda')],
  ['szukaj-kosc', search('kość łódeczkowata')],
  ['szukaj-krag', search('kręg L4')],
  ['szukaj-tetnica', search('tętnica kręgowa')],
  ['szukaj-staw', search('staw kolanowy')],
  ['staw-test', clickText('#panelBody .test', 'Lachmana')],
  ['staw-wiezadlo', clickText('#panelBody .it', 'krzyżowe tylne')],
  ['szukaj-wiezadlo', search('więzadło skokowo-strzałkowe przednie')],
  ['nauka', mode('learn')],
  ['nauka-staw', clickText('#panelBody .it', 'Staw ramienny')],
  ['nauka-wroc', mode('learn')],
  ['nauka-nerw', clickText('#panelBody .it', 'pośladkowy dolny')],
  ['nauka-kompleks', async (p) => { await mode('learn')(p); await p.click('#panelBody [data-act=home]').catch(() => {}); await clickText('#panelBody .it', 'Gęsia stopa')(p); }],
  ['nauka-stozek', async (p) => { await p.click('#panelBody [data-act=home]').catch(() => {}); await clickText('#panelBody .it', 'Stożek rotatorów')(p); }],
  ['nauka-kanal', async (p) => { await p.click('#panelBody [data-act=home]').catch(() => {}); await clickText('#panelBody .it', 'Kanał nadgarstka')(p); }],
  ['szukaj-kompleks', search('trójkąt udowy')],
  ['ruch', mode('motion')],
  ['klinika', mode('clinic')],
  ['klinika-nerw', clickText('#panelBody .it', 'Nerw promieniowy')],
  ['klinika-korzen', async (p) => { await p.click('#panelBody [data-act=home]'); await p.click('#panelBody [data-root=L5]'); }],
  ['klinika-badanie', async (p) => { await p.click('#panelBody [data-act=home]'); await p.click('#panelBody [data-act=exam]'); }],
  ['klinika-quiz', async (p) => { await p.click('#panelBody [data-act=home]'); await p.click('#panelBody [data-act=quiz]'); }],
  ['klinika-odp', async (p) => { await p.click('#panelBody [data-opt="0"]'); }],
  ['quiz', mode('quiz')],
  ['powtorki', mode('srs')],
];
const steps = [...common];

await run('desktop', { viewport: { width: 1440, height: 900 } }, steps);
await run('telefon', devices['iPhone 13'], steps.filter(([l]) => !l.startsWith('desktop-')));

await browser.close();
await new Promise((r) => server.httpServer.close(r));
if (failures.length) { console.log(`\nNIEPOWODZENIE: ${failures.length} błędów`); process.exit(1); }
console.log('\nOK');
