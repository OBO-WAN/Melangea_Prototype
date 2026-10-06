<?php

declare(strict_types=1);

/**
 * Shared concert storage for admin requests and the CLI cleanup job.
 * All writers use the same lock so an admin save cannot race the cleanup.
 */

function concert_data_path(): string
{
    return dirname(__DIR__) . '/data/concerts.json';
}

function concert_backup_directory(): string
{
    return dirname(__DIR__) . '/data/backups';
}

function concert_now(): DateTimeImmutable
{
    return new DateTimeImmutable('now', new DateTimeZone('Europe/Berlin'));
}

function concert_is_expired(array $concert, DateTimeImmutable $now): bool
{
    $date = $concert['date'] ?? null;
    if (!is_string($date) || !preg_match('/^\d{2}\.\d{2}\.\d{4}$/', $date)) {
        return false;
    }

    // UTC is used only to advance the calendar date, not to compare clocks.
    $concertDate = DateTimeImmutable::createFromFormat('!d.m.Y', $date, new DateTimeZone('UTC'));
    if ($concertDate === false || $concertDate->format('d.m.Y') !== $date) {
        return false;
    }

    $hideAfter = $concert['hideAfter'] ?? null;
    if (!is_string($hideAfter) || !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $hideAfter)) {
        $hideAfter = '03:00'; // Records saved before the cutoff field existed.
    }

    $cutoff = $concertDate->modify('+1 day')->format('Y-m-d') . ' ' . $hideAfter;
    return $now->setTimezone(new DateTimeZone('Europe/Berlin'))->format('Y-m-d H:i') >= $cutoff;
}

function concert_without_expired(array $concerts, DateTimeImmutable $now): array
{
    return array_values(array_filter(
        $concerts,
        static fn ($concert): bool => !is_array($concert) || !concert_is_expired($concert, $now)
    ));
}

function concert_with_lock(callable $action, ?string $directory = null)
{
    $directory = $directory ?? concert_backup_directory();
    if (!is_dir($directory) && !@mkdir($directory, 0755, true) && !is_dir($directory)) {
        throw new RuntimeException('Der Backup-Ordner data/backups konnte nicht erstellt werden.');
    }

    $lock = @fopen($directory . '/.concerts.lock', 'c');
    if ($lock === false) {
        throw new RuntimeException('Die Konzertdaten konnten nicht gesperrt werden.');
    }

    try {
        if (!flock($lock, LOCK_EX)) {
            throw new RuntimeException('Die Konzertdaten konnten nicht gesperrt werden.');
        }

        return $action();
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function concert_read_json(string $path): array
{
    $contents = @file_get_contents($path);
    if ($contents === false) {
        throw new RuntimeException('Die Konzertdaten konnten nicht gelesen werden: ' . basename($path));
    }

    try {
        $concerts = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $exception) {
        throw new RuntimeException('Ungültige Konzertdaten in ' . basename($path), 0, $exception);
    }

    if (!is_array($concerts)) {
        throw new RuntimeException('Ungültige Konzertdaten in ' . basename($path));
    }

    return $concerts;
}

function concert_write_json(string $path, array $concerts): void
{
    $json = json_encode(array_values($concerts), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($json)) {
        throw new RuntimeException('Die Konzertdaten konnten nicht als JSON vorbereitet werden.');
    }

    if (!is_writable(dirname($path))) {
        throw new RuntimeException('Der Konzertdaten-Ordner ist nicht beschreibbar.');
    }

    $temporary = tempnam(dirname($path), '.concerts-');
    if ($temporary === false) {
        throw new RuntimeException('Die Konzertdaten konnten nicht gespeichert werden.');
    }

    try {
        $payload = $json . PHP_EOL;
        $written = file_put_contents($temporary, $payload);
        if ($written === false || $written !== strlen($payload)) {
            throw new RuntimeException('Die Konzertdaten konnten nicht gespeichert werden.');
        }

        // Keep the existing public JSON readable by the web server after rename.
        $permissions = is_file($path) ? fileperms($path) : false;
        if ($permissions !== false && !chmod($temporary, $permissions & 0777)) {
            throw new RuntimeException('Die Dateiberechtigungen konnten nicht erhalten werden.');
        }

        if (!rename($temporary, $path)) {
            throw new RuntimeException('Die Konzertdaten konnten nicht gespeichert werden.');
        }
    } finally {
        if (is_file($temporary)) {
            @unlink($temporary);
        }
    }
}

function concert_prune_backups_unlocked(DateTimeImmutable $now, ?string $directory = null): int
{
    $files = glob(($directory ?? concert_backup_directory()) . '/concerts-*.json');
    if ($files === false) {
        throw new RuntimeException('Die Konzert-Backups konnten nicht gelesen werden.');
    }

    $deleted = 0;
    foreach ($files as $path) {
        $concerts = concert_read_json($path);
        $remaining = concert_without_expired($concerts, $now);
        if (count($remaining) !== count($concerts)) {
            concert_write_json($path, $remaining);
            $deleted += count($concerts) - count($remaining);
        }
    }

    return $deleted;
}

function concert_prune_storage(
    ?string $path = null,
    ?string $directory = null,
    ?DateTimeImmutable $now = null
): array
{
    $path = $path ?? concert_data_path();
    $directory = $directory ?? concert_backup_directory();
    $now = $now ?? concert_now();

    return concert_with_lock(static function () use ($path, $directory, $now): array {
        $concerts = concert_read_json($path);
        $remaining = concert_without_expired($concerts, $now);
        $deleted = count($concerts) - count($remaining);

        if ($deleted > 0) {
            concert_write_json($path, $remaining);
        }

        // An expired concert must not remain in the admin's historical JSON backups.
        $backupDeleted = concert_prune_backups_unlocked($now, $directory);
        return ['concerts' => $deleted, 'backup_rows' => $backupDeleted];
    }, $directory);
}
