<?php
// Wspólne funkcje skryptów kalkulatora: poczta, zapis zapytań, szablon wyceny dla klienta.
// Plik dołączany – bez bezpośredniego dostępu z przeglądarki.

declare(strict_types=1);

if (!defined('KALKULATOR')) {
    http_response_code(404);
    exit;
}

const OFFICE_PHONE = '691-766-559';
const OFFICE_PHONE_HREF = 'tel:+48691766559';
const VAT_RATE = 0.23;

function h(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function pln(float $v): string
{
    return number_format($v, 0, ',', ' ') . ' PLN';
}

function data_dir(array $config): string
{
    $dataDir = rtrim($config['data_dir'], '/');
    foreach ([$dataDir, "$dataDir/zapytania", "$dataDir/limit"] as $dir) {
        if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
            throw new RuntimeException('Błąd serwera (katalog danych).');
        }
    }
    if (!is_file("$dataDir/.htaccess")) {
        file_put_contents("$dataDir/.htaccess", "Require all denied\nDeny from all\n");
    }
    return $dataDir;
}

/** Ścieżka pliku zapytania z numeru (ZP/2026/0012 lub ZP-2026-0012) – tylko bezpieczne znaki. */
function record_path(array $config, string $number): ?string
{
    $id = str_replace('/', '-', $number);
    if (!preg_match('/^[A-Z]{1,5}-\d{4}-\d{4,6}$/', $id)) {
        return null;
    }
    return data_dir($config) . "/zapytania/$id.json";
}

function load_record(array $config, string $number): ?array
{
    $path = record_path($config, $number);
    if ($path === null || !is_file($path)) {
        return null;
    }
    $rec = json_decode((string)file_get_contents($path), true);
    return is_array($rec) ? $rec : null;
}

