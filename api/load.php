<?php
require_once __DIR__ . '/config.php';

$user = requireSession();
$uid  = $user['id'];
$db   = getDB();

$accounts   = $db->prepare('SELECT * FROM accounts   WHERE user_id = ? ORDER BY created_at ASC');
$strategies = $db->prepare('SELECT * FROM strategies WHERE user_id = ? ORDER BY created_at ASC');
$trades     = $db->prepare('SELECT * FROM trades     WHERE user_id = ? ORDER BY trade_date DESC');
$notes      = $db->prepare('SELECT * FROM daily_notes WHERE user_id = ? ORDER BY note_date DESC');

$accounts->execute([$uid]);   $accData  = $accounts->fetchAll();
$strategies->execute([$uid]); $stratData = $strategies->fetchAll();
$trades->execute([$uid]);     $tradeData = $trades->fetchAll();
$notes->execute([$uid]);      $noteData  = $notes->fetchAll();

// Parse JSON fields stored as strings in MySQL
foreach ($stratData as &$r) {
    $r['pairs']    = json_decode($r['pairs']    ?? '[]', true) ?: [];
    $r['sessions'] = json_decode($r['sessions'] ?? '[]', true) ?: [];
}
foreach ($tradeData as &$r) {
    $r['images'] = json_decode($r['images'] ?? '[]', true) ?: [];
}

ok([
    'accounts'   => $accData,
    'strategies' => $stratData,
    'trades'     => $tradeData,
    'notes'      => $noteData,
]);
