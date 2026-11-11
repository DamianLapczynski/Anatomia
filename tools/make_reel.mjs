// Renderuje rolkę 1080×1920 (MP4) o wybranym mięśniu albo całą serię wzdłuż nerwu.
//   node tools/make_reel.mjs naramienny
//   node tools/make_reel.mjs "biceps brachii" --side l
//   node tools/make_reel.mjs --nerve axillary        (seria: wszystkie mięśnie unerwiane przez nerw)
//   node tools/make_reel.mjs --list                  (lista mięśni i nerwów)
// Wymaga: ffmpeg w PATH oraz pakietu playwright (npm i -D playwright && npx playwright install chromium).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const opt = (name, def = null) => { const i = args.indexOf(`--${name}`); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (name) => { const i = args.indexOf(`--${name}`); if (i < 0) return false; args.splice(i, 1); return true; };
const side = opt('side', 'r'), nerveArg = opt('nerve'), outDir = opt('out', 'reels'), fps = Number(opt('fps', 30)), only = opt('only');
const list = flag('list'), still = flag('still');
const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/^(miesien|miesnie|m\.|mm\.|musculus|nerw|n\.)\s+/, '').trim();

const upper = (await import('../src/data/muscles_upper.js')).default, lower = (await import('../src/data/muscles_lower.js')).default, trunk = (await import('../src/data/muscles_trunk.js')).default;
const MUSCLES = { ...upper, ...lower, ...trunk }, NERVES = (await import('../src/data/nerves.js')).default;
const find = (db, q) => { const f = fold(q); return Object.keys(db).find((k) => k === q || fold(k.replace(/_/g, ' ')) === f || fold(db[k].pl) === f || fold(db[k].lat) === f) ?? Object.keys(db).find((k) => fold(db[k].pl).includes(f) || fold(db[k].lat).includes(f)); };

if (list) {
  console.log('MIĘŚNIE:'); for (const [k, m] of Object.entries(MUSCLES)) console.log(`  ${k.padEnd(34)} ${m.lat}`);
  console.log('\nNERWY (serie):'); for (const [k, n] of Object.entries(NERVES)) { const c = Object.values(MUSCLES).filter((m) => (m.nr ?? []).some((x) => n.mesh.includes(x))).length; if (c) console.log(`  ${k.padEnd(22)} ${n.lat.padEnd(36)} ${c} mięśni`); }
  process.exit(0);
}

let jobs = [];
if (nerveArg) {
  const nk = find(NERVES, nerveArg); if (!nk) { console.error(`Nie znam nerwu „${nerveArg}”. Zobacz --list.`); process.exit(1); }
  const keys = Object.keys(MUSCLES).filter((k) => (MUSCLES[k].nr ?? []).some((x) => NERVES[nk].mesh.includes(x)));
  jobs = keys.map((key, i) => ({ key, ep: i + 1, of: keys.length, series: NERVES[nk].lat.toUpperCase(), next: keys[i + 1] ? MUSCLES[keys[i + 1]].lat : null }));
  if (only) jobs = jobs.filter((j) => String(j.ep) === only || j.key === only);
} else {
  if (!args.length) { console.error('Podaj mięsień, np.: node tools/make_reel.mjs naramienny   (lista: --list)'); process.exit(1); }
  for (const q of args) { const key = find(MUSCLES, q); if (!key) { console.error(`Nie znam mięśnia „${q}”. Zobacz --list.`); process.exit(1); } jobs.push({ key, next: opt('next') }); }
}

const caption = (m, j) => `Hello! ${m.pl} – ${m.lat}.\n\n${m.f[0]}.\nPoczątek: ${m.o}\nKoniec: ${m.i}\nUnerwienie: ${m.n}\n${m.s ? `\nSkojarzenie: ${m.s}\n` : ''}\nWkuwanie na ślepo to najgorszy sposób na anatomię – zobacz, gdzie to leży i co robi.\nZapisz rolkę, jeśli uczysz się anatomii. Obserwuj, bo przecież na pewno ktoś to czyta.${j.next ? `\nDalej: ${j.next}.` : ''}\n\n#anatomia #fizjoterapia #studiafizjoterapii #anatomiaczlowieka #miesnie\n`;

const { chromium } = require('playwright');
const server = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}/`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
fs.mkdirSync(outDir, { recursive: true });
try {
  for (const j of jobs) {
    const m = MUSCLES[j.key], name = `${j.ep ? `${String(j.ep).padStart(2, '0')}-` : ''}${j.key}`;
    const q = new URLSearchParams({ reel: j.key, side, capture: '1', ...(j.ep ? { ep: j.ep, of: j.of, series: j.series } : {}), ...(j.next ? { next: j.next } : {}) });
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => console.error('  błąd strony:', e.message));
    await page.goto(`${base}?${q}`);
    await page.waitForFunction('window.ready === true && !!window.__reel', null, { timeout: 180000 });
    const info = await page.evaluate('({d: __reel.duration, s: __reel.segments})');
    const n = Math.round(info.d * fps);
    console.log(`▶ ${m.lat}: ${info.d.toFixed(1)} s, ${n} klatek → ${outDir}/${name}.mp4`);
    if (still) {
      for (const [seg, t0] of info.s) { await page.evaluate((t) => __reel.seek(t), t0 + 2.4); await page.screenshot({ path: path.join(outDir, `${name}-${seg}-${t0}.png`) }); }
    } else {
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(outDir, `${name}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
      const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg zakończył się kodem ${c}`)))));
      const t0 = Date.now();
      for (let i = 0; i < n; i++) {
        await page.evaluate((t) => __reel.seek(t), i / fps);
        const buf = await page.screenshot({ type: 'jpeg', quality: 96 });
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
        if (i % 90 === 0 && i) console.log(`  ${Math.round((i / n) * 100)}%  (${((Date.now() - t0) / 1000 / i * (n - i)).toFixed(0)} s do końca)`);
      }
      ff.stdin.end(); await done;
      fs.writeFileSync(path.join(outDir, `${name}.txt`), caption(m, j));
    }
    await page.close();
  }
} finally { await browser.close(); await server.close(); }
console.log('Gotowe.');
