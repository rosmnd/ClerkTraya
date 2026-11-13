<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw === false ? '' : $raw);
    if (!$decoded instanceof stdClass) {
        respond(['success' => false, 'error' => 'Request body must be a valid JSON object.'], 400);
    }
    return get_object_vars($decoded);
}

function configValue(string $name, string $default = ''): string
{
    if (isset($_ENV[$name]) && is_string($_ENV[$name])) {
        return $_ENV[$name];
    }
    if (isset($_SERVER[$name]) && is_string($_SERVER[$name])) {
        return $_SERVER[$name];
    }
    $value = getenv($name);
    return $value === false ? $default : $value;
}

function loadEnvFile(string $path): void
{
    if (!is_readable($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) {
            continue;
        }
        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);
        $environmentValue = $name !== '' ? getenv($name) : false;
        if ($name !== '' && !isset($_ENV[$name]) && !isset($_SERVER[$name]) && $environmentValue === false) {
            $_ENV[$name] = trim($value, " \t\n\r\0\x0B\"'");
        }
    }
}

function withRecordsLock(string $dbFile, int $lockMode, callable $callback)
{
    $lock = fopen($dbFile . '.lock', 'c');
    if ($lock === false || !flock($lock, $lockMode)) {
        if (is_resource($lock)) {
            fclose($lock);
        }
        respond(['success' => false, 'error' => 'The records store is unavailable. Check server file permissions.'], 500);
    }

    try {
        $raw = is_file($dbFile) ? file_get_contents($dbFile) : '[]';
        $records = json_decode($raw === false ? '' : $raw, true);
        if (!is_array($records)) {
            respond(['success' => false, 'error' => 'The records store contains invalid JSON. Restore records.json from a valid backup.'], 500);
        }
        return $callback($records);
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function writeRecords(string $dbFile, array $records): void
{
    $encoded = json_encode(array_values($records), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    if ($encoded === false || file_put_contents($dbFile, $encoded . PHP_EOL, LOCK_EX) === false) {
        respond(['success' => false, 'error' => 'Could not save records. Check server file permissions and available storage.'], 500);
    }
}

function postJsonToLumen(string $url, array $payload, string $apiKey, string $apiSecret): array
{
    if (!function_exists('curl_init')) {
        respond(['success' => false, 'error' => 'The PHP cURL extension is required for live Lumen requests.'], 503);
    }

    $ch = curl_init($url);
    if ($ch === false) {
        respond(['success' => false, 'error' => 'Could not initialize the Lumen request.'], 502);
    }
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 45,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'lumen-api-key: ' . $apiKey,
            'lumen-api-secret: ' . $apiSecret,
        ],
    ]);
    $response = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false || $curlError !== '') {
        respond(['success' => false, 'error' => 'The Lumen service could not be reached. Please try again.'], 502);
    }
    $decoded = json_decode($response, true);
    if ($httpCode < 200 || $httpCode >= 300) {
        respond(['success' => false, 'error' => 'The Lumen service returned an error. Please check its configuration and try again.'], 502);
    }
    if (!is_array($decoded)) {
        respond(['success' => false, 'error' => 'The Lumen service returned an unreadable response.'], 502);
    }
    return [$decoded, $httpCode];
}

function textValue(array $input, string $key, string $default, int $maxLength): string
{
    $value = $input[$key] ?? $default;
    if (!is_string($value) && !is_numeric($value)) {
        respond(['success' => false, 'error' => 'Invalid value for ' . $key . '.'], 400);
    }
    $value = trim((string) $value);
    if (strlen($value) > $maxLength) {
        respond(['success' => false, 'error' => ucfirst(str_replace('_', ' ', $key)) . ' is too long.'], 400);
    }
    return $value;
}

require_once __DIR__ . '/auth.php';
startAuthSession();
loadEnvFile(__DIR__ . '/.env');
$apiKey = configValue('LUMEN_API_KEY');
$apiSecret = configValue('LUMEN_API_SECRET');
$ocrUrl = configValue('LUMEN_OCR_URL');
$chatUrl = configValue('LUMEN_CHAT_URL');
$demoMode = filter_var(configValue('SAGIPREKORD_DEMO_MODE', 'false'), FILTER_VALIDATE_BOOLEAN);
$hasLumenCredentials = $apiKey !== '' && $apiSecret !== '';
$dbFile = __DIR__ . '/records.json';
$usersFile = __DIR__ . '/users.json';
$auditFile = __DIR__ . '/audit.jsonl';
$authUsersFile = $usersFile;
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

