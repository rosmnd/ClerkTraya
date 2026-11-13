<?php
declare(strict_types=1);

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
        if ($name !== '' && getenv($name) === false && !isset($_ENV[$name]) && !isset($_SERVER[$name])) {
            $_ENV[$name] = trim($value, " \t\n\r\0\x0B\"'");
        }
    }
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

function databaseConnection(): PDO
{
    static $connection;
    if ($connection instanceof PDO) {
        return $connection;
    }

    $host = configValue('DB_HOST', '127.0.0.1');
    $port = configValue('DB_PORT', '3306');
    $name = configValue('DB_NAME', 'sagiprekord');
    if (!ctype_digit($port) || (int) $port < 1 || (int) $port > 65535
        || !preg_match('/^[A-Za-z0-9_]+$/', $name)) {
        throw new RuntimeException('Invalid database configuration.');
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $host,
        (int) $port,
        $name
    );
    $connection = new PDO($dsn, configValue('DB_USER', 'root'), configValue('DB_PASSWORD'), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $connection;
}

loadEnvFile(__DIR__ . '/.env');
