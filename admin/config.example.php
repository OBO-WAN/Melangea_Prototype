<?php

declare(strict_types=1);

return [
    // Prefer setting ADMIN_PASSWORD_HASH in the environment instead of using this file.
    // Generate your own hash with: password_hash('YOUR_PASSWORD', PASSWORD_DEFAULT)
    // This fake example hash is intentionally not a real admin password.
    'ADMIN_PASSWORD_HASH' => '$2y$10$000000000000000000000u0000000000000000000000000000000000',
    // Required for the forgot-password flow. Reset links are sent only to this address.
    'ADMIN_EMAIL' => 'admin@example.com',
    // Optional but recommended if the inferred URL is not correct on your host.
    'ADMIN_BASE_URL' => 'https://example.com/admin',
    // Optional sender address for reset emails. Defaults to ADMIN_EMAIL.
    'ADMIN_PASSWORD_RESET_FROM_EMAIL' => 'admin@example.com',
];
