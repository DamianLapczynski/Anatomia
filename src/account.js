// Konto i synchronizacja (logowanie Google, stan synchronizacji) – sekcja w Ustawieniach (src/settings.js).
import { firebaseConfig, onFirebaseHosting, HOSTING_URL } from './firebase-config.js';

const STATUS = { off: ['var(--mut)', 'Niezalogowano – postęp tylko w tej przeglądarce'], sync: ['var(--warn)', 'Synchronizuję…'], ok: ['var(--ok)', 'Zsynchronizowano'], offline: ['var(--mut)', 'Offline – zmiany wyślą się po powrocie sieci'], error: ['var(--bad)', 'Błąd synchronizacji'] };

export function initAccount(ctx, onChange) {
  const esc = ctx.esc;
  const EMU = new URLSearchParams(location.search).has('emu');
  const enabled = EMU || !!firebaseConfig;
  let cloud = null, st = { user: null, status: 'off' }, busy = false;
  let loading = null;
  const load = () => loading ??= (async () => {
    if (!cloud) { cloud = (await import('./cloud.js')).cloud; cloud.on((s) => { const was = !!st.user; st = { ...s }; onChange(); if (!was && s.user) ctx.hint(`Zalogowano: ${s.user.name ?? s.user.email}`, 'ok'); }); }
    return cloud;
  })().catch((e) => { loading = null; throw e; });
  // '1' – zalogowany wcześniej; 'redirect' – wraca z logowania przekierowaniem (wynik odbiera cloud.js)
  let remembered = false; try { remembered = ['1', 'redirect'].includes(localStorage.getItem('anatomia.cloud')); } catch { /* */ }
  if (enabled && (remembered || EMU)) load().catch((e) => console.error(e));

  // komunikaty błędów logowania po polsku (kod zostaje w nawiasie – ułatwia diagnozę)
  const ERR = {
    'auth/network-request-failed': 'Brak połączenia z serwerem logowania – sprawdź internet i spróbuj ponownie.',
    'auth/popup-blocked': 'Przeglądarka zablokowała okno logowania – zezwól na okna wyskakujące i spróbuj ponownie.',
    'auth/unauthorized-domain': 'Ta domena nie jest dopisana w Firebase (Authentication → Settings → Authorized domains).',
    'auth/web-storage-unsupported': 'Przeglądarka blokuje pamięć strony (tryb prywatny lub blokowanie plików cookie).',
    'auth/missing-initial-state': 'Logowanie wróciło do innego okna niż to, z którego wyszło – spróbuj ponownie w tej samej aplikacji.',
    'auth/internal-error': 'Błąd po stronie logowania Google – spróbuj ponownie za chwilę.',
    'auth/too-many-requests': 'Zbyt wiele prób – odczekaj chwilę.',
  };
  const errText = (c) => (ERR[c] ? `${ERR[c]} (${c})` : c);
  const api = {
    get user() { return st.user; },
    /** kolor kropki stanu (null – brak kropki) */
    dot() { return st.user ? STATUS[st.status]?.[0] ?? null : null; },
    html() {
      const u = st.user, [col, txt] = STATUS[st.status] ?? STATUS.off;
      const dot = `<i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${col};margin-right:6px"></i>`;
      if (u) return `<div class="acct-row">${u.photo ? `<img src="${esc(u.photo)}" alt="" referrerpolicy="no-referrer">` : `<span class="ava">${esc((u.name ?? u.email ?? '?')[0].toUpperCase())}</span>`}<div><b>${esc(u.name ?? 'Konto Google')}</b><small>${esc(u.email ?? '')}</small></div></div>
        <p class="en">${dot}${txt}${st.error ? ` (${esc(st.error)})` : ''}</p>
        <p class="note">Powtórki, statystyki quizów, postęp w Nauce i te ustawienia zapisują się na koncie i wracają na każdym urządzeniu, na którym się zalogujesz.</p>
        <div class="acts"><button data-acct="out">Wyloguj</button></div>`;
      if (!enabled) return `<p class="en">${dot}Synchronizacja nieskonfigurowana</p><p class="note">Postęp zapisuje się w tej przeglądarce. Żeby włączyć logowanie i własną bazę danych, trzeba podpiąć projekt Firebase (plik src/firebase-config.js – instrukcja w README).</p>`;
      if (!cloud) load().catch((e) => console.error(e)); // wczesne ładowanie – kliknięcie woła signIn() od razu (gest użytkownika)
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const hint = ios && !onFirebaseHosting && !EMU ? `<div class="card tip"><h5>iPad / iPhone</h5><p>Na urządzeniach Apple logowanie działa tylko w wersji aplikacji z adresu <b>${HOSTING_URL.replace('https://', '').replace(/\/$/, '')}</b> (Safari blokuje logowanie przez inną domenę). Otwórz ją w Safari, dodaj do ekranu początkowego i zaloguj się tam. Postęp z tej wersji przeniesiesz eksportem / importem (sekcja Dane).</p><div class="acts"><a class="btnlink" href="${HOSTING_URL}" target="_blank" rel="noopener">Otwórz wersję do logowania ↗</a></div></div>` : '';
      return `${hint}<p class="en">${dot}${txt}</p><p class="note">Zaloguj się kontem Google, żeby powtórki, statystyki, postęp w Nauce i ustawienia były takie same na telefonie, iPadzie i komputerze.</p>
        <div class="acts"><button class="primary" data-acct="in" ${busy ? 'disabled' : ''}>${busy ? 'Łączenie…' : 'Zaloguj przez Google'}</button></div>${st.error ? `<p style="color:var(--bad)">${esc(errText(st.error))}</p>` : ''}`;
    },
    async act(a) {
      try {
        busy = true; st.error = null; onChange();
        const c = cloud ?? await load();
        if (a === 'in') await c.signIn(); else { await c.signOut(); ctx.hint('Wylogowano – postęp zostaje w tej przeglądarce'); }
      } catch (err) { console.error(err); st.error = err.code ?? err.message; }
      busy = false; onChange();
    },
  };
  ctx.cloudUser = () => st.user;
  return api;
}
