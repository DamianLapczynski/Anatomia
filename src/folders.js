// Rozwijane foldery list w panelu (wszystkie tryby i Ustawienia): <details class="sec"> ze strzałką i licznikiem.
// Stan rozwinięcia zapamiętany na tym urządzeniu (localStorage) – to wygoda, nie dane do synchronizacji.
const KEY = 'anatomia.folders';
let state = {};
try {
  state = JSON.parse(localStorage.getItem(KEY)) ?? {};
  // przeniesienie stanu z wcześniejszych sekcji trybu Nauka
  const old = JSON.parse(localStorage.getItem('anatomia.learn.open') ?? 'null');
  if (Array.isArray(old)) { for (const id of old) state[`learn:${id}`] ??= true; localStorage.removeItem('anatomia.learn.open'); localStorage.setItem(KEY, JSON.stringify(state)); }
} catch { state = {}; }

/** Czy folder jest rozwinięty (def – stan domyślny, gdy użytkownik go jeszcze nie przełączał). */
export const folderOpen = (id, def = false) => (id in state ? state[id] : def);

/**
 * Folder: id – klucz zapamiętanego stanu, title – nagłówek (HTML), count – licznik po prawej (tekst / HTML, może być pusty),
 * body – zawartość. Opcje: open – stan domyślny, force – wymuszone rozwinięcie (np. trafienia filtra),
 * list – opakować zawartość w .list (domyślnie tak; false dla folderów zagnieżdżonych, chipów, formularzy).
 */
export function folder(id, title, count, body, { open = false, force = false, list = true } = {}) {
  const o = force || folderOpen(id, open);
  return `<details class="sec" data-sec="${id}"${force ? ' data-forced="1"' : ''}${o ? ' open' : ''}><summary><span>${title}</span>${count !== '' && count != null ? `<small>${count}</small>` : ''}</summary>${list ? `<div class="list">${body}</div>` : `<div class="sec-body">${body}</div>`}</details>`;
}

// jeden nasłuch dla całej aplikacji (zdarzenie toggle nie bąbelkuje – łapiemy je w fazie przechwytywania)
document.addEventListener('toggle', (e) => {
  const d = e.target; if (!d.matches?.('details.sec[data-sec]') || d.dataset.forced) return;
  state[d.dataset.sec] = d.open;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* tryb prywatny */ }
}, true);
