<?php
// Zapytanie o wycenę z kalkulatora frontów giętych.
// 1) sprawdza dane, 2) nadaje numer ZP/RRRR/NNNN, 3) zapisuje zapytanie (z tajnym kluczem wysyłki),
// 4) wysyła do biura mail wewnętrzny: dane klienta, podgląd wyceny i przycisk „Wyślij wycenę klientowi”,
// 5) wysyła klientowi potwierdzenie przyjęcia BEZ cen („to nie jest zamówienie”).
// Gotową wycenę klient dostaje dopiero po kliknięciu przycisku przez biuro (wyslij-wycene.php).
// Odpowiedź: JSON { ok: true, number } albo { ok: false, message }.

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

define('KALKULATOR', true);
$config = require __DIR__ . '/config.php';
require __DIR__ . '/lib.php';

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
if ($company === '') {
    fail(400, 'Podaj imię i nazwisko albo nazwę firmy.');
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
    ];
}

$offer = (string)($in['offer'] ?? '');
if (!preg_match('/^[A-Za-z0-9_-]{1,30000}$/', $offer)) {
    $offer = '';
}

// ---------- Katalog danych, limit, numer ----------

try {
    $dataDir = data_dir($config);
} catch (RuntimeException $e) {
    fail(500, $e->getMessage());
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

// Zapytanie zapisane na serwerze – z niego biuro wysyła wycenę klientowi (tajny klucz w linku).
$token = bin2hex(random_bytes(16));
$record = [
    'number' => $number,
    'date' => date('c'),
    'contact' => compact('phone', 'email', 'company', 'notes'),
    'items' => $items,
    'offer' => $offer,
    'token' => $token,
    'sentToClient' => [],
];
try {
    save_record($config, $record);
} catch (RuntimeException $e) {
    fail(500, $e->getMessage());
}

// ---------- Mail wewnętrzny do biura ----------

[, , $quoteText, $quoteCard] = client_quote($config, $record);
$sendUrl = $config['site_url'] . 'api/wyslij-wycene.php?nr=' . rawurlencode($fileId) . '&t=' . $token;
$telHref = 'tel:' . preg_replace('/[^0-9+]/', '', $phone);
$label = 'color:#8a8780;padding:3px 24px 3px 0;vertical-align:top';
$officeHtml = email_document(
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;margin:0 auto 20px">'
    . '<tr><td style="padding:22px 28px 6px;font-size:12px;letter-spacing:.1em;color:#8a8780;font-weight:bold">NOWE ZAPYTANIE ' . h($number) . ' · ' . h($date) . '</td></tr>'
    . '<tr><td style="padding:6px 28px 4px"><table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6">'
    . '<tr><td style="' . $label . '">Klient:</td><td><b>' . h($company) . '</b></td></tr>'
    . '<tr><td style="' . $label . '">Mail:</td><td><a href="mailto:' . h($email) . '" style="color:#151515">' . h($email) . '</a></td></tr>'
    . '<tr><td style="' . $label . '">Tel:</td><td><a href="' . h($telHref) . '" style="color:#151515">' . h($phone) . '</a></td></tr>'
    . '</table></td></tr>'
    . '<tr><td style="padding:16px 28px 24px">'
    . '<a href="' . h($sendUrl) . '" style="display:inline-block;background:#edc880;color:#151515;text-decoration:none;font-weight:bold;font-size:14px;letter-spacing:.08em;padding:14px 28px">WYŚLIJ WYCENĘ KLIENTOWI</a>'
    . '<div style="font-size:12px;color:#8a8780;margin-top:8px">Otworzy się strona z potwierdzeniem – wycena pójdzie na ' . h($email) . '. Poniżej podgląd tego, co dostanie klient.</div>'
    . '</td></tr></table>'
    . $quoteCard
);
$officeText = "NOWE ZAPYTANIE $number ($date)\n\nKlient: $company\nMail: $email\nTel: $phone\n\n"
    . "Wyślij wycenę klientowi: $sendUrl\n\n--- Podgląd wyceny dla klienta ---\n\n$quoteText";

if (!send_mail($config, $config['office_email'], "Zapytanie $number – $company", $officeHtml, $officeText, $email)) {
    fail(500, "Nie udało się wysłać wiadomości (zapytanie zapisane jako $number).");
}

// ---------- Potwierdzenie przyjęcia dla klienta (bez cen) ----------

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
    . '<p>Przygotujemy wycenę i prześlemy ją na ten adres, zwykle w ciągu 1–2 dni roboczych.</p>'
    . '<p style="background:#f6f1e4;padding:12px"><b>To nie jest zamówienie ani oferta.</b> Wiążącą cenę i termin podamy w wycenie przesłanej przez biuro.</p>'
    . '<p style="margin:16px 0 4px"><b>Pozycje w zapytaniu:</b></p><ul style="margin:0;padding-left:20px">' . $list . '</ul>'
    . '<p style="margin-top:20px">Pytania? Odpowiedz na tę wiadomość albo zadzwoń: ' . OFFICE_PHONE . '.</p>'
    . '<p style="color:#555;font-size:13px">Primo Meble</p>'
    . '</div></body></html>';
$clientText = "Dziękujemy – otrzymaliśmy zapytanie $number.\n\nPrzygotujemy wycenę i prześlemy ją na ten adres, zwykle w ciągu 1–2 dni roboczych.\n\n"
    . "To nie jest zamówienie ani oferta. Wiążącą cenę i termin podamy w wycenie przesłanej przez biuro.\n\n"
    . "Pozycje w zapytaniu:\n$listText\nPytania? Odpowiedz na tę wiadomość albo zadzwoń: " . OFFICE_PHONE . ".\n\nPrimo Meble\n";

// Błąd potwierdzenia nie zatrzymuje zapytania – biuro już je ma. Potwierdzenie idzie tylko do klienta.
send_mail($config, $email, "Otrzymaliśmy zapytanie $number – Primo Meble", $clientHtml, $clientText, $config['client_reply_to'] ?? $config['from_email']);

respond(200, ['ok' => true, 'number' => $number]);
