<?php
// import_trades.php
// Uso (CLI): php import_trades.php /path/to/file.csv [--user=USER_ID] [--account=ACCOUNT_ID]
// Uso (HTTP): POST multipart/form-data com campo 'file' e opcionais 'user_id' e 'account_id'

// Evitar avisos quando executado via CLI (config.php verifica REQUEST_METHOD)
if (php_sapi_name() === 'cli') {
    $_SERVER['REQUEST_METHOD'] = $_SERVER['REQUEST_METHOD'] ?? 'CLI';
}
require_once __DIR__ . '/config.php';

function parse_action(string $text): array {
    $res = ['raw' => $text];

    $patterns = [
        // Close short position for symbol OANDA:XAUUSD at price 4515.890 for 4 units. Position AVG Price was 4515.850000, currency: USD, rate: 1.000000, point value: 1.000000
        '/(?P<action>Open|Close)\s+(?P<side>long|short) position for symbol\s+(?P<symbol>[^\s]+)\s+at price\s+(?P<price>[0-9,.]+)\s+for\s+(?P<units>[0-9,.]+)\s+units\.\s*Position AVG Price was\s+(?P<avg_price>[0-9,.]+),\s*currency:\s*(?P<currency>[^,]+),\s*rate:\s*(?P<rate>[0-9,.]+),\s*point value:\s*(?P<point_value>[0-9,.]+)/i',
        // Simpler: Close short position for symbol OANDA:XAUUSD at price 4515.890 for 4 units.
        '/(?P<action>Open|Close)\s+(?P<side>long|short) position for symbol\s+(?P<symbol>[^\s]+)\s+at price\s+(?P<price>[0-9,.]+)\s+for\s+(?P<units>[0-9,.]+)\s+units\.?/i',
    ];

    foreach ($patterns as $p) {
        if (preg_match($p, $text, $m)) {
            $res['matched'] = true;
            $res['action'] = $m['action'] ?? null;
            $res['side'] = isset($m['side']) ? ucfirst(strtolower($m['side'])) : null;
            // Normalize to direction used in UI/DB
            if (!empty($res['side'])) {
                $s = strtolower($res['side']);
                if ($s === 'long') $res['direction'] = 'Buy';
                elseif ($s === 'short') $res['direction'] = 'Sell';
                else $res['direction'] = ucfirst($res['side']);
            }
            $res['symbol'] = $m['symbol'] ?? null;
            $res['price'] = isset($m['price']) ? floatval(str_replace(',', '', $m['price'])) : null;
            $res['units'] = isset($m['units']) ? floatval(str_replace(',', '', $m['units'])) : null;
            $res['avg_price'] = isset($m['avg_price']) ? floatval(str_replace(',', '', $m['avg_price'])) : null;
            $res['currency'] = isset($m['currency']) ? trim($m['currency']) : null;
            $res['rate'] = isset($m['rate']) ? floatval(str_replace(',', '', $m['rate'])) : null;
            $res['point_value'] = isset($m['point_value']) ? floatval(str_replace(',', '', $m['point_value'])) : null;
            return $res;
        }
    }

    $res['matched'] = false;
    return $res;
}

function compute_result(?float $pnl): string {
    if ($pnl === null) return 'BE';
    if ($pnl > 5) return 'Win';
    if ($pnl < -5) return 'Loss';
    return 'BE';
}

