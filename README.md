# Anatomia 3D

Interaktywny atlas anatomii 3D do nauki na studiach fizjoterapii: układ kostny, mięśniowy, nerwowy i krwionośny całego ciała, z opisami po polsku i nazwami łacińskimi. Działa w przeglądarce na telefonie, tablecie i komputerze; po pierwszym uruchomieniu także offline.

## Co potrafi

- **Atlas** – 3300 osobnych struktur (kości, więzadła, mięśnie, pola przyczepów, tętnice, żyły, nerwy, mózg i rdzeń). Warstwy, strona ciała, okolice, wyszukiwarka PL / łac. / ang., ukrywanie kolejnych warstw.
- **Izolacja mięśnia** – mięsień + pola przyczepu początkowego (czerwone) i końcowego (niebieskie) na kościach + nerw z drogą od korzeni + tętnica; resztę ciała można przyciemnić albo ukryć, a każdy element kontekstu włączać osobno.
- **Baza wiedzy** – 144 pozycje mięśniowe (przyczepy, unerwienie z segmentami, unaczynienie, czynność, klinika / fizjoterapia, skojarzenie), 25 nerwów (przebieg, zakres ruchowy i czuciowy, objawy uszkodzenia), ok. 760 punktów kostnych (dla głównych kości kończyn, obręczy i kości krzyżowej z polskimi nazwami).
- **Nauka** – małe sektory mięśni (ok. 50 grup) i drogi 24 nerwów: przegląd w kolorach, przejście mięsień po mięśniu, quiz z tego samego zakresu. Filtr warstwy: mięśnie powierzchowne / głębokie.
- **Ruch** – 37 ruchów z podziałem na agonistów, synergistów i antagonistów; 26 z animacją szkieletu.
- **Quiz** – wskaż strukturę na modelu, rozpoznaj podświetloną, pytania o unerwienie / przyczepy / czynność.
- **Powtórki** – fiszki z modelem 3D i algorytmem SM-2; postęp w pamięci przeglądarki, z eksportem i importem.

## Style graficzne

Lewy panel → **Wygląd**. Każdy styl to komplet: kolory i materiały interfejsu, typografia oraz oprawa sceny 3D (światło, tło, kolor półprzezroczystej sylwetki, cień pod stopami – `src/looks.js`). Kolory tkanek są wszędzie te same.

- **Atlas** – ciepły papier z fakturą, szeryf Fraunces, burgund; jak klasyczny atlas anatomiczny.
- **Noir** – galeria nocą: czerń, punktowe światło ze złotą kontrą, Instrument Serif.
- Rodzina noir (ta sama galeryjna czerń, inny kamień i światło): **Onyks** – platyna i zimne światło; **Aksamit** – bordo i rubinowa kontra; **Światłocień** – jedno ciepłe światło z boku, Bodoni Moda; **Szmaragd** – zieleń i szmaragdowa kontra.
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
| Wszędzie | `Alt+1…5` lub `[` `]` tryby · `/` lub `Ctrl+K` szukaj · `Shift+strzałki` obrót · `+` `−` zoom · `F` `B` `R` `L` widoki · `Home` cała sylwetka · `Esc` lub `Backspace` wstecz |
| Atlas | `1…9, 0` warstwy · `D` powierzchowne/głębokie · `I` izoluj · `H` ukryj · `U` pokaż ukryte · `C` centruj · `S` strona · `T` droga nerwu · `←` `→` sąsiedni mięsień |
| Nauka | `↑` `↓` wybór z listy · `Enter` otwórz / dalej · `←` `→` poprzedni/następny mięsień · `Q` quiz z zakresu · `A` atlas |
| Ruch | `↑` `↓` `Enter` wybór ruchu · `←` `→` inny ruch · `Spacja` odtwarzanie · `A` antagoniści · `S` strona |
| Quiz | `1…4` odpowiedź (w menu `1…3` rodzaj pytań) · `Enter`/`Spacja` start, dalej, „nie wiem” · `A` atlas · `M` menu |
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

**Praca z planem serii** (`tools/reel_plan.mjs`, 144 dni):

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

## Uruchomienie

```bash
npm install
npm run dev      # wersja deweloperska
npm run build    # wersja produkcyjna w dist/
```

Publikacja: workflow `.github/workflows/pages.yml` buduje i wystawia aplikację na GitHub Pages (w ustawieniach repozytorium: Settings → Pages → Source: **GitHub Actions**).

## Odtworzenie modeli

Gotowe modele są w `public/models`. Żeby zbudować je od nowa z szablonu Z-Anatomy:

```bash
pip install bpy numpy
python3 -I tools/export_blend.py <Startup.blend> <katalog_raw>   # plik czytany jako dane, bez wykonywania osadzonych skryptów
node tools/build_models.mjs <katalog_raw> public                 # upraszczanie siatek + kompresja meshopt
node tools/build_text.mjs <TA2.csv> <katalog_raw>/texts.json     # nazwy łacińskie (TA2) i krótkie opisy
node tools/validate_kb.mjs                                       # spójność bazy wiedzy z modelem
```

## Źródła i licencje

- Modele 3D, pola przyczepów i punkty kostne: **Z-Anatomy** (Gauthier Kervyn, Marcin Zieliński), licencja **CC BY-SA 4.0**, oparte na **BodyParts3D** © The Database Center for Life Science, CC BY-SA 2.1 Japan. Zmiany: uproszczenie i kompresja siatek, własna paleta barw, podział na pliki.
- Krótkie opisy angielskie: Wikipedia za pośrednictwem Z-Anatomy, CC BY-SA.
- Nazwy łacińskie: Terminologia Anatomica 2 (zestawienie z repozytorium Z-Anatomy).
- Pliki w `public/models` i `public/data` jako utwory zależne pozostają na licencji CC BY-SA 4.0.

## Zastrzeżenie

Opisy mięśni i nerwów zostały napisane do nauki i nie przeszły recenzji anatoma. Mogą różnić się w szczegółach od podręcznika obowiązującego na uczelni (np. zakresy segmentów). Przed egzaminem zweryfikuj je z podręcznikiem i materiałami prowadzącego. Aplikacja nie służy do diagnostyki.
