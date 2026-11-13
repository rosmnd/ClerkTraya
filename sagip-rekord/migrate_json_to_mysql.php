<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/database.php';

function readJsonArray(string $path): array
{
    if (!is_file($path)) {
        return [];
    }
    $data = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($data)) {
        throw new RuntimeException('Expected an array in ' . basename($path) . '.');
    }
    return $data;
}

function sqlDateTime($value, string $fallback): string
{
    if (!is_string($value) || trim($value) === '') {
        return $fallback;
    }
    try {
        return (new DateTimeImmutable($value))->format('Y-m-d H:i:s');
    } catch (Exception $error) {
        throw new RuntimeException('An imported date value is invalid.', 0, $error);
    }
}

function nullableUserId(PDO $pdo, $value): ?string
{
    if (!is_string($value) || $value === '') {
        return null;
    }
    $statement = $pdo->prepare('SELECT id FROM users WHERE id = :id');
    $statement->execute(['id' => $value]);
    $found = $statement->fetchColumn();
    return $found === false ? null : (string) $found;
}

$pdo = databaseConnection();
$migrationName = 'import_json_data_v1';
$migration = $pdo->prepare('SELECT migration_name FROM app_migrations WHERE migration_name = :name');
$migration->execute(['name' => $migrationName]);
if ($migration->fetchColumn() !== false) {
    fwrite(STDOUT, "Legacy JSON data was already imported.\n");
    exit(0);
}

$users = readJsonArray(__DIR__ . '/users.json');
$records = readJsonArray(__DIR__ . '/records.json');
$auditPath = __DIR__ . '/audit.jsonl';
$auditEvents = [];
if (is_file($auditPath)) {
    $lines = file($auditPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        throw new RuntimeException('Could not read the legacy audit log.');
    }
    foreach ($lines as $line) {
        $event = json_decode($line, true, 512, JSON_THROW_ON_ERROR);
        if (is_array($event)) {
            $auditEvents[] = $event;
        }
    }
}

$importedUsers = 0;
$importedRecords = 0;
$importedChecklistItems = 0;
$importedAuditEvents = 0;
$pdo->beginTransaction();

