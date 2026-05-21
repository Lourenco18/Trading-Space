<?php
require_once __DIR__ . '/config.php';

$user   = requireSession();
$uid    = $user['id'];
$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];


function parseRow($r) {
    $r['pairs']    = json_decode($r['pairs']    ?? '[]', true) ?: [];
    $r['sessions'] = json_decode($r['sessions'] ?? '[]', true) ?: [];
    return $r;
}

if ($method === 'POST') {
    $b = body();
    if (empty($b['name'])) err('Name is required');
    $id = uuid();
    $db->prepare('INSERT INTO strategies (id,user_id,name,color,description,entry_rules,exit_rules,timeframe,min_rr,risk_pct,notes,pairs,sessions) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
       ->execute([$id, $uid, $b['name'], $b['color']??'#818cf8', $b['description']??'',
                  $b['entry_rules']??'', $b['exit_rules']??'', $b['timeframe']??'', $b['min_rr']??'',
                  $b['risk_pct']??null, $b['notes']??'',
                  json_encode($b['pairs']??[]), json_encode($b['sessions']??[])]);
    $row = $db->prepare('SELECT * FROM strategies WHERE id = ?');
    $row->execute([$id]);
    ok(['data' => parseRow($row->fetch())]);
}

if ($method === 'PUT') {
    $id = $_GET['id'] ?? '';
    if (!$id) err('ID required');
    $b = body();
    $chk = $db->prepare('SELECT id FROM strategies WHERE id = ? AND user_id = ?');
    $chk->execute([$id, $uid]);
    if (!$chk->fetch()) err('Not found', 404);
    $db->prepare('UPDATE strategies SET name=?,color=?,description=?,entry_rules=?,exit_rules=?,timeframe=?,min_rr=?,risk_pct=?,notes=?,pairs=?,sessions=? WHERE id=?')
       ->execute([$b['name'], $b['color']??'#818cf8', $b['description']??'',
                  $b['entry_rules']??'', $b['exit_rules']??'', $b['timeframe']??'', $b['min_rr']??'',
                  $b['risk_pct']??null, $b['notes']??'',
                  json_encode($b['pairs']??[]), json_encode($b['sessions']??[]), $id]);
    $row = $db->prepare('SELECT * FROM strategies WHERE id = ?');
    $row->execute([$id]);
    ok(['data' => parseRow($row->fetch())]);
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if (!$id) err('ID required');
    $chk = $db->prepare('SELECT id FROM strategies WHERE id = ? AND user_id = ?');
    $chk->execute([$id, $uid]);
    if (!$chk->fetch()) err('Not found', 404);
    $db->prepare('UPDATE trades SET strategy_id = NULL WHERE strategy_id = ? AND user_id = ?')->execute([$id, $uid]);
    $db->prepare('DELETE FROM strategies WHERE id = ?')->execute([$id]);
    ok(['ok' => true]);
}

err('Method not allowed', 405);
