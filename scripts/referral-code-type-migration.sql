-- ============================================================
-- C2 — Invitation Code Gating Migration
-- Adds code_type column to referral_code table.
-- Existing rows default to 'referral'.
-- New 'invite' type is used for registration gating.
--
-- Safe to re-run: IF NOT EXISTS guards the ALTER.
-- Based on: api-build-plan.md C2
-- ============================================================

USE GCPRO;

-- ============================================================
-- 1. Add code_type column (skip if already exists)
-- ============================================================

ALTER TABLE `referral_code`
  ADD COLUMN IF NOT EXISTS `code_type` VARCHAR(16) NOT NULL DEFAULT 'referral'
    COMMENT 'referral = normal referral code; invite = registration invite code';

-- ============================================================
-- 2. Seed one admin-issued invite code for testing
--    Owner = admin user (ID: 1), program_id = 1
--    Run after bootstrap-admin.sql has seeded the admin user.
-- ============================================================

INSERT INTO `referral_code` (program_id, owner_user_id, code, code_type, status, created_at, updated_at)
VALUES (1, 1, 'GCPRO-INVITE-2026', 'invite', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  code_type  = VALUES(code_type),
  status     = VALUES(status),
  updated_at = NOW();

-- ============================================================
-- Verification
-- ============================================================

SELECT id, code, code_type, status, owner_user_id
FROM `referral_code`
WHERE code_type = 'invite'
ORDER BY created_at DESC;

-- ============================================================
-- Migration Summary
-- ============================================================
-- Added: referral_code.code_type VARCHAR(16) NOT NULL DEFAULT 'referral'
-- Seeded: 1 invite code  → GCPRO-INVITE-2026 (owner: admin, status: active)
--
-- Values:
--   'referral' → standard referral/affiliate code (existing behaviour)
--   'invite'   → registration gate — must be presented when calling
--                POST /v1/identity/registration-tokens (purpose='registration')
-- ============================================================
