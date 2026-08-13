-- ================================================================
-- Trading Space — Schema Local (XAMPP / WAMP / MAMP)
-- Colar no phpMyAdmin ou correr no terminal MySQL
-- ================================================================

CREATE DATABASE IF NOT EXISTS trading_space CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE trading_space;

CREATE TABLE IF NOT EXISTS users (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id            VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id       VARCHAR(36)   NOT NULL,
  name          VARCHAR(255)  NOT NULL,
  firm          VARCHAR(255)  DEFAULT '',
  capital       DECIMAL(15,2) DEFAULT 0,
  split         DECIMAL(5,2)  DEFAULT 80,
  profit_target DECIMAL(5,2)  DEFAULT 10,
  max_dd        DECIMAL(5,2)  DEFAULT 10,
  daily_dd      DECIMAL(5,2)  DEFAULT 5,
  status        VARCHAR(50)   DEFAULT 'Challenge',
  market        VARCHAR(50)   DEFAULT 'Forex',
  created_at    DATETIME      NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_accounts_user (user_id)
);

CREATE TABLE IF NOT EXISTS strategies (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)  NOT NULL,
  name        VARCHAR(255) NOT NULL,
  color       VARCHAR(20)  DEFAULT '#818cf8',
  description TEXT,
  entry_rules TEXT,
  exit_rules  TEXT,
  timeframe   VARCHAR(20)  DEFAULT '',
  min_rr      VARCHAR(20)  DEFAULT '',
  risk_pct    DECIMAL(5,2),
  notes       TEXT,
  pairs       JSON,
  sessions    JSON,
  created_at  DATETIME     NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_strategies_user (user_id)
);

CREATE TABLE IF NOT EXISTS trades (
  id          VARCHAR(36)    NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)    NOT NULL,
  account_id  VARCHAR(36)    NOT NULL,
  strategy_id VARCHAR(36),
  trade_date  DATETIME,
  asset       VARCHAR(50),
  direction   VARCHAR(10)    DEFAULT 'Buy',
  lots        DECIMAL(10,4),
  pnl         DECIMAL(15,2)  DEFAULT 0,
  risk_pct    DECIMAL(5,2),
  risk_amount DECIMAL(15,2),
  rr          VARCHAR(20),
  result      VARCHAR(20)    DEFAULT 'Win',
  session     VARCHAR(50),
  setup       TEXT,
  notes       TEXT,
  images      JSON,
  created_at  DATETIME       NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY (account_id)  REFERENCES accounts(id)   ON DELETE CASCADE,
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE SET NULL,
  INDEX idx_trades_user    (user_id),
  INDEX idx_trades_account (account_id),
  INDEX idx_trades_date    (trade_date)
);

CREATE TABLE IF NOT EXISTS market_analysis (
  id                VARCHAR(36)  NOT NULL PRIMARY KEY,
  analysis_date     DATE         NOT NULL,
  session_label     VARCHAR(20)  NOT NULL,
  generated_at_utc  DATETIME     NOT NULL,
  pairs             JSON         NOT NULL,
  created_at        DATETIME     NOT NULL DEFAULT NOW(),
  INDEX idx_market_created (created_at)
);

CREATE TABLE IF NOT EXISTS daily_notes (
  id         VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  note_date  DATE        NOT NULL,
  mood       VARCHAR(20),
  analysis   TEXT,
  plan       TEXT,
  created_at DATETIME    NOT NULL DEFAULT NOW(),
  UNIQUE KEY uk_note_user_date (user_id, note_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notes_user (user_id)
);