ensureDemoAccounts($usersFile);
if (handleAuthAction($action, $method, $usersFile, $auditFile)) {
    exit;
}
$currentUser = requireCurrentUser();

if ($action === 'admin_config') {
    requireCurrentUser(['admin']);
    if ($method !== 'GET') {
        respond(['success' => false, 'error' => 'Use GET to view system configuration.'], 405);
    }
    respond([
        'success' => true,
        'demo_mode' => $demoMode,
        'lumen_credentials_available' => $hasLumenCredentials,
        'ocr_configured' => $ocrUrl !== '' && $hasLumenCredentials,
        'chat_configured' => $chatUrl !== '' && $hasLumenCredentials,
        'storage_writable' => (is_file($dbFile) ? is_writable($dbFile) : is_writable(dirname($dbFile))),
    ]);
}

if ($action === 'list' && $method === 'GET') {
    $records = withRecordsLock($dbFile, LOCK_SH, static function (array $records) use ($currentUser): array {
        if ($currentUser['role'] === 'resident') {
            return array_values(array_filter($records, static function ($record) use ($currentUser): bool {
                return is_array($record) && ($record['owner_id'] ?? '') === $currentUser['id'];
            }));
        }
        return $records;
    });
    auditEvent($auditFile, $currentUser, 'records.list', ['count' => count($records)]);
    respond(['success' => true, 'records' => $records]);
}

if ($action === 'ocr') {
    if ($method !== 'POST') {
        respond(['success' => false, 'error' => 'Use POST to scan a document.'], 405);
    }
    if (!isset($_FILES['document']) || !is_array($_FILES['document'])) {
        respond(['success' => false, 'error' => 'Choose an image or PDF to scan.'], 400);
    }
    $upload = $_FILES['document'];
    $uploadError = $upload['error'] ?? UPLOAD_ERR_NO_FILE;
    $temporaryPath = $upload['tmp_name'] ?? '';
    if ($uploadError !== UPLOAD_ERR_OK || !is_string($temporaryPath) || !is_uploaded_file($temporaryPath)) {
        $message = $uploadError === UPLOAD_ERR_INI_SIZE || $uploadError === UPLOAD_ERR_FORM_SIZE
            ? 'The document exceeds the upload size limit.'
            : 'The document upload did not complete. Please try again.';
        respond(['success' => false, 'error' => $message], 400);
    }
    $uploadSize = $upload['size'] ?? 0;
    if (!is_numeric($uploadSize) || (int) $uploadSize < 1 || (int) $uploadSize > 10 * 1024 * 1024) {
        respond(['success' => false, 'error' => 'Documents must be smaller than 10 MB.'], 413);
    }
    if (!class_exists('finfo')) {
        respond(['success' => false, 'error' => 'The PHP fileinfo extension is required to validate document uploads.'], 503);
    }
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($temporaryPath);
    $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!in_array($mimeType, $allowedMimeTypes, true)) {
        respond(['success' => false, 'error' => 'Use a JPEG, PNG, WebP image, or PDF document.'], 415);
    }

    if (!$demoMode && $ocrUrl !== '' && $hasLumenCredentials) {
        if (!function_exists('curl_init')) {
            respond(['success' => false, 'error' => 'The PHP cURL extension is required for live Lumen OCR.'], 503);
        }
        $file = new CURLFile($temporaryPath, $mimeType, basename((string) ($upload['name'] ?? 'document')));
        $ch = curl_init($ocrUrl);
        if ($ch === false) {
            respond(['success' => false, 'error' => 'Could not initialize the Lumen OCR request.'], 502);
        }
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => ['file' => $file],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 45,
            CURLOPT_HTTPHEADER => [
                'lumen-api-key: ' . $apiKey,
                'lumen-api-secret: ' . $apiSecret,
            ],
        ]);
        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        if ($response === false || $curlError !== '') {
            respond(['success' => false, 'error' => 'The Lumen OCR service could not be reached. Please try again.'], 502);
        }
        $decoded = json_decode($response, true);
        if ($httpCode < 200 || $httpCode >= 300 || !is_array($decoded)) {
            respond(['success' => false, 'error' => 'The Lumen OCR service returned an error. Please check its configuration.'], 502);
        }
        $rawText = $decoded['text'] ?? $decoded['data']['text'] ?? $decoded['result']['text'] ?? $decoded['result'] ?? $decoded['content'] ?? '';
        if (!is_string($rawText) || trim($rawText) === '') {
            respond(['success' => false, 'error' => 'Lumen OCR did not return any document text.'], 502);
        }
        respond(['success' => true, 'mode' => 'live_lumen_ocr', 'raw_text' => $rawText]);
    }

    respond([
        'success' => true,
        'mode' => 'demo_fallback',
        'raw_text' => "REPUBLIC OF THE PHILIPPINES\nBARANGAY PALATIW, PASIG CITY - DRRMO\nDISASTER ASSISTANCE FAMILY ACCESS CARD (DAF-AC)\n\nDate Issued: Nov 13, 2026\nControl / Stub No: PLTW-2026-0915\nHead of Household: Mendoza, Teresita L.\nAddress: Purok 4, Market Ave., Brgy. Palatiw, Pasig City\nAmount / Assistance: PHP 5,000.00 Emergency Cash Transfer (ECT)\nMedical / Urgent Needs: Insulin Pen (Glargine), Senior Citizen ID damaged by flood.\nDeadline: Claim on or before Nov 16, 2026 at Brgy. Palatiw Covered Court.",
    ]);
}

