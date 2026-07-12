<?php

declare(strict_types=1);

require __DIR__ . '/auth.php';
require_authentication();

const MEDIA_SECTIONS = ['collage' => 'Collage oben', 'photoWall' => 'Fotowand'];
const MEDIA_JSON_RELATIVE = 'data/media-gallery.json';
const MEDIA_UPLOAD_PREFIX = 'assets/IMG/medien/';

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
?>
<!doctype html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Medienverwaltung | Mélange à Deux &amp; Amis</title><script src="admin-theme.js"></script><link rel="stylesheet" href="admin.css"></head>
<body class="admin-page">
<header class="admin-header"><div><p class="admin-kicker">Mélange à Deux &amp; Amis</p><h1>Fotogalerien bearbeiten</h1><p class="admin-muted">Verwaltet nur die Foto-Galerien aus <code><?= MEDIA_JSON_RELATIVE ?></code>.</p></div><div class="admin-header__actions"><button type="button" class="admin-theme-toggle" data-theme-toggle aria-pressed="false" aria-label="Dunkelmodus aktivieren"><span class="admin-theme-toggle__icon admin-theme-toggle__icon--moon" aria-hidden="true">◐</span><span class="admin-theme-toggle__icon admin-theme-toggle__icon--sun" aria-hidden="true">☀</span></button><a class="admin-link" href="index.php">Konzerte</a><a class="admin-link" href="logout.php">Ausloggen</a></div></header>
<main class="admin-main">
<?php if (isset($_GET['saved'])): ?><p class="admin-message admin-message--success">Die Mediengalerie wurde gespeichert.</p><?php endif; ?>
<?php if ($loadError !== null): ?><p class="admin-message admin-message--error"><?= escape_html($loadError) ?> Speichern ist deaktiviert.</p><?php endif; ?>
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
</form></main></body></html>
