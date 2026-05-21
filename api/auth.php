<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// POST /api/auth.php?action=login
if ($method === 'POST' && $action === 'login') {
    $b = body();
    $email = strtolower(trim($b['email'] ?? ''));
    $pass  = $b['password'] ?? '';
    if (!$email || !$pass) err('Email and password required');

    $db   = getDB();
    $stmt = $db->prepare('SELECT id, email, password FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($pass, $user['password']))
        err('Incorrect email or password', 401);

    createSession($user['id'], $user['email']);
    ok(['user' => ['id' => $user['id'], 'email' => $user['email']]]);
}

// POST /api/auth.php?action=register
if ($method === 'POST' && $action === 'register') {
    $b = body();
    $email = strtolower(trim($b['email'] ?? ''));
    $pass  = $b['password'] ?? '';
    if (!$email || !$pass) err('Email and password required');
    if (strlen($pass) < 6) err('Password must be at least 6 characters');

    $db   = getDB();
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) err('An account with this email already exists');

    $id   = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0,0xffff), mt_rand(0,0xffff), mt_rand(0,0xffff),
        mt_rand(0,0x0fff)|0x4000, mt_rand(0,0x3fff)|0x8000,
        mt_rand(0,0xffff), mt_rand(0,0xffff), mt_rand(0,0xffff));
    $hash = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);

    $db->prepare('INSERT INTO users (id, email, password) VALUES (?, ?, ?)')->execute([$id, $email, $hash]);
    createSession($id, $email);
    ok(['user' => ['id' => $id, 'email' => $email]]);
}

// POST /api/auth.php?action=logout
if ($method === 'POST' && $action === 'logout') {
    destroySession();
    ok(['ok' => true]);
}

// GET /api/auth.php?action=me
if ($method === 'GET' && $action === 'me') {
    $user = requireSession();
    ok(['user' => ['id' => $user['id'], 'email' => $user['email']]]);
}

err('Unknown action', 404);
