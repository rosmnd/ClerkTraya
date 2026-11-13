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

function auditEvent(string $auditFile, array $user, string $event, array $details = []): void
{
    $entry = [
        'timestamp' => date(DATE_ATOM),
        'actor_id' => (string) ($user['id'] ?? 'system'),
        'actor_name' => (string) ($user['name'] ?? 'System'),
        'actor_role' => (string) ($user['role'] ?? 'system'),
        'event' => $event,
        'details' => $details,
    ];
    $line = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    $handle = fopen($auditFile, 'ab');
    if ($handle === false) {
        respond(['success' => false, 'error' => 'The audit log is unavailable. Check server file permissions.'], 500);
    }
    try {
        if (!flock($handle, LOCK_EX) || fwrite($handle, $line . PHP_EOL) === false) {
            respond(['success' => false, 'error' => 'Could not write the audit log.'], 500);
        }
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function readAuditEvents(string $auditFile): array
{
    if (!is_file($auditFile)) {
        return [];
    }
    $lines = file($auditFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        respond(['success' => false, 'error' => 'Could not read the audit log.'], 500);
    }
    $events = [];
    foreach (array_slice($lines, -500) as $line) {
        $event = json_decode($line, true);
        if (is_array($event)) {
            $events[] = $event;
        }
    }
    return array_reverse($events);
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
        respond(['success' => true, 'events' => readAuditEvents($auditFile)]);
    }

    return false;
}
