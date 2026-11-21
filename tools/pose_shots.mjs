// Zrzuty przeglądowe póz (bez kontroli kontaktu): node tools/pose_shots.mjs katalog klucz:k[,k] …
import { preview } from 'vite';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [out, ...specs] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const server = await preview({ preview: { port: 4185, strictPort: false }, logLevel: 'silent' });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 700, height: 700 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(`${url}?debug`, { waitUntil: 'load' });
await page.waitForSelector('#loading', { state: 'hidden', timeout: 120000 });
await page.addStyleTag({ content: '#left,#panel,#top,#hud{display:none!important}' });
await page.evaluate(() => { window.__engine.setInsets({}); window.__engine.resize(); });
for (const sp of specs) {
  const [key, ks = '0.5', view = 'side', segs = ''] = sp.split(':');
  for (const k of ks.split(',').map(Number)) {
    const r = await page.evaluate(({ key, k, view, segs }) => {
      const M = window.__motion, E = window.__engine, model = window.__model;
      if (!M.setup({ rig: `test:${key}` }, 'r', [])) return 'setup';
      M.set(k); window.__props(key);
      E.apply((m) => (m.f === 'skeleton' ? 'base:bones' : null));
      const ids = segs ? segs.split('+').flatMap((g) => [...(M._body.part[g] ?? [])]) : model.meta.filter((m) => m.f === 'skeleton').map((m) => m.id);
      const V3 = E.camera.position.constructor, Box3 = E.boxOf([]).constructor;
      const pts = ids.map((id) => { const b = model.meta[id].bb; return M.pointAt(new V3((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2), id); });
      const dirs = { side: [-1, 0.25, 0.2], left: [1, 0.25, 0.2], front: [0.2, 0.2, 1], back: [0.2, 0.25, -1], top: [-0.4, 1, 0.3], fr: [-0.7, 0.4, 0.7], fl: [0.7, 0.4, 0.7] };
      E.focus(new Box3().setFromPoints(pts), { dir: new V3(...dirs[view]).normalize(), pad: 1.2, ms: 0 });
      return null;
    }, { key, k, view, segs });
    await page.waitForTimeout(300);
    if (r) console.log(key, r);
    await page.screenshot({ path: `${out}/${key}-${view}-${String(k).replace('.', '_')}${segs ? '-z' : ''}.png` });
  }
}
if (errors.length) console.log('Błędy:', errors.slice(0, 5));
await browser.close(); server.httpServer.close();
