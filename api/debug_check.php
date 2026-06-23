<?php
// debug_check.php — ferramenta TEMPORÁRIA de diagnóstico
// Coloca em api/debug_check.php, visita no browser, depois APAGA este ficheiro.

require_once __DIR__ . '/config.php';

header('Content-Type: text/plain; charset=utf-8');

echo "=== Trading Space — Diagnóstico ===\n\n";

// 1. PHP version
echo "PHP version: " . phpversion() . "\n";
echo "PDO MySQL disponível: " . (extension_loaded('pdo_mysql') ? 'SIM ✓' : 'NÃO ✗ — falta a extensão pdo_mysql') . "\n\n";

// 2. Tentar ligação à BD
echo "A testar ligação à base de dados...\n";
echo "Host: " . DB_HOST . "\n";
echo "User: " . DB_USER . "\n";
echo "DB Name: " . DB_NAME . "\n\n";

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo "✅ LIGAÇÃO À BASE DE DADOS: SUCESSO\n\n";

    // 3. Verificar se as tabelas existem
    $tables = ['users', 'accounts', 'strategies', 'trades', 'daily_notes', 'payouts'];
    echo "A verificar tabelas:\n";
    foreach ($tables as $t) {
        try {
            $stmt = $pdo->query("SELECT COUNT(*) FROM `$t`");
            $count = $stmt->fetchColumn();
            echo "  ✓ $t — existe ($count linhas)\n";
        } catch (Exception $e) {
            echo "  ✗ $t — ERRO: " . $e->getMessage() . "\n";
        }
    }

    // 4. Verificar colunas novas na tabela accounts
    echo "\nA verificar colunas novas em 'accounts':\n";
    $newCols = ['phase', 'phase1_target', 'phase2_target', 'min_trading_days', 'max_risk_pct', 'phase_start_date', 'last_payout_date', 'payout_freq_days'];
    $stmt = $pdo->query("SHOW COLUMNS FROM accounts");
    $existing = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'Field');
    foreach ($newCols as $col) {
        echo "  " . (in_array($col, $existing) ? "✓ $col existe" : "✗ $col EM FALTA — corre a migração SQL!") . "\n";
    }

} catch (PDOException $e) {
    echo "❌ LIGAÇÃO À BASE DE DADOS: FALHOU\n";
    echo "Erro: " . $e->getMessage() . "\n\n";
    echo "→ Os valores DB_HOST / DB_USER / DB_PASS / DB_NAME no config.php estão incorretos.\n";
    echo "→ Confirma as credenciais reais no painel do teu alojamento (cPanel / phpMyAdmin).\n";
}

echo "\n=== Fim do diagnóstico — APAGA ESTE FICHEIRO DEPOIS DE USAR ===\n";