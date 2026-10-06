<?php

declare(strict_types=1);

// Run only from a server-side scheduled PHP task, never through a public URL.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/concert-storage.php';

try {
    $result = concert_prune_storage();
    fwrite(STDOUT, 'Deleted ' . $result['concerts'] . ' expired concerts and '
        . $result['backup_rows'] . " backup copies.\n");
} catch (Throwable $exception) {
    fwrite(STDERR, 'Concert cleanup failed: ' . $exception->getMessage() . "\n");
    exit(1);
}
