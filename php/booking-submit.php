<?php

declare(strict_types=1);

error_reporting(0);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=UTF-8');

const BOOKING_NOTIFICATION_SUBJECT = 'Neue Booking-Anfrage über melangea2.com';
const BOOKING_CONFIRMATION_SUBJECT = 'Ihre Booking-Anfrage bei Mélange à Deux';
const GENERIC_ERROR_MESSAGE = 'Die Booking-Anfrage konnte nicht übermittelt werden. Bitte versuchen Sie es später erneut oder schreiben Sie direkt an info@melangea2.com.';

function json_response(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function post_string(string $name): ?string
{
    if (!array_key_exists($name, $_POST) || is_array($_POST[$name])) {
        return null;
    }

    return clean_text((string) $_POST[$name]);
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
    return str_contains($value, "\r") || str_contains($value, "\n");
}

function html_escape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function format_plain_value(string $value): string
{
    return $value !== '' ? $value : 'Keine Angabe';
}

function utf8_subject(string $subject): string
{
    return '=?UTF-8?B?' . base64_encode($subject) . '?=';
}

function string_length(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function validate_max_length(string $fieldName, ?string $value, int $maxLength, array &$errors, string $message, bool $required = false): string
{
    if ($value === null) {
        if ($required || (array_key_exists($fieldName, $_POST) && is_array($_POST[$fieldName]))) {
            $errors[$fieldName] = $message;
        }

        return '';
    }

    if (string_length($value) > $maxLength) {
        $errors[$fieldName] = 'Bitte kürzen Sie diese Angabe.';
    }

    return $value;
}

function format_german_date(string $isoDate): ?string
{
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $isoDate)) {
        return null;
    }

    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $isoDate);
    $dateErrors = DateTimeImmutable::getLastErrors();

    if (!$date || ($dateErrors !== false && ($dateErrors['warning_count'] > 0 || $dateErrors['error_count'] > 0))) {
        return null;
    }

    return $date->format('d.m.Y');
}

function load_booking_config(): ?array
{
    $localPath = __DIR__ . '/booking-config.local.php';
    $examplePath = __DIR__ . '/booking-config.example.php';
    $configPath = is_file($localPath) ? $localPath : $examplePath;

    if (!is_file($configPath)) {
        return null;
    }

    $config = require $configPath;

    return is_array($config) ? $config : null;
}

function mail_from_header(string $fromName, string $fromEmail): string
{
    return sprintf('From: %s <%s>', utf8_subject(clean_header_value($fromName)), $fromEmail);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_response([
        'success' => false,
        'message' => 'Ungültige Anfrage.',
    ], 405);
    exit;
}

$honeypot = post_string('company');
if ($honeypot !== null && $honeypot !== '') {
    json_response([
        'success' => true,
        'message' => 'Vielen Dank. Ihre Booking-Anfrage wurde erfolgreich übermittelt. Eine Bestätigung wurde an Ihre E-Mail-Adresse gesendet.',
    ]);
    exit;
}

$config = load_booking_config();
if ($config === null) {
    json_response([
        'success' => false,
        'message' => GENERIC_ERROR_MESSAGE,
    ], 500);
    exit;
}

$errors = [];

$firstName = validate_max_length('first-name', post_string('first-name'), 80, $errors, 'Bitte geben Sie Ihren Vornamen an.', true);
$lastName = validate_max_length('last-name', post_string('last-name'), 80, $errors, 'Bitte geben Sie Ihren Nachnamen an.', true);
$emailRaw = $_POST['email'] ?? null;
$email = is_string($emailRaw) ? clean_header_value($emailRaw) : '';
$phone = validate_max_length('phone', post_string('phone'), 60, $errors, 'Bitte geben Sie eine gültige Telefonnummer an.');
$organization = validate_max_length('organization', post_string('organization'), 140, $errors, 'Bitte geben Sie eine gültige Organisation an.');
$eventType = validate_max_length('event-type', post_string('event-type'), 40, $errors, 'Bitte wählen Sie eine Veranstaltungsart aus.', true);
$preferredDate = validate_max_length('preferred-date', post_string('preferred-date'), 10, $errors, 'Bitte geben Sie ein gültiges Wunschdatum an.', true);
$performanceDate = validate_max_length('performance_date', post_string('performance_date'), 10, $errors, 'Bitte wählen Sie den gewünschten Veranstaltungstermin aus.', true);
$location = validate_max_length('location', post_string('location'), 140, $errors, 'Bitte geben Sie den Ort an.', true);
$audienceSizeRaw = validate_max_length('audience-size', post_string('audience-size'), 10, $errors, 'Bitte geben Sie eine gültige Publikumsgröße an.');
$message = validate_max_length('message', post_string('message'), 3000, $errors, 'Bitte geben Sie eine Nachricht zur Buchung an.', true);
$consent = isset($_POST['contact-consent']) && !is_array($_POST['contact-consent']);

foreach (['first-name' => $firstName, 'last-name' => $lastName, 'preferred-date' => $preferredDate, 'performance_date' => $performanceDate, 'location' => $location, 'message' => $message] as $field => $value) {
    if ($value === '') {
        $errors[$field] = $errors[$field] ?? 'Bitte füllen Sie dieses Pflichtfeld aus.';
    }
}

if ($emailRaw === null || is_array($emailRaw) || $email === '' || has_header_injection((string) $emailRaw) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Bitte geben Sie eine gültige E-Mail-Adresse an.';
}

