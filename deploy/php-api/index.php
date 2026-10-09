<?php
/**
 * LinkPulse — Hostinger Shared Hosting PHP + MySQL Compatible API Router
 *
 * Use this router when deploying on shared hosting plans that support PHP 8+ and MySQL
 * (such as standard Hostinger Web Hosting) without persistent Node.js processes.
 *
 * Reads configuration from environment variables or root .env file:
 *   DB_HOST, DB_PORT, DB_NAME (u199400152_linkgenerator), DB_USER (u199400152_linkgenerator), DB_PASSWORD
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

// Load .env if present
$envPath = dirname(__DIR__, 2) . '/.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '#')) continue;
        $parts = explode('=', $trimmed, 2);
        if (count($parts) === 2) {
            $k = trim($parts[0]);
            $v = trim($parts[1], " \t\n\r\0\x0B\"'");
            if (getenv($k) === false) {
                putenv("$k=$v");
                $_ENV[$k] = $v;
            }
        }
    }
}

$dbHost = getenv('DB_HOST') ?: 'localhost';
$dbPort = getenv('DB_PORT') ?: '3306';
$dbName = getenv('DB_NAME') ?: 'u199400152_linkgenerator';
$dbUser = getenv('DB_USER') ?: 'u199400152_linkgenerator';
$dbPass = getenv('DB_PASSWORD') ?: '';
$appUrl = rtrim(getenv('APP_URL') ?: 'https://' . ($_SERVER['HTTP_HOST'] ?? 'localhost'), '/');

function sendJson(int $status, array $payload): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

try {
    $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    sendJson(503, [
        'error' => 'MySQL Database Connection Error: Unable to connect to ' . $dbName . ' at ' . $dbHost . '. Verify DB_HOST and DB_PASSWORD in .env and run server/db/migrations/001_initial_schema.sql.',
        'code' => 'DATABASE_UNREACHABLE',
        'setupRequired' => true,
    ]);
}

function uuidv4(): string {
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function getAuthenticatedUser(PDO $pdo): ?array {
    $sessionId = $_COOKIE['linkpulse_session'] ?? '';
    if (!$sessionId) return null;
    $stmt = $pdo->prepare('
        SELECT u.* FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.id = :sid AND s.expires_at > NOW() AND u.status = "active"
        LIMIT 1
    ');
    $stmt->execute(['sid' => $sessionId]);
    $user = $stmt->fetch();
    return $user ?: null;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$body = json_decode(file_get_contents('php://input') ?: '{}', true) ?: [];

// 1. Health Checks
if ($uri === '/api/health') {
    sendJson(200, ['status' => 'ok', 'service' => 'linkpulse-php-api', 'timestamp' => gmdate('c')]);
}

if ($uri === '/api/health/db') {
    sendJson(200, ['ok' => true, 'connected' => true, 'database' => $dbName, 'host' => $dbHost]);
}

// 2. Tracked Redirects (/r/:linkId)
if (preg_match('#^/r/([a-zA-Z0-9_-]+)$#', $uri, $m)) {
    $linkId = $m[1];
    $stmt = $pdo->prepare('
        SELECT l.*, p.id AS profile_id
        FROM links l
        JOIN profiles p ON p.user_id = l.user_id
        WHERE l.id = :id AND l.is_active = 1 AND l.is_hidden = 0
        LIMIT 1
    ');
    $stmt->execute(['id' => $linkId]);
    $link = $stmt->fetch();
    if (!$link) sendJson(404, ['error' => 'Link not found']);

    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    if (!preg_match('/(bot|crawl|spider|googlebot|bingbot)/i', $ua)) {
        $pdo->prepare('UPDATE links SET click_count = click_count + 1 WHERE id = :id')->execute(['id' => $linkId]);
        $visitorHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . $ua . gmdate('Y-m-d'));
        $device = preg_match('/(mobile|iphone|android)/i', $ua) ? 'mobile' : 'desktop';
        $pdo->prepare('
            INSERT INTO analytics_events (id, profile_id, link_id, event_type, referrer_category, device_category, visitor_hash)
            VALUES (:id, :pid, :lid, "link_click", "direct", :dev, :vh)
        ')->execute([
            'id' => uuidv4(),
            'pid' => $link['profile_id'],
            'lid' => $linkId,
            'dev' => $device,
            'vh' => $visitorHash,
        ]);
    }

    header('Location: ' . $link['destination_url'], true, 302);
    exit;
}

// 3. Public Profile Resolution (/api/public/:username)
if ($method === 'GET' && preg_match('#^/api/public/([a-zA-Z0-9_-]+)$#', $uri, $m)) {
    $normUsername = strtolower($m[1]);
    $stmt = $pdo->prepare('
        SELECT u.id AS uid, u.username, u.status, p.*
        FROM users u
        JOIN profiles p ON p.user_id = u.id
        WHERE u.normalized_username = :u AND u.status = "active" AND p.is_public = 1
        LIMIT 1
    ');
    $stmt->execute(['u' => $normUsername]);
    $row = $stmt->fetch();
    if (!$row) sendJson(404, ['error' => 'Profile not found']);

    $lStmt = $pdo->prepare('
        SELECT * FROM links
        WHERE user_id = :uid AND is_active = 1 AND is_hidden = 0
          AND (scheduled_start IS NULL OR scheduled_start <= NOW())
          AND (scheduled_end IS NULL OR scheduled_end >= NOW())
        ORDER BY is_pinned DESC, position ASC
    ');
    $lStmt->execute(['uid' => $row['uid']]);
    $links = $lStmt->fetchAll();

    sendJson(200, [
        'user' => ['id' => $row['uid'], 'username' => $row['username']],
        'profile' => [
            'id' => $row['id'],
            'display_name' => $row['display_name'],
            'bio' => $row['bio'],
            'avatar_url' => $row['avatar_url'],
            'theme_settings' => json_decode($row['theme_settings'] ?: '{}', true),
            'social_links' => json_decode($row['social_links'] ?: '[]', true),
            'is_public' => (bool)$row['is_public'],
        ],
        'links' => $links,
    ]);
}

sendJson(404, ['error' => 'Endpoint not found in PHP fallback router']);
