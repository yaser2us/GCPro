-- Phase 4 / H7: Withdrawal rule seed
-- Creates a default MYR wallet rule set (wallet_id = NULL means system default; link per wallet in app)
-- In production: run after creating user wallets, referencing actual wallet_id values.
-- This script seeds a template rule set — override per wallet as needed.

-- Example: seed for wallet_id = 1 (replace with actual wallet IDs via app logic)
-- The app seeds rules when creating each MYR wallet (H7 default rules).

-- Default rule codes used by WalletAdvancedWorkflowService:
--   min_withdrawal         : minimum withdrawal amount (MYR)
--   daily_withdrawal_limit : max daily withdrawal total (MYR)
--   monthly_withdrawal_limit: max monthly withdrawal total (MYR)
--   withdrawal_fee_pct     : fee as % of withdrawal amount
--   withdrawal_fee_flat    : flat fee per withdrawal (MYR)

-- NOTE: actual seeding is done per-wallet via POST /v1/wallet/rule-sets + POST /v1/wallet/rule-sets/:id/rules
-- This file documents the standard rule configuration for reference:

/*
  Rule set: status=active, version=v1
  Rules:
    min_withdrawal          = 50.00
    daily_withdrawal_limit  = 5000.00
    monthly_withdrawal_limit= 20000.00
    withdrawal_fee_flat     = 2.00   (RM2 per withdrawal)
*/
