// „Uczę się” i własne zestawy struktur do nauki.
// Jeden dokument w ustawieniach (settings/learnsets), więc synchronizuje się z kontem razem z resztą ustawień.
// Klucze to klucze mięśni z bazy (MUSCLES) – na nich działa tryb Nauka i quiz z zakresu.
import { store } from './store.js';

const ID = 'learnsets';
export function mine() {
  const m = store.get('settings', ID) ?? {};
  return { learning: [...(m.learning ?? [])], sets: (m.sets ?? []).map((s) => ({ ...s, keys: [...s.keys] })) };
}
const save = (m) => store.put('settings', ID, { learning: m.learning, sets: m.sets });

export const isLearning = (k) => mine().learning.includes(k);

/** Przełącza (albo ustawia, gdy podano on) oznaczenie „Uczę się”; zwraca nowy stan. */
export function toggleLearning(k, on) {
  const m = mine(), has = m.learning.includes(k), want = on ?? !has;
  if (want && !has) m.learning.push(k);
  if (!want && has) m.learning = m.learning.filter((x) => x !== k);
  if (want !== has) save(m);
  return want;
}
/** Dodaje wiele naraz; zwraca liczbę nowych. */
export function addLearning(keys) {
  const m = mine(), before = m.learning.length;
  for (const k of keys) if (!m.learning.includes(k)) m.learning.push(k);
  if (m.learning.length !== before) save(m);
  return m.learning.length - before;
}
export function clearLearning() { const m = mine(); m.learning = []; save(m); }

export function saveSet(name, keys) {
  const m = mine(), id = Date.now().toString(36);
  m.sets.push({ id, name: name.trim().slice(0, 60) || 'Mój zestaw', keys: [...new Set(keys)] });
  save(m);
  return id;
}
export function deleteSet(id) { const m = mine(); m.sets = m.sets.filter((s) => s.id !== id); save(m); }
