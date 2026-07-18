<?php

declare(strict_types=1);

/** Shared authenticated administration chrome. */
function admin_booking_target_exists(): bool
{
    return is_file(__DIR__ . '/booking.php');
}

function render_admin_layout_open(string $activeSection): void
{
    $sections = [
        'concerts' => ['label' => 'Konzerte', 'href' => 'index.php'],
        'media' => ['label' => 'Medien', 'href' => 'media.php'],
        'presse' => ['label' => 'News', 'href' => 'presse.php'],
    ];

    if (admin_booking_target_exists()) {
        $sections['booking'] = ['label' => 'Booking', 'href' => 'booking.php'];
    }

    $sections['booking-material'] = ['label' => 'Booking-Material', 'href' => 'booking-downloads.php'];
    ?>
    <header class="admin-utility-bar">
      <div class="admin-utility-bar__inner">
        <p class="admin-brand">Mélange à Deux &amp; Amis</p>
        <div class="admin-utility-bar__actions">
          <button type="button" class="admin-theme-toggle" data-theme-toggle aria-pressed="false" aria-label="Dunkelmodus aktivieren">
            <span class="admin-theme-toggle__icon admin-theme-toggle__icon--moon" aria-hidden="true">◐</span>
            <span class="admin-theme-toggle__icon admin-theme-toggle__icon--sun" aria-hidden="true">☀</span>
          </button>
          <a class="admin-link" href="logout.php">Ausloggen</a>
        </div>
      </div>
    </header>
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <nav class="admin-sidebar__nav" aria-label="Admin-Bereiche">
          <?php foreach ($sections as $key => $section): ?>
            <a class="admin-sidebar__link" href="<?= escape_html($section['href']) ?>"<?= $key === $activeSection ? ' aria-current="page"' : '' ?>><?= escape_html($section['label']) ?></a>
          <?php endforeach; ?>
        </nav>
      </aside>
      <main class="admin-main">
    <?php
}

function render_admin_layout_close(): void
{
    echo "      </main>\n    </div>\n";
}
