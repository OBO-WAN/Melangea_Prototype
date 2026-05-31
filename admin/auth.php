<?php

declare(strict_types=1);

ini_set('display_errors', '0');

session_start();

const ADMIN_SESSION_KEY = 'melange_admin_authenticated';
const CSRF_SESSION_KEY = 'melange_admin_csrf_token';

function get_admin_password_hash(): string
{
    $environmentHash = getenv('ADMIN_PASSWORD_HASH');

    if (is_string($environmentHash) && $environmentHash !== '') {
        return $environmentHash;
    }

    $localConfigPath = __DIR__ . '/config.local.php';

    if (is_file($localConfigPath)) {
        $localConfig = require $localConfigPath;

        if (
            is_array($localConfig)
            && isset($localConfig['ADMIN_PASSWORD_HASH'])
            && is_string($localConfig['ADMIN_PASSWORD_HASH'])
            && $localConfig['ADMIN_PASSWORD_HASH'] !== ''
        ) {
            return $localConfig['ADMIN_PASSWORD_HASH'];
        }
    }

    return '';
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
