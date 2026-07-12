<?php

declare(strict_types=1);

require __DIR__ . '/auth.php';
require_authentication();

const MEDIA_AUDIO_JSON_RELATIVE = 'data/media-audio.json';
const MEDIA_AUDIO_UPLOAD_PREFIX = 'assets/MP3/medien/';
const MEDIA_AUDIO_MAX_UPLOAD = 26214400;

function audio_error(string $message, ?string $cleanupPath = null): void
{
    if ($cleanupPath !== null && is_file($cleanupPath)) @unlink($cleanupPath);
    http_response_code(400);
    ?><!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Fehler beim Speichern | Mélange à Deux &amp; Amis</title><link rel="stylesheet" href="admin.css"></head><body class="admin-page admin-page--login"><main class="admin-login"><h1>Audio speichern nicht möglich</h1><p class="admin-message admin-message--error"><?= escape_html($message) ?></p><p><a class="admin-link" href="media.php">Zurück zur Medienverwaltung</a></p></main></body></html><?php
    exit;
}

function audio_clean_text($value, int $max = 220): string
{
    $text = is_scalar($value) ? trim((string) $value) : '';
    $text = strip_tags($text);
    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text) ?? '';
    return function_exists('mb_substr') ? mb_substr($text, 0, $max, 'UTF-8') : substr($text, 0, $max);
}

function audio_valid_id(string $id): bool { return preg_match('/^[a-z0-9][a-z0-9_-]*$/i', $id) === 1; }
function audio_valid_duration(string $duration): bool { return preg_match('/^\d{1,3}:[0-5]\d$/', $duration) === 1; }
function audio_valid_src(string $src): bool
{
    return preg_match('/^assets\/MP3\/(?:[A-Za-z0-9._-]+|medien\/[A-Za-z0-9._-]+)\.mp3$/i', $src) === 1
        && !str_contains($src, '..') && !str_contains($src, '\\') && !preg_match('/^[a-z][a-z0-9+.-]*:/i', $src)
        && !preg_match('/[\x00-\x1F\x7F]/', $src);
}

function load_audio_tracks(string $path): array
{
    if (!is_file($path) || !is_readable($path)) audio_error('Die bestehende Audio-Datei konnte nicht gelesen werden.');
    $decoded = json_decode((string) file_get_contents($path), true);
    if (!is_array($decoded) || !isset($decoded['tracks']) || !is_array($decoded['tracks'])) audio_error('Die bestehende Audio-Datei ist ungültig und wurde nicht überschrieben.');
    $ids = []; $tracks = [];
    foreach ($decoded['tracks'] as $item) {
        if (!is_array($item)) audio_error('Die bestehende Audio-Datei enthält ungültige Einträge.');
        $id = audio_clean_text($item['id'] ?? '', 80);
        $src = audio_clean_text($item['src'] ?? '', 260);
        $title = audio_clean_text($item['title'] ?? '', 160);
        $subtitle = audio_clean_text($item['subtitle'] ?? '', 220);
        $duration = audio_clean_text($item['duration'] ?? '', 12);
        $seed = $item['seed'] ?? null;
        if (!audio_valid_id($id) || isset($ids[$id]) || !audio_valid_src($src) || $title === '' || !audio_valid_duration($duration) || !is_numeric($seed) || !is_finite((float) $seed) || (float) $seed <= 0 || (float) $seed > 9999) {
            audio_error('Die bestehende Audio-Datei enthält ungültige Werte.');
        }
        $ids[$id] = true;
        $tracks[$id] = ['id'=>$id,'src'=>$src,'title'=>$title,'subtitle'=>$subtitle,'duration'=>$duration,'seed'=>(float)$seed,'managedUpload'=>!empty($item['managedUpload'])];
    }
    if (!$tracks) audio_error('Die bestehende Audio-Datei enthält keine gültigen Titel.');
    return $tracks;
}

