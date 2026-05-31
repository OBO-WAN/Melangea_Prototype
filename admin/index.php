<?php

declare(strict_types=1);

require __DIR__ . '/auth.php';
require_authentication();

$concertsPath = dirname(__DIR__) . '/data/concerts.json';
$concerts = [];
$loadError = '';

if (is_file($concertsPath)) {
    $json = file_get_contents($concertsPath);
    $decoded = json_decode($json !== false ? $json : '', true);

    if (is_array($decoded)) {
        $concerts = $decoded;
    } else {
        $loadError = 'Die Konzertdaten konnten nicht gelesen werden.';
    }
} else {
    $loadError = 'Die Datei data/concerts.json wurde nicht gefunden.';
}

$fields = [
    'date' => 'Datum',
    'time' => 'Uhrzeit',
    'title' => 'Titel',
    'venue' => 'Spielort',
    'city' => 'Stadt',
    'description' => 'Beschreibung',
    'detailsUrl' => 'Details-Link',
    'ticketsUrl' => 'Tickets-Link',
];

$emptyConcert = [
    'date' => '',
    'time' => '19:30 Uhr',
    'title' => 'Konzert',
    'venue' => '',
    'city' => '',
    'description' => '',
    'detailsUrl' => '#',
    'ticketsUrl' => '#',
    'status' => 'upcoming',
];

function concert_value(array $concert, string $key): string
{
    return isset($concert[$key]) && is_scalar($concert[$key]) ? (string) $concert[$key] : '';
}

function render_concert_row(array $concert, $index, array $fields, bool $isTemplate = false): void
{
    $rowClass = $isTemplate ? 'concert-row concert-row--template' : 'concert-row';
    $namePrefix = $isTemplate ? 'concerts[__INDEX__]' : 'concerts[' . $index . ']';
    $disabledAttribute = $isTemplate ? ' disabled' : '';
    ?>
    <section class="<?= escape_html($rowClass) ?>" data-concert-row <?= $isTemplate ? 'hidden' : '' ?>>
      <div class="concert-row__head">
        <h2><?= $isTemplate ? 'Neuer Konzerttermin' : 'Konzert ' . escape_html((string) ((int) $index + 1)) ?></h2>
        <label class="remove-toggle">
          <input type="checkbox" name="<?= escape_html($namePrefix) ?>[remove]" value="1" data-remove-toggle<?= $disabledAttribute ?>>
          <span>Diesen Termin entfernen</span>
        </label>
      </div>

      <div class="concert-grid">
        <?php foreach ($fields as $key => $label): ?>
          <label class="field field--<?= $key === 'description' ? 'wide' : 'normal' ?>">
            <span><?= escape_html($label) ?></span>
            <?php if ($key === 'description'): ?>
              <textarea name="<?= escape_html($namePrefix) ?>[<?= escape_html($key) ?>]" rows="3"<?= $disabledAttribute ?>><?= escape_html(concert_value($concert, $key)) ?></textarea>
            <?php else: ?>
              <input type="text" name="<?= escape_html($namePrefix) ?>[<?= escape_html($key) ?>]" value="<?= escape_html(concert_value($concert, $key)) ?>"<?= $disabledAttribute ?>>
            <?php endif; ?>
          </label>
        <?php endforeach; ?>

        <label class="field">
          <span>Status</span>
          <?php $status = concert_value($concert, 'status') ?: 'upcoming'; ?>
          <select name="<?= escape_html($namePrefix) ?>[status]"<?= $disabledAttribute ?>>
            <option value="upcoming" <?= $status === 'upcoming' ? 'selected' : '' ?>>upcoming</option>
            <option value="past" <?= $status === 'past' ? 'selected' : '' ?>>past</option>
            <option value="cancelled" <?= $status === 'cancelled' ? 'selected' : '' ?>>cancelled</option>
          </select>
        </label>
      </div>
    </section>
    <?php
}
?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Konzertverwaltung | Mélange à Deux &amp; Amis</title>
  <script src="admin-theme.js"></script>
  <link rel="stylesheet" href="admin.css">
</head>
<body class="admin-page">
  <header class="admin-header">
    <div>
      <p class="admin-kicker">Mélange à Deux &amp; Amis</p>
      <h1>Konzerttermine bearbeiten</h1>
      <p class="admin-muted">Die Daten werden direkt aus <code>data/concerts.json</code> geladen.</p>
    </div>
    <div class="admin-header__actions">
      <button type="button" class="admin-theme-toggle" data-theme-toggle aria-pressed="false">Dunkel</button>
      <a class="admin-link" href="logout.php">Ausloggen</a>
    </div>
  </header>

  <main class="admin-main">
    <?php if (isset($_GET['saved']) && $_GET['saved'] === '1'): ?>
      <p class="admin-message admin-message--success">Die Konzerte wurden gespeichert.</p>
    <?php endif; ?>

    <?php if ($loadError !== ''): ?>
      <p class="admin-message admin-message--error"><?= escape_html($loadError) ?></p>
    <?php endif; ?>

    <form method="post" action="save-concerts.php" id="concert-form">
      <input type="hidden" name="csrf_token" value="<?= escape_html(csrf_token()) ?>">

      <div id="concert-rows">
        <?php foreach ($concerts as $index => $concert): ?>
          <?php render_concert_row(is_array($concert) ? $concert : [], $index, $fields); ?>
        <?php endforeach; ?>
      </div>

      <?php render_concert_row($emptyConcert, '__INDEX__', $fields, true); ?>

      <div class="admin-actions">
        <button type="button" class="admin-button admin-button--secondary" id="add-concert">Neuen Termin hinzufügen</button>
        <button type="submit" class="admin-button">Konzerte speichern</button>
      </div>
    </form>
  </main>

  <script>
    (function () {
      const rows = document.getElementById('concert-rows');
      const template = document.querySelector('[data-concert-row].concert-row--template');
      const addButton = document.getElementById('add-concert');
      let nextIndex = <?= json_encode(count($concerts), JSON_THROW_ON_ERROR) ?>;

      const setRowFieldsDisabled = (row, disabled) => {
        row.querySelectorAll('input, textarea, select').forEach((field) => {
          field.disabled = disabled;
        });
      };

      setRowFieldsDisabled(template, true);

      const updateRowState = (row) => {
        const checkbox = row.querySelector('[data-remove-toggle]');
        if (!checkbox) return;
        row.classList.toggle('concert-row--removed', checkbox.checked);
      };

      document.addEventListener('change', (event) => {
        if (!event.target.matches('[data-remove-toggle]')) return;
        updateRowState(event.target.closest('[data-concert-row]'));
      });

      document.getElementById('concert-form').addEventListener('submit', () => {
        rows.querySelectorAll('[data-remove-toggle]:checked').forEach((checkbox) => {
          checkbox.closest('[data-concert-row]').remove();
        });
      });

      addButton.addEventListener('click', () => {
        const clone = template.cloneNode(true);
        clone.hidden = false;
        clone.classList.remove('concert-row--template');
        clone.innerHTML = clone.innerHTML.replaceAll('__INDEX__', String(nextIndex));
        setRowFieldsDisabled(clone, false);
        clone.querySelector('h2').textContent = 'Neuer Konzerttermin';
        rows.append(clone);
        nextIndex += 1;
        clone.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    })();
  </script>
</body>
</html>
