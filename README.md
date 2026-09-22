# Kalkulator frontów giętych (Primo Meble)

Kalkulator powierzchni (m²) i metrów bieżących (mb) frontów giętych z informacją o dodatkach.
Ekran jest podzielony na pół: po lewej (desktop) / u góry (mobile) jest miejsce na wizualizację,
na razie poglądowy rzut z góry w SVG. Resztę ekranu zajmuje konfiguracja.

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
- `src/components/VisualizationPlaceholder.tsx` to tymczasowy rzut z góry, docelowo do zastąpienia wizualizacją 3D.

## Założenia obliczeń

- R to promień **wewnętrzny** łuku. Strona zewnętrzna ma promień R + grubość frontu (z materiału).
- Rozwinięcie = kąt łuku × promień + liczba przedłużeń (N0 = 0, N1 = 1, N2 = 2) × długość przedłużenia.
- mb = rozwinięcie w metrach; m² = rozwinięcie × H.
- Stronę rozliczenia (zewnętrzna / wewnętrzna) wybiera się przełącznikiem w panelu wyniku.
  Obie wartości są zawsze pokazane w tabeli.