try {
    $findUser = $pdo->prepare('SELECT id, email FROM users WHERE id = :id OR email = :email LIMIT 1');
    $insertUser = $pdo->prepare(
        'INSERT INTO users (id, name, email, role, barangay, active, password_hash, created_at)
         VALUES (:id, :name, :email, :role, :barangay, :active, :password_hash, :created_at)'
    );
    foreach ($users as $user) {
        if (!is_array($user) || empty($user['id']) || empty($user['email']) || empty($user['password_hash'])) {
            throw new RuntimeException('A legacy account is missing required fields.');
        }
        $id = (string) $user['id'];
        $email = strtolower((string) $user['email']);
        $findUser->execute(['id' => $id, 'email' => $email]);
        $existing = $findUser->fetch();
        if (is_array($existing)) {
            if ((string) $existing['id'] === $id) {
                continue;
            }
            throw new RuntimeException('An account email conflicts with an existing database account.');
        }
        $insertUser->execute([
            'id' => $id,
            'name' => (string) ($user['name'] ?? ''),
            'email' => $email,
            'role' => (string) ($user['role'] ?? 'resident'),
            'barangay' => (string) ($user['barangay'] ?? 'Palatiw'),
            'active' => !empty($user['active']) ? 1 : 0,
            'password_hash' => (string) $user['password_hash'],
            'created_at' => sqlDateTime($user['created_at'] ?? null, date('Y-m-d H:i:s')),
        ]);
        $importedUsers++;
    }

    $insertRecord = $pdo->prepare(
        'INSERT INTO records (
            id, owner_id, owner_email, created_by, verified_by, doc_type, resident_name,
            reference_no, amount_or_date, purok_address, priority_level, original_ocr,
            verified_ocr, verified_advice, correction_note, edit_count, created_at, updated_at
         ) VALUES (
            :id, :owner_id, :owner_email, :created_by, :verified_by, :doc_type, :resident_name,
            :reference_no, :amount_or_date, :purok_address, :priority_level, :original_ocr,
            :verified_ocr, :verified_advice, :correction_note, :edit_count, :created_at, :updated_at
         )'
    );
    $insertChecklist = $pdo->prepare(
        'INSERT INTO record_checklist (record_id, position, item_text, is_done)
         VALUES (:record_id, :position, :item_text, :is_done)'
    );
    foreach ($records as $record) {
        if (!is_array($record) || empty($record['id'])) {
            throw new RuntimeException('A legacy record is missing its ID.');
        }
        $id = (string) $record['id'];
        $updatedAt = sqlDateTime($record['updated_at'] ?? null, date('Y-m-d H:i:s'));
        $ownerId = nullableUserId($pdo, $record['owner_id'] ?? null);
        $createdBy = nullableUserId($pdo, $record['created_by'] ?? null);
        $verifiedBy = nullableUserId($pdo, $record['verified_by'] ?? null);
        $insertRecord->execute([
            'id' => $id,
            'owner_id' => $ownerId,
            'owner_email' => strtolower((string) ($record['owner_email'] ?? '')),
            'created_by' => $createdBy,
            'verified_by' => $verifiedBy,
            'doc_type' => (string) ($record['doc_type'] ?? ''),
            'resident_name' => (string) ($record['resident_name'] ?? ''),
            'reference_no' => (string) ($record['reference_no'] ?? ''),
            'amount_or_date' => (string) ($record['amount_or_date'] ?? ''),
            'purok_address' => (string) ($record['purok_address'] ?? ''),
            'priority_level' => (string) ($record['priority_level'] ?? 'Standard Record'),
            'original_ocr' => (string) ($record['original_ocr'] ?? ''),
            'verified_ocr' => (string) ($record['verified_ocr'] ?? ''),
            'verified_advice' => (string) ($record['verified_advice'] ?? ''),
            'correction_note' => (string) ($record['correction_note'] ?? ''),
            'edit_count' => max(0, min(50000, (int) ($record['edit_count'] ?? 0))),
            'created_at' => sqlDateTime($record['created_at'] ?? null, $updatedAt),
            'updated_at' => $updatedAt,
        ]);
        $importedRecords++;

        $checklist = $record['checklist'] ?? [];
        if (!is_array($checklist)) {
            throw new RuntimeException('A record checklist is invalid.');
        }
        foreach (array_values($checklist) as $position => $item) {
            if (!is_array($item) || !isset($item['text']) || !is_string($item['text'])) {
                throw new RuntimeException('A record checklist item is invalid.');
            }
            $insertChecklist->execute([
                'record_id' => $id,
                'position' => $position,
                'item_text' => $item['text'],
                'is_done' => !empty($item['done']) ? 1 : 0,
            ]);
            $importedChecklistItems++;
        }
    }

    $insertAudit = $pdo->prepare(
        'INSERT INTO audit_events (event_time, actor_id, actor_name, actor_role, event_name, details_json)
         VALUES (:event_time, :actor_id, :actor_name, :actor_role, :event_name, :details_json)'
    );
    foreach ($auditEvents as $event) {
        $details = json_encode($event['details'] ?? [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        if ($details === false) {
            throw new RuntimeException('A legacy audit event could not be encoded.');
        }
        $insertAudit->execute([
            'event_time' => sqlDateTime($event['timestamp'] ?? null, date('Y-m-d H:i:s')),
            'actor_id' => (string) ($event['actor_id'] ?? 'system'),
            'actor_name' => (string) ($event['actor_name'] ?? 'System'),
            'actor_role' => (string) ($event['actor_role'] ?? 'system'),
            'event_name' => (string) ($event['event'] ?? 'legacy.import'),
            'details_json' => $details,
        ]);
        $importedAuditEvents++;
    }

    $pdo->prepare('INSERT INTO app_migrations (migration_name) VALUES (:name)')
        ->execute(['name' => $migrationName]);
    $pdo->commit();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $error;
}

fwrite(
    STDOUT,
    sprintf(
        "Imported %d accounts, %d records, %d checklist items, and %d audit events.\n",
        $importedUsers,
        $importedRecords,
        $importedChecklistItems,
        $importedAuditEvents
    )
);
