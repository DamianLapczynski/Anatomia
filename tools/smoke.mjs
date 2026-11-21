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
// element może leżeć w zwiniętej sekcji (Nauka) – rozwijamy ją jak użytkownik, potem klikamy
const clickText = (sel, text) => async (p) => {
  const l = p.locator(sel, { hasText: text }).first();
  await l.evaluate((el) => { const d = el.closest('details'); if (d && !d.open) d.open = true; });
  await l.click();
};

const common = [
  ['atlas', mode('atlas')],
  ['szukaj-miesien', search('naramienny')],
  ['notatka', async (p) => { await p.click('.note-card summary'); await p.fill('textarea[data-note]', 'Test notatki z dymu'); await p.waitForTimeout(600); }],
  ['notatka-po-przeladowaniu', async (p) => { await p.reload(); await p.waitForSelector('#loading', { state: 'hidden', timeout: 120000 }); await search('naramienny')(p); const v = await p.inputValue('textarea[data-note]'); if (v !== 'Test notatki z dymu') throw new Error(`notatka nie zapisała się: „${v}”`); }],
  ['szukaj-nerw', search('przeponowy')],
  ['szukaj-nerw-skorny', search('skórny boczny uda')],
  ['szukaj-kosc', search('kość łódeczkowata')],
  ['szukaj-krag', search('kręg L4')],
  ['szukaj-tetnica', search('tętnica kręgowa')],
  ['szukaj-staw', search('staw kolanowy')],
  ['staw-test', clickText('#panelBody .test', 'Lachmana')],
  ['staw-wiezadlo', clickText('#panelBody .it', 'krzyżowe tylne')],
  ['szukaj-wiezadlo', search('więzadło skokowo-strzałkowe przednie')],
  ['desktop-klawiatura', async (p) => {
    await mode('atlas')(p);
    const el = p.locator('#left [data-layer=joints]'); const before = await el.getAttribute('aria-checked');
    await el.focus(); await p.keyboard.press('Space'); await p.waitForTimeout(300);
    const after = await p.locator('#left [data-layer=joints]').getAttribute('aria-checked');
    if (before === after) throw new Error('Spacja nie przełączyła warstwy');
    await p.locator('#left [data-layer=joints]').focus(); await p.keyboard.press('Enter');
  }],
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
  ['ft-lista', async (p) => { await p.click('#panelBody [data-act=home]'); await p.click('#panelBody [data-act=ft]'); }],
  ['ft-sts', async (p) => { await p.click('#panelBody [data-ft-open=cst30]'); await p.waitForTimeout(2500); }],
  ['ft-com', async (p) => { await p.click('#panelBody [data-ft=com]'); await p.waitForTimeout(1500); }],
  ['ft-blad', async (p) => { await p.click('#panelBody [data-ft=err]'); await p.waitForTimeout(2500); }],
  ['ft-sorensen', async (p) => { await p.click('#panelBody [data-ft=list]'); await p.click('#panelBody [data-ft-open=sorensen]'); await p.waitForTimeout(2500); }],
  ['ft-kliniczny', async (p) => { await p.click('#panelBody [data-ft=list]'); await p.click('#panelBody [data-ft-open=lachman]'); await p.waitForTimeout(2000); }],
  ['ft-kliniczny-dodatni', async (p) => { await p.click('#panelBody [data-ft=err]'); await p.waitForTimeout(2000); }],
  ['ft-slump', async (p) => { await p.click('#panelBody [data-ft=list]'); await p.click('#panelBody [data-ft-open=slump]'); await p.waitForTimeout(2500); }],
  ['ft-szukaj', search('Timed Up and Go')],
  ['ft-szukaj-kliniczny', search('McMurray')],
  ['klinika-quiz', async (p) => { await mode('clinic')(p); await p.click('#panelBody [data-ft=list]', { timeout: 15000 }); await p.click('#panelBody [data-ft=back]', { timeout: 15000 }); await p.click('#panelBody [data-act=quiz]'); }],
  ['klinika-odp', async (p) => { await p.click('#panelBody [data-opt="0"]'); }],
  ['schorzenia', mode('cond')],
  ['sch-karta', async (p) => { await p.click('#panelBody [data-cond-open=epi_lat]'); await p.waitForTimeout(2500); }],
  ['sch-udar', async (p) => { await p.click('#panelBody [data-cd=back]'); await p.fill('#condq', 'udar'); await p.click('#panelBody [data-cond-open=stroke]'); await p.waitForTimeout(3000); }],
  ['sch-nerw', async (p) => { await p.click('#panelBody [data-cd=back]'); await p.fill('#condq', ''); await p.click('#panelBody [data-cond-open=peroneal_palsy]'); await p.waitForTimeout(2500); }],
  ['sch-quiz', async (p) => { await p.click('#panelBody [data-cd=back]'); await p.click('#panelBody [data-cd=quiz]'); await p.click('#panelBody [data-cd-scope=all]'); await p.click('#panelBody [data-cd-opt="0"]'); }],
  ['sch-przypadek', async (p) => { await p.click('#panelBody [data-cd=home]'); await p.click('#panelBody [data-cd=cases]'); await p.click('#panelBody [data-case-open=c1]'); await p.click('#panelBody [data-case-a1="0"]'); await p.click('#panelBody [data-case-a2="1"]'); }],
  ['sch-szukaj', search('łokieć tenisisty')],
  ['quiz', mode('quiz')],
  ['egzamin', async (p) => { await mode('quiz')(p); await p.click('#panelBody [data-act=exam]'); await p.click('#panelBody [data-ex-preset=kd]'); await p.click('#panelBody [data-ex-count="10"]'); await p.click('#panelBody [data-ex=start]'); }],
  ['egzamin-pytania', async (p) => { for (let i = 0; i < 10; i++) { await p.click('#panelBody [data-exopt="0"]'); await p.waitForTimeout(150); } }],
  ['egzamin-testy', async (p) => { await mode('atlas')(p); await mode('quiz')(p); await p.click('#panelBody [data-act=exam]'); await p.click('#panelBody [data-ex-preset=func]'); await p.click('#panelBody [data-ex-count="10"]'); await p.click('#panelBody [data-ex=start]'); for (let i = 0; i < 10; i++) { await p.click('#panelBody [data-exopt="0"]', { timeout: 5000 }); await p.waitForTimeout(150); } }],
  ['powtorki', mode('srs')],
];
// SMOKE_ONLY=regex – tylko wybrane kroki (szybkie sprawdzenie jednego obszaru)
const steps = process.env.SMOKE_ONLY ? common.filter(([l]) => new RegExp(process.env.SMOKE_ONLY).test(l)) : [...common];

await run('desktop', { viewport: { width: 1440, height: 900 } }, steps);
await run('telefon', devices['iPhone 13'], steps.filter(([l]) => !l.startsWith('desktop-')));

await browser.close();
await new Promise((r) => server.httpServer.close(r));
if (failures.length) { console.log(`\nNIEPOWODZENIE: ${failures.length} błędów`); process.exit(1); }
console.log('\nOK');
