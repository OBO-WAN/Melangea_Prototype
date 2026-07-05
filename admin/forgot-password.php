<?php

declare(strict_types=1);

require __DIR__ . '/auth.php';

if (is_authenticated()) {
    redirect_to_admin();
}

$genericMessage = 'Wenn die E-Mail-Adresse bekannt ist, wurde ein Link zum Zurücksetzen des Passworts gesendet.';
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = isset($_POST['email']) && is_string($_POST['email']) ? trim($_POST['email']) : '';

    if (!verify_csrf_token(isset($_POST['csrf_token']) && is_string($_POST['csrf_token']) ? $_POST['csrf_token'] : null)) {
        $error = 'Die Anfrage konnte nicht überprüft werden. Bitte versuchen Sie es erneut.';
    } else {
        $adminEmail = get_admin_email();

        if ($adminEmail !== '' && hash_equals(strtolower($adminEmail), strtolower($email))) {
            $token = create_password_reset_token();

            if (is_string($token)) {
                send_password_reset_email($token);
            }
        }

        $message = $genericMessage;
    }
}
?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Passwort vergessen | Mélange à Deux &amp; Amis</title>
  <script src="admin-theme.js"></script>
  <link rel="stylesheet" href="admin.css">
</head>
<body class="admin-page admin-page--login">
  <main class="admin-login" aria-labelledby="forgot-password-title">
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
    <h1 id="forgot-password-title">Passwort vergessen?</h1>
    <p class="admin-muted">Geben Sie die hinterlegte Admin-E-Mail-Adresse ein.</p>

    <?php if ($message !== ''): ?>
      <p class="admin-message admin-message--success"><?= escape_html($message) ?></p>
    <?php endif; ?>

    <?php if ($error !== ''): ?>
      <p class="admin-message admin-message--error"><?= escape_html($error) ?></p>
    <?php endif; ?>

    <form method="post" action="forgot-password.php" class="admin-card">
      <input type="hidden" name="csrf_token" value="<?= escape_html(csrf_token()) ?>">
      <label for="email">Admin-E-Mail-Adresse</label>
      <input type="email" id="email" name="email" autocomplete="email" required autofocus>
      <button type="submit" class="admin-button">Link senden</button>
    </form>
    <p class="admin-login__link"><a href="login.php">Zurück zum Login</a></p>
  </main>
</body>
</html>