function parse_tradingview_csv_contents(string $text): array {
    $lines = preg_split('/\r?\n/', trim($text));
    if (!$lines) return ['rows'=>[], 'errors'=>['empty file']];
    $sep = strpos($lines[0], ';') !== false ? ';' : ',';
    $headers = array_map(function($h){ return strtolower(trim(trim($h), '"')); }, explode($sep, $lines[0]));
    $colIndex = function($names) use ($headers) {
        foreach ($names as $n) {
            foreach ($headers as $i => $h) {
                if (strpos($h, $n) !== false) return $i;
            }
        }
        return -1;
    };
    $iDate = $colIndex(['date/time','date','time','data']);
    $iSym  = $colIndex(['symbol','ticker','instrument','market']);
    $iSide = $colIndex(['side','type','direction','action']);
    $iPrice= $colIndex(['price','fill price','avg price']);
    $iQty  = $colIndex(['qty','quantity','size','contracts','lots','volume']);
    $iPnl  = $colIndex(['profit','p&l','pnl','net profit','realized']);

    $rows = [];
    for ($i=1;$i<count($lines);$i++) {
        $line = $lines[$i];
        if (!trim($line)) continue;
        $cols = str_getcsv($line, $sep);
        $get = function($idx) use ($cols) { return $idx>=0 && isset($cols[$idx]) ? trim($cols[$idx], " \t\r\n\0\x0B\"") : ''; };
        $dateRaw = $get($iDate) ?: $get(0);
        $sym = strtoupper(preg_replace('/[^A-Z0-9:._-]/','', $get($iSym) ?: $get(1)));
        $sideRaw = strtolower($get($iSide));
        $side = (strpos($sideRaw,'sell') !== false || strpos($sideRaw,'short') !== false) ? 'Sell' : 'Buy';
        $price = floatval(preg_replace('/[^0-9.\-]/','', $get($iPrice)));
        $qty = is_numeric($get($iQty)) ? floatval($get($iQty)) : null;
        $pnl = null;
        $pnlRaw = $get($iPnl);
        if ($pnlRaw !== '') $pnl = floatval(preg_replace('/[^0-9.\-]/','', $pnlRaw));

        $trade_date = null;
        if ($dateRaw) {
            $d = date_create($dateRaw);
            if ($d) $trade_date = $d->format('Y-m-d H:i:s');
        }

        $symbol = get_asset_from_symbol($sym);
        $session = determine_session($trade_date, 'Europe/Lisbon');
        $rows[] = [
            'time' => $trade_date,
            'realized_pnl_value' => $pnl,
            'realized_pnl_currency' => null,
            'action_text' => null,
            'action' => [
                'symbol' => $symbol,
                'side' => $side === 'Buy' ? 'long' : 'short',
                'direction' => $side,
                'units' => $qty,
                'price' => $price,
            ],
            'asset_short' => $symbol,
            'trade_date' => $trade_date,
            'session' => $session,
            'result' => compute_result($pnl),
        ];
    }
    return ['rows'=>$rows,'errors'=>[]];
}

function get_asset_from_symbol(?string $symbol): ?string {
    if (empty($symbol)) return null;
    // Remove provider prefix e.g. OANDA: XAUUSD -> XAUUSD
    if (strpos($symbol, ':') !== false) {
        $parts = explode(':', $symbol, 2);
        $symbol = $parts[1];
    }
    $symbol = trim($symbol);
    // If it's a pair like XAUUSD or EURUSD, strip common 3-letter currencies
    $ccy = ['USD','EUR','GBP','JPY','AUD','NZD','CHF','CAD','SGD','HKD'];
    $len = strlen($symbol);
    if ($len > 3) {
        $last3 = strtoupper(substr($symbol, -3));
        if (in_array($last3, $ccy, true)) {
            return strtoupper(substr($symbol, 0, -3));
        }
    }
    // Otherwise return the symbol uppercase (e.g., US100)
    return strtoupper($symbol);
}

function determine_session(?string $time_str, string $tz = 'Europe/Lisbon'): string {
    if (empty($time_str)) return 'unknown';
    try {
        $dt = new DateTime($time_str, new DateTimeZone($tz));
    } catch (Exception $e) {
        try {
            $dt = new DateTime($time_str);
            $dt->setTimezone(new DateTimeZone($tz));
        } catch (Exception $e2) {
            return 'unknown';
        }
    }
    $hour = intval($dt->format('H'));
    // Session mapping (Lisbon time):
    // 00:00-07:59 -> Asia, 08:00-13:59 -> London, 14:00-17:59 -> New York, 18:00-23:59 -> Other
    if ($hour >= 8 && $hour < 14) return 'London';
    if ($hour >= 14 && $hour < 18) return 'New York';
    if ($hour >= 0 && $hour < 8) return 'Asia';
    return 'Other';
}

