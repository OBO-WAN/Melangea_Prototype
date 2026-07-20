<?php

declare(strict_types=1);

require __DIR__ . '/auth.php';
require_authentication();

const PRESSE_JSON_RELATIVE = 'data/presse.json';
const PRESSE_MANAGED_PREFIX = 'assets/IMG/news/managed';
const PRESSE_MAX_UPLOAD = 10485760;
const PRESSE_MIME_EXTENSIONS = [
    'image/webp' => 'webp',
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
];

$createdUploads = [];

function presse_error(string $message): void
{
    global $createdUploads;

    foreach ($createdUploads as $file) {
        @unlink($file);
    }

    http_response_code(400);
    ?><!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Speichern nicht möglich | Mélange à Deux &amp; Amis</title><link rel="icon" type="image/svg+xml" href="favicon.svg"><link rel="stylesheet" href="admin.css"></head><body class="admin-page"><main class="admin-login"><h1>Speichern nicht möglich</h1><p class="admin-message admin-message--error"><?= escape_html($message) ?></p><p><a class="admin-link" href="presse.php">Zurück zur News-Verwaltung</a></p></main></body></html><?php
    exit;
}

function presse_truncate(string $text, int $limit): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($text, 0, $limit, 'UTF-8');
    }
    if (preg_match_all('/./us', $text, $characters) === 1) {
        return implode('', array_slice($characters[0], 0, $limit));
    }
    return substr($text, 0, $limit);
}

function presse_clean_text($value, int $limit): string
{
    $text = is_scalar($value) ? (string) $value : '';
    $text = str_replace(["\r\n", "\r"], "\n", $text);
    $text = strip_tags($text);
    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text) ?? '';
    return presse_truncate(trim($text), $limit);
}

function presse_single_line($value, int $limit): string
{
    $text = presse_clean_text($value, $limit);
    return trim((string) preg_replace('/\s+/u', ' ', $text));
}

function presse_title_fields($titleValue, $subtitleValue): array
{
    $rawTitle = presse_clean_text($titleValue, 480);
    $subtitle = presse_single_line($subtitleValue, 240);
    $lines = preg_split('/\n+/u', $rawTitle, -1, PREG_SPLIT_NO_EMPTY) ?: [];
    $title = presse_single_line(array_shift($lines) ?? '', 240);

    if ($subtitle === '' && $lines) {
        $subtitle = presse_single_line(implode(' ', $lines), 240);
    }

    return [$title, $subtitle];
}

function presse_valid_id(string $id): bool
{
    return preg_match('/^[a-z0-9][a-z0-9_-]{0,79}$/i', $id) === 1;
}

function presse_valid_date(string $date): bool
{
    if ($date === '') {
        return true;
    }

    $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
    return $parsed instanceof DateTimeImmutable && $parsed->format('Y-m-d') === $date;
}

function presse_valid_image(string $image): bool
{
    return preg_match('#^assets/IMG/news/(?:managed/)?[A-Za-z0-9._-]+\.(?:webp|jpe?g|png)$#i', $image) === 1
        && !str_contains($image, '..')
        && !str_contains($image, '\\');
}

function presse_load_existing(string $path): array
{
    if (!is_file($path) || !is_readable($path)) {
        presse_error('Die bestehenden News-Daten konnten nicht gelesen werden.');
    }

    $decoded = json_decode((string) file_get_contents($path), true);
    if (!is_array($decoded)) {
        presse_error('Die bestehenden News-Daten sind ungültig.');
    }

    $articles = [];
    foreach ($decoded as $item) {
        if (!is_array($item)) {
            presse_error('Ein bestehender News-Beitrag ist ungültig.');
        }

        $id = presse_single_line($item['id'] ?? '', 80);
        $date = presse_single_line($item['date'] ?? '', 10);
        [$title, $subtitle] = presse_title_fields($item['title'] ?? '', $item['subtitle'] ?? '');
        $image = presse_single_line($item['image'] ?? '', 255);
        $text = presse_clean_text($item['text'] ?? '', 20000);

        if (!presse_valid_id($id)
            || isset($articles[$id])
            || !presse_valid_date($date)
            || $title === ''
            || !presse_valid_image($image)
            || $text === '') {
            presse_error('Ein bestehender News-Beitrag enthält ungültige Daten.');
        }

        $articles[$id] = [
            'id' => $id,
            'date' => $date,
            'title' => $title,
            'subtitle' => $subtitle,
            'image' => $image,
            'text' => $text,
            'managedUpload' => !empty($item['managedUpload']),
        ];
    }

    return $articles;
}

