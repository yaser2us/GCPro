-- ============================================================
-- Claim Pillar Permissions Setup
-- Adds all required permissions for the Claim module
-- Based on: specs/claim/claim.pillar.v2.yml
-- ============================================================

USE GCPRO;

-- ============================================================
-- Insert Claim Permissions
-- ============================================================

INSERT INTO `permission` (code, name, description, scope, status, created_at)
VALUES
  -- Admin & Management Permissions
  ('claim:admin', 'Claim Admin', 'Full administrative access to claim management', 'api', 'active', NOW()),
  ('claim:manage', 'Claim Manage', 'Manage claims and related data', 'api', 'active', NOW()),
  ('claim:read', 'Claim Read', 'Read-only access to claim data', 'api', 'active', NOW()),

  -- Claim Lifecycle Permissions
  ('claim:submit', 'Claim Submit', 'Submit new insurance claims', 'api', 'active', NOW()),
  ('claim:assign-reviewer', 'Claim Assign Reviewer', 'Assign reviewers to claims', 'api', 'active', NOW()),
  ('claim:approve', 'Claim Approve', 'Approve submitted claims', 'api', 'active', NOW()),
  ('claim:reject', 'Claim Reject', 'Reject submitted claims', 'api', 'active', NOW()),
  ('claim:settle', 'Claim Settle', 'Settle approved claims and trigger payouts', 'api', 'active', NOW()),

  -- Document Management Permissions
  ('claim:documents:add', 'Claim Add Document', 'Add supporting documents to claims', 'api', 'active', NOW()),

  -- Fraud Detection Permissions
  ('claim:fraud-signal:record', 'Claim Record Fraud Signal', 'Record fraud detection signals', 'api', 'active', NOW()),

  -- Guarantee Letter Permissions
  ('guarantee-letter:issue', 'Guarantee Letter Issue', 'Issue guarantee letters for pre-approved treatment', 'api', 'active', NOW()),
  ('guarantee-letter:cancel', 'Guarantee Letter Cancel', 'Cancel issued guarantee letters', 'api', 'active', NOW()),

  -- Medical Case Permissions
  ('medical-case:create', 'Medical Case Create', 'Create medical cases for treatment tracking', 'api', 'active', NOW()),
  ('medical-case:update', 'Medical Case Update', 'Update medical case status and information', 'api', 'active', NOW()),

  -- Medical Underwriting Permissions
  ('underwriting:record-decision', 'Underwriting Record Decision', 'Record medical underwriting decisions with terms', 'api', 'active', NOW()),
  ('underwriting:add-evidence', 'Underwriting Add Evidence', 'Add supporting evidence to underwriting cases', 'api', 'active', NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  scope = VALUES(scope),
  status = VALUES(status);

-- ============================================================
-- Assign All Claim Permissions to Admin User (ID: 1)
-- ============================================================

INSERT INTO `user_permission` (user_id, permission_id, created_at)
SELECT 1, id, NOW()
FROM `permission`
WHERE code LIKE 'claim:%'
   OR code LIKE 'guarantee-letter:%'
   OR code LIKE 'medical-case:%'
   OR code LIKE 'underwriting:%'
ON DUPLICATE KEY UPDATE user_id = user_id;

-- ============================================================
-- Assign All Claim Permissions to Admin Role (ID: 1)
-- ============================================================

INSERT INTO `role_permission` (role_id, permission_id, created_at)
SELECT 1, id, NOW()
FROM `permission`
WHERE code LIKE 'claim:%'
   OR code LIKE 'guarantee-letter:%'
   OR code LIKE 'medical-case:%'
   OR code LIKE 'underwriting:%'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- ============================================================
-- Verification Queries
-- ============================================================

-- Verify all claim permissions were created
SELECT
  'Claim Permissions Created' AS status,
  COUNT(*) AS total_permissions
FROM `permission`
WHERE code LIKE 'claim:%'
   OR code LIKE 'guarantee-letter:%'
   OR code LIKE 'medical-case:%'
   OR code LIKE 'underwriting:%';

-- List all claim permissions
SELECT
  id,
  code,
  name,
  description,
  scope,
  status
FROM `permission`
WHERE code LIKE 'claim:%'
   OR code LIKE 'guarantee-letter:%'
   OR code LIKE 'medical-case:%'
   OR code LIKE 'underwriting:%'
ORDER BY code;

-- Verify admin user has all claim permissions
SELECT
  'Admin User Claim Permissions' AS status,
  COUNT(*) AS assigned_permissions
FROM `user_permission` up
JOIN `permission` p ON up.permission_id = p.id
WHERE up.user_id = 1
  AND (p.code LIKE 'claim:%'
    OR p.code LIKE 'guarantee-letter:%'
    OR p.code LIKE 'medical-case:%'
    OR p.code LIKE 'underwriting:%');

-- Verify admin role has all claim permissions
SELECT
  'Admin Role Claim Permissions' AS status,
  COUNT(*) AS assigned_permissions
FROM `role_permission` rp
JOIN `permission` p ON rp.permission_id = p.id
WHERE rp.role_id = 1
  AND (p.code LIKE 'claim:%'
    OR p.code LIKE 'guarantee-letter:%'
    OR p.code LIKE 'medical-case:%'
    OR p.code LIKE 'underwriting:%');

-- ============================================================
-- Permission Summary
-- ============================================================
-- Total Claim Permissions: 16
--
-- Categories:
-- - Admin & Management: 3 permissions
-- - Claim Lifecycle: 5 permissions
-- - Document Management: 1 permission
-- - Fraud Detection: 1 permission
-- - Guarantee Letter: 2 permissions
-- - Medical Case: 2 permissions
-- - Medical Underwriting: 2 permissions
--
-- Assignments:
-- - Admin User (ID: 1): All 16 permissions via user_permission
-- - Admin Role (ID: 1): All 16 permissions via role_permission
-- ============================================================
