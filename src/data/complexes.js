// Kompleksy – struktury złożone z kilku mięśni (np. gęsia stopa), uczone razem.
// Pola: pl, lat, reg (okolica), keys (klucze mięśni z bazy), extra (inne siatki modelu, np. kaletki),
// alias (dodatkowe hasła wyszukiwania), loc (położenie), n (unerwienie), f (czynności), k (klinika), s (skojarzenie).
export default {
  pes_anserinus: {
    pl: 'Gęsia stopa', lat: 'Pes anserinus (superficialis)', reg: 'kd',
    keys: ['sartorius', 'gracilis', 'semitendinosus'],
    extra: ['Anserine bursa'],
    alias: ['gęsia stopka', 'pes anserinus', 'SGT', 'kaletka gęsiej stopy'],
    loc: 'Wspólny przyczep końcowy trzech ścięgien na przyśrodkowej powierzchni kości piszczelowej, ok. 4–5 cm poniżej szpary stawu kolanowego i przyśrodkowo od guzowatości piszczeli. Od przodu ku tyłowi: m. krawiecki (sartorius) – m. smukły (gracilis) – m. półścięgnisty (semitendinosus). Pod ścięgnami, między nimi a więzadłem pobocznym piszczelowym (MCL) i piszczelą, leży kaletka gęsiej stopy (bursa anserina).',
    n: 'Trzy mięśnie z trzech przedziałów uda, każdy z innego nerwu: krawiecki – n. udowy (L2–L3, przedział przedni), smukły – n. zasłonowy (L2–L3, przedział przyśrodkowy), półścięgnisty – część piszczelowa n. kulszowego (L5–S2, przedział tylny).',
    f: ['Zgięcie stawu kolanowego', 'Rotacja wewnętrzna podudzia przy zgiętym kolanie', 'Dynamiczna stabilizacja przyśrodkowej strony kolana – hamuje koślawienie i rotację zewnętrzną podudzia (wspomaga MCL)', 'W stawie biodrowym każdy działa inaczej: krawiecki zgina, smukły przywodzi, półścięgnisty prostuje'],
    k: 'Zapalenie kaletki / tendinopatia gęsiej stopy: ból i tkliwość na przyśrodkowo-przedniej powierzchni piszczeli kilka cm poniżej szpary stawu (nie na samej szparze – to odróżnia je od uszkodzenia łąkotki przyśrodkowej). Częste przy gonartrozie, koślawości kolan, nadwadze i u biegaczy. Fizjoterapia: odciążenie, rozciąganie mięśni kulszowo-goleniowych i przywodzicieli, wzmacnianie m. czworogłowego i odwodzicieli biodra, korekta koślawienia kolana. Ścięgna półścięgnistego i smukłego pobiera się do rekonstrukcji ACL (przeszczep STG). Gęsia stopa głęboka to rozgałęziony przyczep m. półbłoniastego.',
    s: '„SGT” od przodu: Sartorius – Gracilis – semiTendinosus; po angielsku „Say Grace before Tea”. Trzy palce gęsiej łapy = trzy przedziały uda = trzy nerwy.',
  },
};
