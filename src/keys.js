// Skróty klawiszowe: komputer i iPad z klawiaturą. Moduł „naciska” te same przyciski, co kliknięcia,
// więc działa w każdym trybie bez zmian w ich kodzie. Ściąga: klawisz ? albo przycisk ⌨ u góry.
const MODE_ORDER = ['atlas', 'learn', 'motion', 'quiz', 'srs'];
const MODE_PL = { atlas: 'Atlas', learn: 'Nauka', motion: 'Ruch', quiz: 'Quiz', srs: 'Powtórki' };
const LIST_SEL = '.list .it[data-nerve], .list .it[data-sector], .list .it[data-step], .list .it[data-move]';

const HELP = {
  global: [
    ['Alt + 1…5', 'Tryb: Atlas, Nauka, Ruch, Quiz, Powtórki'],
    ['[  ]', 'Poprzedni / następny tryb (gdy Alt + cyfra nie działa)'],
    ['/ | Ctrl + K', 'Szukaj (↑ ↓ wybór, Enter otwiera, Esc zamyka)'],
    ['Shift + ← → ↑ ↓', 'Obracaj model'],
    ['+ | −', 'Przybliż / oddal'],
    ['F  B  R  L', 'Widok z przodu / z tyłu / z prawej / z lewej'],
    ['Home', 'Cała sylwetka'],
    ['?', 'Ta ściąga'],
  ],
  atlas: [
    ['1 … 9, 0', 'Warstwy: kości, stawy, mięśnie, powięzie, przyczepy, tętnice, żyły, serce, nerwy, mózg'],
    ['D', 'Warstwa mięśni: wszystkie → powierzchowne → głębokie'],
    ['I', 'Izoluj zaznaczoną strukturę'],
    ['H | U', 'Ukryj zaznaczoną / pokaż ukryte'],
    ['C', 'Centruj na zaznaczonej'],
    ['S', 'Przełącz stronę ciała (prawa / lewa)'],
    ['T', 'Śledź drogę nerwu (na karcie nerwu)'],
    ['← →', 'Poprzedni / następny mięsień w grupie'],
    ['Esc | Backspace', 'Zakończ izolację, potem odznacz'],
  ],
  learn: [
    ['↑ ↓', 'Wybierz z listy (nerwy, sektory, mięśnie)'],
    ['Enter | Spacja', 'Otwórz wybrane; „Ucz się po kolei”; następny mięsień'],
    ['← →', 'Poprzedni / następny mięsień'],
    ['Q', 'Quiz z tego zakresu'],
    ['A', 'Otwórz mięsień w atlasie'],
    ['S', 'Strona ciała'],
    ['Esc | Backspace', 'Wróć o poziom'],
  ],
  motion: [
    ['↑ ↓  Enter', 'Wybierz ruch z listy strzałkami i otwórz'],
    ['← →', 'Poprzedni / następny ruch'],
    ['Spacja', 'Odtwórz / pauza'],
    ['A', 'Pokaż / ukryj antagonistów'],
    ['S', 'Strona ciała'],
    ['Esc | Backspace', 'Wróć do listy ruchów'],
  ],
  quiz: [
    ['1 … 4', 'Wybierz odpowiedź (w menu: rodzaj pytań 1–3)'],
    ['Enter | Spacja', 'Start; dalej; „Nie wiem – pokaż”'],
    ['→', 'Dalej (po odpowiedzi)'],
    ['A', 'Zobacz w atlasie'],
    ['Esc | M', 'Zakończ, wróć do menu'],
  ],
  srs: [
    ['Enter | Spacja', 'Start sesji; pokaż odpowiedź; po odsłonięciu „Dobrze”'],
    ['1  2  3  4', 'Oceń: Nie wiem · Trudne · Dobrze · Łatwe'],
    ['A', 'Otwórz w atlasie'],
    ['Esc | Backspace', 'Zakończ sesję'],
  ],
};

