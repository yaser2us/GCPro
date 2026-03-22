-- ============================================================
-- User Identity Pillar Permissions Setup
-- Adds all required permissions for the UserIdentity module
-- Based on: specs/user-identity/user-identity.pillar.v2.yml
-- ============================================================

USE GCPRO;

-- ============================================================
-- Insert User Identity Permissions
-- ============================================================

INSERT INTO `permission` (code, name, description, scope, status, created_at)
VALUES
  -- Admin Permission
  -- Used by: DeviceTokenController, RegistrationTokenController,
  --          VerificationStatusController, OnboardingProgressController
  ('user-identity:admin', 'User Identity Admin', 'Full administrative access to device tokens, registration tokens, verification status, and onboarding progress', 'api', 'active', NOW()),

  -- Granular read permission (future-use / reporting)
  ('user-identity:read', 'User Identity Read', 'Read-only access to user identity data', 'api', 'active', NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  scope = VALUES(scope),
  status = VALUES(status);

-- ============================================================
-- Assign All User Identity Permissions to Admin User (ID: 1)
-- ============================================================

INSERT INTO `user_permission` (user_id, permission_id, created_at)
SELECT 1, id, NOW()
FROM `permission`
WHERE code LIKE 'user-identity:%'
ON DUPLICATE KEY UPDATE user_id = user_id;

-- ============================================================
-- Assign All User Identity Permissions to Admin Role (ID: 1)
-- ============================================================

INSERT INTO `role_permission` (role_id, permission_id, created_at)
SELECT 1, id, NOW()
FROM `permission`
WHERE code LIKE 'user-identity:%'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- ============================================================
-- Verification Queries
-- ============================================================

SELECT
  'User Identity Permissions Created' AS status,
  COUNT(*) AS total_permissions
FROM `permission`
WHERE code LIKE 'user-identity:%';

SELECT
  id, code, name, description, scope, status
FROM `permission`
WHERE code LIKE 'user-identity:%'
ORDER BY code;

SELECT
  'Admin User User-Identity Permissions' AS status,
  COUNT(*) AS assigned_permissions
FROM `user_permission` up
JOIN `permission` p ON up.permission_id = p.id
WHERE up.user_id = 1
  AND p.code LIKE 'user-identity:%';

SELECT
  'Admin Role User-Identity Permissions' AS status,
  COUNT(*) AS assigned_permissions
FROM `role_permission` rp
JOIN `permission` p ON rp.permission_id = p.id
WHERE rp.role_id = 1
  AND p.code LIKE 'user-identity:%';

-- ============================================================
-- Permission Summary
-- ============================================================
-- Total User Identity Permissions: 2
--
-- Categories:
-- - Admin (all write operations): user-identity:admin
-- - Read-only (future/reporting):  user-identity:read
--
-- Assignments:
-- - Admin User (ID: 1): All 2 permissions via user_permission
-- - Admin Role (ID: 1): All 2 permissions via role_permission
-- ============================================================
