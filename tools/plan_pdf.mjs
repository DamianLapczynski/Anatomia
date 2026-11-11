// Generuje docs/plan-rolek.pdf z tools/reel_plan.mjs (wymaga playwright).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { plan, SEASONS, START } from './reel_plan.mjs';
const require = createRequire(import.meta.url);
const M = { ...(await import('../src/data/muscles_upper.js')).default, ...(await import('../src/data/muscles_lower.js')).default, ...(await import('../src/data/muscles_trunk.js')).default };
const P = plan(), DN = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
const fd = (iso) => { const d = new Date(`${iso}T12:00:00Z`); return `${DN[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const fdl = (iso) => { const d = new Date(`${iso}T12:00:00Z`); return `${d.getUTCDate()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`; };
const weeks = Math.ceil(P.length / 7);
let seasonRows = '', s0 = 0;
SEASONS.forEach((S, i) => { const n = S.chapters.reduce((a, c) => a + c[1].length, 0); seasonRows += `<tr><td><b>${i + 1}. ${S.name}</b></td><td>${n}</td><td>${fdl(P[s0].date)} – ${fdl(P[s0 + n - 1].date)}</td><td>${S.chapters.map((c) => c[0]).join(' · ')}</td></tr>`; s0 += n; });
let cal = '';
SEASONS.forEach((S, si) => {
  cal += `<h2>Sezon ${si + 1}. ${S.name}</h2>`;
  for (const [ch] of S.chapters) {
    const rows = P.filter((d) => d.season === si + 1 && d.chapter === ch);
    cal += `<div class="ch"><h3>${ch} <small>${rows.length} ${rows.length === 1 ? 'rolka' : rows.length < 5 ? 'rolki' : 'rolek'}</small></h3><table class="cal">${rows.map((d) => `<tr><td class="n">${d.day}</td><td class="d">${fd(d.date)}</td><td><b>${M[d.key].lat}</b><br><span>${M[d.key].pl}</span></td><td class="w">tydz. ${Math.ceil(d.day / 7)}</td></tr>`).join('')}</table></div>`;
  }
});
const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><style>
@page{size:A4;margin:16mm 15mm}
body{font:10.5pt/1.45 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#0F2A3D;margin:0}
h1{font-size:26pt;line-height:1.05;margin:0 0 4pt;letter-spacing:-.5pt}h1 span{color:#FF6B4A}
h2{font-size:15pt;margin:18pt 0 6pt;padding-bottom:3pt;border-bottom:2.5pt solid #FF6B4A;break-after:avoid}
h3{font-size:11pt;margin:9pt 0 3pt;color:#0F2A3D;break-after:avoid}h3 small{font-weight:400;color:#4A6275;margin-left:6pt}
.lead{font-size:11.5pt;color:#3B5568;margin:0 0 10pt}
.box{background:#F4EFE6;border-left:4pt solid #FF6B4A;padding:8pt 11pt;margin:8pt 0;border-radius:3pt;break-inside:avoid}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8pt}
table{border-collapse:collapse;width:100%}td,th{padding:4pt 6pt;border-bottom:.6pt solid #D9D3C7;vertical-align:top;text-align:left}th{font-size:8.5pt;text-transform:uppercase;letter-spacing:.4pt;color:#4A6275}
.cal td.n{width:22pt;font-weight:700;color:#FF6B4A}.cal td.d{width:52pt;white-space:nowrap;color:#3B5568}.cal td.w{width:42pt;color:#9FB3C2;text-align:right;white-space:nowrap}.cal span{color:#4A6275;font-size:9pt}
.ch{break-inside:avoid}ul{margin:4pt 0;padding-left:15pt}li{margin:2pt 0}
.foot{margin-top:14pt;font-size:8.5pt;color:#4A6275}
</style></head><body>
<h1>Plan serii rolek <span>@fizjio_anatomia</span></h1>
<p class="lead">Wszystkie mięśnie ciała: ${P.length} rolek, jedna dziennie, od ${fdl(START)} do ${fdl(P.at(-1).date)} (${weeks} tygodni). Kolejność idzie wzdłuż nerwów, żeby każda rolka wynikała z poprzedniej.</p>
<div class="box"><b>Od czego zacząć: bark i ramię, pierwszy n. axillaris (m. deltoideus → m. teres minor).</b><br>Mięśnie barku są rozpoznawalne, dobrze widać je w 3D i mają efektowne animacje ruchu, a stożek rotatorów to temat, który interesuje zarówno studentów, jak i osoby trenujące. Przedramię, o którym są dotychczasowe karuzele, wchodzi jako sezon 2 – rolki będą wtedy naturalnie odsyłać do istniejących postów.</div>
<h2>Sezony</h2>
<table><tr><th>Sezon</th><th>Rolek</th><th>Termin</th><th>Rozdziały</th></tr>${seasonRows}</table>
<h2>Rytm tygodnia</h2>
<div class="grid">
<div class="box"><b>Sobota – produkcja</b><ul><li>Render 7 rolek na kolejny tydzień: <code>npm run reel -- --plan 1-7</code> (potem 8-14 itd.).</li><li>Na serwerze bez karty graficznej to ok. 25–30 min na rolkę, czyli ok. 3–3,5 godz. na tydzień. Na komputerze z kartą graficzną powinno być wyraźnie szybciej (do zmierzenia).</li></ul></div>
<div class="box"><b>Niedziela – kontrola i planowanie</b><ul><li>Obejrzyj każdą rolkę i sprawdź fakty z podręcznikiem: przyczepy, unerwienie i segmenty, czynność.</li><li>Popraw opis z pliku <code>.txt</code> własnymi słowami i dodaj hak w pierwszym zdaniu.</li><li>Zaplanuj publikacje na 7 dni w aplikacji Instagrama / Meta Business Suite.</li></ul></div>
</div>
<div class="box"><b>Zanim ruszysz z całością (tydzień 0)</b><ul><li>Zatwierdź szablon na 2–3 rolkach próbnych: jedna powierzchowna (m. deltoideus), jedna głęboka (m. supraspinatus), jedna drobna (np. m. anconeus).</li><li>Zdecyduj o długości (obecnie ok. 45 s) i o tym, czy dogrywasz głos.</li><li>Po pierwszych 14 dniach sprawdź w statystykach średni czas oglądania i zapisy; jeśli widzowie odpadają przed sceną ruchu, przestawiamy kolejność scen.</li></ul></div>
<h2>Ryzyka, o których warto wiedzieć</h2>
<ul>
<li><b>Monotonia.</b> 144 rolki z jednego szablonu mogą się znudzić. Co 7–10 dni warto wstawić rolkę innego typu: podsumowanie nerwu, quiz „co to za mięsień”, porównanie dwóch mięśni.</li>
<li><b>Słabsze odcinki.</b> Drobne mięśnie ręki i stopy oraz rolki grupowe (np. mm. infrahyoidei) będą mniej efektowne – tam hak musi robić klinika albo skojarzenie.</li>
<li><b>Poprawność.</b> Teksty pochodzą z bazy wiedzy aplikacji, która nie była recenzowana. Kontrola niedzielna jest obowiązkowa, nie opcjonalna.</li>
<li><b>Braki w modelu.</b> Nie ma w nim m.in. n. gluteus inferior i n. phrenicus, więc dla m. gluteus maximus i przepony scena unerwienia pokaże sam tekst.</li>
</ul>
${cal}
<p class="foot">Plan wygenerowany z tools/reel_plan.mjs. Zmiana kolejności lub daty startu w tym pliku i ponowne uruchomienie <code>node tools/plan_pdf.mjs</code> przelicza cały kalendarz. Modele 3D: Z-Anatomy / BodyParts3D, CC BY-SA 4.0.</p>
</body></html>`;
fs.mkdirSync('docs', { recursive: true });
const { chromium } = require('playwright');
const b = await chromium.launch(); const p = await b.newPage();
await p.setContent(html); await p.pdf({ path: 'docs/plan-rolek.pdf', format: 'A4', printBackground: true });
await b.close();
console.log('docs/plan-rolek.pdf');
