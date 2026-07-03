<?php
// config.php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'trading_space');

// Shared secret used by the automated market-analysis job (GitHub Actions)
// to authenticate when it POSTs a new reading. Change this to a long random
// string, and use the SAME value as the MARKET_WRITE_SECRET GitHub secret.
define('MARKET_WRITE_SECRET', 'dnhsa76r25427nimkksm');


ini_set('display_errors', '0');
error_reporting(E_ALL);

if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── Helper central para devolver sempre JSON, mesmo em erro ──────────────────────
function sendJsonError($msg, $code = 500) {
    if (!headers_sent()) {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode(['error' => $msg]);
    exit;
}

// Apanha exceções não tratadas (ex: PDOException) e devolve sempre JSON legível
set_exception_handler(function ($e) {
    sendJsonError('Erro no servidor: ' . $e->getMessage(), 500);
});

// IMPORTANTE: só converte erros REALMENTE fatais em excepção.
// Nunca converte warnings/notices/deprecated — esses são normais em PHP
// e convertê-los em erro fatal rebentava a app sem motivo real (bug da v1).
set_error_handler(function ($severity, $message, $file, $line) {
    $fatal = [E_ERROR, E_USER_ERROR, E_RECOVERABLE_ERROR, E_CORE_ERROR, E_COMPILE_ERROR];
    if (in_array($severity, $fatal, true)) {
        throw new ErrorException($message, 0, $severity, $file, $line);
    }
    return true; // ignora silenciosamente avisos sem importância
});

// Rede de segurança: apanha erros fatais que escapem aos handlers acima
// (ex: erro de sintaxe num ficheiro incluído, esgotar memória, etc.)
register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        sendJsonError(
            'Erro fatal no servidor: ' . $e['message'] . ' (' . basename($e['file']) . ':' . $e['line'] . ')',
            500
        );
    }
});

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
        sendJsonError('DB connection failed: ' . $e->getMessage(), 500);
    }
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