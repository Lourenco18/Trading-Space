<?php
require_once __DIR__ . '/config.php';

$user   = requireSession();
$uid    = $user['id'];
$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];


function parseRow($r) {
    $r['images'] = json_decode($r['images'] ?? '[]', true) ?: [];
    return $r;
}

if ($method === 'POST') {
    $b = body();
    if (empty($b['account_id'])) err('Account is required');
    if (empty($b['asset']))      err('Asset is required');
    // Verify account ownership
    $chk = $db->prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?');
    $chk->execute([$b['account_id'], $uid]);
    if (!$chk->fetch()) err('Invalid account', 403);
    $id = uuid();
    $db->prepare('INSERT INTO trades (id,user_id,account_id,strategy_id,trade_date,asset,direction,lots,pnl,risk_pct,rr,result,session,setup,notes,images) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
       ->execute([$id, $uid, $b['account_id'], $b['strategy_id']??null,
                  $b['trade_date']??null, $b['asset'], $b['direction']??'Buy',
                  $b['lots']??null, $b['pnl']??0, $b['risk_pct']??null, $b['rr']??null,
                  $b['result']??'Win', $b['session']??null, $b['setup']??null,
                  $b['notes']??null, json_encode($b['images']??[])]);
    $row = $db->prepare('SELECT * FROM trades WHERE id = ?');
    $row->execute([$id]);
    ok(['data' => parseRow($row->fetch())]);
}

if ($method === 'PUT') {
    $id = $_GET['id'] ?? '';
    if (!$id) err('ID required');
    $b = body();
    $chk = $db->prepare('SELECT id FROM trades WHERE id = ? AND user_id = ?');
    $chk->execute([$id, $uid]);
    if (!$chk->fetch()) err('Not found', 404);
    $db->prepare('UPDATE trades SET account_id=?,strategy_id=?,trade_date=?,asset=?,direction=?,lots=?,pnl=?,risk_pct=?,rr=?,result=?,session=?,setup=?,notes=?,images=? WHERE id=?')
       ->execute([$b['account_id'], $b['strategy_id']??null, $b['trade_date']??null,
                  $b['asset'], $b['direction']??'Buy', $b['lots']??null, $b['pnl']??0,
                  $b['risk_pct']??null, $b['rr']??null, $b['result']??'Win',
                  $b['session']??null, $b['setup']??null, $b['notes']??null,
                  json_encode($b['images']??[]), $id]);
    $row = $db->prepare('SELECT * FROM trades WHERE id = ?');
    $row->execute([$id]);
    ok(['data' => parseRow($row->fetch())]);
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if (!$id) err('ID required');
    $chk = $db->prepare('SELECT id FROM trades WHERE id = ? AND user_id = ?');
    $chk->execute([$id, $uid]);
    if (!$chk->fetch()) err('Not found', 404);
    $db->prepare('DELETE FROM trades WHERE id = ?')->execute([$id]);
    ok(['ok' => true]);
}

err('Method not allowed', 405);
