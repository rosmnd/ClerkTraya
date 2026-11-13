<?php
header('Content-Type: application/json');

$envPath = __DIR__ . '/.env';

function loadEnv($path) {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) continue;
        list($name, $value) = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value, " \t\n\r\0\x0B\"'");
    }
}
loadEnv($envPath);

$apiKey    = $_ENV['LUMEN_API_KEY'] ?? 'a9311292-287b-4fba-895e-7a78a7d7df00';
$apiSecret = $_ENV['LUMEN_API_SECRET'] ?? 'Jds84bWocJKKOlgaawI6WimaNdEg4Zw6';
$ocrUrl    = trim($_ENV['LUMEN_OCR_URL'] ?? '');
$chatUrl   = trim($_ENV['LUMEN_CHAT_URL'] ?? '');

$dbFile   = __DIR__ . '/records.json';
$lockFile = __DIR__ . '/records.json.lock';

// Thread-safe read/write using records.json.lock
function readRecordsSafe($dbFile, $lockFile) {
    $fp = fopen($lockFile, 'c+');
    if ($fp) flock($fp, LOCK_SH);
    $data = file_exists($dbFile) ? json_decode(file_get_contents($dbFile), true) : [];
    if ($fp) { flock($fp, LOCK_UN); fclose($fp); }
    return is_array($data) ? $data : [];
}

function writeRecordsSafe($dbFile, $lockFile, $records) {
    $fp = fopen($lockFile, 'c+');
    if ($fp) flock($fp, LOCK_EX);
    file_put_contents($dbFile, json_encode($records, JSON_PRETTY_PRINT));
    if ($fp) { flock($fp, LOCK_UN); fclose($fp); }
}

if (!file_exists($dbFile)) {
    $seedRecords = [
        [
            'id'              => 'SR-8842A1',
            'doc_type'        => 'Forms (DAF-AC Relief Intake)',
            'resident_name'   => 'Santos, Maria Elena R.',
            'reference_no'    => 'PLTW-2026-0841',
            'amount_or_date'  => 'Nov 13, 2026',
            'purok_address'   => 'Sitio Kalayaan, Brgy. Palatiw, Pasig City',
            'priority_level'  => 'High Priority',
            'original_ocr'    => "BARANGAY PALATIW - DAF-AC FORM\nControl No: PLTW-2026-0841\nHead: Sant0s, Maria Elena R.\nDependents: 6 (1 Senior, 1 Infant)\nNeeds: Losartan 50mg, lost Senior ID.",
            'verified_ocr'    => "BARANGAY PALATIW - DAF-AC FORM\nControl No: PLTW-2026-0841\nHead: Santos, Maria Elena R.\nDependents: 6 (1 Senior, 1 Infant)\nNeeds: Losartan 50mg, lost Senior ID.",
            'verified_advice' => "• Ito ay DAF-AC Relief Record para kay Maria Elena R. Santos (Control #PLTW-2026-0841).\n• May 6 na miyembro sa pamilya kasama ang 1 Senior Citizen at 1 sanggol.\n\nMga Hakbang na Dapat Gawin:\n1. Ipakita ang Control #PLTW-2026-0841 sa Barangay Palatiw Health Station para sa libreng Losartan 50mg.\n2. Humingi ng Barangay Certificate of Calamity para sa libreng replacement ng Senior Citizen ID sa OSCA.\n3. Pumunta sa Covered Court bukas nang 8:00 AM para sa 2nd Wave DSWD Relief Pack.",
            'checklist'       => [
                ['text' => 'Claim free Losartan 50mg at Barangay Health Station', 'done' => true],
                ['text' => 'Request Certificate of Calamity for lost Senior ID', 'done' => false],
                ['text' => 'Bring verified slip #PLTW-2026-0841 to Covered Court', 'done' => false]
            ],
            'correction_note' => 'Fixed OCR typo in surname (Sant0s -> Santos)',
            'edit_count'      => 1,
            'updated_at'      => date('M d, Y h:i A')
        ],
        [
            'id'              => 'SR-3091B4',
            'doc_type'        => 'Bills (Utility / Disconnection Notice)',
            'resident_name'   => 'Dela Cruz, Roberto M.',
            'reference_no'    => 'MRLC-4491028',
            'amount_or_date'  => 'PHP 2,840.50 • Due Nov 20',
            'purok_address'   => 'Market Ave., Brgy. Palatiw, Pasig City',
            'priority_level'  => 'Action Required',
            'original_ocr'    => "MERALCO ELECTRIC BILLING STATEMENT\nAccount: MRLC-4491028\nTotal Due: PHP 2,840.50\nDue Date: Nov 20, 2026\nAdvisory: Typhoon-affected households in Pasig may request a 30-day staggered payment arrangement.",
            'verified_ocr'    => "MERALCO ELECTRIC BILLING STATEMENT\nAccount: MRLC-4491028\nTotal Due: PHP 2,840.50\nDue Date: Nov 20, 2026\nAdvisory: Typhoon-affected households in Pasig may request a 30-day staggered payment arrangement.",
            'verified_advice' => "• Ang iyong Meralco bill (Account #MRLC-4491028) ay nagkakahalaga ng PHP 2,840.50 at due sa Nov 20, 2026.\n• Dahil sa bagyo, pwedeng mag-request ng 30-day installment plan.\n\nMga Hakbang na Dapat Gawin:\n1. Kumuha ng Barangay Palatiw Calamity Certification.\n2. Dalhin ang bill at sertipiko sa Meralco Business Center bago mag-Nov 20, 2026 para sa 30-day extension.",
            'checklist'       => [
                ['text' => 'Secure Barangay Palatiw Calamity Certificate', 'done' => true],
                ['text' => 'File 30-day staggered payment request before Nov 20', 'done' => false]
            ],
            'correction_note' => 'Verified total amount and due date',
            'edit_count'      => 0,
            'updated_at'      => date('M d, Y h:i A')
        ]
    ];
    writeRecordsSafe($dbFile, $lockFile, $seedRecords);
}

