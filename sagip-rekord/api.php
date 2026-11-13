<?php
header('Content-Type: application/json');

// Load .env credentials on the backend
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
loadEnv(__DIR__ . '/.env');

$apiKey    = $_ENV['LUMEN_API_KEY'] ?? '';
$apiSecret = $_ENV['LUMEN_API_SECRET'] ?? '';
$ocrUrl    = $_ENV['LUMEN_OCR_URL'] ?? '';
$chatUrl   = $_ENV['LUMEN_CHAT_URL'] ?? '';

$dbFile = __DIR__ . '/records.json';

// Seed realistic Barangay Palatiw records on first run
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
            'verified_advice' => "• Ipakita ang Control #PLTW-2026-0841 sa Barangay Palatiw Health Station para sa libreng Losartan 50mg.\n• Kumuha ng Barangay Certificate of Calamity para sa libreng replacement ng Senior Citizen ID sa OSCA.\n• Pumunta sa Covered Court bukas nang 8:00 AM para sa 2nd Wave DSWD Relief Pack.",
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
            'verified_advice' => "• Ang iyong bill ay PHP 2,840.50 at due sa Nov 20, 2026.\n• Dahil sa bagyo, pwedeng mag-request ng 30-day installment plan.\n• Dalhin ang bill at Barangay Calamity Certification sa pinakamalapit na Meralco Business Center bago mag-Nov 20.",
            'checklist'       => [
                ['text' => 'Secure Barangay Palatiw Calamity Certificate', 'done' => true],
                ['text' => 'File 30-day staggered payment request before Nov 20', 'done' => false]
            ],
            'correction_note' => 'Verified total amount and due date',
            'edit_count'      => 0,
            'updated_at'      => date('M d, Y h:i A')
        ]
    ];
    file_put_contents($dbFile, json_encode($seedRecords, JSON_PRETTY_PRINT));
}

$action = $_GET['action'] ?? '';

// 1. LUMEN OCR ENDPOINT
if ($action === 'ocr' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_FILES['document']) || $_FILES['document']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'error' => 'Please select a valid image or PDF file.']);
        exit;
    }

    $tmpPath  = $_FILES['document']['tmp_name'];
    $fileName = $_FILES['document']['name'];
    $mimeType = $_FILES['document']['type'] ?: 'application/octet-stream';

    if (!empty($ocrUrl)) {
        $ch = curl_init($ocrUrl);
        $cfile = new CURLFile($tmpPath, $mimeType, $fileName);

        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => ['file' => $cfile],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 45,
            CURLOPT_HTTPHEADER     => [
                'lumen-api-key: ' . $apiKey,
                'lumen-api-secret: ' . $apiSecret
            ]
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        curl_close($ch);

        if ($curlErr) {
            echo json_encode(['success' => false, 'error' => 'Backend cURL Error: ' . $curlErr]);
            exit;
        }

        $decoded = json_decode($response, true);
        $extractedText = $decoded['text']
            ?? $decoded['data']['text']
            ?? $decoded['result']['text']
            ?? $decoded['result']
            ?? $decoded['content']
            ?? $response;

        echo json_encode([
            'success'   => ($httpCode >= 200 && $httpCode < 300),
            'mode'      => 'live_lumen_ocr',
            'http_code' => $httpCode,
            'raw_text'  => is_string($extractedText) ? $extractedText : json_encode($extractedText, JSON_PRETTY_PRINT)
        ]);
        exit;
    }

    // Fallback when testing before adding OCR endpoint URL
    echo json_encode([
        'success'  => true,
        'mode'     => 'demo_fallback',
        'raw_text' => "REPUBLIC OF THE PHILIPPINES\nBARANGAY PALATIW, PASIG CITY - DRRMO\nDISASTER ASSISTANCE FAMILY ACCESS CARD (DAF-AC)\n\nDate Issued: Nov 13, 2026\nControl / Stub No: PLTW-2026-0915\nHead of Household: Mendoza, Teresita L.\nAddress: Purok 4, Market Ave., Brgy. Palatiw, Pasig City\nAmount / Assistance: PHP 5,000.00 Emergency Cash Transfer (ECT)\nMedical / Urgent Needs: Insulin Pen (Glargine), Senior Citizen ID damaged by flood.\nDeadline: Claim on or before Nov 16, 2026 at Brgy. Palatiw Covered Court."
    ]);
    exit;
}

