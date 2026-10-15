<?php
// Wysyłka gotowej wyceny do klienta – przycisk „Wyślij wycenę klientowi” z maila wewnętrznego.
// GET pokazuje stronę z potwierdzeniem (skanery linków w poczcie niczego przypadkiem nie wyślą),
// dopiero POST z tej strony wysyła wycenę. Dostęp tylko z tajnym kluczem zapisanym przy zapytaniu.

declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'");

define('KALKULATOR', true);
$config = require __DIR__ . '/config.php';
require __DIR__ . '/lib.php';

function page(string $title, string $body, int $status = 200): never
{
    http_response_code($status);
    echo '<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<meta name="robots" content="noindex, nofollow"><title>' . h($title) . '</title></head>'
        . '<body style="margin:0;padding:24px 12px;background:#f2f1ee;font-family:Arial,Helvetica,sans-serif;color:#151515">'
        . '<div style="max-width:640px;margin:0 auto 20px;background:#fff;padding:24px 28px">'
        . '<div style="font-size:12px;letter-spacing:.12em;color:#b08a3e;font-weight:bold;margin-bottom:8px">PRIMO MEBLE · KALKULATOR</div>'
        . $body . '</div></body></html>';
    exit;
}

$nr = (string)($_REQUEST['nr'] ?? '');
$token = (string)($_REQUEST['t'] ?? '');
$rec = preg_match('/^[a-f0-9]{32}$/', $token) ? load_record($config, $nr) : null;
if ($rec === null || !isset($rec['token']) || !hash_equals((string)$rec['token'], $token)) {
    page('Nie znaleziono', '<h1 style="font-size:20px">Nie znaleziono zapytania</h1><p>Link jest nieprawidłowy albo niekompletny.</p>', 404);
}

$number = $rec['number'];
$email = (string)$rec['contact']['email'];
$client = (string)$rec['contact']['company'];
$sent = is_array($rec['sentToClient'] ?? null) ? $rec['sentToClient'] : [];
[$subject, $html, $text, $card] = client_quote($config, $rec);

$form = static function (string $label, bool $again) use ($nr, $token): string {
    return '<form method="post" style="margin:20px 0 4px">'
        . '<input type="hidden" name="nr" value="' . h($nr) . '"><input type="hidden" name="t" value="' . h($token) . '">'
        . ($again ? '<input type="hidden" name="again" value="1">' : '')
        . '<button type="submit" style="border:0;cursor:pointer;background:#edc880;color:#151515;font-weight:bold;font-size:14px;letter-spacing:.08em;padding:14px 28px">'
        . h($label) . '</button></form>';
};

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    if ($sent && empty($_POST['again'])) {
        page('Już wysłano', '<h1 style="font-size:20px">Wycena ' . h($number) . ' była już wysłana</h1>'
            . '<p>Ostatnio: ' . h(end($sent)) . ' na ' . h($email) . '.</p>' . $form('WYŚLIJ PONOWNIE', true));
    }
    if (!send_mail($config, $email, $subject, $html, $text, $config['client_reply_to'] ?? $config['from_email'])) {
        page('Błąd', '<h1 style="font-size:20px">Nie udało się wysłać wyceny</h1><p>Spróbuj ponownie za chwilę.</p>' . $form('SPRÓBUJ PONOWNIE', !empty($sent)), 500);
    }
    $rec['sentToClient'][] = date('d.m.Y H:i');
    save_record($config, $rec);
    page('Wysłano', '<h1 style="font-size:20px">Wysłano wycenę ' . h($number) . '</h1>'
        . '<p>Wycena poszła do <b>' . h($client) . '</b> na adres <b>' . h($email) . '</b>.</p>'
        . '<p style="color:#8a8780;font-size:13px">Odpowiedź klienta przyjdzie na ' . h($config['client_reply_to']) . '.</p>');
}

// GET: podgląd i potwierdzenie.
$info = $sent
    ? '<p style="background:#fbf6ea;padding:10px 12px;font-size:13px">Ta wycena była już wysłana: ' . h(implode(', ', $sent)) . '.</p>'
    : '';
page("Wyślij wycenę $number", '<h1 style="font-size:20px;margin:0 0 8px">Wysłać wycenę ' . h($number) . ' klientowi?</h1>'
    . '<p style="margin:0">Do: <b>' . h($client) . '</b> &lt;' . h($email) . '&gt;</p>'
    . $info . $form($sent ? 'WYŚLIJ PONOWNIE' : 'WYŚLIJ WYCENĘ', (bool)$sent)
    . '<p style="color:#8a8780;font-size:12px;margin:12px 0 0">Poniżej dokładnie to, co dostanie klient.</p></div>'
    . '<div style="max-width:640px;margin:0 auto">' . $card);
