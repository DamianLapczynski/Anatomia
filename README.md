# Anatomia 3D

Interaktywny atlas anatomii 3D do nauki na studiach fizjoterapii: układ kostny, mięśniowy, nerwowy i krwionośny całego ciała, z opisami po polsku i nazwami łacińskimi. Działa w przeglądarce na telefonie, tablecie i komputerze; po pierwszym uruchomieniu także offline.

## Co potrafi

- **Atlas** – 3300 osobnych struktur (kości, więzadła, mięśnie, pola przyczepów, tętnice, żyły, nerwy, mózg i rdzeń), **wszystkie z polską nazwą**. Warstwy, strona ciała, okolice, wyszukiwarka PL / łac. / ang., ukrywanie kolejnych warstw.
- **Polskie opisy** – ok. 170 kluczowych struktur (kości, główne naczynia, serce, mózgowie, rdzeń, oko, ucho) plus każdy kręg, żebro i kość śródręcza / śródstopia: budowa, znaczenie, klinika. Angielski opis z Wikipedii zostaje jako rozwijane uzupełnienie.
- **Punkty kostne w wyszukiwarce** – ok. 560 punktów (PL / łac. / ang.), np. „guzowatość kości piszczelowej”, „SIAS”, „guz kulszowy”: kość ze znacznikiem punktu, pola przyczepów leżące przy nim i lista mięśni (początek / koniec).
- **Izolacja mięśnia** – mięsień + pola przyczepu początkowego (czerwone) i końcowego (niebieskie) na kościach + nerw z drogą od korzeni + tętnica; resztę ciała można przyciemnić albo ukryć.
- **Baza wiedzy** – 180 mięśni (przyczepy, unerwienie z segmentami, unaczynienie, czynność, klinika, skojarzenie), w tym 113 z **badaniem**: palpacja, test siły w skali Lovetta, test długości / rozciąganie (`src/data/muscle_exam.js`); 48 nerwów, w tym nerwy czaszkowe i gałęzie bez siatki w modelu (n. pośladkowy dolny, przeponowy – pokazywane przez swoje mięśnie); ok. 760 punktów kostnych.
- **Stawy** – 17 stawów (`src/data/joints.js`): budowa i osie, więzadła z funkcją (klik podświetla więzadło, a reszta tkanek znika), pozycja zamknięta i spoczynkowa, wzorzec torebkowy, ruchy z zakresami i 41 testów klinicznych (Lachman, McMurray, FADIR, Neer, Phalen…) z podświetleniem badanej struktury.
- **Nauka** – sektory mięśni (ok. 50 grup), 18 kompleksów, kanałów i przestrzeni (stożek rotatorów, kanał nadgarstka, kanał Guyona, trójkąt udowy, dół podkolanowy, tabakierka anatomiczna, „core”, dno miednicy…) z zawartością i nerwami na modelu, drogi nerwów i lista stawów.
- **Klinika** – symulator uszkodzenia nerwu lub korzenia C5–S1: porażone mięśnie na czerwono, osłabione na pomarańczowo i lista utraconych ruchów liczona z bazy ruchów; badanie neurologiczne (miotomy, odruchy, punkty kluczowe dermatomów ISNCSCI na modelu); quiz kliniczny „pacjent nie wykona X – który nerw / korzeń?” (`src/clinic.js`, `src/data/roots.js`).
- **Testy funkcjonalne** (Klinika → Testy funkcjonalne, `src/data/func_tests.js`, `src/functests.js`) – 26 testów w trzech grupach: geriatria i równowaga (TUG, 30CST, 5×STS, Functional Reach, Berg, Tinetti, Romberg, stanie jednonóż, Four Square Step), wydolność i chód (6MWT z równaniem Enright–Sherrill, 10MWT, test schodów), sport i ortopedia (7 wzorców FMS, Y-Balance, testy skoków z LSI, przysiad jednonóż, lateral step-down, Biering-Sørensen, podpór bokiem McGilla, Trendelenburg). Karta testu: cel, sprzęt, wykonanie krok po kroku, polecenie dla pacjenta, punktacja, normy, interpretacja, MCID, **dlaczego test działa**, częste błędy. **Animacja 3D** całego ciała z fazami ruchu i podświetleniem pracujących mięśni, przełącznikiem **środka ciężkości i podstawy podparcia** oraz **wariantem z częstym błędem** (np. koślawienie kolana, opadanie miednicy, uginanie tułowia w pompce); pacjent leży na kozetce (ASLR, Sørensen) albo ćwiczy na macie (podpór bokiem, pompka, klęk podparty), wstaje z krzesła, wchodzi na stopień. Do tego fiszki (talia „Testy funkcjonalne”) i pytania w Egzaminie.
- **Ruch** – 82 ruchy z podziałem na agonistów, synergistów i antagonistów; 70 z animacją szkieletu – także wielostawowe (pięść, opozycja kciuka, kręgosłup kręg po kręgu, żuchwa, oddychanie, połykanie).
- **Quiz** – wskaż strukturę na modelu, rozpoznaj podświetloną, pytania o unerwienie / przyczepy / czynność; **Egzamin** na czas (10–60 pytań mieszanych z zakresu: kończyna górna, dolna, tułów, głowa i szyja, nerwy, stawy, całość), bez podpowiedzi do końca, z wynikiem wg rodzaju pytania i okolicy, oceną orientacyjną i historią. Zakresy w `src/data/exam_presets.js` – można dopisać sylabus swojej uczelni.
- **Powtórki** – fiszki z modelem 3D i algorytmem SM-2 (przyczepy, unerwienie, czynność, test siły, nerwy); eksport i import jako kopia zapasowa.
- **Notatki** – własna notatka przy każdym mięśniu, nerwie, stawie, kości i kompleksie; lista wszystkich notatek w ⚙ Ustawieniach.
- **Ustawienia (⚙)** – konto i baza danych (logowanie Google), styl, kolor akcentu, wielkość tekstu, jakość grafiki, domyślna strona ciała, tempo animacji, nazwy punktów kostnych, liczba nowych fiszek, eksport / import, notatki, źródła treści.
- **Postęp i synchronizacja** – powtórki, statystyki quizów i egzaminów, przerobione sektory Nauki i notatki. Bez konta zapisują się w przeglądarce; po zalogowaniu kontem Google – we własnej bazie Firestore, wspólnej dla telefonu, iPada i komputera, także offline.
- **Dostępność** – strona daje się powiększać, przyciski i listy mają etykiety i obsługę z klawiatury (Tab, Enter / Spacja), widoczny fokus.

