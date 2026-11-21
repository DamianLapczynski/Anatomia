// Korzenie nerwów rdzeniowych – badanie neurologiczne wg ISNCSCI (International Standards for Neurological
// Classification of Spinal Cord Injury) uzupełnione o odruchy i typowe przyczyny uszkodzeń.
// myo – miotom: { pl, muscle (klucz z bazy), move (id ruchu) }; reflex – odruch; derm – punkt kluczowy dermatomu:
// { pl, at } – at: { lm: nazwa punktu kostnego z modelu, d: [bocznie, w górę, do przodu] w metrach } albo
// { mesh, f: [bocznie 0–1 (od przyśrodkowej), w górę 0–1, do przodu 0–1] } – ułamki prostopadłościanu siatki.
// Pozycje znaczników są orientacyjne (model nie ma skóry) – nazwa punktu w opisie jest rozstrzygająca.
export const SEGMENTS = [...Array(8)].map((_, i) => `C${i + 1}`).concat([...Array(12)].map((_, i) => `Th${i + 1}`), [...Array(5)].map((_, i) => `L${i + 1}`), [...Array(5)].map((_, i) => `S${i + 1}`));

/** Segmenty rdzenia wymienione w tekście unerwienia, np. „N. udowy (L2–L4)” → L2, L3, L4. */
export function segmentsOf(text = '') {
  const idx = (s) => SEGMENTS.indexOf(s.replace(/^T(\d)/, 'Th$1'));
  const out = new Set(), re = /\b(C|Th|T|L|S)(\d{1,2})(?:\s*[–-]\s*(C|Th|T|L|S)?(\d{1,2}))?\b/g;
  let m;
  while ((m = re.exec(text))) {
    const a = idx(m[1] + m[2]); if (a < 0) continue;
    const b = m[4] ? idx((m[3] ?? m[1]) + m[4]) : a; if (b < 0) continue;
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.add(SEGMENTS[i]);
  }
  return out;
}

