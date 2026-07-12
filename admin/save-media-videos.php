<?php

declare(strict_types=1);

require __DIR__ . '/auth.php';
require_authentication();

const MEDIA_VIDEOS_JSON_RELATIVE = 'data/media-videos.json';
const YOUTUBE_ID_PATTERN = '/^[A-Za-z0-9_-]{11}$/';

function video_error(string $message): void
{
    http_response_code(400);
    ?><!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Fehler beim Speichern | Mélange à Deux &amp; Amis</title><link rel="stylesheet" href="admin.css"></head><body class="admin-page admin-page--login"><main class="admin-login"><h1>Speichern nicht möglich</h1><p class="admin-message admin-message--error"><?= escape_html($message) ?></p><p><a class="admin-link" href="media.php">Zurück zur Medienverwaltung</a></p></main></body></html><?php
    exit;
}

function clean_video_text($value, int $max = 220): string
{
    $text = is_scalar($value) ? trim((string) $value) : '';
    $text = strip_tags($text);
    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text) ?? '';
    return function_exists('mb_substr') ? mb_substr($text, 0, $max, 'UTF-8') : substr($text, 0, $max);
}

function valid_video_id(string $id): bool { return preg_match('/^[a-z0-9][a-z0-9_-]*$/i', $id) === 1; }
function valid_youtube_id(string $youtubeId): bool { return preg_match(YOUTUBE_ID_PATTERN, $youtubeId) === 1; }

