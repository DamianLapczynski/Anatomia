// Ustawienia (⚙): konto i synchronizacja, wygląd, model 3D, nauka, dane, informacje.
// Preferencje zapisują się w store ('settings' / 'app'), więc po zalogowaniu wracają na każdym urządzeniu.
import { store } from './store.js';
import { initAccount } from './account.js';
import { folderOpen } from './folders.js';

export const DEFAULTS = { theme: 'graphite', accent: 'blue', font: 'md', quality: 'std', side: 'r', speed: 1, labels: 'hover', quizToSrs: true };
export const prefs = () => ({ ...DEFAULTS, ...(store.get('settings', 'app') ?? {}) });

// Style graficzne: [klucz, nazwa, tło miniatury, akcent]. Interfejs w src/style.css, scena 3D w src/looks.js.
export const THEMES = [
  ['atlas', 'Atlas', 'radial-gradient(circle at 40% 30%,#fdf9f2,#dccdb6)', '#9e2b25'],
  ['noir', 'Noir', 'radial-gradient(circle at 50% 28%,#3a342c,#000 70%)', '#d8b26e'],
  ['onyx', 'Onyks', 'radial-gradient(circle at 50% 28%,#30363d,#000 70%)', '#c9d4e3'],
  ['velvet', 'Aksamit', 'radial-gradient(circle at 50% 28%,#4a1d24,#050102 70%)', '#e0707d'],
  ['chiaro', 'Światłocień', 'radial-gradient(circle at 28% 30%,#4a331d,#030201 68%)', '#e6a55a'],
  ['emerald', 'Szmaragd', 'radial-gradient(circle at 50% 28%,#1b3d31,#010302 70%)', '#5fd3a2'],
  ['wigilia', 'Wigilia', 'radial-gradient(circle at 50% 30%,#1f4038,#020605 72%)', '#e7c26a'],
  ['szron', 'Szron', 'radial-gradient(circle at 50% 30%,#ffffff,#cfdde7 80%)', '#1d6b51'],
  ['glass', 'Szkło', 'radial-gradient(circle at 20% 15%,#ffd3e6,transparent 60%),radial-gradient(circle at 85% 30%,#c4e2ff,transparent 60%),linear-gradient(160deg,#f3eeff,#dcd2ff)', '#5856d6'],
  ['depth', 'Głębia', 'radial-gradient(circle at 50% 35%,#16585a,#020b0f 75%)', '#40e0c8'],
  ['graphite', 'Grafit', 'linear-gradient(145deg,#2c2c2e,#000)', '#0a84ff'],
  ['light', 'Jasny', 'linear-gradient(145deg,#fff,#e5e5ea)', '#007aff'],
  ['midnight', 'Północ', 'linear-gradient(145deg,#2a2870,#03050c)', '#7d7aff'],
  ['titanium', 'Tytan', 'linear-gradient(145deg,#4a443c,#0c0b0a)', '#d9ad6a'],
];
const KNOWN = new Set(THEMES.map(([k]) => k));

const dark = matchMedia('(prefers-color-scheme: dark)');
/** Styl zapisany w ustawieniach → klucz stylu (dawne 'dark' to Grafit, 'auto' idzie za systemem). ?theme=… w adresie ma pierwszeństwo. */
export function resolveTheme(p = prefs()) {
  const url = new URLSearchParams(location.search).get('theme');
  if (url && KNOWN.has(url)) return url;
  if (p.theme === 'auto') return dark.matches ? 'graphite' : 'light';
  return KNOWN.has(p.theme) ? p.theme : 'graphite';
}
/** Styl, akcent i wielkość tekstu – od razu przy starcie, zanim pojawi się interfejs. */
export function applyLook(p = prefs()) {
  const r = document.documentElement, theme = resolveTheme(p);
  r.dataset.theme = theme; r.dataset.accent = p.accent; r.dataset.font = p.font;
  const bg = getComputedStyle(r).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || '#000000');
  document.dispatchEvent(new CustomEvent('anatomia:look', { detail: theme }));
}
/** Wybór stylu z dowolnego miejsca (panel warstw, ustawienia) – zapis w ustawieniach, więc wraca po zalogowaniu na innym urządzeniu. */
export function setStyle(k) { store.put('settings', 'app', { ...prefs(), theme: k }); applyLook(); }
applyLook();
dark.addEventListener('change', () => applyLook());

