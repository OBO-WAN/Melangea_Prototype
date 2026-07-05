<?php

declare(strict_types=1);

ini_set('display_errors', '0');

session_start();

const ADMIN_SESSION_KEY = 'melange_admin_authenticated';
const CSRF_SESSION_KEY = 'melange_admin_csrf_token';
const RESET_TOKEN_LIFETIME_SECONDS = 3600;

function get_admin_config(): array
{
    $config = [];
    $localConfigPath = __DIR__ . '/config.local.php';

    if (is_file($localConfigPath)) {
        $localConfig = require $localConfigPath;

        if (is_array($localConfig)) {
            $config = $localConfig;
        }
    }

    return $config;
}

function get_config_string(string $key, string $environmentKey = ''): string
{
    $environmentValue = getenv($environmentKey !== '' ? $environmentKey : $key);

    if (is_string($environmentValue) && $environmentValue !== '') {
        return $environmentValue;
    }

    $config = get_admin_config();

    if (isset($config[$key]) && is_string($config[$key]) && $config[$key] !== '') {
        return $config[$key];
    }

    return '';
}

function get_admin_password_hash(): string
{
    return get_config_string('ADMIN_PASSWORD_HASH');
}

function get_admin_email(): string
{
    return get_config_string('ADMIN_EMAIL');
}

function get_password_reset_from_email(): string
{
    $configuredSender = get_config_string('ADMIN_PASSWORD_RESET_FROM_EMAIL');

    if ($configuredSender !== '') {
        return $configuredSender;
    }

    return get_admin_email();
}

function get_admin_base_url(): string
{
    $configuredBaseUrl = rtrim(get_config_string('ADMIN_BASE_URL'), '/');

    if ($configuredBaseUrl !== '') {
        return $configuredBaseUrl;
    }

    $https = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== '' && $_SERVER['HTTPS'] !== 'off';
    $scheme = $https ? 'https' : 'http';
    $host = isset($_SERVER['HTTP_HOST']) && is_string($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '';
    $scriptDirectory = isset($_SERVER['SCRIPT_NAME']) && is_string($_SERVER['SCRIPT_NAME'])
        ? str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME']))
        : '/admin';

    if ($host === '') {
        return '';
    }

    return $scheme . '://' . $host . rtrim($scriptDirectory, '/');
}

function is_authenticated(): bool
{
    return !empty($_SESSION[ADMIN_SESSION_KEY]);
}

function require_authentication(): void
{
    if (!is_authenticated()) {
        header('Location: login.php');
        exit;
    }
}

function redirect_to_admin(string $query = ''): void
{
    $location = 'index.php' . $query;
    header('Location: ' . $location);
    exit;
}

function csrf_token(): string
{
    if (empty($_SESSION[CSRF_SESSION_KEY]) || !is_string($_SESSION[CSRF_SESSION_KEY])) {
        $_SESSION[CSRF_SESSION_KEY] = bin2hex(random_bytes(32));
    }

    return $_SESSION[CSRF_SESSION_KEY];
}

function verify_csrf_token(?string $token): bool
{
    if (!is_string($token) || empty($_SESSION[CSRF_SESSION_KEY]) || !is_string($_SESSION[CSRF_SESSION_KEY])) {
        return false;
    }

    return hash_equals($_SESSION[CSRF_SESSION_KEY], $token);
}

function escape_html(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function password_reset_storage_path(): string
{
    return __DIR__ . '/password-reset.local.php';
}

function read_password_reset_record(): array
{
    $path = password_reset_storage_path();

    if (!is_file($path)) {
        return [];
    }

    $record = require $path;

    return is_array($record) ? $record : [];
}

function write_password_reset_record(array $record): bool
{
    $path = password_reset_storage_path();
    $content = "<?php\n\ndeclare(strict_types=1);\n\nreturn " . var_export($record, true) . ";\n";

    $written = file_put_contents($path, $content, LOCK_EX);

    if ($written === false) {
        return false;
    }

    @chmod($path, 0600);

    return true;
}

function clear_password_reset_record(): void
{
    $path = password_reset_storage_path();

    if (is_file($path)) {
        @unlink($path);
    }
}

function create_password_reset_token(): ?string
{
    $token = bin2hex(random_bytes(32));

    if (!write_password_reset_record([
        'token_hash' => hash('sha256', $token),
        'expires_at' => time() + RESET_TOKEN_LIFETIME_SECONDS,
    ])) {
        return null;
    }

    return $token;
}

function is_valid_password_reset_token(string $token): bool
{
    $record = read_password_reset_record();

    if (
        !isset($record['token_hash'], $record['expires_at'])
        || !is_string($record['token_hash'])
        || !is_int($record['expires_at'])
        || $record['expires_at'] < time()
    ) {
        return false;
    }

    return hash_equals($record['token_hash'], hash('sha256', $token));
}

function send_password_reset_email(string $token): bool
{
    $adminEmail = get_admin_email();
    $baseUrl = get_admin_base_url();

    if ($adminEmail === '' || $baseUrl === '') {
        return false;
    }

    $resetUrl = $baseUrl . '/reset-password.php?token=' . rawurlencode($token);
    $subject = 'Passwort zurücksetzen | Mélange à Deux & Amis';
    $message = "Hallo,\n\nüber diesen Link können Sie das Admin-Passwort zurücksetzen:\n" . $resetUrl . "\n\nDer Link ist 60 Minuten gültig. Wenn Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.\n";
    $headers = [
        'Content-Type: text/plain; charset=UTF-8',
    ];
    $fromEmail = get_password_reset_from_email();

    if ($fromEmail !== '') {
        $headers[] = 'From: ' . $fromEmail;
    }

    return mail($adminEmail, $subject, $message, implode("\r\n", $headers));
}

function update_admin_password_hash(string $passwordHash): bool
{
    $environmentHash = getenv('ADMIN_PASSWORD_HASH');

    if (is_string($environmentHash) && $environmentHash !== '') {
        return false;
    }

    $localConfigPath = __DIR__ . '/config.local.php';
    $config = get_admin_config();
    $config['ADMIN_PASSWORD_HASH'] = $passwordHash;
    $content = "<?php\n\ndeclare(strict_types=1);\n\nreturn " . var_export($config, true) . ";\n";
    $written = file_put_contents($localConfigPath, $content, LOCK_EX);

    if ($written === false) {
        return false;
    }

    @chmod($localConfigPath, 0600);

    return true;
}
