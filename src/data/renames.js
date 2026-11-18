// Pozycje bazy rozdzielone na pojedyncze mięśnie: stary klucz → nowe klucze.
// Używane do przeniesienia postępu (fiszki, statystyki), żeby nic nie przepadło.
export const SPLITS = {
  scalenes: ['scalenus_anterior', 'scalenus_medius', 'scalenus_posterior'],
  suboccipitals: ['rectus_capitis_posterior_major', 'rectus_capitis_posterior_minor', 'obliquus_capitis_superior', 'obliquus_capitis_inferior'],
  longus_colli: ['longus_colli', 'longus_capitis', 'rectus_capitis_anterior', 'rectus_capitis_lateralis'],
  splenius: ['splenius_capitis', 'splenius_cervicis'],
  infrahyoids: ['sternohyoid', 'omohyoid', 'sternothyroid', 'thyrohyoid'],
  gemelli: ['gemellus_superior', 'gemellus_inferior'],
  levator_ani: ['pubococcygeus', 'iliococcygeus', 'puboanalis'],
  interspinales: ['interspinales', 'intertransversarii'],
  facial_small: ['zygomaticus_major', 'zygomaticus_minor', 'levator_labii_superioris', 'levator_nasolabialis', 'levator_anguli_oris', 'depressor_anguli_oris', 'depressor_labii_inferioris', 'mentalis', 'risorius', 'nasalis', 'procerus', 'corrugator_supercilii', 'depressor_septi_nasi'],
  extraocular: ['rectus_superior_oculi', 'rectus_inferior_oculi', 'rectus_medialis_oculi', 'rectus_lateralis_oculi', 'obliquus_superior_oculi', 'obliquus_inferior_oculi', 'levator_palpebrae_superioris'],
};

/** Przenosi wpisy postępu ze starych kluczy na nowe. obj: { 'klucz:typ': stan }. Zwraca true, jeśli coś zmieniono. */
export function migrateKeys(obj) {
  let changed = false;
  for (const id of Object.keys(obj)) {
    const i = id.indexOf(':'); if (i < 0) continue;
    const key = id.slice(0, i), suf = id.slice(i);
    const to = SPLITS[key]; if (!to) continue;
    // klucz, który przetrwał podział (np. longus_colli), zachowuje swój wpis
    for (const k of to) if (k !== key && !obj[k + suf]) obj[k + suf] = { ...obj[id] };
    if (!to.includes(key)) delete obj[id];
    changed = true;
  }
  return changed;
}
