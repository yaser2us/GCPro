-- ============================================================
-- Identity Pillar Permissions Setup
-- Adds all required permissions for the Identity module
-- Based on: specs/identity/identity.pillar.v2.yml
-- ============================================================

USE GCPRO;

-- ============================================================
-- Insert Identity Permissions
-- ============================================================

INSERT INTO `permission` (code, name, description, scope, status, created_at)
VALUES
  -- Admin Permission
  -- Used by: IdentityDeviceTokenController      → RegisterDevice, RevokeDevice
  --          IdentityRegistrationTokenController → IssueRegistrationToken, VerifyRegistrationToken,
  --                                                ConsumeRegistrationToken, ExpireRegistrationToken
  --          IdentityVerificationStatusController → UpsertVerificationStatus
  --          IdentityOnboardingProgressController → UpsertOnboardingProgress
  ('identity:admin', 'Identity Admin',
   'Full administrative access to device tokens, registration tokens, verification status, and onboarding progress',
   'api', 'active', NOW()),

  -- User Permission
  -- Used by: IdentityAuthController → Logout (POST /v1/identity/logout)
  --          IdentityAuthController → GetCurrentUser (GET /v1/identity/me)
  ('identity:user', 'Identity User',
   'Authenticated user access — self-logout and get current user profile',
   'api', 'active', NOW())

ON DUPLICATE KEY UPDATE
  name        = VALUES(name),
  description = VALUES(description),
  scope       = VALUES(scope),
  status      = VALUES(status);

-- ============================================================
-- Assign All Identity Permissions to Admin User (ID: 1)
-- ============================================================

INSERT INTO `user_permission` (user_id, permission_id, created_at)
SELECT 1, id, NOW()
FROM `permission`
WHERE code LIKE 'identity:%'
ON DUPLICATE KEY UPDATE user_id = user_id;

-- ============================================================
-- Assign All Identity Permissions to Admin Role (ID: 1)
-- ============================================================

INSERT INTO `role_permission` (role_id, permission_id, created_at)
SELECT 1, id, NOW()
FROM `permission`
WHERE code LIKE 'identity:%'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- ============================================================
-- Verification Queries
-- ============================================================

SELECT
  'Identity Permissions Created' AS status,
  COUNT(*) AS total_permissions
FROM `permission`
WHERE code LIKE 'identity:%';

SELECT
  id, code, name, description, scope, status
FROM `permission`
WHERE code LIKE 'identity:%'
ORDER BY code;

SELECT
  'Admin User Identity Permissions' AS status,
  COUNT(*) AS assigned_permissions
FROM `user_permission` up
JOIN `permission` p ON up.permission_id = p.id
WHERE up.user_id = 1
  AND p.code LIKE 'identity:%';

SELECT
  'Admin Role Identity Permissions' AS status,
  COUNT(*) AS assigned_permissions
FROM `role_permission` rp
JOIN `permission` p ON rp.permission_id = p.id
WHERE rp.role_id = 1
  AND p.code LIKE 'identity:%';

-- ============================================================
-- Permission Summary
-- ============================================================
-- Total Identity Permissions: 2
--
-- Permissions:
--   identity:admin  →  RegisterDevice, RevokeDevice,
--                       IssueRegistrationToken, VerifyRegistrationToken,
--                       ConsumeRegistrationToken, ExpireRegistrationToken,
--                       UpsertVerificationStatus, UpsertOnboardingProgress
--
--   identity:user   →  Logout (POST /v1/identity/logout)
--                       GetCurrentUser (GET /v1/identity/me)
--
-- Note: Login (POST /v1/identity/login) requires NO permission — unauthenticated entry point.
--
-- Assignments:
--   Admin User (ID: 1): Both permissions via user_permission
--   Admin Role (ID: 1): Both permissions via role_permission
-- ============================================================
