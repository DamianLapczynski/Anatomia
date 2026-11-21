// Zakresy trybu „Egzamin” (Quiz → Egzamin). regs – okolice mięśni z bazy (gs, tu, kg, kd); nerves / joints – klucze;
// types – rodzaje pytań: name (rozpoznaj podświetlony mięsień), fact (przyczepy, unerwienie, czynność),
// nerveOf (który nerw unerwia mięsień), nerve (korzenie, mięśnie nerwu), joint (pozycje, wzorzec torebkowy, testy).
// Sylabus konkretnej uczelni można dopisać jako kolejny zakres – wystarczy wymienić okolice, nerwy i stawy.
const UL_N = ['brachial_plexus', 'axillary', 'musculocutaneous', 'median', 'ulnar', 'radial', 'suprascapular', 'long_thoracic', 'dorsal_scapular', 'thoracodorsal', 'pectoral', 'subscapular'];
const LL_N = ['femoral', 'obturator', 'sciatic', 'tibial', 'common_fibular', 'deep_fibular', 'superficial_fibular', 'superior_gluteal', 'inferior_gluteal', 'lateral_femoral_cutaneous', 'saphenous', 'sural', 'pudendal', 'genitofemoral', 'iliohypogastric', 'ilioinguinal'];
const UL_J = ['glenohumeral', 'acromioclavicular', 'sternoclavicular', 'elbow', 'distal_radioulnar', 'wrist'];
const LL_J = ['hip', 'knee', 'patellofemoral', 'ankle', 'subtalar', 'tibiofibular'];
const AX_J = ['sacroiliac', 'pubic_symphysis', 'lumbar_facets', 'cervical_upper', 'tmj'];
const ALL_T = ['name', 'fact', 'nerveOf', 'nerve', 'joint'];
// rodzaj func – testy funkcjonalne (src/data/func_tests.js)

export const PRESETS = [
  { id: 'kg', pl: 'Kończyna górna', desc: 'Mięśnie obręczy i kończyny górnej, splot ramienny, stawy od mostkowo-obojczykowego do nadgarstka.', regs: ['kg'], extra: ['trapezius', 'latissimus_dorsi', 'levator_scapulae', 'rhomboid_major', 'rhomboid_minor', 'serratus_anterior', 'pectoralis_major', 'pectoralis_minor', 'subclavius'], nerves: UL_N, joints: UL_J, types: ALL_T },
  { id: 'kd', pl: 'Kończyna dolna', desc: 'Mięśnie obręczy miednicznej i kończyny dolnej, splot lędźwiowy i krzyżowy, stawy biodrowy, kolanowy, skokowe.', regs: ['kd'], nerves: LL_N, joints: LL_J, types: ALL_T },
  { id: 'tu', pl: 'Tułów i kręgosłup', desc: 'Mięśnie grzbietu, klatki piersiowej, brzucha, przepona, dno miednicy, stawy kręgosłupa i miednicy.', regs: ['tu'], nerves: ['intercostal', 'phrenic', 'dorsal_rami', 'lumbar_plexus', 'pudendal'], joints: AX_J, types: ALL_T },
  { id: 'gs', pl: 'Głowa i szyja', desc: 'Mięśnie szyi, żucia, mimiczne, gałki ocznej; nerwy czaszkowe; staw skroniowo-żuchwowy.', regs: ['gs'], nerves: ['facial', 'trigeminal', 'accessory', 'oculomotor', 'trochlear', 'abducens', 'hypoglossal', 'vagus', 'glossopharyngeal', 'ansa_cervicalis', 'suboccipital'], joints: ['tmj', 'cervical_upper'], types: ALL_T },
  { id: 'nerves', pl: 'Nerwy obwodowe', desc: 'Unerwienie mięśni, korzenie, zakresy ruchowe nerwów kończyn.', regs: ['kg', 'kd'], nerves: [...UL_N, ...LL_N], joints: [], types: ['nerveOf', 'nerve'] },
  { id: 'joints', pl: 'Stawy i testy kliniczne', desc: 'Budowa stawów, pozycje zamknięte, wzorce torebkowe, testy specjalne.', regs: [], nerves: [], joints: [...UL_J, ...LL_J, ...AX_J], types: ['joint'] },
  { id: 'func', pl: 'Testy funkcjonalne', desc: 'Cel, wykonanie i normy testów: TUG, 30CST, FRT, Berg, 6MWT, 10MWT, FMS, Y-Balance, skoki, Sørensen…', regs: [], nerves: [], joints: [], types: ['func'] },
  { id: 'all', pl: 'Całość – kolokwium końcowe', desc: 'Wszystkie okolice, nerwy i stawy.', regs: ['gs', 'tu', 'kg', 'kd'], nerves: [...UL_N, ...LL_N, 'intercostal', 'phrenic', 'facial', 'trigeminal', 'accessory'], joints: [...UL_J, ...LL_J, ...AX_J], types: [...ALL_T, 'func'] },
];

/** Ocena orientacyjna w skali stosowanej na wielu uczelniach (progi 60/69/77/85/93%). */
export function grade(pct) {
  return pct >= 93 ? '5,0 (bdb)' : pct >= 85 ? '4,5 (db+)' : pct >= 77 ? '4,0 (db)' : pct >= 69 ? '3,5 (dst+)' : pct >= 60 ? '3,0 (dst)' : '2,0 (ndst)';
}