$action = $_GET['action'] ?? '';

// 0. CHECK OR UPDATE LUMEN API ENDPOINTS IN .ENV
if ($action === 'config_status') {
    echo json_encode([
        'success'    => true,
        'has_key'    => !empty($apiKey) && !empty($apiSecret),
        'ocr_url'    => $ocrUrl,
        'chat_url'   => $chatUrl,
        'live_ready' => (!empty($ocrUrl) || !empty($chatUrl))
    ]);
    exit;
}

if ($action === 'save_config' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input      = json_decode(file_get_contents('php://input'), true);
    $newOcrUrl  = trim($input['ocr_url'] ?? '');
    $newChatUrl = trim($input['chat_url'] ?? '');

    $envContent = "LUMEN_API_KEY={$apiKey}\n"
                . "LUMEN_API_SECRET={$apiSecret}\n"
                . "LUMEN_OCR_URL={$newOcrUrl}\n"
                . "LUMEN_CHAT_URL={$newChatUrl}\n";

    file_put_contents($envPath, $envContent);
    echo json_encode(['success' => true, 'ocr_url' => $newOcrUrl, 'chat_url' => $newChatUrl]);
    exit;
}

// 1. LUMEN OCR ENDPOINT
if ($action === 'ocr' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_FILES['document']) || $_FILES['document']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'error' => 'Please select a valid image or PDF file.']);
        exit;
    }

    $tmpPath  = $_FILES['document']['tmp_name'];
    $fileName = $_FILES['document']['name'];
    $mimeType = $_FILES['document']['type'] ?: 'application/octet-stream';

    if (!empty($ocrUrl) && filter_var($ocrUrl, FILTER_VALIDATE_URL)) {
        $ch = curl_init($ocrUrl);
        $cfile = new CURLFile($tmpPath, $mimeType, $fileName);

        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => ['file' => $cfile, 'image' => $cfile, 'document' => $cfile],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 45,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_HTTPHEADER     => [
                'lumen-api-key: ' . $apiKey,
                'lumen-api-secret: ' . $apiSecret
            ]
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        curl_close($ch);

        if (!$curlErr && $httpCode >= 200 && $httpCode < 300 && !empty($response)) {
            $decoded = json_decode($response, true);
            $extractedText = $decoded['text']
                ?? $decoded['data']['text']
                ?? $decoded['result']['text']
                ?? $decoded['extracted_text']
                ?? $decoded['result']
                ?? $decoded['content']
                ?? $response;

            echo json_encode([
                'success'   => true,
                'mode'      => 'live_lumen_ocr',
                'http_code' => $httpCode,
                'raw_text'  => is_string($extractedText) ? $extractedText : json_encode($extractedText, JSON_PRETTY_PRINT)
            ]);
            exit;
        }
    }

    // Instruct frontend to run real Tesseract/PDF.js OCR on the uploaded file
    echo json_encode([
        'success'          => true,
        'mode'             => 'client_real_ocr',
        'needs_client_ocr' => true,
        'file_name'        => $fileName
    ]);
    exit;
}

