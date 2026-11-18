// Postęp nauki „local-first”: wszystko zapisuje się od razu w tej przeglądarce (działa offline i bez konta),
// a po zalogowaniu (src/cloud.js) dodatkowo w Firestore i wraca z innych urządzeń.
// Przestrzenie (ns): srs – fiszki SM-2, quiz – liczniki odpowiedzi, learn – przerobione sektory, settings – ustawienia.
// Każdy wpis ma pole t (czas zmiany): przy łączeniu urządzeń wygrywa nowszy wpis. Liczniki quizu się sumują.
import { migrateKeys } from './data/renames.js';

const LS = 'anatomia.store.v1', OLD_SRS = 'anatomia.srs.v1';
export const NS = ['srs', 'quiz', 'learn', 'settings'];

let data;
try { data = JSON.parse(localStorage.getItem(LS)); } catch { data = null; }
data = data && typeof data === 'object' ? data : {};
for (const ns of NS) data[ns] ??= {};
data.pending ??= {}; // przyrosty liczników z czasu bez logowania – wysyłane przy pierwszym połączeniu

// przeniesienie postępu z wcześniejszej wersji (fiszki w osobnym kluczu)
try {
  const old = JSON.parse(localStorage.getItem(OLD_SRS));
  if (old && !data.settings.srs) {
    for (const [id, c] of Object.entries(old.cards ?? {})) if (!data.srs[id]) data.srs[id] = { ...c, t: 1 };
    const { perDay, decks, side, day } = old;
    data.settings.srs = { perDay, decks, side, day, t: 1 };
    localStorage.removeItem(OLD_SRS);
  }
} catch { /* brak starych danych */ }
if (!data.mig1) { migrateKeys(data.srs); data.mig1 = true; }

let saveTimer = 0;
const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(LS, JSON.stringify(data)); } catch { /* tryb prywatny */ } }, 50); };
save();

const subs = new Set();
const emit = (ns, id, remote) => { for (const f of subs) { try { f(ns, id, remote); } catch (e) { console.error(e); } } };

let cloud = null; // { put, inc, del } – ustawiane przez src/cloud.js po zalogowaniu

export const store = {
  all: (ns) => data[ns],
  get: (ns, id) => data[ns][id],
  /** Zapis wpisu (zastępuje poprzedni). */
  put(ns, id, val) {
    const v = { ...val, t: Date.now() };
    data[ns][id] = v; save(); cloud?.put(ns, id, v); emit(ns, id, false);
    return v;
  },
  /** Zwiększa liczniki, np. inc('quiz', id, { ok: 1 }, { kind, key }). */
  inc(ns, id, delta, extra = {}) {
    const t = Date.now(), v = { ...(data[ns][id] ?? {}), ...extra, last: t, t };
    for (const [k, d] of Object.entries(delta)) v[k] = (v[k] ?? 0) + d;
    data[ns][id] = v;
    if (cloud) cloud.inc(ns, id, delta, { ...extra, last: t, t });
    else { const p = (data.pending[ns] ??= {}), q = (p[id] ??= { delta: {}, extra: {} }); for (const [k, d] of Object.entries(delta)) q.delta[k] = (q.delta[k] ?? 0) + d; Object.assign(q.extra, extra, { last: t, t }); }
    save(); emit(ns, id, false);
    return v;
  },
  del(ns, id) { delete data[ns][id]; save(); cloud?.del(ns, id); emit(ns, id, false); },
  clear(ns) { for (const id of Object.keys(data[ns])) { delete data[ns][id]; cloud?.del(ns, id); } if (data.pending[ns]) data.pending[ns] = {}; save(); emit(ns, null, false); },
  /** f(ns, id, remote) – wywoływane po każdej zmianie (id = null: wiele naraz). Zwraca funkcję wyrejestrowania. */
  on(f) { subs.add(f); return () => subs.delete(f); },

  // ---- interfejs dla src/cloud.js ----
  _attach(api) {
    cloud = api;
    for (const [ns, items] of Object.entries(data.pending)) for (const [id, { delta, extra }] of Object.entries(items)) api.inc(ns, id, delta, extra);
    data.pending = {}; save();
  },
  _detach() { cloud = null; },
  /** Zmiany z chmury. changes: [{ id, val | null }]. */
  _remote(ns, changes) {
    for (const { id, val } of changes) {
      const loc = data[ns][id];
      if (val === null) { if (loc) delete data[ns][id]; continue; }
      if (ns === 'quiz' || !loc || (val.t ?? 0) >= (loc.t ?? 0)) data[ns][id] = val; // liczniki: stan z chmury zawiera już nasze przyrosty
      else cloud?.put(ns, id, loc); // lokalny wpis nowszy – wysyłamy
    }
    save(); emit(ns, null, true);
  },
  /** Pierwszy pełny stan z serwera (nie z pamięci podręcznej): scalenie z tym, co jest tylko lokalnie. full: Map(id → val). */
  _merge(ns, full) {
    this._remote(ns, [...full].map(([id, val]) => ({ id, val })));
    if (ns !== 'quiz') for (const [id, loc] of Object.entries(data[ns])) if (!full.has(id)) cloud?.put(ns, id, loc);
  },
  _dump: () => data,
};