function normalize_to_tz(?string $time_str, string $tz = 'Europe/Lisbon'): ?string {
    if (empty($time_str)) return null;
    try {
        $dt = new DateTime($time_str);
    } catch (Exception $e) {
        return null;
    }
    $tzObj = new DateTimeZone($tz);
    $dt->setTimezone($tzObj);
    return $dt->format('Y-m-d H:i:s');
}

function is_same_date_in_tz(string $dt_str, string $tz = 'Europe/Lisbon'): bool {
    $normalized = normalize_to_tz($dt_str, $tz);
    if (!$normalized) return false;
    $d = substr($normalized, 0, 10);
    $now = new DateTime('now', new DateTimeZone($tz));
    return $d === $now->format('Y-m-d');
}

function parse_csv_file(string $path): array {
    $result = ['rows' => [], 'errors' => []];
    if (!is_readable($path)) {
        $result['errors'][] = "File not readable: $path";
        return $result;
    }

    $content = file_get_contents($path);
    if ($content === false) {
        $result['errors'][] = "Cannot read file: $path";
        return $result;
    }

    $firstLine = strtok($content, "\r\n");
    if ($firstLine && stripos($firstLine, 'action') !== false && stripos($firstLine, 'realized pnl') !== false) {
        // Original TradingView paper trading export with Action column
        $handle = fopen($path, 'r');
        if ($handle === false) {
            $result['errors'][] = "Cannot open file: $path";
            return $result;
        }
        $header = null;
        while (($row = fgetcsv($handle)) !== false) {
            if ($header === null) {
                $header = $row;
                continue;
            }
            $assoc = array_combine($header, $row);
            $parsed = [];
            $parsed['time'] = $assoc['Time'] ?? null;
            $parsed['realized_pnl_value'] = isset($assoc['Realized PnL (value)']) ? floatval($assoc['Realized PnL (value)']) : null;
            $parsed['realized_pnl_currency'] = $assoc['Realized PnL (currency)'] ?? null;
            $parsed['action_text'] = $assoc['Action'] ?? null;
            $parsed['action'] = $parsed['action_text'] ? parse_action($parsed['action_text']) : null;
            $parsed['asset'] = get_asset_from_symbol($parsed['action']['symbol'] ?? null);
            $parsed['asset_short'] = $parsed['asset'];
            $parsed['trade_date'] = $parsed['time'] ? date('Y-m-d H:i:s', strtotime($parsed['time'])) : null;
            $parsed['session'] = determine_session($parsed['time'], 'Europe/Lisbon');
            $parsed['result'] = compute_result($parsed['realized_pnl_value']);
            $result['rows'][] = $parsed;
        }
        fclose($handle);
        return $result;
    }

    return parse_tradingview_csv_contents($content);
}

function find_strategy_id(PDO $pdo, string $user_id, string $name): ?string {
    $sql = 'SELECT id FROM strategies WHERE user_id = ? AND LOWER(name) = LOWER(?) LIMIT 1';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$user_id, $name]);
    $data = $stmt->fetch();
    return $data['id'] ?? null;
}