function save_record(array $config, array $rec): void
{
    $path = record_path($config, $rec['number']);
    if ($path === null) {
        throw new RuntimeException('Nieprawidłowy numer zapytania.');
    }
    file_put_contents($path, json_encode($rec, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
}

/** Wysyła mail HTML + tekst. */
function send_mail(array $config, string $to, string $subject, string $html, string $text, string $replyTo): bool
{
    $eol = "\r\n";
    $b64 = static fn(string $s): string => rtrim(chunk_split(base64_encode($s), 76, $eol));
    $alt = 'alt-' . bin2hex(random_bytes(8));
    $body = "--$alt$eol"
        . "Content-Type: text/plain; charset=UTF-8$eol"
        . "Content-Transfer-Encoding: base64$eol$eol" . $b64($text) . $eol
        . "--$alt$eol"
        . "Content-Type: text/html; charset=UTF-8$eol"
        . "Content-Transfer-Encoding: base64$eol$eol" . $b64($html) . $eol
        . "--$alt--$eol";
    $from = $config['from_email'];
    $headers = implode($eol, [
        'From: ' . mb_encode_mimeheader($config['from_name'], 'UTF-8', 'B') . " <$from>",
        "Reply-To: $replyTo",
        'MIME-Version: 1.0',
        "Content-Type: multipart/alternative; boundary=\"$alt\"",
        'X-Mailer: kalkulator-frontow',
    ]);
    return mail($to, mb_encode_mimeheader($subject, 'UTF-8', 'B'), $body, $headers, '-f' . $from);
}

/** Suma netto (null, gdy któraś pozycja nie ma ceny). */
function record_sum(array $rec): ?float
{
    $sum = 0.0;
    foreach ($rec['items'] as $it) {
        if (($it['total'] ?? null) === null) {
            return null;
        }
        $sum += (float)$it['total'];
    }
    return $sum;
}

/** Link „Odpowiedz i potwierdź” – gotowa wiadomość do biura. */
function accept_mailto(array $config, array $rec): string
{
    $number = $rec['number'];
    $sum = record_sum($rec);
    $amount = $sum === null ? '' : ' na kwotę ' . pln($sum) . ' netto (' . pln(round($sum * (1 + VAT_RATE))) . ' brutto)';
    $body = "Dzień dobry,\n\n"
        . "potwierdzam wycenę nr $number$amount i proszę o przygotowanie zamówienia "
        . "oraz informację o zadatku i terminie realizacji.\n\n"
        . "Pozdrawiam\n" . ($rec['contact']['company'] ?? '') . "\n";
    return 'mailto:' . $config['client_reply_to']
        . '?subject=' . rawurlencode("Potwierdzam wycenę $number")
        . '&body=' . rawurlencode($body);
}

/** Wycena dla klienta: [temat, html, tekst, sama karta wyceny do podglądu]. */
function client_quote(array $config, array $rec): array
{
    $number = $rec['number'];
    $notes = (string)($rec['contact']['notes'] ?? '');
    $sum = record_sum($rec);
    $hasLaminate = false;
    $th = 'padding:9px 8px;font-size:11px;letter-spacing:.06em;text-align:left';
    $td = 'padding:10px 8px;border-bottom:1px solid #e6e3dc;vertical-align:top';
    $rows = '';
    $textRows = '';
    foreach ($rec['items'] as $i => $it) {
        $lp = $i + 1;
        $finish = (string)($it['finish'] ?? '');
        $laminate = str_starts_with($finish, 'Laminat');
        $hasLaminate = $hasLaminate || $laminate;
        // Dekor po stronie klienta: w tabeli tylko gwiazdka, wyjaśnienie pod sumą.
        $finish = (string)preg_replace('/\s*\(koszt laminatu po stronie klienta\)$/u', '', $finish);
        $height = isset($it['height']) && $it['height'] !== null ? $it['height'] . ' mm' : '—';
        $rows .= '<tr>'
            . '<td style="' . $td . '">' . $lp . '</td>'
            . '<td style="' . $td . '"><b>' . h($it['code']) . '</b></td>'
            . '<td style="' . $td . ';white-space:nowrap">' . h($height) . '</td>'
            . '<td style="' . $td . '">' . h($finish !== '' ? $finish : '—') . ($laminate ? '&nbsp;<sup style="color:#b08a3e">*</sup>' : '') . '</td>'
            . '<td style="' . $td . '">' . h($it['fluting']) . '</td>'
            . '<td style="' . $td . '">' . (!empty($it['body']) ? 'TAK' : 'NIE') . '</td>'
            . '<td style="' . $td . ';text-align:right;white-space:nowrap">' . (int)$it['qty'] . '&nbsp;szt.</td>'
            . '</tr>';
        $textRows .= "$lp | {$it['code']} | $height | $finish" . ($laminate ? ' *' : '') . " | {$it['fluting']} | "
            . (!empty($it['body']) ? 'TAK' : 'NIE') . " | {$it['qty']} szt.\n";
    }

    $sumHtml = $sum === null
        ? '<div style="font-size:15px">Suma NETTO: <b style="font-size:20px">do ustalenia</b></div>'
        : '<div style="font-size:15px">Suma NETTO: <b style="font-size:20px">' . h(pln($sum)) . '</b></div>'
          . '<div style="font-size:13px;color:#8a8780;margin-top:2px">+23% VAT · brutto ' . h(pln(round($sum * (1 + VAT_RATE)))) . '</div>';
    $btn = 'display:inline-block;text-decoration:none;font-weight:bold;font-size:13px;letter-spacing:.08em;padding:14px 22px;white-space:nowrap';

    $card = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;margin:0 auto">'
        . '<tr><td style="background:#151515;padding:18px 28px">'
        . '<span style="color:#edc880;font-size:13px;letter-spacing:.12em;font-weight:bold">PRIMO MEBLE</span>'
        . '<span style="color:#a9a8a0;font-size:13px;float:right">Wycena nr ' . h($number) . '</span></td></tr>'
        . '<tr><td style="padding:28px 28px 4px;font-size:15px;line-height:1.6">Dzień dobry,<br>'
        . 'przesyłamy wycenę frontów giętych przygotowaną na podstawie Państwa zapytania.</td></tr>'
        . ($notes !== '' ? '<tr><td style="padding:12px 28px 4px"><div style="font-size:11px;letter-spacing:.1em;color:#8a8780;font-weight:bold">PAŃSTWA UWAGI</div>'
            . '<div style="font-size:14px;line-height:1.5;padding:8px 12px;margin-top:6px;background:#f7f5ef;border-left:3px solid #edc880">' . nl2br(h($notes)) . '</div></td></tr>' : '')
        . '<tr><td style="padding:24px 28px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse">'
        . '<tr style="background:#151515;color:#ffffff">'
        . '<th style="' . $th . '">LP</th><th style="' . $th . '">PRODUKT</th><th style="' . $th . '">H</th><th style="' . $th . '">WYGLĄD</th>'
        . '<th style="' . $th . '">RYFLOWANIE</th><th style="' . $th . '">BRYŁA</th><th style="' . $th . ';text-align:right">ILOŚĆ</th></tr>'
        . $rows . '</table></td></tr>'
        . '<tr><td style="padding:18px 28px 0;text-align:right">' . $sumHtml . '</td></tr>'
        . ($hasLaminate ? '<tr><td style="padding:16px 28px 0"><div style="font-size:12px;line-height:1.5;color:#6b5a33;background:#fbf6ea;padding:10px 12px">'
            . '<b>*</b> Dekor laminatu po stronie klienta – koszt laminatu nie jest wliczony w cenę.</div></td></tr>' : '')
        . '<tr><td style="padding:28px 20px 32px" align="center">'
        . '<table role="presentation" cellpadding="0" cellspacing="0"><tr>'
        . '<td style="padding:4px 6px"><a href="' . h(accept_mailto($config, $rec)) . '" style="' . $btn . ';background:#edc880;color:#151515">ODPOWIEDZ I POTWIERDŹ</a></td>'
        . '<td style="padding:4px 6px"><a href="' . OFFICE_PHONE_HREF . '" style="' . $btn . ';background:#151515;color:#edc880">ZADZWOŃ ' . OFFICE_PHONE . '</a></td>'
        . '</tr></table></td></tr>'
        . '<tr><td style="background:#151515;padding:20px 28px;color:#a9a8a0;font-size:12px;line-height:1.6">'
        . '<span style="color:#edc880;font-weight:bold;letter-spacing:.1em">PRIMO MEBLE</span><br>'
        . 'Primo Duda Krzysztof, Marek Skiba s.c. · ul. Michała Glinki 7, 41-905 Bytom<br>'
        . 'NIP 6262940701 · tel. ' . OFFICE_PHONE . ' · <a href="https://www.primomeble.pl" style="color:#a9a8a0">www.primomeble.pl</a></td></tr>'
        . '</table>';
    $html = email_document($card);

    $text = "PRIMO MEBLE – Wycena nr $number\n\nDzień dobry,\nprzesyłamy wycenę frontów giętych przygotowaną na podstawie Państwa zapytania.\n"
        . ($notes !== '' ? "\nPaństwa uwagi: $notes\n" : '')
        . "\nLP | PRODUKT | H | WYGLĄD | RYFLOWANIE | BRYŁA | ILOŚĆ\n$textRows\n"
        . ($sum === null ? "Suma NETTO: do ustalenia\n" : 'Suma NETTO: ' . pln($sum) . "\n+23% VAT · brutto " . pln(round($sum * (1 + VAT_RATE))) . "\n")
        . ($hasLaminate ? "\n* Dekor laminatu po stronie klienta – koszt laminatu nie jest wliczony w cenę.\n" : '')
        . "\nAby potwierdzić wycenę, odpowiedz na tę wiadomość lub zadzwoń: " . OFFICE_PHONE . ".\n"
        . "\nPRIMO MEBLE · Primo Duda Krzysztof, Marek Skiba s.c. · ul. Michała Glinki 7, 41-905 Bytom · NIP 6262940701 · www.primomeble.pl\n";

    return ["Wycena nr $number – Primo Meble", $html, $text, $card];
}

/** Dokument maila: tło i wyśrodkowana treść. */
function email_document(string $inner): string
{
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>'
        . '<body style="margin:0;padding:24px 12px;background:#f2f1ee;font-family:Arial,Helvetica,sans-serif;color:#151515">'
        . $inner . '</body></html>';
}
