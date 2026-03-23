-- ============================================================
-- M7 — Terms Acceptance Seed Data
-- Seeds guideline_document and guideline_version records
-- for Terms & Conditions and Privacy Policy.
--
-- Safe to re-run: ON DUPLICATE KEY UPDATE is idempotent.
-- Based on: specs/foundation/foundation.pillar.v2.yml
-- ============================================================

USE GCPRO;

-- ============================================================
-- 1. Guideline Documents
-- ============================================================

INSERT INTO `guideline_document` (code, name, status, scope_type, scope_ref_type, scope_ref_id, created_at, updated_at)
VALUES
  ('gc:terms',   'GC Terms & Conditions', 'active', 'global', NULL, NULL, NOW(), NOW()),
  ('gc:privacy', 'GC Privacy Policy',     'active', 'global', NULL, NULL, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name       = VALUES(name),
  status     = VALUES(status),
  updated_at = NOW();

-- ============================================================
-- 2. Guideline Versions (v1.0, English, published)
-- ============================================================

INSERT INTO `guideline_version` (
  document_id, version_code, locale, status,
  effective_from, effective_to,
  content_type, content_text, content_url,
  file_ref_type, file_ref_id,
  created_at, updated_at
)
SELECT
  gd.id,
  '1.0',
  'en',
  'published',
  NOW(),
  NULL,
  'html',
  NULL,
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
FROM `guideline_document` gd
WHERE gd.code IN ('gc:terms', 'gc:privacy')
ON DUPLICATE KEY UPDATE
  status         = VALUES(status),
  effective_from = COALESCE(`guideline_version`.effective_from, VALUES(effective_from)),
  updated_at     = NOW();

-- ============================================================
-- Verification Queries
-- ============================================================

SELECT
  gd.code,
  gd.name        AS document_name,
  gv.version_code,
  gv.locale,
  gv.status,
  gv.effective_from
FROM `guideline_version` gv
JOIN `guideline_document` gd ON gv.document_id = gd.id
WHERE gd.code IN ('gc:terms', 'gc:privacy')
ORDER BY gd.code, gv.version_code;

-- ============================================================
-- Seed Summary
-- ============================================================
-- Documents seeded:
--   gc:terms   → GC Terms & Conditions
--   gc:privacy → GC Privacy Policy
--
-- Versions seeded:
--   gc:terms   / 1.0 / en / published
--   gc:privacy / 1.0 / en / published
--
-- Note: content_text / content_url are left NULL here.
-- Update them via POST /v1/foundation/guideline-versions/:id
-- or direct DB update with actual T&C/Privacy Policy text.
-- ============================================================
