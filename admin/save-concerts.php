<?php

declare(strict_types=1);

require __DIR__ . '/auth.php';
require_authentication();

const ALLOWED_STATUSES = ['upcoming', 'past', 'cancelled'];

function show_error(string $message): void
{
    http_response_code(400);
    ?>
    <!doctype html>
    <html lang="de">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="robots" content="noindex, nofollow">
      <title>Fehler beim Speichern | Mélange à Deux &amp; Amis</title>
      <link rel="stylesheet" href="admin.css">
    </head>
    <body class="admin-page admin-page--login">
      <main class="admin-login" aria-labelledby="error-title">
        <h1 id="error-title">Speichern nicht möglich</h1>
        <p class="admin-message admin-message--error"><?= escape_html($message) ?></p>
        <p><a class="admin-link" href="index.php">Zurück zur Konzertverwaltung</a></p>
      </main>
    </body>
    </html>
    <?php
    exit;
}

function clean_text($value): string
{
    $text = is_scalar($value) ? (string) $value : '';
    $text = trim($text);
    $text = strip_tags($text);

    return preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text) ?? '';
}

function normalize_german_date(string $date): ?string
{
    $date = trim($date);

    if (preg_match('/^(\d{2})\.(\d{2})\.(\d{4})$/', $date, $matches)) {
        if (checkdate((int) $matches[2], (int) $matches[1], (int) $matches[3])) {
            return $date;
        }

        return null;
    }

    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $matches)) {
        if (checkdate((int) $matches[2], (int) $matches[3], (int) $matches[1])) {
            return $matches[3] . '.' . $matches[2] . '.' . $matches[1];
        }
    }

    return null;
}

function is_valid_time(string $time): bool
{
    return preg_match('/^([01]\d|2[0-3]):[0-5]\d Uhr$/', $time) === 1;
}

function starts_with_text(string $value, string $prefix): bool
{
    return strncmp($value, $prefix, strlen($prefix)) === 0;
}

function is_valid_admin_url(string $url): bool
{
    if ($url === '' || $url === '#') {
        return true;
    }

    if (preg_match('/[\x00-\x20\x7F]/', $url)) {
        return false;
    }

    if (starts_with_text($url, '//')) {
        return false;
    }

    if (starts_with_text($url, 'https://')) {
        return filter_var($url, FILTER_VALIDATE_URL) !== false;
    }

    if (preg_match('/^[a-z][a-z0-9+.-]*:/i', $url)) {
        return false;
    }

    return true;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    show_error('Diese Seite akzeptiert nur gespeicherte Formulardaten.');
}

$csrfToken = isset($_POST['csrf_token']) && is_string($_POST['csrf_token']) ? $_POST['csrf_token'] : null;
if (!verify_csrf_token($csrfToken)) {
    show_error('Die Sicherheitsprüfung ist fehlgeschlagen. Bitte laden Sie die Seite neu und versuchen Sie es erneut.');
}

$postedConcerts = $_POST['concerts'] ?? [];
if (!is_array($postedConcerts)) {
    show_error('Die übermittelten Konzertdaten haben ein ungültiges Format.');
}

$validatedConcerts = [];
$rowNumber = 0;

foreach ($postedConcerts as $concert) {
    if (!is_array($concert)) {
        show_error('Ein Konzerttermin hat ein ungültiges Format.');
    }

    if (!empty($concert['remove'])) {
        continue;
    }

    $rowNumber++;

    $date = clean_text($concert['date'] ?? '');
    $time = clean_text($concert['time'] ?? '');
    $title = clean_text($concert['title'] ?? '');
    $venue = clean_text($concert['venue'] ?? '');
    $city = clean_text($concert['city'] ?? '');
    $description = clean_text($concert['description'] ?? '');
    $detailsUrl = clean_text($concert['detailsUrl'] ?? '');
    $ticketsUrl = clean_text($concert['ticketsUrl'] ?? '');
    $status = clean_text($concert['status'] ?? '');

    $normalizedDate = normalize_german_date($date);

    if ($normalizedDate === null) {
        show_error('Bitte prüfen Sie das Datum in Zeile ' . $rowNumber . '. Erwartetes Format: TT.MM.JJJJ.');
    }

    if (!is_valid_time($time)) {
        show_error('Bitte prüfen Sie die Uhrzeit in Zeile ' . $rowNumber . '. Erwartetes Format: HH:MM Uhr.');
    }

    if (!in_array($status, ALLOWED_STATUSES, true)) {
        show_error('Bitte wählen Sie in Zeile ' . $rowNumber . ' einen gültigen Status.');
    }

    if (!is_valid_admin_url($detailsUrl)) {
        show_error('Der Details-Link in Zeile ' . $rowNumber . ' ist ungültig. Erlaubt sind leere Werte, #, relative Links oder https://-Links.');
    }

    if (!is_valid_admin_url($ticketsUrl)) {
        show_error('Der Tickets-Link in Zeile ' . $rowNumber . ' ist ungültig. Erlaubt sind leere Werte, #, relative Links oder https://-Links.');
    }

    $validatedConcerts[] = [
        'date' => $normalizedDate,
        'time' => $time,
        'title' => $title,
        'venue' => $venue,
        'city' => $city,
        'description' => $description,
        'detailsUrl' => $detailsUrl,
        'ticketsUrl' => $ticketsUrl,
        'status' => $status,
    ];
}

$concertsPath = dirname(__DIR__) . '/data/concerts.json';
$backupDirectory = dirname(__DIR__) . '/data/backups';

if (!is_file($concertsPath) || !is_readable($concertsPath)) {
    show_error('Die bestehende Datei data/concerts.json konnte nicht gelesen werden.');
}

if (!is_writable($concertsPath)) {
    show_error('Die Datei data/concerts.json ist nicht beschreibbar. Bitte prüfen Sie die Server-Berechtigungen.');
}

if (!is_dir($backupDirectory) && !mkdir($backupDirectory, 0755, true)) {
    show_error('Der Backup-Ordner data/backups konnte nicht erstellt werden.');
}

if (!is_writable($backupDirectory)) {
    show_error('Der Backup-Ordner data/backups ist nicht beschreibbar. Bitte prüfen Sie die Server-Berechtigungen.');
}

$backupPath = $backupDirectory . '/concerts-' . date('Ymd-His') . '.json';
if (!copy($concertsPath, $backupPath)) {
    show_error('Vor dem Speichern konnte keine Sicherungskopie erstellt werden.');
}

$json = json_encode($validatedConcerts, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if (!is_string($json)) {
    show_error('Die Konzertdaten konnten nicht als JSON vorbereitet werden.');
}

if (file_put_contents($concertsPath, $json . PHP_EOL, LOCK_EX) === false) {
    show_error('Die Konzertdaten konnten nicht gespeichert werden.');
}

header('Location: index.php?saved=1');
exit;
