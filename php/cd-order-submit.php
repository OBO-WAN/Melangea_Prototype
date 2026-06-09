<?php

declare(strict_types=1);

const CD_ORDER_SUBJECT = 'CD-Bestellung Mélange à Deux';

$configPath = __DIR__ . '/cd-order-config.local.php';
if (!is_file($configPath)) {
    $configPath = __DIR__ . '/cd-order-config.example.php';
}

$config = require $configPath;

function wants_json_response(): bool
{
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    $requestedWith = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';

    return stripos($accept, 'application/json') !== false || strtolower($requestedWith) === 'fetch';
}

function clean_text(string $value): string
{
    $value = trim($value);
    $value = str_replace(["\r\n", "\r"], "\n", $value);

    return preg_replace('/[^\P{C}\n\t]+/u', '', $value) ?? '';
}

function clean_header_value(string $value): string
{
    return trim(str_replace(["\r", "\n"], '', $value));
}

function has_header_injection(string $value): bool
{
    return strpos($value, "\r") !== false || strpos($value, "\n") !== false;
}

function html_escape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function utf8_subject(string $subject): string
{
    return '=?UTF-8?B?' . base64_encode($subject) . '?=';
}

function send_response(array $payload, int $statusCode, bool $wantsJson): void
{
    http_response_code($statusCode);

    if ($wantsJson) {
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return;
    }

    header('Content-Type: text/html; charset=UTF-8');
    $title = !empty($payload['success']) ? 'CD-Bestellung erhalten' : 'CD-Bestellung konnte nicht verarbeitet werden';
    $message = (string) ($payload['message'] ?? '');
    $errors = $payload['errors'] ?? [];

    echo '<!doctype html><html lang="de"><head><meta charset="utf-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
    echo '<title>' . html_escape($title) . '</title>';
    echo '<style>body{margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#111526;color:#e9ecf1;line-height:1.6}main{max-width:720px;margin:10vh auto;padding:2rem}a{color:#2ee59d}.box{border:1px solid rgba(255,255,255,.12);border-radius:24px;background:rgba(255,255,255,.04);padding:2rem}</style>';
    echo '</head><body><main><div class="box">';
    echo '<h1>' . html_escape($title) . '</h1>';
    echo '<p>' . html_escape($message) . '</p>';

    if (is_array($errors) && count($errors) > 0) {
        echo '<ul>';
        foreach ($errors as $error) {
            echo '<li>' . html_escape((string) $error) . '</li>';
        }
        echo '</ul>';
    }

    echo '<p><a href="../index.html#shop">Zurück zur Website</a></p>';
    echo '</div></main></body></html>';
}

$wantsJson = wants_json_response();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    send_response([
        'success' => false,
        'message' => 'Diese CD-Bestellung kann nur per Formular abgesendet werden.',
        'errors' => ['Ungültige Anfrage.'],
    ], 405, $wantsJson);
    exit;
}

$honeypot = trim((string) ($_POST['website'] ?? ''));
if ($honeypot !== '') {
    send_response([
        'success' => false,
        'message' => 'Die Bestellung konnte nicht verarbeitet werden.',
        'errors' => ['Bitte versuchen Sie es erneut.'],
    ], 400, $wantsJson);
    exit;
}

$firstName = clean_text((string) ($_POST['first_name'] ?? ''));
$lastName = clean_text((string) ($_POST['last_name'] ?? ''));
$emailRaw = (string) ($_POST['email'] ?? '');
$email = clean_header_value($emailRaw);
$street = clean_text((string) ($_POST['street'] ?? ''));
$postalCode = clean_text((string) ($_POST['postal_code'] ?? ''));
$city = clean_text((string) ($_POST['city'] ?? ''));
$cdTitle = clean_text((string) ($_POST['cd-title'] ?? ''));
$quantityRaw = trim((string) ($_POST['quantity'] ?? ''));
$format = clean_text((string) ($_POST['format'] ?? ''));
$wishes = clean_text((string) ($_POST['wishes'] ?? ''));
$consent = isset($_POST['consent']);

$errors = [];

if ($firstName === '') {
    $errors[] = 'Bitte geben Sie Ihren Vornamen an.';
}

if ($lastName === '') {
    $errors[] = 'Bitte geben Sie Ihren Nachnamen an.';
}

if ($email === '' || has_header_injection($emailRaw) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Bitte geben Sie eine gültige Absender-E-Mail-Adresse an.';
}

if ($street === '') {
    $errors[] = 'Bitte geben Sie Straße und Hausnummer an.';
}

if ($postalCode === '') {
    $errors[] = 'Bitte geben Sie die PLZ an.';
}

if ($city === '') {
    $errors[] = 'Bitte geben Sie den Ort an.';
}

if ($cdTitle !== 'Le Début') {
    $errors[] = 'Bitte wählen Sie die CD „Le Début“ aus.';
}

