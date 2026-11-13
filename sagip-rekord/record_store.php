<?php
declare(strict_types=1);

function formatRecord(array $row, array $checklist = []): array
{
    $row['owner_id'] = (string) ($row['owner_id'] ?? '');
    $row['created_by'] = (string) ($row['created_by'] ?? '');
    $row['verified_by'] = (string) ($row['verified_by'] ?? '');
    $row['edit_count'] = (int) $row['edit_count'];
    $row['updated_at'] = date('M d, Y h:i A', strtotime((string) $row['updated_at']));
    $row['checklist'] = $checklist;
    return $row;
}

function recordsForUser(PDO $pdo, array $user): array
{
    if ($user['role'] === 'resident') {
        $statement = $pdo->prepare(
            'SELECT * FROM records WHERE owner_id = :owner_id ORDER BY updated_at DESC, id'
        );
        $statement->execute(['owner_id' => $user['id']]);
        $rows = $statement->fetchAll();
    } else {
        $rows = $pdo->query('SELECT * FROM records ORDER BY updated_at DESC, id')->fetchAll();
    }

    if ($rows === []) {
        return [];
    }

    $recordIds = array_column($rows, 'id');
    $placeholders = implode(',', array_fill(0, count($recordIds), '?'));
    $checklistStatement = $pdo->prepare(
        'SELECT record_id, item_text, is_done FROM record_checklist
         WHERE record_id IN (' . $placeholders . ')
         ORDER BY record_id, position'
    );
    $checklistStatement->execute($recordIds);
    $checklists = [];
    foreach ($checklistStatement->fetchAll() as $item) {
        $checklists[$item['record_id']][] = [
            'text' => (string) $item['item_text'],
            'done' => (bool) $item['is_done'],
        ];
    }

    return array_map(
        static function (array $row) use ($checklists): array {
            return formatRecord($row, $checklists[$row['id']] ?? []);
        },
        $rows
    );
}

function saveRecord(PDO $pdo, array $record, array $user, ?string $ownerId, string $ownerEmail): array
{
    $pdo->beginTransaction();
    try {
        $lookup = $pdo->prepare('SELECT * FROM records WHERE id = :id FOR UPDATE');
        $lookup->execute(['id' => $record['id']]);
        $existing = $lookup->fetch();
        if (is_array($existing) && $user['role'] === 'resident' && $existing['owner_id'] !== $user['id']) {
            $pdo->rollBack();
            respond(['success' => false, 'error' => 'You do not have permission to change this record.', 'code' => 'forbidden'], 403);
        }

        if ($user['role'] === 'resident') {
            $ownerId = $user['id'];
        } elseif ($ownerId === null && is_array($existing)) {
            $ownerId = $existing['owner_id'];
        }
        if ($ownerEmail === '' && is_array($existing)) {
            $ownerEmail = (string) $existing['owner_email'];
        }
        $createdBy = is_array($existing) && $existing['created_by'] !== null
            ? $existing['created_by']
            : $user['id'];
        $createdAt = is_array($existing) ? $existing['created_at'] : date('Y-m-d H:i:s');
        $updatedAt = date('Y-m-d H:i:s');

        $values = [
            'id' => $record['id'],
            'owner_id' => $ownerId,
            'owner_email' => $ownerEmail,
            'created_by' => $createdBy,
            'verified_by' => $user['id'],
            'doc_type' => $record['doc_type'],
            'resident_name' => $record['resident_name'],
            'reference_no' => $record['reference_no'],
            'amount_or_date' => $record['amount_or_date'],
            'purok_address' => $record['purok_address'],
            'priority_level' => $record['priority_level'],
            'original_ocr' => $record['original_ocr'],
            'verified_ocr' => $record['verified_ocr'],
            'verified_advice' => $record['verified_advice'],
            'correction_note' => $record['correction_note'],
            'edit_count' => $record['edit_count'],
            'created_at' => $createdAt,
            'updated_at' => $updatedAt,
        ];

        if (is_array($existing)) {
            $sql = 'UPDATE records SET owner_id = :owner_id, owner_email = :owner_email,
                    created_by = :created_by, verified_by = :verified_by, doc_type = :doc_type,
                    resident_name = :resident_name, reference_no = :reference_no,
                    amount_or_date = :amount_or_date, purok_address = :purok_address,
                    priority_level = :priority_level, original_ocr = :original_ocr,
                    verified_ocr = :verified_ocr, verified_advice = :verified_advice,
                    correction_note = :correction_note, edit_count = :edit_count,
                    updated_at = :updated_at WHERE id = :id';
            $updateValues = $values;
            unset($updateValues['created_at']);
            $pdo->prepare($sql)->execute($updateValues);
        } else {
            $sql = 'INSERT INTO records (
                        id, owner_id, owner_email, created_by, verified_by, doc_type, resident_name,
                        reference_no, amount_or_date, purok_address, priority_level, original_ocr,
                        verified_ocr, verified_advice, correction_note, edit_count, created_at, updated_at
                    ) VALUES (
                        :id, :owner_id, :owner_email, :created_by, :verified_by, :doc_type, :resident_name,
                        :reference_no, :amount_or_date, :purok_address, :priority_level, :original_ocr,
                        :verified_ocr, :verified_advice, :correction_note, :edit_count, :created_at, :updated_at
                    )';
            $pdo->prepare($sql)->execute($values);
        }

        $pdo->prepare('DELETE FROM record_checklist WHERE record_id = :record_id')
            ->execute(['record_id' => $record['id']]);
        $insertChecklist = $pdo->prepare(
            'INSERT INTO record_checklist (record_id, position, item_text, is_done)
             VALUES (:record_id, :position, :item_text, :is_done)'
        );
        foreach ($record['checklist'] as $position => $item) {
            $insertChecklist->execute([
                'record_id' => $record['id'],
                'position' => $position,
                'item_text' => $item['text'],
                'is_done' => $item['done'] ? 1 : 0,
            ]);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }

    $statement = $pdo->prepare('SELECT * FROM records WHERE id = :id');
    $statement->execute(['id' => $record['id']]);
    $saved = $statement->fetch();
    if (!is_array($saved)) {
        throw new RuntimeException('The saved record could not be reloaded.');
    }
    $checklists = $pdo->prepare(
        'SELECT item_text, is_done FROM record_checklist WHERE record_id = :record_id ORDER BY position'
    );
    $checklists->execute(['record_id' => $record['id']]);
    $items = array_map(
        static fn (array $item): array => ['text' => (string) $item['item_text'], 'done' => (bool) $item['is_done']],
        $checklists->fetchAll()
    );
    return formatRecord($saved, $items);
}

function deleteRecord(PDO $pdo, string $recordId, array $user): void
{
    $pdo->beginTransaction();
    try {
        $statement = $pdo->prepare('SELECT owner_id FROM records WHERE id = :id FOR UPDATE');
        $statement->execute(['id' => $recordId]);
        $record = $statement->fetch();
        if (!is_array($record)) {
            $pdo->rollBack();
            respond(['success' => false, 'error' => 'The requested record was not found.'], 404);
        }
        if ($user['role'] === 'resident' && $record['owner_id'] !== $user['id']) {
            $pdo->rollBack();
            respond(['success' => false, 'error' => 'You do not have permission to remove this record.', 'code' => 'forbidden'], 403);
        }
        $pdo->prepare('DELETE FROM records WHERE id = :id')->execute(['id' => $recordId]);
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
}