// 2. LUMEN AI CHAT ENDPOINT + DYNAMIC DOCUMENT ANALYZER
function buildDynamicAnalysis($docText, $question, $language) {
    $isEnglish = stripos($language, 'English') !== false && stripos($language, 'Taglish') === false;
    $isPureTagalog = stripos($language, 'Pure Tagalog') !== false || stripos($language, 'Simple Tagalog') !== false;

    preg_match('/(?:Head of Household|Head of Family|Resident|Name|Account Name|Patient|Payee|Head):\s*([^\n\r]+)/i', $docText, $nameM);
    preg_match('/(?:Control\s*\/\s*Stub\s*No|Stub\s*#|Control\s*No|Reference\s*No|Account\s*No|Account|OR\s*No|Memo\s*No|Rx\s*#):\s*([A-Za-z0-9\-]+)/i', $docText, $refM);
    preg_match('/(?:PHP|P|₱)\s*([0-9,]+(?:\.[0-9]{2})?)/i', $docText, $amtM);
    preg_match('/(?:Due Date|Deadline|Date Issued|Date):\s*([^\n\r]+)/i', $docText, $dateM);
    preg_match('/(?:Address|Location|Venue|Branch):\s*([^\n\r]+)/i', $docText, $addrM);
    preg_match('/(?:Urgent Needs|Needs|Items Purchased|Subject|Advisory):\s*([^\n\r]+)/i', $docText, $needsM);

    $name  = isset($nameM[1]) ? trim($nameM[1]) : 'ang residente';
    $ref   = isset($refM[1]) ? trim($refM[1]) : 'N/A';
    $amt   = isset($amtM[0]) ? trim($amtM[0]) : '';
    $date  = isset($dateM[1]) ? trim($dateM[1]) : '';
    $addr  = isset($addrM[1]) ? trim($addrM[1]) : 'Barangay Palatiw, Pasig City';
    $needs = isset($needsM[1]) ? trim($needsM[1]) : '';

    $qLower = strtolower($question);
    $asksRequirements = preg_match('/(requirement|dadalhin|dalhin|bring|deadline|kailan|when|magkano|how much|bayad|amount)/i', $qLower);
    $asksAidOrDiscount = preg_match('/(diskwento|discount|tulong|aid|assistance|installment|extension|claim|malasakit|dswd|calamity|id|affidavit)/i', $qLower);

    if ($isEnglish) {
        $summary = "📌 DOCUMENT SUMMARY (Plain English):\n"
            . "• Name / Household: {$name}\n"
            . ($ref !== 'N/A' ? "• Reference / Control Number: {$ref}\n" : "")
            . ($amt ? "• Amount Stated: {$amt}\n" : "")
            . ($date ? "• Important Date / Deadline: {$date}\n" : "")
            . ($needs ? "• Key Details Found: {$needs}\n" : "")
            . "• Location / Office: {$addr}\n\n";

        if ($asksRequirements) {
            $summary .= "📋 REQUIREMENTS & DEADLINES:\n"
                . "1. Bring this verified SagipRekord Slip (Ref #{$ref}) and 1 valid ID or Barangay Certificate.\n"
                . ($amt ? "2. Prepare or verify the stated amount of {$amt}.\n" : "2. Present your original copy or photo of this document at the desk.\n")
                . ($date ? "3. Complete this on or before {$date} at {$addr}.\n" : "3. Visit the Barangay Palatiw Help Desk between 8:00 AM and 5:00 PM.\n");
        } elseif ($asksAidOrDiscount) {
            $summary .= "🤝 HOW TO CLAIM RELIEF OR ASSISTANCE:\n"
                . "1. Request a free Barangay Certificate of Calamity / Indigency at Barangay Palatiw Hall.\n"
                . "2. Present Reference #{$ref} to apply for bill extension, free ID replacement, or DSWD AICS medical reimbursement.\n"
                . "3. Senior Citizens and PWDs have a priority lane at the Barangay Palatiw Health & DRRMO Desk.\n";
        } else {
            $summary .= "✅ STEP-BY-STEP ACTION CHECKLIST:\n"
                . "1. Keep Reference #{$ref} safe and save this paper to your Saved Papers Vault.\n"
                . ($needs ? "2. Coordinate with the Barangay Desk regarding: {$needs}.\n" : "2. Bring this verified slip to {$addr}.\n")
                . ($date ? "3. Complete this before the deadline ({$date}).\n" : "3. Bring a valid ID or Barangay Certificate when claiming assistance.\n")
                . "4. Print a copy of this Action Slip if you need a physical copy.";
        }
        return $summary;
    }

    $headerLabel = $isPureTagalog ? "📌 MALINAW NA PALIWANAG SA PAPEL (Tagalog):" : "📌 PALIWANAG SA DOKUMENTO (Taglish):";
    $out = $headerLabel . "\n"
        . "• Pangalan sa Dokumento: {$name}\n"
        . ($ref !== 'N/A' ? "• Control / Reference Number: {$ref}\n" : "")
        . ($amt ? "• Nakasaad na Halaga: {$amt}\n" : "")
        . ($date ? "• Petsa o Deadline: {$date}\n" : "")
        . ($needs ? "• Mahahalagang Detalye: {$needs}\n" : "")
        . "• Lugar / Opisina: {$addr}\n\n";

    if ($asksRequirements) {
        $out .= "📋 MGA KAILANGANG DALHIN AT DEADLINE:\n"
            . "1. Dalhin ang verified SagipRekord Slip na ito (Ref #{$ref}) at kahit anong valid ID o Barangay Certificate.\n"
            . ($amt ? "2. Ihanda o i-verify ang nakasaad na halagang {$amt}.\n" : "2. Ipakita ang malinaw na kopya o litrato ng dokumentong ito sa officer.\n")
            . ($date ? "3. Pumunta bago sumapit ang {$date} sa {$addr}.\n" : "3. Pumunta sa Barangay Palatiw Hall mula 8:00 AM hanggang 4:00 PM.\n");
    } elseif ($asksAidOrDiscount) {
        $out .= "🤝 PAANO KUMUHA NG TULONG, EXTENSION, O DISKWENTO:\n"
            . "1. Humingi ng libreng Barangay Certificate of Calamity / Indigency sa Barangay Palatiw Hall.\n"
            . "2. Ipakita ang Reference #{$ref} para makakuha ng 30-day bill extension, libreng pamalit sa nabahang ID, o DSWD AICS medical reimbursement.\n"
            . "3. May priority lane para sa Senior Citizens at PWD sa Barangay Palatiw DRRMO at Health Desk.\n";
    } else {
        $out .= "✅ MGA HAKBANG NA DAPAT GAWIN (ACTION STEPS):\n"
            . "1. I-save ang rekord na ito (Ref #{$ref}) sa iyong Saved Papers Vault.\n"
            . ($needs ? "2. Ipakita sa Barangay Palatiw Desk ang nakatalang detalye: {$needs}.\n" : "2. Dalhin ang verified slip na ito sa {$addr}.\n")
            . ($date ? "3. Asikasuhin ito bago ang nakasaad na petsa ({$date}).\n" : "3. Magdala ng valid ID o Barangay Certificate bilang patunay.\n")
            . "4. I-print ang Action Slip kung kailangan ng pisikal na kopya.";
    }
    return $out;
}

