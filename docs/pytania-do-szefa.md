# Pytania do szefa – cennik frontów giętych

Źródło stawek: `cennik_giete.xlsx` od szefa (październik 2026), wpisane w `src/config/pricing.ts`. Stawki netto.

| Materiał | Gładki (FG) | Ryflowany | FR07 i FR12 | Surowe |
|---|---|---|---|---|
| Lakierowane | 1800 | 2600 | 2750 | 1200 |
| Fornir dąb | 2700 | 3100 | 3250 | 2000 |
| Fornir orzech amerykański | 2850 | 3200 | 3450 | 2100 |
| Laminat (tylko gładki) | 2600 | – | – | – |

Fornir bejcowany: +100 zł/m². Laminat: koszt samego laminatu po stronie klienta. H > 2780 mm +30%, bryła +25% –
dopłaty mnożone (potwierdzone). Przedłużenia – tylko m², bez dopłaty (potwierdzone). Bryła – bez dodatkowych
wymiarów, w kalkulatorze grafika i „+25%” (potwierdzone).

## Otwarte

1. **Surowe** – co to dokładnie jest (front bez lakieru / bez wykończenia)? Czy klient ma to wybierać w kalkulatorze?
   Stawki są już w cenniku (`raw`), ale kalkulator ich na razie nie używa.
2. **FR07 i FR12** – w nowym cenniku droższe są FR07 i FR12 (wcześniej FR07 i FR08). Czy FR08 jest teraz w zwykłej cenie?
3. **Bejca na orzechu** – w cenniku jest „+100” także przy orzechu. Czy orzech też może być bejcowany?
4. **Kolor lakieru** – odpowiedź „klient pokrywa koszt”: czy to znaczy dopłatę za kolory specjalne (np. metalik)?
5. **Minimum** – minimalna powierzchnia / kwota zamówienia, transport.

## Oferta (etap 1: zapytanie → oferta z biura → akceptacja → zadatek)

9. **Numer konta** do wpłat zadatku (wpisywany w ofercie – `COMPANY.bankAccount` w `src/config/catalog.ts`).
10. **Zadatek** – ile procent wartości brutto? (teraz 50%) W ile dni od akceptacji? (teraz 7)
11. **Termin realizacji** – jaki wpisywać domyślnie? (teraz „4–6 tygodni od zaksięgowania zadatku”)
12. **Ważność oferty** – ile dni? (teraz 14)
13. **Reszta płatności** – przed odbiorem/wysyłką? Czy jest dostawa i jej koszt?
14. **Regulamin i treść warunków w ofercie** – do sprawdzenia przez prawnika przed startem
    (zadatek, brak prawa odstąpienia przy produkcji na wymiar, reklamacje).
