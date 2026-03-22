-- Quick fix: Insert missing resource_ref ID 5
-- Run this before running the survey inserts

USE GCPRO;

-- Insert resource_ref ID 5 (user reference for survey actor)
INSERT INTO `resource_ref` (id, resource_type, resource_id, status, meta_json, created_at, updated_at)
VALUES
  (5, 'user', 1, 'active', JSON_OBJECT('user_name', 'Admin User'), NOW(), NOW())
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  updated_at = NOW();

-- Verify
SELECT 'Resource ref ID 5 created:' AS status, id, resource_type, resource_id FROM resource_ref WHERE id = 5;
