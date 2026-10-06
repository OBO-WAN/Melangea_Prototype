<?php

declare(strict_types=1);

require __DIR__ . '/../admin/concert-storage.php';

function check(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$berlin = new DateTimeZone('Europe/Berlin');
$concert = ['date' => '06.10.2026', 'hideAfter' => '03:00'];
check(!concert_is_expired($concert, new DateTimeImmutable('2026-10-07 02:59', $berlin)), 'Early deletion at 03:00 cutoff');
check(concert_is_expired($concert, new DateTimeImmutable('2026-10-07 03:00', $berlin)), 'Missing deletion at 03:00 cutoff');
check(!concert_is_expired(['date' => '06.10.2026'], new DateTimeImmutable('2026-10-07 02:59', $berlin)), 'Legacy default before 03:00');
check(concert_is_expired(['date' => '06.10.2026'], new DateTimeImmutable('2026-10-07 03:00', $berlin)), 'Legacy default at 03:00');
check(concert_is_expired(['date' => '31.12.2026', 'hideAfter' => '00:00'], new DateTimeImmutable('2027-01-01 00:00', $berlin)), 'Year rollover');
check(!concert_is_expired(['date' => '31.02.2026'], new DateTimeImmutable('2026-10-07 03:00', $berlin)), 'Invalid dates must not be deleted');
check(!concert_is_expired(['date' => '24.10.2026', 'hideAfter' => '03:00'], new DateTimeImmutable('2026-10-25T02:59:00+01:00')), 'DST fall before 03:00');
check(concert_is_expired(['date' => '24.10.2026', 'hideAfter' => '03:00'], new DateTimeImmutable('2026-10-25T03:00:00+01:00')), 'DST fall at 03:00');

$root = sys_get_temp_dir() . '/melange-concert-test-' . bin2hex(random_bytes(6));
$directory = $root . '/backups';
if (!mkdir($directory, 0700, true)) {
    throw new RuntimeException('Could not create test directory');
}

$path = $root . '/concerts.json';
$backup = $directory . '/concerts-old.json';
try {
    $expired = ['date' => '06.10.2026', 'hideAfter' => '03:00', 'title' => 'Expired'];
    $future = ['date' => '08.10.2026', 'hideAfter' => '00:00', 'title' => 'Future'];
    concert_write_json($path, [$expired, $future]);
    concert_write_json($backup, [$expired, $future]);
    $now = new DateTimeImmutable('2026-10-07 03:00', $berlin);

    $result = concert_prune_storage($path, $directory, $now);
    check($result === ['concerts' => 1, 'backup_rows' => 1], 'Active and backup records were not pruned');
    check(concert_read_json($path) === [$future], 'Active JSON still contains the expired concert');
    check(concert_read_json($backup) === [$future], 'Backup JSON still contains the expired concert');
    check(concert_prune_storage($path, $directory, $now) === ['concerts' => 0, 'backup_rows' => 0], 'Cleanup is not idempotent');
    check(concert_without_expired([$expired, $future], $now) === [$future], 'A stale admin form would restore the concert');
} finally {
    @unlink($path);
    @unlink($backup);
    @unlink($directory . '/.concerts.lock');
    @rmdir($directory);
    @rmdir($root);
}

echo "Concert pruning passed.\n";
