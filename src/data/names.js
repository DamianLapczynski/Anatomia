// Polskie nazwy struktur: słownik + reguły dla nazw seryjnych (kręgi, żebra, paliczki...).
const D = {
  // --- kości ---
  'Femur': 'Kość udowa', 'Tibia': 'Kość piszczelowa', 'Fibula': 'Strzałka (kość strzałkowa)', 'Patella': 'Rzepka', 'Hip bone': 'Kość miedniczna',
  'Sacrum': 'Kość krzyżowa', 'Coccyx': 'Kość guziczna', 'Humerus': 'Kość ramienna', 'Radius': 'Kość promieniowa', 'Ulna': 'Kość łokciowa',
  'Scapula': 'Łopatka', 'Clavicle': 'Obojczyk', 'Manubrium of sternum': 'Rękojeść mostka', 'Body of sternum': 'Trzon mostka', 'Xiphoid process': 'Wyrostek mieczykowaty',
  'Atlas (C1)': 'Kręg szczytowy (C1, atlas)', 'Axis (C2)': 'Kręg obrotowy (C2, axis)', 'Hyoid bone': 'Kość gnykowa', 'Mandible': 'Żuchwa', 'Maxilla': 'Szczęka',
  'Frontal bone': 'Kość czołowa', 'Parietal bone': 'Kość ciemieniowa', 'Occipital bone': 'Kość potyliczna', 'Temporal bone': 'Kość skroniowa', 'Sphenoid bone': 'Kość klinowa',
  'Ethmoid bone': 'Kość sitowa', 'Zygomatic bone': 'Kość jarzmowa', 'Nasal bone': 'Kość nosowa', 'Lacrimal bone': 'Kość łzowa', 'Palatine bone': 'Kość podniebienna',
  'Vomer': 'Lemiesz', 'Inferior nasal concha bone': 'Małżowina nosowa dolna', 'Malleus': 'Młoteczek', 'Incus': 'Kowadełko', 'Stapes': 'Strzemiączko',
  'Scaphoid bone': 'Kość łódeczkowata', 'Lunate bone': 'Kość księżycowata', 'Triquetrum bone': 'Kość trójgraniasta', 'Pisiform bone': 'Kość grochowata',
  'Trapezium bone': 'Kość czworoboczna większa', 'Trapezoid bone': 'Kość czworoboczna mniejsza', 'Capitate bone': 'Kość główkowata', 'Hamate bone': 'Kość haczykowata',
  'Calcaneus': 'Kość piętowa', 'Talus': 'Kość skokowa', 'Navicular bone': 'Kość łódkowata', 'Cuboid bone': 'Kość sześcienna',
  'Medial cuneiform bone': 'Kość klinowata przyśrodkowa', 'Intermediate cuneiform bone': 'Kość klinowata pośrednia', 'Lateral cuneiform bone': 'Kość klinowata boczna',
  'Sesamoid bones of foot': 'Trzeszczki stopy', 'Thyroid cartilage': 'Chrząstka tarczowata', 'Cricoid cartilage': 'Chrząstka pierścieniowata', 'Arytenoid cartilage': 'Chrząstka nalewkowata',
  'Nasal septal cartilage': 'Chrząstka przegrody nosa', 'Major alar cartilage': 'Chrząstka skrzydłowa większa',
  // --- stawy i więzadła ---
  'Anterior cruciate ligament': 'Więzadło krzyżowe przednie (ACL)', 'Posterior cruciate ligament': 'Więzadło krzyżowe tylne (PCL)', 'Medial meniscus': 'Łąkotka przyśrodkowa', 'Lateral meniscus': 'Łąkotka boczna',
  'Fibular collateral ligament': 'Więzadło poboczne strzałkowe (LCL)', 'Superficial part of tibial collateral ligament': 'Więzadło poboczne piszczelowe – część powierzchowna (MCL)', 'Deep part of tibial collateral ligament': 'Więzadło poboczne piszczelowe – część głęboka',
  'Transverse ligament of knee': 'Więzadło poprzeczne kolana', 'Oblique popliteal ligament': 'Więzadło podkolanowe skośne', 'Arcuate popliteal ligament': 'Więzadło podkolanowe łukowate', 'Infrapatellar fat pad': 'Ciało tłuszczowe podrzepkowe (Hoffy)',
  'Articular capsule of knee joint': 'Torebka stawu kolanowego', 'Articular capsule of hip joint': 'Torebka stawu biodrowego', 'Articular capsule of glenohumeral joint': 'Torebka stawu ramiennego', 'Articular capsule of elbow joint': 'Torebka stawu łokciowego',
  'Acetabular labrum': 'Obrąbek panewkowy (biodra)', 'Glenoid labrum': 'Obrąbek stawowy (panewki łopatki)', 'Ligament of head of femur': 'Więzadło głowy kości udowej', 'Ischiofemoral ligament': 'Więzadło kulszowo-udowe', 'Pubofemoral ligament': 'Więzadło łonowo-udowe',
  'Descending part of iliofemoral ligament': 'Więzadło biodrowo-udowe – część zstępująca', 'Transverse part of iliofemoral ligament': 'Więzadło biodrowo-udowe – część poprzeczna', 'Zona orbicularis': 'Warstwa okrężna torebki biodra',
  'Anterior talofibular ligament': 'Więzadło skokowo-strzałkowe przednie (ATFL)', 'Posterior talofibular ligament': 'Więzadło skokowo-strzałkowe tylne (PTFL)', 'Calcaneofibular ligament': 'Więzadło piętowo-strzałkowe (CFL)',
  'Tibiocalcaneal ligament': 'Więzadło trójgraniaste – część piszczelowo-piętowa', 'Tibionavicular ligament': 'Więzadło trójgraniaste – część piszczelowo-łódkowa', 'Posterior tibiotalar ligament': 'Więzadło trójgraniaste – część piszczelowo-skokowa tylna',
  'Anterior tibiofibular ligament': 'Więzadło piszczelowo-strzałkowe przednie', 'Posterior tibiofibular ligament': 'Więzadło piszczelowo-strzałkowe tylne', 'Plantar calcaneonavicular ligament': 'Więzadło piętowo-łódkowe podeszwowe (sprężynowe)', 'Long plantar ligament': 'Więzadło podeszwowe długie',
  'Interosseous membrane of leg': 'Błona międzykostna goleni', 'Interosseous membrane of forearm': 'Błona międzykostna przedramienia',
  'Acromioclavicular ligament': 'Więzadło barkowo-obojczykowe', 'Coraco-acromial ligament': 'Więzadło kruczo-barkowe', 'Coracohumeral ligament': 'Więzadło kruczo-ramienne', 'Conoid ligament': 'Więzadło stożkowate', 'Trapezoid ligament': 'Więzadło czworoboczne',
  'Superior glenohumeral ligament': 'Więzadło obrąbkowo-ramienne górne', 'Middle glenohumeral ligament': 'Więzadło obrąbkowo-ramienne środkowe', 'Inferior glenohumeral ligament': 'Więzadło obrąbkowo-ramienne dolne', 'Transverse humeral ligament': 'Więzadło poprzeczne ramienia',
  'Superior transverse scapular ligament': 'Więzadło poprzeczne łopatki górne', 'Costoclavicular ligament': 'Więzadło żebrowo-obojczykowe', 'Interclavicular ligament': 'Więzadło międzyobojczykowe',
  'Annular ligament of radius': 'Więzadło pierścieniowate kości promieniowej', 'Radial collateral ligament': 'Więzadło poboczne promieniowe', 'Ulnar collateral ligament': 'Więzadło poboczne łokciowe',
  'Anterior longitudinal ligament': 'Więzadło podłużne przednie', 'Posterior longitudinal ligament': 'Więzadło podłużne tylne', 'Ligamenta flava': 'Więzadła żółte', 'Interspinous ligaments': 'Więzadła międzykolcowe', 'Supraspinous ligament': 'Więzadło nadkolcowe', 'Nuchal ligament': 'Więzadło karkowe',
  'Iliolumbar ligament': 'Więzadło biodrowo-lędźwiowe', 'Sacrotuberous ligament': 'Więzadło krzyżowo-guzowe', 'Sacrospinous ligament': 'Więzadło krzyżowo-kolcowe', 'Anterior sacro-iliac ligament': 'Więzadło krzyżowo-biodrowe przednie', 'Posterior sacro-iliac ligament': 'Więzadło krzyżowo-biodrowe tylne',
  'Pubic symphysis': 'Spojenie łonowe', 'Obturator membrane': 'Błona zasłonowa', 'Inguinal ligament': 'Więzadło pachwinowe', 'Patellar ligament': 'Więzadło rzepki',
  // --- tkanka łączna układu mięśniowego ---
  'Iliotibial tract': 'Pasmo biodrowo-piszczelowe', 'Calcaneal tendon': 'Ścięgno piętowe (Achillesa)', 'Fascia lata': 'Powięź szeroka', 'Plantar aponeurosis': 'Rozcięgno podeszwowe', 'Palmar aponeurosis': 'Rozcięgno dłoniowe',
  'Flexor retinaculum of wrist': 'Troczek zginaczy (nadgarstka)', 'Extensor retinaculum of wrist': 'Troczek prostowników (nadgarstka)', 'Linea alba': 'Kresa biała', 'Epicranial aponeurosis': 'Czepiec ścięgnisty',
  'Posterior layer of thoracolumbar fascia': 'Powięź piersiowo-lędźwiowa – blaszka tylna', 'Common flexor tendon': 'Wspólne ścięgno zginaczy (nadkłykieć przyśrodkowy)', 'Common extensor tendon': 'Wspólne ścięgno prostowników (nadkłykieć boczny)',
  // --- tętnice ---
  'Ascending aorta': 'Aorta wstępująca', 'Aortic arch': 'Łuk aorty', 'Thoracic aorta': 'Aorta piersiowa', 'Abdominal aorta': 'Aorta brzuszna', 'Brachiocephalic trunk': 'Pień ramienno-głowowy',
  'Right common carotid artery': 'Tętnica szyjna wspólna prawa', 'Left common carotid artery': 'Tętnica szyjna wspólna lewa', 'Internal carotid artery': 'Tętnica szyjna wewnętrzna', 'External carotid artery': 'Tętnica szyjna zewnętrzna',
  'Right subclavian artery': 'Tętnica podobojczykowa prawa', 'Left subclavian artery': 'Tętnica podobojczykowa lewa', 'Vertebral artery': 'Tętnica kręgowa', 'Basilar artery': 'Tętnica podstawna', 'Internal thoracic artery': 'Tętnica piersiowa wewnętrzna',
  'Thyrocervical trunk': 'Pień tarczowo-szyjny', 'Suprascapular artery': 'Tętnica nadłopatkowa', 'Transverse cervical artery': 'Tętnica poprzeczna szyi',
  'Axillary artery': 'Tętnica pachowa', 'Thoraco-acromial artery': 'Tętnica piersiowo-barkowa', 'Lateral thoracic artery': 'Tętnica piersiowa boczna', 'Subscapular artery': 'Tętnica podłopatkowa', 'Thoracodorsal artery': 'Tętnica piersiowo-grzbietowa',
  'Circumflex scapular artery': 'Tętnica okalająca łopatkę', 'Anterior circumflex humeral artery': 'Tętnica okalająca ramię przednia', 'Posterior circumflex humeral artery': 'Tętnica okalająca ramię tylna',
  'Brachial artery': 'Tętnica ramienna', 'Deep brachial artery': 'Tętnica głęboka ramienia', 'Radial artery': 'Tętnica promieniowa', 'Ulnar artery': 'Tętnica łokciowa', 'Common interosseous artery': 'Tętnica międzykostna wspólna', 'Posterior interosseous artery': 'Tętnica międzykostna tylna',
  'Superficial palmar arch': 'Łuk dłoniowy powierzchowny', 'Deep palmar arch': 'Łuk dłoniowy głęboki',
  'Common iliac artery': 'Tętnica biodrowa wspólna', 'Internal iliac artery': 'Tętnica biodrowa wewnętrzna', 'External iliac artery': 'Tętnica biodrowa zewnętrzna', 'Superior gluteal artery': 'Tętnica pośladkowa górna', 'Inferior gluteal artery': 'Tętnica pośladkowa dolna',
  'Obturator artery': 'Tętnica zasłonowa', 'Internal pudendal artery': 'Tętnica sromowa wewnętrzna', 'Iliolumbar artery': 'Tętnica biodrowo-lędźwiowa', 'Inferior epigastric artery': 'Tętnica nabrzuszna dolna', 'Superior epigastric artery': 'Tętnica nabrzuszna górna',
  'Femoral artery': 'Tętnica udowa', 'Deep femoral artery': 'Tętnica głęboka uda', 'Medial circumflex femoral artery': 'Tętnica okalająca udo przyśrodkowa', 'Lateral circumflex femoral artery': 'Tętnica okalająca udo boczna', 'Perforating femoral arteries': 'Tętnice przeszywające',
  'Popliteal artery': 'Tętnica podkolanowa', 'Anterior tibial artery': 'Tętnica piszczelowa przednia', 'Posterior tibial artery': 'Tętnica piszczelowa tylna', 'Fibular artery': 'Tętnica strzałkowa', 'Dorsalis pedis artery': 'Tętnica grzbietowa stopy',
  'Medial plantar artery': 'Tętnica podeszwowa przyśrodkowa', 'Lateral plantar artery': 'Tętnica podeszwowa boczna', 'Plantar arch': 'Łuk podeszwowy', 'Arcuate artery': 'Tętnica łukowata',
  'Facial artery': 'Tętnica twarzowa', 'Maxillary artery': 'Tętnica szczękowa', 'Superficial temporal artery': 'Tętnica skroniowa powierzchowna', 'Occipital artery': 'Tętnica potyliczna', 'Posterior intercostal arteries': 'Tętnice międzyżebrowe tylne', 'Lumbar arteries': 'Tętnice lędźwiowe',
  'Coeliac trunk': 'Pień trzewny', 'Superior mesenteric artery': 'Tętnica krezkowa górna', 'Inferior mesenteric artery': 'Tętnica krezkowa dolna', 'Right renal artery': 'Tętnica nerkowa prawa', 'Left renal artery': 'Tętnica nerkowa lewa',
  'Right coronary artery': 'Tętnica wieńcowa prawa', 'Left coronary artery': 'Tętnica wieńcowa lewa', 'Anterior cerebral artery': 'Tętnica przednia mózgu', 'Posterior cerebral artery': 'Tętnica tylna mózgu',
  // --- żyły ---
  'Superior vena cava': 'Żyła główna górna', 'Inferior vena cava (abdominal part)': 'Żyła główna dolna (część brzuszna)', 'Inferior vena cava (thoracic part)': 'Żyła główna dolna (część piersiowa)',
  'Internal jugular vein': 'Żyła szyjna wewnętrzna', 'External jugular vein': 'Żyła szyjna zewnętrzna', 'Subclavian vein': 'Żyła podobojczykowa', 'Axillary vein': 'Żyła pachowa', 'Brachial veins': 'Żyły ramienne',
  'Cephalic vein': 'Żyła odpromieniowa', 'Basilic vein': 'Żyła odłokciowa', 'Median cubital vein': 'Żyła pośrodkowa łokcia', 'Femoral vein': 'Żyła udowa', 'Great saphenous vein': 'Żyła odpiszczelowa',
  'Small saphenous vein': 'Żyła odstrzałkowa', 'Popliteal vein': 'Żyła podkolanowa', 'Azygos vein': 'Żyła nieparzysta', 'Hepatic portal vein': 'Żyła wrotna', 'Common iliac vein': 'Żyła biodrowa wspólna',
  'External iliac vein': 'Żyła biodrowa zewnętrzna', 'Internal iliac vein': 'Żyła biodrowa wewnętrzna', 'Left brachiocephalic vein': 'Żyła ramienno-głowowa lewa', 'Right brachiocephalic vein': 'Żyła ramienno-głowowa prawa',
  // --- serce ---
  'Right ventricle': 'Komora prawa', 'Left ventricle': 'Komora lewa', 'Right atrium': 'Przedsionek prawy', 'Left atrium': 'Przedsionek lewy', 'Pulmonary trunk': 'Pień płucny',
  // --- nerwy (uzupełnienie bazy nerwów) ---
  'Roots of brachial plexus': 'Korzenie splotu ramiennego', 'Superior trunk of brachial plexus': 'Pień górny splotu ramiennego', 'Middle trunk of brachial plexus': 'Pień środkowy splotu ramiennego', 'Inferior trunk of brachial plexus': 'Pień dolny splotu ramiennego',
  'Posterior cord of brachial plexus': 'Pęczek tylny splotu ramiennego', 'Axillary nerve': 'Nerw pachowy', 'Musculocutaneous nerve': 'Nerw mięśniowo-skórny', 'Median nerve': 'Nerw pośrodkowy', 'Ulnar nerve': 'Nerw łokciowy', 'Radial nerve': 'Nerw promieniowy',
  'Deep branch of radial nerve': 'Gałąź głęboka nerwu promieniowego', 'Superficial branch of radial nerve': 'Gałąź powierzchowna nerwu promieniowego', 'Posterior interosseous nerve of forearm': 'Nerw międzykostny tylny przedramienia', 'Anterior interosseous nerve of forearm': 'Nerw międzykostny przedni przedramienia',
  'Deep branch of ulnar nerve': 'Gałąź głęboka nerwu łokciowego', 'Superficial branch of ulnar nerve': 'Gałąź powierzchowna nerwu łokciowego', 'Medial antebrachial cutaneous nerve': 'Nerw skórny przyśrodkowy przedramienia', 'Medial brachial cutaneous nerve': 'Nerw skórny przyśrodkowy ramienia',
  'Lateral antebrachial cutaneous nerve': 'Nerw skórny boczny przedramienia', 'Suprascapular nerve': 'Nerw nadłopatkowy', 'Long thoracic nerve': 'Nerw piersiowy długi', 'Dorsal scapular nerve': 'Nerw grzbietowy łopatki', 'Thoracodorsal nerve': 'Nerw piersiowo-grzbietowy',
  'Lateral pectoral nerve': 'Nerw piersiowy boczny', 'Medial pectoral nerve': 'Nerw piersiowy przyśrodkowy', 'Superior subscapular nerve': 'Nerw podłopatkowy górny', 'Inferior subscapular nerve': 'Nerw podłopatkowy dolny', 'Subclavian nerve': 'Nerw podobojczykowy',
  'Femoral nerve': 'Nerw udowy', 'Saphenous nerve': 'Nerw udowo-goleniowy', 'Obturator nerve': 'Nerw zasłonowy', 'Sciatic nerve': 'Nerw kulszowy', 'Tibial nerve': 'Nerw piszczelowy', 'Common fibular nerve': 'Nerw strzałkowy wspólny',
  'Deep fibular nerve': 'Nerw strzałkowy głęboki', 'Superficial fibular nerve': 'Nerw strzałkowy powierzchowny', 'Sural nerve': 'Nerw łydkowy', 'Medial plantar nerve': 'Nerw podeszwowy przyśrodkowy', 'Lateral plantar nerve': 'Nerw podeszwowy boczny',
  'Superior gluteal nerve': 'Nerw pośladkowy górny', 'Pudendal nerve': 'Nerw sromowy', 'Posterior femoral cutaneous nerve': 'Nerw skórny tylny uda', 'Lateral femoral cutaneous nerve': 'Nerw skórny boczny uda', 'Genitofemoral nerve': 'Nerw płciowo-udowy',
  'Iliohypogastric nerve': 'Nerw biodrowo-podbrzuszny', 'Ilio-inguinal nerve': 'Nerw biodrowo-pachwinowy', 'Intercostal nerves': 'Nerwy międzyżebrowe', 'Sympathetic trunk': 'Pień współczulny', 'Cauda equina': 'Ogon koński',
  'Olfactory nerve (I)': 'Nerw węchowy (I)', 'Optic nerve (II)': 'Nerw wzrokowy (II)', 'Oculomotor nerve (III)': 'Nerw okoruchowy (III)', 'Trochlear nerve (IV)': 'Nerw bloczkowy (IV)', 'Trigeminal nerve (V)': 'Nerw trójdzielny (V)',
  'Abducens nerve (VI)': 'Nerw odwodzący (VI)', 'Facial nerve (VII)': 'Nerw twarzowy (VII)', 'Vestibulocochlear nerve (VIII)': 'Nerw przedsionkowo-ślimakowy (VIII)', 'Glossopharyngeal nerve (IX)': 'Nerw językowo-gardłowy (IX)',
  'Vagus nerve (X)': 'Nerw błędny (X)', 'Accessory nerve (XI)': 'Nerw dodatkowy (XI)', 'Hypoglossal nerve (XII)': 'Nerw podjęzykowy (XII)', 'Ophthalmic nerve': 'Nerw oczny (V1)', 'Maxillary nerve': 'Nerw szczękowy (V2)',
  // --- OUN ---
  'Pons': 'Most', 'Medulla oblongata': 'Rdzeń przedłużony', 'Midbrain': 'Śródmózgowie', 'Corpus callosum': 'Ciało modzelowate', 'Hippocampus': 'Hipokamp', 'Hypothalamus': 'Podwzgórze', 'Thalamus': 'Wzgórze',
  'Caudate nucleus': 'Jądro ogoniaste', 'Lateral ventricle': 'Komora boczna', 'Fourth ventricle': 'Komora czwarta', 'Third ventricle': 'Komora trzecia', 'Precentral gyrus': 'Zakręt przedśrodkowy (kora ruchowa)', 'Postcentral gyrus': 'Zakręt zaśrodkowy (kora czuciowa)',
  'Central sulcus': 'Bruzda środkowa', 'Optic chiasm': 'Skrzyżowanie wzrokowe', 'Lateral corticospinal tract': 'Droga korowo-rdzeniowa boczna', 'Anterior corticospinal tract': 'Droga korowo-rdzeniowa przednia',
  'Lateral spinothalamic tract': 'Droga rdzeniowo-wzgórzowa boczna', 'Gracile fasciculus': 'Pęczek smukły', 'Cuneate fasciculus': 'Pęczek klinowaty', 'Anterior horn of spinal cord': 'Róg przedni rdzenia kręgowego', 'Posterior horn of spinal cord': 'Róg tylny rdzenia kręgowego',
};

