<?php
// raw_test.php — diagnóstico mínimo, SEM depender do config.php
// Coloca em api/raw_test.php, visita no browser, depois APAGA.

// Força o PHP a mostrar qualquer erro diretamente, ignorando configs do servidor
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

header('Content-Type: text/plain; charset=utf-8');

echo "PASSO 1: PHP está a executar. ✓\n";
echo "Versão PHP: " . phpversion() . "\n\n";

echo "PASSO 2: Extensões necessárias:\n";
echo "  pdo: " . (extension_loaded('pdo') ? 'OK' : 'EM FALTA ✗') . "\n";
echo "  pdo_mysql: " . (extension_loaded('pdo_mysql') ? 'OK' : 'EM FALTA ✗') . "\n";
echo "  session: " . (extension_loaded('session') ? 'OK' : 'EM FALTA ✗') . "\n\n";

echo "PASSO 3: A tentar incluir config.php...\n";
try {
    require_once __DIR__ . '/config.php';
    echo "  config.php carregado sem erros. ✓\n\n";
} catch (\Throwable $e) {
    echo "  ERRO ao carregar config.php:\n";
    echo "  Mensagem: " . $e->getMessage() . "\n";
    echo "  Ficheiro: " . $e->getFile() . "\n";
    echo "  Linha: " . $e->getLine() . "\n";
    exit;
}

echo "PASSO 4: A tentar ligar à base de dados diretamente...\n";
try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS
    );
    echo "  Ligação à BD: SUCESSO ✓\n\n";
} catch (\Throwable $e) {
    echo "  ERRO na ligação à BD:\n";
    echo "  Mensagem: " . $e->getMessage() . "\n";
    exit;
}

echo "TUDO OK — o problema não está no PHP nem na BD básica.\n";
echo "(Apaga este ficheiro depois de usar)\n";
