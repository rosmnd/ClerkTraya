<?php
declare(strict_types=1);

function startAuthSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $https = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== '' && $_SERVER['HTTPS'] !== 'off';
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_name('SAGIPREKORDSESSID');
    session_start();
}

function demoUsers(): array
{
    $now = date(DATE_ATOM);
    return [
        [
            'id' => 'demo-resident',
            'name' => 'Teresita Mendoza',
            'email' => 'resident@example.org',
            'role' => 'resident',
            'barangay' => 'Palatiw',
            'active' => true,
            'password_hash' => password_hash('ResidentDemo123!', PASSWORD_DEFAULT),
            'created_at' => $now,
        ],
        [
            'id' => 'demo-worker',
            'name' => 'Palatiw Health Worker',
            'email' => 'worker@example.org',
            'role' => 'worker',
            'barangay' => 'Palatiw',
            'active' => true,
            'password_hash' => password_hash('WorkerDemo123!', PASSWORD_DEFAULT),
            'created_at' => $now,
        ],
        [
            'id' => 'demo-admin',
            'name' => 'SagipRekord Administrator',
            'email' => 'admin@example.org',
            'role' => 'admin',
            'barangay' => 'Palatiw',
            'active' => true,
            'password_hash' => password_hash('AdminDemo123!', PASSWORD_DEFAULT),
            'created_at' => $now,
        ],
    ];
}

