<?php

declare(strict_types=1);

require __DIR__ . '/auth.php';
require_authentication();
require __DIR__ . '/layout.php';

const BOOKING_DOWNLOAD_SLOTS = [
    'pressetext-lang' => ['label' => 'Pressetext lang', 'fileType' => 'pdf'],
    'pressetext-kurz' => ['label' => 'Pressetext kurz', 'fileType' => 'pdf'],
    'kurzbeschreibung' => ['label' => 'Kurzbeschreibung', 'fileType' => 'pdf'],
    'fotos' => ['label' => 'Fotos', 'fileType' => 'zip'],
    'biographien-der-musiker' => ['label' => 'Biographien der Musiker', 'fileType' => 'pdf'],
    'repertoire-auszug' => ['label' => 'Repertoire-Auszug', 'fileType' => 'pdf'],
    'techrider' => ['label' => 'Techrider', 'fileType' => 'pdf'],
];

function booking_downloads_load(string $path): ?array
{
    $json = is_file($path) ? file_get_contents($path) : false;
    $decoded = is_string($json) ? json_decode($json, true) : null;

    if (!is_array($decoded)) {
        return null;
    }

    $items = [];
    foreach ($decoded as $item) {
        if (is_array($item) && isset($item['id']) && is_string($item['id'])) {
            $items[$item['id']] = $item;
        }
    }

    return $items;
}

function booking_download_path($value): string
{
    $path = is_string($value) ? $value : '';

    if ($path === '' || str_contains($path, '..') || str_contains($path, '\\')) {
        return '';
    }

    return preg_match('#^assets/downloads/booking/(?:managed/)?[A-Za-z0-9._-]+\.(?:pdf|zip)$#i', $path) === 1
        ? $path
        : '';
}

function render_booking_download_slot(string $id, array $slot, array $item, string $root): void
{
    $path = booking_download_path($item['path'] ?? null);
    $fileExists = $path !== '' && is_file($root . '/' . $path);
    $typeLabel = strtoupper($slot['fileType']);
    ?>
    <section class="concert-row">
      <div class="concert-row__head">
        <h2><?= escape_html($slot['label']) ?></h2>
        <?php if ($path !== ''): ?>
          <label class="remove-toggle">
            <input type="checkbox" name="slots[<?= escape_html($id) ?>][remove]" value="1">
            <span>Datei entfernen</span>
          </label>
        <?php endif; ?>
      </div>

      <div class="concert-grid">
        <div class="field field--wide">
          <span>Aktuelle Datei</span>
          <?php if ($path !== ''): ?>
            <a class="admin-link" href="../<?= escape_html($path) ?>" target="_blank" rel="noopener">
              <?= $fileExists ? 'Datei öffnen' : 'Gespeicherten Pfad prüfen' ?>
            </a>
            <code><?= escape_html($path) ?></code>
            <?php if (!$fileExists): ?>
              <small class="field-help">Die hinterlegte Datei wurde im Dateisystem nicht gefunden.</small>
            <?php endif; ?>
          <?php else: ?>
            <p class="admin-muted">Keine Datei hinterlegt. Die öffentliche Karte bleibt bestehen und ist vorübergehend deaktiviert.</p>
          <?php endif; ?>
        </div>

        <label class="field field--wide">
          <span><?= $path === '' ? $typeLabel . '-Datei hochladen' : $typeLabel . '-Datei ersetzen (optional)' ?></span>
          <input type="file" name="replace_<?= escape_html($id) ?>"
            accept=".<?= escape_html($slot['fileType']) ?>,<?= $slot['fileType'] === 'pdf' ? 'application/pdf' : 'application/zip,application/x-zip-compressed' ?>">
          <small class="field-help">Nur die Datei dieses festen Materials wird geändert. Bezeichnung, Position und Gestaltung bleiben unverändert.</small>
        </label>
      </div>
    </section>
    <?php
}

$root = dirname(__DIR__);
$items = booking_downloads_load($root . '/data/booking-downloads.json');
?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Booking-Material | Mélange à Deux &amp; Amis</title>
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <link rel="icon" href="favicon.svg" sizes="any">
  <script src="admin-theme.js"></script>
  <link rel="stylesheet" href="admin.css">
</head>
<body class="admin-page">
<?php render_admin_layout_open('booking-material'); ?>
  <header class="admin-content-header">
    <p class="admin-kicker">Booking-Material</p>
    <h1>Booking-Material verwalten</h1>
    <p class="admin-muted">Die sieben Karten auf der Booking-Seite sind fest. Hier wird ausschließlich die jeweils zugehörige PDF- oder ZIP-Datei ersetzt oder entfernt.</p>
  </header>

  <?php if (isset($_GET['saved'])): ?>
    <p class="admin-message admin-message--success">Das Booking-Material wurde gespeichert.</p>
  <?php endif; ?>

  <?php if ($items === null): ?>
    <p class="admin-message admin-message--error">Die Download-Daten konnten nicht gelesen werden. Speichern ist deaktiviert.</p>
  <?php else: ?>
    <form method="post" action="save-booking-downloads.php" enctype="multipart/form-data">
      <input type="hidden" name="csrf_token" value="<?= escape_html(csrf_token()) ?>">

      <?php foreach (BOOKING_DOWNLOAD_SLOTS as $id => $slot): ?>
        <?php render_booking_download_slot($id, $slot, $items[$id] ?? [], $root); ?>
      <?php endforeach; ?>

      <div class="admin-actions">
        <button class="admin-button" type="submit">Booking-Material speichern</button>
      </div>
    </form>
  <?php endif; ?>
<?php render_admin_layout_close(); ?>
</body>
</html>
