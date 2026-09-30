# Kalkulator frontów giętych (Primo Meble)

Kalkulator powierzchni (m²) frontów giętych z informacją o dodatkach.
Wizualizacja (model 3D oraz rzut z góry) zajmuje całe tło strony, model stoi po lewej; konfigurator
jest w pływającym panelu po prawej, koszyk w lewym górnym rogu. Na telefonie wizualizacja jest u góry,
a konfigurator pod nią.

Wygląd: design system „Primo Calc” (ciemne ciepłe tło, płaskie karty, nagłówki sekcji wersalikami,
złoto #EDC880 tylko do wyróżnień, font Avenir / zastępczo Figtree). Ikony typów, wysokości i zakończenia
to grafiki z design systemu (`src/assets/icons`); ikona zakończenia ma warianty N0 / N1 lewe / N1 prawe / N2.

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
- `src/components/CartDrawer.tsx` – ikona koszyka (lewy górny róg, na telefonie prawy) i panel wysuwany z prawej
  (Esc / ✕ / tło zamykają, fokus zostaje w panelu).
- `src/components/SubmitForm.tsx` + `src/lib/sendQuote.ts` – „Zapytaj o wycenę” w koszyku: telefon i e-mail
  (wymagane), firma i uwagi (opcjonalne). Wysyłka przez Web3Forms (strona jest statyczna) –
  klucz `WEB3FORMS_ACCESS_KEY` w `src/config/catalog.ts`, zakładany na web3forms.com dla adresu odbiorcy
  (tymczasowo 02holek@gmail.com, docelowo biuro.primomeble@gmail.com). Bez klucza – zapasowo FormSubmit.
  Treść: pełne wyliczenie (m², stawki, dopłaty, ceny) + proponowana odpowiedź do klienta.
  Gdy wysyłka się nie uda, klient może wysłać zapytanie ze swojej poczty (wersja bez m² i cen).
- `src/config/pricing.ts` + `src/lib/pricing.ts` – cennik [zł/m²] i dopłaty (H > 2780 mm +30%, bryła +25%,
  mnożone kolejno). `null` = cena do ustalenia (pozycja „wycena indywidualna”).
- `src/components/SiteFooter.tsx` – stopka (kontakt, polityka prywatności, cookies), informacja o cookies
  (strona nie używa cookies – tylko localStorage na koszyk) i okno z polityką prywatności (RODO).
  Czcionka Figtree jest serwowana z serwera strony (@fontsource), bez Google Fonts.

Klient nie widzi m² ani cen – tylko konfigurację i koszyk (z edycją). Uwaga: cennik jest w kodzie
strony, więc technicznie da się go odczytać; pełne ukrycie wymaga własnego serwera.

Hosting: GitHub Pages (`.github/workflows/pages.yml`) – każdy push na gałąź domyślną testuje,
buduje i publikuje stronę pod https://jholeczek.github.io/Calc.primo/.

Pojedynczy plik HTML do podglądu: `SINGLE_FILE=1 npx vite build --base=./`.

## Założenia obliczeń

- R to promień **lica zewnętrznego** (powierzchnia wewnętrzna ma R − 18 mm).
- Rozwinięcie = suma łuków po zewnętrznej + odcinki proste:
  - narożne: łuk 90° + przedłużenia lewe / prawe wpisane przez klienta (domyślnie 0 i 0; 10–50 mm).
    Zakończenie wynika z wpisanych wartości: brak → N0, jedno → N1, oba → N2 (ikona zmienia się sama),
  - przedłużane: łuk 90° + (L − R),
  - obustronne: 2 × łuk 90° R100 + (W − 200) + opcjonalnie 2 × (Z − 100),
  - w łuk: półokrąg 180°.
- **m² = (długość łuku + ewentualne przedłużenia) × H** – podstawa wyceny (widoczna tylko dla biura).
- H powyżej 2780 mm – tylko laminat gładki (inne materiały wyszarzone) i dopłata +30%.
- Bryła (front + środek) – opcja dla wszystkich typów, dopłata +25%.
