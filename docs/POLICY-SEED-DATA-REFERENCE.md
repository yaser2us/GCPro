# Policy Pillar Seed Data Reference

**SQL Script:** `scripts/policy-seed-data.sql`

This document describes the test data seeded for the Policy pillar.

---

## 🚀 Quick Start

### Run Seed Script
```bash
mysql -u root -pOdenza@2026 GCPRO < scripts/policy-seed-data.sql
```

### Verify Installation
```bash
mysql -u root -pOdenza@2026 GCPRO -e "SELECT code, name, base_premium FROM policy_package WHERE status='active';"
```

---

## 📦 Data Seeded

### 1. Policy Packages (3 Plans)

| ID | Code | Name | Premium/Year | Max Members | Coverage |
|----|------|------|--------------|-------------|----------|
| 1 | `PKG_BASIC_2024` | Basic Health Plan 2024 | MYR 12,000 | 5 | Essential coverage |
| 2 | `PKG_PREMIUM_2024` | Premium Health Plan 2024 | MYR 24,000 | 8 | Comprehensive coverage |
| 3 | `PKG_FAMILY_2024` | Family Health Plan 2024 | MYR 18,000 | 10 | Family-focused coverage |

**Features:**

**Basic Plan:**
- Outpatient consultations
- Hospitalization
- Emergency treatment
- Annual limit: MYR 50,000
- Deductible: MYR 1,000

**Premium Plan:**
- All Basic features PLUS:
- Dental care
- Vision care
- Annual limit: MYR 150,000
- Deductible: MYR 500

**Family Plan:**
- Outpatient consultations
- Hospitalization
- Emergency treatment
- Maternity care
- Annual limit: MYR 100,000
- Deductible: MYR 750

---

### 2. Age Bands (4 Categories)

| ID | Code | Age Range | Description |
|----|------|-----------|-------------|
| 1 | `CHILD` | 0-17 | Children |
| 2 | `YOUNG_ADULT` | 18-35 | Young Adults |
| 3 | `ADULT` | 36-55 | Adults |
| 4 | `SENIOR` | 56+ | Seniors |

---

### 3. Smoker Profiles (3 Types)

| ID | Code | Description |
|----|------|-------------|
| 1 | `NON_SMOKER` | Non-smoker |
| 2 | `SMOKER` | Active smoker |
| 3 | `FORMER_SMOKER` | Quit smoking >1 year ago |

---

### 4. Policy Package Rates (19 Rate Combinations)

**Basic Plan Monthly Premiums:**

| Age Band | Non-Smoker | Smoker |
|----------|-----------|--------|
| Child (0-17) | MYR 300 | - |
| Young Adult (18-35) | MYR 800 | MYR 1,200 |
| Adult (36-55) | MYR 1,200 | MYR 1,800 |
| Senior (56+) | MYR 1,800 | MYR 2,400 |

**Premium Plan Monthly Premiums:**

| Age Band | Non-Smoker | Smoker |
|----------|-----------|--------|
| Child (0-17) | MYR 600 | - |
| Young Adult (18-35) | MYR 1,600 | MYR 2,400 |
| Adult (36-55) | MYR 2,400 | MYR 3,600 |
| Senior (56+) | MYR 3,600 | MYR 4,800 |

**Family Plan Monthly Premiums:**

| Age Band | Non-Smoker | Smoker |
|----------|-----------|--------|
| Child (0-17) | MYR 450 | - |
| Young Adult (18-35) | MYR 1,200 | MYR 1,800 |
| Adult (36-55) | MYR 1,800 | MYR 2,700 |

---

### 5. Benefit Catalog (10 Benefit Types)

| ID | Code | Name | Category | Default Limit |
|----|------|------|----------|---------------|
| 1 | `OUTPATIENT_CONSULT` | Outpatient Consultation | outpatient | 20 visits |
| 2 | `SPECIALIST_CONSULT` | Specialist Consultation | outpatient | 10 visits |
| 3 | `HOSPITALIZATION` | Hospitalization | inpatient | 365 days |
| 4 | `SURGERY` | Surgical Procedures | inpatient | 5 procedures |
| 5 | `EMERGENCY` | Emergency Treatment | emergency | 50 visits |
| 6 | `DIAGNOSTIC` | Diagnostic Tests | outpatient | 30 tests |
| 7 | `PHARMACY` | Pharmacy | outpatient | 100 prescriptions |
| 8 | `DENTAL` | Dental Care | dental | 4 visits |
| 9 | `VISION` | Vision Care | vision | 2 visits |
| 10 | `MATERNITY` | Maternity Care | maternity | 2 deliveries |

---

### 6. Discount Programs (3 Programs)

| ID | Code | Name | Type | Discount | Valid Period |
|----|------|------|------|----------|--------------|
| 1 | `EARLY_BIRD_2024` | Early Bird Discount 2024 | promotional | 10% | Jan-Mar 2024 |
| 2 | `FAMILY_DISCOUNT` | Family Package Discount | family | 15% | All 2024 |
| 3 | `CORPORATE_DISCOUNT` | Corporate Group Discount | corporate | 20% | All 2024 |

---

### 7. Test Accounts (2 Accounts)

| ID | Type | Status | Purpose |
|----|------|--------|---------|
| 1 | individual | active | Single person policies |
| 2 | family | active | Family policies |

---

### 8. Test Persons (3 Persons)

