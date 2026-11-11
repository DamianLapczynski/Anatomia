// Nerwy obwodowe – baza wiedzy. mesh: siatki nerwu i jego gałęzi; path: struktury, od których nerw pochodzi (pokazywane jako „droga od korzeni”).
const BP = ['Roots of brachial plexus', 'Superior trunk of brachial plexus', 'Middle trunk of brachial plexus', 'Inferior trunk of brachial plexus'];
const ANT = ['Anterior division of superior trunk of brachial plexus', 'Anterior division of middle trunk of brachial plexus', 'Anterior division of inferior trunk of brachial plexus'];
const POST = ['Posterior division of superior trunk of brachial plexus', 'Posterior division of middle trunk of brachial plexus', 'Posterior division of inferior trunk of brachial plexus', 'Posterior cord of brachial plexus'];
export default {
  brachial_plexus: {
    pl: 'Splot ramienny', lat: 'Plexus brachialis', roots: 'C5–Th1',
    mesh: [...BP, ...ANT, ...POST], path: [],
    course: 'Korzenie (gałęzie brzuszne C5–Th1) → 3 pnie (górny C5–C6, środkowy C7, dolny C8–Th1) w szczelinie tylnej mm. pochyłych → części przednie i tylne za obojczykiem → 3 pęczki wokół a. axillaris (boczny, przyśrodkowy, tylny) → nerwy końcowe.',
    motor: 'Cała kończyna górna i większość mięśni obręczy barkowej.', sensory: 'Skóra kończyny górnej (poza częścią barku – nn. supraclaviculares, i pachy – n. intercostobrachialis).',
    palsy: 'Porażenie górne (Erba–Duchenne’a, C5–C6): ramię przywiedzione i zrotowane do wewnątrz, łokieć wyprostowany, przedramię w pronacji („ręka kelnera”). Porażenie dolne (Klumpkego, C8–Th1): niedowład mięśni ręki, ręka szponowata, czasem zespół Hornera.',
    tip: 'Korzenie – Pnie – Części – Pęczki – Nerwy („Kiedy Pan Czyta, Pies Nudzi się”).',
  },
  axillary: {
    pl: 'Nerw pachowy', lat: 'N. axillaris', roots: 'C5–C6', mesh: ['Axillary nerve', 'Muscular branches of axillary nerve', 'Superior lateral brachial cutaneous nerve'], path: [...BP, ...POST],
    course: 'Z pęczka tylnego; przechodzi przez otwór czworoboczny razem z a. circumflexa humeri posterior i owija szyjkę chirurgiczną kości ramiennej.',
    motor: 'M. deltoideus, m. teres minor.', sensory: 'Skóra bocznej powierzchni barku („naszywka pułkowa”) – n. cutaneus brachii lateralis superior.',
    palsy: 'Zwichnięcie przednie stawu ramiennego, złamanie szyjki chirurgicznej: zanik naramiennego, osłabienie odwodzenia, niedoczulica nad naramiennym.', tip: 'Zawsze badaj czucie na bocznej powierzchni barku po zwichnięciu.',
  },
  musculocutaneous: {
    pl: 'Nerw mięśniowo-skórny', lat: 'N. musculocutaneus', roots: 'C5–C7', mesh: ['Musculocutaneous nerve', 'Lateral antebrachial cutaneous nerve'], path: [...BP, ...ANT],
    course: 'Z pęczka bocznego; przebija m. coracobrachialis, biegnie między m. biceps a m. brachialis, kończy się jako n. cutaneus antebrachii lateralis.',
    motor: 'M. coracobrachialis, m. biceps brachii, m. brachialis (grupa przednia ramienia).', sensory: 'Skóra bocznej powierzchni przedramienia.',
    palsy: 'Osłabienie zgięcia łokcia i supinacji, zniesiony odruch z m. dwugłowego, niedoczulica bocznej strony przedramienia.', tip: 'BBC: Biceps, Brachialis, Coracobrachialis.',
  },
  median: {
    pl: 'Nerw pośrodkowy', lat: 'N. medianus', roots: 'C6–Th1', path: [...BP, ...ANT],
    mesh: ['Median nerve', 'Anterior interosseous nerve of forearm', 'Muscular branches of median nerve', 'Palmar branch of median nerve', 'Common palmar digital branches of median nerve', 'Proper palmar digital branches of median nerve'],
    course: 'Dwa korzenie z pęczka bocznego i przyśrodkowego obejmują a. axillaris. W ramieniu z a. brachialis (bez gałęzi). Między głowami m. pronator teres, pod łukiem FDS, przez kanał nadgarstka do ręki. Oddaje n. interosseus antebrachii anterior.',
    motor: 'Przedramię: wszystkie zginacze i pronatory OPRÓCZ m. flexor carpi ulnaris i łokciowej części FDP. Ręka: kłąb kciuka (APB, OP, głowa powierzchowna FPB) i mm. lumbricales I–II.', sensory: 'Dłoniowa powierzchnia palców I–III i promieniowej połowy IV oraz ich opuszki od strony grzbietowej.',
    palsy: 'Zespół cieśni nadgarstka: parestezje nocne palców I–III, zanik kłębu, testy Phalena i Tinela. Uszkodzenie wysokie: „ręka błogosławiąca” przy zaciskaniu pięści, „ręka małpia”, brak opozycji i pronacji.', tip: 'LOAF w ręce: Lumbricales I–II, Opponens pollicis, Abductor pollicis brevis, Flexor pollicis brevis.',
  },
  ulnar: {
    pl: 'Nerw łokciowy', lat: 'N. ulnaris', roots: 'C8–Th1', path: [...BP, 'Anterior division of inferior trunk of brachial plexus'],
    mesh: ['Ulnar nerve', 'Deep branch of ulnar nerve', 'Superficial branch of ulnar nerve', 'Dorsal branch of ulnar nerve', 'Muscular branches of ulnar nerve', 'Palmar branch of ulnar nerve', 'Common palmar digital branches of ulnar nerve', 'Proper palmar digital branches of ulnar nerve', 'Dorsal digital branches of ulnar nerve'],
    course: 'Z pęczka przyśrodkowego; w ramieniu przyśrodkowo, przebija przegrodę międzymięśniową, biegnie w bruździe n. łokciowego za nadkłykciem przyśrodkowym, między głowami FCU, na troczku zginaczy przez kanał Guyona do ręki.',
    motor: 'Przedramię: m. flexor carpi ulnaris, łokciowa część FDP (palce IV–V). Ręka: kłębik, mm. interossei, mm. lumbricales III–IV, m. adductor pollicis, głowa głęboka FPB.', sensory: 'Palec V i łokciowa połowa palca IV, łokciowy brzeg ręki (dłoniowo i grzbietowo).',
    palsy: 'Zespół rowka n. łokciowego (drugi co do częstości zespół uciskowy): ręka szponowata (palce IV–V), zanik mięśni międzykostnych, objaw Fromenta, objaw Wartenberga.', tip: '„Nerw muzyków” – drobne ruchy palców. Paradoks łokciowy: im niżej uszkodzenie, tym wyraźniejszy szpon.',
  },
  radial: {
    pl: 'Nerw promieniowy', lat: 'N. radialis', roots: 'C5–Th1', path: [...BP, ...POST],
    mesh: ['Radial nerve', 'Deep branch of radial nerve', 'Posterior interosseous nerve of forearm', 'Superficial branch of radial nerve', 'Muscular branches of radial nerve', 'Posterior antebrachial cutaneous nerve', 'Inferior lateral brachial cutaneous nerve', 'Dorsal digital branches of radial nerve'],
    course: 'Z pęczka tylnego; z a. profunda brachii w bruździe n. promieniowego na tylnej powierzchni kości ramiennej, przebija przegrodę boczną, przed nadkłykciem bocznym dzieli się na gałąź powierzchowną (czuciową) i głęboką (przebija m. supinator → n. interosseus posterior).',
    motor: 'Wszystkie prostowniki ramienia i przedramienia: m. triceps, m. anconeus, m. brachioradialis, prostowniki nadgarstka i palców, m. supinator, APL.', sensory: 'Tylna powierzchnia ramienia i przedramienia; grzbiet ręki po stronie promieniowej (palce I–III do stawów PIP).',
    palsy: '„Porażenie sobotniej nocy” (ucisk w bruździe) lub złamanie trzonu kości ramiennej: ręka opadająca, brak wyprostu nadgarstka i palców w MCP, osłabiony chwyt; wyprost łokcia zwykle zachowany.', tip: 'Nerw „BEST”: Brachioradialis, Extensors, Supinator, Triceps.',
  },
  suprascapular: {
    pl: 'Nerw nadłopatkowy', lat: 'N. suprascapularis', roots: 'C5–C6', mesh: ['Suprascapular nerve'], path: ['Roots of brachial plexus', 'Superior trunk of brachial plexus'],
    course: 'Z pnia górnego; przez wcięcie łopatki pod więzadłem poprzecznym górnym łopatki, potem przez wcięcie panewkowo-grzebieniowe.', motor: 'M. supraspinatus, m. infraspinatus.', sensory: 'Torebka stawu ramiennego i barkowo-obojczykowego.',
    palsy: 'Ucisk we wcięciu łopatki: ból tylnej części barku, zanik nad- i podgrzebieniowego, osłabienie rotacji zewnętrznej.', tip: 'Nerw przechodzi POD więzadłem, tętnica NAD („Army over, Navy under”).',
  },
  long_thoracic: {
    pl: 'Nerw piersiowy długi', lat: 'N. thoracicus longus', roots: 'C5–C7', mesh: ['Long thoracic nerve'], path: ['Roots of brachial plexus'],
    course: 'Bezpośrednio z korzeni; zstępuje po powierzchni m. zębatego przedniego w linii pachowej środkowej.', motor: 'M. serratus anterior.', sensory: '—',
    palsy: 'Łopatka skrzydłowata, ograniczenie unoszenia ramienia powyżej 90°.', tip: '„C5, 6, 7 – raise your wings to heaven”.',
  },
  dorsal_scapular: {
    pl: 'Nerw grzbietowy łopatki', lat: 'N. dorsalis scapulae', roots: 'C4–C5', mesh: ['Dorsal scapular nerve'], path: ['Roots of brachial plexus'],
    course: 'Z korzenia C5; przebija m. pochyły środkowy i biegnie wzdłuż brzegu przyśrodkowego łopatki.', motor: 'Mm. rhomboidei, m. levator scapulae.', sensory: '—', palsy: 'Odstawanie brzegu przyśrodkowego łopatki, osłabienie retrakcji.', tip: '',
  },
  thoracodorsal: {
    pl: 'Nerw piersiowo-grzbietowy', lat: 'N. thoracodorsalis', roots: 'C6–C8', mesh: ['Thoracodorsal nerve'], path: [...BP, ...POST],
    course: 'Z pęczka tylnego, z a. thoracodorsalis po tylnej ścianie pachy.', motor: 'M. latissimus dorsi.', sensory: '—', palsy: 'Osłabienie przywodzenia i wyprostu ramienia (podciąganie, chód o kulach).', tip: '',
  },
  pectoral: {
    pl: 'Nerwy piersiowe boczny i przyśrodkowy', lat: 'Nn. pectorales lateralis et medialis', roots: 'C5–Th1', mesh: ['Lateral pectoral nerve', 'Medial pectoral nerve'], path: [...BP, ...ANT],
    course: 'Nazwy pochodzą od pęczków (boczny / przyśrodkowy), nie od położenia.', motor: 'M. pectoralis major (oba), m. pectoralis minor (przyśrodkowy).', sensory: '—', palsy: 'Osłabienie przywodzenia i rotacji wewnętrznej.', tip: '',
  },
  subscapular: {
    pl: 'Nerwy podłopatkowe', lat: 'Nn. subscapulares', roots: 'C5–C6', mesh: ['Superior subscapular nerve', 'Inferior subscapular nerve'], path: [...BP, ...POST],
    course: 'Z pęczka tylnego.', motor: 'M. subscapularis (górny i dolny), m. teres major (dolny).', sensory: '—', palsy: 'Osłabienie rotacji wewnętrznej.', tip: '',
  },
  femoral: {
    pl: 'Nerw udowy', lat: 'N. femoralis', roots: 'L2–L4', path: [],
    mesh: ['Femoral nerve', 'Anterior cutaneous branches of femoral nerve', 'Saphenous nerve', 'Infrapatellar branch of saphenous nerve', 'Medial crural cutaneous branches of saphenous nerve'],
    course: 'Ze splotu lędźwiowego; między m. psoas a m. iliacus, pod więzadłem pachwinowym przez rozstęp mięśni (bocznie od tętnicy udowej), w trójkącie udowym rozpada się na gałęzie. Najdłuższa gałąź: n. saphenus (kanał przywodzicieli → przyśrodkowa strona goleni).',
    motor: 'M. iliacus, m. quadriceps femoris, m. sartorius, m. pectineus.', sensory: 'Przednia powierzchnia uda; przyśrodkowa powierzchnia goleni i stopy (n. saphenus).',
    palsy: 'Osłabienie zgięcia biodra i brak wyprostu kolana (uginanie kolana przy schodzeniu ze schodów), zniesiony odruch kolanowy.', tip: 'W trójkącie udowym od boku: N-A-V-L (Nerw, Arteria, Vena, Limfatyki) – „NAVeL”.',
  },
  obturator: {
    pl: 'Nerw zasłonowy', lat: 'N. obturatorius', roots: 'L2–L4', mesh: ['Obturator nerve', 'Anterior branch of obturator nerve', 'Posterior branch of obturator nerve'], path: [],
    course: 'Ze splotu lędźwiowego; przyśrodkowo od m. psoas, przez kanał zasłonowy do uda; gałąź przednia i tylna obejmują m. adductor brevis.',
    motor: 'Grupa przyśrodkowa uda: przywodziciele, m. gracilis, m. obturatorius externus.', sensory: 'Niewielki obszar przyśrodkowej powierzchni uda.',
    palsy: 'Osłabienie przywodzenia, chód z szerokim odwodzeniem; ból rzutowany do kolana przy patologii biodra/miednicy.', tip: 'Jedyny duży nerw kończyny dolnej wychodzący przyśrodkowo od m. psoas.',
  },
  sciatic: {
    pl: 'Nerw kulszowy', lat: 'N. ischiadicus', roots: 'L4–S3', mesh: ['Sciatic nerve'], path: [],
    course: 'Ze splotu krzyżowego; przez otwór podgruszkowy, między guzem kulszowym a krętarzem większym, po tylnej stronie uda pod m. biceps femoris; zwykle w szczycie dołu podkolanowego dzieli się na n. tibialis i n. fibularis communis.',
    motor: 'Grupa tylna uda (kulszowo-goleniowe) + część tylna m. adductor magnus; przez gałęzie końcowe – wszystkie mięśnie goleni i stopy.', sensory: 'Przez gałęzie: goleń (poza stroną przyśrodkową) i stopa.',
    palsy: 'Rwa kulszowa (najczęściej korzeniowa L5/S1); iniekcje w dolno-przyśrodkowy kwadrant pośladka grożą uszkodzeniem; zespół m. gruszkowatego. Test SLR (Lasègue’a), slump.', tip: 'Najgrubszy nerw ciała – to właściwie dwa nerwy w jednej pochewce.',
  },
  tibial: {
    pl: 'Nerw piszczelowy', lat: 'N. tibialis', roots: 'L4–S3', path: ['Sciatic nerve'],
    mesh: ['Tibial nerve', 'Medial plantar nerve', 'Lateral plantar nerve', 'Medial sural cutaneous nerve', 'Sural nerve', 'Common plantar digital branches of medial plantar nerve', 'Common plantar digital branches of lateral plantar nerve', 'Proper plantar digital branches of medial plantar nerve', 'Proper plantar digital branches of lateral plantar nerve'],
    course: 'Przez środek dołu podkolanowego, pod łukiem ścięgnistym m. soleus, w przedziale tylnym głębokim z a. tibialis posterior, za kostką przyśrodkową (kanał kostki przyśrodkowej) → nn. plantares medialis et lateralis.',
    motor: 'Grupa tylna goleni (zginacze podeszwowe, m. tibialis posterior, zginacze palców) i wszystkie mięśnie podeszwy.', sensory: 'Podeszwa; z n. fibularis communis tworzy n. suralis (boczny brzeg stopy).',
    palsy: 'Brak zgięcia podeszwowego (niemożność stania na palcach), stopa piętowa, zanik mięśni podeszwy; zespół kanału stępu.', tip: 'TIP: Tibial – Inversion, Plantarflexion. PED: Peroneal – Eversion, Dorsiflexion.',
  },
  common_fibular: {
    pl: 'Nerw strzałkowy wspólny', lat: 'N. fibularis (peroneus) communis', roots: 'L4–S2', path: ['Sciatic nerve'],
    mesh: ['Common fibular nerve', 'Sural communicating branch of common fibular nerve'],
    course: 'Wzdłuż ścięgna m. biceps femoris, owija szyjkę strzałki (tuż pod skórą!), dzieli się na n. fibularis superficialis i profundus.',
    motor: 'Głowa krótka m. biceps femoris; przez gałęzie – grupa przednia i boczna goleni.', sensory: 'Boczna powierzchnia goleni (n. cutaneus surae lateralis).',
    palsy: 'Najczęściej uszkadzany nerw kończyny dolnej (gips, zakładanie nogi na nogę, złamanie szyjki strzałki): stopa opadająca i chód brodzący, niedoczulica grzbietu stopy.', tip: 'Szyjka strzałki = „słaby punkt”.',
  },
  deep_fibular: {
    pl: 'Nerw strzałkowy głęboki', lat: 'N. fibularis profundus', roots: 'L4–S1', path: ['Sciatic nerve', 'Common fibular nerve'],
    mesh: ['Deep fibular nerve', 'Muscular branches of deep fibular nerve', 'Dorsal digital branches of deep fibular nerve'],
    course: 'W przedziale przednim goleni z a. tibialis anterior, na grzbiet stopy.', motor: 'Grupa przednia goleni (m. tibialis anterior, EHL, EDL, fibularis tertius), m. extensor digitorum brevis.', sensory: 'Skóra pierwszej przestrzeni międzypalcowej („klapek japonka”).',
    palsy: 'Stopa opadająca; zespół ciasnoty przedziału przedniego.', tip: 'Pole czuciowe = pasek japonki.',
  },
  superficial_fibular: {
    pl: 'Nerw strzałkowy powierzchowny', lat: 'N. fibularis superficialis', roots: 'L5–S2', path: ['Sciatic nerve', 'Common fibular nerve'],
    mesh: ['Superficial fibular nerve', 'Medial dorsal cutaneous nerve of foot', 'Intermediate dorsal cutaneous nerve of foot', 'Dorsal digital branches of superficial fibular nerve'],
    course: 'W przedziale bocznym goleni, w dolnej 1/3 przebija powięź.', motor: 'Mm. fibulares longus et brevis.', sensory: 'Dolno-boczna część goleni i grzbiet stopy.', palsy: 'Osłabienie nawracania stopy – skłonność do skręceń inwersyjnych.', tip: '',
  },
  superior_gluteal: {
    pl: 'Nerw pośladkowy górny', lat: 'N. gluteus superior', roots: 'L4–S1', mesh: ['Superior gluteal nerve'], path: [],
    course: 'Ze splotu krzyżowego przez otwór NADgruszkowy, między m. gluteus medius a minimus.', motor: 'M. gluteus medius, m. gluteus minimus, m. tensor fasciae latae.', sensory: '—',
    palsy: 'Objaw Trendelenburga, chód kaczkowaty.', tip: 'Jedyny nerw otworu nadgruszkowego.',
  },
  pudendal: {
    pl: 'Nerw sromowy', lat: 'N. pudendus', roots: 'S2–S4', mesh: ['Pudendal nerve'], path: [],
    course: 'Wychodzi przez otwór podgruszkowy, owija kolec kulszowy i wraca przez otwór kulszowy mniejszy do kanału sromowego (Alcocka).', motor: 'Zwieracz zewnętrzny odbytu i cewki, mięśnie krocza.', sensory: 'Skóra krocza i narządów płciowych zewnętrznych.',
    palsy: 'Neuralgia n. sromowego (ból przy siedzeniu), nietrzymanie.', tip: '„S2, 3, 4 keeps the pelvis off the floor”.',
  },
  intercostal: {
    pl: 'Nerwy międzyżebrowe', lat: 'Nn. intercostales', roots: 'Th1–Th11', mesh: ['Intercostal nerves'], path: [],
    course: 'Gałęzie brzuszne nerwów piersiowych; w bruździe żebra pod żyłą i tętnicą (V-A-N), między mm. międzyżebrowymi wewnętrznymi a najgłębszymi; dolne (Th7–Th11) przechodzą na ścianę brzucha.',
    motor: 'Mm. intercostales, mięśnie ściany brzucha.', sensory: 'Skóra klatki piersiowej i brzucha (dermatomy: Th4 – brodawka sutkowa, Th10 – pępek).', palsy: 'Neuralgia międzyżebrowa, półpasiec.', tip: 'Th4 – sutek, Th10 – pępek („T-ten = belly bu-TEN”).',
  },
  accessory: {
    pl: 'Nerw dodatkowy (XI)', lat: 'N. accessorius', roots: 'C1–C5 (korzeń rdzeniowy)', mesh: ['Accessory nerve (XI)'], path: [],
    course: 'Korzeń rdzeniowy wstępuje przez otwór wielki, opuszcza czaszkę przez otwór szyjny, przebija m. SCM i biegnie powierzchownie przez trójkąt boczny szyi do m. trapezius.',
    motor: 'M. sternocleidomastoideus, m. trapezius.', sensory: '—', palsy: 'Opadnięcie barku, osłabienie rotacji głowy w stronę przeciwną i unoszenia barku.', tip: '',
  },
  facial: {
    pl: 'Nerw twarzowy (VII)', lat: 'N. facialis', roots: 'jądro w moście', mesh: ['Facial nerve (VII)', 'Chorda tympani'], path: [],
    course: 'Przez przewód słuchowy wewnętrzny i kanał n. twarzowego, wychodzi otworem rylcowo-sutkowym, w śliniance przyusznej tworzy splot (5 grup gałęzi).',
    motor: 'Wszystkie mięśnie wyrazowe twarzy, platysma, brzusiec tylny m. digastricus, m. stylohyoideus, m. stapedius.', sensory: 'Smak z 2/3 przednich języka (struna bębenkowa); przywspółczulnie: ślinianki podżuchwowa i podjęzykowa, gruczoł łzowy.',
    palsy: 'Porażenie obwodowe (Bella): cała połowa twarzy łącznie z czołem. Porażenie ośrodkowe (udar): tylko dolna część twarzy po stronie przeciwnej.', tip: 'Czoło porusza się? → uszkodzenie ośrodkowe.',
  },
  trigeminal: {
    pl: 'Nerw trójdzielny (V)', lat: 'N. trigeminus', roots: 'most', mesh: ['Trigeminal nerve (V)', 'Motor root of trigeminal nerve', 'Sensory root of trigeminal nerve', 'Ophthalmic nerve', 'Maxillary nerve', 'Anterior division of mandibular nerve', 'Posterior division of mandibular nerve', 'Inferior alveolar nerve', 'Lingual nerve', 'Buccal nerve', 'Mental nerve', 'Nerve to mylohyoid muscle'], path: [],
    course: 'Zwój trójdzielny (Gassera) → V1 n. oczny (szczelina oczodołowa górna), V2 n. szczękowy (otwór okrągły), V3 n. żuchwowy (otwór owalny).',
    motor: 'V3: mięśnie żucia, m. mylohyoideus, brzusiec przedni m. digastricus, m. tensor tympani, m. tensor veli palatini.', sensory: 'Skóra twarzy, błona śluzowa jamy ustnej i nosa, zęby, opona twarda.',
    palsy: 'Neuralgia n. trójdzielnego; osłabienie żucia ze zbaczaniem żuchwy w stronę porażoną.', tip: 'Standing Room Only: Superior orbital fissure – foramen Rotundum – foramen Ovale.',
  },
};
