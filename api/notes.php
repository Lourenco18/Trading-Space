<?php
require_once __DIR__ . '/config.php';

$user   = requireSession();
$uid    = $user['id'];
$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];


if ($method === 'POST') {
    $b    = body();
    $date = $b['note_date'] ?? date('Y-m-d');
    $id   = uuid();
    $db->prepare('INSERT INTO daily_notes (id,user_id,note_date,mood,analysis,plan) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE mood=VALUES(mood),analysis=VALUES(analysis),plan=VALUES(plan)')
       ->execute([$id, $uid, $date, $b['mood']??'Neutral', $b['analysis']??'', $b['plan']??'']);
    $row = $db->prepare('SELECT * FROM daily_notes WHERE user_id = ? AND note_date = ?');
    $row->execute([$uid, $date]);
    ok(['data' => $row->fetch()]);
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if (!$id) err('ID required');
    $chk = $db->prepare('SELECT id FROM daily_notes WHERE id = ? AND user_id = ?');
    $chk->execute([$id, $uid]);
    if (!$chk->fetch()) err('Not found', 404);
    $db->prepare('DELETE FROM daily_notes WHERE id = ?')->execute([$id]);
    ok(['ok' => true]);
}

err('Method not allowed', 405);
