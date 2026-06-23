-- ================================================================
-- Trading Space — Migração: Compliance Tracker + Payouts (v2)
-- Corre este script no phpMyAdmin (ou terminal MySQL) UMA VEZ
--
-- IMPORTANTE: Corre cada bloco "ALTER TABLE" separadamente.
-- Se aparecer erro "Duplicate column name" numa linha, é porque essa
-- coluna já existe (ex: já correste a v1 da migração) — ignora esse
-- erro específico e passa à linha seguinte.
-- ================================================================
USE trading_space;

-- ── Novos campos na tabela accounts (correr um a um) ──────────────────────────
ALTER TABLE accounts ADD COLUMN phase             VARCHAR(20)   DEFAULT 'Phase 1';
ALTER TABLE accounts ADD COLUMN phase1_target     DECIMAL(5,2)  DEFAULT 8;
ALTER TABLE accounts ADD COLUMN phase2_target     DECIMAL(5,2)  DEFAULT 5;
ALTER TABLE accounts ADD COLUMN min_trading_days  INT           DEFAULT 3;
ALTER TABLE accounts ADD COLUMN max_risk_pct      DECIMAL(5,2)  DEFAULT NULL;
ALTER TABLE accounts ADD COLUMN phase_start_date  DATE          DEFAULT NULL;
ALTER TABLE accounts ADD COLUMN last_payout_date  DATE          DEFAULT NULL;
ALTER TABLE accounts ADD COLUMN payout_freq_days  INT           DEFAULT 0;

-- Define phase_start_date = data de criação para contas já existentes
UPDATE accounts SET phase_start_date = DATE(created_at) WHERE phase_start_date IS NULL;

-- ── Tabela de Payouts (reais ou de teste) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS payouts (
  id            VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id       VARCHAR(36)   NOT NULL,
  account_id    VARCHAR(36)   NOT NULL,
  gross_profit  DECIMAL(15,2) NOT NULL DEFAULT 0,
  split_pct     DECIMAL(5,2)  NOT NULL DEFAULT 80,
  amount        DECIMAL(15,2) NOT NULL DEFAULT 0,
  is_test       TINYINT(1)    NOT NULL DEFAULT 1,
  note          VARCHAR(255)  DEFAULT '',
  payout_date   DATETIME      NOT NULL DEFAULT NOW(),
  created_at    DATETIME      NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  INDEX idx_payouts_user    (user_id),
  INDEX idx_payouts_account (account_id)
);

-- ================================================================
-- SE JÁ CORRESTE A v1 DESTA MIGRAÇÃO ANTES, só precisas de correr
-- esta linha extra (a única coluna nova da v2):
-- ================================================================
-- ALTER TABLE accounts ADD COLUMN payout_freq_days INT DEFAULT 0;
