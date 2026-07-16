<?php

declare(strict_types=1);

require __DIR__ . '/auth.php';
require_authentication();
require __DIR__ . '/layout.php';

const MEDIA_SECTIONS = ['collage' => 'Collage oben', 'photoWall' => 'Fotowand'];
const MEDIA_JSON_RELATIVE = 'data/media-gallery.json';
const MEDIA_UPLOAD_PREFIX = 'assets/IMG/medien/';
const MEDIA_VIDEOS_JSON_RELATIVE = 'data/media-videos.json';
const MEDIA_AUDIO_JSON_RELATIVE = 'data/media-audio.json';
const YOUTUBE_ID_PATTERN = '/^[A-Za-z0-9_-]{11}$/';

function media_clean_text($value): string
{
    $text = is_scalar($value) ? (string) $value : '';
    return preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text) ?? '';
}

function media_valid_src(string $src): bool
{
    return preg_match('/^assets\/IMG\/medien\/[A-Za-z0-9._-]+\.(?:webp|jpe?g|png)$/i', $src) === 1 && !str_contains($src, '..');
}

function media_load_gallery(string $path, ?string &$error): ?array
{
    if (!is_file($path) || !is_readable($path)) {
        $error = 'Die Galerie-Datei data/media-gallery.json konnte nicht gelesen werden.';
        return null;
    }

    $decoded = json_decode((string) file_get_contents($path), true);
    if (!is_array($decoded)) {
        $error = 'Die Galerie-Daten sind ungültig und wurden nicht als leere Galerie ersetzt.';
        return null;
    }

    $ids = [];
    $validated = [];
    foreach (MEDIA_SECTIONS as $section => $_label) {
        if (!isset($decoded[$section]) || !is_array($decoded[$section])) {
            $error = 'Ein Galerie-Abschnitt fehlt oder ist ungültig.';
            return null;
        }
        $validated[$section] = [];
        foreach ($decoded[$section] as $item) {
            if (!is_array($item)) {
                $error = 'Ein Galerie-Eintrag ist ungültig.';
                return null;
            }
            $id = media_clean_text($item['id'] ?? '');
            $src = media_clean_text($item['src'] ?? '');
            $alt = media_clean_text($item['alt'] ?? '');
            $caption = media_clean_text($item['caption'] ?? '');
            if (!preg_match('/^[a-z0-9][a-z0-9_-]*$/i', $id) || isset($ids[$id]) || !media_valid_src($src)) {
                $error = 'Eine Bild-ID oder ein Bildpfad ist ungültig.';
                return null;
            }
            $ids[$id] = true;
            $validated[$section][] = [
                'id' => $id,
                'src' => $src,
                'alt' => $alt,
                'caption' => $caption,
                'managedUpload' => !empty($item['managedUpload']),
            ];
        }
    }
    return $validated;
}


function media_valid_audio_src(string $src): bool
{
    return preg_match('/^assets\/MP3\/(?:[A-Za-z0-9._-]+|medien\/[A-Za-z0-9._-]+)\.mp3$/i', $src) === 1
        && !str_contains($src, '..') && !str_contains($src, '\\') && !preg_match('/^[a-z][a-z0-9+.-]*:/i', $src);
}

function media_valid_audio_duration(string $duration): bool
{
    return preg_match('/^\d{1,3}:[0-5]\d$/', $duration) === 1;
}

function media_load_audio(string $path, ?string &$error): ?array
{
    if (!is_file($path) || !is_readable($path)) {
        $error = 'Die Audio-Datei data/media-audio.json konnte nicht gelesen werden.';
        return null;
    }
    $decoded = json_decode((string) file_get_contents($path), true);
    if (!is_array($decoded) || !isset($decoded['tracks']) || !is_array($decoded['tracks'])) {
        $error = 'Die Audio-Daten sind ungültig.';
        return null;
    }
    $ids = [];
    $tracks = [];
    foreach ($decoded['tracks'] as $item) {
        if (!is_array($item)) { $error = 'Ein Audio-Eintrag ist ungültig.'; return null; }
        $id = media_clean_text($item['id'] ?? '');
        $src = media_clean_text($item['src'] ?? '');
        $title = media_clean_text($item['title'] ?? '');
        $subtitle = media_clean_text($item['subtitle'] ?? '');
        $duration = media_clean_text($item['duration'] ?? '');
        $seed = $item['seed'] ?? null;
        if (!preg_match('/^[a-z0-9][a-z0-9_-]*$/i', $id) || isset($ids[$id]) || !media_valid_audio_src($src) || $title === '' || !media_valid_audio_duration($duration) || !is_numeric($seed) || !is_finite((float) $seed) || (float) $seed <= 0 || (float) $seed > 9999) {
            $error = 'Eine Audio-ID, ein MP3-Pfad oder ein Audio-Wert ist ungültig.';
            return null;
        }
        $ids[$id] = true;
        $tracks[] = ['id'=>$id,'src'=>$src,'title'=>$title,'subtitle'=>$subtitle,'duration'=>$duration,'seed'=>(float)$seed,'managedUpload'=>!empty($item['managedUpload'])];
    }
    if (!$tracks) { $error = 'Die Audio-Playlist enthält keine gültigen Titel.'; return null; }
    return $tracks;
}

