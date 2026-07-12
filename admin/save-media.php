<?php

declare(strict_types=1);

require __DIR__ . '/auth.php';
require_authentication();

const MEDIA_SECTIONS = ['collage', 'photoWall'];
const MAX_UPLOAD_BYTES = 10485760;
const UPLOAD_RELATIVE_DIR = 'assets/IMG/medien/';

function fail_media(string $message): void { header('Location: media.php?error=' . rawurlencode($message)); exit; }
function success_media(string $message): void { header('Location: media.php?message=' . rawurlencode($message)); exit; }
function clean_media_text($value, int $max = 500): string { $text = is_scalar($value) ? trim((string) $value) : ''; $text = strip_tags($text); $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text) ?? ''; return function_exists('mb_substr') ? mb_substr($text, 0, $max) : substr($text, 0, $max); }
function gallery_path(): string { return dirname(__DIR__) . '/data/media-gallery.json'; }
function is_valid_id(string $id): bool { return preg_match('/^[a-z0-9][a-z0-9_-]{2,79}$/', $id) === 1; }
function is_valid_src(string $src): bool { return preg_match('#^assets/IMG/[A-Za-z0-9ÄÖÜäöüß_ ./-]+\.(webp|jpe?g|png)$#i', $src) === 1 && !str_contains($src, '..') && !str_contains($src, '\\') && !str_starts_with($src, '/'); }
function validate_gallery(array $gallery): array {
    $seen = [];
    foreach (MEDIA_SECTIONS as $section) {
        if (!isset($gallery[$section]) || !is_array($gallery[$section])) fail_media('Die Galerie-Daten sind unvollständig.');
        foreach ($gallery[$section] as $item) {
            if (!is_array($item) || !isset($item['id'], $item['src'], $item['alt'], $item['caption']) || !is_string($item['id']) || !is_string($item['src']) || !is_string($item['alt']) || !is_string($item['caption'])) fail_media('Ein Galerie-Eintrag ist unvollständig.');
            if (!is_valid_id($item['id']) || isset($seen[$item['id']])) fail_media('Eine Bild-ID ist ungültig oder doppelt vorhanden.');
            if (!is_valid_src($item['src'])) fail_media('Ein Bildpfad ist ungültig.');
            $seen[$item['id']] = true;
        }
    }
    return $gallery;
}
function load_existing_gallery(): array {
    $path = gallery_path();
    if (!is_file($path) || !is_readable($path)) fail_media('Die bestehende Galerie-Datei konnte nicht gelesen werden.');
    $decoded = json_decode((string) file_get_contents($path), true);
    if (!is_array($decoded)) fail_media('Die bestehende Galerie-Datei enthält ungültiges JSON und wurde nicht überschrieben.');
    return validate_gallery($decoded);
}
function make_backup(string $path): void {
    $dir = dirname(__DIR__) . '/data/backups';
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) fail_media('Der Backup-Ordner konnte nicht erstellt werden.');
    if (!is_writable($dir)) fail_media('Der Backup-Ordner ist nicht beschreibbar.');
    for ($i = 0; $i < 10; $i++) {
        $suffix = $i === 0 ? '' : '-' . $i;
        $backup = $dir . '/media-gallery-' . date('Ymd-His') . $suffix . '.json';
        if (!file_exists($backup)) { if (!copy($path, $backup)) fail_media('Vor dem Speichern konnte keine Sicherungskopie erstellt werden.'); return; }
        usleep(100000);
    }
    fail_media('Es konnte kein eindeutiger Backup-Dateiname erstellt werden.');
}
function write_gallery(array $gallery): void {
    $path = gallery_path();
    if (!is_writable($path)) fail_media('Die Galerie-Datei ist nicht beschreibbar.');
    make_backup($path);
    $json = json_encode($gallery, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($json)) fail_media('Die Galerie-Daten konnten nicht als JSON vorbereitet werden.');
    $tmp = $path . '.tmp.' . bin2hex(random_bytes(6));
    if (file_put_contents($tmp, $json . PHP_EOL, LOCK_EX) === false || !rename($tmp, $path)) { @unlink($tmp); fail_media('Die Galerie-Daten konnten nicht gespeichert werden.'); }
}
function maybe_delete_upload(string $src): void {
    if (!str_starts_with($src, UPLOAD_RELATIVE_DIR)) return;
    $root = realpath(dirname(__DIR__) . '/' . UPLOAD_RELATIVE_DIR);
    if ($root === false) return;
    $file = realpath(dirname(__DIR__) . '/' . $src);
    if ($file !== false && str_starts_with($file, $root . DIRECTORY_SEPARATOR) && is_file($file) && !@unlink($file)) fail_media('Ein hochgeladenes Bild konnte nicht gelöscht werden.');
}
function handle_upload(): ?array {
    if (!isset($_FILES['upload']) || !is_array($_FILES['upload']) || ($_FILES['upload']['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return null;
    if (($_FILES['upload']['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) fail_media('Der Upload konnte nicht verarbeitet werden.');
    if (($_FILES['upload']['size'] ?? 0) > MAX_UPLOAD_BYTES) fail_media('Das hochgeladene Bild ist größer als 10 MB.');
    $original = is_string($_FILES['upload']['name'] ?? null) ? $_FILES['upload']['name'] : '';
    $ext = strtolower(pathinfo($original, PATHINFO_EXTENSION));
    $allowed = ['webp'=>'image/webp','jpg'=>'image/jpeg','jpeg'=>'image/jpeg','png'=>'image/png'];
    if (!isset($allowed[$ext])) fail_media('Dieser Dateityp ist nicht erlaubt.');
    $tmp = is_string($_FILES['upload']['tmp_name'] ?? null) ? $_FILES['upload']['tmp_name'] : '';
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    if ($tmp === '' || !is_uploaded_file($tmp) || $finfo->file($tmp) !== $allowed[$ext] || getimagesize($tmp) === false) fail_media('Die hochgeladene Datei ist kein gültiges Bild.');
    $dir = dirname(__DIR__) . '/' . UPLOAD_RELATIVE_DIR;
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) fail_media('Der Upload-Ordner konnte nicht erstellt werden.');
    $name = 'media-' . date('Ymd-His') . '-' . bin2hex(random_bytes(6)) . '.' . $ext;
    $target = $dir . $name;
    if (file_exists($target) || !move_uploaded_file($tmp, $target)) fail_media('Das Bild konnte nicht gespeichert werden.');
    return ['id' => 'upload-' . date('YmdHis') . '-' . bin2hex(random_bytes(4)), 'src' => UPLOAD_RELATIVE_DIR . $name, 'alt' => clean_media_text($_POST['upload_alt'] ?? '', 250), 'caption' => clean_media_text($_POST['upload_caption'] ?? '', 250), 'section' => clean_media_text($_POST['upload_section'] ?? '')];
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail_media('Diese Seite akzeptiert nur Formulardaten.');
if (!verify_csrf_token(isset($_POST['csrf_token']) && is_string($_POST['csrf_token']) ? $_POST['csrf_token'] : null)) fail_media('Die Sicherheitsprüfung ist fehlgeschlagen. Bitte laden Sie die Seite neu.');

$existing = load_existing_gallery();
$posted = $_POST['items'] ?? [];
if (!is_array($posted)) fail_media('Die übermittelten Galerie-Daten haben ein ungültiges Format.');
$known = [];
foreach (MEDIA_SECTIONS as $section) foreach ($existing[$section] as $item) $known[$item['id']] = $item['src'];
$new = ['collage' => [], 'photoWall' => []];
$order = ['collage' => [], 'photoWall' => []];
foreach ($posted as $row) {
    if (!is_array($row)) fail_media('Ein Galerie-Eintrag hat ein ungültiges Format.');
    $id = clean_media_text($row['id'] ?? '', 80); $src = clean_media_text($row['src'] ?? '', 200); $section = clean_media_text($row['section'] ?? '', 40);
    if (!isset($known[$id]) || $known[$id] !== $src || !in_array($section, MEDIA_SECTIONS, true)) fail_media('Ein Galerie-Eintrag konnte nicht validiert werden.');
    if (!empty($row['delete'])) { maybe_delete_upload($src); continue; }
    $alt = clean_media_text($row['alt'] ?? '', 250); $caption = clean_media_text($row['caption'] ?? '', 250); $pos = filter_var($row['order'] ?? null, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1]]);
    if ($alt === '' || $caption === '' || $pos === false) fail_media('Bitte füllen Sie alle Pflichtfelder aus und prüfen Sie die Reihenfolge.');
    $order[$section][] = ['position'=>(int)$pos, 'item'=>['id'=>$id, 'src'=>$src, 'alt'=>$alt, 'caption'=>$caption]];
}
$upload = handle_upload();
if ($upload !== null) {
    if (!in_array($upload['section'], MEDIA_SECTIONS, true) || $upload['alt'] === '' || $upload['caption'] === '') { maybe_delete_upload($upload['src']); fail_media('Für neue Bilder sind Sektion, Alternativtext und Bildbeschreibung erforderlich.'); }
    $order[$upload['section']][] = ['position'=>PHP_INT_MAX, 'item'=>['id'=>$upload['id'], 'src'=>$upload['src'], 'alt'=>$upload['alt'], 'caption'=>$upload['caption']]];
}
foreach (MEDIA_SECTIONS as $section) { usort($order[$section], fn($a,$b)=>$a['position']<=>$b['position']); $new[$section] = array_column($order[$section], 'item'); }
validate_gallery($new);
write_gallery($new);
success_media('Die Fotogalerien wurden gespeichert.');
