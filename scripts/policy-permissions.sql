-- ============================================================
-- Policy Pillar Permissions Setup
-- Adds all required permissions for the Policy module
-- Based on: specs/policy/policy.pillar.v2.yml
-- ============================================================

USE GCPRO;

-- ============================================================
-- Insert Policy Permissions
-- ============================================================

INSERT INTO `permission` (code, name, description, scope, status, created_at)
VALUES
  -- Admin & Management Permissions
  ('policy:admin', 'Policy Admin', 'Full administrative access to policy management', 'api', 'active', NOW()),
  ('policy:manage', 'Policy Manage', 'Manage policies and related data', 'api', 'active', NOW()),
  ('policy:read', 'Policy Read', 'Read-only access to policy data', 'api', 'active', NOW()),

  -- Policy Lifecycle Permissions
  ('policy:create', 'Policy Create', 'Create new insurance policies', 'api', 'active', NOW()),
  ('policy:activate', 'Policy Activate', 'Activate pending policies', 'api', 'active', NOW()),
  ('policy:suspend', 'Policy Suspend', 'Suspend active policies', 'api', 'active', NOW()),
  ('policy:cancel', 'Policy Cancel', 'Cancel policies', 'api', 'active', NOW()),

  -- Member Management Permissions
  ('policy:add_member', 'Policy Add Member', 'Add members to policies', 'api', 'active', NOW()),
  ('policy:remove_member', 'Policy Remove Member', 'Remove members from policies', 'api', 'active', NOW()),

  -- Benefit Usage Permissions
  ('policy:benefit_reserve', 'Policy Benefit Reserve', 'Reserve benefit usage (pre-authorization)', 'api', 'active', NOW()),
  ('policy:benefit_confirm', 'Policy Benefit Confirm', 'Confirm benefit usage (approve claims)', 'api', 'active', NOW()),
  ('policy:benefit_release', 'Policy Benefit Release', 'Release benefit reservations (reject claims)', 'api', 'active', NOW()),

  -- Billing & Installments Permissions
  ('policy:billing_create', 'Policy Billing Create', 'Create billing plans for policies', 'api', 'active', NOW()),
  ('policy:installment_pay', 'Policy Installment Pay', 'Record installment payments', 'api', 'active', NOW()),
  ('policy:installment_mark_overdue', 'Policy Installment Mark Overdue', 'Mark installments as overdue', 'api', 'active', NOW()),

  -- Deposit Requirement Permissions
  ('policy:deposit_evaluate', 'Policy Deposit Evaluate', 'Evaluate deposit requirements', 'api', 'active', NOW()),

  -- Remediation Case Permissions
  ('policy:remediation_open', 'Policy Remediation Open', 'Open remediation cases for policy issues', 'api', 'active', NOW()),
  ('policy:remediation_clear', 'Policy Remediation Clear', 'Clear/resolve remediation cases', 'api', 'active', NOW()),
  ('policy:remediation_manage', 'Policy Remediation Manage', 'Manage remediation cases', 'api', 'active', NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  scope = VALUES(scope),
  status = VALUES(status);

-- ============================================================
-- Assign All Policy Permissions to Admin User (ID: 1)
-- ============================================================

INSERT INTO `user_permission` (user_id, permission_id, created_at)
SELECT 1, id, NOW()
FROM `permission`
WHERE code LIKE 'policy:%'
ON DUPLICATE KEY UPDATE user_id = user_id;

-- ============================================================
-- Assign All Policy Permissions to Admin Role (ID: 1)
-- ============================================================

INSERT INTO `role_permission` (role_id, permission_id, created_at)
SELECT 1, id, NOW()
FROM `permission`
WHERE code LIKE 'policy:%'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- ============================================================
-- Verification Queries
-- ============================================================

-- Verify all policy permissions were created
SELECT
  'Policy Permissions Created' AS status,
  COUNT(*) AS total_permissions
FROM `permission`
WHERE code LIKE 'policy:%';

-- List all policy permissions
SELECT
  id,
  code,
  name,
  description,
  scope,
  status
FROM `permission`
WHERE code LIKE 'policy:%'
ORDER BY code;

-- Verify admin user has all policy permissions
SELECT
  'Admin User Policy Permissions' AS status,
  COUNT(*) AS assigned_permissions
FROM `user_permission` up
JOIN `permission` p ON up.permission_id = p.id
WHERE up.user_id = 1
  AND p.code LIKE 'policy:%';

-- Verify admin role has all policy permissions
SELECT
  'Admin Role Policy Permissions' AS status,
  COUNT(*) AS assigned_permissions
FROM `role_permission` rp
JOIN `permission` p ON rp.permission_id = p.id
WHERE rp.role_id = 1
  AND p.code LIKE 'policy:%';

-- ============================================================
-- Permission Summary
-- ============================================================
-- Total Policy Permissions: 19
--
-- Categories:
-- - Admin & Management: 3 permissions
-- - Policy Lifecycle: 4 permissions
-- - Member Management: 2 permissions
-- - Benefit Usage: 3 permissions
-- - Billing & Installments: 3 permissions
-- - Deposit Requirement: 1 permission
-- - Remediation Cases: 3 permissions
--
-- Assignments:
-- - Admin User (ID: 1): All 19 permissions via user_permission
-- - Admin Role (ID: 1): All 19 permissions via role_permission
-- ============================================================