// 2. LUMEN AI CHAT ENDPOINT
if ($action === 'chat' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input        = json_decode(file_get_contents('php://input'), true);
    $documentText = trim($input['document_text'] ?? '');
    $userQuestion = trim($input['prompt'] ?? 'Ipaliwanag ang dokumentong ito at ibigay ang mga hakbang na dapat gawin.');
    $language     = trim($input['language'] ?? 'Taglish');

    if ($documentText === '') {
        echo json_encode(['success' => false, 'error' => 'No document text provided.']);
        exit;
    }

    $systemPrompt = "You are SagipRekord AI, an official public document and disaster relief assistant for Barangay Palatiw DRRMO in Pasig City, Philippines. "
        . "Help residents and barangay workers understand forms, receipts, bills, notices, and records. "
        . "Respond in $language. Format your response clearly with bullet points starting with '• ' for the summary and numbered steps (1., 2., 3.) for the exact actions the user must take.";

    $combinedPrompt = $systemPrompt . "\n\nVERIFIED DOCUMENT:\n" . $documentText . "\n\nUSER QUESTION:\n" . $userQuestion;

    if (!empty($chatUrl)) {
        $ch = curl_init($chatUrl);
        $payload = json_encode([
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => "Document:\n$documentText\n\nQuestion ($language): $userQuestion"]
            ],
            'prompt'  => $combinedPrompt,
            'message' => $combinedPrompt
        ]);

        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 45,
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

        if ($curlErr) {
            echo json_encode(['success' => false, 'error' => 'Backend cURL Error: ' . $curlErr]);
            exit;
        }

        $decoded = json_decode($response, true);
        $reply = $decoded['reply']
            ?? $decoded['response']
            ?? $decoded['message']
            ?? $decoded['data']['reply']
            ?? $decoded['data']['text']
            ?? $decoded['choices'][0]['message']['content']
            ?? $response;

        echo json_encode([
            'success'   => ($httpCode >= 200 && $httpCode < 300),
            'mode'      => 'live_lumen_chat',
            'http_code' => $httpCode,
            'reply'     => is_string($reply) ? $reply : json_encode($reply, JSON_PRETTY_PRINT)
        ]);
        exit;
    }

    // Smart contextual fallback based on language
    $replyText = "📌 PALIWANAG SA DOKUMENTO ($language):\n"
        . "• Ito ay opisyal na rekord para sa sambahayan/residente sa Barangay Palatiw, Pasig City.\n"
        . "• May nakatalang mahahalagang detalye gaya ng Control/Reference Number, petsa/halaga, at kailangang aksyunan agad.\n\n"
        . "✅ MGA HAKBANG NA DAPAT GAWIN (ACTION STEPS):\n"
        . "1. I-save at i-print ang verified SagipRekord Slip na ito bilang opisyal na digital copy.\n"
        . "2. Pumunta sa Barangay Palatiw Hall / DRRMO Desk at ipakita ang Reference Number.\n"
        . "3. Kung may nawawalang ID o reseta dahil sa baha, humingi ng libreng Barangay Certificate of Calamity Victim.\n"
        . "4. Kumpletuhin ang pag-claim o pagbayad bago ang nakasaad na deadline.";

    echo json_encode([
        'success' => true,
        'mode'    => 'demo_fallback',
        'reply'   => $replyText
    ]);
    exit;
}

// 3. VAULT CRUD ENDPOINTS
if ($action === 'list') {
    $records = json_decode(file_get_contents($dbFile), true) ?: [];
    echo json_encode(['success' => true, 'records' => $records]);
    exit;
}

if ($action === 'save' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input   = json_decode(file_get_contents('php://input'), true);
    $records = json_decode(file_get_contents($dbFile), true) ?: [];

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

    file_put_contents($dbFile, json_encode($records, JSON_PRETTY_PRINT));
    echo json_encode(['success' => true, 'record' => $recordData, 'records' => $records]);
    exit;
}

if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input   = json_decode(file_get_contents('php://input'), true);
    $id      = $input['id'] ?? '';
    $records = json_decode(file_get_contents($dbFile), true) ?: [];
    $records = array_values(array_filter($records, fn($r) => $r['id'] !== $id));
    file_put_contents($dbFile, json_encode($records, JSON_PRETTY_PRINT));
    echo json_encode(['success' => true, 'records' => $records]);
    exit;
}

echo json_encode(['success' => false, 'error' => 'Invalid API action']);