function render_audio_row(array $item, int $index): void
{
    $prefix = 'tracks[' . escape_html($item['id']) . ']';
    ?>
    <section class="concert-row media-admin-row" data-media-audio-row>
      <div class="concert-row__head">
        <h3><?= escape_html($item['title']) ?></h3>
        <label class="remove-toggle"><input type="checkbox" name="<?= $prefix ?>[remove]" value="1"> <span>Titel entfernen</span></label>
      </div>
      <div class="concert-grid">
        <input type="hidden" name="<?= $prefix ?>[id]" value="<?= escape_html($item['id']) ?>">
        <label class="field"><span>Gespeicherter MP3-Pfad</span><input type="text" value="<?= escape_html($item['src']) ?>" readonly></label>
        <label class="field"><span>Reihenfolge</span><input type="number" name="<?= $prefix ?>[order]" value="<?= escape_html((string) ($index + 1)) ?>" min="1"></label>
        <label class="field"><span>Titel</span><input type="text" name="<?= $prefix ?>[title]" value="<?= escape_html($item['title']) ?>" maxlength="160" required></label>
        <label class="field"><span>Untertitel / Beschreibung</span><input type="text" name="<?= $prefix ?>[subtitle]" value="<?= escape_html($item['subtitle']) ?>" maxlength="220"></label>
        <label class="field"><span>Angezeigte Dauer</span><input type="text" name="<?= $prefix ?>[duration]" value="<?= escape_html($item['duration']) ?>" pattern="\d{1,3}:[0-5]\d" placeholder="3:21" required></label>
        <label class="field field--wide"><span>Vorschau</span><audio controls preload="none" src="../<?= escape_html($item['src']) ?>"></audio></label>
      </div>
    </section>
    <?php
}

function media_valid_youtube_id(string $youtubeId): bool
{
    return preg_match(YOUTUBE_ID_PATTERN, $youtubeId) === 1;
}

function media_load_videos(string $path, ?string &$error): ?array
{
    if (!is_file($path) || !is_readable($path)) {
        $error = 'Die Video-Datei data/media-videos.json konnte nicht gelesen werden.';
        return null;
    }

    $decoded = json_decode((string) file_get_contents($path), true);
    if (!is_array($decoded) || !isset($decoded['videos']) || !is_array($decoded['videos'])) {
        $error = 'Die Video-Daten sind ungültig.';
        return null;
    }

    $ids = [];
    $validated = [];
    foreach ($decoded['videos'] as $item) {
        if (!is_array($item)) {
            $error = 'Ein Video-Eintrag ist ungültig.';
            return null;
        }
        $id = media_clean_text($item['id'] ?? '');
        $youtubeId = media_clean_text($item['youtubeId'] ?? '');
        $title = media_clean_text($item['title'] ?? '');
        if (!preg_match('/^[a-z0-9][a-z0-9_-]*$/i', $id) || isset($ids[$id]) || !media_valid_youtube_id($youtubeId) || $title === '') {
            $error = 'Eine Video-ID, YouTube-ID oder ein iframe-Titel ist ungültig.';
            return null;
        }
        $ids[$id] = true;
        $validated[] = ['id' => $id, 'youtubeId' => $youtubeId, 'title' => $title];
    }

    return $validated;
}

function render_video_row(array $item, int $index): void
{
    $prefix = 'videos[' . escape_html($item['id']) . ']';
    ?>
    <section class="concert-row media-admin-row" data-media-video-row>
      <div class="concert-row__head">
        <h3><?= escape_html($item['title']) ?></h3>
        <label class="remove-toggle"><input type="checkbox" name="<?= $prefix ?>[remove]" value="1"> <span>Video entfernen</span></label>
      </div>
      <div class="concert-grid">
        <input type="hidden" name="<?= $prefix ?>[id]" value="<?= escape_html($item['id']) ?>">
        <input type="hidden" name="<?= $prefix ?>[youtubeId]" value="<?= escape_html($item['youtubeId']) ?>">
        <label class="field"><span>YouTube-ID</span><input type="text" value="<?= escape_html($item['youtubeId']) ?>" readonly></label>
        <label class="field"><span>Reihenfolge</span><input type="number" name="<?= $prefix ?>[order]" value="<?= escape_html((string) ($index + 1)) ?>" min="1"></label>
        <label class="field field--wide"><span>Deutscher iframe-Titel</span><input type="text" name="<?= $prefix ?>[title]" value="<?= escape_html($item['title']) ?>" maxlength="220" required></label>
      </div>
    </section>
    <?php
}

