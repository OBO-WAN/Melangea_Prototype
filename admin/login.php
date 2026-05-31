<?php

declare(strict_types=1);

require __DIR__ . '/auth.php';

if (is_authenticated()) {
    redirect_to_admin();
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = isset($_POST['password']) && is_string($_POST['password']) ? $_POST['password'] : '';

    if (password_verify($password, ADMIN_PASSWORD_HASH)) {
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
  <link rel="stylesheet" href="admin.css">
</head>
<body class="admin-page admin-page--login">
  <main class="admin-login" aria-labelledby="login-title">
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