if ($action === 'chat') {
    if ($method !== 'POST') {
        respond(['success' => false, 'error' => 'Use POST to ask the document assistant.'], 405);
    }
    $input = readJsonBody();
    $documentText = textValue($input, 'document_text', '', 50000);
    $userQuestion = textValue($input, 'prompt', 'Explain this document and list the next steps.', 2000);
    $language = textValue($input, 'language', 'Taglish (Simple Filipino-English)', 80);
    if ($documentText === '') {
        respond(['success' => false, 'error' => 'Scan or load a document before asking for help.'], 400);
    }
    $allowedLanguages = ['Taglish (Simple Filipino-English)', 'Simple Tagalog', 'Simple Plain English'];
    if (!in_array($language, $allowedLanguages, true)) {
        respond(['success' => false, 'error' => 'Choose a supported response language.'], 400);
    }

    if (!$demoMode && $chatUrl !== '' && $hasLumenCredentials) {
        $systemPrompt = "You are SagipRekord AI, a document explainer for Barangay Palatiw in Pasig City. Explain what is in the supplied verified document, distinguish its stated facts from general advice, and do not invent deadlines, eligibility, or benefits. Respond in $language. End with actionable numbered next steps based on the document.";
        [$decoded] = postJsonToLumen($chatUrl, [
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => "Verified document:\n$documentText\n\nQuestion:\n$userQuestion"],
            ],
            'prompt' => $systemPrompt . "\n\nVERIFIED DOCUMENT:\n" . $documentText . "\n\nUSER QUESTION:\n" . $userQuestion,
        ], $apiKey, $apiSecret);
        $reply = $decoded['reply'] ?? $decoded['response'] ?? $decoded['message'] ?? $decoded['data']['reply'] ?? $decoded['data']['text'] ?? $decoded['choices'][0]['message']['content'] ?? '';
        if (!is_string($reply) || trim($reply) === '') {
            respond(['success' => false, 'error' => 'Lumen did not return an explanation. Please try again.'], 502);
        }
        respond(['success' => true, 'mode' => 'live_lumen_chat', 'reply' => $reply]);
    }

    preg_match('/(?:Reference|Control\\s*\\/\\s*Stub\\s*No|Control\\s*No|Account\\s*No|OR\\s*No)\\s*:\\s*([^\\r\\n]+)/i', $documentText, $referenceMatch);
    preg_match('/(?:Deadline|Due\\s*Date|Date\\s*Issued)\\s*:\\s*([^\\r\\n]+)/i', $documentText, $deadlineMatch);
    $reference = $referenceMatch[1] ?? '';
    $deadline = $deadlineMatch[1] ?? '';
    if ($language === 'Simple Plain English') {
        $reply = "Demo guidance based on the document you provided.\n\n";
        $reply .= $reference !== '' ? "• Reference number shown: $reference.\n" : "• Check the document for its reference number.\n";
        $reply .= $deadline !== '' ? "• Date or deadline shown: $deadline.\n" : "• Confirm any deadline with the issuing office.\n";
        $reply .= "\nNext steps:\n1. Review the extracted text and correct any mistakes.\n2. Contact the office named in the document to confirm requirements.\n3. Keep the verified copy and reference number for follow-up.";
    } else {
        $reply = "Demo na paliwanag batay sa dokumentong ibinigay mo.\n\n";
        $reply .= $reference !== '' ? "• Reference number sa dokumento: $reference.\n" : "• Tingnan ang dokumento para sa reference number.\n";
        $reply .= $deadline !== '' ? "• Petsa o deadline sa dokumento: $deadline.\n" : "• Kumpirmahin ang deadline sa tanggapang nagbigay ng dokumento.\n";
        $reply .= "\nMga susunod na hakbang:\n1. Suriin at itama ang mga maling detalye sa teksto.\n2. Tawagan ang tanggapang nakasaad sa dokumento upang kumpirmahin ang mga kailangan.\n3. Itago ang nasuring kopya at reference number para sa follow-up.";
    }
    respond(['success' => true, 'mode' => 'demo_fallback', 'reply' => $reply]);
}