function render_media_row(array $item, string $section, int $index): void
{
    $prefix = 'items[' . escape_html($item['id']) . ']';
    ?>
    <section class="concert-row media-admin-row" data-media-row>
      <div class="concert-row__head">
        <h3><?= escape_html($item['caption'] !== '' ? $item['caption'] : $item['alt']) ?></h3>
        <label class="remove-toggle"><input type="checkbox" name="<?= $prefix ?>[remove]" value="1"> <span>Eintrag entfernen</span></label>
      </div>
      <div class="media-admin-grid">
        <img class="media-admin-thumb" src="../<?= escape_html($item['src']) ?>" alt="<?= escape_html($item['alt']) ?>">
        <div class="concert-grid">
          <input type="hidden" name="<?= $prefix ?>[id]" value="<?= escape_html($item['id']) ?>">
          <input type="hidden" name="<?= $prefix ?>[src]" value="<?= escape_html($item['src']) ?>">
          <label class="field"><span>Gespeicherter Pfad</span><input type="text" value="<?= escape_html($item['src']) ?>" readonly></label>
          <label class="field"><span>Abschnitt</span><select name="<?= $prefix ?>[section]">
            <?php foreach (MEDIA_SECTIONS as $key => $label): ?><option value="<?= escape_html($key) ?>" <?= $section === $key ? 'selected' : '' ?>><?= escape_html($label) ?></option><?php endforeach; ?>
          </select></label>
          <label class="field"><span>Reihenfolge</span><input type="number" name="<?= $prefix ?>[order]" value="<?= escape_html((string) ($index + 1)) ?>" min="1"></label>
          <label class="field"><span>Alternativtext</span><input type="text" name="<?= $prefix ?>[alt]" value="<?= escape_html($item['alt']) ?>" maxlength="220"></label>
          <label class="field field--wide"><span>Bildbeschreibung</span><input type="text" name="<?= $prefix ?>[caption]" value="<?= escape_html($item['caption']) ?>" maxlength="220"></label>
        </div>
      </div>
    </section>
    <?php
}

$galleryPath = dirname(__DIR__) . '/' . MEDIA_JSON_RELATIVE;
$loadError = null;
$gallery = media_load_gallery($galleryPath, $loadError);
$videosPath = dirname(__DIR__) . '/' . MEDIA_VIDEOS_JSON_RELATIVE;
$videoLoadError = null;
$videos = media_load_videos($videosPath, $videoLoadError);
$audioPath = dirname(__DIR__) . '/' . MEDIA_AUDIO_JSON_RELATIVE;
$audioLoadError = null;
$audioTracks = media_load_audio($audioPath, $audioLoadError);
?>
<!doctype html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Medienverwaltung | Mélange à Deux &amp; Amis</title><script src="admin-theme.js"></script><link rel="stylesheet" href="admin.css"></head>
<body class="admin-page">
<?php render_admin_layout_open('media'); ?>
<header class="admin-content-header"><p class="admin-kicker">Medien</p><h1>Medien verwalten</h1><p class="admin-muted">Verwaltet Foto-Galerien aus <code><?= MEDIA_JSON_RELATIVE ?></code>, YouTube-Videos aus <code><?= MEDIA_VIDEOS_JSON_RELATIVE ?></code> und Audio aus <code><?= MEDIA_AUDIO_JSON_RELATIVE ?></code>.</p></header>
<?php if (isset($_GET['saved'])): ?><p class="admin-message admin-message--success">Die Mediengalerie wurde gespeichert.</p><?php endif; ?>
<?php if (isset($_GET['videos_saved'])): ?><p class="admin-message admin-message--success">Die Videos wurden gespeichert.</p><?php endif; ?>
<?php if (isset($_GET['audio_saved'])): ?><p class="admin-message admin-message--success">Die Audio-Playlist wurde gespeichert.</p><?php endif; ?>
<?php if ($loadError !== null): ?><p class="admin-message admin-message--error"><?= escape_html($loadError) ?> Speichern der Fotos ist deaktiviert.</p><?php endif; ?>
<?php if ($videoLoadError !== null): ?><p class="admin-message admin-message--error"><?= escape_html($videoLoadError) ?> Speichern der Videos ist deaktiviert.</p><?php endif; ?>
<?php if ($audioLoadError !== null): ?><p class="admin-message admin-message--error"><?= escape_html($audioLoadError) ?> Speichern der Audio-Playlist ist deaktiviert.</p><?php endif; ?>
<form method="post" action="save-media.php" enctype="multipart/form-data">
<input type="hidden" name="csrf_token" value="<?= escape_html(csrf_token()) ?>">
<?php if ($gallery !== null): ?>
  <?php foreach (MEDIA_SECTIONS as $section => $label): ?>
    <h2><?= escape_html($label) ?></h2>
    <?php foreach ($gallery[$section] as $index => $item): ?><?php render_media_row($item, $section, $index); ?><?php endforeach; ?>
  <?php endforeach; ?>
  <section class="concert-row"><h2>Neues Bild hochladen</h2><div class="concert-grid">
    <label class="field"><span>Bilddatei (WebP, JPG, JPEG, PNG, max. 10 MB)</span><input type="file" name="upload" accept=".webp,.jpg,.jpeg,.png,image/webp,image/jpeg,image/png"></label>
    <label class="field"><span>Abschnitt</span><select name="upload_section"><?php foreach (MEDIA_SECTIONS as $key => $label): ?><option value="<?= escape_html($key) ?>"><?= escape_html($label) ?></option><?php endforeach; ?></select></label>
    <label class="field"><span>Alternativtext</span><input type="text" name="upload_alt" maxlength="220"></label>
    <label class="field"><span>Bildbeschreibung</span><input type="text" name="upload_caption" maxlength="220"></label>
  </div></section>
