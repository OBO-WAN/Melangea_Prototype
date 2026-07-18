<?php

declare(strict_types=1);

require __DIR__ . '/auth.php';
require_authentication();

const BOOKING_JSON = 'data/booking-downloads.json';
const BOOKING_MANAGED = 'assets/downloads/booking/managed';
const BOOKING_DOWNLOAD_SLOTS = [
    'pressetext-lang' => ['label' => 'Pressetext lang', 'fileType' => 'pdf', 'column' => 'left', 'order' => 1],
    'pressetext-kurz' => ['label' => 'Pressetext kurz', 'fileType' => 'pdf', 'column' => 'left', 'order' => 2],
    'kurzbeschreibung' => ['label' => 'Kurzbeschreibung', 'fileType' => 'pdf', 'column' => 'left', 'order' => 3],
    'fotos' => ['label' => 'Fotos', 'fileType' => 'zip', 'column' => 'right', 'order' => 1],
    'biographien-der-musiker' => ['label' => 'Biographien der Musiker', 'fileType' => 'pdf', 'column' => 'right', 'order' => 2],
    'repertoire-auszug' => ['label' => 'Repertoire-Auszug', 'fileType' => 'pdf', 'column' => 'right', 'order' => 3],
    'techrider' => ['label' => 'Techrider', 'fileType' => 'pdf', 'column' => 'right', 'order' => 4],
];

$bdCreatedUploads = [];

function bd_error(string $message): void
{
    global $bdCreatedUploads;

    foreach ($bdCreatedUploads as $created) {
        @unlink($created);
    }

    http_response_code(400);
    echo '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="admin.css"><title>Speichern nicht möglich</title></head><body class="admin-page"><main class="admin-login"><h1>Speichern nicht möglich</h1><p class="admin-message admin-message--error">' . escape_html($message) . '</p><p><a class="admin-link" href="booking-downloads.php">Zurück zum Booking-Material</a></p></main></body></html>';
    exit;
}

function bd_valid_path($value): ?string
{
    if (!is_string($value) || $value === '' || str_contains($value, '..') || str_contains($value, '\\')) {
        return null;
    }

    return preg_match('#^assets/downloads/booking/(?:managed/)?[A-Za-z0-9._-]+\.(?:pdf|zip)$#i', $value) === 1
        ? $value
        : null;
}

