<?php
// config.php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'trading_space');

// Iniciar sessão PHP nativa — mais simples e fiável que ficheiros
session_start();

function getDB() {
    static $pdo = null;
    if ($pdo) return $pdo;
    try {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        die(json_encode(['error' => 'DB connection failed: ' . $e->getMessage()]));
    }
}

// Headers
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function body() {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

function ok($data = []) {
    echo json_encode($data);
    exit;
}

function err($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

function createSession($userId, $email) {
    $_SESSION['user_id']    = $userId;
    $_SESSION['user_email'] = $email;
    $_SESSION['exp']        = time() + 30 * 24 * 3600;
}

function getSession() {
    if (empty($_SESSION['user_id'])) return null;
    if (($_SESSION['exp'] ?? 0) < time()) {
        session_destroy();
        return null;
    }
    return ['id' => $_SESSION['user_id'], 'email' => $_SESSION['user_email']];
}

function requireSession() {
    $user = getSession();
    if (!$user) err('Not authenticated', 401);
    return $user;
}

function destroySession() {
    session_destroy();
}

function uuid() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0,0xffff), mt_rand(0,0xffff), mt_rand(0,0xffff),
        mt_rand(0,0x0fff)|0x4000, mt_rand(0,0x3fff)|0x8000,
        mt_rand(0,0xffff), mt_rand(0,0xffff), mt_rand(0,0xffff));
}
