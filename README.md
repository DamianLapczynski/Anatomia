# Anatomia 3D

Interaktywny atlas anatomii 3D do nauki na studiach fizjoterapii: układ kostny, mięśniowy, nerwowy i krwionośny całego ciała, z opisami po polsku i nazwami łacińskimi. Działa w przeglądarce na telefonie, tablecie i komputerze; po pierwszym uruchomieniu także offline.

## Co potrafi

- **Atlas** – 3300 osobnych struktur (kości, więzadła, mięśnie, pola przyczepów, tętnice, żyły, nerwy, mózg i rdzeń). Warstwy, strona ciała, okolice, wyszukiwarka PL / łac. / ang., ukrywanie kolejnych warstw.
- **Izolacja mięśnia** – mięsień + pola przyczepu początkowego (czerwone) i końcowego (niebieskie) na kościach + nerw z drogą od korzeni + tętnica; resztę ciała można przyciemnić albo ukryć, a każdy element kontekstu włączać osobno.
- **Baza wiedzy** – 144 pozycje mięśniowe (przyczepy, unerwienie z segmentami, unaczynienie, czynność, klinika / fizjoterapia, skojarzenie), 25 nerwów (przebieg, zakres ruchowy i czuciowy, objawy uszkodzenia), ok. 760 punktów kostnych (dla głównych kości kończyn, obręczy i kości krzyżowej z polskimi nazwami).
- **Ruch** – 37 ruchów z podziałem na agonistów, synergistów i antagonistów; 26 z animacją szkieletu.
- **Quiz** – wskaż strukturę na modelu, rozpoznaj podświetloną, pytania o unerwienie / przyczepy / czynność.
- **Powtórki** – fiszki z modelem 3D i algorytmem SM-2; postęp w pamięci przeglądarki, z eksportem i importem.

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
