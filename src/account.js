// Konto i synchronizacja: przycisk ☁ w górnym pasku, logowanie Google, stan synchronizacji.
import { firebaseConfig } from './firebase-config.js';

const STATUS = { off: ['', 'Niezalogowano'], sync: ['var(--warn)', 'Synchronizuję…'], ok: ['var(--ok)', 'Zsynchronizowano'], offline: ['var(--mut)', 'Offline – zmiany wyślą się po powrocie sieci'], error: ['var(--bad)', 'Błąd synchronizacji'] };

export function initAccount(ctx) {
  const btn = document.getElementById('acctBtn'), pop = document.getElementById('acct'), esc = ctx.esc;
  const EMU = new URLSearchParams(location.search).has('emu');
  const enabled = EMU || !!firebaseConfig;
  let cloud = null, st = { user: null, status: 'off' }, busy = false;
  const load = async () => {
    if (!cloud) { cloud = (await import('./cloud.js')).cloud; cloud.on((s) => { const was = !!st.user; st = { ...s }; render(); if (!was && s.user) ctx.hint(`Zalogowano: ${s.user.name ?? s.user.email}`, 'ok'); }); }
    return cloud;
  };
  let remembered = false; try { remembered = localStorage.getItem('anatomia.cloud') === '1'; } catch { /* */ }
  if (enabled && (remembered || EMU)) load().catch((e) => console.error(e));

  function render() {
    const u = st.user, [col, txt] = STATUS[st.status] ?? STATUS.off;
    btn.innerHTML = u ? (u.photo ? `<img src="${esc(u.photo)}" alt="" referrerpolicy="no-referrer">` : esc((u.name ?? u.email ?? '?')[0].toUpperCase())) + `<i class="dot" style="background:${col}"></i>` : '☁';
    btn.title = u ? `${u.name ?? u.email} – ${txt}` : 'Zaloguj się, żeby synchronizować postęp';
    if (pop.hidden) return;
    pop.innerHTML = u
      ? `<h5>${esc(u.name ?? 'Konto')}</h5><p>${esc(u.email ?? '')}</p><p><i class="dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${col};margin-right:6px"></i>${txt}${st.error ? ` (${esc(st.error)})` : ''}</p>
         <p>Powtórki, statystyki quizów i postęp w Nauce zapisują się na koncie i wracają na każdym urządzeniu, na którym się zalogujesz.</p>
         <div class="acts"><button data-acct="out">Wyloguj</button></div>`
      : enabled
        ? `<h5>Synchronizacja postępu</h5><p>Zaloguj się kontem Google, żeby powtórki, statystyki quizów i postęp w Nauce były takie same na telefonie, iPadzie i komputerze. Bez logowania wszystko zapisuje się tylko w tej przeglądarce.</p>
           <div class="acts"><button class="primary" data-acct="in" ${busy ? 'disabled' : ''}>${busy ? 'Łączenie…' : 'Zaloguj przez Google'}</button></div>${st.error ? `<p style="color:var(--bad)">${esc(st.error)}</p>` : ''}`
        : `<h5>Synchronizacja nieskonfigurowana</h5><p>Postęp zapisuje się w tej przeglądarce. Żeby włączyć synchronizację, trzeba podpiąć projekt Firebase (plik src/firebase-config.js – instrukcja w README).</p>`;
  }
  btn.addEventListener('click', (e) => { e.stopPropagation(); pop.hidden = !pop.hidden; render(); });
  document.addEventListener('pointerdown', (e) => { if (!pop.hidden && !pop.contains(e.target) && e.target !== btn && !btn.contains(e.target)) pop.hidden = true; });
  pop.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-acct]')?.dataset.acct; if (!a) return;
    try {
      busy = true; st.error = null; render();
      const c = await load();
      if (a === 'in') await c.signIn(); else { await c.signOut(); ctx.hint('Wylogowano – postęp zostaje w tej przeglądarce'); }
    } catch (err) { console.error(err); st.error = err.code ?? err.message; }
    busy = false; render();
  });
  render();
  ctx.cloudUser = () => st.user;
}