function withJsonStore(string $file, array $default, callable $callback)
{
    $lock = fopen($file . '.lock', 'c');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        if (is_resource($lock)) {
            fclose($lock);
        }
        respond(['success' => false, 'error' => 'The account store is unavailable. Check server file permissions.'], 500);
    }

    try {
        $raw = is_file($file) ? file_get_contents($file) : false;
        if ($raw === false) {
            $data = $default;
        } else {
            $data = json_decode($raw, true);
            if (!is_array($data)) {
                respond(['success' => false, 'error' => 'The account store contains invalid JSON.'], 500);
            }
        }

        $result = $callback($data);
        $encoded = json_encode(array_values($data), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        if ($encoded === false || file_put_contents($file, $encoded . PHP_EOL, LOCK_EX) === false) {
            respond(['success' => false, 'error' => 'Could not save account data. Check server file permissions.'], 500);
        }
        return $result;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function ensureDemoAccounts(string $usersFile): void
{
    withJsonStore($usersFile, [], static function (array &$users): bool {
        if ($users === []) {
            $users = demoUsers();
        }
        return true;
    });
}

function safeUser(array $user): array
{
    return [
        'id' => (string) ($user['id'] ?? ''),
        'name' => (string) ($user['name'] ?? ''),
        'email' => (string) ($user['email'] ?? ''),
        'role' => (string) ($user['role'] ?? ''),
        'barangay' => (string) ($user['barangay'] ?? ''),
        'active' => (bool) ($user['active'] ?? false),
        'created_at' => (string) ($user['created_at'] ?? ''),
    ];
}

function requireCurrentUser(array $roles = []): array
{
    $user = $_SESSION['auth_user'] ?? null;
    if (!is_array($user) || !isset($user['id'], $user['role'])) {
        respond(['success' => false, 'error' => 'Please sign in to continue.', 'code' => 'unauthenticated'], 401);
    }
    global $authUsersFile;
    if (isset($authUsersFile) && is_file($authUsersFile)) {
        $account = withJsonStore($authUsersFile, [], static function (array &$users) use ($user): ?array {
            foreach ($users as $candidate) {
                if (($candidate['id'] ?? '') === $user['id'] && ($candidate['active'] ?? false) === true) {
                    return safeUser($candidate);
                }
            }
            return null;
        });
        if ($account === null) {
            $_SESSION = [];
            session_destroy();
            respond(['success' => false, 'error' => 'This account is inactive. Please contact an administrator.', 'code' => 'unauthenticated'], 401);
        }
        $_SESSION['auth_user'] = $account;
        $user = $account;
    }
    if ($roles !== [] && !in_array($user['role'], $roles, true)) {
        respond(['success' => false, 'error' => 'You do not have permission to access this feature.', 'code' => 'forbidden'], 403);
    }
    return $user;
}

function refreshSessionUser(string $usersFile): bool
{
    $sessionUser = $_SESSION['auth_user'] ?? null;
    if (!is_array($sessionUser) || !isset($sessionUser['id'])) {
        return false;
    }
    $user = withJsonStore($usersFile, demoUsers(), static function (array &$users) use ($sessionUser): ?array {
        foreach ($users as $candidate) {
            if (($candidate['id'] ?? '') === $sessionUser['id'] && ($candidate['active'] ?? false) === true) {
                return safeUser($candidate);
            }
        }
        return null;
    });
    if ($user === null) {
        $_SESSION = [];
        session_destroy();
        return false;
    }
    $_SESSION['auth_user'] = $user;
    return true;
}

function auditEncryptionKey(): ?string
{
    $encodedKey = $_ENV['SAGIPREKORD_AUDIT_KEY'] ?? $_SERVER['SAGIPREKORD_AUDIT_KEY'] ?? getenv('SAGIPREKORD_AUDIT_KEY');
    if (!is_string($encodedKey) || trim($encodedKey) === '') {
        return null;
    }

    $key = base64_decode(trim($encodedKey), true);
    return is_string($key) && strlen($key) === 32 ? $key : null;
}

function encryptAuditEntry(array $entry, string $key): ?array
{
    $json = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    if ($json === false) {
        return null;
    }

    try {
        $iv = random_bytes(12);
    } catch (Throwable $error) {
        return null;
    }

    $tag = '';
    $ciphertext = openssl_encrypt($json, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag, 'SagipRekord Audit Log v1', 16);
    if (!is_string($ciphertext) || strlen($tag) !== 16) {
        return null;
    }

    return [
        'version' => 1,
        'algorithm' => 'AES-256-GCM',
        'iv' => base64_encode($iv),
        'ciphertext' => base64_encode($ciphertext . $tag),
    ];
}

function auditStoreHeader(): string
{
    return '{"_format":"sagiprekord-audit-v1"}';
}

function rewriteAuditStore($handle, array $rows): bool
{
    $contents = auditStoreHeader() . PHP_EOL;
    foreach ($rows as $row) {
        $line = json_encode($row, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        if ($line === false) {
            return false;
        }
        $contents .= $line . PHP_EOL;
    }

    return rewind($handle)
        && ftruncate($handle, 0)
        && fwrite($handle, $contents) === strlen($contents)
        && fflush($handle);
}

function readLegacyAuditRows(string $contents, string $key): ?array
{
    $rows = [];
    foreach (preg_split('/\r\n|\n|\r/', $contents) ?: [] as $line) {
        if (trim($line) === '') {
            continue;
        }
        $entry = json_decode($line, true);
        if (!is_array($entry)) {
            return null;
        }
        $encrypted = encryptAuditEntry($entry, $key);
        if ($encrypted === null) {
            return null;
        }
        $rows[] = $encrypted;
    }
    return $rows;
}

function logAction(string $auditFile, array $user, string $event, array $details = []): void
{
    $key = auditEncryptionKey();
    if ($key === null) {
        error_log('SagipRekord audit logging skipped: configure a valid SAGIPREKORD_AUDIT_KEY.');
        return;
    }

    $entry = [
        'timestamp' => date(DATE_ATOM),
        'actor_id' => (string) ($user['id'] ?? 'system'),
        'actor_name' => (string) ($user['name'] ?? 'System'),
        'actor_role' => (string) ($user['role'] ?? 'system'),
        'event' => $event,
        'details' => $details,
    ];
    $encrypted = encryptAuditEntry($entry, $key);
    if ($encrypted === null) {
        error_log('SagipRekord audit logging failed: entry encryption was unavailable.');
        return;
    }

    $line = json_encode($encrypted, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    $handle = fopen($auditFile, 'c+b');
    if ($line === false || $handle === false) {
        if (is_resource($handle)) {
            fclose($handle);
        }
        error_log('SagipRekord audit logging failed: the audit store could not be opened.');
        return;
    }

    try {
        if (!flock($handle, LOCK_EX)) {
            error_log('SagipRekord audit logging failed: the audit store could not be locked.');
            return;
        }

        rewind($handle);
        $firstLine = fgets($handle);
        if ($firstLine === false || trim($firstLine) !== auditStoreHeader()) {
            rewind($handle);
            $contents = stream_get_contents($handle);
            $legacyRows = $contents === false ? null : readLegacyAuditRows($contents, $key);
            if ($legacyRows === null || !rewriteAuditStore($handle, $legacyRows)) {
                error_log('SagipRekord audit logging failed: legacy entries could not be encrypted.');
                return;
            }
        }

        if (fseek($handle, 0, SEEK_END) !== 0 || fwrite($handle, $line . PHP_EOL) !== strlen($line . PHP_EOL) || !fflush($handle)) {
            error_log('SagipRekord audit logging failed: the encrypted entry could not be written.');
        }
    } catch (Throwable $error) {
        error_log('SagipRekord audit logging failed: encryption or storage error.');
    } finally {
        if (is_resource($handle)) {
            flock($handle, LOCK_UN);
        }
        fclose($handle);
    }
}

function auditEvent(string $auditFile, array $user, string $event, array $details = []): void
{
    logAction($auditFile, $user, $event, $details);
}

function readAuditEvents(string $auditFile, string $key): array
{
    $handle = fopen($auditFile, 'c+b');
    if ($handle === false || !flock($handle, LOCK_EX)) {
        if (is_resource($handle)) {
            fclose($handle);
        }
        respond(['success' => false, 'error' => 'Could not open the audit log for secure reading.'], 500);
    }

    $events = [];
    $error = '';
    try {
        rewind($handle);
        $contents = stream_get_contents($handle);
        if ($contents === false) {
            $error = 'Could not read the audit log.';
        } elseif ($contents === '') {
            if (!rewriteAuditStore($handle, [])) {
                $error = 'Could not initialize the encrypted audit log.';
            }
        } else {
            $lines = preg_split('/\r\n|\n|\r/', $contents) ?: [];
            $hasHeader = trim((string) array_shift($lines)) === auditStoreHeader();
            if (!$hasHeader) {
                $legacyRows = readLegacyAuditRows($contents, $key);
                if ($legacyRows === null || !rewriteAuditStore($handle, $legacyRows)) {
                    $error = 'The existing audit log could not be encrypted. No entries were returned.';
                } else {
                    $events = $legacyRows;
                }
            } else {
                foreach ($lines as $line) {
                    if (trim($line) === '') {
                        continue;
                    }
                    $row = json_decode($line, true);
                    if (!is_array($row) || ($row['version'] ?? null) !== 1 || ($row['algorithm'] ?? '') !== 'AES-256-GCM') {
                        $error = 'The encrypted audit log contains an invalid entry.';
                        break;
                    }
                    $events[] = $row;
                }
            }
        }
    } catch (Throwable $exception) {
        $error = 'The audit log could not be securely read.';
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }

    if ($error !== '') {
        respond(['success' => false, 'error' => $error], 500);
    }
    return array_reverse(array_slice($events, -500));
}

function handleAuthAction(string $action, string $method, string $usersFile, string $auditFile): bool
{
    if ($action === 'auth_status' && $method === 'GET') {
        $authenticated = refreshSessionUser($usersFile);
        respond([
            'success' => true,
            'authenticated' => $authenticated,
            'user' => $authenticated ? $_SESSION['auth_user'] : null,
        ]);
    }

    if (in_array($action, ['auth_me', 'auth_login', 'auth_signup', 'auth_logout'], true)) {
        if ($action === 'auth_me' && $method === 'GET') {
            if (!refreshSessionUser($usersFile)) {
                respond(['success' => false, 'error' => 'Please sign in to continue.', 'code' => 'unauthenticated'], 401);
            }
            $user = $_SESSION['auth_user'];
            respond(['success' => true, 'user' => $user]);
        }

        if ($method !== 'POST') {
            respond(['success' => false, 'error' => 'Use POST for this authentication action.'], 405);
        }

        if ($action === 'auth_signup') {
            $input = readJsonBody();
            $name = textValue($input, 'name', '', 120);
            $email = strtolower(textValue($input, 'email', '', 254));
            $password = textValue($input, 'password', '', 128);
            if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
                respond(['success' => false, 'error' => 'Enter a name, valid email, and password with at least 8 characters.'], 400);
            }
            $user = withJsonStore($usersFile, [], static function (array &$users) use ($name, $email, $password): array {
                foreach ($users as $candidate) {
                    if (strtolower((string) ($candidate['email'] ?? '')) === $email) {
                        respond(['success' => false, 'error' => 'An account already uses this email address.'], 409);
                    }
                }
                $account = [
                    'id' => 'user-' . bin2hex(random_bytes(8)),
                    'name' => $name,
                    'email' => $email,
                    'role' => 'resident',
                    'barangay' => 'Palatiw',
                    'active' => true,
                    'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                    'created_at' => date(DATE_ATOM),
                ];
                $users[] = $account;
                return safeUser($account);
            });
            session_regenerate_id(true);
            $_SESSION['auth_user'] = $user;
            auditEvent($auditFile, $user, 'auth.signup');
            respond(['success' => true, 'user' => $user]);
        }

        if ($action === 'auth_login') {
            $input = readJsonBody();
            $identity = strtolower(textValue($input, 'identity', '', 254));
            $password = textValue($input, 'password', '', 128);
            if ($identity === '' || $password === '') {
                respond(['success' => false, 'error' => 'Enter your email and password.'], 400);
            }
            $user = null;
            withJsonStore($usersFile, [], static function (array &$users) use ($identity, $password, &$user): bool {
                if ($users === []) {
                    $users = demoUsers();
                }
                foreach ($users as $candidate) {
                    if (is_array($candidate)
                        && (strtolower((string) ($candidate['email'] ?? '')) === $identity
                            || strtolower((string) ($candidate['name'] ?? '')) === $identity)
                        && ($candidate['active'] ?? false) === true
                        && password_verify($password, (string) ($candidate['password_hash'] ?? ''))) {
                        $user = safeUser($candidate);
                        break;
                    }
                }
                return true;
            });
            if ($user === null) {
                respond(['success' => false, 'error' => 'The email or password is incorrect, or this account is inactive.'], 401);
            }
            session_regenerate_id(true);
            $_SESSION['auth_user'] = $user;
            auditEvent($auditFile, $user, 'auth.login');
            respond(['success' => true, 'user' => $user]);
        }

        if ($action === 'auth_logout') {
            $user = $_SESSION['auth_user'] ?? null;
            if (is_array($user)) {
                auditEvent($auditFile, $user, 'auth.logout');
            }
            $_SESSION = [];
            if (ini_get('session.use_cookies')) {
                $params = session_get_cookie_params();
                setcookie(session_name(), '', [
                    'expires' => time() - 42000,
                    'path' => $params['path'],
                    'domain' => $params['domain'],
                    'secure' => $params['secure'],
                    'httponly' => $params['httponly'],
                    'samesite' => 'Strict',
                ]);
            }
            session_destroy();
            respond(['success' => true]);
        }
    }

    if ($action === 'admin_users') {
        requireCurrentUser(['admin']);
        if ($method === 'GET') {
            $users = withJsonStore($usersFile, [], static function (array &$users): array {
                return array_map('safeUser', $users);
            });
            respond(['success' => true, 'users' => $users]);
        }
        if ($method !== 'POST') {
            respond(['success' => false, 'error' => 'Use POST to manage accounts.'], 405);
        }
        $input = readJsonBody();
        $operation = textValue($input, 'operation', '', 20);
        $actor = requireCurrentUser(['admin']);
        if ($operation === 'create') {
            $name = textValue($input, 'name', '', 120);
            $email = strtolower(textValue($input, 'email', '', 254));
            $role = textValue($input, 'role', '', 20);
            $password = textValue($input, 'password', '', 128);
            if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)
                || !in_array($role, ['resident', 'worker', 'admin'], true) || strlen($password) < 8) {
                respond(['success' => false, 'error' => 'Provide a valid name, email, role, and password of at least 8 characters.'], 400);
            }
            $created = withJsonStore($usersFile, [], static function (array &$users) use ($name, $email, $role, $password): array {
                foreach ($users as $user) {
                    if (strtolower((string) ($user['email'] ?? '')) === $email) {
                        respond(['success' => false, 'error' => 'An account already uses this email address.'], 409);
                    }
                }
                $user = [
                    'id' => 'user-' . bin2hex(random_bytes(8)),
                    'name' => $name,
                    'email' => $email,
                    'role' => $role,
                    'barangay' => 'Palatiw',
                    'active' => true,
                    'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                    'created_at' => date(DATE_ATOM),
                ];
                $users[] = $user;
                return safeUser($user);
            });
            auditEvent($auditFile, $actor, 'admin.user.create', ['user_id' => $created['id'], 'role' => $created['role']]);
            respond(['success' => true, 'user' => $created]);
        }

        $targetId = textValue($input, 'id', '', 80);
        if ($targetId === '') {
            respond(['success' => false, 'error' => 'Account ID is required.'], 400);
        }
        if ($operation === 'update') {
            $name = textValue($input, 'name', '', 120);
            $email = strtolower(textValue($input, 'email', '', 254));
            $role = textValue($input, 'role', '', 20);
            $active = filter_var($input['active'] ?? null, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            $password = textValue($input, 'password', '', 128);
            if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)
                || !in_array($role, ['resident', 'worker', 'admin'], true) || $active === null
                || ($password !== '' && strlen($password) < 8)) {
                respond(['success' => false, 'error' => 'Provide valid account details and an optional password of at least 8 characters.'], 400);
            }
            $updated = withJsonStore($usersFile, [], static function (array &$users) use ($targetId, $name, $email, $role, $active, $password, $actor): array {
                foreach ($users as $index => $user) {
                    if (($user['id'] ?? '') === $targetId) {
                        if ($targetId === $actor['id'] && !$active) {
                            respond(['success' => false, 'error' => 'You cannot deactivate your own administrator account.'], 400);
                        }
                        foreach ($users as $other) {
                            if (($other['id'] ?? '') !== $targetId && strtolower((string) ($other['email'] ?? '')) === $email) {
                                respond(['success' => false, 'error' => 'An account already uses this email address.'], 409);
                            }
                        }
                        if ($targetId === $actor['id'] && $role !== 'admin') {
                            respond(['success' => false, 'error' => 'You cannot remove your own administrator access.'], 400);
                        }
                        $users[$index]['name'] = $name;
                        $users[$index]['email'] = $email;
                        $users[$index]['role'] = $role;
                        $users[$index]['active'] = $active;
                        if ($password !== '') {
                            $users[$index]['password_hash'] = password_hash($password, PASSWORD_DEFAULT);
                        }
                        return safeUser($users[$index]);
                    }
                }
                respond(['success' => false, 'error' => 'The account was not found.'], 404);
            });
            auditEvent($auditFile, $actor, 'admin.user.update', ['user_id' => $updated['id'], 'role' => $updated['role'], 'active' => $updated['active']]);
            respond(['success' => true, 'user' => $updated]);
        }
        respond(['success' => false, 'error' => 'Choose a supported account operation.'], 400);
    }

    if ($action === 'admin_audit') {
        requireCurrentUser(['admin']);
        if ($method !== 'GET') {
            respond(['success' => false, 'error' => 'Use GET to view audit events.'], 405);
        }
        $key = auditEncryptionKey();
        if ($key === null) {
            respond(['success' => false, 'error' => 'Audit encryption is not configured. Set SAGIPREKORD_AUDIT_KEY to a base64-encoded 32-byte key.'], 503);
        }
        respond([
            'success' => true,
            'events' => readAuditEvents($auditFile, $key),
            'key' => base64_encode($key),
        ]);
    }

    return false;
}