export function initKeys(ctx) {
  const { engine, view, panelBody, left, q, results, modes } = ctx;
  const $ = (sel, root = panelBody) => root.querySelector(sel);
  const click = (sel, root = panelBody) => { const el = $(sel, root); if (el && !el.disabled) { el.click(); return true; } return false; };
  let sel = -1, lastReveal = 0, spaceHandled = false;

  // ---------- podpowiedzi na przyciskach (po pierwszym wciśnięciu klawisza) ----------
  const annotate = () => {
    document.querySelectorAll('[data-kh]').forEach((e) => e.removeAttribute('data-kh'));
    if (!document.body.classList.contains('kb')) return;
    const put = (selector, text, root = panelBody) => root.querySelectorAll(selector).forEach((el) => el.setAttribute('data-kh', text));
    const m = ctx.getMode();
    if (m === 'atlas') {
      left.querySelectorAll('[data-layer]').forEach((el, i) => el.setAttribute('data-kh', String((i + 1) % 10)));
      put('[data-act=iso]', 'I'); put('[data-act=hide]', 'H'); put('[data-act=center]', 'C'); put('[data-act=side]', 'S'); put('[data-act=trace]', 'T');
    } else if (m === 'quiz') {
      panelBody.querySelectorAll('[data-opt]').forEach((el) => el.setAttribute('data-kh', String(+el.dataset.opt + 1)));
      panelBody.querySelectorAll('[data-k=type] button').forEach((el, i) => el.setAttribute('data-kh', String(i + 1)));
      put('[data-act=start]', '⏎'); put('[data-act=next]', '⏎'); put('[data-act=skip]', '␣'); put('[data-act=show]', 'A'); put('.acts [data-act=menu]', 'Esc');
    } else if (m === 'srs') {
      put('[data-act=go]', '⏎'); put('[data-act=reveal]', '␣'); put('[data-act=atlas]', 'A'); put('.score [data-act=home]', 'Esc');
      const g = { 1: '1', 3: '2', 4: '3', 5: '4' }; panelBody.querySelectorAll('[data-q]').forEach((el) => el.setAttribute('data-kh', g[el.dataset.q]));
    } else if (m === 'learn') {
      put('[data-act=start]', '⏎'); put('[data-act=next]', '→'); put('[data-act=prev]', '←'); put('[data-act=quiz]', 'Q'); put('[data-act=atlas]', 'A'); put('[data-act=side]', 'S');
      put('[data-act=group]', 'Esc'); put('[data-act=home]', 'Esc');
    } else if (m === 'motion') {
      put('[data-act=play]', '␣'); put('[data-act=ant]', 'A'); put('[data-act=side]', 'S'); put('[data-act=back]', 'Esc');
    }
  };
  let raf = 0;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { sel = -1; annotate(); }); };
  const mo = new MutationObserver(schedule);
  mo.observe(panelBody, { childList: true, subtree: true }); mo.observe(left, { childList: true });
  document.querySelector('#modes').addEventListener('click', schedule);

  // ---------- ściąga ----------
  const box = document.createElement('div'); box.id = 'keys'; box.hidden = true; document.body.appendChild(box);
  const keyHtml = (k) => k.split(' | ').map((alt) => alt.split(' + ').map((c) => c.split('  ').map((x) => `<kbd>${x}</kbd>`).join('')).join(' + ')).join(' <span class="or">lub</span> ');
  const rows = (list) => list.map(([k, d]) => `<div class="row"><span>${d}</span><span class="k">${keyHtml(k)}</span></div>`).join('');
  const showHelp = () => {
    const m = ctx.getMode();
    box.innerHTML = `<div class="box"><h3>Skróty klawiszowe</h3><div class="sub">Klawiatura działa też na iPadzie (tam zamiast Esc możesz użyć Backspace). Esc lub ? zamyka.</div>
      <div class="cols"><div class="cur"><h5>Teraz: ${MODE_PL[m]}</h5>${rows(HELP[m])}</div><div><h5>Wszędzie</h5>${rows(HELP.global)}</div></div></div>`;
    box.hidden = false;
  };
  const hideHelp = () => { box.hidden = true; };
  box.addEventListener('pointerdown', (e) => { if (e.target === box) hideHelp(); });
  document.getElementById('keysBtn').addEventListener('click', () => (box.hidden ? showHelp() : hideHelp()));

  // ---------- wybór z list strzałkami ----------
  const items = () => [...panelBody.querySelectorAll(LIST_SEL)];
  const moveSel = (d) => {
    const list = items(); if (!list.length) return false;
    list.forEach((el) => el.classList.remove('kbsel'));
    sel = sel < 0 ? (d > 0 ? 0 : list.length - 1) : (sel + d + list.length) % list.length;
    list[sel].classList.add('kbsel'); list[sel].scrollIntoView({ block: 'nearest' });
    return true;
  };
  const openSel = () => { const list = items(); if (sel >= 0 && list[sel]) { list[sel].click(); return true; } return false; };

  // ---------- kamera ----------
  const STEP = Math.PI / 24;
  const camera = (e) => {
    const k = e.key, big = e.shiftKey ? 1 : 1;
    if (k === 'ArrowLeft') engine.orbit(STEP * big, 0); else if (k === 'ArrowRight') engine.orbit(-STEP * big, 0);
    else if (k === 'ArrowUp') engine.orbit(0, -STEP); else if (k === 'ArrowDown') engine.orbit(0, STEP);
    else if (k === '+' || k === '=') engine.zoom(0.88); else if (k === '-' || k === '_') engine.zoom(1.14);
    else if (k === 'Home') ctx.home();
    else if (!e.repeat && 'fbrl'.includes(k.toLowerCase()) && k.length === 1) engine.view({ f: 'front', b: 'back', r: 'right', l: 'left' }[k.toLowerCase()]);
    else return false;
    return true;
  };

  // ---------- tryby ----------
  const atlas = (e, k) => {
    if (/^[0-9]$/.test(k)) { const el = left.querySelectorAll('[data-layer]')[(+k + 9) % 10]; if (el) el.click(); return true; }
    if (e.repeat) return false;
    if (k === 'd') { const bs = [...left.querySelectorAll('[data-seg=depth] button')], i = bs.findIndex((b) => b.classList.contains('on')); bs[(i + 1) % bs.length]?.click(); return true; }
    if (k === 'i') return click('[data-act=iso]');
    if (k === 'h') return click('[data-act=hide]');
    if (k === 'c') return click('[data-act=center]');
    if (k === 's') return click('[data-act=side]');
    if (k === 't') return click('[data-act=trace]');
    if (k === 'u') return click('[data-act=showall]', left);
    if (e.key === 'Escape') { if (view.iso) { ctx.exitIso(); return true; } if (ctx.getCurrent()) { engine.dispatchEvent(new CustomEvent('pick', { detail: null })); return true; } return false; }
    if (!e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return ctx.stepMuscle(e.key === 'ArrowRight' ? 1 : -1);
    return false;
  };

  const quiz = (e, k) => {
    if (e.repeat) return false;
    const opts = [...panelBody.querySelectorAll('[data-opt]')];
    if (/^[1-9]$/.test(k)) {
      if (opts.length) { const o = opts[+k - 1]; if (o && !o.disabled) { o.click(); return true; } return true; }
      const types = panelBody.querySelectorAll('[data-k=type] button'); if (types[+k - 1]) { types[+k - 1].click(); return true; }
      return false;
    }
    if (k === 'Enter' || k === ' ') return click('[data-act=next]') || click('[data-act=start]') || (!opts.length && click('[data-act=skip]')) || true;
    if (k === 'ArrowRight') return click('[data-act=next]');
    if (k === 'a') return click('[data-act=show]');
    if (k === 'm' || e.key === 'Escape') return click('.acts [data-act=menu]');
    return false;
  };

  const srs = (e, k) => {
    if (e.repeat) return false;
    const grades = [...panelBody.querySelectorAll('[data-q]')];
    if (/^[1-4]$/.test(k) && grades.length) { grades[+k - 1].click(); return true; }
    if (k === 'Enter' || k === ' ') {
      if (click('[data-act=go]')) return true;
      if (click('[data-act=reveal]')) { lastReveal = performance.now(); return true; }
      if (grades.length) { if (performance.now() - lastReveal > 350) grades[2].click(); return true; } // „Dobrze”, z osłoną przed podwójnym naciśnięciem
      return false;
    }
    if (k === 'a') return click('[data-act=atlas]');
    if (e.key === 'Escape') return click('.score [data-act=home]');
    return false;
  };

  const learn = (e, k) => {
    if (e.repeat && !(e.key === 'ArrowUp' || e.key === 'ArrowDown')) return false;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') return moveSel(e.key === 'ArrowDown' ? 1 : -1);
    if (e.key === 'ArrowRight') return click('[data-act=next]');
    if (e.key === 'ArrowLeft') return click('[data-act=prev]');
    if (k === 'Enter' || k === ' ') return openSel() || click('[data-act=start]') || click('[data-act=next]');
    if (k === 'q') return click('[data-act=quiz]');
    if (k === 'a') return click('[data-act=atlas]');
    if (k === 's') return click('[data-act=side]');
    if (e.key === 'Escape') return click('[data-act=group]') || click('[data-act=home]');
    return false;
  };

  const motion = (e, k) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') return moveSel(e.key === 'ArrowDown' ? 1 : -1);
    if (e.repeat) return false;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') return modes.motion.stepMove(e.key === 'ArrowRight' ? 1 : -1);
    if (k === 'Enter') return openSel();
    if (k === ' ') return click('[data-act=play]');
    if (k === 'a') return click('[data-act=ant]');
    if (k === 's') return click('[data-act=side]');
    if (e.key === 'Escape') return click('[data-act=back]');
    return false;
  };
  const byMode = { atlas, quiz, srs, learn, motion };

  // ---------- szukajka: strzałki po wynikach ----------
  q.addEventListener('keydown', (e) => {
    const rs = [...results.querySelectorAll('.r')]; if (results.hidden || !rs.length) return;
    let i = rs.findIndex((r) => r.classList.contains('act'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); rs.forEach((r) => r.classList.remove('act'));
      i = e.key === 'ArrowDown' ? Math.min(rs.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1);
      rs[i].classList.add('act'); rs[i].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && i >= 0) { e.preventDefault(); e.stopImmediatePropagation(); rs[i].click(); }
  }, true);
  q.addEventListener('input', () => results.querySelectorAll('.r').forEach((r) => r.classList.remove('act')));

  // ---------- główna obsługa ----------
  window.addEventListener('keydown', (e) => {
    if (!document.body.classList.contains('kb') && !e.metaKey && !e.ctrlKey) { document.body.classList.add('kb'); annotate(); }
    const t = e.target;
    if (t.matches('input,textarea,select')) { if (e.key === 'Escape') { t.blur(); results.hidden = true; } else if (e.key === 'k' && (e.ctrlKey || e.metaKey)) e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); q.focus(); q.select(); return; }
    if (e.ctrlKey || e.metaKey) return;
    if (document.body.classList.contains('reel') || document.body.classList.contains('post')) return;
    if (!box.hidden) { if (e.key === 'Escape' || e.key === '?' || e.key === 'Backspace') { e.preventDefault(); hideHelp(); } return; }
    if (e.key === '?') { e.preventDefault(); showHelp(); return; }
    if (e.key === '/') { e.preventDefault(); q.focus(); return; }
    if (e.altKey) { const n = /^Digit([1-5])$/.exec(e.code); if (n) { e.preventDefault(); ctx.setMode(MODE_ORDER[+n[1] - 1]); } return; }
    if (e.key === 'Backspace') e = new Proxy(e, { get: (o, p) => (p === 'key' ? 'Escape' : typeof o[p] === 'function' ? o[p].bind(o) : o[p]) }); // iPad bez klawisza Esc
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === '[' || k === ']') { const i = MODE_ORDER.indexOf(ctx.getMode()); e.preventDefault(); ctx.setMode(MODE_ORDER[(i + (k === ']' ? 1 : MODE_ORDER.length - 1)) % MODE_ORDER.length]); return; }
    let handled = false;
    if (e.shiftKey && k.startsWith('Arrow')) handled = camera(e);
    else {
      handled = byMode[ctx.getMode()]?.(e, k) ?? false;
      // strzałki bez wybranej akcji obracają model; +/−/Home/F/B/R/L działają wszędzie, gdzie nie przeszkadzają
      if (!handled && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && ['atlas', 'motion', 'quiz', 'srs', 'learn'].includes(ctx.getMode())) handled = camera(e);
      if (!handled && !(ctx.getMode() === 'atlas' && /^[0-9]$/.test(k))) handled = camera(e);
    }
    if (handled) { e.preventDefault(); if (e.key === ' ') spaceHandled = true; }
    else if ((e.key === 'Enter' || e.key === ' ') && t.closest('button') && t.closest('#panelBody')) { /* natywna aktywacja fokusowanego przycisku */ }
  });
  window.addEventListener('keyup', (e) => { if (e.key === ' ' && spaceHandled) { spaceHandled = false; if (!e.target.matches('input,textarea,select')) e.preventDefault(); } });
  // po kliknięciu przycisk nie zostaje sfokusowany – inaczej Spacja/Enter uruchomiłyby go drugi raz
  document.addEventListener('click', (e) => { const b = e.target.closest('#panelBody button, #left button'); if (b && e.detail > 0) b.blur(); });
  schedule();
}