<?php endif; ?>
<div class="admin-actions"><button type="submit" class="admin-button" <?= $gallery === null ? 'disabled' : '' ?>>Mediengalerie speichern</button></div>
</form>

<section class="admin-card">
  <h2>YouTube-Videos bearbeiten</h2>
  <p class="admin-muted">Hier werden nur YouTube-Links gespeichert. Es sind keine Video-Uploads und keine fremden iframe-Codes erlaubt.</p>
</section>
<form method="post" action="save-media-videos.php">
<input type="hidden" name="csrf_token" value="<?= escape_html(csrf_token()) ?>">
<?php if ($videos !== null): ?>
  <?php foreach ($videos as $index => $item): ?><?php render_video_row($item, $index); ?><?php endforeach; ?>
  <section class="concert-row"><h2>Neues YouTube-Video hinzufügen</h2><div class="concert-grid">
    <label class="field field--wide"><span>YouTube-Link</span><input type="url" name="new_youtube_url" placeholder="https://www.youtube.com/watch?v=..." maxlength="300"></label>
    <label class="field"><span>Reihenfolge</span><input type="number" name="new_order" value="<?= escape_html((string) (count($videos) + 1)) ?>" min="1"></label>
    <label class="field"><span>Deutscher iframe-Titel</span><input type="text" name="new_title" maxlength="220" placeholder="Mélange à Deux &amp; Amis – Video"></label>
  </div></section>
<?php endif; ?>
<div class="admin-actions"><button type="submit" class="admin-button" <?= $videos === null ? 'disabled' : '' ?>>Videos speichern</button></div>
</form>

<section class="admin-card">
  <h2>Audio-Playlist bearbeiten</h2>
  <p class="admin-muted">Hier werden ausschließlich die MP3-Hörbeispiele auf der Medienseite verwaltet. Die Wellenform wird weiterhin automatisch im Browser erzeugt.</p>
</section>
<form method="post" action="save-media-audio.php" enctype="multipart/form-data">
<input type="hidden" name="csrf_token" value="<?= escape_html(csrf_token()) ?>">
<?php if ($audioTracks !== null): ?>
  <?php foreach ($audioTracks as $index => $item): ?><?php render_audio_row($item, $index); ?><?php endforeach; ?>
  <section class="concert-row"><h2>Neuen MP3-Titel hochladen</h2><p class="admin-muted">Erlaubt sind nur MP3-Dateien bis 25 MB. Die Dauer bitte im Format Minuten:Sekunden angeben, zum Beispiel 3:21. Wenn keine gültige Dauer eingetragen wird, speichert das System 0:00 als sichtbaren Platzhalter. Der neue Titel wird zunächst an das Ende der Playlist angehängt und kann danach über die Reihenfolge sortiert werden.</p><div class="concert-grid">
    <label class="field"><span>MP3-Datei</span><input type="file" name="new_upload" accept=".mp3,audio/mpeg,audio/mp3"></label>
    <label class="field"><span>Titel</span><input type="text" name="new_title" maxlength="160"></label>
    <label class="field"><span>Untertitel / Beschreibung</span><input type="text" name="new_subtitle" maxlength="220"></label>
    <label class="field"><span>Angezeigte Dauer</span><input type="text" name="new_duration" pattern="\d{1,3}:[0-5]\d" placeholder="3:21"></label>
  </div></section>
<?php endif; ?>
<div class="admin-actions"><button type="submit" class="admin-button" <?= $audioTracks === null ? 'disabled' : '' ?>>Audio-Playlist speichern</button></div>
</form>

<?php render_admin_layout_close(); ?></body></html>
