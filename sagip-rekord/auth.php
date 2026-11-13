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

function ensureDemoAccounts(PDO $pdo): void
{
    $insert = $pdo->prepare(
        'INSERT INTO users (id, name, email, role, barangay, active, password_hash, created_at)
         VALUES (:id, :name, :email, :role, :barangay, :active, :password_hash, :created_at)
         ON DUPLICATE KEY UPDATE id = id'
    );
    foreach (demoUsers() as $user) {
        $createdAt = (new DateTimeImmutable((string) $user['created_at']))->format('Y-m-d H:i:s');
        $insert->execute([
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => strtolower($user['email']),
            'role' => $user['role'],
            'barangay' => $user['barangay'],
            'active' => $user['active'] ? 1 : 0,
            'password_hash' => $user['password_hash'],
            'created_at' => $createdAt,
        ]);
    }
}

function requireCurrentUser(PDO $pdo, array $roles = []): array
{
    $user = $_SESSION['auth_user'] ?? null;
    if (!is_array($user) || !isset($user['id'])) {
        respond(['success' => false, 'error' => 'Please sign in to continue.', 'code' => 'unauthenticated'], 401);
    }

    $statement = $pdo->prepare(
        'SELECT id, name, email, role, barangay, active, created_at
         FROM users WHERE id = :id AND active = 1'
    );
    $statement->execute(['id' => $user['id']]);
    $account = $statement->fetch();
    if (!is_array($account)) {
        $_SESSION = [];
        session_destroy();
        respond(['success' => false, 'error' => 'This account is inactive. Please contact an administrator.', 'code' => 'unauthenticated'], 401);
    }
    $account = safeUser($account);
    $_SESSION['auth_user'] = $account;
    $user = $account;

    if ($roles !== [] && !in_array($user['role'], $roles, true)) {
        respond(['success' => false, 'error' => 'You do not have permission to access this feature.', 'code' => 'forbidden'], 403);
    }
    return $user;
}

function refreshSessionUser(PDO $pdo): bool
{
    $sessionUser = $_SESSION['auth_user'] ?? null;
    if (!is_array($sessionUser) || !isset($sessionUser['id'])) {
        return false;
    }
    $statement = $pdo->prepare(
        'SELECT id, name, email, role, barangay, active, created_at
         FROM users WHERE id = :id AND active = 1'
    );
    $statement->execute(['id' => $sessionUser['id']]);
    $user = $statement->fetch();
    if (!is_array($user)) {
        $_SESSION = [];
        session_destroy();
        return false;
    }
    $user = safeUser($user);
    $_SESSION['auth_user'] = $user;
    return true;
}