if ($action === 'save' || $action === 'delete') {
    if ($method !== 'POST') {
        respond(['success' => false, 'error' => 'Use POST to change saved records.'], 405);
    }
    $input = readJsonBody();
    if ($action === 'save') {
        $recordId = textValue($input, 'id', '', 64);
        if ($recordId !== '' && !preg_match('/^[A-Za-z0-9_-]+$/', $recordId)) {
            respond(['success' => false, 'error' => 'Record ID contains invalid characters.'], 400);
        }
        $verifiedText = textValue($input, 'verified_ocr', '', 50000);
        if ($verifiedText === '') {
            respond(['success' => false, 'error' => 'Verified document text is required.'], 400);
        }
        $checklistInput = $input['checklist'] ?? [];
        if (!is_array($checklistInput) || count($checklistInput) > 100) {
            respond(['success' => false, 'error' => 'Checklist must contain no more than 100 action steps.'], 400);
        }
        $checklist = [];
        foreach ($checklistInput as $item) {
            if (!is_array($item) || !isset($item['text']) || !is_string($item['text']) || trim($item['text']) === '' || strlen($item['text']) > 1000) {
                respond(['success' => false, 'error' => 'Each checklist item needs valid text of at most 1,000 characters.'], 400);
            }
            $checklist[] = ['text' => trim($item['text']), 'done' => (bool) ($item['done'] ?? false)];
        }
        $recordData = [
            'id' => $recordId !== '' ? $recordId : 'SR-' . strtoupper(bin2hex(random_bytes(4))),
            'doc_type' => textValue($input, 'doc_type', 'Forms (DAF-AC Relief Intake)', 200),
            'resident_name' => textValue($input, 'resident_name', 'Unnamed Resident', 200),
            'reference_no' => textValue($input, 'reference_no', 'N/A', 100),
            'amount_or_date' => textValue($input, 'amount_or_date', 'N/A', 200),
            'purok_address' => textValue($input, 'purok_address', 'Brgy. Palatiw, Pasig City', 300),
            'priority_level' => textValue($input, 'priority_level', 'High Priority', 80),
            'original_ocr' => textValue($input, 'original_ocr', $verifiedText, 50000),
            'verified_ocr' => $verifiedText,
            'verified_advice' => textValue($input, 'verified_advice', '', 20000),
            'checklist' => $checklist,
            'correction_note' => textValue($input, 'correction_note', 'Checked and verified by user', 500),
            'edit_count' => max(0, min(50000, (int) ($input['edit_count'] ?? 0))),
            'updated_at' => date('M d, Y h:i A'),
        ];
        $ownerId = $currentUser['role'] === 'resident' ? $currentUser['id'] : '';
        $ownerEmail = strtolower(textValue($input, 'owner_email', '', 254));
        if ($currentUser['role'] !== 'resident' && $ownerEmail !== '') {
            $ownerId = withJsonStore($usersFile, [], static function (array &$users) use ($ownerEmail): string {
                foreach ($users as $account) {
                    if (strtolower((string) ($account['email'] ?? '')) === $ownerEmail
                        && ($account['active'] ?? false) === true
                        && ($account['role'] ?? '') === 'resident') {
                        return (string) $account['id'];
                    }
                }
                respond(['success' => false, 'error' => 'No active resident account uses that email.'], 400);
            });
        }

        $result = withRecordsLock($dbFile, LOCK_EX, static function (array $records) use ($dbFile, $recordData, $currentUser, $ownerId, $ownerEmail): array {
            $updated = false;
            foreach ($records as $index => $existing) {
                if (isset($existing['id']) && $existing['id'] === $recordData['id']) {
                    if ($currentUser['role'] === 'resident' && ($existing['owner_id'] ?? '') !== $currentUser['id']) {
                        respond(['success' => false, 'error' => 'You do not have permission to change this record.', 'code' => 'forbidden'], 403);
                    }
                    $recordData['owner_id'] = $ownerId !== '' ? $ownerId : ($existing['owner_id'] ?? '');
                    $recordData['owner_email'] = $ownerEmail !== '' ? $ownerEmail : ($existing['owner_email'] ?? '');
                    $recordData['created_by'] = $existing['created_by'] ?? $currentUser['id'];
                    $recordData['verified_by'] = $currentUser['id'];
                    $records[$index] = $recordData;
                    $updated = true;
                    break;
                }
            }
            if (!$updated) {
                $recordData['owner_id'] = $ownerId;
                $recordData['owner_email'] = $ownerEmail;
                $recordData['created_by'] = $currentUser['id'];
                $recordData['verified_by'] = $currentUser['id'];
                array_unshift($records, $recordData);
            }
            writeRecords($dbFile, $records);
            return ['record' => $recordData, 'records' => array_values($records)];
        });
        if ($currentUser['role'] === 'resident') {
            $result['records'] = array_values(array_filter($result['records'], static function ($record) use ($currentUser): bool {
                return ($record['owner_id'] ?? '') === $currentUser['id'];
            }));
        }
        auditEvent($auditFile, $currentUser, $recordId === '' ? 'records.create' : 'records.update', ['record_id' => $result['record']['id']]);
        respond(['success' => true, 'record' => $result['record'], 'records' => $result['records']]);
    }

    $recordId = textValue($input, 'id', '', 64);
    if ($recordId === '') {
        respond(['success' => false, 'error' => 'Record ID is required.'], 400);
    }
    $records = withRecordsLock($dbFile, LOCK_EX, static function (array $records) use ($dbFile, $recordId, $currentUser): array {
        $found = false;
        foreach ($records as $record) {
            if (is_array($record) && ($record['id'] ?? '') === $recordId) {
                $found = true;
                if ($currentUser['role'] === 'resident' && ($record['owner_id'] ?? '') !== $currentUser['id']) {
                    respond(['success' => false, 'error' => 'You do not have permission to remove this record.', 'code' => 'forbidden'], 403);
                }
                break;
            }
        }
        if (!$found) {
            respond(['success' => false, 'error' => 'The requested record was not found.'], 404);
        }
        $remaining = array_values(array_filter($records, static function ($record) use ($recordId): bool {
            return !is_array($record) || ($record['id'] ?? '') !== $recordId;
        }));
        writeRecords($dbFile, $remaining);
        return $remaining;
    });
    auditEvent($auditFile, $currentUser, 'records.delete', ['record_id' => $recordId]);
    if ($currentUser['role'] === 'resident') {
        $records = array_values(array_filter($records, static function ($record) use ($currentUser): bool {
            return ($record['owner_id'] ?? '') === $currentUser['id'];
        }));
    }
    respond(['success' => true, 'records' => $records]);
}

respond(['success' => false, 'error' => 'Invalid API action.'], 404);