function extract_youtube_id(string $url): string
{
    $url = trim($url);
    if ($url === '') return '';
    if (valid_youtube_id($url)) return $url;

    $parts = parse_url($url);
    if (!is_array($parts) || empty($parts['host'])) return '';

    $host = strtolower((string) $parts['host']);
    $host = preg_replace('/^www\./', '', $host) ?? $host;
    $path = isset($parts['path']) ? trim((string) $parts['path'], '/') : '';

    if ($host === 'youtu.be') {
        $segments = explode('/', $path);
        return valid_youtube_id($segments[0] ?? '') ? $segments[0] : '';
    }

    if (!in_array($host, ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'], true)) return '';

    if (isset($parts['query'])) {
        parse_str((string) $parts['query'], $query);
        if (isset($query['v']) && is_string($query['v']) && valid_youtube_id($query['v'])) return $query['v'];
    }

    $segments = $path === '' ? [] : explode('/', $path);
    foreach (['embed', 'shorts', 'live'] as $prefix) {
        $index = array_search($prefix, $segments, true);
        if ($index !== false && isset($segments[$index + 1]) && valid_youtube_id($segments[$index + 1])) return $segments[$index + 1];
    }

    return '';
}

function load_existing_videos(string $path): array
{
    if (!is_file($path) || !is_readable($path)) video_error('Die bestehende Video-Datei konnte nicht gelesen werden.');
    $decoded = json_decode((string) file_get_contents($path), true);
    if (!is_array($decoded) || !isset($decoded['videos']) || !is_array($decoded['videos'])) video_error('Die bestehende Video-Datei ist ungültig und wurde nicht überschrieben.');

    $ids = [];
    $videos = [];
    foreach ($decoded['videos'] as $item) {
        if (!is_array($item)) video_error('Die bestehende Video-Datei enthält ungültige Einträge.');
        $id = clean_video_text($item['id'] ?? '', 80);
        $youtubeId = clean_video_text($item['youtubeId'] ?? '', 20);
        $title = clean_video_text($item['title'] ?? '');
        if (!valid_video_id($id) || isset($ids[$id]) || !valid_youtube_id($youtubeId) || $title === '') video_error('Die bestehende Video-Datei enthält ungültige IDs oder Titel.');
        $ids[$id] = true;
        $videos[$id] = ['id' => $id, 'youtubeId' => $youtubeId, 'title' => $title];
    }
    return $videos;
}

function unique_video_backup_path(string $dir): string
{
    for ($i = 0; $i < 10; $i++) {
        $suffix = $i === 0 ? '' : '-' . $i;
        $path = $dir . '/media-videos-' . date('Ymd-His') . $suffix . '.json';
        if (!file_exists($path)) return $path;
        usleep(100000);
    }
    video_error('Es konnte kein eindeutiger Backup-Dateiname erstellt werden.');
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') video_error('Diese Seite akzeptiert nur gespeicherte Formulardaten.');
if (!verify_csrf_token(isset($_POST['csrf_token']) && is_string($_POST['csrf_token']) ? $_POST['csrf_token'] : null)) video_error('Die Sicherheitsprüfung ist fehlgeschlagen. Bitte laden Sie die Seite neu.');

$root = dirname(__DIR__);
$jsonPath = $root . '/' . MEDIA_VIDEOS_JSON_RELATIVE;
$oldVideos = load_existing_videos($jsonPath);
$posted = $_POST['videos'] ?? [];
if (!is_array($posted)) video_error('Die übermittelten Video-Daten haben ein ungültiges Format.');

$seen = [];
$youtubeSeen = [];
$sortable = [];
foreach ($posted as $postedId => $item) {
    if (!is_array($item)) video_error('Ein Video-Eintrag hat ein ungültiges Format.');
    $id = clean_video_text($item['id'] ?? $postedId, 80);
    if (!valid_video_id($id) || !isset($oldVideos[$id]) || isset($seen[$id])) video_error('Eine Video-ID ist unbekannt oder doppelt vorhanden.');
    $seen[$id] = true;
    if (!empty($item['remove'])) continue;
    $youtubeId = clean_video_text($item['youtubeId'] ?? '', 20);
    $title = clean_video_text($item['title'] ?? '');
    if (!valid_youtube_id($youtubeId) || $title === '') video_error('Ein Video enthält eine ungültige YouTube-ID oder keinen Titel.');
    if (isset($youtubeSeen[$youtubeId])) video_error('Ein YouTube-Video ist doppelt vorhanden.');
    $youtubeSeen[$youtubeId] = true;
    $order = filter_var($item['order'] ?? 0, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) ?: 9999;
    $sortable[] = ['order' => $order, 'entry' => ['id' => $id, 'youtubeId' => $youtubeId, 'title' => $title]];
}

$newUrl = clean_video_text($_POST['new_youtube_url'] ?? '', 300);
if ($newUrl !== '') {
    $newYoutubeId = extract_youtube_id($newUrl);
    $newTitle = clean_video_text($_POST['new_title'] ?? '');
    if (!valid_youtube_id($newYoutubeId)) video_error('Der neue YouTube-Link ist ungültig. Erlaubt sind nur normale YouTube-Links.');
    if ($newTitle === '') video_error('Bitte geben Sie für das neue Video einen iframe-Titel ein.');
    if (isset($youtubeSeen[$newYoutubeId])) video_error('Dieses YouTube-Video ist bereits vorhanden.');
    do {
        $newId = 'video-' . strtolower(bin2hex(random_bytes(4)));
    } while (isset($oldVideos[$newId]) || isset($seen[$newId]));
    $newOrder = filter_var($_POST['new_order'] ?? 0, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) ?: 9999;
    $sortable[] = ['order' => $newOrder, 'entry' => ['id' => $newId, 'youtubeId' => $newYoutubeId, 'title' => $newTitle]];
}

usort($sortable, fn($a, $b) => $a['order'] <=> $b['order']);
$newVideos = ['videos' => array_map(fn($row) => $row['entry'], $sortable)];

$backupDir = $root . '/data/backups';
if (!is_dir($backupDir) && !mkdir($backupDir, 0755, true)) video_error('Der Backup-Ordner konnte nicht erstellt werden.');
if (!is_writable($backupDir) || !is_writable($jsonPath)) video_error('Video-Datei oder Backup-Ordner sind nicht beschreibbar.');
if (!copy($jsonPath, unique_video_backup_path($backupDir))) video_error('Vor dem Speichern konnte keine Sicherungskopie erstellt werden.');
$json = json_encode($newVideos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if (!is_string($json)) video_error('Die Video-Daten konnten nicht als JSON vorbereitet werden.');
$tmpPath = $jsonPath . '.tmp-' . bin2hex(random_bytes(4));
if (file_put_contents($tmpPath, $json . PHP_EOL, LOCK_EX) === false || !rename($tmpPath, $jsonPath)) {
    @unlink($tmpPath);
    video_error('Die Video-Daten konnten nicht gespeichert werden.');
}
header('Location: media.php?videos_saved=1');
exit;
