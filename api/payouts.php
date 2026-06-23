<?php
require_once __DIR__ . '/config.php';

$user   = requireSession();
$uid    = $user['id'];
$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];


if ($method === 'GET') {
    $accId = $_GET['account_id'] ?? '';
    if ($accId) {
        $stmt = $db->prepare('SELECT * FROM payouts WHERE user_id = ? AND account_id = ? ORDER BY payout_date DESC');
        $stmt->execute([$uid, $accId]);
    } else {
        $stmt = $db->prepare('SELECT * FROM payouts WHERE user_id = ? ORDER BY payout_date DESC');
        $stmt->execute([$uid]);
    }
    ok(['data' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $b = body();
    $accountId = $b['account_id'] ?? '';
    if (!$accountId) err('account_id is required');

    // Confirma que a conta pertence ao utilizador
    $chk = $db->prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?');
    $chk->execute([$accountId, $uid]);
    $acc = $chk->fetch();
    if (!$acc) err('Account not found', 404);

    // ── Valida a frequência de payout (servidor é a fonte de verdade) ────────────
    $freqDays = (int)($acc['payout_freq_days'] ?? 0);
    if ($freqDays > 0) {
        $anchorDate = $acc['last_payout_date'] ?? $acc['phase_start_date'] ?? null;
        if ($anchorDate) {
            $daysSince = (int) floor((time() - strtotime($anchorDate)) / 86400);
            if ($daysSince < $freqDays) {
                $nextDate = date('Y-m-d', strtotime($anchorDate) + $freqDays * 86400);
                err("Ainda não podes pedir payout. Próxima data disponível: $nextDate (faltam " . ($freqDays - $daysSince) . " dia(s)).", 422);
            }
        }
    }

    $grossProfit = (float)($b['gross_profit'] ?? 0);
    $splitPct    = (float)($b['split_pct'] ?? $acc['split'] ?? 80);
    $amount      = (float)($b['amount'] ?? round($grossProfit * $splitPct / 100, 2));
    $isTest      = isset($b['is_test']) ? (int)(bool)$b['is_test'] : 1;
    $note        = $b['note'] ?? ($isTest ? 'Payout de teste' : '');

    $id = uuid();
    $db->prepare(
        'INSERT INTO payouts (id, user_id, account_id, gross_profit, split_pct, amount, is_test, note, payout_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())'
    )->execute([$id, $uid, $accountId, $grossProfit, $splitPct, $amount, $isTest, $note]);

    // Avança o ciclo: marca a data deste payout para a próxima janela de lucro elegível
    $db->prepare('UPDATE accounts SET last_payout_date = CURDATE() WHERE id = ?')->execute([$accountId]);

    $row = $db->prepare('SELECT * FROM payouts WHERE id = ?');
    $row->execute([$id]);
    ok(['data' => $row->fetch()]);
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if (!$id) err('ID required');
    $chk = $db->prepare('SELECT id FROM payouts WHERE id = ? AND user_id = ?');
    $chk->execute([$id, $uid]);
    if (!$chk->fetch()) err('Not found', 404);
    $db->prepare('DELETE FROM payouts WHERE id = ?')->execute([$id]);
    ok(['ok' => true]);
}

err('Method not allowed', 405);