$quantity = filter_var($quantityRaw, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
if ($quantity === false) {
    $errors[] = 'Bitte geben Sie eine gültige Anzahl ab 1 an.';
}

$allowedFormats = ['CD', 'Digitaler Download'];
if (!in_array($format, $allowedFormats, true)) {
    $errors[] = 'Bitte wählen Sie ein gültiges Format aus.';
}

if (!$consent) {
    $errors[] = 'Bitte bestätigen Sie die Einwilligung zur Bearbeitung Ihrer CD-Bestellung.';
}

$recipientEmail = clean_header_value((string) ($config['recipient_email'] ?? 'info@melangea2.com'));
$fromEmail = clean_header_value((string) ($config['from_email'] ?? 'info@melangea2.com'));
$bankAccountName = clean_text((string) ($config['bank_account_name'] ?? 'Uwe Hanewald'));
$bankIban = clean_text((string) ($config['bank_iban'] ?? 'IBAN_HIER_EINTRAGEN'));
$cdPrice = clean_text((string) ($config['cd_price_eur'] ?? '15'));
$shipping = clean_text((string) ($config['shipping_eur'] ?? '3'));

if (!filter_var($recipientEmail, FILTER_VALIDATE_EMAIL) || !filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Die Bestellkonfiguration ist unvollständig. Bitte kontaktieren Sie Mélange à Deux direkt.';
}

if (count($errors) > 0) {
    send_response([
        'success' => false,
        'message' => 'Bitte prüfen Sie Ihre Angaben.',
        'errors' => $errors,
    ], 422, $wantsJson);
    exit;
}

$timestamp = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s P');
$wishesForMail = $wishes !== '' ? $wishes : 'Keine Angabe';

$notificationBody = implode("\n", [
    CD_ORDER_SUBJECT,
    '',
    'Vorname:',
    $firstName,
    '',
    'Nachname:',
    $lastName,
    '',
    'Absender-E-Mail:',
    $email,
    '',
    'Versandadresse:',
    'Straße und Hausnummer:',
    $street,
    'PLZ:',
    $postalCode,
    'Ort:',
    $city,
    '',
    'CD:',
    $cdTitle,
    '',
    'Anzahl:',
    (string) $quantity,
    '',
    'Format:',
    $format,
    '',
    'Weitere Wünsche:',
    $wishesForMail,
    '',
    'Zeitpunkt:',
    $timestamp,
]);

if ($format === 'Digitaler Download') {
    $confirmationMiddle = implode("\n", [
        'Wir melden uns zeitnah mit weiteren Informationen zur Zahlung und zum digitalen Download.',
        '',
        'Bitte überweisen Sie den Betrag erst nach unserer weiteren Rückmeldung.',
    ]);
} else {
    $confirmationMiddle = implode("\n", [
        'Bitte überweisen Sie pro CD ' . $cdPrice . ' Euro zzgl. einmalig ' . $shipping . ' Euro Versandkosten an:',
        '',
        $bankAccountName,
        'IBAN: ' . $bankIban,
        '',
        'Nach Gutschrift werden wir Ihnen die gewünschte CD bzw. die gewünschten CDs umgehend zusenden.',
    ]);
}

$confirmationBody = implode("\n", [
    'Wir haben Ihre E-Mail erhalten und bedanken uns für Ihre Bestellung.',
    '',
    'Ihre Angaben:',
    'Vorname: ' . $firstName,
    'Nachname: ' . $lastName,
    'Absender-E-Mail: ' . $email,
    'Versandadresse:',
    'Straße und Hausnummer:',
    $street,
    'PLZ:',
    $postalCode,
    'Ort:',
    $city,
    'CD: ' . $cdTitle,
    'Anzahl: ' . (string) $quantity,
    'Format: ' . $format,
    'Weitere Wünsche: ' . $wishesForMail,
    '',
    $confirmationMiddle,
    '',
    'Herzliche Grüße',
    'Mélange à Deux & Amis',
]);

$commonHeaders = [
    'From: ' . $fromEmail,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
];

$notificationHeaders = array_merge($commonHeaders, [
    'Reply-To: ' . $email,
]);

$confirmationHeaders = array_merge($commonHeaders, [
    'Reply-To: ' . $recipientEmail,
]);

$notificationSent = mail(
    $recipientEmail,
    utf8_subject(CD_ORDER_SUBJECT),
    $notificationBody,
    implode("\r\n", $notificationHeaders)
);

$confirmationSent = mail(
    $email,
    utf8_subject('Bestätigung Ihrer CD-Bestellung'),
    $confirmationBody,
    implode("\r\n", $confirmationHeaders)
);

if (!$notificationSent || !$confirmationSent) {
    send_response([
        'success' => false,
        'message' => 'Ihre Bestellung konnte leider nicht per E-Mail versendet werden. Bitte schreiben Sie direkt an info@melangea2.com.',
        'errors' => ['Der Mailversand wurde vom Server nicht bestätigt.'],
    ], 500, $wantsJson);
    exit;
}

send_response([
    'success' => true,
    'message' => 'Vielen Dank! Ihre CD-Bestellung wurde übermittelt. Sie erhalten in Kürze eine Bestätigung per E-Mail.',
], 200, $wantsJson);
