// Powtórki rozłożone w czasie (algorytm SM-2) – fiszki generowane z bazy wiedzy, postęp w src/store.js (lokalnie + chmura).
import FT from './data/func_tests.js';
import CT from './data/clinical_tests.js';
import COND from './data/conditions.js';
import { REGIONS } from './model.js';
import { store } from './store.js';

const DAY = 86400000;
const today = () => new Date().toISOString().slice(0, 10);
const DECKS = [...REGIONS.slice(1), ['nv', 'Nerwy'], ['ft', 'Testy funkcjonalne'], ['sch', 'Schorzenia']];

export function initSrs(ctx) {
  const { engine, model, view, applyView, panelBody, esc, MUSCLES, NERVES } = ctx;
  const DEF = { perDay: 15, day: { date: today(), n: 0 }, decks: { gs: true, tu: true, kg: true, kd: true, nv: true, ft: true, sch: true }, side: 'r' };
  const cards = store.all('srs'); // id karty → { ef, iv, reps, lapses, due, t }
  const load = () => { const sv = store.get('settings', 'srs') ?? {}; return { ...DEF, ...sv, decks: { ...DEF.decks, ...(sv.decks ?? {}) } }; }; // nowe talie domyślnie włączone
  let st = load();
  const save = () => { const { perDay, day, decks, side } = st; store.put('settings', 'srs', { perDay, day, decks, side }); badge(); };
  const putCard = (id, c) => { const { t, ...v } = c; store.put('srs', id, v); };
  store.on((ns, id, remote) => {
    if (ns === 'settings' && remote) st = load();
    if (ns !== 'srs' && ns !== 'settings') return;
    badge();
    if (remote && ctx.modeIs('srs') && !cur) homeView(); // zmiana z innego urządzenia – odśwież ekran startowy
  });

  // talia
  const CARDS = [];
  for (const [k, m] of Object.entries(MUSCLES)) {
    CARDS.push({ id: `${k}:att`, deck: m.reg, kind: 'muscle', key: k, q: 'Przyczepy – początkowy i końcowy?', a: () => `<p><b style="color:var(--orig)">Początek:</b> ${esc(m.o)}</p><p style="margin-top:6px"><b style="color:var(--ins)">Koniec:</b> ${esc(m.i)}</p>`, hideAtt: true });
    CARDS.push({ id: `${k}:n`, deck: m.reg, kind: 'muscle', key: k, q: 'Unerwienie?', a: () => `<p>${esc(m.n)}</p>`, hideNerve: true });
    if (m.mmt && m.mmt.length > 40) CARDS.push({ id: `${k}:mmt`, deck: m.reg, kind: 'muscle', key: k, q: 'Jak zbadać siłę tego mięśnia? Gdzie go wyczuć?', a: () => `<p><b>Test siły:</b> ${esc(m.mmt)}</p>${m.palp && m.palp !== 'Niedostępny.' ? `<p style="margin-top:6px"><b>Palpacja:</b> ${esc(m.palp)}</p>` : ''}` });
    CARDS.push({ id: `${k}:f`, deck: m.reg, kind: 'muscle', key: k, q: 'Czynność?', a: () => `<ul>${m.f.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>${m.s ? `<p style="margin-top:6px">💡 ${esc(m.s)}</p>` : ''}` });
  }
  for (const [k, n] of Object.entries(NERVES)) {
    CARDS.push({ id: `${k}:motor`, deck: 'nv', kind: 'nerve', key: k, q: 'Jakie mięśnie unerwia? Z jakich korzeni pochodzi?', a: () => `<p><b>Korzenie:</b> ${esc(n.roots)}</p><p style="margin-top:6px">${esc(n.motor)}</p>` });
    CARDS.push({ id: `${k}:palsy`, deck: 'nv', kind: 'nerve', key: k, q: 'Objawy uszkodzenia?', a: () => `<p>${esc(n.palsy)}</p>${n.tip ? `<p style="margin-top:6px">💡 ${esc(n.tip)}</p>` : ''}` });
  }
  for (const [k, t] of Object.entries(FT)) {
    CARDS.push({ id: `${k}:ft`, deck: 'ft', kind: 'functest', key: k, q: `${t.pl} (${t.skrot}) – co mierzy i jak go wykonać?`, a: () => `<p>${esc(t.cel)}</p><ol class="ft-steps" style="margin-top:6px">${t.wykonanie.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` });
    CARDS.push({ id: `${k}:norm`, deck: 'ft', kind: 'functest', key: k, q: `${t.pl} (${t.skrot}) – jak ocenić wynik? Normy i punkty odcięcia?`, a: () => `<p>${esc(t.pomiar)}</p><ul style="margin-top:6px">${t.normy.map(([g, v]) => `<li>${esc(g)}: <b>${esc(v)}</b></li>`).join('')}</ul>` });
  }
  for (const [k, t] of Object.entries(CT)) {
    CARDS.push({ id: `${k}:ct`, deck: 'ft', kind: 'functest', key: k, q: `${t.pl} – co ocenia i jak go wykonać?`, a: () => `<p>${esc(t.cel)}</p><p style="margin-top:6px"><b>Pozycja:</b> ${esc(t.pozycja)}</p><ol class="ft-steps" style="margin-top:6px">${t.wykonanie.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` });
    CARDS.push({ id: `${k}:ctplus`, deck: 'ft', kind: 'functest', key: k, q: `${t.pl} – wynik dodatni? Co sugeruje i dlaczego?`, a: () => `<p><b>Wynik dodatni:</b> ${esc(t.dodatni)}</p><p style="margin-top:6px"><b>Sugeruje:</b> ${esc(t.sugeruje)}</p><p style="margin-top:6px">💡 ${esc(t.dlaczego)}</p>` });
  }
  for (const [k, c] of Object.entries(COND)) {
    CARDS.push({ id: `${k}:sx`, deck: 'sch', kind: 'condition', key: k, q: `${c.pl} – objawy i jak to zbadać?`, a: () => `<ul>${c.objawy.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p style="margin-top:6px"><b>Badanie:</b></p><ul>${c.badanie.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` });
    CARDS.push({ id: `${k}:mx`, deck: 'sch', kind: 'condition', key: k, q: `${c.pl} – jak powstaje i jak to leczyć?`, a: () => `<p>${esc(c.mech)}</p><p style="margin-top:6px"><b>Fizjoterapia:</b></p><ul>${c.fizjo.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` });
  }
  const byId = new Map(CARDS.map((c) => [c.id, c]));
  const active = () => CARDS.filter((c) => st.decks[c.deck]);
  const dueList = () => { const now = Date.now(); return active().filter((c) => cards[c.id] && cards[c.id].due <= now).sort((a, b) => cards[a.id].due - cards[b.id].due); };
  const newList = () => { if (st.day.date !== today()) st.day = { date: today(), n: 0 }; return active().filter((c) => !cards[c.id]).slice(0, Math.max(0, st.perDay - st.day.n)); };
  function badge() { const el = document.getElementById('dueBadge'), n = dueList().length; el.hidden = !n; el.textContent = n; }

  let queue = [], cur = null, shown = false, done = 0;

  function homeView() {
    cur = null; view.iso = null; view.tints.clear(); applyView();
    const due = dueList().length, nw = newList().length, all = active().length;
    const learned = active().filter((c) => cards[c.id]).length, mature = active().filter((c) => (cards[c.id]?.iv ?? 0) >= 21).length;
    panelBody.innerHTML = `<h2>Powtórki</h2><p class="en">Fiszki z modelem 3D. Algorytm sam wyznacza, kiedy wrócić do danej karty.</p>
      <div class="stat"><div><b>${due}</b>do powtórki</div><div><b>${nw}</b>nowe dziś</div><div><b>${mature}</b>utrwalone</div></div>
      <p class="en">W nauce: ${learned} / ${all} kart</p>
      <div class="acts"><button class="primary" data-act="go" ${due + nw ? '' : 'disabled'}>${due + nw ? `Zacznij sesję (${due + nw})` : 'Na dziś wszystko zrobione'}</button></div>
      <h4>Talie</h4><div class="chips">${DECKS.map(([k, n]) => `<span class="chip ${st.decks[k] ? 'on' : ''}" data-deck="${k}">${n}</span>`).join('')}</div>
      <div class="field" style="margin-top:14px"><label>Nowe / dzień</label><select data-set="perDay">${[5, 10, 15, 20, 30, 50].map((n) => `<option ${st.perDay === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="field"><label>Strona ciała</label><select data-set="side"><option value="r" ${st.side === 'r' ? 'selected' : ''}>prawa</option><option value="l" ${st.side === 'l' ? 'selected' : ''}>lewa</option></select></div>
      <div class="acts"><button data-act="export">Eksport postępu</button><button data-act="import">Import</button><button data-act="wipe">Wyzeruj postęp</button></div>
      <p class="note">${ctx.cloudUser?.() ? 'Postęp synchronizuje się z Twoim kontem – na każdym urządzeniu, na którym się zalogujesz. Eksport zostaje jako kopia zapasowa.' : 'Postęp zapisuje się w tej przeglądarce. Zaloguj się (☁ u góry), żeby synchronizować go między telefonem, tabletem i komputerem – albo przenieś go eksportem / importem.'}</p>`;
    badge();
  }

  function start() { queue = [...dueList(), ...newList()]; done = 0; nextCard(); }
  async function nextCard() {
    if (!queue.length) { ctx.hint('Sesja zakończona 🎉', 'ok'); return homeView(); }
    cur = queue.shift(); shown = false;
    const musclesOf = (k) => (cur.kind === 'condition' ? [...(COND[k].viz.muscles ?? []), ...(COND[k].viz.inv ?? [])] : (FT[k] ?? CT[k]).muscles).filter((m) => ctx.MUSCLES[m]);
    const ent = cur.kind === 'muscle' ? model.muscleEntity(cur.key, st.side) : cur.kind === 'functest' || cur.kind === 'condition'
      ? { type: 'functest', key: cur.key, ids: musclesOf(cur.key).flatMap((k) => model.muscleEntity(k, st.side).ids), att: [], bones: [], nerves: [], nervePath: [] }
      : model.nerveEntity(cur.key, st.side);
    cur.ent = ent;
    await ctx.need('bones', 'muscles', 'nerves', 'attachments');
    stage(false);
    if (ent.ids.length) engine.focus(ent.ids, ent.type === 'functest' ? { pad: 1.2 } : { pad: 2.1, dir: ctx.entDir(ent) }); else ctx.home();
    render();
  }
  function stage(revealed) {
    const ent = cur.ent;
    view.iso = { focus: new Set(ent.ids), side: st.side, others: 'ghost', show: { att: revealed || !cur.hideAtt, bones: true, nerves: revealed || !cur.hideNerve, path: revealed || !cur.hideNerve, muscles: revealed, arteries: false },
      att: new Set(ent.att ?? []), bones: new Set(ent.bones ?? []), nerves: new Set(ent.nerves ?? []), path: new Set(ent.nervePath ?? []),
      muscles: new Set(ent.type === 'nerve' ? ent.muscles.flatMap((m) => m.mesh.flatMap((n) => model.ids(n, st.side))) : []) };
    applyView();
  }
  const preview = (q) => { const c = { ef: 2.5, iv: 0, reps: 0, ...(cards[cur.id] ?? {}) }; const r = calc(c, q); return r.iv === 0 ? '10 min' : r.iv < 30 ? `${r.iv} d` : `${Math.round(r.iv / 30)} mies.`; };
  function calc(c, q) {
    let { ef, iv, reps } = c;
    if (q < 3) return { ef: Math.max(1.3, ef - 0.2), iv: 0, reps: 0 };
    reps++;
    iv = reps === 1 ? (q === 5 ? 3 : 1) : reps === 2 ? (q === 3 ? 2 : q === 5 ? 5 : 3) : Math.max(iv + 1, Math.round(iv * ef * (q === 3 ? 0.8 : q === 5 ? 1.3 : 1)));
    ef = Math.max(1.3, ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    return { ef, iv, reps };
  }
  function grade(q) {
    const isNew = !cards[cur.id];
    const c = { ef: 2.5, iv: 0, reps: 0, lapses: 0, ...(cards[cur.id] ?? {}) };
    const r = calc(c, q);
    putCard(cur.id, { ...c, ...r, lapses: c.lapses + (q < 3 ? 1 : 0), due: r.iv === 0 ? Date.now() + 600000 : Date.now() + r.iv * DAY - 4 * 3600000 });
    if (isNew) { if (st.day.date !== today()) st.day = { date: today(), n: 0 }; st.day.n++; }
    if (q < 3) queue.splice(Math.min(queue.length, 4), 0, cur);
    done++; save(); nextCard();
  }
  function render() {
    const ent = cur.ent;
    panelBody.innerHTML = `<div class="score"><span>Pozostało: <b>${queue.length + 1}</b></span><span>Zrobione: <b>${done}</b></span><span class="link" data-act="home">Zakończ</span></div>
      <h2>${esc(ent.title)}</h2><div class="lat">${esc(ent.lat)}</div>
      <div class="qtext" style="margin-top:14px">${esc(cur.q)}</div>
      ${shown ? `<div class="card">${cur.a()}</div>
        <div class="grade"><button data-q="1" style="border-color:var(--bad)">Nie wiem<small>${preview(1)}</small></button><button data-q="3" style="border-color:var(--warn)">Trudne<small>${preview(3)}</small></button><button data-q="4" style="border-color:var(--ok)">Dobrze<small>${preview(4)}</small></button><button data-q="5" style="border-color:var(--acc)">Łatwe<small>${preview(5)}</small></button></div>
        <div class="acts"><button data-act="atlas">Otwórz w atlasie</button></div>`
    : `<p class="en">Przypomnij sobie odpowiedź (najlepiej na głos), obejrzyj mięsień na modelu, potem odsłoń.</p><div class="acts"><button class="primary" data-act="reveal" style="flex:1;padding:12px">Pokaż odpowiedź</button></div>`}`;
    panelBody.scrollTop = 0;
  }

  panelBody.addEventListener('change', (e) => { if (!ctx.modeIs('srs')) return; const s = e.target.closest('[data-set]'); if (s) { st[s.dataset.set] = s.dataset.set === 'perDay' ? +s.value : s.value; save(); homeView(); } });
  panelBody.addEventListener('click', (e) => {
    if (!ctx.modeIs('srs')) return;
    const A = e.target.closest('[data-act]'), D = e.target.closest('[data-deck]'), Q = e.target.closest('[data-q]');
    if (D) { st.decks[D.dataset.deck] = !st.decks[D.dataset.deck]; save(); homeView(); }
    else if (Q) grade(+Q.dataset.q);
    else if (A) {
      const a = A.dataset.act;
      if (a === 'go') start();
      else if (a === 'home') homeView();
      else if (a === 'reveal') { shown = true; stage(true); render(); }
      else if (a === 'atlas') { const ent = cur.ent; if (ent.type === 'functest') { ctx.openNote(`functest:${ent.key}`); return; } ctx.setMode('atlas'); ctx.select(ent, { isolate: true }); }
      else if (a === 'wipe') { if (confirm('Na pewno wyzerować cały postęp powtórek?' + (ctx.cloudUser?.() ? ' Zniknie też z pozostałych urządzeń.' : ''))) { store.clear('srs'); st.day = { date: today(), n: 0 }; save(); homeView(); } }
      else if (a === 'export') { const blob = new Blob([JSON.stringify({ ...st, cards })], { type: 'application/json' }); const u = URL.createObjectURL(blob); Object.assign(document.createElement('a'), { href: u, download: `anatomia-postep-${today()}.json` }).click(); URL.revokeObjectURL(u); }
      else if (a === 'import') {
        const inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json' });
        inp.onchange = async () => {
          try {
            const d = JSON.parse(await inp.files[0].text()); if (!d.cards) throw 0;
            for (const [id, c] of Object.entries(d.cards)) putCard(id, c);
            for (const k of ['perDay', 'decks', 'side', 'day']) if (d[k] !== undefined) st[k] = d[k];
            save(); homeView(); ctx.hint('Zaimportowano postęp', 'ok');
          } catch { ctx.hint('Nieprawidłowy plik', 'bad'); }
        };
        inp.click();
      }
    }
  });

  // błędna odpowiedź w quizie → karty mięśnia wracają do powtórki od razu
  ctx.srsFlag = (key) => { for (const s of ['att', 'n', 'f']) { const id = `${key}:${s}`; if (byId.has(id)) putCard(id, { ef: 2.5, iv: 0, reps: 0, lapses: 0, ...(cards[id] ?? {}), due: Date.now() }); } badge(); };
  badge();
  return { enter: homeView, leave() { view.iso = null; view.tints.clear(); cur = null; }, onPick() { return true; } };
}
