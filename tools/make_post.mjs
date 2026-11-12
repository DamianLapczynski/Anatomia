// Generuje karuzelę 5 slajdów 1080×1350 (PNG) o wybranym mięśniu + opis posta.
//   node tools/make_post.mjs naramienny
//   node tools/make_post.mjs --plan 1-7      (dni z planu serii)   |   --week 2   |   --list
// Działa samodzielnie, bez Claude'a. Jednorazowa instalacja: npm install && npm run reel:setup
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const opt = (name, def = null) => { const i = args.indexOf(`--${name}`); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (name) => { const i = args.indexOf(`--${name}`); if (i < 0) return false; args.splice(i, 1); return true; };
const side = opt('side', 'r'), outDir = opt('out', 'posts'), weekArg = opt('week'), nextArg = opt('next');
let planArg = opt('plan'); if (weekArg) planArg = `${(weekArg - 1) * 7 + 1}-${weekArg * 7}`;
const list = flag('list'), force = flag('force'), software = flag('software') || (process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY);
if (!planArg) { const i = args.findIndex((x, k) => /^\d+(-\d+)?$/.test(x) && !(k > 0 && args[k - 1].startsWith('--'))); if (i >= 0) planArg = args.splice(i, 1)[0]; }
const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/^(miesien|miesnie|m\.|mm\.|musculus)\s+/, '').trim();
const MUSCLES = { ...(await import('../src/data/muscles_upper.js')).default, ...(await import('../src/data/muscles_lower.js')).default, ...(await import('../src/data/muscles_trunk.js')).default };
const find = (q) => { const f = fold(q); return Object.keys(MUSCLES).find((k) => k === q || fold(k.replace(/_/g, ' ')) === f || fold(MUSCLES[k].pl) === f || fold(MUSCLES[k].lat) === f) ?? Object.keys(MUSCLES).find((k) => fold(MUSCLES[k].pl).includes(f) || fold(MUSCLES[k].lat).includes(f)); };
if (list) { for (const [k, m] of Object.entries(MUSCLES)) console.log(`  ${k.padEnd(34)} ${m.lat}`); process.exit(0); }

let jobs = [];
if (planArg) {
  const { plan } = await import('./reel_plan.mjs');
  const [a, b = a] = planArg.split('-').map(Number);
  jobs = plan().filter((d) => d.day >= a && d.day <= b).map((d) => ({ key: d.key, next: d.nextKey ? MUSCLES[d.nextKey].lat : null, dir: `d${String(d.day).padStart(3, '0')}-${d.date}-${d.key}` }));
} else {
  if (!args.length) { console.error('Podaj mięsień, np.: node tools/make_post.mjs naramienny   (lista: --list)'); process.exit(1); }
  for (const q of args) { const key = find(q); if (!key) { console.error(`Nie znam mięśnia „${q}”. Zobacz --list.`); process.exit(1); } jobs.push({ key, next: nextArg, dir: key }); }
}
const NAMES = ['01-okladka', '02-co-robi', '03-przyczepy', '04-unerwienie', '05-klinika'];
const caption = (m, j) => `Hello! ${m.pl} – ${m.lat}.\n\nWkuwanie na ślepo to najgorszy sposób na anatomię. Zobacz, gdzie to leży, czego się trzyma i co robi.\n\n${m.s ? `Skojarzenie: ${m.s}\n\n` : ''}Zapisz posta, jeśli uczysz się anatomii. Obserwuj, bo przecież na pewno ktoś to czyta.${j.next ? `\nDalej: ${j.next}.` : ''}\n\n#anatomia #fizjoterapia #studiafizjoterapii #anatomiaczlowieka #miesnie\n`;

let chromium;
try { ({ chromium } = require('playwright')); } catch { console.error('Brak pakietu playwright. Uruchom raz: npm run reel:setup'); process.exit(1); }
const server = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}/`;
const browser = await chromium.launch({ args: software ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : ['--ignore-gpu-blocklist', '--enable-gpu', '--use-gl=angle'] });
try {
  for (const j of jobs) {
    const dir = path.join(outDir, j.dir), m = MUSCLES[j.key];
    if (!force && fs.existsSync(path.join(dir, `${NAMES[4]}.png`))) { console.log(`• ${j.dir} już istnieje – pomijam (--force, aby zrobić ponownie)`); continue; }
    fs.mkdirSync(dir, { recursive: true });
    console.log(`▶ ${m.lat} → ${dir}`);
    for (let s = 1; s <= 5; s++) {
      const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
      page.on('pageerror', (e) => console.error('  błąd strony:', e.message));
      const q = new URLSearchParams({ post: j.key, slide: s, side, capture: '1', ...(j.next ? { next: j.next } : {}) });
      await page.goto(`${base}?${q}`);
      await page.waitForFunction('window.ready === true && !!window.__post', null, { timeout: 180000 });
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(dir, `${NAMES[s - 1]}.png`) });
      await page.close();
    }
    fs.writeFileSync(path.join(dir, 'opis.txt'), caption(m, j));
  }
} finally { await browser.close(); await server.close(); }
console.log('Gotowe.');
