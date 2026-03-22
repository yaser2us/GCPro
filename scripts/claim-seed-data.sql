-- ============================================================
-- Claim Pillar Seed Data
-- Sample data for testing Claim API endpoints
-- Based on: specs/claim/claim.pillar.v2.yml
-- ============================================================

USE GCPRO;

-- ============================================================
-- 1. Test Persons (for claim testing)
-- ============================================================

INSERT INTO `person` (id, type, full_name, dob, gender, status, created_at, updated_at)
VALUES
  (1000, 'individual', 'John Doe', '1985-05-15', 'male', 'active', NOW(), NOW()),
  (1001, 'individual', 'Jane Smith', '1990-08-20', 'female', 'active', NOW(), NOW()),
  (1002, 'individual', 'Bob Johnson', '1978-03-10', 'male', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  updated_at = NOW();

-- ============================================================
-- 2. Test Account
-- ============================================================

INSERT INTO `account` (id, type, status, created_at, updated_at)
VALUES
  (1, 'family', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  updated_at = NOW();

-- ============================================================
-- 3. Test Policy (required for claim validation)
-- ============================================================

INSERT INTO `policy` (id, account_id, holder_person_id, policy_number, status, start_at, created_at, updated_at)
VALUES
  (1, 1, 1000, 'POL-2024-00001', 'active', '2024-01-01 00:00:00', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  updated_at = NOW();

-- ============================================================
-- 4. Test Policy Members (required for claim validation)
-- ============================================================

INSERT INTO `policy_member` (id, policy_id, person_id, role, status, added_at)
VALUES
  (1, 1, 1000, 'holder', 'active', '2024-01-01 00:00:00'),
  (2, 1, 1001, 'dependent', 'active', '2024-01-01 00:00:00'),
  (3, 1, 1002, 'dependent', 'active', '2024-01-01 00:00:00')
ON DUPLICATE KEY UPDATE
  status = VALUES(status);

-- ============================================================
-- 5. Medical Providers (hospitals, clinics)
-- ============================================================

INSERT INTO `medical_provider` (id, provider_code, name, type, panel_status, contact_phone, contact_email, meta_json, created_at)
VALUES
  (100, 'PROV-KL-GEN-001', 'General Hospital KL', 'hospital', 'active', '+60321234567', 'admin@ghkl.my',
   JSON_OBJECT(
    'contact_person', 'Dr. Ahmad bin Hassan',
    'address', JSON_OBJECT(
      'line1', 'Jalan Pahang',
      'city', 'Kuala Lumpur',
      'state', 'Wilayah Persekutuan',
      'country', 'Malaysia',
      'postal_code', '50586'
    ),
    'specialties', JSON_ARRAY('General Surgery', 'Emergency', 'Cardiology'),
    'beds', 500,
    'emergency_24h', true,
    'cashless_enabled', true
   ), NOW()),

  (101, 'PROV-JB-SPEC-001', 'Specialist Medical Centre JB', 'specialist', 'active', '+60712345678', 'info@specjb.my',
   JSON_OBJECT(
    'contact_person', 'Dr. Lee Wei Ming',
    'address', JSON_OBJECT(
      'line1', 'Jalan Tun Abdul Razak',
      'city', 'Johor Bahru',
      'state', 'Johor',
      'country', 'Malaysia',
      'postal_code', '80000'
    ),
    'specialties', JSON_ARRAY('Oncology', 'Neurology', 'Orthopedics'),
    'beds', 250,
    'emergency_24h', true,
    'cashless_enabled', true
   ), NOW()),

  (102, 'PROV-PG-CLINIC-001', 'Island Clinic Penang', 'clinic', 'active', '+60412345678', 'reception@islandclinic.my',
   JSON_OBJECT(
    'contact_person', 'Dr. Siti Nurhaliza',
    'address', JSON_OBJECT(
      'line1', 'Jalan Burma',
      'city', 'George Town',
      'state', 'Penang',
      'country', 'Malaysia',
      'postal_code', '10050'
    ),
    'specialties', JSON_ARRAY('General Practice', 'Pediatrics'),
    'beds', 0,
    'emergency_24h', false,
    'cashless_enabled', false
   ), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  panel_status = VALUES(panel_status);

-- ============================================================
-- 6. Test File Uploads (for document references)
-- ============================================================

INSERT INTO `file_upload` (id, file_key, status, owner_account_id, owner_type, purpose_code, original_filename, content_type, size_bytes, storage_path, uploaded_at)
VALUES
  (1, 'claim-doc-001', 'verified', 1, 'account', 'claim_document', 'medical_report_001.pdf', 'application/pdf', 524288, '/uploads/2024/03/medical_report_001.pdf', NOW()),
  (2, 'claim-doc-002', 'verified', 1, 'account', 'claim_document', 'hospital_invoice_001.pdf', 'application/pdf', 102400, '/uploads/2024/03/hospital_invoice_001.pdf', NOW()),
  (3, 'claim-doc-003', 'verified', 1, 'account', 'claim_document', 'lab_results_001.pdf', 'application/pdf', 204800, '/uploads/2024/03/lab_results_001.pdf', NOW()),
  (4, 'claim-doc-004', 'verified', 1, 'account', 'claim_document', 'xray_scan_001.jpg', 'image/jpeg', 1048576, '/uploads/2024/03/xray_scan_001.jpg', NOW()),
  (5, 'claim-doc-005', 'verified', 1, 'account', 'claim_document', 'prescription_001.pdf', 'application/pdf', 153600, '/uploads/2024/03/prescription_001.pdf', NOW())
ON DUPLICATE KEY UPDATE
  status = VALUES(status);

-- ============================================================
-- 7. Resource References (for underwriting and cross-pillar references)
-- ============================================================

INSERT INTO `resource_ref` (id, resource_type, resource_id, status, meta_json, created_at, updated_at)
VALUES
  (1, 'policy_member', 1, 'active', JSON_OBJECT('member_name', 'John Doe', 'role', 'holder'), NOW(), NOW()),
  (2, 'policy_member', 2, 'active', JSON_OBJECT('member_name', 'Jane Smith', 'role', 'dependent'), NOW(), NOW()),
  (3, 'policy_member', 3, 'active', JSON_OBJECT('member_name', 'Bob Johnson', 'role', 'dependent'), NOW(), NOW()),
  (4, 'policy', 1, 'active', JSON_OBJECT('policy_number', 'POL-2024-00001'), NOW(), NOW()),
  (5, 'user', 1, 'active', JSON_OBJECT('user_name', 'Admin User'), NOW(), NOW())
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  updated_at = NOW();

-- ============================================================
-- 8. Survey System (for underwriting evidence)
-- ============================================================

INSERT INTO `survey` (id, code, name, description, status, created_at, updated_at)
VALUES
  (1, 'MEDICAL_HISTORY_V1', 'Medical History Questionnaire', 'Comprehensive medical history questionnaire for underwriting', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  updated_at = NOW();

INSERT INTO `survey_version` (id, survey_id, version, status, schema_json, published_at, created_at, updated_at)
VALUES
  (1, 1, 'v2.1', 'published',
   JSON_OBJECT(
     'questions', JSON_ARRAY(
       JSON_OBJECT('id', 'q1', 'type', 'text', 'text', 'Do you have any pre-existing medical conditions?'),
       JSON_OBJECT('id', 'q2', 'type', 'text', 'text', 'List any current medications'),
       JSON_OBJECT('id', 'q3', 'type', 'text', 'text', 'Family medical history')
     )
   ),
   NOW(), NOW(), NOW())
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  updated_at = NOW();

INSERT INTO `survey_response` (id, survey_version_id, actor_ref_id, subject_ref_id, status, submitted_at, created_by_user_id, meta_json, created_at, updated_at)
VALUES
  (789, 1, 5, 1, 'submitted', '2024-03-10 14:30:00', 1,
   JSON_OBJECT(
     'completion_date', '2024-03-10',
     'survey_version', 'v2.1',
     'completion_duration_seconds', 1200,
     'answers', JSON_OBJECT(
       'q1', 'Hypertension, managed with medication',
       'q2', 'Amlodipine 5mg daily',
       'q3', 'Father had heart disease at age 60'
     )
   ),
   '2024-03-10 14:00:00', '2024-03-10 14:30:00')
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  updated_at = NOW();

-- ============================================================
-- Verification Queries
-- ============================================================

-- Verify test data
SELECT 'Test Persons Created' AS status, COUNT(*) AS count FROM `person` WHERE id IN (1000, 1001, 1002);
SELECT 'Test Account Created' AS status, COUNT(*) AS count FROM `account` WHERE id = 1;
SELECT 'Test Policy Created' AS status, COUNT(*) AS count FROM `policy` WHERE id = 1;
SELECT 'Test Policy Members Created' AS status, COUNT(*) AS count FROM `policy_member` WHERE policy_id = 1;
SELECT 'Medical Providers Created' AS status, COUNT(*) AS count FROM `medical_provider` WHERE id IN (100, 101, 102);
SELECT 'Test File Uploads Created' AS status, COUNT(*) AS count FROM `file_upload` WHERE id IN (1, 2, 3, 4, 5);
SELECT 'Resource References Created' AS status, COUNT(*) AS count FROM `resource_ref` WHERE id IN (1, 2, 3, 4, 5);
SELECT 'Surveys Created' AS status, COUNT(*) AS count FROM `survey` WHERE id = 1;
SELECT 'Survey Versions Created' AS status, COUNT(*) AS count FROM `survey_version` WHERE id = 1;
SELECT 'Survey Responses Created' AS status, COUNT(*) AS count FROM `survey_response` WHERE id = 789;

-- ============================================================
-- Seed Data Summary
-- ============================================================
-- Test Persons: 3 (IDs: 1000, 1001, 1002)
-- Test Account: 1 (ID: 1)
-- Test Policy: 1 (ID: 1, status: active)
-- Test Policy Members: 3 (all active)
-- Medical Providers: 3 (IDs: 100, 101, 102)
-- File Uploads: 5 (IDs: 1-5)
-- Resource References: 5 (IDs: 1-5)
--   - ID 1: policy_member #1 (John Doe, holder)
--   - ID 2: policy_member #2 (Jane Smith, dependent)
--   - ID 3: policy_member #3 (Bob Johnson, dependent)
--   - ID 4: policy #1 (POL-2024-00001)
--   - ID 5: user #1 (Admin User)
-- Survey System:
--   - Survey: 1 (Medical History Questionnaire)
--   - Survey Version: 1 (v2.1, published)
--   - Survey Response: 789 (submitted, completed by John Doe)
--
-- Ready for Postman Collection Testing:
-- - Claim submission with existing policy members
-- - Medical case creation with valid providers
-- - Document uploads with valid file references
-- - Underwriting case creation with valid resource references
-- - Underwriting evidence with valid survey responses
-- ============================================================