## Style graficzne

Ustawienia (⚙) → **Wygląd** → Styl. Każdy styl to komplet: kolory i materiały interfejsu, typografia oraz oprawa sceny 3D (światło, tło, kolor półprzezroczystej sylwetki, cień pod stopami – `src/looks.js`). Kolory tkanek są wszędzie te same.

- **Atlas** – ciepły papier z fakturą, szeryf Fraunces, burgund; jak klasyczny atlas anatomiczny.
- **Noir** – galeria nocą: czerń, punktowe światło ze złotą kontrą, Instrument Serif.
- Rodzina noir (ta sama galeryjna czerń, inny kamień i światło): **Onyks** – platyna i zimne światło; **Aksamit** – bordo i rubinowa kontra; **Światłocień** – jedno ciepłe światło z boku, Bodoni Moda; **Szmaragd** – zieleń i szmaragdowa kontra.
- Zima i święta: **Wigilia** (ciemny – jodłowa noc, złoto świec, księżycowa poświata) i **Szron** (jasny – lodowa biel, zieleń jodły); w obu za modelem pada śnieg (zatrzymuje się przy ograniczeniu ruchu w systemie).
- **Szkło** – świetliste, kolorowe tło i mleczne szkło z jasną krawędzią.
- **Głębia** – atrament i morski turkus, chłodne światło z poświatą od tyłu.
- Klasyczne: Grafit (domyślny), Jasny, Północ, Tytan.

Na komputerze scena zajmuje cały ekran, a panele unoszą się nad nią; model jest kadrowany w odsłoniętej części (`engine.setInsets`). Styl można też wymusić w adresie: `?theme=atlas`.

## Jakość modelu 3D

- **Okluzja otoczenia** (cienie w dołach, otworach, szparach stawowych, między mięśniami i w bruzdach mózgu) jest wypalona w kolorach wierzchołków przez `tools/bake_ao.mjs` – kości, mięśnie, więzadła, naczynia i OUN. `npm run models` uruchamia go automatycznie; ręcznie: `node tools/bake_ao.mjs [plik.glb …]` (ok. 10 min dla wszystkich; plik oznaczony jako wypalony nie jest przyciemniany drugi raz). Ustawienia dla każdej warstwy są w `CFG` na górze skryptu.
- **Faktury w shaderze** (`src/surface.js`): włókna mięśniowe wzdłuż osi mięśnia z delikatnym reliefem, porowata powierzchnia kości, połysk ścięgien i chrząstki. Wygaszają się przy oddaleniu, nie wymagają pobierania tekstur.
- **Poprawki geometrii przy wczytywaniu**: odwrócona orientacja trójkątów w siatkach lustrzanych (prawie cała lewa strona ciała), normalne liczone od nowa we float zamiast 8-bitowych z pliku, a cienkie płaty dwustronne (mózg, więzadła, powięzi) mają normalną zawsze w stronę kamery.
- **Światło**: oświetlenie otoczenia (IBL) + światło kluczowe, wypełniające i kontra; neutralne mapowanie tonów.

