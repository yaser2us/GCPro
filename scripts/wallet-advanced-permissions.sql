-- ============================================================
-- Wallet Advanced Permissions Setup
-- Adds all required permissions for the WalletAdvanced module
-- Based on: specs/wallet-advanced/wallet-advanced.pillar.v2.yml
-- Controllers: DepositIntentController, SpendIntentController,
--              WithdrawalRequestController, WalletHoldController,
--              WalletBatchController, WalletRuleSetController,
--              ThresholdRuleController, ThresholdEventController,
--              PolicyGateController
-- ============================================================

USE GCPRO;

-- ============================================================
-- Insert Wallet Advanced Permissions
-- ============================================================

INSERT INTO `permission` (code, name, description, scope, status, created_at)
VALUES
  -- Admin Permission
  -- Used by all 9 wallet-advanced controllers
  ('wallet-advanced:admin', 'Wallet Advanced Admin', 'Full administrative access to deposit intents, spend intents, withdrawal requests, holds, batches, rule sets, threshold rules, threshold events, and policy gates', 'api', 'active', NOW()),

  -- Granular read permission (future-use / reporting)
  ('wallet-advanced:read', 'Wallet Advanced Read', 'Read-only access to wallet advanced data', 'api', 'active', NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  scope = VALUES(scope),
  status = VALUES(status);

-- ============================================================
-- Assign All Wallet Advanced Permissions to Admin User (ID: 1)
-- ============================================================

INSERT INTO `user_permission` (user_id, permission_id, created_at)
SELECT 1, id, NOW()
FROM `permission`
WHERE code LIKE 'wallet-advanced:%'
ON DUPLICATE KEY UPDATE user_id = user_id;

-- ============================================================
-- Assign All Wallet Advanced Permissions to Admin Role (ID: 1)
-- ============================================================

INSERT INTO `role_permission` (role_id, permission_id, created_at)
SELECT 1, id, NOW()
FROM `permission`
WHERE code LIKE 'wallet-advanced:%'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- ============================================================
-- Verification Queries
-- ============================================================

SELECT
  'Wallet Advanced Permissions Created' AS status,
  COUNT(*) AS total_permissions
FROM `permission`
WHERE code LIKE 'wallet-advanced:%';

SELECT
  id, code, name, description, scope, status
FROM `permission`
WHERE code LIKE 'wallet-advanced:%'
ORDER BY code;

SELECT
  'Admin User Wallet-Advanced Permissions' AS status,
  COUNT(*) AS assigned_permissions
FROM `user_permission` up
JOIN `permission` p ON up.permission_id = p.id
WHERE up.user_id = 1
  AND p.code LIKE 'wallet-advanced:%';

SELECT
  'Admin Role Wallet-Advanced Permissions' AS status,
  COUNT(*) AS assigned_permissions
FROM `role_permission` rp
JOIN `permission` p ON rp.permission_id = p.id
WHERE rp.role_id = 1
  AND p.code LIKE 'wallet-advanced:%';

-- ============================================================
-- Permission Summary
-- ============================================================
-- Total Wallet Advanced Permissions: 2
--
-- Categories:
-- - Admin (all write operations): wallet-advanced:admin
-- - Read-only (future/reporting):  wallet-advanced:read
--
-- Assignments:
-- - Admin User (ID: 1): All 2 permissions via user_permission
-- - Admin Role (ID: 1): All 2 permissions via role_permission
-- ============================================================