export const ROOTS = {
  C2: { derm: { pl: 'Co najmniej 1 cm bocznie od guzowatości potylicznej zewnętrznej', at: { lm: 'External occipital protuberance', d: [0.015, 0, -0.01] } } },
  C3: { derm: { pl: 'Dół nadobojczykowy, w linii środkowo-obojczykowej', at: { mesh: 'Clavicle', f: [0.55, 1.6, 0.6] } } },
  C4: { derm: { pl: 'Nad stawem barkowo-obojczykowym', at: { lm: 'Acromion', d: [-0.01, 0.015, 0.01] } }, cause: 'C4 unerwia też przeponę (n. przeponowy C3–C5) – ból odniesiony do barku z przepony i narządów pod nią.' },
  C5: {
    myo: { pl: 'Zgięcie łokcia', muscle: 'biceps_brachii', move: 'el_flex' }, reflex: 'Odruch z m. dwugłowego ramienia (C5–C6)',
    derm: { pl: 'Boczna strona dołu łokciowego, tuż powyżej zgięcia łokcia', at: { lm: 'Lateral epicondyle of humerus', d: [0, 0.025, 0.03] } },
    cause: 'Przepuklina C4/C5; górne porażenie splotu ramiennego (Erba). Osłabienie odwodzenia i rotacji zewnętrznej ramienia (naramienny, nadgrzebieniowy) i zgięcia łokcia.',
  },
  C6: {
    myo: { pl: 'Wyprost nadgarstka', muscle: 'extensor_carpi_radialis_longus', move: 'wr_ext' }, reflex: 'Odruch ramienno-promieniowy (C5–C6)',
    derm: { pl: 'Grzbietowa powierzchnia paliczka bliższego kciuka', at: { mesh: 'Proximal phalanx of first finger of hand', f: [0.5, 0.5, -0.4] } },
    cause: 'Przepuklina C5/C6 – jedna z dwóch najczęstszych w odcinku szyjnym. Ból promieniujący do kciuka, osłabienie zgięcia łokcia i wyprostu nadgarstka.',
  },
  C7: {
    myo: { pl: 'Wyprost łokcia', muscle: 'triceps_brachii', move: 'el_ext' }, reflex: 'Odruch z m. trójgłowego ramienia (C7)',
    derm: { pl: 'Grzbietowa powierzchnia paliczka bliższego palca środkowego', at: { mesh: 'Proximal phalanx of third finger of hand', f: [0.5, 0.5, -0.4] } },
    cause: 'Przepuklina C6/C7 – najczęstsza radikulopatia szyjna. Osłabienie wyprostu łokcia i zgięcia nadgarstka, ból do palca III.',
  },
  C8: {
    myo: { pl: 'Zgięcie dalszego paliczka palca środkowego', muscle: 'flexor_digitorum_profundus', move: 'fi_flex' }, reflex: null,
    derm: { pl: 'Grzbietowa powierzchnia paliczka bliższego palca małego', at: { mesh: 'Proximal phalanx of fifth finger of hand', f: [0.5, 0.5, -0.4] } },
    cause: 'Przepuklina C7/Th1, guz szczytu płuca (Pancoasta), żebro szyjne, dolne porażenie splotu (Klumpkego). Osłabienie chwytu.',
  },
  Th1: {
    myo: { pl: 'Odwodzenie palca małego', muscle: 'abductor_digiti_minimi_hand', move: 'fi_abd' }, reflex: null,
    derm: { pl: 'Przyśrodkowa (łokciowa) strona dołu łokciowego', at: { lm: 'Medial epicondyle of humerus', d: [0, 0.025, 0.03] } },
    cause: 'Mięśnie własne ręki; uszkodzenie z zespołem Hornera (włókna współczulne Th1) wskazuje na uszkodzenie korzenia blisko rdzenia.',
  },
  Th2: { derm: { pl: 'Szczyt dołu pachowego', at: { mesh: 'Humerus', f: [-0.4, 0.82, 0.5] } } },
  Th4: { derm: { pl: 'Linia brodawek sutkowych (IV przestrzeń międzyżebrowa)', at: { mesh: 'Fourth rib', f: [0.35, 0.4, 1.05] } }, cause: 'Th4 – poziom brodawek; Th10 – pępek; Th12 – pachwina: trzy punkty do szybkiego określenia poziomu czucia.' },
  Th10: { derm: { pl: 'Pępek', at: { mesh: 'Rectus abdominis muscle', f: [0, 0.4, 1] } } },
  Th12: { derm: { pl: 'Środek więzadła pachwinowego', at: { mesh: 'Inguinal ligament', f: [0.5, 0.5, 1] } } },
  L1: { derm: { pl: 'W połowie odległości między punktami Th12 a L2 (górna część przedniej powierzchni uda)', at: { mesh: 'Femur', f: [0.4, 0.92, 1.4] } } },
  L2: {
    myo: { pl: 'Zgięcie biodra', muscle: 'iliacus', move: 'hip_flex' }, reflex: null,
    derm: { pl: 'Środek przedniej powierzchni uda', at: { mesh: 'Femur', f: [0.5, 0.6, 1.6] } },
    cause: 'Rzadkie przepukliny wysokie (L1/L2); osłabienie zgięcia biodra, różnicuj z uszkodzeniem n. udowego.',
  },
  L3: {
    myo: { pl: 'Wyprost kolana', muscle: 'rectus_femoris', move: 'kn_ext' }, reflex: 'Odruch kolanowy (L3–L4)',
    derm: { pl: 'Kłykieć przyśrodkowy kości udowej', at: { lm: 'Medial epicondyle of femur', d: [-0.01, 0, 0.01] } },
    cause: 'Przepuklina L2/L3 lub boczna L3/L4; osłabienie wyprostu kolana i przywodzenia uda, ból przedniej powierzchni uda (dodatni test rozciągania n. udowego).',
  },
  L4: {
    myo: { pl: 'Zgięcie grzbietowe stopy', muscle: 'tibialis_anterior', move: 'an_df' }, reflex: 'Odruch kolanowy (L3–L4)',
    derm: { pl: 'Kostka przyśrodkowa', at: { lm: 'Medial malleolus', d: [-0.008, 0, 0] } },
    cause: 'Przepuklina L3/L4. Osłabiony odruch kolanowy, chód na piętach utrudniony, ból po przyśrodkowej stronie goleni.',
  },
  L5: {
    myo: { pl: 'Wyprost palucha (prostownik długi palucha)', muscle: 'extensor_hallucis_longus', move: 'hal_ext' }, reflex: 'Odruch z mięśni kulszowo-goleniowych przyśrodkowych (L5–S1) – mało pewny',
    derm: { pl: 'Grzbiet stopy na wysokości III stawu śródstopno-paliczkowego', at: { mesh: 'Third metatarsal bone', f: [0.5, 1.3, 0.95] } },
    cause: 'Przepuklina L4/L5 – najczęstsza radikulopatia lędźwiowa. Osłabienie wyprostu palucha i odwodzenia biodra (Trendelenburg), ból do grzbietu stopy; różnicuj z porażeniem n. strzałkowego (tam odwodzenie biodra i odwracanie stopy są zachowane).',
  },
  S1: {
    myo: { pl: 'Zgięcie podeszwowe stopy', muscle: 'gastrocnemius', move: 'an_pf' }, reflex: 'Odruch skokowy (ze ścięgna Achillesa, S1)',
    derm: { pl: 'Boczna strona pięty', at: { mesh: 'Calcaneus', f: [1.2, 0.4, 0.15] } },
    cause: 'Przepuklina L5/S1. Osłabiony lub zniesiony odruch skokowy, trudność we wspięciu na palce na jednej nodze, ból do bocznego brzegu stopy.',
  },
  S2: { derm: { pl: 'Środek dołu podkolanowego', at: { mesh: 'Femur', f: [0.5, 0.02, -0.6] } }, cause: 'S2–S4: zwieracze, czucie krocza – zespół ogona końskiego.' },
  S3: { derm: { pl: 'Guz kulszowy lub fałd pośladkowy', at: { lm: 'Ischial tuberosity', d: [0, -0.01, -0.02] } } },
  'S4–5': { derm: { pl: 'Okolica okołoodbytowa (do 1 cm od połączenia skórno-śluzówkowego)', at: { mesh: 'Coccyx', f: [0, -0.4, 0.3] } }, cause: 'Zachowane czucie S4–5 oznacza niekompletne uszkodzenie rdzenia (ASIA B–D) – lepsze rokowanie.' },
};