function unique_audio_backup_path(string $dir): string
{
    for ($i = 0; $i < 10; $i++) {
        $suffix = $i === 0 ? '' : '-' . $i;
        $path = $dir . '/media-audio-' . date('Ymd-His') . $suffix . '.json';
        if (!file_exists($path)) return $path;
        usleep(100000);
    }
    audio_error('Es konnte kein eindeutiger Backup-Dateiname erstellt werden.');
}

function plausible_mp3_signature(string $path): bool
{
    $fh = @fopen($path, 'rb'); if (!$fh) return false;
    $bytes = fread($fh, 4); fclose($fh);
    if (!is_string($bytes) || strlen($bytes) < 3) return false;
    if (strncmp($bytes, 'ID3', 3) === 0) return true;
    $b0 = ord($bytes[0]); $b1 = ord($bytes[1]);
    return $b0 === 0xFF && (($b1 & 0xE0) === 0xE0);
}

function handle_audio_upload(string $root, array $oldTracks, array $seen): ?array
{
    if (empty($_FILES['new_upload']) || !is_array($_FILES['new_upload']) || ($_FILES['new_upload']['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return null;
    $file = $_FILES['new_upload'];
    if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) audio_error('Der neue MP3-Titel konnte nicht hochgeladen werden.');
    if (($file['size'] ?? 0) <= 0 || ($file['size'] ?? 0) > MEDIA_AUDIO_MAX_UPLOAD) audio_error('Die MP3-Datei ist leer oder größer als 25 MB.');
    $original = is_string($file['name'] ?? null) ? $file['name'] : '';
    if (preg_match('/\.mp3$/i', $original) !== 1 || substr_count($original, '.') !== 1) audio_error('Erlaubt sind nur einfache MP3-Dateinamen mit der Endung .mp3.');
    $tmp = is_string($file['tmp_name'] ?? null) ? $file['tmp_name'] : '';
    if (!is_uploaded_file($tmp)) audio_error('Die hochgeladene Datei ist ungültig.');
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($tmp);
    if (!in_array($mime, ['audio/mpeg', 'audio/mp3'], true) || !plausible_mp3_signature($tmp)) audio_error('Die Datei wurde nicht als gültige MP3-Datei erkannt.');
    $dir = $root . '/' . MEDIA_AUDIO_UPLOAD_PREFIX;
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) audio_error('Der Audio-Upload-Ordner konnte nicht erstellt werden.');
    $realDir = realpath($dir);
    if ($realDir === false || !is_writable($realDir)) audio_error('Der Audio-Upload-Ordner ist nicht beschreibbar.');
    do { $name = 'audio-' . date('YmdHis') . '-' . strtolower(bin2hex(random_bytes(6))) . '.mp3'; $dest = $realDir . DIRECTORY_SEPARATOR . $name; } while (file_exists($dest));
    if (realpath(dirname($dest)) !== $realDir || !move_uploaded_file($tmp, $dest)) audio_error('Die MP3-Datei konnte nicht sicher gespeichert werden.');
    chmod($dest, 0644);
    do { $id = 'audio-' . strtolower(bin2hex(random_bytes(4))); } while (isset($oldTracks[$id]) || isset($seen[$id]));
    $title = audio_clean_text($_POST['new_title'] ?? '', 160);
    $subtitle = audio_clean_text($_POST['new_subtitle'] ?? '', 220);
    $duration = audio_clean_text($_POST['new_duration'] ?? '', 12);
    if ($title === '') audio_error('Bitte geben Sie für den neuen MP3-Titel einen Titel ein.', $dest);
    if (!audio_valid_duration($duration)) $duration = '0:00';
    return ['id'=>$id,'src'=>MEDIA_AUDIO_UPLOAD_PREFIX . $name,'title'=>$title,'subtitle'=>$subtitle,'duration'=>$duration,'seed'=>round(random_int(100, 900000) / 100, 2),'managedUpload'=>true, '_path'=>$dest];
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') audio_error('Diese Seite akzeptiert nur gespeicherte Formulardaten.');
if (!verify_csrf_token(isset($_POST['csrf_token']) && is_string($_POST['csrf_token']) ? $_POST['csrf_token'] : null)) audio_error('Die Sicherheitsprüfung ist fehlgeschlagen. Bitte laden Sie die Seite neu.');

$root = dirname(__DIR__); $jsonPath = $root . '/' . MEDIA_AUDIO_JSON_RELATIVE; $oldTracks = load_audio_tracks($jsonPath);
$posted = $_POST['tracks'] ?? []; if (!is_array($posted)) audio_error('Die übermittelten Audio-Daten haben ein ungültiges Format.');
$seen = []; $sortable = [];
foreach ($posted as $postedId => $item) {
    if (!is_array($item)) audio_error('Ein Audio-Eintrag hat ein ungültiges Format.');
    $id = audio_clean_text($item['id'] ?? $postedId, 80);
    if (!audio_valid_id($id) || !isset($oldTracks[$id]) || isset($seen[$id])) audio_error('Eine Audio-ID ist unbekannt oder doppelt vorhanden.');
    $seen[$id] = true;
    if (!empty($item['remove'])) continue;
    $title = audio_clean_text($item['title'] ?? '', 160); $subtitle = audio_clean_text($item['subtitle'] ?? '', 220); $duration = audio_clean_text($item['duration'] ?? '', 12);
    if ($title === '' || !audio_valid_duration($duration)) audio_error('Ein Audio-Titel enthält keinen Titel oder eine ungültige Dauer.');
    $order = filter_var($item['order'] ?? 0, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1]]) ?: 9999;
    $entry = $oldTracks[$id]; $entry['title']=$title; $entry['subtitle']=$subtitle; $entry['duration']=$duration;
    $sortable[] = ['order'=>$order, 'entry'=>$entry];
}
$newUploadPath = null; $new = handle_audio_upload($root, $oldTracks, $seen);
if ($new !== null) { $newUploadPath = $new['_path']; unset($new['_path']); $sortable[] = ['order'=>9999, 'entry'=>$new]; }
if (count($seen) !== count($oldTracks)) audio_error('Die übermittelten Audio-Daten sind unvollständig.', $newUploadPath);
if (!$sortable) audio_error('Mindestens ein Audio-Titel muss in der Playlist bleiben.', $newUploadPath);
usort($sortable, fn($a, $b) => $a['order'] <=> $b['order']);
$newData = ['tracks' => array_map(fn($row) => $row['entry'], $sortable)];
$json = json_encode($newData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); if (!is_string($json)) audio_error('Die Audio-Daten konnten nicht als JSON vorbereitet werden.', $newUploadPath);
$backupDir = $root . '/data/backups'; if (!is_dir($backupDir) && !mkdir($backupDir, 0755, true)) audio_error('Der Backup-Ordner konnte nicht erstellt werden.', $newUploadPath);
if (!is_writable($backupDir) || !is_writable($jsonPath)) audio_error('Audio-Datei oder Backup-Ordner sind nicht beschreibbar.', $newUploadPath);
if (!copy($jsonPath, unique_audio_backup_path($backupDir))) audio_error('Vor dem Speichern konnte keine Sicherungskopie erstellt werden.', $newUploadPath);
$tmpPath = $jsonPath . '.tmp-' . bin2hex(random_bytes(4));
if (file_put_contents($tmpPath, $json . PHP_EOL, LOCK_EX) === false || !rename($tmpPath, $jsonPath)) { @unlink($tmpPath); audio_error('Die Audio-Daten konnten nicht gespeichert werden.', $newUploadPath); }

$remaining = array_column($newData['tracks'], 'src');
foreach ($oldTracks as $old) {
    if (!$old['managedUpload'] || in_array($old['src'], $remaining, true)) continue;
    if (preg_match('/^assets\/MP3\/medien\/[A-Za-z0-9._-]+\.mp3$/i', $old['src']) !== 1) continue;
    $path = $root . '/' . $old['src']; $real = realpath($path); $managedDir = realpath($root . '/' . MEDIA_AUDIO_UPLOAD_PREFIX);
    if ($real !== false && $managedDir !== false && dirname($real) === $managedDir) @unlink($real);
}
header('Location: media.php?audio_saved=1');
exit;