if ($action === 'chat' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input        = json_decode(file_get_contents('php://input'), true);
    $documentText = trim($input['document_text'] ?? '');
    $userQuestion = trim($input['prompt'] ?? 'Ipaliwanag ang dokumentong ito at ibigay ang mga hakbang na dapat gawin.');
    $language     = trim($input['language'] ?? 'Taglish');

    if ($documentText === '') {
        echo json_encode(['success' => false, 'error' => 'No document text provided.']);
        exit;
    }

    $systemPrompt = "You are SagipRekord AI, a senior-friendly public document assistant for Barangay Palatiw DRRMO in Pasig City. "
        . "Respond in $language using simple, clear words. Start summary points with '• ' and numbered checklist steps with '1. ', '2. ', '3. '.";

    $combinedPrompt = $systemPrompt . "\n\nVERIFIED DOCUMENT:\n" . $documentText . "\n\nUSER QUESTION:\n" . $userQuestion;

    if (!empty($chatUrl) && filter_var($chatUrl, FILTER_VALIDATE_URL)) {
        $ch = curl_init($chatUrl);
        $payload = json_encode([
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => "Document:\n$documentText\n\nQuestion ($language): $userQuestion"]
            ],
            'prompt'  => $combinedPrompt,
            'message' => $combinedPrompt,
            'query'   => $combinedPrompt
        ]);

        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 45,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'lumen-api-key: ' . $apiKey,
                'lumen-api-secret: ' . $apiSecret
            ]
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        curl_close($ch);

        if (!$curlErr && $httpCode >= 200 && $httpCode < 300 && !empty($response)) {
            $decoded = json_decode($response, true);
            $reply = $decoded['reply']
                ?? $decoded['response']
                ?? $decoded['message']
                ?? $decoded['data']['reply']
                ?? $decoded['data']['text']
                ?? $decoded['choices'][0]['message']['content']
                ?? $response;

            echo json_encode([
                'success'   => true,
                'mode'      => 'live_lumen_chat',
                'http_code' => $httpCode,
                'reply'     => is_string($reply) ? $reply : json_encode($reply, JSON_PRETTY_PRINT)
            ]);
            exit;
        }
    }

    echo json_encode([
        'success' => true,
        'mode'    => 'dynamic_analyzer',
        'reply'   => buildDynamicAnalysis($documentText, $userQuestion, $language)
    ]);
    exit;
}

