<?php

declare(strict_types=1);

require __DIR__ . '/auth.php';

if (is_authenticated()) {
    redirect_to_admin();
}

$token = isset($_GET['token']) && is_string($_GET['token']) ? $_GET['token'] : '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = isset($_POST['token']) && is_string($_POST['token']) ? $_POST['token'] : '';
}

$error = '';
$message = '';
$tokenIsValid = $token !== '' && is_valid_password_reset_token($token);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = isset($_POST['password']) && is_string($_POST['password']) ? $_POST['password'] : '';
    $passwordConfirmation = isset($_POST['password_confirmation']) && is_string($_POST['password_confirmation']) ? $_POST['password_confirmation'] : '';

    if (!verify_csrf_token(isset($_POST['csrf_token']) && is_string($_POST['csrf_token']) ? $_POST['csrf_token'] : null)) {
        $error = 'Die Anfrage konnte nicht überprüft werden. Bitte versuchen Sie es erneut.';
    } elseif (!$tokenIsValid) {
        $error = 'Der Link ist ungültig oder abgelaufen.';
    } elseif (strlen($password) < 12) {
        $error = 'Bitte wählen Sie ein Passwort mit mindestens 12 Zeichen.';
    } elseif ($password !== $passwordConfirmation) {
        $error = 'Die Passwörter stimmen nicht überein.';
    } elseif (!update_admin_password_hash(password_hash($password, PASSWORD_DEFAULT))) {
        $error = 'Das neue Passwort konnte nicht gespeichert werden.';
    } else {
        clear_password_reset_record();
        session_regenerate_id(true);
        $message = 'Das Passwort wurde aktualisiert. Sie können sich jetzt anmelden.';
        $tokenIsValid = false;
    }
}
?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Passwort zurücksetzen | Mélange à Deux &amp; Amis</title>
  <script src="admin-theme.js"></script>
  <link rel="stylesheet" href="admin.css">
</head>
<body class="admin-page admin-page--login">
  <main class="admin-login" aria-labelledby="reset-password-title">
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
    <h1 id="reset-password-title">Passwort zurücksetzen</h1>
    <p class="admin-muted">Wählen Sie ein neues Admin-Passwort.</p>

    <?php if ($message !== ''): ?>
      <p class="admin-message admin-message--success"><?= escape_html($message) ?></p>
      <p class="admin-login__link"><a href="login.php">Zum Login</a></p>
    <?php elseif (!$tokenIsValid && $error === ''): ?>
      <p class="admin-message admin-message--error">Der Link ist ungültig oder abgelaufen.</p>
      <p class="admin-login__link"><a href="forgot-password.php">Neuen Link anfordern</a></p>
    <?php else: ?>
      <?php if ($error !== ''): ?>
        <p class="admin-message admin-message--error"><?= escape_html($error) ?></p>
      <?php endif; ?>

      <form method="post" action="reset-password.php" class="admin-card">
        <input type="hidden" name="csrf_token" value="<?= escape_html(csrf_token()) ?>">
        <input type="hidden" name="token" value="<?= escape_html($token) ?>">
        <label for="password">Neues Passwort</label>
        <input type="password" id="password" name="password" autocomplete="new-password" minlength="12" required autofocus>
        <label for="password_confirmation">Neues Passwort wiederholen</label>
        <input type="password" id="password_confirmation" name="password_confirmation" autocomplete="new-password" minlength="12" required>
        <button type="submit" class="admin-button">Passwort speichern</button>
      </form>
    <?php endif; ?>
  </main>
</body>
</html>
