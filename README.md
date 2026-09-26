# Kalkulator frontów giętych (Primo Meble)

Kalkulator powierzchni (m²) i metrów bieżących (mb) frontów giętych z informacją o dodatkach.
Ekran jest podzielony na pół: po lewej (desktop) / u góry (mobile) jest wizualizacja
(model 3D oraz rzut z góry), resztę ekranu zajmuje konfiguracja.

## Uruchomienie

```bash
npm install
npm run dev      # serwer deweloperski
npm test         # testy logiki obliczeń (vitest)
npm run build    # build produkcyjny do dist/
```

## Struktura

- `src/config/catalog.ts` – dane z „Fronty Primo — Katalog frontów giętych 2026”:
  kategorie (narożne, przedłużane, obustronne, w łuk R200–350), promienie, zakończenia N0/N1/N2,
  wymiary L / W / Z, ryflowanie F00–F13 z profilami, materiały (laminat – tylko gładki,
  fornir, lakier), grubość 18 mm, wysokość do 3200 mm.
- `src/assets/catalog/` + `src/config/images.ts` – rysunki techniczne z katalogu (podglądy typów,
  zakończeń, przedłużeń, ryflowań) i zdjęcie do sekcji CTA.
- `src/lib/frontPath.ts` – kształt frontu w rzucie jako ciąg łuków i odcinków prostych
  (po licu zewnętrznym). Z tego jednego opisu korzystają obliczenia, rzut 2D i model 3D.
- `src/lib/calculate.ts` – kod katalogowy (np. `EG-N2-R300`), rozwinięcie, mb, m², dodatki, walidacja.
- `src/lib/frontGeometry.ts` – siatka 3D z ryflowaniem wyfrezowanym w licu.
- `src/lib/paintColor.ts` – przybliżony kolor ekranowy z RAL / NCS / hex / nazwy.
- `src/components/viz3d/` – scena three.js (React Three Fiber), ładowana leniwie.
- `src/components/PlanView.tsx` – rzut z góry w stylu rysunku technicznego.
- `src/lib/cart.ts` + `src/components/Cart.tsx` – koszyk: ilość, edycja, duplikowanie, usuwanie,
  sumy mb / m²; zapis w przeglądarce (localStorage).
- `src/components/SubmitCta.tsx` – „Wyślij do oceny”: gotowa wiadomość z całym koszykiem do biura
  (program pocztowy) lub kopiowanie treści. Bez płatności – to zapytanie, nie zamówienie.

Hosting: GitHub Pages (`.github/workflows/pages.yml`) – każdy push na gałąź domyślną testuje,
buduje i publikuje stronę pod https://jholeczek.github.io/Calc.primo/.

Pojedynczy plik HTML do podglądu: `SINGLE_FILE=1 npx vite build --base=./`.

## Założenia obliczeń

- R to promień **lica zewnętrznego** (powierzchnia wewnętrzna ma R − 18 mm).
- Rozwinięcie = suma łuków po zewnętrznej + odcinki proste:
  - narożne: łuk 90° + 50 mm na każde przedłużenie (N1 – jedno, na dolnym końcu; N2 – dwa),
  - przedłużane: łuk 90° + (L − R),
  - obustronne: 2 × łuk 90° R100 + (W − 200) + opcjonalnie 2 × (Z − 100),
  - w łuk: półokrąg 180°.
- mb = rozwinięcie w metrach; m² = rozwinięcie × H.
