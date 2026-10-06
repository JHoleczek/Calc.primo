<?php
// Ustawienia wysyłki zapytań z kalkulatora (serwer cyber_folks).
// Nie ma tu haseł: PHP wysyła pocztę przez serwer pocztowy hostingu (funkcja mail()).

return [
    // Kto dostaje zapytania. TYMCZASOWO 02holek@gmail.com – docelowo skrzynka biura.
    'office_email' => '02holek@gmail.com',

    // Nadawca maili – skrzynka założona w panelu cyber_folks na domenie strony
    // (np. kalkulator@primomeble.pl). Musi być na tej samej domenie co hosting,
    // inaczej maile trafiają do spamu.
    'from_email' => 'kalkulator@primomeble.pl',
    'from_name' => 'Primo Meble – kalkulator frontów',

    // Adres kalkulatora (z ukośnikiem na końcu) – z niego budowane są linki „Rzut” i „Utwórz ofertę”.
    'site_url' => 'https://www.primomeble.pl/kalkulator/',

    // Prefiks numeru zapytania: ZP/2026/0001.
    'number_prefix' => 'ZP',

    // Limit zapytań z jednego adresu IP (ochrona przed spamem).
    'rate_limit' => ['max' => 5, 'window_s' => 600],

    // Gdzie zapisywać licznik i kopie zapytań. Domyślnie katalog „data” obok skryptu
    // (zablokowany dla przeglądarki plikiem .htaccess). Najlepiej wskazać katalog poza public_html.
    'data_dir' => __DIR__ . '/data',
];