function auditEvent(PDO $pdo, array $user, string $event, array $details = []): void
{
    $detailsJson = json_encode($details, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    if ($detailsJson === false) {
        throw new RuntimeException('Could not encode audit event details.');
    }
    $statement = $pdo->prepare(
        'INSERT INTO audit_events (actor_id, actor_name, actor_role, event_name, details_json)
         VALUES (:actor_id, :actor_name, :actor_role, :event_name, :details_json)'
    );
    $statement->execute([
        'actor_id' => (string) ($user['id'] ?? 'system'),
        'actor_name' => (string) ($user['name'] ?? 'System'),
        'actor_role' => (string) ($user['role'] ?? 'system'),
        'event_name' => $event,
        'details_json' => $detailsJson,
    ]);
}

function readAuditEvents(PDO $pdo): array
{
    $statement = $pdo->query(
        'SELECT event_time, actor_id, actor_name, actor_role, event_name, details_json
         FROM audit_events ORDER BY id DESC LIMIT 500'
    );
    $events = [];
    foreach ($statement as $row) {
        $details = json_decode((string) $row['details_json'], true);
        $events[] = [
            'timestamp' => date(DATE_ATOM, strtotime((string) $row['event_time'])),
            'actor_id' => (string) $row['actor_id'],
            'actor_name' => (string) $row['actor_name'],
            'actor_role' => (string) $row['actor_role'],
            'event' => (string) $row['event_name'],
            'details' => is_array($details) ? $details : [],
        ];
    }
    return $events;
}

function handleAuthAction(string $action, string $method, PDO $pdo): bool
{
    if ($action === 'auth_status' && $method === 'GET') {
        $authenticated = refreshSessionUser($pdo);
        respond([
            'success' => true,
            'authenticated' => $authenticated,
            'user' => $authenticated ? $_SESSION['auth_user'] : null,
        ]);
    }

    if (in_array($action, ['auth_me', 'auth_login', 'auth_signup', 'auth_logout'], true)) {
        if ($action === 'auth_me' && $method === 'GET') {
            if (!refreshSessionUser($pdo)) {
                respond(['success' => false, 'error' => 'Please sign in to continue.', 'code' => 'unauthenticated'], 401);
            }
            respond(['success' => true, 'user' => $_SESSION['auth_user']]);
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
            $statement = $pdo->prepare(
                'INSERT INTO users (id, name, email, role, barangay, active, password_hash)
                 VALUES (:id, :name, :email, :role, :barangay, 1, :password_hash)'
            );
            try {
                $statement->execute([
                    'id' => $account['id'],
                    'name' => $account['name'],
                    'email' => $account['email'],
                    'role' => $account['role'],
                    'barangay' => $account['barangay'],
                    'password_hash' => $account['password_hash'],
                ]);
            } catch (PDOException $error) {
                if ($error->getCode() === '23000') {
                    respond(['success' => false, 'error' => 'An account already uses this email address.'], 409);
                }
                throw $error;
            }
            $user = safeUser($account);
            session_regenerate_id(true);
            $_SESSION['auth_user'] = $user;
            auditEvent($pdo, $user, 'auth.signup');
            respond(['success' => true, 'user' => $user]);
        }

        if ($action === 'auth_login') {
            $input = readJsonBody();
            $identity = strtolower(textValue($input, 'identity', '', 254));
            $password = textValue($input, 'password', '', 128);
            if ($identity === '' || $password === '') {
                respond(['success' => false, 'error' => 'Enter your email and password.'], 400);
            }
            $statement = $pdo->prepare(
                'SELECT id, name, email, role, barangay, active, password_hash, created_at
                 FROM users
                 WHERE active = 1 AND (email = :email OR LOWER(name) = :name)
                 LIMIT 1'
            );
            $statement->execute(['email' => $identity, 'name' => $identity]);
            $account = $statement->fetch();
            if (!is_array($account) || !password_verify($password, (string) $account['password_hash'])) {
                respond(['success' => false, 'error' => 'The email or password is incorrect, or this account is inactive.'], 401);
            }
            $user = safeUser($account);
            session_regenerate_id(true);
            $_SESSION['auth_user'] = $user;
            auditEvent($pdo, $user, 'auth.login');
            respond(['success' => true, 'user' => $user]);
        }

        if ($action === 'auth_logout') {
            $user = $_SESSION['auth_user'] ?? null;
            if (is_array($user)) {
                auditEvent($pdo, $user, 'auth.logout');
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
        requireCurrentUser($pdo, ['admin']);
        if ($method === 'GET') {
            $statement = $pdo->query(
                'SELECT id, name, email, role, barangay, active, created_at
                 FROM users ORDER BY created_at DESC, name'
            );
            respond(['success' => true, 'users' => array_map('safeUser', $statement->fetchAll())]);
        }
        if ($method !== 'POST') {
            respond(['success' => false, 'error' => 'Use POST to manage accounts.'], 405);
        }
        $input = readJsonBody();
        $operation = textValue($input, 'operation', '', 20);
        $actor = requireCurrentUser($pdo, ['admin']);
        if ($operation === 'create') {
            $name = textValue($input, 'name', '', 120);
            $email = strtolower(textValue($input, 'email', '', 254));
            $role = textValue($input, 'role', '', 20);
            $password = textValue($input, 'password', '', 128);
            if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)
                || !in_array($role, ['resident', 'worker', 'admin'], true) || strlen($password) < 8) {
                respond(['success' => false, 'error' => 'Provide a valid name, email, role, and password of at least 8 characters.'], 400);
            }
            $account = [
                'id' => 'user-' . bin2hex(random_bytes(8)),
                'name' => $name,
                'email' => $email,
                'role' => $role,
                'barangay' => 'Palatiw',
                'active' => true,
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                'created_at' => date(DATE_ATOM),
            ];
            $statement = $pdo->prepare(
                'INSERT INTO users (id, name, email, role, barangay, active, password_hash)
                 VALUES (:id, :name, :email, :role, :barangay, 1, :password_hash)'
            );
            try {
                $statement->execute([
                    'id' => $account['id'],
                    'name' => $account['name'],
                    'email' => $account['email'],
                    'role' => $account['role'],
                    'barangay' => $account['barangay'],
                    'password_hash' => $account['password_hash'],
                ]);
            } catch (PDOException $error) {
                if ($error->getCode() === '23000') {
                    respond(['success' => false, 'error' => 'An account already uses this email address.'], 409);
                }
                throw $error;
            }
            $created = safeUser($account);
            auditEvent($pdo, $actor, 'admin.user.create', ['user_id' => $created['id'], 'role' => $created['role']]);
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
            if ($targetId === $actor['id'] && !$active) {
                respond(['success' => false, 'error' => 'You cannot deactivate your own administrator account.'], 400);
            }
            if ($targetId === $actor['id'] && $role !== 'admin') {
                respond(['success' => false, 'error' => 'You cannot remove your own administrator access.'], 400);
            }
            $exists = $pdo->prepare('SELECT id FROM users WHERE id = :id');
            $exists->execute(['id' => $targetId]);
            if ($exists->fetchColumn() === false) {
                respond(['success' => false, 'error' => 'The account was not found.'], 404);
            }
            $values = [
                'id' => $targetId,
                'name' => $name,
                'email' => $email,
                'role' => $role,
                'active' => $active ? 1 : 0,
            ];
            $sql = 'UPDATE users SET name = :name, email = :email, role = :role, active = :active';
            if ($password !== '') {
                $sql .= ', password_hash = :password_hash';
                $values['password_hash'] = password_hash($password, PASSWORD_DEFAULT);
            }
            $sql .= ' WHERE id = :id';
            try {
                $pdo->prepare($sql)->execute($values);
            } catch (PDOException $error) {
                if ($error->getCode() === '23000') {
                    respond(['success' => false, 'error' => 'An account already uses this email address.'], 409);
                }
                throw $error;
            }
            $lookup = $pdo->prepare(
                'SELECT id, name, email, role, barangay, active, created_at FROM users WHERE id = :id'
            );
            $lookup->execute(['id' => $targetId]);
            $updated = safeUser($lookup->fetch());
            auditEvent($pdo, $actor, 'admin.user.update', [
                'user_id' => $updated['id'],
                'role' => $updated['role'],
                'active' => $updated['active'],
            ]);
            respond(['success' => true, 'user' => $updated]);
        }
        respond(['success' => false, 'error' => 'Choose a supported account operation.'], 400);
    }

    if ($action === 'admin_audit') {
        requireCurrentUser($pdo, ['admin']);
        if ($method !== 'GET') {
            respond(['success' => false, 'error' => 'Use GET to view audit events.'], 405);
        }
        respond(['success' => true, 'events' => readAuditEvents($pdo)]);
    }

    return false;
}
