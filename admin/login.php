<?php

declare(strict_types=1);

require __DIR__ . '/auth.php';

if (is_authenticated()) {
    redirect_to_admin();
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = isset($_POST['password']) && is_string($_POST['password']) ? $_POST['password'] : '';

    if (password_verify($password, get_admin_password_hash())) {
        session_regenerate_id(true);
        $_SESSION[ADMIN_SESSION_KEY] = true;
        redirect_to_admin();
    }

    $error = 'Das Passwort ist nicht korrekt.';
}
?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Admin-Login | Mélange à Deux &amp; Amis</title>
  <script src="admin-theme.js"></script>
  <link rel="stylesheet" href="admin.css">
</head>
<body class="admin-page admin-page--login">
  <main class="admin-login" aria-labelledby="login-title">
    <div class="admin-login__theme">
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
    </div>
    <h1 id="login-title">Konzertverwaltung</h1>
    <p class="admin-muted">Bitte melden Sie sich an, um Konzerttermine zu bearbeiten.</p>

    <?php if ($error !== ''): ?>
      <p class="admin-message admin-message--error"><?= escape_html($error) ?></p>
    <?php endif; ?>

    <form method="post" action="login.php" class="admin-card">
      <label for="password">Passwort</label>
      <input type="password" id="password" name="password" autocomplete="current-password" required autofocus>
      <button type="submit" class="admin-button">Einloggen</button>
    </form>
  </main>
</body>
</html>