const ORD = { First: 'I', Second: 'II', Third: 'III', Fourth: 'IV', Fifth: 'V', Sixth: 'VI', Seventh: 'VII', Eighth: 'VIII', Ninth: 'IX', Tenth: 'X', Eleventh: 'XI', Twelfth: 'XII' };
const ord = (w) => ORD[w[0].toUpperCase() + w.slice(1).toLowerCase()];
const PH = { Proximal: 'bliższy', Middle: 'środkowy', Distal: 'dalszy' };
const RULES = [
  [/^Vertebra ([CTL])(\d+)$/, (m) => `Kręg ${m[1] === 'T' ? 'Th' : m[1]}${m[2]}`],
  [/^(\w+) rib$/, (m) => ord(m[1]) && `Żebro ${ord(m[1])}`],
  [/^Costal cartilage of (\w+) rib$/, (m) => `Chrząstka żebrowa żebra ${ord(m[1])}`],
  [/^(Proximal|Middle|Distal) phalanx of (\w+) finger of (hand|foot)$/, (m) => `Paliczek ${PH[m[1]]} palca ${ord(m[2])} ${m[3] === 'hand' ? 'ręki' : 'stopy'}`],
  [/^(\w+) metacarpal bone$/, (m) => `${ord(m[1])} kość śródręcza`],
  [/^(\w+) metatarsal bone$/, (m) => `${ord(m[1])} kość śródstopia`],
  [/^Intervertebral disc ([CTL])(\d+)-([CTLS])(\d+)$/, (m) => `Krążek międzykręgowy ${m[1] === 'T' ? 'Th' : m[1]}${m[2]}/${m[3] === 'T' ? 'Th' : m[3]}${m[4]}`],
  [/^Nucleus pulposus ([CTL])(\d+)-([CTLS])(\d+)$/, (m) => `Jądro miażdżyste ${m[1] === 'T' ? 'Th' : m[1]}${m[2]}/${m[3] === 'T' ? 'Th' : m[3]}${m[4]}`],
  [/^(Upper|Lower) (.*)$/, (m) => { const t = { 'canine': 'Kieł', 'medial incisor': 'Siekacz przyśrodkowy', 'lateral incisor': 'Siekacz boczny', 'first premolar': 'Przedtrzonowiec pierwszy', 'second premolar': 'Przedtrzonowiec drugi', 'first molar tooth': 'Trzonowiec pierwszy', 'second molar tooth': 'Trzonowiec drugi' }[m[2]]; return t && `${t} ${m[1] === 'Upper' ? 'górny' : 'dolny'}`; }],
];

export function polishName(en) {
  if (D[en]) return D[en];
  for (const [re, fn] of RULES) { const m = en.match(re); if (m) { const r = fn(m); if (r) return r; } }
  return null;
}
export const SIDE = { l: 'lewa strona', r: 'prawa strona', '': '' };