const QUALITY = { low: 1, std: 1.5, high: 2 };

export function initSettings(ctx) {
  const { engine, esc } = ctx;
  const btn = document.getElementById('setBtn'), root = document.getElementById('settings');
  const acct = initAccount(ctx, () => { renderBtn(); if (!root.hidden) render(); });
  const set = (patch) => { store.put('settings', 'app', { ...prefs(), ...patch }); apply(); render(); };

  function apply() {
    const p = prefs();
    applyLook(p);
    engine.renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY[p.quality] ?? 1.5)); engine.resize(); engine.invalidate();
    document.getElementById('marks')?.classList.toggle('always', p.labels === 'always');
  }
  function renderBtn() {
    const d = acct.dot();
    btn.innerHTML = `⚙${d ? `<i class="dot" style="background:${d}"></i>` : ''}`;
    btn.title = acct.user ? `Ustawienia · ${acct.user.name ?? acct.user.email}` : 'Ustawienia';
  }

  const seg = (key, opts, val) => `<div class="seg">${opts.map(([v, n]) => `<button data-set="${key}" data-v="${v}" class="${String(val) === String(v) ? 'on' : ''}">${n}</button>`).join('')}</div>`;
  const opt = (title, sub, ctrl) => `<div class="opt"><span>${title}${sub ? `<small>${sub}</small>` : ''}</span>${ctrl}</div>`;
  const sw = (key, on) => `<button class="sw ${on ? 'on' : ''}" data-set="${key}" data-v="${!on}" aria-pressed="${on}"></button>`;
  const ACC = [['blue', '#4c9dff'], ['green', '#2fbf7a'], ['violet', '#9b7bff'], ['orange', '#ff9640'], ['pink', '#ff6fae']];

  function render() {
    const p = prefs(), srs = store.get('settings', 'srs') ?? {}, perDay = srs.perDay ?? 15;
    const notes = Object.entries(store.all('notes')).sort(([, a], [, b]) => (b.t ?? 0) - (a.t ?? 0));
    const counts = { srs: Object.keys(store.all('srs')).length, quiz: Object.values(store.all('quiz')).reduce((a, r) => a + (r.ok ?? 0) + (r.bad ?? 0), 0), learn: Object.keys(store.all('learn')).filter((k) => !k.startsWith('exam~')).length };
    root.innerHTML = `<div class="box" role="dialog" aria-modal="true" aria-label="Ustawienia">
      <div class="head"><h3>Ustawienia</h3><button data-close aria-label="Zamknij">✕</button></div>
      <details class="sec setsec" data-sec="set:konto"${folderOpen('set:konto', true) ? ' open' : ''}><summary><span>Konto i baza danych</span></summary><div class="sec-body">${acct.html()}</div></details>
      <details class="sec setsec" data-sec="set:wyglad"${folderOpen('set:wyglad', false) ? ' open' : ''}><summary><span>Wygląd</span></summary><div class="sec-body">
        <div class="opt col"><span>Styl<small>Kolory, czcionki i oświetlenie modelu 3D. „Auto” przełącza Grafit i Jasny według systemu.</small></span>
          <div class="themes">${THEMES.map(([k, n, bg, acc]) => `<button class="${p.theme === k || (p.theme === 'dark' && k === 'graphite') ? 'on' : ''}" data-set="theme" data-v="${k}" style="--sw-acc:${acc}"><b style="background:${bg}"></b>${n}</button>`).join('')}<button class="${p.theme === 'auto' ? 'on' : ''}" data-set="theme" data-v="auto" style="--sw-acc:#0a84ff"><b style="background:linear-gradient(135deg,#f2f2f7 50%,#1c1c1e 50%)"></b>Auto</button></div></div>
        ${opt('Kolor akcentu', 'W stylach Grafit i Jasny', `<div class="seg">${ACC.map(([k, c]) => `<button class="sw-col ${p.accent === k ? 'on' : ''}" style="background:${c}" data-set="accent" data-v="${k}" aria-label="${k}"></button>`).join('')}</div>`)}
        ${opt('Wielkość tekstu', '', seg('font', [['sm', 'A−'], ['md', 'A'], ['lg', 'A+'], ['xl', 'A++']], p.font))}
      </div></details>
      <details class="sec setsec" data-sec="set:model"${folderOpen('set:model', false) ? ' open' : ''}><summary><span>Model 3D</span></summary><div class="sec-body">
        ${opt('Jakość grafiki', 'Oszczędna – płynniej i dłużej na baterii', seg('quality', [['low', 'Oszczędna'], ['std', 'Standard'], ['high', 'Wysoka']], p.quality))}
        ${opt('Domyślna strona ciała', 'Wyszukiwarka, Nauka, Quiz (Powtórki mają własny wybór)', seg('side', [['r', 'Prawa'], ['l', 'Lewa']], p.side))}
        ${opt('Tempo animacji ruchów', '', seg('speed', [[0.6, 'Wolno'], [1, 'Normalnie'], [1.6, 'Szybko']], p.speed))}
        ${opt('Nazwy punktów kostnych', 'Na kości: zawsze widoczne czy po dotknięciu', seg('labels', [['hover', 'Po dotknięciu'], ['always', 'Zawsze']], p.labels))}
      </div></details>
      <details class="sec setsec" data-sec="set:nauka"${folderOpen('set:nauka', false) ? ' open' : ''}><summary><span>Nauka</span></summary><div class="sec-body">
        ${opt('Nowe fiszki dziennie', 'Powtórki (SM-2)', seg('perDay', [5, 10, 15, 20, 30].map((n) => [n, n]), perDay))}
        ${opt('Błędy z quizu do powtórek', 'Źle odpowiedziany mięsień od razu wraca w Powtórkach', sw('quizToSrs', p.quizToSrs))}
      </div></details>
      <details class="sec setsec" data-sec="set:notatki"${folderOpen('set:notatki', false) ? ' open' : ''}><summary><span>Moje notatki (${notes.length})</span></summary><div class="sec-body">
        ${notes.length ? `<div class="list">${notes.map(([id, n]) => `<div class="it col" data-note-open="${esc(id)}"><span>${esc(n.title ?? id)}</span><small>${esc(n.text.length > 140 ? `${n.text.slice(0, 140)}…` : n.text)}</small></div>`).join('')}</div>` : '<p class="en">Notatkę dodasz na karcie mięśnia, nerwu, stawu, kości lub kompleksu („Moja notatka”). Zapisuje się sama i synchronizuje z kontem.</p>'}
      </div></details>
      <details class="sec setsec" data-sec="set:dane"${folderOpen('set:dane', false) ? ' open' : ''}><summary><span>Dane</span></summary><div class="sec-body">
        <p class="en">W tej przeglądarce: ${counts.srs} fiszek w nauce, ${counts.quiz} odpowiedzi w quizach, ${counts.learn} sektorów w Nauce, ${notes.length} notatek.</p>
        <div class="acts"><button data-do="export">Eksport całego postępu</button><button data-do="import">Import</button></div>
        <div class="acts"><button data-do="update">Pobierz najnowszą wersję aplikacji</button><button data-do="wipe">Wyczyść dane w tej przeglądarce</button></div>
      </div></details>
      <details class="sec setsec about" data-sec="set:about"${folderOpen('set:about', false) ? ' open' : ''}><summary><span>O aplikacji</span></summary><div class="sec-body">
        <p><b>Anatomia 3D</b> – atlas do nauki fizjoterapii. Wersja z ${esc(new Date(__BUILD__).toLocaleDateString('pl-PL'))}.</p>
        <p>Modele 3D: Z-Anatomy i BodyParts3D (CC BY-SA). Opisy pisane do nauki – nie przeszły recenzji anatoma, weryfikuj z podręcznikiem.</p>
        <details class="sources"><summary>Źródła treści</summary><ul>
          <li>A. Bochenek, M. Reicher – <i>Anatomia człowieka</i>, t. I–V (PZWL) – budowa, przyczepy, unerwienie, nazwy polskie.</li>
          <li>F. Paulsen, J. Waschke – <i>Sobotta. Atlas anatomii człowieka</i>; F. Netter – <i>Atlas anatomii człowieka</i>.</li>
          <li>Terminologia Anatomica 2 (FIPAT) – nazwy łacińskie.</li>
          <li>F. Kendall i in. – <i>Muscles: Testing and Function</i>; H. Hislop – <i>Daniels and Worthingham's Muscle Testing</i> – testy siły i długości, palpacja.</li>
          <li>F. Kaltenborn – <i>Manual Mobilization of the Joints</i>; J. Cyriax – pozycje stawów i wzorce torebkowe.</li>
          <li>D. Magee – <i>Orthopedic Physical Assessment</i> – testy kliniczne.</li>
          <li>ASIA/ISCoS – <i>International Standards for Neurological Classification of SCI</i> (ISNCSCI) – miotomy i punkty kluczowe dermatomów.</li>
          <li>Opisy angielskie struktur: Wikipedia (CC BY-SA) za pośrednictwem Z-Anatomy.</li>
        </ul></details>
        <div class="acts"><button data-do="keys">Skróty klawiszowe</button></div>
      </div></details></div>`;
  }

  const open = () => { render(); root.hidden = false; root.querySelector('[data-close]')?.focus(); };
  const close = () => { root.hidden = true; btn.focus(); };
  btn.addEventListener('click', () => (root.hidden ? open() : close()));
  root.addEventListener('click', async (e) => {
    if (e.target === root || e.target.closest('[data-close]')) return close();
    const S = e.target.closest('[data-set]'), D = e.target.closest('[data-do]'), A = e.target.closest('[data-acct]'), N = e.target.closest('[data-note-open]');
    if (N) { close(); ctx.openNote(N.dataset.noteOpen); return; }
    if (A) return acct.act(A.dataset.acct);
    if (S) {
      const k = S.dataset.set, raw = S.dataset.v, v = raw === 'true' ? true : raw === 'false' ? false : /^[\d.]+$/.test(raw) ? Number(raw) : raw;
      if (k === 'perDay') { store.put('settings', 'srs', { ...(store.get('settings', 'srs') ?? {}), perDay: v }); render(); }
      else set({ [k]: v });
      return;
    }
    const d = D?.dataset.do;
    if (d === 'export') {
      const { srs, quiz, learn, settings, notes } = store._dump();
      const blob = new Blob([JSON.stringify({ app: 'anatomia', v: 3, date: new Date().toISOString(), srs, quiz, learn, settings, notes })], { type: 'application/json' });
      const u = URL.createObjectURL(blob); Object.assign(document.createElement('a'), { href: u, download: `anatomia-postep-${new Date().toISOString().slice(0, 10)}.json` }).click(); URL.revokeObjectURL(u);
    } else if (d === 'import') {
      const inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json' });
      inp.onchange = async () => {
        try {
          const j = JSON.parse(await inp.files[0].text());
          if (j.app === 'anatomia') { for (const ns of ['srs', 'learn', 'settings', 'notes']) for (const [id, v] of Object.entries(j[ns] ?? {})) { const { t, ...rest } = v; store.put(ns, id, rest); } for (const [id, v] of Object.entries(j.quiz ?? {})) store.inc('quiz', id, { ok: v.ok ?? 0, bad: v.bad ?? 0 }, { kind: v.kind, key: v.key, q: v.q }); }
          else if (j.cards) { for (const [id, c] of Object.entries(j.cards)) { const { t, ...rest } = c; store.put('srs', id, rest); } } // stary eksport z Powtórek
          else throw new Error('format');
          apply(); render(); ctx.hint('Zaimportowano postęp', 'ok');
        } catch { ctx.hint('Nieprawidłowy plik', 'bad'); }
      };
      inp.click();
    } else if (d === 'wipe') {
      if (!confirm(`Usunąć postęp i ustawienia z tej przeglądarki?${acct.user ? ' Dane na koncie zostaną – wrócą po ponownym zalogowaniu.' : ' Bez konta nie da się ich odzyskać – zrób najpierw eksport.'}`)) return;
      if (acct.user) await acct.act('out');
      try { localStorage.removeItem('anatomia.store.v1'); } catch { /* */ }
      location.reload();
    } else if (d === 'update') {
      try { for (const r of (await navigator.serviceWorker?.getRegistrations?.()) ?? []) await r.unregister(); for (const k of await caches.keys()) await caches.delete(k); } catch { /* */ }
      location.reload();
    } else if (d === 'keys') { close(); document.getElementById('keysBtn').click(); }
  });
  document.addEventListener('keydown', (e) => { if (!root.hidden && e.key === 'Escape') { e.stopImmediatePropagation(); close(); } }, true);
  store.on((ns, id, remote) => { if (ns === 'settings' && remote) { apply(); if (!root.hidden) render(); } else if (ns === 'notes' && remote && !root.hidden) render(); });
  apply(); renderBtn();
  return { open, close, prefs };
}
