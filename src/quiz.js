// Quiz na modelu 3D: wskaż strukturę, rozpoznaj podświetloną, pytania o fakty.
import { polishName } from './data/names.js';
import { REGIONS } from './model.js';

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const SYS = [['muscles', 'Mięśnie'], ['bones', 'Kości'], ['nerves', 'Nerwy'], ['arteries', 'Tętnice']];
const TYPES = [['point', 'Wskaż na modelu'], ['name', 'Rozpoznaj strukturę'], ['facts', 'Fakty o mięśniach']];
const FACTS = [
  ['n', (m) => `Co unerwia: ${m.lat}?`], ['i', (m) => `Gdzie jest przyczep końcowy: ${m.lat}?`],
  ['o', (m) => `Gdzie jest przyczep początkowy: ${m.lat}?`], ['f', (m) => `Jaka jest główna czynność: ${m.lat}?`],
];

export function initQuiz(ctx) {
  const { engine, model, view, applyView, panelBody, esc, MUSCLES, NERVES } = ctx;
  const S = { sys: 'muscles', reg: 'all', type: 'point', deep: false, side: 'r', ok: 0, bad: 0, streak: 0, cur: null, answered: false, last: null };

  const superficial = (key) => model.muscleEntity(key, 'r').ids.some((i) => model.meta[i].colls.includes('Superficial muscles'));
  function pool() {
    if (S.type === 'facts' || S.sys === 'muscles') {
      let ks = Object.keys(MUSCLES).filter((k) => S.reg === 'all' || MUSCLES[k].reg === S.reg);
      if (S.type === 'point') ks = ks.filter((k) => superficial(k) !== S.deep);
      return ks.map((k) => ({ kind: 'muscle', key: k, title: MUSCLES[k].pl, lat: MUSCLES[k].lat }));
    }
    if (S.sys === 'nerves') return Object.keys(NERVES).filter((k) => model.nerveEntity(k, 'r').ids.length).map((k) => ({ kind: 'nerve', key: k, title: NERVES[k].pl, lat: NERVES[k].lat }));
    const layer = S.sys, out = [], seen = new Set();
    for (const m of model.meta) {
      if (m.layer !== layer || seen.has(m.n) || m.s === 'l' || (S.reg !== 'all' && m.reg !== S.reg)) continue;
      seen.add(m.n);
      const pl = polishName(m.n);
      if (!pl || /Chrząstka|Trzonowiec|Siekacz|Kieł|Przedtrzonowiec/.test(pl)) continue;
      out.push({ kind: 'struct', key: m.n, id: m.id, title: pl, lat: model.latin[m.n] ?? m.n });
    }
    return out;
  }
  const entOf = (it) => (it.kind === 'muscle' ? model.muscleEntity(it.key, S.side) : it.kind === 'nerve' ? model.nerveEntity(it.key, S.side) : model.structEntity(model.ids(it.key, model.meta[it.id].s ? S.side : '')[0] ?? it.id));
  const sameItem = (ent, it) => (it.kind === 'struct' ? ent.type === 'struct' && ent.name === it.key : ent.type === it.kind && ent.key === it.key);

  function scoreHtml() { return `<div class="score"><span>Dobrze: <b>${S.ok}</b></span><span>Źle: <b>${S.bad}</b></span><span>Seria: <b>${S.streak}</b></span></div>`; }
  function menu() {
    S.cur = null; view.only = null; view.tints.clear(); view.iso = null; applyView();
    panelBody.innerHTML = `<h2>Quiz</h2>${scoreHtml()}
      <h4>Rodzaj pytań</h4><div class="seg" data-k="type">${TYPES.map(([k, n]) => `<button data-v="${k}" class="${S.type === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      ${S.type !== 'facts' ? `<h4>Układ</h4><div class="seg" data-k="sys">${SYS.map(([k, n]) => `<button data-v="${k}" class="${S.sys === k ? 'on' : ''}">${n}</button>`).join('')}</div>` : ''}
      ${S.sys !== 'nerves' || S.type === 'facts' ? `<h4>Okolica</h4><div class="seg" data-k="reg">${REGIONS.map(([k, n]) => `<button data-v="${k}" class="${S.reg === k ? 'on' : ''}">${n}</button>`).join('')}</div>` : ''}
      ${S.type === 'point' && S.sys === 'muscles' ? `<h4>Warstwa mięśni</h4><div class="seg" data-k="deep"><button data-v="0" class="${!S.deep ? 'on' : ''}">Powierzchowne</button><button data-v="1" class="${S.deep ? 'on' : ''}">Głębokie</button></div>` : ''}
      <p class="en" style="margin-top:12px">Pula pytań: <b>${pool().length}</b></p>
      <div class="acts"><button class="primary" data-act="start" ${pool().length < 4 ? 'disabled' : ''}>Start</button><button data-act="zero">Wyzeruj wynik</button></div>
      <p class="note">Błędne odpowiedzi dotyczące mięśni trafiają od razu do Powtórek.</p>`;
  }

  async function next() {
    const P = pool(); if (P.length < 4) return menu();
    let it; do { it = P[Math.floor(Math.random() * P.length)]; } while (S.last && it.key === S.last && P.length > 1);
    S.last = it.key; S.answered = false; view.tints.clear(); view.iso = null; view.sel.clear();
    const ent = entOf(it);
    const layer = it.kind === 'muscle' ? 'muscles' : it.kind === 'nerve' ? 'nerves' : S.sys;
    await ctx.need('bones', layer);
    if (S.type === 'point') {
      const reg = it.kind === 'muscle' ? MUSCLES[it.key].reg : it.kind === 'struct' ? model.meta[it.id].reg : null;
      const only = new Set();
      for (const m of model.meta) {
        if (m.s && m.s !== S.side) continue;
        if (m.layer === 'bones' && (layer !== 'bones' || !reg || S.reg === 'all' || m.reg === reg)) only.add(m.id);
        else if (m.layer === layer && (S.reg === 'all' || !reg || m.reg === reg)) {
          if (layer === 'muscles' && S.deep && m.colls.includes('Superficial muscles')) continue;
          only.add(m.id);
        }
      }
      view.only = only; applyView();
      if (S.reg !== 'all') engine.focus([...only].filter((i) => model.meta[i].layer === layer), { pad: 1.15 }); else ctx.home();
      S.cur = { it, ent };
      panelBody.innerHTML = `${scoreHtml()}<p class="en">Wskaż na modelu:</p><div class="qtext">${esc(it.title)}</div><div class="lat">${esc(it.lat)}</div>
        <div id="fb"></div><div class="acts"><button data-act="skip">Nie wiem – pokaż</button><button data-act="menu">Zakończ</button></div>`;
      ctx.hint(`Wskaż: ${it.title}`, '', 0);
    } else if (S.type === 'name') {
      view.only = null;
      view.iso = { focus: new Set(ent.ids), side: S.side, others: 'ghost', show: {} };
      ent.ids.forEach((i) => view.tints.set(i, '#35c98a'));
      applyView(); engine.focus(ent.ids, { pad: 2.6 });
      const opts = shuffle([it, ...shuffle(P.filter((x) => x.key !== it.key)).slice(0, 3)]);
      S.cur = { it, ent, opts };
      panelBody.innerHTML = `${scoreHtml()}<div class="qtext">Co to za struktura (podświetlona na zielono)?</div>
        <div class="opts">${opts.map((o, i) => `<button data-opt="${i}"><b>${esc(o.title)}</b><br><span class="lat">${esc(o.lat)}</span></button>`).join('')}</div>
        <div id="fb"></div><div class="acts"><button data-act="menu">Zakończ</button></div>`;
    } else {
      const [field, ask] = FACTS[Math.floor(Math.random() * FACTS.length)];
      const val = (k) => { const v = MUSCLES[k][field]; return Array.isArray(v) ? v[0] : v; };
      const right = val(it.key), used = new Set([right]), opts = [{ t: right, ok: true }];
      for (const o of shuffle(P.filter((x) => x.key !== it.key && MUSCLES[x.key].grp === MUSCLES[it.key].grp).concat(shuffle(P.slice())))) {
        const v = val(o.key); if (!v || used.has(v)) continue; used.add(v); opts.push({ t: v }); if (opts.length === 4) break;
      }
      view.only = null; view.iso = { focus: new Set(ent.ids), side: S.side, others: 'ghost', show: {} }; applyView(); engine.focus(ent.ids, { pad: 2.2 });
      S.cur = { it, ent, opts: shuffle(opts), field };
      panelBody.innerHTML = `${scoreHtml()}<div class="qtext">${esc(ask(MUSCLES[it.key]))}</div><p class="en">${esc(it.title)}</p>
        <div class="opts">${S.cur.opts.map((o, i) => `<button data-opt="${i}">${esc(o.t)}</button>`).join('')}</div>
        <div id="fb"></div><div class="acts"><button data-act="menu">Zakończ</button></div>`;
    }
    panelBody.scrollTop = 0;
  }

  function finish(ok, extra = '') {
    S.answered = true;
    if (ok) { S.ok++; S.streak++; } else { S.bad++; S.streak = 0; if (S.cur.it.kind === 'muscle') ctx.srsFlag?.(S.cur.it.key); }
    const it = S.cur.it;
    ctx.hint(ok ? 'Dobrze!' : `Źle – to: ${it.title}`, ok ? 'ok' : 'bad', 2500);
    const fb = panelBody.querySelector('#fb');
    panelBody.querySelector('[data-act="skip"]')?.parentElement.remove();
    panelBody.querySelectorAll('.acts [data-act="menu"]').forEach((b) => { if (b.parentElement.children.length === 1) b.parentElement.remove(); });
    if (fb) fb.innerHTML = `<div class="card ${ok ? '' : 'clin'}"><h5>${ok ? '✔ Dobrze' : '✘ Poprawna odpowiedź'}</h5><p><b>${esc(it.title)}</b> – <span class="lat">${esc(it.lat)}</span></p>${extra}</div>
      <div class="acts"><button class="primary" data-act="next">Dalej →</button><button data-act="show">Zobacz w atlasie</button><button data-act="menu">Zakończ</button></div>`;
    panelBody.querySelector('.score')?.replaceWith(Object.assign(document.createElement('div'), { innerHTML: scoreHtml() }).firstChild);
    fb?.scrollIntoView({ block: 'nearest' });
  }
  function reveal() { S.cur.ent.ids.forEach((i) => view.tints.set(i, '#35c98a')); applyView(); engine.focus(S.cur.ent.ids, { pad: 2.6 }); }

  panelBody.addEventListener('click', (e) => {
    if (!ctx.modeIs('quiz')) return;
    const B = e.target.closest('[data-k] button'), A = e.target.closest('[data-act]'), O = e.target.closest('[data-opt]');
    if (B) { const k = B.parentElement.dataset.k; S[k] = k === 'deep' ? B.dataset.v === '1' : B.dataset.v; if (S.type === 'facts') S.sys = 'muscles'; menu(); }
    else if (O && !S.answered) {
      const i = +O.dataset.opt, o = S.cur.opts[i], ok = S.type === 'name' ? o.key === S.cur.it.key : !!o.ok;
      panelBody.querySelectorAll('[data-opt]').forEach((b, j) => { const oo = S.cur.opts[j]; const good = S.type === 'name' ? oo.key === S.cur.it.key : oo.ok; if (good) b.classList.add('ok'); else if (j === i) b.classList.add('bad'); b.disabled = true; });
      const kb = MUSCLES[S.cur.it.key];
      finish(ok, S.type === 'facts' && kb.s ? `<p style="margin-top:6px">💡 ${esc(kb.s)}</p>` : '');
    } else if (A) {
      const a = A.dataset.act;
      if (a === 'start' || a === 'next') next();
      else if (a === 'menu') menu();
      else if (a === 'zero') { S.ok = S.bad = S.streak = 0; menu(); }
      else if (a === 'skip' && !S.answered) { reveal(); finish(false); }
      else if (a === 'show') { const ent = S.cur.ent; ctx.setMode('atlas'); ctx.select(ent, { isolate: true }); }
    }
  });

  return {
    enter: menu,
    leave() { view.only = null; view.tints.clear(); view.iso = null; ctx.hint('', '', 1); },
    onPick(hit) {
      if (S.type !== 'point' || !S.cur || S.answered) return true;
      if (!hit) return true;
      const ent = model.entityOf(hit.id);
      if (model.meta[hit.id].layer === 'bones' && S.cur.it.kind !== 'struct') return true; // kość w tle – ignoruj
      const ok = sameItem(ent, S.cur.it);
      if (!ok) ent.ids.forEach((i) => view.tints.set(i, '#ff5a5a'));
      reveal();
      finish(ok, ok ? '' : `<p class="en">Wskazano: ${esc(ent.title)}</p>`);
      return true;
    },
  };
}