function bd_backup_path(string $directory): string
{
    return $directory . '/booking-downloads-' . date('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.json';
}

function bd_upload(array $file, string $root, string $expectedType): ?array
{
    global $bdCreatedUploads;

    $error = $file['error'] ?? UPLOAD_ERR_NO_FILE;
    if ($error === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    $temporaryPath = is_string($file['tmp_name'] ?? null) ? $file['tmp_name'] : '';
    if ($error !== UPLOAD_ERR_OK || $temporaryPath === '' || !is_uploaded_file($temporaryPath)) {
        bd_error('Die hochgeladene Datei ist ungültig.');
    }

    $size = is_numeric($file['size'] ?? null) ? (int) $file['size'] : 0;
    if ($size <= 0 || $size > 20 * 1024 * 1024) {
        bd_error('Die Datei muss zwischen 1 Byte und 20 MB groß sein.');
    }

    $originalName = is_string($file['name'] ?? null) ? $file['name'] : '';
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    if ($extension !== $expectedType) {
        bd_error('Für dieses Material ist nur eine ' . strtoupper($expectedType) . '-Datei erlaubt.');
    }

    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($temporaryPath);
    $signature = (string) file_get_contents($temporaryPath, false, null, 0, 8);

    $validPdf = $expectedType === 'pdf'
        && $mime === 'application/pdf'
        && str_starts_with($signature, '%PDF-');

    $validZipSignature = str_starts_with($signature, "PK\x03\x04")
        || str_starts_with($signature, "PK\x05\x06")
        || str_starts_with($signature, "PK\x07\x08");
    $validZip = $expectedType === 'zip'
        && in_array($mime, ['application/zip', 'application/x-zip-compressed'], true)
        && $validZipSignature;

    if (!$validPdf && !$validZip) {
        bd_error('Dateiendung, MIME-Typ oder Dateisignatur stimmen nicht überein.');
    }

    $uploadDirectory = $root . '/' . BOOKING_MANAGED;
    if (!is_dir($uploadDirectory) && !mkdir($uploadDirectory, 0755, true)) {
        bd_error('Der Upload-Ordner konnte nicht erstellt werden.');
    }
    if (!is_writable($uploadDirectory)) {
        bd_error('Der Upload-Ordner ist nicht beschreibbar.');
    }

    do {
        $filename = 'booking-' . date('YmdHis') . '-' . bin2hex(random_bytes(6)) . '.' . $expectedType;
        $destination = $uploadDirectory . '/' . $filename;
    } while (file_exists($destination));

    if (!move_uploaded_file($temporaryPath, $destination)) {
        bd_error('Die Datei konnte nicht sicher gespeichert werden.');
    }

    chmod($destination, 0644);
    $bdCreatedUploads[] = $destination;

    return [
        'path' => BOOKING_MANAGED . '/' . $filename,
        'file' => $destination,
    ];
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST'
    || !verify_csrf_token(isset($_POST['csrf_token']) ? (string) $_POST['csrf_token'] : null)) {
    bd_error('Die Sicherheitsprüfung ist fehlgeschlagen. Bitte laden Sie die Seite neu.');
}

$root = dirname(__DIR__);
$jsonPath = $root . '/' . BOOKING_JSON;
$lock = fopen($jsonPath, 'c+');
if ($lock === false || !flock($lock, LOCK_EX)) {
    bd_error('Die Download-Daten konnten nicht gesperrt werden.');
}

$oldData = json_decode((string) file_get_contents($jsonPath), true);
if (!is_array($oldData)) {
    bd_error('Die bestehenden Download-Daten sind ungültig.');
}

$oldById = [];
foreach ($oldData as $oldItem) {
    if (is_array($oldItem) && isset($oldItem['id']) && is_string($oldItem['id'])) {
        $oldById[$oldItem['id']] = $oldItem;
    }
}

$submittedSlots = $_POST['slots'] ?? [];
if (!is_array($submittedSlots)) {
    bd_error('Die übermittelten Daten sind ungültig.');
}

$result = [];
foreach (BOOKING_DOWNLOAD_SLOTS as $id => $slot) {
    $oldItem = $oldById[$id] ?? [];
    $oldPath = bd_valid_path($oldItem['path'] ?? null);
    $oldManaged = $oldPath !== null
        && !empty($oldItem['managedUpload'])
        && str_starts_with($oldPath, BOOKING_MANAGED . '/');

    $submittedSlot = is_array($submittedSlots[$id] ?? null) ? $submittedSlots[$id] : [];
    $remove = !empty($submittedSlot['remove']);
    $upload = bd_upload($_FILES['replace_' . $id] ?? [], $root, $slot['fileType']);

    if ($upload !== null) {
        $path = $upload['path'];
        $managedUpload = true;
    } elseif ($remove) {
        $path = null;
        $managedUpload = false;
    } else {
        $path = $oldPath;
        $managedUpload = $oldManaged;
    }

    $result[] = [
        'id' => $id,
        'label' => $slot['label'],
        'path' => $path,
        'fileType' => $slot['fileType'],
        'column' => $slot['column'],
        'order' => $slot['order'],
        'managedUpload' => $managedUpload,
    ];
}

$encoded = json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if (!is_string($encoded)) {
    bd_error('Die Download-Daten konnten nicht kodiert werden.');
}

$backupDirectory = $root . '/data/backups';
if (!is_dir($backupDirectory) && !mkdir($backupDirectory, 0755, true)) {
    bd_error('Der Backup-Ordner konnte nicht erstellt werden.');
}
if (!is_writable($backupDirectory) || !copy($jsonPath, bd_backup_path($backupDirectory))) {
    bd_error('Sicherungskopie konnte nicht erstellt werden.');
}

$temporaryJson = $jsonPath . '.tmp-' . bin2hex(random_bytes(4));
if (file_put_contents($temporaryJson, $encoded . PHP_EOL, LOCK_EX) === false
    || !rename($temporaryJson, $jsonPath)) {
    @unlink($temporaryJson);
    bd_error('Die Download-Daten konnten nicht atomar gespeichert werden.');
}

$activePaths = array_values(array_filter(array_column($result, 'path'), 'is_string'));
foreach ($oldData as $oldItem) {
    if (!is_array($oldItem) || empty($oldItem['managedUpload'])) {
        continue;
    }

    $oldPath = bd_valid_path($oldItem['path'] ?? null);
    if ($oldPath !== null
        && str_starts_with($oldPath, BOOKING_MANAGED . '/')
        && !in_array($oldPath, $activePaths, true)) {
        @unlink($root . '/' . $oldPath);
    }
}

$bdCreatedUploads = [];
flock($lock, LOCK_UN);
fclose($lock);

header('Location: booking-downloads.php?saved=1');
exit;