$allowedEventTypes = ['concert-recital', 'festival-cultural-event', 'private-event', 'educational-special-program', 'other'];
if ($eventType === '' || !in_array($eventType, $allowedEventTypes, true)) {
    $errors['event-type'] = 'Bitte wählen Sie eine gültige Veranstaltungsart aus.';
}

$preferredDateGerman = format_german_date($preferredDate);
if ($preferredDateGerman === null) {
    $errors['preferred-date'] = 'Bitte geben Sie ein gültiges Wunschdatum an.';
    $preferredDateGerman = '';
}

$performanceDateGerman = format_german_date($performanceDate);
if ($performanceDateGerman === null) {
    $errors['performance_date'] = 'Bitte wählen Sie den gewünschten Veranstaltungstermin aus.';
    $performanceDateGerman = '';
}

if ($audienceSizeRaw !== '') {
    $audienceSize = filter_var($audienceSizeRaw, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($audienceSize === false) {
        $errors['audience-size'] = 'Bitte geben Sie eine gültige Publikumsgröße ab 1 an.';
    }
}

if (!$consent) {
    $errors['contact-consent'] = 'Bitte bestätigen Sie die Einwilligung zur Kontaktaufnahme.';
}

$recipientEmail = clean_header_value((string) ($config['recipient_email'] ?? ''));
$fromEmail = clean_header_value((string) ($config['from_email'] ?? ''));
$fromName = clean_header_value((string) ($config['from_name'] ?? 'Mélange à Deux Website'));

if (!filter_var($recipientEmail, FILTER_VALIDATE_EMAIL) || !filter_var($fromEmail, FILTER_VALIDATE_EMAIL) || has_header_injection($recipientEmail) || has_header_injection($fromEmail) || has_header_injection($fromName)) {
    json_response([
        'success' => false,
        'message' => GENERIC_ERROR_MESSAGE,
    ], 500);
    exit;
}

if (count($errors) > 0) {
    json_response([
        'success' => false,
        'message' => 'Bitte überprüfen Sie Ihre Angaben und füllen Sie alle Pflichtfelder korrekt aus.',
        'errors' => $errors,
    ], 422);
    exit;
}

$eventTypeLabels = [
    'concert-recital' => 'Konzert / Vortragsabend',
    'festival-cultural-event' => 'Festival / Kulturveranstaltung',
    'private-event' => 'Private Veranstaltung',
    'educational-special-program' => 'Vermittlungsformat / Sonderprogramm',
    'other' => 'Anderer Anlass',
];
$timestamp = (new DateTimeImmutable('now'))->format('d.m.Y H:i:s P');

$notificationBody = implode("\n", [
    'Neue Booking-Anfrage',
    '',
    'Vorname:',
    $firstName,
    '',
    'Nachname:',
    $lastName,
    '',
    'E-Mail:',
    $email,
    '',
    'Telefon:',
    format_plain_value($phone),
    '',
    'Organisation / Veranstaltungsort:',
    format_plain_value($organization),
    '',
    'Art der Veranstaltung:',
    $eventTypeLabels[$eventType] ?? $eventType,
    '',
    'Wunschtermin:',
    $preferredDateGerman,
    '',
    'Gewünschter Veranstaltungstermin:',
    $performanceDateGerman,
    '',
    'Ort / Stadt:',
    $location,
    '',
    'Geschätzte Publikumsgröße:',
    format_plain_value($audienceSizeRaw),
    '',
    'Nachricht / Angaben zur Buchung:',
    $message,
    '',
    'Einwilligung zur Kontaktaufnahme:',
    'Ja',
    '',
    'Quelle:',
    'Booking-Formular',
    '',
    'Zeitpunkt der Übermittlung:',
    $timestamp,
]);

$confirmationBody = implode("\n", [
    'Guten Tag ' . $firstName . ' ' . $lastName . ',',
    '',
    'vielen Dank für Ihre Booking-Anfrage und Ihr Interesse an Mélange à Deux.',
    '',
    'Wir haben Ihre Anfrage erhalten und melden uns persönlich bei Ihnen zurück. Da unsere Anfragen nicht automatisiert bearbeitet werden, bitten wir gegebenenfalls um etwas Geduld.',
    '',
    'Ihr gewünschter Termin:',
    $performanceDateGerman,
    '',
    'Freundliche Grüße',
    '',
    'Mélange à Deux & Amis',
    $recipientEmail,
]);

$commonHeaders = [
    mail_from_header($fromName, $fromEmail),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];

$notificationSent = mail(
    $recipientEmail,
    utf8_subject(BOOKING_NOTIFICATION_SUBJECT),
    $notificationBody,
    implode("\r\n", array_merge($commonHeaders, ['Reply-To: ' . $email]))
);

if (!$notificationSent) {
    json_response([
        'success' => false,
        'message' => GENERIC_ERROR_MESSAGE,
    ], 500);
    exit;
}

$confirmationSent = mail(
    $email,
    utf8_subject(BOOKING_CONFIRMATION_SUBJECT),
    $confirmationBody,
    implode("\r\n", array_merge($commonHeaders, ['Reply-To: ' . $recipientEmail]))
);

if (!$confirmationSent) {
    json_response([
        'success' => false,
        'message' => GENERIC_ERROR_MESSAGE,
    ], 500);
    exit;
}

json_response([
    'success' => true,
    'message' => 'Vielen Dank. Ihre Booking-Anfrage wurde erfolgreich übermittelt. Eine Bestätigung wurde an Ihre E-Mail-Adresse gesendet.',
]);
