-- ============================================================
-- GCPro Test Data Setup
-- Seeds database with users, permissions, and test accounts
-- ============================================================

-- Use the correct database
USE GCPRO;

-- ============================================================
-- 1. Create Test Users
-- ============================================================

-- Admin User (ID: 1)
INSERT INTO `user` (id, email, phone_number, status, created_at, updated_at)
VALUES (1, 'admin@gcpro.local', '+60111111111', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE email = 'admin@gcpro.local', phone_number = '+60111111111';

-- Test User (ID: 2)
INSERT INTO `user` (id, email, phone_number, status, created_at, updated_at)
VALUES (2, 'testuser@gcpro.local', '+60122222222', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE email = 'testuser@gcpro.local', phone_number = '+60122222222';

-- ============================================================
-- 2. Create Persons for Users
-- ============================================================

-- Admin Person
INSERT INTO `person` (id, primary_user_id, full_name, email, status, created_at, updated_at)
VALUES (1, 1, 'Admin User', 'admin@gcpro.local', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE full_name = 'Admin User', email = 'admin@gcpro.local';

-- Test User Person
INSERT INTO `person` (id, primary_user_id, full_name, email, status, created_at, updated_at)
VALUES (2, 2, 'Test User', 'testuser@gcpro.local', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE full_name = 'Test User', email = 'testuser@gcpro.local';

-- ============================================================
-- 3. Create Permissions
-- ============================================================

-- Mission Permissions
INSERT INTO `permission` (code, name, description, created_at)
VALUES
  ('missions:admin', 'Missions Admin', 'Full admin access to missions', NOW()),
  ('missions:manage', 'Missions Manage', 'Manage missions', NOW()),
  ('missions:review', 'Missions Review', 'Review mission submissions', NOW()),
  ('missions:read', 'Missions Read', 'Read mission data', NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Wallet Permissions
INSERT INTO `permission` (code, name, description, created_at)
VALUES
  ('wallet:admin', 'Wallet Admin', 'Full admin access to wallet', NOW()),
  ('wallet:manage', 'Wallet Manage', 'Manage wallets', NOW()),
  ('wallet:read', 'Wallet Read', 'Read wallet data', NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================================
-- 4. Assign Permissions to Admin User (ID: 1)
-- ============================================================

-- Get permission IDs and assign to admin user
INSERT INTO `user_permission` (user_id, permission_id, created_at)
SELECT 1, id, NOW()
FROM `permission`
WHERE code IN (
  'missions:admin',
  'missions:manage',
  'missions:review',
  'missions:read',
  'wallet:admin',
  'wallet:manage',
  'wallet:read'
)
ON DUPLICATE KEY UPDATE user_id = user_id;

-- ============================================================
-- 5. Assign Read Permissions to Test User (ID: 2)
-- ============================================================

INSERT INTO `user_permission` (user_id, permission_id, created_at)
SELECT 2, id, NOW()
FROM `permission`
WHERE code IN (
  'missions:read',
  'wallet:read'
)
ON DUPLICATE KEY UPDATE user_id = user_id;

-- ============================================================
-- 6. Create System Account for Double-Entry Accounting
-- ============================================================

-- System Account (ID: 1)
INSERT INTO `account` (id, type, status, created_at, updated_at)
VALUES (1, 'system', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE type = 'system', status = 'active';

-- ============================================================
-- Verification Queries
-- ============================================================

-- Check users
SELECT 'Users:' as '========';
SELECT id, email, phone_number, status FROM `user` WHERE id IN (1, 2);

-- Check persons
SELECT 'Persons:' as '========';
SELECT id, primary_user_id, full_name, email FROM `person` WHERE id IN (1, 2);

-- Check permissions
SELECT 'Permissions:' as '========';
SELECT code, name FROM `permission` WHERE code LIKE 'missions:%' OR code LIKE 'wallet:%';

-- Check admin user permissions
SELECT 'Admin Permissions:' as '========';
SELECT u.email, p.code, p.name
FROM `user` u
JOIN `user_permission` up ON u.id = up.user_id
JOIN `permission` p ON up.permission_id = p.id
WHERE u.id = 1;

-- Check system account
SELECT 'System Account:' as '========';
SELECT id, type, status FROM `account` WHERE id = 1;

-- ============================================================
-- Success Message
-- ============================================================

SELECT '✅ Test data seeded successfully!' as 'Status';
SELECT 'Admin User ID: 1 (admin@gcpro.local) with full permissions' as 'Admin';
SELECT 'Test User ID: 2 (testuser@gcpro.local) with read permissions' as 'Test User';
SELECT 'System Account ID: 1 for double-entry accounting' as 'System';
