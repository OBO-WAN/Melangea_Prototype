<?php

declare(strict_types=1);

require __DIR__ . '/auth.php';
require_authentication();
require __DIR__ . '/layout.php';

const PRESSE_JSON_RELATIVE = 'data/presse.json';
const PRESSE_IMAGE_PATTERN = '#^assets/IMG/news/(?:managed/)?[A-Za-z0-9._-]+\.(?:webp|jpe?g|png)$#i';

function presse_clean_text($value, int $limit): string
{
    $text = is_scalar($value) ? (string) $value : '';
    $text = str_replace(["\r\n", "\r"], "\n", $text);
    $text = strip_tags($text);
    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text) ?? '';

    if (function_exists('mb_substr')) {
        return mb_substr($text, 0, $limit, 'UTF-8');
    }
    if (preg_match_all('/./us', $text, $characters) === 1) {
        return implode('', array_slice($characters[0], 0, $limit));
    }
    return substr($text, 0, $limit);
}

function presse_single_line($value, int $limit): string
{
    $text = trim(presse_clean_text($value, $limit));
    return trim((string) preg_replace('/\s+/u', ' ', $text));
}

function presse_title_fields($titleValue, $subtitleValue): array
{
    $rawTitle = trim(presse_clean_text($titleValue, 480));
    $subtitle = presse_single_line($subtitleValue, 240);
    $lines = preg_split('/\n+/u', $rawTitle, -1, PREG_SPLIT_NO_EMPTY) ?: [];
    $title = presse_single_line(array_shift($lines) ?? '', 240);

    if ($subtitle === '' && $lines) {
        $subtitle = presse_single_line(implode(' ', $lines), 240);
    }

    return [$title, $subtitle];
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
    return preg_match(PRESSE_IMAGE_PATTERN, $image) === 1
        && !str_contains($image, '..')
        && !str_contains($image, '\\');
}

