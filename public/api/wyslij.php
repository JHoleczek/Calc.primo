<?php
// Zapytanie o wycenę z kalkulatora frontów giętych.
// 1) sprawdza dane, 2) nadaje numer ZP/RRRR/NNNN, 3) zapisuje kopię zapytania,
// 4) wysyła mail do biura (z cenami wstępnymi, rysunkami i przyciskiem „Utwórz ofertę”),
// 5) wysyła klientowi potwierdzenie BEZ cen („to nie jest zamówienie”).
// Odpowiedź: JSON { ok: true, number } albo { ok: false, message }.

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$config = require __DIR__ . '/config.php';

function respond(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(int $status, string $message): never
{
    respond($status, ['ok' => false, 'message' => $message]);
}

function h(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function zl(?float $v): string
{
    return $v === null ? 'do ustalenia' : number_format($v, 0, ',', ' ') . ' zł';
}

// ---------- Wejście ----------

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail(405, 'Dozwolone tylko POST.');
}

// Tylko z naszej strony (przeglądarka zawsze wysyła Origin przy POST z fetch).
$siteOrigin = preg_replace('#^(https?://[^/]+).*$#', '$1', $config['site_url']);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = [$siteOrigin, preg_replace('#//www\.#', '//', $siteOrigin), preg_replace('#//(?!www\.)#', '//www.', $siteOrigin)];
if ($origin !== '' && !in_array($origin, $allowed, true) && !($config['allow_any_origin'] ?? false)) {
    fail(403, 'Niedozwolone źródło zapytania.');
}

$raw = file_get_contents('php://input', false, null, 0, 4_000_000) ?: '';
$in = json_decode($raw, true);
if (!is_array($in)) {
    fail(400, 'Nieprawidłowe dane zapytania.');
}

// Pole-pułapka na boty: wypełnione = udajemy sukces, nic nie wysyłamy.
if (trim((string)($in['website'] ?? '')) !== '') {
    respond(200, ['ok' => true, 'number' => null]);
}

$str = static fn($v, int $max): string => mb_substr(trim(is_string($v) ? $v : ''), 0, $max);
$contact = is_array($in['contact'] ?? null) ? $in['contact'] : [];
$phone = $str($contact['phone'] ?? '', 40);
$email = $str($contact['email'] ?? '', 200);
$company = $str($contact['company'] ?? '', 150);
$notes = $str($contact['notes'] ?? '', 2000);

if (!preg_match('/^[0-9 +()\-]{6,40}$/', $phone) || strlen(preg_replace('/\D/', '', $phone)) < 9) {
    fail(400, 'Podaj poprawny numer telefonu.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail(400, 'Podaj poprawny adres e-mail.');
}

$itemsIn = $in['items'] ?? null;
if (!is_array($itemsIn) || count($itemsIn) < 1 || count($itemsIn) > 50) {
    fail(400, 'Koszyk musi mieć od 1 do 50 pozycji.');
}

$items = [];
foreach (array_values($itemsIn) as $i => $it) {
    if (!is_array($it)) {
        fail(400, 'Nieprawidłowa pozycja koszyka.');
    }
    $code = (string)($it['code'] ?? '');
    $fluting = (string)($it['fluting'] ?? '');
    $rzut = (string)($it['rzut'] ?? '');
    $qty = $it['qty'] ?? null;
    if (!preg_match('/^[A-Z0-9-]{3,40}$/', $code) || !preg_match('/^(FG|FR\d{2})$/', $fluting)) {
        fail(400, 'Nieprawidłowy kod frontu w pozycji ' . ($i + 1) . '.');
    }
    if (!is_int($qty) || $qty < 1 || $qty > 999) {
        fail(400, 'Nieprawidłowa ilość w pozycji ' . ($i + 1) . '.');
    }
    if ($rzut !== '' && !preg_match('/^[A-Za-z0-9_-]{1,4000}$/', $rzut)) {
        fail(400, 'Nieprawidłowy rysunek w pozycji ' . ($i + 1) . '.');
    }
    $num = static fn($v): ?float => is_int($v) || is_float($v) ? max(0.0, min(10_000_000.0, (float)$v)) : null;

    // Miniatura rzutu (PNG) – tylko do maila dla biura.
    $png = null;
    if (is_string($it['png'] ?? null) && $it['png'] !== '') {
        $bin = base64_decode($it['png'], true);
        if ($bin !== false && strlen($bin) <= 400_000 && str_starts_with($bin, "\x89PNG\r\n\x1a\n")) {
            $png = $bin;
        }
    }

    $items[] = [
        'code' => $code,
        'fluting' => $fluting,
        'name' => $str($it['name'] ?? '', 300),
        'height' => is_int($it['height'] ?? null) || is_float($it['height'] ?? null) ? (int)round($it['height']) : null,
        'ext' => $str($it['ext'] ?? '', 80),
        'finish' => $str($it['finish'] ?? '', 160),
        'flutingName' => $str($it['flutingName'] ?? '', 40),
        'body' => ($it['body'] ?? false) === true,
        'area' => $num($it['area'] ?? null),
        'qty' => $qty,
        'unit' => $num($it['unit'] ?? null),
        'total' => $num($it['total'] ?? null),
        'rzut' => $rzut,
        'png' => $png,
    ];
}

$offer = (string)($in['offer'] ?? '');
if (!preg_match('/^[A-Za-z0-9_-]{1,30000}$/', $offer)) {
    $offer = '';
}

// ---------- Katalog danych, limit, numer ----------

$dataDir = rtrim($config['data_dir'], '/');
foreach ([$dataDir, "$dataDir/zapytania", "$dataDir/limit"] as $dir) {
    if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
        fail(500, 'Błąd serwera (katalog danych).');
    }
}
if (!is_file("$dataDir/.htaccess")) {
    file_put_contents("$dataDir/.htaccess", "Require all denied\nDeny from all\n");
}

// Limit zapytań z jednego IP (skrót adresu, bez zapisywania samego IP).
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$limitFile = "$dataDir/limit/" . hash('sha256', $ip . '|' . __DIR__) . '.json';
$now = time();
$window = (int)$config['rate_limit']['window_s'];
$hits = is_file($limitFile) ? (json_decode((string)file_get_contents($limitFile), true) ?: []) : [];
$hits = array_values(array_filter($hits, static fn($t) => is_int($t) && $t > $now - $window));
if (count($hits) >= (int)$config['rate_limit']['max']) {
    fail(429, 'Za dużo zapytań w krótkim czasie. Spróbuj za kilka minut albo zadzwoń.');
}
$hits[] = $now;
file_put_contents($limitFile, json_encode($hits), LOCK_EX);

// Kolejny numer w danym roku (blokada pliku – dwa zapytania naraz nie dostaną tego samego).
$year = date('Y');
$fh = fopen("$dataDir/licznik.json", 'c+');
if (!$fh || !flock($fh, LOCK_EX)) {
    fail(500, 'Błąd serwera (licznik).');
}
$counter = json_decode(stream_get_contents($fh) ?: '{}', true) ?: [];
$seq = (int)($counter[$year] ?? 0) + 1;
$counter[$year] = $seq;
ftruncate($fh, 0);
rewind($fh);
fwrite($fh, json_encode($counter));
fflush($fh);
flock($fh, LOCK_UN);
fclose($fh);

$number = sprintf('%s/%s/%04d', $config['number_prefix'], $year, $seq);
$fileId = str_replace('/', '-', $number);
$date = date('d.m.Y H:i');

// Kopia zapytania (bez obrazków) – na wypadek problemu z pocztą i do etapu 2 (panel biura).
$record = [
    'number' => $number,
    'date' => date('c'),
    'contact' => compact('phone', 'email', 'company', 'notes'),
    'items' => array_map(static fn($it) => array_diff_key($it, ['png' => 1]), $items),
    'offer' => $offer,
];
file_put_contents("$dataDir/zapytania/$fileId.json", json_encode($record, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);

// ---------- Poczta ----------

/**
 * Wysyła mail HTML + tekst; obrazki (PNG) dołączone jako inline (cid:).
 * @param array<string, string> $images cid => dane PNG
 */
function send_mail(array $config, string $to, string $subject, string $html, string $text, string $replyTo, array $images = [], string $bcc = ''): bool
{
    $eol = "\r\n";
    $b64 = static fn(string $s): string => rtrim(chunk_split(base64_encode($s), 76, $eol));
    $alt = 'alt-' . bin2hex(random_bytes(8));
    $altPart = "--$alt$eol"
        . "Content-Type: text/plain; charset=UTF-8$eol"
        . "Content-Transfer-Encoding: base64$eol$eol" . $b64($text) . $eol
        . "--$alt$eol"
        . "Content-Type: text/html; charset=UTF-8$eol"
        . "Content-Transfer-Encoding: base64$eol$eol" . $b64($html) . $eol
        . "--$alt--$eol";

    if ($images) {
        $rel = 'rel-' . bin2hex(random_bytes(8));
        $contentType = "multipart/related; boundary=\"$rel\"";
        $body = "--$rel$eol" . "Content-Type: multipart/alternative; boundary=\"$alt\"$eol$eol" . $altPart;
        foreach ($images as $cid => $png) {
            $body .= "--$rel$eol"
                . "Content-Type: image/png; name=\"$cid.png\"$eol"
                . "Content-Transfer-Encoding: base64$eol"
                . "Content-ID: <$cid>$eol"
                . "Content-Disposition: inline; filename=\"$cid.png\"$eol$eol"
                . $b64($png) . $eol;
        }
        $body .= "--$rel--$eol";
    } else {
        $contentType = "multipart/alternative; boundary=\"$alt\"";
        $body = $altPart;
    }

    $from = $config['from_email'];
    $headers = implode($eol, [
        'From: ' . mb_encode_mimeheader($config['from_name'], 'UTF-8', 'B') . " <$from>",
        "Reply-To: $replyTo",
        ...($bcc !== '' && filter_var($bcc, FILTER_VALIDATE_EMAIL) ? ["Bcc: $bcc"] : []),
        'MIME-Version: 1.0',
        "Content-Type: $contentType",
        'X-Mailer: kalkulator-frontow',
    ]);
    return mail($to, mb_encode_mimeheader($subject, 'UTF-8', 'B'), $body, $headers, '-f' . $from);
}

$site = $config['site_url'];
$offerUrl = $offer !== '' ? $site . '#oferta=' . $offer . '&nr=' . rawurlencode($number) : '';
$sum = 0.0;
$unpriced = 0;
$pieces = 0;
foreach ($items as $it) {
    $pieces += $it['qty'];
    if ($it['total'] === null) {
        $unpriced++;
    } else {
        $sum += $it['total'];
    }
}
$sumText = zl($sum) . ($unpriced ? " + $unpriced poz. do ustalenia" : '');

// Mail do biura: krótki nagłówek z kontaktem, tabela pozycji, na dole cena za całość.
$images = [];
$cell = 'padding:6px 8px;border:1px solid #ddd;vertical-align:top';
$num2 = static fn(?float $v): string => $v === null ? '—' : number_format($v, 2, ',', ' ');
$cols = ['LP', 'Kod', 'Wysokość', 'Przedłużenia', 'Dekor', 'Ryflowanie', 'Bryła', 'Cena jedn.', 'Ilość', 'm²'];
$rows = '';
$textRows = '';
foreach ($items as $i => $it) {
    $lp = $i + 1;
    $values = [
        (string)$lp,
        $it['code'],
        $it['height'] !== null ? $it['height'] . ' mm' : '—',
        $it['ext'] !== '' ? $it['ext'] : '—',
        $it['finish'] !== '' ? $it['finish'] : '—',
        trim($it['fluting'] . ' ' . $it['flutingName']),
        $it['body'] ? 'TAK' : 'NIE',
        zl($it['unit']),
        $it['qty'] . ' szt.',
        $num2($it['area']),
    ];
    $rows .= '<tr>' . implode('', array_map(static fn($v, $k) => '<td style="' . $cell . ($k >= 7 ? ';text-align:right;white-space:nowrap' : '') . '">' . h($v) . '</td>', $values, array_keys($values))) . '</tr>';
    $textRows .= implode(' | ', $values) . "\n";
}

$who = $company !== '' ? $company : $email;
$contact = implode(' · ', array_filter([$company, $email, $phone, $notes !== '' ? "Uwagi: $notes" : '']));
$officeHtml = '<!doctype html><html><body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;color:#151515;font-size:13px">'
    . '<p style="margin:0 0 12px"><b>' . h($number) . '</b> · ' . h($date) . '<br>' . h($contact) . '</p>'
    . '<table style="border-collapse:collapse;font-size:13px">'
    . '<tr style="background:#f0ece2;text-align:left">' . implode('', array_map(static fn($c) => '<th style="' . $cell . '">' . h($c) . '</th>', $cols)) . '</tr>'
    . $rows
    . '<tr><td colspan="9" style="' . $cell . ';text-align:right;font-weight:bold">CENA ZA CAŁOŚĆ (netto)</td>'
    . '<td style="' . $cell . ';text-align:right;font-weight:bold;white-space:nowrap">' . h($sumText) . '</td></tr>'
    . '</table>'
    . ($offerUrl !== '' ? '<p style="margin:12px 0 0;font-size:12px"><a href="' . h($offerUrl) . '">Utwórz ofertę</a></p>' : '')
    . '</body></html>';

$officeText = "$number · $date\n$contact\n\n" . implode(' | ', $cols) . "\n$textRows\nCENA ZA CAŁOŚĆ (netto): $sumText\n"
    . ($offerUrl !== '' ? "\nUtwórz ofertę: $offerUrl\n" : '');

$sentOffice = send_mail($config, $config['office_email'], "Nowe zapytanie $number – $who", $officeHtml, $officeText, $email, $images);
if (!$sentOffice) {
    fail(500, "Nie udało się wysłać wiadomości (zapytanie zapisane jako $number).");
}

// Potwierdzenie dla klienta – bez cen, tylko kody (żadnych dowolnych tekstów z formularza).
$list = '';
$listText = '';
foreach ($items as $i => $it) {
    $line = ($i + 1) . '. ' . $it['code'] . ' ' . $it['fluting'] . ' – ' . $it['qty'] . ' szt.';
    $list .= '<li style="margin:2px 0">' . h($line) . '</li>';
    $listText .= "$line\n";
}
$clientHtml = '<!doctype html><html><body style="margin:0;padding:24px;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#151515">'
    . '<div style="max-width:620px;margin:0 auto;background:#fff;padding:24px">'
    . '<h1 style="margin:0 0 12px;font-size:20px">Dziękujemy – otrzymaliśmy zapytanie ' . h($number) . '</h1>'
    . '<p>Przygotujemy ofertę i prześlemy ją na ten adres, zwykle w ciągu 1–2 dni roboczych.</p>'
    . '<p style="background:#f6f1e4;padding:12px"><b>To nie jest zamówienie ani oferta.</b> Wiążącą cenę i termin podamy w ofercie przesłanej przez biuro.</p>'
    . '<p style="margin:16px 0 4px"><b>Pozycje w zapytaniu:</b></p><ul style="margin:0;padding-left:20px">' . $list . '</ul>'
    . '<p style="margin-top:20px">Pytania? Odpowiedz na tę wiadomość albo zadzwoń.</p>'
    . '<p style="color:#555;font-size:13px">Primo Meble</p>'
    . '</div></body></html>';
$clientText = "Dziękujemy – otrzymaliśmy zapytanie $number.\n\nPrzygotujemy ofertę i prześlemy ją na ten adres, zwykle w ciągu 1–2 dni roboczych.\n\n"
    . "To nie jest zamówienie ani oferta. Wiążącą cenę i termin podamy w ofercie przesłanej przez biuro.\n\n"
    . "Pozycje w zapytaniu:\n$listText\nPytania? Odpowiedz na tę wiadomość.\n\nPrimo Meble\n";

// Błąd potwierdzenia nie zatrzymuje zapytania – biuro już je ma.
// „Odpowiedz” u klienta → firmowa skrzynka (nigdy prywatny adres odbiorcy zapytań).
// Ukryta kopia do archiwum (config: archive_bcc) – wszystkie potwierdzenia widać w Gmailu.
send_mail($config, $email, "Otrzymaliśmy zapytanie $number – Primo Meble", $clientHtml, $clientText, $config['client_reply_to'] ?? $config['from_email'], [], (string)($config['archive_bcc'] ?? ''));

respond(200, ['ok' => true, 'number' => $number]);
