-- ============================================================
-- Foundation Pillar Permissions Setup
-- Adds all required permissions for the Foundation module
-- Based on: specs/foundation/foundation.pillar.v2.yml
-- ============================================================

USE GCPRO;

-- ============================================================
-- Insert Foundation Permissions
-- ============================================================

INSERT INTO `permission` (code, name, description, scope, status, created_at)
VALUES
  -- Admin Permission
  -- Used by: ReferenceDataController, AddressController, BenefitCatalogController,
  --          DiscountProgramController, GuidelineController (create/publish/archive),
  --          KYCController
  ('foundation:admin', 'Foundation Admin', 'Full administrative access to foundation reference data, addresses, benefit catalogs, discount programs, guidelines, and KYC management', 'api', 'active', NOW()),

  -- Guideline Accept (no @RequirePermissions — any authenticated user)
  -- Included here for documentation completeness; controller allows any authenticated user
  ('foundation:guideline:accept', 'Foundation Guideline Accept', 'Accept or decline a published guideline version (any authenticated user)', 'api', 'active', NOW()),

  -- Granular read permission (future-use / reporting)
  ('foundation:read', 'Foundation Read', 'Read-only access to foundation reference data', 'api', 'active', NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  scope = VALUES(scope),
  status = VALUES(status);

-- ============================================================
-- Assign All Foundation Permissions to Admin User (ID: 1)
-- ============================================================

INSERT INTO `user_permission` (user_id, permission_id, created_at)
SELECT 1, id, NOW()
FROM `permission`
WHERE code LIKE 'foundation:%'
ON DUPLICATE KEY UPDATE user_id = user_id;

-- ============================================================
-- Assign All Foundation Permissions to Admin Role (ID: 1)
-- ============================================================

INSERT INTO `role_permission` (role_id, permission_id, created_at)
SELECT 1, id, NOW()
FROM `permission`
WHERE code LIKE 'foundation:%'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- ============================================================
-- Verification Queries
-- ============================================================

-- Verify all foundation permissions were created
SELECT
  'Foundation Permissions Created' AS status,
  COUNT(*) AS total_permissions
FROM `permission`
WHERE code LIKE 'foundation:%';

-- List all foundation permissions
SELECT
  id,
  code,
  name,
  description,
  scope,
  status
FROM `permission`
WHERE code LIKE 'foundation:%'
ORDER BY code;

-- Verify admin user has all foundation permissions
SELECT
  'Admin User Foundation Permissions' AS status,
  COUNT(*) AS assigned_permissions
FROM `user_permission` up
JOIN `permission` p ON up.permission_id = p.id
WHERE up.user_id = 1
  AND p.code LIKE 'foundation:%';

-- Verify admin role has all foundation permissions
SELECT
  'Admin Role Foundation Permissions' AS status,
  COUNT(*) AS assigned_permissions
FROM `role_permission` rp
JOIN `permission` p ON rp.permission_id = p.id
WHERE rp.role_id = 1
  AND p.code LIKE 'foundation:%';

-- ============================================================
-- Permission Summary
-- ============================================================
-- Total Foundation Permissions: 3
--
-- Categories:
-- - Admin (all write operations):     foundation:admin
-- - Guideline acceptance (any user):  foundation:guideline:accept
-- - Read-only (future/reporting):     foundation:read
--
-- Assignments:
-- - Admin User (ID: 1): All 3 permissions via user_permission
-- - Admin Role (ID: 1): All 3 permissions via role_permission
--
-- Note: POST /api/v1/foundation/guideline-versions/:id/accept
--       has NO @RequirePermissions decorator — any authenticated
--       user (valid x-user-id + x-user-role) can call it.
--       foundation:guideline:accept is registered for completeness
--       but is NOT enforced by PermissionsGuard today.
-- ============================================================
