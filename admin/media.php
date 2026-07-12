<?php

declare(strict_types=1);

require __DIR__ . '/auth.php';
require_authentication();

const MEDIA_SECTIONS = ['collage' => 'Fotocollage', 'photoWall' => 'Fotowand'];

function media_gallery_path(): string { return dirname(__DIR__) . '/data/media-gallery.json'; }
function clean_admin_text($v): string { return is_scalar($v) ? trim((string) $v) : ''; }
function is_valid_media_src(string $src): bool {
    return preg_match('#^assets/IMG/[A-Za-z0-9ÄÖÜäöüß_ ./-]+\.(webp|jpe?g|png)$#i', $src) === 1
        && !str_contains($src, '..') && !str_contains($src, '\\') && !str_starts_with($src, '/');
}
function load_media_gallery(?string &$error = null): array {
    $path = media_gallery_path();
    if (!is_file($path) || !is_readable($path)) { $error = 'Die Datei data/media-gallery.json konnte nicht gelesen werden.'; return ['collage'=>[], 'photoWall'=>[]]; }
    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) { $error = 'Die Galerie-Daten enthalten ungültiges JSON.'; return ['collage'=>[], 'photoWall'=>[]]; }
    $seen = [];
    foreach (MEDIA_SECTIONS as $section => $_label) {
        if (!isset($data[$section]) || !is_array($data[$section])) { $error = 'Die Galerie-Sektion ' . $section . ' fehlt oder ist ungültig.'; return ['collage'=>[], 'photoWall'=>[]]; }
        foreach ($data[$section] as $item) {
            if (!is_array($item) || !isset($item['id'],$item['src'],$item['alt'],$item['caption']) || !is_string($item['id']) || !is_string($item['src']) || !is_string($item['alt']) || !is_string($item['caption']) || isset($seen[$item['id']]) || !preg_match('/^[a-z0-9][a-z0-9_-]{2,79}$/', $item['id']) || !is_valid_media_src($item['src'])) {
                $error = 'Die Galerie-Daten sind ungültig. Bitte prüfen Sie IDs, Pfade und Pflichtfelder.'; return ['collage'=>[], 'photoWall'=>[]];
            }
            $seen[$item['id']] = true;
        }
    }
    return ['collage'=>$data['collage'], 'photoWall'=>$data['photoWall']];
}

$loadError = null;
$gallery = load_media_gallery($loadError);
$message = clean_admin_text($_GET['message'] ?? '');
$error = clean_admin_text($_GET['error'] ?? '');
?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Medienverwaltung | Mélange à Deux &amp; Amis</title>
  <script src="admin-theme.js"></script>
  <link rel="stylesheet" href="admin.css">
</head>
<body class="admin-page">
  <header class="admin-header">
    <div><p class="admin-kicker">Mélange à Deux &amp; Amis</p><h1>Fotogalerien bearbeiten</h1><p class="admin-muted">Verwaltet nur die Fotos aus <code>medien.html</code>.</p></div>
    <div class="admin-header__actions"><button type="button" class="admin-theme-toggle" data-theme-toggle aria-pressed="false" aria-label="Dunkelmodus aktivieren"><span class="admin-theme-toggle__icon admin-theme-toggle__icon--moon" aria-hidden="true">◐</span><span class="admin-theme-toggle__icon admin-theme-toggle__icon--sun" aria-hidden="true">☀</span></button><a class="admin-link" href="index.php">Konzerte</a><a class="admin-link" href="logout.php">Ausloggen</a></div>
  </header>
  <main class="admin-main">
    <?php if ($message !== ''): ?><p class="admin-message admin-message--success"><?= escape_html($message) ?></p><?php endif; ?>
    <?php if ($error !== ''): ?><p class="admin-message admin-message--error"><?= escape_html($error) ?></p><?php endif; ?>
    <?php if ($loadError !== null): ?><p class="admin-message admin-message--error"><?= escape_html($loadError) ?></p><?php endif; ?>

    <form method="post" action="save-media.php" enctype="multipart/form-data">
      <input type="hidden" name="csrf_token" value="<?= escape_html(csrf_token()) ?>">
      <input type="hidden" name="action" value="save">
      <?php foreach (MEDIA_SECTIONS as $section => $label): ?>
        <section class="media-admin-section admin-card" aria-labelledby="section-<?= escape_html($section) ?>">
          <h2 id="section-<?= escape_html($section) ?>"><?= escape_html($label) ?></h2>
          <?php if ($gallery[$section] === []): ?><p class="admin-muted">Diese Galerie ist derzeit leer.</p><?php endif; ?>
          <?php foreach ($gallery[$section] as $index => $item): ?>
            <article class="media-admin-item">
              <img class="media-admin-thumb" src="../<?= escape_html($item['src']) ?>" alt="<?= escape_html($item['alt']) ?>">
              <div class="media-admin-fields">
                <input type="hidden" name="items[<?= escape_html($item['id']) ?>][id]" value="<?= escape_html($item['id']) ?>">
                <input type="hidden" name="items[<?= escape_html($item['id']) ?>][src]" value="<?= escape_html($item['src']) ?>">
                <p class="field-help"><strong>Pfad:</strong> <code><?= escape_html($item['src']) ?></code></p>
                <label class="field">Sektion *<select name="items[<?= escape_html($item['id']) ?>][section]" required><?php foreach (MEDIA_SECTIONS as $key => $name): ?><option value="<?= escape_html($key) ?>" <?= $key === $section ? 'selected' : '' ?>><?= escape_html($name) ?></option><?php endforeach; ?></select></label>
                <label class="field">Reihenfolge *<input type="number" name="items[<?= escape_html($item['id']) ?>][order]" value="<?= $index + 1 ?>" min="1" required></label>
                <label class="field field--wide">Alternativtext *<input type="text" name="items[<?= escape_html($item['id']) ?>][alt]" value="<?= escape_html($item['alt']) ?>" required></label>
                <label class="field field--wide">Bildbeschreibung *<textarea name="items[<?= escape_html($item['id']) ?>][caption]" rows="2" required><?= escape_html($item['caption']) ?></textarea></label>
                <label class="remove-toggle"><input type="checkbox" name="items[<?= escape_html($item['id']) ?>][delete]" value="1"> Bild aus der Galerie entfernen</label>
              </div>
            </article>
          <?php endforeach; ?>
        </section>
      <?php endforeach; ?>
      <section class="admin-card"><h2>Neues Bild hochladen</h2><p class="admin-muted">Erlaubt sind WebP, JPG, JPEG und PNG bis 10 MB.</p>
        <div class="concert-grid"><label class="field">Bilddatei<input type="file" name="upload" accept=".webp,.jpg,.jpeg,.png,image/webp,image/jpeg,image/png"></label><label class="field">Sektion<select name="upload_section"><?php foreach (MEDIA_SECTIONS as $key => $name): ?><option value="<?= escape_html($key) ?>"><?= escape_html($name) ?></option><?php endforeach; ?></select></label><label class="field field--wide">Alternativtext für neues Bild<input type="text" name="upload_alt"></label><label class="field field--wide">Bildbeschreibung für neues Bild<textarea name="upload_caption" rows="2"></textarea></label></div>
      </section>
      <div class="admin-actions"><button class="admin-button" type="submit">Fotogalerien speichern</button></div>
    </form>
  </main>
  <script>document.querySelectorAll('input[name$="[delete]"]').forEach((box)=>box.addEventListener('change',()=>{if(box.checked&&!confirm('Dieses Bild wirklich aus der Galerie entfernen?')) box.checked=false;}));</script>
</body>
</html>
