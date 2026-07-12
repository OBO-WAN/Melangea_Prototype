<?php

declare(strict_types=1);

require __DIR__ . '/auth.php';
require_authentication();

const MEDIA_SECTIONS = ['collage', 'photoWall'];
const MEDIA_JSON_RELATIVE = 'data/media-gallery.json';
const MEDIA_UPLOAD_PREFIX = 'assets/IMG/medien/';
const MEDIA_MAX_UPLOAD = 10485760;
const MEDIA_MIME_EXTENSIONS = ['image/webp' => 'webp', 'image/jpeg' => 'jpg', 'image/png' => 'png'];

function media_error(string $message): void
{
    http_response_code(400);
    ?><!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Fehler beim Speichern | Mélange à Deux &amp; Amis</title><link rel="stylesheet" href="admin.css"></head><body class="admin-page admin-page--login"><main class="admin-login"><h1>Speichern nicht möglich</h1><p class="admin-message admin-message--error"><?= escape_html($message) ?></p><p><a class="admin-link" href="media.php">Zurück zur Medienverwaltung</a></p></main></body></html><?php
    exit;
}

function clean_media_text($value): string
{
    $text = is_scalar($value) ? trim((string) $value) : '';
    $text = strip_tags($text);
    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text) ?? '';
    return function_exists('mb_substr') ? mb_substr($text, 0, 220, 'UTF-8') : substr($text, 0, 220);
}

function valid_section(string $section): bool { return in_array($section, MEDIA_SECTIONS, true); }
function valid_id(string $id): bool { return preg_match('/^[a-z0-9][a-z0-9_-]*$/i', $id) === 1; }
function valid_src(string $src): bool { return preg_match('/^assets\/IMG\/medien\/[A-Za-z0-9._-]+\.(?:webp|jpe?g|png)$/i', $src) === 1 && !str_contains($src, '..'); }

function load_existing_gallery(string $path): array
{
    if (!is_file($path) || !is_readable($path)) media_error('Die bestehende Galerie-Datei konnte nicht gelesen werden.');
    $decoded = json_decode((string) file_get_contents($path), true);
    if (!is_array($decoded)) media_error('Die bestehende Galerie-Datei ist ungültig und wurde nicht überschrieben.');
    $ids = [];
    $gallery = [];
    foreach (MEDIA_SECTIONS as $section) {
        if (!isset($decoded[$section]) || !is_array($decoded[$section])) media_error('Die bestehende Galerie-Datei enthält ungültige Abschnitte.');
        $gallery[$section] = [];
        foreach ($decoded[$section] as $item) {
            if (!is_array($item)) media_error('Die bestehende Galerie-Datei enthält ungültige Einträge.');
            $id = clean_media_text($item['id'] ?? '');
            $src = clean_media_text($item['src'] ?? '');
            if (!valid_id($id) || isset($ids[$id]) || !valid_src($src)) media_error('Die bestehende Galerie-Datei enthält ungültige IDs oder Pfade.');
            $ids[$id] = true;
            $gallery[$section][] = ['id' => $id, 'src' => $src, 'alt' => clean_media_text($item['alt'] ?? ''), 'caption' => clean_media_text($item['caption'] ?? ''), 'managedUpload' => !empty($item['managedUpload'])];
        }
    }
    return $gallery;
}

function flatten_by_id(array $gallery): array
{
    $map = [];
    foreach (MEDIA_SECTIONS as $section) foreach ($gallery[$section] as $item) $map[$item['id']] = $item;
    return $map;
}

function unique_backup_path(string $dir): string
{
    for ($i = 0; $i < 10; $i++) {
        $suffix = $i === 0 ? '' : '-' . $i;
        $path = $dir . '/media-gallery-' . date('Ymd-His') . $suffix . '.json';
        if (!file_exists($path)) return $path;
        usleep(100000);
    }
    media_error('Es konnte kein eindeutiger Backup-Dateiname erstellt werden.');
}

function maybe_delete_unreferenced_uploads(array $old, array $new, string $root): void
{
    $newRefs = [];
    foreach (MEDIA_SECTIONS as $section) foreach ($new[$section] as $item) $newRefs[$item['src']] = true;
    foreach (MEDIA_SECTIONS as $section) foreach ($old[$section] as $item) {
        if (empty($item['managedUpload']) || isset($newRefs[$item['src']])) continue;
        $relative = $item['src'];
        if (!valid_src($relative)) continue;
        $file = realpath($root . '/' . $relative);
        $uploadDir = realpath($root . '/' . MEDIA_UPLOAD_PREFIX);
        if ($file && $uploadDir && dirname($file) === $uploadDir && is_file($file)) @unlink($file);
    }
}

