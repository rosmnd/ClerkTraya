<?php
declare(strict_types=1);

$requestPath = rawurldecode((string) (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/'));
$filename = basename($requestPath);
$protectedFiles = ['.env', 'records.json', 'users.json', 'audit.jsonl'];

if (in_array($filename, $protectedFiles, true) || str_ends_with($filename, '.lock') || str_starts_with($filename, '.env.')) {
    http_response_code(404);
    exit;
}

if ($requestPath !== '/' && is_file(__DIR__ . $requestPath)) {
    return false;
}

if ($requestPath === '/') {
    require __DIR__ . '/index.php';
    exit;
}

http_response_code(404);
echo 'Not found.';
