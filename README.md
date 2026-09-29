# Kalkulator frontów giętych (Primo Meble)

Kalkulator powierzchni (m²) frontów giętych z informacją o dodatkach.
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
- `src/lib/calculate.ts` – kod katalogowy (np. `EG-N2-R300`), rozwinięcie, m², dodatki, walidacja.
- `src/lib/frontGeometry.ts` – siatka 3D z ryflowaniem wyfrezowanym w licu.
- `src/lib/paintColor.ts` – przybliżony kolor ekranowy z RAL / NCS / hex / nazwy.
- `src/components/viz3d/` – scena three.js (React Three Fiber), ładowana leniwie.
- `src/components/PlanView.tsx` + `PlanDrawing.tsx` + `src/lib/planGeometry.ts` – rzut z góry w stylu
  rysunku technicznego: zoom (kółko, szczypanie, +/−), przesuwanie (przeciąganie, strzałki),
  „Wyzeruj widok” (też klawisz 0 / podwójne kliknięcie).
- `src/lib/planExport.tsx` – pobieranie rysunku jako SVG lub PNG (cały rysunek z tabliczką: kod,
  typ, R, H, grubość), niezależnie od bieżącego powiększenia.
- `src/lib/cart.ts` + `src/components/Cart.tsx` – koszyk: ilość, edycja, duplikowanie, usuwanie,
  sumy sztuk i m²; zapis w przeglądarce (localStorage).
- `src/components/CartDrawer.tsx` – ikona koszyka w prawym górnym rogu i panel wysuwany z prawej
  (Esc / ✕ / tło zamykają, fokus zostaje w panelu).
- `src/components/SubmitForm.tsx` + `src/lib/sendQuote.ts` – „Zapytaj o wycenę” w koszyku: telefon i e-mail
  (wymagane), firma i uwagi (opcjonalne). Wysyłka przez FormSubmit (strona jest statyczna) na
  biuro.primomeble@gmail.com: pełne wyliczenie (m², stawki, dopłaty, ceny) + proponowana odpowiedź do klienta.
  Pierwsze zapytanie wysyła na adres biura e-mail aktywacyjny – trzeba go raz potwierdzić.
  Gdy wysyłka się nie uda, klient może wysłać zapytanie ze swojej poczty (wersja bez m² i cen).
- `src/config/pricing.ts` + `src/lib/pricing.ts` – cennik [zł/m²] i dopłaty (H > 2780 mm +30%, bryła +25%,
  mnożone kolejno). `null` = cena do ustalenia (pozycja „wycena indywidualna”).
- `src/components/CtaBanner.tsx` – baner ze zdjęciem na końcu strony, otwiera koszyk.

Klient nie widzi m² ani cen – tylko konfigurację i koszyk (z edycją). Uwaga: cennik jest w kodzie
strony, więc technicznie da się go odczytać; pełne ukrycie wymaga własnego serwera.

Hosting: GitHub Pages (`.github/workflows/pages.yml`) – każdy push na gałąź domyślną testuje,
buduje i publikuje stronę pod https://jholeczek.github.io/Calc.primo/.

Pojedynczy plik HTML do podglądu: `SINGLE_FILE=1 npx vite build --base=./`.

## Założenia obliczeń

- R to promień **lica zewnętrznego** (powierzchnia wewnętrzna ma R − 18 mm).
- Rozwinięcie = suma łuków po zewnętrznej + odcinki proste:
  - narożne: łuk 90° + przedłużenia wpisane przez klienta (N0 – brak, N1 – prawe, na końcu łuku;
    N2 – lewe i prawe; 10–700 mm, domyślnie 50),
  - przedłużane: łuk 90° + (L − R),
  - obustronne: 2 × łuk 90° R100 + (W − 200) + opcjonalnie 2 × (Z − 100),
  - w łuk: półokrąg 180°.
- **m² = (długość łuku + ewentualne przedłużenia) × H** – podstawa wyceny (widoczna tylko dla biura).
- H powyżej 2780 mm – tylko laminat gładki (inne materiały wyszarzone) i dopłata +30%.
- Bryła (front + środek) – opcja dla wszystkich typów, dopłata +25%.