function insert_trade(PDO $pdo, array $row, string $user_id, string $account_id): bool {
    $symbol = $row['asset_short'] ?? get_asset_from_symbol($row['action']['symbol'] ?? null);
    $direction = $row['action']['direction'] ?? ($row['action']['side'] ?? null);
    $lots = $row['action']['units'] ?? null;
    $pnl = $row['realized_pnl_value'] ?? 0;
    $trade_date = $row['time'] ? normalize_to_tz($row['time'], 'Europe/Lisbon') : null;
    $session = $row['session'] ?? determine_session($trade_date, 'Europe/Lisbon');
    $result = $row['result'] ?? compute_result($pnl);
    $strategy_id = null;
    if ($session === 'London') {
        $strategy_id = find_strategy_id($pdo, $user_id, 'CVD');
    }

    if (!$trade_date || !is_same_date_in_tz($row['time'], 'Europe/Lisbon')) {
        return false;
    }

    $chk = $pdo->prepare('SELECT id FROM trades WHERE user_id=? AND account_id=? AND asset=? AND direction=? AND lots=? AND trade_date=? LIMIT 1');
    $chk->execute([$user_id, $account_id, $symbol, $direction, $lots, $trade_date]);
    if ($chk->fetch()) return false;

    $sql = 'INSERT INTO trades (id, user_id, account_id, strategy_id, trade_date, asset, direction, lots, pnl, result, session, created_at) VALUES (:id, :user_id, :account_id, :strategy_id, :trade_date, :asset, :direction, :lots, :pnl, :result, :session, NOW())';
    $stmt = $pdo->prepare($sql);
    try {
        $stmt->execute([
            ':id' => uuid(),
            ':user_id' => $user_id,
            ':account_id' => $account_id,
            ':strategy_id' => $strategy_id,
            ':trade_date' => $trade_date,
            ':asset' => $symbol,
            ':direction' => $direction ?? 'Buy',
            ':lots' => $lots ?? 0,
            ':pnl' => $pnl,
            ':result' => $result,
            ':session' => $session,
        ]);
        return true;
    } catch (Exception $e) {
        return false;
    }
}

// Entry point
$is_cli = php_sapi_name() === 'cli';
$user_id = null;
$account_id = null;
$file_path = null;

if ($is_cli) {
    global $argv;
    if (empty($argv[1])) {
        echo json_encode(['error' => 'Usage: php import_trades.php /path/to/file.csv [--user=USER_ID] [--account=ACCOUNT_ID]']) . PHP_EOL;
        exit(1);
    }
    $file_path = $argv[1];
    foreach ($argv as $a) {
        if (strpos($a, '--user=') === 0) $user_id = substr($a, 7);
        if (strpos($a, '--account=') === 0) $account_id = substr($a, 10);
    }
    $out = parse_csv_file($file_path);
    $inserted = 0;
    if ($user_id && $account_id) {
        $pdo = getDB();
        foreach ($out['rows'] as $r) {
            if (insert_trade($pdo, $r, $user_id, $account_id)) $inserted++;
        }
    }
    echo json_encode(['parsed' => count($out['rows']), 'inserted' => $inserted, 'errors' => $out['errors'], 'rows' => $out['rows']]);
    exit(0);
}

// HTTP handling — expect user session and an `account_id` chosen at import time
if (!empty($_FILES['file']) && is_uploaded_file($_FILES['file']['tmp_name'])) {
    $user = requireSession();
    $user_id = $user['id'];
    $tmp = $_FILES['file']['tmp_name'];
    $account_id = $_POST['account_id'] ?? null;
    if (empty($account_id)) err('account_id is required', 400);
    // Validate account belongs to user
    $pdo = getDB();
    $chk = $pdo->prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?');
    $chk->execute([$account_id, $user_id]);
    if (!$chk->fetch()) err('Invalid account', 403);

    $out = parse_csv_file($tmp);
    $inserted = 0;
    $skipped_old_date = 0;
    $skipped_duplicate = 0;
    foreach ($out['rows'] as $r) {
        // Only trades from today (Europe/Lisbon) will be inserted; insert_trade returns false if skipped
        if (!is_same_date_in_tz($r['time'] ?? '', 'Europe/Lisbon')) {
            $skipped_old_date++;
            continue;
        }
        $ok = insert_trade($pdo, $r, $user_id, $account_id);
        if ($ok) $inserted++; else $skipped_duplicate++;
    }
    ok(['parsed' => count($out['rows']), 'inserted' => $inserted, 'skipped_old_date' => $skipped_old_date, 'skipped_duplicate_or_error' => $skipped_duplicate, 'errors' => $out['errors']]);
}

err('No file provided', 400);