function presse_upload(array $file, string $root): ?array
{
    global $createdUploads;

    $error = $file['error'] ?? UPLOAD_ERR_NO_FILE;
    if ($error === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    $temporaryPath = is_string($file['tmp_name'] ?? null) ? $file['tmp_name'] : '';
    if ($error !== UPLOAD_ERR_OK || $temporaryPath === '' || !is_uploaded_file($temporaryPath)) {
        presse_error('Die hochgeladene Bilddatei ist ungültig.');
    }

    $size = is_numeric($file['size'] ?? null) ? (int) $file['size'] : 0;
    if ($size <= 0 || $size > PRESSE_MAX_UPLOAD) {
        presse_error('Das Bild muss zwischen 1 Byte und 10 MB groß sein.');
    }

    $originalName = is_string($file['name'] ?? null) ? $file['name'] : '';
    if (substr_count($originalName, '.') > 1) {
        presse_error('Bilddateien mit doppelten Erweiterungen sind nicht erlaubt.');
    }

    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    if (!in_array($extension, ['webp', 'jpg', 'jpeg', 'png'], true)) {
        presse_error('Erlaubt sind nur WEBP-, JPG- und PNG-Bilder.');
    }

    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($temporaryPath);
    if (!is_string($mime) || !isset(PRESSE_MIME_EXTENSIONS[$mime])) {
        presse_error('Der Bildtyp wird nicht unterstützt.');
    }

    if (($mime === 'image/webp' && $extension !== 'webp')
        || ($mime === 'image/png' && $extension !== 'png')
        || ($mime === 'image/jpeg' && !in_array($extension, ['jpg', 'jpeg'], true))) {
        presse_error('Dateiendung und Bildtyp passen nicht zusammen.');
    }

    if (getimagesize($temporaryPath) === false) {
        presse_error('Die Datei ist kein gültiges Bild.');
    }

    $directory = $root . '/' . PRESSE_MANAGED_PREFIX;
    if (!is_dir($directory) && !mkdir($directory, 0755, true)) {
        presse_error('Der News-Bildordner konnte nicht erstellt werden.');
    }
    if (!is_writable($directory)) {
        presse_error('Der News-Bildordner ist nicht beschreibbar.');
    }

    $safeExtension = PRESSE_MIME_EXTENSIONS[$mime];
    do {
        $filename = 'news-' . date('Ymd-His') . '-' . bin2hex(random_bytes(5)) . '.' . $safeExtension;
        $destination = $directory . '/' . $filename;
    } while (file_exists($destination));

    if (!move_uploaded_file($temporaryPath, $destination)) {
        presse_error('Das News-Bild konnte nicht gespeichert werden.');
    }

    @chmod($destination, 0644);
    $createdUploads[] = $destination;

    return [
        'image' => PRESSE_MANAGED_PREFIX . '/' . $filename,
        'file' => $destination,
    ];
}

function presse_backup_path(string $directory): string
{
    return $directory . '/presse-' . date('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.json';
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    presse_error('Diese Seite akzeptiert nur gespeicherte Formulardaten.');
}
if (!verify_csrf_token(isset($_POST['csrf_token']) && is_string($_POST['csrf_token']) ? $_POST['csrf_token'] : null)) {
    presse_error('Die Sicherheitsprüfung ist fehlgeschlagen. Bitte laden Sie die Seite neu.');
}

$root = dirname(__DIR__);
$jsonPath = $root . '/' . PRESSE_JSON_RELATIVE;
$lock = fopen($jsonPath, 'c+');
if ($lock === false || !flock($lock, LOCK_EX)) {
    presse_error('Die News-Daten konnten nicht gesperrt werden.');
}

$oldById = presse_load_existing($jsonPath);
$posted = $_POST['articles'] ?? [];
if (!is_array($posted)) {
    presse_error('Die übermittelten News-Daten sind ungültig.');
}

$result = [];
$seen = [];
foreach ($oldById as $id => $oldArticle) {
    $row = $posted[$id] ?? null;
    if (!is_array($row)) {
        presse_error('Ein bestehender News-Beitrag fehlt in den Formulardaten.');
    }

    $postedId = presse_single_line($row['id'] ?? '', 80);
    if ($postedId !== $id || isset($seen[$id])) {
        presse_error('Eine News-ID wurde ungültig verändert oder doppelt übermittelt.');
    }
    $seen[$id] = true;

    if (!empty($row['remove'])) {
        continue;
    }

    $date = presse_single_line($row['date'] ?? '', 10);
    $title = presse_single_line($row['title'] ?? '', 240);
    $subtitle = presse_single_line($row['subtitle'] ?? '', 240);
    $text = presse_clean_text($row['text'] ?? '', 20000);
    $image = presse_single_line($row['image'] ?? '', 255);

    if (!presse_valid_date($date) || $title === '' || $text === '' || $image !== $oldArticle['image']) {
        presse_error('Bitte prüfen Sie Datum, Titel, Bild und Text aller Beiträge.');
    }

    $upload = presse_upload($_FILES['replace_' . $id] ?? [], $root);
    if ($upload !== null) {
        $image = $upload['image'];
        $managedUpload = true;
    } else {
        $managedUpload = !empty($oldArticle['managedUpload']);
    }

    $result[] = [
        'id' => $id,
        'date' => $date,
        'title' => $title,
        'subtitle' => $subtitle,
        'image' => $image,
        'text' => $text,
        'managedUpload' => $managedUpload,
    ];
}

$newDate = presse_single_line($_POST['new_date'] ?? '', 10);
$newTitle = presse_single_line($_POST['new_title'] ?? '', 240);
$newSubtitle = presse_single_line($_POST['new_subtitle'] ?? '', 240);
$newText = presse_clean_text($_POST['new_text'] ?? '', 20000);
$newFile = $_FILES['new_image'] ?? [];
$newFileSelected = is_array($newFile) && ($newFile['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE;
$newRequested = $newDate !== '' || $newTitle !== '' || $newSubtitle !== '' || $newText !== '' || $newFileSelected;

if ($newRequested) {
    if (!presse_valid_date($newDate) || $newTitle === '' || $newText === '' || !$newFileSelected) {
        presse_error('Für einen neuen Beitrag sind Titel, Bild und Text erforderlich. Datum und Untertitel dürfen leer bleiben.');
    }

    $upload = presse_upload(is_array($newFile) ? $newFile : [], $root);
    if ($upload === null) {
        presse_error('Für den neuen Beitrag fehlt das Bild.');
    }

    do {
        $newId = 'news-' . bin2hex(random_bytes(6));
    } while (isset($oldById[$newId]));

    array_unshift($result, [
        'id' => $newId,
        'date' => $newDate,
        'title' => $newTitle,
        'subtitle' => $newSubtitle,
        'image' => $upload['image'],
        'text' => $newText,
        'managedUpload' => true,
    ]);
}

$encoded = json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if (!is_string($encoded)) {
    presse_error('Die News-Daten konnten nicht als JSON vorbereitet werden.');
}

$backupDirectory = $root . '/data/backups';
if (!is_dir($backupDirectory) && !mkdir($backupDirectory, 0755, true)) {
    presse_error('Der Backup-Ordner konnte nicht erstellt werden.');
}
if (!is_writable($backupDirectory) || !is_writable($jsonPath)) {
    presse_error('Die News-Datei oder der Backup-Ordner ist nicht beschreibbar.');
}
if (!copy($jsonPath, presse_backup_path($backupDirectory))) {
    presse_error('Vor dem Speichern konnte keine Sicherungskopie erstellt werden.');
}

$temporaryJson = $jsonPath . '.tmp-' . bin2hex(random_bytes(4));
if (file_put_contents($temporaryJson, $encoded . PHP_EOL, LOCK_EX) === false
    || !rename($temporaryJson, $jsonPath)) {
    @unlink($temporaryJson);
    presse_error('Die News-Daten konnten nicht atomar gespeichert werden.');
}

$activeImages = [];
foreach ($result as $article) {
    $activeImages[$article['image']] = true;
}
foreach ($oldById as $oldArticle) {
    $oldImage = $oldArticle['image'];
    if (empty($oldArticle['managedUpload'])
        || isset($activeImages[$oldImage])
        || !str_starts_with($oldImage, PRESSE_MANAGED_PREFIX . '/')
        || !presse_valid_image($oldImage)) {
        continue;
    }

    $candidate = realpath($root . '/' . $oldImage);
    $managedDirectory = realpath($root . '/' . PRESSE_MANAGED_PREFIX);
    if ($candidate !== false
        && $managedDirectory !== false
        && dirname($candidate) === $managedDirectory
        && is_file($candidate)) {
        @unlink($candidate);
    }
}

$createdUploads = [];
flock($lock, LOCK_UN);
fclose($lock);
header('Location: presse.php?saved=1');
exit;