// 3. VAULT CRUD ENDPOINTS (WITH FILE LOCKING)
if ($action === 'list') {
    $records = readRecordsSafe($dbFile, $lockFile);
    echo json_encode(['success' => true, 'records' => $records]);
    exit;
}

if ($action === 'save' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input   = json_decode(file_get_contents('php://input'), true);
    $records = readRecordsSafe($dbFile, $lockFile);

    $recordId = !empty($input['id']) ? $input['id'] : 'SR-' . strtoupper(substr(md5(uniqid()), 0, 6));

    $recordData = [
        'id'              => $recordId,
        'doc_type'        => $input['doc_type'] ?? 'Forms (DAF-AC Relief Intake)',
        'resident_name'   => $input['resident_name'] ?? 'Unnamed Resident',
        'reference_no'    => $input['reference_no'] ?? 'N/A',
        'amount_or_date'  => $input['amount_or_date'] ?? 'N/A',
        'purok_address'   => $input['purok_address'] ?? 'Brgy. Palatiw, Pasig City',
        'priority_level'  => $input['priority_level'] ?? 'High Priority',
        'original_ocr'    => $input['original_ocr'] ?? '',
        'verified_ocr'    => $input['verified_ocr'] ?? '',
        'verified_advice' => $input['verified_advice'] ?? '',
        'checklist'       => $input['checklist'] ?? [],
        'correction_note' => $input['correction_note'] ?? 'Checked & verified by user',
        'edit_count'      => intval($input['edit_count'] ?? 0),
        'updated_at'      => date('M d, Y h:i A')
    ];

    $updated = false;
    foreach ($records as $index => $existing) {
        if ($existing['id'] === $recordId) {
            $records[$index] = $recordData;
            $updated = true;
            break;
        }
    }
    if (!$updated) {
        array_unshift($records, $recordData);
    }

    writeRecordsSafe($dbFile, $lockFile, $records);
    echo json_encode(['success' => true, 'record' => $recordData, 'records' => $records]);
    exit;
}

if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input   = json_decode(file_get_contents('php://input'), true);
    $id      = $input['id'] ?? '';
    $records = readRecordsSafe($dbFile, $lockFile);
    $records = array_values(array_filter($records, fn($r) => $r['id'] !== $id));
    writeRecordsSafe($dbFile, $lockFile, $records);
    echo json_encode(['success' => true, 'records' => $records]);
    exit;
}

echo json_encode(['success' => false, 'error' => 'Invalid API action']);