function handle_upload(array &$gallery, array &$existingById, string $root): void
{
    if (empty($_FILES['upload']) || !is_array($_FILES['upload']) || ($_FILES['upload']['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return;
    $file = $_FILES['upload'];
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) media_error('Der Upload ist fehlgeschlagen. Bitte wählen Sie eine gültige Bilddatei.');
    if (($file['size'] ?? 0) <= 0 || ($file['size'] ?? 0) > MEDIA_MAX_UPLOAD) media_error('Die Bilddatei ist zu groß oder leer. Maximal erlaubt sind 10 MB.');
    $original = (string) ($file['name'] ?? '');
    if (substr_count($original, '.') > 1) media_error('Dateien mit doppelten Erweiterungen sind nicht erlaubt.');
    $ext = strtolower(pathinfo($original, PATHINFO_EXTENSION));
    if (!in_array($ext, ['webp', 'jpg', 'jpeg', 'png'], true)) media_error('Diese Dateiendung ist nicht erlaubt.');
    $tmp = (string) ($file['tmp_name'] ?? '');
    if (!is_uploaded_file($tmp)) media_error('Die hochgeladene Datei konnte nicht geprüft werden.');
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($tmp);
    if (!is_string($mime) || !isset(MEDIA_MIME_EXTENSIONS[$mime])) media_error('Der Dateityp wird nicht unterstützt.');
    if (($mime === 'image/webp' && $ext !== 'webp') || ($mime === 'image/png' && $ext !== 'png') || ($mime === 'image/jpeg' && !in_array($ext, ['jpg', 'jpeg'], true))) media_error('Dateiendung und Dateityp passen nicht zusammen.');
    if (getimagesize($tmp) === false) media_error('Die Datei ist kein gültiges Bild.');
    $section = clean_media_text($_POST['upload_section'] ?? '');
    if (!valid_section($section)) media_error('Der Upload-Abschnitt ist ungültig.');
    $uploadDir = realpath($root . '/' . MEDIA_UPLOAD_PREFIX);
    if (!$uploadDir || !is_dir($uploadDir) || !is_writable($uploadDir)) media_error('Der Upload-Ordner ist nicht beschreibbar.');
    $safeExt = MEDIA_MIME_EXTENSIONS[$mime];
    do {
        $base = 'admin-' . date('Ymd-His') . '-' . bin2hex(random_bytes(4));
        $dest = $uploadDir . '/' . $base . '.' . $safeExt;
    } while (file_exists($dest));
    if (dirname($dest) !== $uploadDir || !move_uploaded_file($tmp, $dest)) media_error('Das Bild konnte nicht gespeichert werden.');
    @chmod($dest, 0644);
    $id = 'upload-' . strtolower(str_replace('-', '', bin2hex(random_bytes(6))));
    while (isset($existingById[$id])) $id = 'upload-' . strtolower(str_replace('-', '', bin2hex(random_bytes(6))));
    $entry = ['id' => $id, 'src' => MEDIA_UPLOAD_PREFIX . basename($dest), 'alt' => clean_media_text($_POST['upload_alt'] ?? ''), 'caption' => clean_media_text($_POST['upload_caption'] ?? ''), 'managedUpload' => true];
    $gallery[$section][] = $entry;
    $existingById[$id] = $entry;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') media_error('Diese Seite akzeptiert nur gespeicherte Formulardaten.');
if (!verify_csrf_token(isset($_POST['csrf_token']) && is_string($_POST['csrf_token']) ? $_POST['csrf_token'] : null)) media_error('Die Sicherheitsprüfung ist fehlgeschlagen. Bitte laden Sie die Seite neu.');

$root = dirname(__DIR__);
$jsonPath = $root . '/' . MEDIA_JSON_RELATIVE;
$oldGallery = load_existing_gallery($jsonPath);
$oldById = flatten_by_id($oldGallery);
$newGallery = ['collage' => [], 'photoWall' => []];
$posted = $_POST['items'] ?? [];
if (!is_array($posted)) media_error('Die übermittelten Galerie-Daten haben ein ungültiges Format.');
$seen = [];
$sortable = [];
foreach ($posted as $postedId => $item) {
    if (!is_array($item)) media_error('Ein Galerie-Eintrag hat ein ungültiges Format.');
    $id = clean_media_text($item['id'] ?? $postedId);
    if (!valid_id($id) || !isset($oldById[$id]) || isset($seen[$id])) media_error('Eine Bild-ID ist unbekannt oder doppelt vorhanden.');
    $seen[$id] = true;
    if (!empty($item['remove'])) continue;
    $src = clean_media_text($item['src'] ?? '');
    if ($src !== $oldById[$id]['src'] || !valid_src($src)) media_error('Ein Bildpfad wurde ungültig verändert.');
    $section = clean_media_text($item['section'] ?? '');
    if (!valid_section($section)) media_error('Ein Galerie-Abschnitt ist ungültig.');
    $order = filter_var($item['order'] ?? 0, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) ?: 9999;
    $sortable[$section][] = ['order' => $order, 'entry' => ['id' => $id, 'src' => $src, 'alt' => clean_media_text($item['alt'] ?? ''), 'caption' => clean_media_text($item['caption'] ?? ''), 'managedUpload' => (bool) $oldById[$id]['managedUpload']]];
}
foreach (MEDIA_SECTIONS as $section) {
    usort($sortable[$section] ?? [], fn($a, $b) => $a['order'] <=> $b['order']);
    foreach ($sortable[$section] ?? [] as $row) $newGallery[$section][] = $row['entry'];
}
handle_upload($newGallery, $oldById, $root);

$backupDir = $root . '/data/backups';
if (!is_dir($backupDir) && !mkdir($backupDir, 0755, true)) media_error('Der Backup-Ordner konnte nicht erstellt werden.');
if (!is_writable($backupDir) || !is_writable($jsonPath)) media_error('Galerie-Datei oder Backup-Ordner sind nicht beschreibbar.');
$backupPath = unique_backup_path($backupDir);
if (!copy($jsonPath, $backupPath)) media_error('Vor dem Speichern konnte keine Sicherungskopie erstellt werden.');
$json = json_encode($newGallery, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if (!is_string($json)) media_error('Die Galerie-Daten konnten nicht als JSON vorbereitet werden.');
$tmpPath = $jsonPath . '.tmp-' . bin2hex(random_bytes(4));
if (file_put_contents($tmpPath, $json . PHP_EOL, LOCK_EX) === false || !rename($tmpPath, $jsonPath)) {
    @unlink($tmpPath);
    media_error('Die Galerie-Daten konnten nicht gespeichert werden.');
}
maybe_delete_unreferenced_uploads($oldGallery, $newGallery, $root);
header('Location: media.php?saved=1');
exit;
