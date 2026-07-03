<?php
require_once __DIR__ . '/config.php';

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// GET is public — anyone visiting the site can see the latest reading.
// No requireSession() here on purpose.
if ($method === 'GET') {
    $row = $db->query('SELECT analysis_date AS date, session_label, generated_at_utc, pairs FROM market_analysis ORDER BY created_at DESC LIMIT 1')->fetch();
    if (!$row) ok(['data' => null]);
    ok(['data' => $row]);
}

// POST is how the automated job (GitHub Actions) writes a new reading.
// It's protected by a shared secret instead of a user session, since the
// job isn't a logged-in user.
if ($method === 'POST') {
    $secret = $_SERVER['HTTP_X_MARKET_SECRET'] ?? '';
    if (!hash_equals(MARKET_WRITE_SECRET, $secret)) {
        err('Unauthorized', 401);
    }

    $b = body();
    $date    = $b['date'] ?? null;
    $session = $b['session_label'] ?? null;
    $genAt   = $b['generated_at_utc'] ?? null;
    $pairs   = $b['pairs'] ?? null;

    if (!$date || !$session || !$genAt || !is_array($pairs)) {
        err('Missing or invalid fields (date, session_label, generated_at_utc, pairs)');
    }

    foreach ($pairs as $p) {
        if (!isset($p['symbol'], $p['label'], $p['bias'], $p['tradeable'], $p['summary'])) {
            err('Each pair needs symbol, label, bias, tradeable, summary');
        }
        if (!in_array($p['bias'], ['bullish', 'bearish', 'neutral'], true)) {
            err('bias must be bullish, bearish or neutral');
        }
    }

    $id = uuid();
    $db->prepare('INSERT INTO market_analysis (id, analysis_date, session_label, generated_at_utc, pairs) VALUES (?,?,?,?,?)')
       ->execute([$id, $date, $session, $genAt, json_encode($pairs)]);

    ok(['ok' => true, 'id' => $id]);
}

err('Method not allowed', 405);
