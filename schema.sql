-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 13, 2026 at 09:30 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `trading_space_clear`
--

-- --------------------------------------------------------

--
-- Table structure for table `accounts`
--

CREATE TABLE `accounts` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `firm` varchar(255) DEFAULT '',
  `capital` decimal(15,2) DEFAULT 0.00,
  `split` decimal(5,2) DEFAULT 80.00,
  `profit_target` decimal(5,2) DEFAULT 10.00,
  `max_dd` decimal(5,2) DEFAULT 10.00,
  `daily_dd` decimal(5,2) DEFAULT 5.00,
  `status` varchar(50) DEFAULT 'Challenge',
  `market` varchar(50) DEFAULT 'Forex',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `phase` varchar(20) DEFAULT 'Phase 1',
  `phase1_target` decimal(5,2) DEFAULT 8.00,
  `phase2_target` decimal(5,2) DEFAULT 5.00,
  `min_trading_days` int(11) DEFAULT 3,
  `max_risk_pct` decimal(5,2) DEFAULT NULL,
  `phase_start_date` date DEFAULT NULL,
  `last_payout_date` date DEFAULT NULL,
  `payout_freq_days` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `daily_notes`
--

CREATE TABLE `daily_notes` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `note_date` date NOT NULL,
  `mood` varchar(20) DEFAULT NULL,
  `analysis` text DEFAULT NULL,
  `plan` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `market_analysis`
--

CREATE TABLE `market_analysis` (
  `id` varchar(36) NOT NULL,
  `analysis_date` date NOT NULL,
  `session_label` varchar(20) NOT NULL,
  `generated_at_utc` datetime NOT NULL,
  `pairs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`pairs`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payouts`
--

CREATE TABLE `payouts` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `account_id` varchar(36) NOT NULL,
  `gross_profit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `split_pct` decimal(5,2) NOT NULL DEFAULT 80.00,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `is_test` tinyint(1) NOT NULL DEFAULT 1,
  `note` varchar(255) DEFAULT '',
  `payout_date` datetime NOT NULL DEFAULT current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `strategies`
--

CREATE TABLE `strategies` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `color` varchar(20) DEFAULT '#818cf8',
  `description` text DEFAULT NULL,
  `entry_rules` text DEFAULT NULL,
  `exit_rules` text DEFAULT NULL,
  `timeframe` varchar(20) DEFAULT '',
  `min_rr` varchar(20) DEFAULT '',
  `risk_pct` decimal(5,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `pairs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`pairs`)),
  `sessions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`sessions`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `strategies`
--

INSERT INTO `strategies` (`id`, `user_id`, `name`, `color`, `description`, `entry_rules`, `exit_rules`, `timeframe`, `min_rr`, `risk_pct`, `notes`, `pairs`, `sessions`, `created_at`) VALUES
('032e5dd4-7bd4-4db9-a865-1ee245b77436', '2b4fe9f6-290c-45ce-bd28-f811c8d78ccb', 'EDGE', '#4ade80', '', 'W clear direction\n4h same direction\n15-30 min mark zones->(indecision candle + strong moviment)\n1-touch the zone\n2-fibonacci retracement\n3-liquidity sweep\n4-1-5min mss ', '1:3 RR take all\n1:1 RR take 25%\n1:2RR take 25%-> BE', '5m', '1:3', 0.50, '', '[\"EUR\\/USD\",\"USD\\/JPY\",\"EUR\\/GBP\"]', '[\"London\",\"New York\",\"Asian\",\"London\\/NY Overlap\",\"Off-session\"]', '2026-07-15 00:44:56'),
('50da1eb6-958a-410e-af51-689184280c69', '2b4fe9f6-290c-45ce-bd28-f811c8d78ccb', 'Volume', '#fbbf24', 'Volume profile break outs', 'Find a shape ', '', '5m', '1:3', 0.50, '', '[\"US100\",\"XAUUSD\"]', '[\"New York\"]', '2026-07-15 23:34:23'),
('a8f5bb9c-a6b8-42d7-9d1c-60528bba387a', '2b4fe9f6-290c-45ce-bd28-f811c8d78ccb', 'CVD', '#818cf8', 'Accumulation and distribution ', 'break the accumulation \ncvd diversion ', '', '1m', '1:3', 0.50, '', '[\"US100\",\"US30\",\"XAUUSD\"]', '[\"London\",\"New York\"]', '2026-04-21 12:49:10');

-- --------------------------------------------------------

--
-- Table structure for table `trades`
--

CREATE TABLE `trades` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `account_id` varchar(36) NOT NULL,
  `strategy_id` varchar(36) DEFAULT NULL,
  `trade_date` datetime DEFAULT NULL,
  `asset` varchar(50) DEFAULT NULL,
  `direction` varchar(10) DEFAULT 'Buy',
  `lots` decimal(10,4) DEFAULT NULL,
  `pnl` decimal(15,2) DEFAULT 0.00,
  `risk_pct` decimal(5,2) DEFAULT NULL,
  `risk_amount` decimal(15,2) DEFAULT NULL,
  `rr` varchar(20) DEFAULT NULL,
  `result` varchar(20) DEFAULT 'Win',
  `session` varchar(50) DEFAULT NULL,
  `setup` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`images`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `created_at`) VALUES
('2b4fe9f6-290c-45ce-bd28-f811c8d78ccb', 'contact.lourenco18@gmail.com', '$2y$12$pQ203lmZb97wD3QRotgC1.6OJ2dJl9ip4aa8ufpXEXA7Ep/rK1UfG', '2026-04-21 12:33:41');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accounts`
--
ALTER TABLE `accounts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_accounts_user` (`user_id`);

--
-- Indexes for table `daily_notes`
--
ALTER TABLE `daily_notes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_note_user_date` (`user_id`,`note_date`),
  ADD KEY `idx_notes_user` (`user_id`);

--
-- Indexes for table `market_analysis`
--
ALTER TABLE `market_analysis`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_market_created` (`created_at`);

--
-- Indexes for table `payouts`
--
ALTER TABLE `payouts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_payouts_user` (`user_id`),
  ADD KEY `idx_payouts_account` (`account_id`);

--
-- Indexes for table `strategies`
--
ALTER TABLE `strategies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_strategies_user` (`user_id`);

--
-- Indexes for table `trades`
--
ALTER TABLE `trades`
  ADD PRIMARY KEY (`id`),
  ADD KEY `strategy_id` (`strategy_id`),
  ADD KEY `idx_trades_user` (`user_id`),
  ADD KEY `idx_trades_account` (`account_id`),
  ADD KEY `idx_trades_date` (`trade_date`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `accounts`
--
ALTER TABLE `accounts`
  ADD CONSTRAINT `accounts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `daily_notes`
--
ALTER TABLE `daily_notes`
  ADD CONSTRAINT `daily_notes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payouts`
--
ALTER TABLE `payouts`
  ADD CONSTRAINT `payouts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `payouts_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `strategies`
--
ALTER TABLE `strategies`
  ADD CONSTRAINT `strategies_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `trades`
--
ALTER TABLE `trades`
  ADD CONSTRAINT `trades_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `trades_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `trades_ibfk_3` FOREIGN KEY (`strategy_id`) REFERENCES `strategies` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