| ID | Name | Email | DOB | Gender | Role |
|----|------|-------|-----|--------|------|
| 1000 | John Doe | john.doe@test.com | 1985-06-15 | male | Primary holder |
| 1001 | Jane Doe | jane.doe@test.com | 1987-08-20 | female | Spouse |
| 1002 | Junior Doe | junior.doe@test.com | 2015-03-10 | male | Child |

---

## 🧪 Usage in Postman

### Create Policy Request (Working Example)

```json
{
  "account_id": "1",
  "holder_person_id": "1000",
  "package_code": "PKG_BASIC_2024",
  "start_at": "2024-04-01T00:00:00Z",
  "auto_renew": true,
  "members": [
    {
      "person_id": "1000",
      "relationship": "self",
      "is_primary": true
    },
    {
      "person_id": "1001",
      "relationship": "spouse",
      "is_primary": false
    }
  ],
  "idempotency_key": "create-policy-{{$timestamp}}"
}
```

This will now work because:
- ✅ Account 1 exists
- ✅ Person 1000 exists (John Doe)
- ✅ Person 1001 exists (Jane Doe)
- ✅ Package `PKG_BASIC_2024` exists

---

## 📊 Premium Calculation Example

**Scenario:** Family of 3 with Basic Plan
- John Doe (1985, non-smoker, age 38) → Adult band → MYR 1,200/month
- Jane Doe (1987, non-smoker, age 36) → Adult band → MYR 1,200/month
- Junior Doe (2015, age 8) → Child band → MYR 300/month

**Total Monthly Premium:** MYR 2,700
**Annual Premium:** MYR 32,400

**With 15% Family Discount:**
- Discounted Annual: MYR 27,540
- Monthly: MYR 2,295

---

## 🔍 Useful Queries

### Find Package by Code
```sql
SELECT * FROM policy_package
WHERE code = 'PKG_BASIC_2024';
```

### Get All Benefits for a Package
```sql
-- After policy is created, query benefit entitlements
SELECT
  pbe.*,
  bc.name AS benefit_name
FROM policy_benefit_entitlement pbe
JOIN benefit_catalog bc ON pbe.benefit_code = bc.code
WHERE pbe.policy_id = 1;
```

### Calculate Premium for Person
```sql
SELECT
  pp.code AS package,
  TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) AS age,
  CASE
    WHEN TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) <= 17 THEN 'CHILD'
    WHEN TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) BETWEEN 18 AND 35 THEN 'YOUNG_ADULT'
    WHEN TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) BETWEEN 36 AND 55 THEN 'ADULT'
    ELSE 'SENIOR'
  END AS age_band,
  ppr.monthly_premium
FROM person p
CROSS JOIN policy_package pp
JOIN age_band ab ON (
  TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) BETWEEN ab.min_age AND ab.max_age
)
JOIN policy_package_rate ppr ON (
  ppr.policy_package_id = pp.id
  AND ppr.age_band_id = ab.id
  AND ppr.smoker_profile_id = 1  -- Assume non-smoker
  AND ppr.relationship = 'self'
)
WHERE p.id = 1000
  AND pp.code = 'PKG_BASIC_2024';
```

---

## 🗑️ Clean Up (Optional)

If you need to reset the seed data:

```sql
-- Remove test policies (if any)
DELETE FROM policy WHERE account_id IN (1, 2);

-- Remove test data (keeps structure)
DELETE FROM policy_package_rate;
DELETE FROM policy_package WHERE id IN (1, 2, 3);
DELETE FROM benefit_catalog WHERE id BETWEEN 1 AND 10;
DELETE FROM discount_program WHERE id IN (1, 2, 3);
DELETE FROM person WHERE id BETWEEN 1000 AND 1002;
DELETE FROM account WHERE id IN (1, 2);
```

Then re-run the seed script.

---

## 🎯 Testing Scenarios

### Scenario 1: Create Individual Policy
```json
{
  "account_id": "1",
  "holder_person_id": "1000",
  "package_code": "PKG_BASIC_2024",
  "start_at": "2024-04-01T00:00:00Z",
  "auto_renew": true,
  "members": [
    {
      "person_id": "1000",
      "relationship": "self",
      "is_primary": true
    }
  ],
  "idempotency_key": "scenario-1"
}
```

### Scenario 2: Create Family Policy
```json
{
  "account_id": "2",
  "holder_person_id": "1000",
  "package_code": "PKG_FAMILY_2024",
  "start_at": "2024-04-01T00:00:00Z",
  "auto_renew": true,
  "members": [
    {
      "person_id": "1000",
      "relationship": "self",
      "is_primary": true
    },
    {
      "person_id": "1001",
      "relationship": "spouse",
      "is_primary": false
    },
    {
      "person_id": "1002",
      "relationship": "child",
      "is_primary": false
    }
  ],
  "idempotency_key": "scenario-2"
}
```

### Scenario 3: Reserve Benefit Usage
```json
{
  "policy_id": "1",
  "member_id": "1",
  "benefit_code": "OUTPATIENT_CONSULT",
  "reserved_amount": 150.00,
  "currency": "MYR",
  "reserved_qty": 1,
  "idempotency_key": "reserve-benefit-{{$timestamp}}"
}
```

---

## 📚 Related Documentation

- **API Reference:** `docs/POLICY-API-REFERENCE.md`
- **Postman Collection:** `postman/policy-api.postman_collection.json`
- **Permissions:** `docs/POLICY-PERMISSIONS-REFERENCE.md`
- **Specification:** `specs/policy/policy.pillar.v2.yml`

---

**Created:** 2026-03-20
**Status:** ✅ Ready for Testing