function presse_load(string $path, ?string &$error): ?array
{
    if (!is_file($path) || !is_readable($path)) {
        $error = 'Die Datei data/presse.json konnte nicht gelesen werden.';
        return null;
    }

    $decoded = json_decode((string) file_get_contents($path), true);
    if (!is_array($decoded)) {
        $error = 'Die News-Daten sind ungültig.';
        return null;
    }

    $ids = [];
    $articles = [];
    foreach ($decoded as $item) {
        if (!is_array($item)) {
            $error = 'Ein News-Beitrag ist ungültig.';
            return null;
        }

        $id = presse_single_line($item['id'] ?? '', 80);
        $date = presse_single_line($item['date'] ?? '', 10);
        [$title, $subtitle] = presse_title_fields($item['title'] ?? '', $item['subtitle'] ?? '');
        $image = presse_single_line($item['image'] ?? '', 255);
        $text = trim(presse_clean_text($item['text'] ?? '', 20000));

        if (!preg_match('/^[a-z0-9][a-z0-9_-]{0,79}$/i', $id)
            || isset($ids[$id])
            || !presse_valid_date($date)
            || $title === ''
            || !presse_valid_image($image)
            || $text === '') {
            $error = 'Eine News-ID, ein Datum, ein Bildpfad oder ein Textinhalt ist ungültig.';
            return null;
        }

        $ids[$id] = true;
        $articles[] = [
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

function presse_heading(string $title): string
{
    return trim((string) preg_replace('/\s+/u', ' ', $title));
}

function render_presse_article(array $article, string $root): void
{
    $prefix = 'articles[' . escape_html($article['id']) . ']';
    $imageExists = is_file($root . '/' . $article['image']);
    $imageAlt = trim($article['title'] . ' ' . $article['subtitle']);
    ?>
    <section class="concert-row">
      <div class="concert-row__head">
        <h2><?= escape_html(presse_heading($article['title'])) ?></h2>
        <label class="remove-toggle">
          <input type="checkbox" name="<?= $prefix ?>[remove]" value="1">
          <span>Beitrag löschen</span>
        </label>
      </div>

      <div class="media-admin-grid">
        <div>
          <img class="media-admin-thumb" src="../<?= escape_html($article['image']) ?>"
            alt="<?= escape_html($imageAlt) ?>">
          <?php if (!$imageExists): ?>
            <small class="field-help">Das hinterlegte Bild wurde im Dateisystem nicht gefunden.</small>
          <?php endif; ?>
        </div>

        <div class="concert-grid">
          <input type="hidden" name="<?= $prefix ?>[id]" value="<?= escape_html($article['id']) ?>">
          <input type="hidden" name="<?= $prefix ?>[image]" value="<?= escape_html($article['image']) ?>">

          <label class="field">
            <span>Datum (optional)</span>
            <input type="date" name="<?= $prefix ?>[date]" value="<?= escape_html($article['date']) ?>">
          </label>

          <label class="field">
            <span>Gespeicherter Bildpfad</span>
            <input type="text" value="<?= escape_html($article['image']) ?>" readonly>
          </label>

          <label class="field field--wide">
            <span>Titel</span>
            <input type="text" name="<?= $prefix ?>[title]" value="<?= escape_html($article['title']) ?>" maxlength="240" required>
          </label>

          <label class="field field--wide">
            <span>Untertitel (optional)</span>
            <input type="text" name="<?= $prefix ?>[subtitle]" value="<?= escape_html($article['subtitle']) ?>" maxlength="240">
            <small class="field-help">Wird auf der News-Seite kleiner unter dem Titel dargestellt.</small>
          </label>

          <label class="field field--wide">
            <span>Text</span>
            <textarea name="<?= $prefix ?>[text]" rows="12" maxlength="20000" required><?= escape_html($article['text']) ?></textarea>
            <small class="field-help">Eine Leerzeile erzeugt einen neuen Absatz.</small>
          </label>

          <label class="field field--wide">
            <span>Bild ersetzen (optional)</span>
            <input type="file" name="replace_<?= escape_html($article['id']) ?>"
              accept=".webp,.jpg,.jpeg,.png,image/webp,image/jpeg,image/png">
          </label>
        </div>
      </div>
    </section>
    <?php
}

$root = dirname(__DIR__);
$loadError = null;
$articles = presse_load($root . '/' . PRESSE_JSON_RELATIVE, $loadError);
?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>News verwalten | Mélange à Deux &amp; Amis</title>
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <link rel="icon" href="favicon.svg" sizes="any">
  <script src="admin-theme.js"></script>
  <link rel="stylesheet" href="admin.css">
</head>
<body class="admin-page">
<?php render_admin_layout_open('presse'); ?>
  <header class="admin-content-header">
    <p class="admin-kicker">News</p>
    <h1>News-Beiträge verwalten</h1>
    <p class="admin-muted">Beiträge auf <code>presse.html</code> hinzufügen, bearbeiten oder löschen. Datum und Untertitel dürfen leer bleiben.</p>
  </header>

  <?php if (isset($_GET['saved'])): ?>
    <p class="admin-message admin-message--success">Die News-Beiträge wurden gespeichert.</p>
  <?php endif; ?>

  <?php if ($articles === null): ?>
    <p class="admin-message admin-message--error"><?= escape_html($loadError ?? 'Die News-Daten konnten nicht gelesen werden.') ?></p>
  <?php else: ?>
    <form method="post" action="save-presse.php" enctype="multipart/form-data">
      <input type="hidden" name="csrf_token" value="<?= escape_html(csrf_token()) ?>">

      <?php foreach ($articles as $article): ?>
        <?php render_presse_article($article, $root); ?>
      <?php endforeach; ?>

      <section class="concert-row">
        <div class="concert-row__head">
          <h2>Neuen Beitrag hinzufügen</h2>
        </div>

        <div class="concert-grid">
          <label class="field">
            <span>Datum (optional)</span>
            <input type="date" name="new_date">
          </label>

          <label class="field">
            <span>Bild</span>
            <input type="file" name="new_image" accept=".webp,.jpg,.jpeg,.png,image/webp,image/jpeg,image/png">
          </label>

          <label class="field field--wide">
            <span>Titel</span>
            <input type="text" name="new_title" maxlength="240">
          </label>

          <label class="field field--wide">
            <span>Untertitel (optional)</span>
            <input type="text" name="new_subtitle" maxlength="240">
            <small class="field-help">Wird auf der News-Seite kleiner unter dem Titel dargestellt.</small>
          </label>

          <label class="field field--wide">
            <span>Text</span>
            <textarea name="new_text" rows="12" maxlength="20000"></textarea>
            <small class="field-help">Für einen neuen Beitrag sind Titel, Bild und Text erforderlich. Datum und Untertitel sind freiwillig.</small>
          </label>
        </div>
      </section>

      <div class="admin-actions">
        <button class="admin-button" type="submit">News-Beiträge speichern</button>
      </div>
    </form>
  <?php endif; ?>
<?php render_admin_layout_close(); ?>
</body>
</html>
