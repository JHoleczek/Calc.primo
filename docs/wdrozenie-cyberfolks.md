# Wdrożenie kalkulatora na cyber_folks (etap 1)

Kalkulator działa na Waszym hostingu, a zapytania wysyła skrypt `api/wyslij.php` – bez zewnętrznych formularzy.

## 1. Skrzynka nadawcy na domenie

Maile muszą wychodzić z adresu na Waszej domenie (np. `kalkulator@primomeble.pl`), inaczej trafiają do spamu.

1. Zaloguj się do panelu cyber_folks → usługa hostingowa → panel hostingu (DirectAdmin).
2. Sprawdź, czy domena `primomeble.pl` jest na liście domen. Jeśli nie – dodaj ją („Dodaj domenę”)
   i ustaw w rejestratorze domeny serwery DNS cyber_folks (albo same rekordy MX/SPF, jeśli strona ma zostać gdzie indziej).
3. Poczta → **Konta e-mail** → utwórz `kalkulator@primomeble.pl` (i od razu `biuro@primomeble.pl`, jeśli chcecie
   mieć firmowy adres zamiast Gmaila).
4. Poczta / DNS → włącz **DKIM** dla domeny i sprawdź, że rekord **SPF** zawiera serwery cyber_folks.

## 2. Ustawienia skryptu

Plik `public/api/config.php` (bez haseł – można trzymać w repozytorium):

- `office_email` – kto dostaje zapytania (teraz kalkulator@primomeble.pl),
- `from_email` – skrzynka z punktu 1,
- `site_url` – adres kalkulatora z ukośnikiem na końcu, np. `https://primomeble.pl/kalkulator/`,
- `data_dir` – gdzie zapisywać licznik i kopie zapytań (najlepiej katalog poza `public_html`).

W panelu ustaw PHP w wersji **8.1 lub nowszej**.

## 3. Automatyczne wgrywanie z GitHuba

1. W panelu cyber_folks utwórz konto FTP z dostępem do katalogu kalkulatora.
2. W repozytorium GitHub: Settings → Secrets and variables → Actions → dodaj:
   - `FTP_SERVER` – adres serwera FTP z panelu,
   - `FTP_USERNAME`, `FTP_PASSWORD`,
   - `FTP_DIR` – katalog docelowy z ukośnikiem na końcu, np. `/domains/primomeble.pl/public_html/kalkulator/`.
3. Każdy push uruchamia „Deploy na cyber_folks” (zakładka Actions). Bez sekretów krok wgrywania jest pomijany.

## 4. Test po wdrożeniu

1. Dodaj front do koszyka → „Zapytaj o wycenę” → wyślij na swój adres.
2. Na ekranie powinien pojawić się numer `ZP/2026/0001`.
3. Biuro: mail „Nowe zapytanie …” z rysunkami i przyciskiem „Utwórz ofertę”.
4. Klient: mail „Otrzymaliśmy zapytanie …” bez cen.
5. Jeśli mail wpadł do spamu – sprawdź DKIM/SPF (punkt 1.4) i oznacz „To nie spam”.

## Dane osobowe

Kopie zapytań (kontakt + pozycje) leżą w `data_dir/zapytania/`. Usuwajcie je, gdy nie są już potrzebne
(np. po roku od ostatniego kontaktu) – tak mówi polityka prywatności.
