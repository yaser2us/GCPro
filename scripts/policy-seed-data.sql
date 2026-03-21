-- ============================================================
-- Policy Pillar Seed Data
-- Sample data for testing Policy API endpoints
-- Based on: specs/policy/policy.pillar.v2.yml
-- ============================================================

USE GCPRO;

-- ============================================================
-- 1. Policy Packages (Package Tiers)
-- ============================================================
-- Note: policy_package defines deposit capacity and monthly caps
-- Not traditional insurance features - those are in benefit_catalog

INSERT INTO `policy_package` (id, code, name, monthly_max_cap_default, deposit_capacity_multiplier, min_deposit_pct, warning_pct, urgent_pct, meta, created_at, updated_at)
VALUES
  (1, 'PKG_BASIC_2024', 'Basic Health Plan 2024',
   5000.00,   -- monthly_max_cap_default (MYR 5,000/month)
   2.000,     -- deposit_capacity_multiplier (2x multiplier)
   0.500,     -- min_deposit_pct (50% minimum)
   0.600,     -- warning_pct (60% warning threshold)
   0.500,     -- urgent_pct (50% urgent threshold)
   JSON_OBJECT(
    'description', 'Basic health insurance with essential coverage',
    'category', 'health',
    'max_members', 5,
    'min_members', 1,
    'features', JSON_ARRAY('Outpatient', 'Hospitalization', 'Emergency'),
    'annual_limit', 50000,
    'deductible', 1000
  ), NOW(), NOW()),

  (2, 'PKG_PREMIUM_2024', 'Premium Health Plan 2024',
   12000.00,  -- monthly_max_cap_default (MYR 12,000/month)
   3.000,     -- deposit_capacity_multiplier (3x multiplier)
   0.400,     -- min_deposit_pct (40% minimum)
   0.700,     -- warning_pct (70% warning threshold)
   0.400,     -- urgent_pct (40% urgent threshold)
   JSON_OBJECT(
    'description', 'Premium health insurance with comprehensive coverage',
    'category', 'health',
    'max_members', 8,
    'min_members', 1,
    'features', JSON_ARRAY('Outpatient', 'Hospitalization', 'Emergency', 'Dental', 'Vision'),
    'annual_limit', 150000,
    'deductible', 500
  ), NOW(), NOW()),

  (3, 'PKG_FAMILY_2024', 'Family Health Plan 2024',
   8000.00,   -- monthly_max_cap_default (MYR 8,000/month)
   2.500,     -- deposit_capacity_multiplier (2.5x multiplier)
   0.450,     -- min_deposit_pct (45% minimum)
   0.650,     -- warning_pct (65% warning threshold)
   0.450,     -- urgent_pct (45% urgent threshold)
   JSON_OBJECT(
    'description', 'Affordable family health insurance',
    'category', 'health',
    'max_members', 10,
    'min_members', 2,
    'features', JSON_ARRAY('Outpatient', 'Hospitalization', 'Emergency', 'Maternity'),
    'annual_limit', 100000,
    'deductible', 750
  ), NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  monthly_max_cap_default = VALUES(monthly_max_cap_default),
  deposit_capacity_multiplier = VALUES(deposit_capacity_multiplier),
  min_deposit_pct = VALUES(min_deposit_pct),
  warning_pct = VALUES(warning_pct),
  urgent_pct = VALUES(urgent_pct),
  meta = VALUES(meta),
  updated_at = NOW();

-- ============================================================
-- 2. Age Bands (for rate calculation)
-- ============================================================

INSERT INTO `age_band` (id, code, min_age, max_age, age_factor, created_at)
VALUES
  (1, 'CHILD', 0, 17, 0.600, NOW()),        -- Children: 60% factor
  (2, 'YOUNG_ADULT', 18, 35, 1.000, NOW()), -- Young Adults: 100% (baseline)
  (3, 'ADULT', 36, 55, 1.500, NOW()),       -- Adults: 150% factor
  (4, 'SENIOR', 56, 150, 2.250, NOW())      -- Seniors: 225% factor
ON DUPLICATE KEY UPDATE
  age_factor = VALUES(age_factor);

-- ============================================================
-- 3. Smoker Profiles (for rate calculation)
-- ============================================================

INSERT INTO `smoker_profile` (id, code, smoker_factor, loading_pct, created_at)
VALUES
  (1, 'NON_SMOKER', 1.000, 0.000, NOW()),       -- Non-smoker: 100% baseline, 0% loading
  (2, 'SMOKER', 1.500, 0.500, NOW()),           -- Smoker: 150% factor, 50% loading
  (3, 'FORMER_SMOKER', 1.200, 0.200, NOW())     -- Former: 120% factor, 20% loading
ON DUPLICATE KEY UPDATE
  smoker_factor = VALUES(smoker_factor),
  loading_pct = VALUES(loading_pct);

-- ============================================================
-- 4. Policy Package Rates
-- ============================================================
-- Note: Rates define annual_fee_amount and monthly_max_cap by age/smoker profile

INSERT INTO `policy_package_rate` (package_id, age_band_id, smoker_profile_id, annual_fee_amount, monthly_max_cap, weightage_factor, rate_version, effective_from, effective_to, created_at)
VALUES
  -- Basic Plan Rates (PKG_BASIC_2024)
  -- Children (0-17)
  (1, 1, 1, 3600.00, 5000.00, 0.6000, 'v2024', '2024-01-01', NULL, NOW()),

  -- Young Adult (18-35)
  (1, 2, 1, 9600.00, 5000.00, 1.0000, 'v2024', '2024-01-01', NULL, NOW()),   -- Non-smoker
  (1, 2, 2, 14400.00, 5000.00, 1.5000, 'v2024', '2024-01-01', NULL, NOW()),  -- Smoker

  -- Adult (36-55)
  (1, 3, 1, 14400.00, 5000.00, 1.5000, 'v2024', '2024-01-01', NULL, NOW()),  -- Non-smoker
  (1, 3, 2, 21600.00, 5000.00, 2.2500, 'v2024', '2024-01-01', NULL, NOW()),  -- Smoker

  -- Senior (56+)
  (1, 4, 1, 21600.00, 5000.00, 2.2500, 'v2024', '2024-01-01', NULL, NOW()),  -- Non-smoker
  (1, 4, 2, 28800.00, 5000.00, 3.0000, 'v2024', '2024-01-01', NULL, NOW()),  -- Smoker

  -- Premium Plan Rates (PKG_PREMIUM_2024)
  -- Children (0-17)
  (2, 1, 1, 7200.00, 12000.00, 0.6000, 'v2024', '2024-01-01', NULL, NOW()),

  -- Young Adult (18-35)
  (2, 2, 1, 19200.00, 12000.00, 1.0000, 'v2024', '2024-01-01', NULL, NOW()),  -- Non-smoker
  (2, 2, 2, 28800.00, 12000.00, 1.5000, 'v2024', '2024-01-01', NULL, NOW()),  -- Smoker

  -- Adult (36-55)
  (2, 3, 1, 28800.00, 12000.00, 1.5000, 'v2024', '2024-01-01', NULL, NOW()),  -- Non-smoker
  (2, 3, 2, 43200.00, 12000.00, 2.2500, 'v2024', '2024-01-01', NULL, NOW()),  -- Smoker

  -- Senior (56+)
  (2, 4, 1, 43200.00, 12000.00, 2.2500, 'v2024', '2024-01-01', NULL, NOW()),  -- Non-smoker
  (2, 4, 2, 57600.00, 12000.00, 3.0000, 'v2024', '2024-01-01', NULL, NOW()),  -- Smoker

  -- Family Plan Rates (PKG_FAMILY_2024)
  -- Children (0-17)
  (3, 1, 1, 5400.00, 8000.00, 0.6000, 'v2024', '2024-01-01', NULL, NOW()),

  -- Young Adult (18-35)
  (3, 2, 1, 14400.00, 8000.00, 1.0000, 'v2024', '2024-01-01', NULL, NOW()),   -- Non-smoker
  (3, 2, 2, 21600.00, 8000.00, 1.5000, 'v2024', '2024-01-01', NULL, NOW()),   -- Smoker

  -- Adult (36-55)
  (3, 3, 1, 21600.00, 8000.00, 1.5000, 'v2024', '2024-01-01', NULL, NOW()),   -- Non-smoker
  (3, 3, 2, 32400.00, 8000.00, 2.2500, 'v2024', '2024-01-01', NULL, NOW())    -- Smoker

ON DUPLICATE KEY UPDATE
  annual_fee_amount = VALUES(annual_fee_amount),
  monthly_max_cap = VALUES(monthly_max_cap),
  weightage_factor = VALUES(weightage_factor);

-- ============================================================
-- 5. Benefit Catalog (benefit package container)
-- ============================================================

INSERT INTO `benefit_catalog` (id, code, name, status, version, effective_from, meta_json, created_at)
VALUES
  (1, 'STANDARD_2024', 'Standard Benefit Package 2024', 'active', 'v2024', '2024-01-01', JSON_OBJECT(
    'description', 'Standard health insurance benefits for 2024',
    'target_market', 'general'
  ), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  status = VALUES(status);

-- ============================================================
-- 5b. Benefit Catalog Items (actual benefits)
-- ============================================================

INSERT INTO `benefit_catalog_item` (catalog_id, item_code, name, category, limit_type, limit_amount, limit_count, calculation_mode, status, created_at)
VALUES
  -- Outpatient benefits
  (1, 'OUTPATIENT_CONSULT', 'Outpatient Consultation', 'outpatient', 'per_visit', 150.00, 20, 'reimburse', 'active', NOW()),
  (1, 'SPECIALIST_CONSULT', 'Specialist Consultation', 'outpatient', 'per_visit', 300.00, 10, 'reimburse', 'active', NOW()),
  (1, 'DIAGNOSTIC', 'Diagnostic Tests', 'outpatient', 'per_year', 3000.00, 30, 'reimburse', 'active', NOW()),
  (1, 'PHARMACY', 'Pharmacy', 'outpatient', 'per_prescription', 200.00, 100, 'reimburse', 'active', NOW()),

  -- Inpatient benefits
  (1, 'HOSPITALIZATION', 'Hospitalization', 'inpatient', 'per_day', 500.00, 365, 'reimburse', 'active', NOW()),
  (1, 'SURGERY', 'Surgical Procedures', 'inpatient', 'per_procedure', 20000.00, 5, 'reimburse', 'active', NOW()),

  -- Emergency
  (1, 'EMERGENCY', 'Emergency Treatment', 'emergency', 'per_visit', 1000.00, 50, 'reimburse', 'active', NOW()),

  -- Other
  (1, 'DENTAL', 'Dental Care', 'dental', 'per_year', 2000.00, 4, 'reimburse', 'active', NOW()),
  (1, 'VISION', 'Vision Care', 'vision', 'per_year', 500.00, 2, 'reimburse', 'active', NOW()),
  (1, 'MATERNITY', 'Maternity Care', 'maternity', 'per_delivery', 15000.00, 2, 'reimburse', 'active', NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  limit_amount = VALUES(limit_amount),
  limit_count = VALUES(limit_count);

-- ============================================================
-- 6. Discount Programs (optional discounts)
-- ============================================================

INSERT INTO `discount_program` (id, code, name, type, status, discount_percentage, valid_from, valid_until, created_at)
VALUES
  (1, 'EARLY_BIRD_2024', 'Early Bird Discount 2024', 'promotional', 'active', 10.00, '2024-01-01', '2024-03-31', NOW()),
  (2, 'FAMILY_DISCOUNT', 'Family Package Discount', 'family', 'active', 15.00, '2024-01-01', '2024-12-31', NOW()),
  (3, 'CORPORATE_DISCOUNT', 'Corporate Group Discount', 'corporate', 'active', 20.00, '2024-01-01', '2024-12-31', NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  status = VALUES(status);

-- ============================================================
-- 7. Test Accounts & Persons (for testing)
-- ============================================================

-- Test Account 1
INSERT INTO `account` (id, type, status, created_at, updated_at)
VALUES (1, 'individual', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE status = 'active';

-- Test Account 2
INSERT INTO `account` (id, type, status, created_at, updated_at)
VALUES (2, 'family', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE status = 'active';

-- Test Persons
INSERT INTO `person` (id, primary_user_id, full_name, email, date_of_birth, gender, status, created_at, updated_at)
VALUES
  (1000, 1, 'John Doe', 'john.doe@test.com', '1985-06-15', 'male', 'active', NOW(), NOW()),
  (1001, NULL, 'Jane Doe', 'jane.doe@test.com', '1987-08-20', 'female', 'active', NOW(), NOW()),
  (1002, NULL, 'Junior Doe', 'junior.doe@test.com', '2015-03-10', 'male', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  email = VALUES(email);

-- ============================================================
-- Verification Queries
-- ============================================================

-- Verify policy packages
SELECT
  'Policy Packages Created' AS status,
  COUNT(*) AS total_packages
FROM `policy_package`
WHERE status = 'active';

-- List policy packages
SELECT
  id,
  code,
  name,
  category,
  base_premium,
  currency,
  max_members
FROM `policy_package`
WHERE status = 'active'
ORDER BY base_premium;

-- Verify benefit catalog
SELECT
  'Benefit Catalogs' AS status,
  COUNT(*) AS total_catalogs
FROM `benefit_catalog`;

-- Verify benefit catalog items
SELECT
  'Benefit Catalog Items' AS status,
  COUNT(*) AS total_items
FROM `benefit_catalog_item`;

-- Verify package rates
SELECT
  'Policy Package Rates' AS status,
  COUNT(*) AS total_rates
FROM `policy_package_rate`;

-- Sample rate lookup (Basic Plan, Young Adult, Non-Smoker)
SELECT
  pp.code AS package_code,
  pp.name AS package_name,
  ab.code AS age_band,
  sp.code AS smoker_profile,
  ppr.relationship,
  ppr.monthly_premium,
  ppr.currency
FROM `policy_package_rate` ppr
JOIN `policy_package` pp ON ppr.policy_package_id = pp.id
JOIN `age_band` ab ON ppr.age_band_id = ab.id
JOIN `smoker_profile` sp ON ppr.smoker_profile_id = sp.id
WHERE pp.code = 'PKG_BASIC_2024'
  AND ab.code = 'YOUNG_ADULT'
  AND sp.code = 'NON_SMOKER'
  AND ppr.relationship = 'self';

-- ============================================================
-- Seed Data Summary
-- ============================================================
-- Policy Packages: 3 (Basic, Premium, Family)
-- Age Bands: 4 (Child, Young Adult, Adult, Senior) with age_factor
-- Smoker Profiles: 3 (Non-smoker, Smoker, Former) with smoker_factor & loading_pct
-- Package Rates: 19 rate combinations (annual_fee_amount + monthly_max_cap)
-- Benefit Catalog: 1 catalog (STANDARD_2024)
-- Benefit Catalog Items: 10 benefit types
-- Discount Programs: 3 programs
-- Test Accounts: 2 accounts
-- Test Persons: 3 persons (1 primary holder + 2 dependents)
-- ============================================================
