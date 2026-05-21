<?php
require_once __DIR__ . '/config.php';

$user   = requireSession();
$uid    = $user['id'];
$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];


if ($method === 'POST') {
    $b = body();
    if (empty($b['name'])) err('Name is required');
    $id = uuid();
    $db->prepare('INSERT INTO accounts (id,user_id,name,firm,capital,split,profit_target,max_dd,daily_dd,status,market) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
       ->execute([$id, $uid, $b['name'], $b['firm']??'', $b['capital']??0, $b['split']??80,
                  $b['profit_target']??10, $b['max_dd']??10, $b['daily_dd']??5,
                  $b['status']??'Challenge', $b['market']??'Forex']);
    $row = $db->prepare('SELECT * FROM accounts WHERE id = ?');
    $row->execute([$id]);
    ok(['data' => $row->fetch()]);
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if (!$id) err('ID required');
    $chk = $db->prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?');
    $chk->execute([$id, $uid]);
    if (!$chk->fetch()) err('Not found', 404);
    $db->prepare('DELETE FROM accounts WHERE id = ?')->execute([$id]);
    ok(['ok' => true]);
}

err('Method not allowed', 405);
