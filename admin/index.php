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

function german_date_to_input_date(string $date): string
{
    if (preg_match('/^(\d{2})\.(\d{2})\.(\d{4})$/', $date, $matches)) {
        return $matches[3] . '-' . $matches[2] . '-' . $matches[1];
    }

    return '';
}

function split_german_time(string $time): array
{
    if (preg_match('/^([01]\d|2[0-3]):([0-5]\d)(?: Uhr)?$/', trim($time), $matches)) {
        return [$matches[1], $matches[2]];
    }

    return ['19', '30'];
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
          <?php if ($key === 'time'): ?>
            <?php [$selectedHour, $selectedMinute] = split_german_time(concert_value($concert, $key)); ?>
            <div class="field field--normal">
              <span><?= escape_html($label) ?></span>
              <div class="time-select" role="group" aria-label="Uhrzeit">
                <label class="time-select__field">
                  <span class="sr-only">Stunde</span>
                  <select name="<?= escape_html($namePrefix) ?>[hour]"<?= $disabledAttribute ?>>
                    <?php for ($hour = 0; $hour <= 23; $hour++): ?>
                      <?php $hourValue = str_pad((string) $hour, 2, '0', STR_PAD_LEFT); ?>
                      <option value="<?= escape_html($hourValue) ?>" <?= $selectedHour === $hourValue ? 'selected' : '' ?>><?= escape_html($hourValue) ?></option>
                    <?php endfor; ?>
                  </select>
                </label>
                <span class="time-select__separator" aria-hidden="true">:</span>
                <label class="time-select__field">
                  <span class="sr-only">Minute</span>
                  <select name="<?= escape_html($namePrefix) ?>[minute]"<?= $disabledAttribute ?>>
                    <?php foreach (['00', '15', '30', '45'] as $minuteValue): ?>
                      <option value="<?= escape_html($minuteValue) ?>" <?= $selectedMinute === $minuteValue ? 'selected' : '' ?>><?= escape_html($minuteValue) ?></option>
                    <?php endforeach; ?>
                  </select>
                </label>
                <span class="time-select__suffix">Uhr</span>
              </div>
              <small class="field-help">Stunde und Viertelstunde direkt auswählen.</small>
            </div>
          <?php else: ?>
            <label class="field field--<?= $key === 'description' ? 'wide' : 'normal' ?>">
              <span><?= escape_html($label) ?></span>
              <?php if ($key === 'description'): ?>
                <textarea name="<?= escape_html($namePrefix) ?>[<?= escape_html($key) ?>]" rows="3"<?= $disabledAttribute ?>><?= escape_html(concert_value($concert, $key)) ?></textarea>
              <?php elseif ($key === 'date'): ?>
                <input type="date" name="<?= escape_html($namePrefix) ?>[<?= escape_html($key) ?>]" value="<?= escape_html(german_date_to_input_date(concert_value($concert, $key))) ?>"<?= $disabledAttribute ?>>
                <small class="field-help">Datum über den Kalender auswählen.</small>
              <?php else: ?>
                <input type="text" name="<?= escape_html($namePrefix) ?>[<?= escape_html($key) ?>]" value="<?= escape_html(concert_value($concert, $key)) ?>"<?= $disabledAttribute ?>>
              <?php endif; ?>
            </label>
          <?php endif; ?>
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
      <button type="button" class="admin-theme-toggle" data-theme-toggle aria-pressed="false" aria-label="Dunkelmodus aktivieren">
        <span class="admin-theme-toggle__icon admin-theme-toggle__icon--moon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false" role="img">
            <path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5a7 7 0 1 0 11.7 11.7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <span class="admin-theme-toggle__icon admin-theme-toggle__icon--sun" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false" role="img">
            <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/>
            <path d="M12 2.8v2.1M12 19.1v2.1M21.2 12h-2.1M4.9 12H2.8M18.5 5.5 17 7M7 17l-1.5 1.5M18.5 18.5 17 17M7 7 5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </span>
      </button>
      <a class="admin-link" href="media.php">Medien</a>
      <a class="admin-link" href="booking-downloads.php">Booking-Material</a>
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
