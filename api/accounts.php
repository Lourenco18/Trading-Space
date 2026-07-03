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
    $db->prepare(
        'INSERT INTO accounts
            (id,user_id,name,firm,capital,split,profit_target,max_dd,daily_dd,status,market,
             phase,phase1_target,phase2_target,min_trading_days,max_risk_pct,phase_start_date,payout_freq_days)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    )->execute([
        $id, $uid, $b['name'], $b['firm']??'', $b['capital']??0, $b['split']??80,
        $b['profit_target']??10, $b['max_dd']??10, $b['daily_dd']??5,
        $b['status']??'Challenge', $b['market']??'Forex',
        $b['phase']??'Phase 1',
        $b['phase1_target']??8,
        $b['phase2_target']??5,
        $b['min_trading_days']??3,
        $b['max_risk_pct']??null,
        $b['phase_start_date']??date('Y-m-d'),
        $b['payout_freq_days']??0,
    ]);
    $row = $db->prepare('SELECT * FROM accounts WHERE id = ?');
    $row->execute([$id]);
    ok(['data' => $row->fetch()]);
}

if ($method === 'PUT') {
    $id = $_GET['id'] ?? '';
    if (!$id) err('ID required');
    $chk = $db->prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?');
    $chk->execute([$id, $uid]);
    if (!$chk->fetch()) err('Not found', 404);

    $b = body();

    // Campos que podem ser atualizados — whitelist por segurança
    $allowed = [
        'name', 'firm', 'capital', 'split', 'profit_target', 'max_dd', 'daily_dd',
        'status', 'market', 'phase', 'phase1_target', 'phase2_target',
        'min_trading_days', 'max_risk_pct', 'phase_start_date', 'last_payout_date',
        'payout_freq_days',
    ];

    $sets = [];
    $vals = [];
    foreach ($allowed as $col) {
        if (array_key_exists($col, $b)) {
            $sets[] = "$col = ?";
            $vals[] = $b[$col];
        }
    }
    if (!$sets) err('No fields to update');

    $vals[] = $id;
    $db->prepare('UPDATE accounts SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);

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
