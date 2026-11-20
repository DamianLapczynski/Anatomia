// Synchronizacja postępu przez Firebase: logowanie Google + Firestore z pamięcią offline.
// Ładowany dynamicznie (import()) dopiero, gdy jest potrzebny – start aplikacji bez konta nie pobiera Firebase.
// Dane: users/{uid}/{srs|quiz|learn|settings}/{id} – jeden dokument na fiszkę, pytanie, sektor.
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithCredential, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator, collection, doc, setDoc, deleteDoc, onSnapshot, increment } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config.js';
import { store, NS } from './store.js';

const EMU = new URLSearchParams(location.search).has('emu'); // testy na lokalnym emulatorze: ?emu
const cfg = EMU ? { apiKey: 'demo', authDomain: 'localhost', projectId: 'demo-anatomia', appId: 'demo' } : firebaseConfig;
const app = initializeApp(cfg);
const auth = getAuth(app);
const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
if (EMU) { connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true }); connectFirestoreEmulator(db, '127.0.0.1', 8080); }

const listeners = new Set();
const state = { user: null, status: 'off' }; // off | sync | ok | offline | error
const set = (patch) => { Object.assign(state, patch); for (const f of listeners) f(state); };
let unsub = [], pending = new Map(), errors = 0;

function track(p) { // stan synchronizacji: czekające zapisy
  const k = Symbol(); pending.set(k, p); refresh();
  p.then(() => { pending.delete(k); refresh(); }, (e) => { pending.delete(k); errors++; console.error('Firestore:', e); set({ status: 'error', error: e.code ?? e.message }); });
}
const refresh = () => { if (state.user && state.status !== 'error') set({ status: !navigator.onLine ? 'offline' : pending.size ? 'sync' : 'ok' }); };
addEventListener('online', refresh); addEventListener('offline', refresh);

const strip = (v) => { const o = {}; for (const [k, x] of Object.entries(v)) if (x !== undefined) o[k] = x; return o; };
const ref = (ns, id) => doc(db, 'users', state.user.uid, ns, id.replace(/\//g, '∕'));
const api = {
  put: (ns, id, v) => track(setDoc(ref(ns, id), strip(v))),
  del: (ns, id) => track(deleteDoc(ref(ns, id))),
  inc: (ns, id, delta, extra) => { const o = strip(extra); for (const [k, d] of Object.entries(delta)) o[k] = increment(d); track(setDoc(ref(ns, id), o, { merge: true })); },
};

function attach(user) {
  set({ user: { uid: user.uid, name: user.displayName, email: user.email, photo: user.photoURL }, status: 'sync', error: null });
  store._attach(api);
  const merged = new Set();
  const id = (d) => d.id.replace(/∕/g, '/');
  for (const ns of NS) {
    unsub.push(onSnapshot(collection(db, 'users', user.uid, ns), { includeMetadataChanges: true }, (snap) => {
      if (!merged.has(ns)) {
        if (snap.metadata.fromCache) return; // pamięć podręczna może być niepełna – czekamy na stan z serwera
        merged.add(ns); store._merge(ns, new Map(snap.docs.map((d) => [id(d), d.data()])));
      } else {
        const changes = snap.docChanges().map((c) => ({ id: id(c.doc), val: c.type === 'removed' ? null : c.doc.data() }));
        if (changes.length) store._remote(ns, changes);
      }
      refresh();
    }, (e) => { console.error('Firestore:', e); set({ status: 'error', error: e.code }); }));
  }
}
function detach() { unsub.forEach((f) => f()); unsub = []; store._detach(); set({ user: null, status: 'off' }); }

onAuthStateChanged(auth, (u) => { detach(); if (u) { try { localStorage.setItem('anatomia.cloud', '1'); } catch { /* */ } attach(u); } });
getRedirectResult(auth).catch((e) => set({ error: e.code }));

export const cloud = {
  state,
  on(f) { listeners.add(f); f(state); return () => listeners.delete(f); },
  async signIn() {
    if (EMU) { return signInWithCredential(auth, GoogleAuthProvider.credential('{"sub": "test-user", "email": "test@example.com", "email_verified": true}')); }
    const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try { await signInWithPopup(auth, p); }
    catch (e) {
      // aplikacja z ekranu głównego (iOS) i przeglądarki blokujące okna – przekierowanie zamiast popupu
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) return signInWithRedirect(auth, p);
      if (e.code !== 'auth/popup-closed-by-user') throw e;
    }
  },
  async signOut() { try { localStorage.removeItem('anatomia.cloud'); } catch { /* */ } await signOut(auth); },
};
