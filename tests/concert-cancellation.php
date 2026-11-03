<?php

declare(strict_types=1);

// Run the actual save endpoint in child processes with isolated fixture storage.
$root = sys_get_temp_dir() . '/melange-cancellation-' . bin2hex(random_bytes(6));
mkdir($root . '/admin', 0700, true);
mkdir($root . '/data/backups', 0700, true);

function check_cancellation(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException($message);
}

function run_fixture(string $root, string $endpoint, array $post = []): string
{
    file_put_contents($root . '/post.json', json_encode($post, JSON_THROW_ON_ERROR));
    $process = proc_open([PHP_BINARY, $root . '/request.php', $endpoint], [
        0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w'],
    ], $pipes);
    check_cancellation(is_resource($process), 'Could not start PHP fixture');
    fclose($pipes[0]);
    $output = stream_get_contents($pipes[1]);
    $errors = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exitCode = proc_close($process);
    check_cancellation($exitCode === 0 && $errors === '', 'Fixture failed: ' . $errors);
    return $output;
}

try {
    foreach (['save-concerts.php', 'concert-storage.php', 'index.php', 'layout.php'] as $file) {
        copy(__DIR__ . '/../admin/' . $file, $root . '/admin/' . $file);
    }
    // Authentication is stubbed only in this temporary fixture, never in production.
    file_put_contents($root . '/admin/auth.php', <<<'PHP'
<?php
function require_authentication(): void {}
function verify_csrf_token(?string $token): bool { return $token === 'fixture-token'; }
function csrf_token(): string { return 'fixture-token'; }
function escape_html(?string $value): string { return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
PHP
    );
    file_put_contents($root . '/request.php', <<<'PHP'
<?php
$_SERVER['REQUEST_METHOD'] = 'POST';
$_POST = json_decode(file_get_contents(__DIR__ . '/post.json'), true, 512, JSON_THROW_ON_ERROR);
require __DIR__ . '/admin/' . $argv[1];
PHP
    );
    $path = $root . '/data/concerts.json';
    $row = ['date' => '2099-11-04', 'hour' => '20', 'minute' => '00', 'title' => 'Test concert',
        'venue' => 'Park', 'city' => 'Neustadt', 'description' => 'Programme',
        'detailsUrl' => '/details', 'ticketsUrl' => '/tickets', 'hideAfter' => '03:00'];
    file_put_contents($path, '[]');
    $post = ['csrf_token' => 'fixture-token', 'concerts' => [$row + [
        'cancelled' => '1', 'cancellationReason' => '<b>Wegen Unwetter</b> & Hochwasser.',
    ]]];
    check_cancellation(run_fixture($root, 'save-concerts.php', $post) === '', 'Cancellation save failed');
    $saved = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    check_cancellation(count($saved) === 1 && $saved[0]['cancelled'] === true, 'Cancellation was not stored as a boolean');
    check_cancellation($saved[0]['cancellationReason'] === 'Wegen Unwetter & Hochwasser.', 'Cancellation text was not sanitized');
    check_cancellation($saved[0]['hideAfter'] === '03:00' && $saved[0]['date'] === '04.11.2099', 'Cancellation changed the concert date or cutoff');
    $html = run_fixture($root, 'index.php');
    check_cancellation((bool) preg_match('/name="concerts\[0\]\[cancelled\]" value="1"\s+checked/', $html), 'Saved cancellation is not checked on reload');
    check_cancellation(strpos($html, 'Wegen Unwetter &amp; Hochwasser.') !== false, 'Reason was not escaped on reload');

    $unchanged = file_get_contents($path);
    $post['concerts'][0]['cancellationReason'] = str_repeat('ä', 501);
    check_cancellation(strpos(run_fixture($root, 'save-concerts.php', $post), '500 Zeichen') !== false, 'Overlong note was accepted');
    check_cancellation(file_get_contents($path) === $unchanged, 'Invalid note changed stored data');
    $post['concerts'][0]['cancellationReason'] = '';
    $post['csrf_token'] = 'wrong';
    check_cancellation(strpos(run_fixture($root, 'save-concerts.php', $post), 'Sicherheitsprüfung') !== false, 'CSRF check was bypassed');
    check_cancellation(file_get_contents($path) === $unchanged, 'Bad CSRF changed stored data');

    $post['csrf_token'] = 'fixture-token';
    unset($post['concerts'][0]['cancelled']); // Unchecked checkbox is absent from POST.
    check_cancellation(run_fixture($root, 'save-concerts.php', $post) === '', 'Reinstatement save failed');
    $restored = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    check_cancellation($restored[0]['cancelled'] === false, 'Unchecked cancellation was not cleared');

    $restored[0]['status'] = 'cancelled';
    unset($restored[0]['cancelled']);
    file_put_contents($path, json_encode($restored, JSON_THROW_ON_ERROR));
    check_cancellation((bool) preg_match('/name="concerts\[0\]\[cancelled\]" value="1"\s+checked/', run_fixture($root, 'index.php')), 'Legacy cancelled status was not reflected in the checkbox');
} finally {
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($files as $file) {
        if ($file->isDir()) rmdir($file->getPathname());
        else unlink($file->getPathname());
    }
    rmdir($root);
}

echo "Concert cancellation save and reload passed.\n";