## Skróty klawiszowe

Działają na komputerze i na iPadzie z klawiaturą we wszystkich trybach; klawisz `?` (albo przycisk ⌨ u góry) pokazuje ściągę dla bieżącego trybu, a po pierwszym wciśnięciu klawisza przyciski dostają małe oznaczenia skrótów.

| Gdzie | Skróty |
| --- | --- |
| Wszędzie | `Alt+1…6` lub `[` `]` tryby · `/` lub `Ctrl+K` szukaj · `Shift+strzałki` obrót · `+` `−` zoom · `F` `B` `R` `L` widoki · `Home` cała sylwetka · `Esc` lub `Backspace` wstecz |
| Atlas | `1…9, 0` warstwy · `D` powierzchowne/głębokie · `I` izoluj · `H` ukryj · `U` pokaż ukryte · `C` centruj · `S` strona · `T` droga nerwu · `←` `→` sąsiedni mięsień |
| Nauka | `↑` `↓` wybór z listy · `Enter` otwórz / dalej · `←` `→` poprzedni/następny mięsień · `Q` quiz z zakresu · `A` atlas |
| Ruch | `↑` `↓` `Enter` wybór ruchu · `←` `→` inny ruch · `Spacja` odtwarzanie · `A` antagoniści · `S` strona |
| Quiz | `1…4` odpowiedź (w menu `1…3` rodzaj pytań) · `Enter`/`Spacja` start, dalej, „nie wiem” · `A` atlas · `M` menu |
| Klinika | `↑` `↓` `Enter` wybór nerwu · `1…4` odpowiedź w quizie · `Enter` następne pytanie · `S` strona · `Esc` wstecz |
| Powtórki | `Spacja` odsłoń · `1` Nie wiem · `2` Trudne · `3` Dobrze · `4` Łatwe · `Spacja` po odsłonięciu = Dobrze · `A` atlas |

## Rolki (wideo 1080×1920)

Tryb rolki tworzy pionową animację jednego mięśnia w identyfikacji @fizjio_anatomia: przelot do mięśnia, zdjęcie zasłaniających go warstw, czynność, pola przyczepów z opisami, ruchy w stawie, nerw z drogą od korzeni i skojarzenie.

```bash
npm run reel -- naramienny            # jedna rolka → reels/deltoid.mp4 + reels/deltoid.txt (opis posta)
npm run reel -- "biceps brachii" --side l
npm run reel -- --nerve axillary      # seria wzdłuż nerwu: numer odcinka i „Dalej: …” w każdej rolce
npm run reel -- --list                # dostępne mięśnie i nerwy
npm run reel -- naramienny --still    # same kadry kontrolne (PNG) zamiast filmu
```

Skrypt działa samodzielnie na komputerze, bez Claude'a i bez internetu (po instalacji): czyta bazę z `src/data`, renderuje w lokalnej przeglądarce i składa MP4.

**Instalacja (raz):** Node.js LTS, potem w folderze projektu `npm install` i `npm run reel:setup` (pobiera Playwright, Chromium i ffmpeg). Na Windows wystarczy dwukrotnie kliknąć `rolka.bat` – zainstaluje brakujące rzeczy i zapyta o mięsień.

**Praca z planem serii** (`tools/reel_plan.mjs`, 180 dni):

```bash
npm run reel -- --week 1      # dni 1–7; gotowe pliki są pomijane (--force renderuje ponownie)
npm run reel -- 8-14          # dowolny zakres dni
npm run reel:plan             # odświeża docs/plan-rolek.pdf po zmianie kolejności lub daty startu
```

**Gdzie są dane:** opisy mięśni w `src/data/muscles_*.js`, nerwy w `src/data/nerves.js`, ruchy w `src/data/movements.js`. Teksty pisane specjalnie pod rolkę (hak, krótsze linie, skojarzenie) dodaje się w `src/data/reel_texts.js` – mają pierwszeństwo przed automatycznymi skrótami.

