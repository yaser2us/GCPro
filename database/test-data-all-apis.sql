-- ============================================================================
-- GCPro Mission APIs - Complete Test Data
-- ============================================================================
-- This script provides test data for ALL 5 Mission APIs
-- Run this AFTER setting up the database with setup-database.sql
-- ============================================================================

USE GC_PRO;

-- ============================================================================
-- API 1: MissionDefinition.Create
-- ============================================================================
-- No test data needed - this API creates new missions
-- Just test the endpoint directly

-- ============================================================================
-- API 2: MissionDefinition.Publish
-- ============================================================================
-- Test Data: Draft mission ready to be published

INSERT INTO mission_definition (
  code, name, description, cadence, status,
  start_at, end_at, max_per_user, reward_json, created_at, updated_at
) VALUES (
  'PUBLISH_TEST_1',
  'Test Mission for Publish API',
  'This mission is in DRAFT status and ready to be published',
  'one_time',
  'draft',  -- DRAFT status - ready for publishing
  NOW(),
  DATE_ADD(NOW(), INTERVAL 30 DAY),
  1,
  '{"reward_type":"FIXED","amount":50,"currency":"MYR"}',
  NOW(),
  NOW()
);

-- Get the ID for testing
SELECT LAST_INSERT_ID() AS publish_test_mission_id;
-- Use this ID in: POST /v1/missions/definitions/{id}/publish

-- ============================================================================
-- API 3: Mission.Assign
-- ============================================================================
-- Test Data: Published mission ready for user assignment

INSERT INTO mission_definition (
  code, name, description, cadence, status,
  start_at, end_at, max_per_user, reward_json, created_at, updated_at
) VALUES (
  'ASSIGN_TEST_1',
  'Test Mission for Assign API',
  'This mission is PUBLISHED and ready for assignment',
  'one_time',
  'published',  -- PUBLISHED status - ready for assignment
  NOW(),
  DATE_ADD(NOW(), INTERVAL 30 DAY),
  1,
  '{"reward_type":"FIXED","amount":75,"currency":"MYR"}',
  NOW(),
  NOW()
);

-- Get the ID for testing
SELECT LAST_INSERT_ID() AS assign_test_mission_id;
-- Use this ID in: POST /v1/missions/definitions/{id}/assign
-- Use user_id: 999 (or any test user ID)

-- ============================================================================
-- API 4: Mission.Submit
-- ============================================================================
-- Test Data: Assignment ready for submission

-- 1. Create a published mission
INSERT INTO mission_definition (
  code, name, description, cadence, status,
  start_at, end_at, max_per_user, reward_json, created_at, updated_at
) VALUES (
  'SUBMIT_TEST_1',
  'Test Mission for Submit API',
  'This mission has an assignment ready for submission',
  'one_time',
  'published',
  NOW(),
  DATE_ADD(NOW(), INTERVAL 30 DAY),
  1,
  '{"reward_type":"FIXED","amount":100,"currency":"MYR"}',
  NOW(),
  NOW()
);

SET @submit_mission_id = LAST_INSERT_ID();

-- 2. Create an assignment for user 888
INSERT INTO mission_assignment (
  mission_id, user_id, status, assigned_at, created_at, updated_at
) VALUES (
  @submit_mission_id, 888, 'assigned', NOW(), NOW(), NOW()
);

-- Get the assignment ID for testing
SELECT LAST_INSERT_ID() AS submit_test_assignment_id;
-- Use this ID in: POST /v1/missions/assignments/{id}/submit
-- Use X-User-Id: 888 (must match the user_id in assignment)

-- ============================================================================
-- API 5: Mission.ApproveSubmission
-- ============================================================================
-- Test Data: Complete flow with pending submission ready for approval

-- 1. Create a published mission
INSERT INTO mission_definition (
  code, name, description, cadence, status,
  start_at, end_at, max_per_user, reward_json, created_at, updated_at
) VALUES (
  'APPROVE_TEST_1',
  'Test Mission for Approve API',
  'This mission has a pending submission ready for approval',
  'one_time',
  'published',
  NOW(),
  DATE_ADD(NOW(), INTERVAL 30 DAY),
  1,
  '{"reward_type":"FIXED","amount":150,"currency":"MYR"}',
  NOW(),
  NOW()
);

SET @approve_mission_id = LAST_INSERT_ID();

-- 2. Create an assignment for user 777
INSERT INTO mission_assignment (
  mission_id, user_id, status, assigned_at, created_at, updated_at
) VALUES (
  @approve_mission_id, 777, 'submitted', NOW(), NOW(), NOW()
);

SET @approve_assignment_id = LAST_INSERT_ID();

-- 3. Create a pending submission
INSERT INTO mission_submission (
  assignment_id, status, text_content, meta_json, submitted_at, created_at, updated_at
) VALUES (
  @approve_assignment_id,
  'pending',  -- PENDING status - ready for approval
  'I completed all 5 policy applications successfully!',
  '{"notes": "All applications were approved within 24 hours"}',
  NOW(),
  NOW(),
  NOW()
);

-- Get the submission ID for testing
SELECT LAST_INSERT_ID() AS approve_test_submission_id;
-- Use this ID in: POST /v1/missions/submissions/{id}/approve

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- View all test missions created
SELECT id, code, name, status FROM mission_definition
WHERE code LIKE '%TEST%'
ORDER BY created_at DESC;

-- View all test assignments
SELECT a.id, a.mission_id, a.user_id, a.status, d.code
FROM mission_assignment a
JOIN mission_definition d ON a.mission_id = d.id
WHERE d.code LIKE '%TEST%'
ORDER BY a.created_at DESC;

-- View all test submissions
SELECT s.id, s.assignment_id, s.status, s.text_content, a.user_id, d.code
FROM mission_submission s
JOIN mission_assignment a ON s.assignment_id = a.id
JOIN mission_definition d ON a.mission_id = d.id
WHERE d.code LIKE '%TEST%'
ORDER BY s.created_at DESC;

-- ============================================================================
-- QUICK REFERENCE: API Test IDs
-- ============================================================================
-- Copy these queries to get the test IDs quickly:

-- For API 2 (Publish):
SELECT id FROM mission_definition WHERE code = 'PUBLISH_TEST_1';

-- For API 3 (Assign):
SELECT id FROM mission_definition WHERE code = 'ASSIGN_TEST_1';

-- For API 4 (Submit):
SELECT id FROM mission_assignment
WHERE mission_id = (SELECT id FROM mission_definition WHERE code = 'SUBMIT_TEST_1');

-- For API 5 (Approve):
SELECT id FROM mission_submission
WHERE assignment_id = (
  SELECT id FROM mission_assignment
  WHERE mission_id = (SELECT id FROM mission_definition WHERE code = 'APPROVE_TEST_1')
);
