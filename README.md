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

- `src/config/catalog.ts` zawiera dane katalogowe: typy frontów, promienie, zakończenia N0/N1/N2,
  15 ryflowań, materiały i progi. **Wartości są placeholderami** do uzupełnienia na podstawie
  https://katalog.primomeble.pl/#katalog.
- `src/lib/calculate.ts` liczy rozwinięcie, mb, m², dodatki i walidację.
- `src/lib/frontGeometry.ts` buduje siatkę frontu z parametrów: łuk, grubość, przedłużenia
  i ryflowanie wyfrezowane w licu (profile w `FLUTINGS[].profile`).
- `src/lib/paintColor.ts` zamienia wpisany kolor (RAL, NCS, hex, nazwa) na przybliżony kolor ekranowy.
- `src/components/viz3d/` to scena three.js (React Three Fiber): materiały, proceduralne tekstury
  drewna, kamera z obracaniem i zoomem. Ładowana leniwie jako osobny plik.
- `src/components/PlanView.tsx` to rzut z góry w SVG (zakładka „Rzut z góry”).

Pojedynczy plik HTML do podglądu: `SINGLE_FILE=1 npx vite build --base=./`.

## Założenia obliczeń

- R to promień **wewnętrzny** łuku. Strona zewnętrzna ma promień R + grubość frontu (z materiału).
- Rozwinięcie = kąt łuku × promień + liczba przedłużeń (N0 = 0, N1 = 1, N2 = 2) × długość przedłużenia.
- mb = rozwinięcie w metrach; m² = rozwinięcie × H.
- Stronę rozliczenia (zewnętrzna / wewnętrzna) wybiera się przełącznikiem w panelu wyniku.
  Obie wartości są zawsze pokazane w tabeli.
