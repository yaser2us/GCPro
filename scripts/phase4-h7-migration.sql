-- Phase 4 / H7: Withdrawal fee tracking
-- Safe to run multiple times (column existence check via IF NOT EXISTS not available in MySQL 5.7,
-- but the ALTER will fail gracefully if already applied)

ALTER TABLE `wallet_withdrawal_request`
  ADD COLUMN `fee_amount` decimal(12,2) NOT NULL DEFAULT '0.00'
    COMMENT 'Processing fee deducted from withdrawal amount'
    AFTER `amount`;
