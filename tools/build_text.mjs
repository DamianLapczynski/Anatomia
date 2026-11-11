// Buduje słownik łaciński (TA2) i skrócone opisy angielskie (Z-Anatomy/Wikipedia) dla struktur modelu.
// Użycie: node tools/build_text.mjs <TA2.csv> <texts.json> [public]
import fs from 'node:fs';
const [, , TA2, TEXTS, PUB = 'public'] = process.argv;
const meta = JSON.parse(fs.readFileSync(`${PUB}/data/meta.json`, 'utf8'));
const labels = JSON.parse(fs.readFileSync(`${PUB}/data/labels.json`, 'utf8'));
const norm = (s) => s.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
const ta = new Map();
for (const line of fs.readFileSync(TA2, 'utf8').split(/\r?\n/)) {
  const c = line.replace(/^﻿?"|"$/g, '').split(';');
  if (c.length > 2 && c[1] && c[2] && !ta.has(norm(c[1]))) ta.set(norm(c[1]), c[2].trim());
}
const names = new Set([...meta.map((m) => m.n), ...labels.map((l) => l.n)]);
const latin = {};
for (const n of names) {
  const k = norm(n);
  const hit = ta.get(k) ?? ta.get(k.replace(/ muscles?$/, '')) ?? ta.get(`${k} muscle`) ?? ta.get(k.replace(/ bone$/, ''));
  if (hit) latin[n] = hit;
}
fs.writeFileSync(`${PUB}/data/latin.json`, JSON.stringify(latin));
const texts = JSON.parse(fs.readFileSync(TEXTS, 'utf8'));
const chunks = Array.from({ length: 16 }, () => ({}));
const hash = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 16; };
let nd = 0;
for (const n of new Set(meta.map((m) => m.n))) {
  let t = texts[n] ?? texts[n.replace(/[()]/g, '')];
  if (!t) continue;
  t = t.replace(/\r/g, '').trim().split(/\n==/)[0].split('\n').map((s) => s.trim()).filter(Boolean);
  if (t.length && t[0] === t[0].toUpperCase()) t.shift();
  let out = t.join('\n');
  if (out.length > 900) out = out.slice(0, 900).replace(/[^.]*$/, '');
  if (out.length < 40) continue;
  chunks[hash(n)][n] = out; nd++;
}
fs.mkdirSync(`${PUB}/data/desc`, { recursive: true });
chunks.forEach((c, i) => fs.writeFileSync(`${PUB}/data/desc/${i}.json`, JSON.stringify(c)));
console.log('łacina:', Object.keys(latin).length, '/', names.size, '| opisy:', nd);
