// Plan serii rolek: wszystkie mięśnie z bazy wiedzy, ułożone sezonami i rozdziałami (głównie wzdłuż nerwów).
// Jedna rolka dziennie; numer dnia = pozycja na liście.
export const START = '2026-11-16'; // poniedziałek
export const SEASONS = [
  { name: 'Bark i ramię', chapters: [
    ['N. axillaris', ['deltoid', 'teres_minor']],
    ['N. suprascapularis', ['supraspinatus', 'infraspinatus']],
    ['Nn. subscapulares, n. thoracodorsalis', ['subscapularis', 'teres_major', 'latissimus_dorsi']],
    ['N. accessorius, n. dorsalis scapulae', ['trapezius', 'levator_scapulae', 'rhomboid_major', 'rhomboid_minor']],
    ['N. thoracicus longus, nn. pectorales', ['serratus_anterior', 'pectoralis_major', 'pectoralis_minor', 'subclavius']],
    ['N. musculocutaneus', ['coracobrachialis', 'biceps_brachii', 'brachialis']],
    ['N. radialis – ramię', ['triceps_brachii', 'anconeus']],
  ] },
  { name: 'Przedramię i ręka', chapters: [
    ['N. radialis – przedramię', ['brachioradialis', 'extensor_carpi_radialis_longus', 'extensor_carpi_radialis_brevis', 'supinator', 'extensor_digitorum', 'extensor_digiti_minimi', 'extensor_carpi_ulnaris', 'abductor_pollicis_longus', 'extensor_pollicis_brevis', 'extensor_pollicis_longus', 'extensor_indicis']],
    ['N. medianus', ['pronator_teres', 'flexor_carpi_radialis', 'palmaris_longus', 'flexor_digitorum_superficialis', 'flexor_digitorum_profundus', 'flexor_pollicis_longus', 'pronator_quadratus', 'abductor_pollicis_brevis', 'opponens_pollicis', 'flexor_pollicis_brevis']],
    ['N. ulnaris', ['flexor_carpi_ulnaris', 'adductor_pollicis', 'abductor_digiti_minimi_hand', 'flexor_digiti_minimi_hand', 'opponens_digiti_minimi_hand', 'lumbricals_hand', 'palmar_interossei', 'dorsal_interossei_hand']],
  ] },
  { name: 'Obręcz miedniczna i udo', chapters: [
    ['Plexus lumbalis, n. femoralis', ['psoas_major', 'iliacus', 'sartorius', 'rectus_femoris', 'vastus_lateralis', 'vastus_medialis', 'vastus_intermedius', 'pectineus']],
    ['N. obturatorius', ['adductor_longus', 'adductor_brevis', 'adductor_magnus', 'gracilis', 'obturator_externus']],
    ['Nn. glutei', ['gluteus_maximus', 'gluteus_medius', 'gluteus_minimus', 'tensor_fasciae_latae']],
    ['Plexus sacralis – rotatory zewnętrzne', ['piriformis', 'obturator_internus', 'gemellus_superior', 'gemellus_inferior', 'quadratus_femoris']],
    ['N. ischiadicus', ['biceps_femoris', 'semitendinosus', 'semimembranosus']],
  ] },
  { name: 'Goleń i stopa', chapters: [
    ['N. fibularis profundus', ['tibialis_anterior', 'extensor_hallucis_longus', 'extensor_digitorum_longus', 'fibularis_tertius', 'extensor_digitorum_brevis']],
    ['N. fibularis superficialis', ['fibularis_longus', 'fibularis_brevis']],
    ['N. tibialis', ['gastrocnemius', 'soleus', 'plantaris', 'popliteus', 'tibialis_posterior', 'flexor_digitorum_longus', 'flexor_hallucis_longus']],
    ['N. plantaris medialis', ['abductor_hallucis', 'flexor_digitorum_brevis', 'flexor_hallucis_brevis']],
    ['N. plantaris lateralis', ['abductor_digiti_minimi_foot', 'quadratus_plantae', 'lumbricals_foot', 'adductor_hallucis', 'flexor_digiti_minimi_foot', 'dorsal_interossei_foot', 'plantar_interossei']],
  ] },
  { name: 'Tułów', chapters: [
    ['Mięśnie oddechowe', ['diaphragm', 'external_intercostals', 'internal_intercostals', 'transversus_thoracis', 'serratus_posterior_superior', 'serratus_posterior_inferior', 'levatores_costarum']],
    ['Ściana brzucha', ['rectus_abdominis', 'external_oblique', 'internal_oblique', 'transversus_abdominis', 'pyramidalis', 'quadratus_lumborum']],
    ['Głębokie mięśnie grzbietu', ['iliocostalis', 'longissimus', 'spinalis', 'semispinalis', 'multifidus', 'rotatores', 'interspinales', 'intertransversarii']],
    ['Dno miednicy', ['pubococcygeus', 'iliococcygeus', 'puboanalis', 'coccygeus', 'anal_sphincter']],
  ] },
  { name: 'Głowa i szyja', chapters: [
    ['Szyja i kark', ['sternocleidomastoid', 'scalenus_anterior', 'scalenus_medius', 'scalenus_posterior', 'platysma', 'longus_colli', 'longus_capitis', 'rectus_capitis_anterior', 'rectus_capitis_lateralis', 'splenius_capitis', 'splenius_cervicis', 'rectus_capitis_posterior_major', 'rectus_capitis_posterior_minor', 'obliquus_capitis_superior', 'obliquus_capitis_inferior']],
    ['Mięśnie nad- i podgnykowe', ['digastric', 'mylohyoid', 'geniohyoid', 'stylohyoid', 'sternohyoid', 'omohyoid', 'sternothyroid', 'thyrohyoid']],
    ['N. trigeminus (V3) – mięśnie żucia', ['masseter', 'temporalis', 'medial_pterygoid', 'lateral_pterygoid']],
    ['N. facialis (VII) – sklepienie, oko i nos', ['epicranius', 'orbicularis_oculi', 'corrugator_supercilii', 'procerus', 'nasalis', 'depressor_septi_nasi', 'levator_nasolabialis']],
    ['N. facialis (VII) – okolica ust', ['orbicularis_oris', 'buccinator', 'zygomaticus_major', 'zygomaticus_minor', 'levator_labii_superioris', 'levator_anguli_oris', 'risorius', 'depressor_anguli_oris', 'depressor_labii_inferioris', 'mentalis']],
    ['Nn. III, IV, VI – mięśnie gałki ocznej', ['levator_palpebrae_superioris', 'rectus_superior_oculi', 'rectus_inferior_oculi', 'rectus_medialis_oculi', 'obliquus_inferior_oculi', 'obliquus_superior_oculi', 'rectus_lateralis_oculi']],
    ['Nerwy czaszkowe IX–XII', ['tongue', 'pharynx', 'larynx']],
  ] },
];
export function plan() {
  const out = []; let day = 0;
  SEASONS.forEach((s, si) => s.chapters.forEach(([chapter, keys]) => keys.forEach((key, i) => {
    const d = new Date(`${START}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + day); day++;
    out.push({ day, date: d.toISOString().slice(0, 10), season: si + 1, seasonName: s.name, chapter, key, ep: i + 1, of: keys.length, nextKey: keys[i + 1] ?? null });
  })));
  return out;
}