Podgląd na żywo bez renderowania: dopisz do adresu aplikacji `?reel=deltoid` (klucze z `--list`; stuknięcie zatrzymuje i wznawia).

## Posty (karuzela 5 × 1080×1350)

Z tej samej bazy powstaje karuzela w układzie dotychczasowych postów: okładka, „Co robi?”, przyczepy z odnośnikami, unerwienie, klinika i skojarzenie – z renderami 3D z modelu.

```bash
npm run post -- naramienny      # → posts/deltoid/01-okladka.png … 05-klinika.png + opis.txt
npm run post -- --week 1        # karuzele dla dni 1–7 z planu
```

Na Windows: dwuklik `post.bat`. Własny tekst pod slajdy (hak na okładkę, krótsze przyczepy, skojarzenie) wpisuje się w `src/data/reel_texts.js` w polu `post` danego mięśnia. Podgląd w przeglądarce: `?post=deltoid&slide=1` (slajdy 1–5).

## Synchronizacja postępu (Firebase)

Aplikacja działa bez tego – wtedy postęp zostaje w przeglądarce. Żeby włączyć synchronizację między urządzeniami (raz, ok. 10 minut, darmowy plan Spark wystarcza):

1. [console.firebase.google.com](https://console.firebase.google.com) → **Dodaj projekt** (Google Analytics niepotrzebne).
2. **Ustawienia projektu → Twoje aplikacje → Web (`</>`)** → zarejestruj aplikację i skopiuj obiekt `firebaseConfig` do `src/firebase-config.js` (zamiast `null`). Te wartości są publiczne – dane chronią reguły.
3. **Authentication → Rozpocznij → Google** → włącz. W **Ustawienia → Autoryzowane domeny** dodaj domenę, pod którą działa aplikacja (np. `twoj-login.github.io`).
4. **Firestore Database → Utwórz bazę** → region `europe-central2` (Warszawa), tryb produkcyjny.
5. **Firestore → Reguły** → wklej zawartość `firestore.rules` i opublikuj. Po każdej zmianie tego pliku (np. dodanie notatek – kolekcja `notes`) trzeba go opublikować ponownie; do tego czasu notatki zapisują się tylko w przeglądarce. Po pierwszym logowaniu możesz zawęzić dostęp do swojego konta (uid z zakładki Authentication).

Dane: `users/{uid}/srs|quiz|learn|settings|notes/{id}` – jeden dokument na fiszkę, pytanie i sektor; przy dwóch urządzeniach wygrywa nowsza zmiana, a liczniki quizu się sumują. Test lokalny bez prawdziwego projektu: `npx firebase-tools emulators:start --only auth,firestore --project demo-anatomia` i adres aplikacji z `?emu`.

### Firebase Hosting (logowanie na iPadzie / iPhonie)

Safari blokuje logowanie Google przez inną domenę niż ta, na której działa aplikacja, dlatego na urządzeniach Apple używaj kopii z **https://anatomia-3d-6b134.web.app** (tam aplikacja i logowanie są w tej samej domenie). Publikuje ją workflow `.github/workflows/firebase-hosting.yml`, gdy w repozytorium jest sekret **`FIREBASE_SERVICE_ACCOUNT`**: Konsola Firebase → Ustawienia projektu → Service accounts → Generate new private key, a zawartość pobranego pliku JSON wklej w GitHub → Settings → Secrets and variables → Actions → New repository secret. Pliku z kluczem nikomu nie wysyłaj i usuń go po dodaniu sekretu.

Jednorazowo trzeba też dopisać tę domenę do klienta OAuth, inaczej Google pokaże **„Błąd 400: redirect_uri_mismatch”**: Google Cloud Console → Interfejsy API i usługi → Dane logowania → „Web client (auto created by Google Service)” → w „Autoryzowane źródła JavaScript” `https://anatomia-3d-6b134.web.app`, a w „Autoryzowane identyfikatory URI przekierowania” `https://anatomia-3d-6b134.web.app/__/auth/handler` → Zapisz (zmiana działa po kilku minutach).

## Uruchomienie

```bash
npm install
npm run dev        # wersja deweloperska
npm run build      # wersja produkcyjna w dist/
npm run validate   # spójność bazy wiedzy z modelem (nazwy siatek, klucze mięśni, ruchy, pokrycie polskich nazw)
npm test           # walidacja + build + test dymny w Chromium (wymaga Playwright: npm run reel:setup)
```

Animacje testów funkcjonalnych opisuje `src/poses.js` (klatki kluczowe kątów segmentów ciała + „przypięcie” do podłoża: stopa zostaje w miejscu, a ciało leży na blacie kozetki lub macie), rekwizyty buduje `src/props.js`. `npm run build && node tools/pose_check.mjs --shots katalog` mierzy w kluczowych klatkach punkty kontaktu (np. potylica, kość krzyżowa i pięty na blacie kozetki, dłonie i palce stóp na macie) i zapisuje zrzuty póz do przeglądu.

Walidacja bazy uruchamia się też w obu workflow przed publikacją – błąd w danych zatrzymuje wdrożenie. Wersję pamięci offline (`public/sw.js`) build liczy sam ze skrótu zawartości `public/models` i `public/data`, więc po podmianie modeli nie trzeba jej zmieniać ręcznie, a zwykła zmiana kodu nie zmusza użytkowników do ponownego pobierania modeli.

Publikacja: workflow `.github/workflows/pages.yml` buduje i wystawia aplikację na GitHub Pages (w ustawieniach repozytorium: Settings → Pages → Source: **GitHub Actions**).

## Odtworzenie modeli

Gotowe modele są w `public/models`. Żeby zbudować je od nowa z szablonu Z-Anatomy:

```bash
pip install bpy numpy
python3 -I tools/export_blend.py <Startup.blend> <katalog_raw>   # plik czytany jako dane, bez wykonywania osadzonych skryptów
node tools/build_models.mjs <katalog_raw> public                 # upraszczanie siatek + kompresja meshopt
node tools/build_text.mjs <TA2.csv> <katalog_raw>/texts.json     # nazwy łacińskie (TA2) i krótkie opisy
node tools/validate_kb.mjs                                       # spójność bazy wiedzy z modelem
node tools/add_bp3d.mjs <katalog_stl_BodyParts3D>               # mięśnie spoza Z-Anatomy (półkolcowy głowy, łonowo-odbytniczy, międzypoprzeczne szyjne) → muscles_extra.glb
```

## Źródła i licencje

- Modele 3D, pola przyczepów i punkty kostne: **Z-Anatomy** (Gauthier Kervyn, Marcin Zieliński), licencja **CC BY-SA 4.0**, oparte na **BodyParts3D** © The Database Center for Life Science, CC BY-SA 2.1 Japan. Zmiany: uproszczenie i kompresja siatek, własna paleta barw, podział na pliki.
- Mięśnie półkolcowy głowy, łonowo-odbytniczy i międzypoprzeczne szyjne: **BodyParts3D** (DBCLS), CC BY-SA 2.1 Japan – siatki przeliczone do układu modelu i uproszczone (`tools/add_bp3d.mjs`, plik `public/models/muscles_extra.glb`).
- Krótkie opisy angielskie: Wikipedia za pośrednictwem Z-Anatomy, CC BY-SA.
- Nazwy łacińskie: Terminologia Anatomica 2 (zestawienie z repozytorium Z-Anatomy).
- Pliki w `public/models` i `public/data` jako utwory zależne pozostają na licencji CC BY-SA 4.0.

## Źródła treści

Bochenek, Reicher – *Anatomia człowieka*; Sobotta, Netter – atlasy; Terminologia Anatomica 2; Kendall – *Muscles: Testing and Function*; Hislop – *Daniels and Worthingham's Muscle Testing*; Kaltenborn – *Manual Mobilization of the Joints*; Cyriax (wzorce torebkowe); Magee – *Orthopedic Physical Assessment*; ASIA/ISCoS – ISNCSCI (miotomy, dermatomy); testy funkcjonalne: Podsiadlo & Richardson, Shumway-Cook (TUG), Rikli & Jones (30CST, Senior Fitness Test), Duncan (FRT), Berg, Tinetti, Enright & Sherrill i ATS (6MWT), Perry, Studenski (prędkość chodu), Cook (FMS), Plisky (Y-Balance), Noyes (testy skoków), Crossley, Piva, McGill, Biering-Sørensen. Lista jest też w aplikacji: ⚙ → O aplikacji → Źródła treści.

## Zastrzeżenie

Opisy mięśni, nerwów, stawów, testów klinicznych i struktur oraz symulacja uszkodzeń zostały napisane do nauki i nie przeszły recenzji anatoma ani fizjoterapeuty klinicysty. Mogą różnić się w szczegółach od podręcznika obowiązującego na uczelni (np. zakresy segmentów). Przed egzaminem zweryfikuj je z podręcznikiem i materiałami prowadzącego. Aplikacja nie służy do diagnostyki.
