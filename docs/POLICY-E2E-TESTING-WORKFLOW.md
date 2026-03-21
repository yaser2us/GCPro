# Policy Pillar - End-to-End Testing Workflow

Complete workflow to test Policy pillar from onboarding to policy creation, including outbox pattern verification.

**Date**: 2024-04-01
**Collection**: `postman/policy-api.postman_collection.json`

---

## Prerequisites

### 1. Seed Readonly Dependencies

These tables are from other pillars but required by Policy:

```sql
USE GCPRO;

-- Age Bands
INSERT INTO `age_band` (id, code, min_age, max_age, age_factor, created_at)
VALUES
  (1, 'CHILD', 0, 17, 0.600, NOW()),
  (2, 'YOUNG_ADULT', 18, 35, 1.000, NOW()),
  (3, 'ADULT', 36, 55, 1.500, NOW()),
  (4, 'SENIOR', 56, 150, 2.250, NOW())
ON DUPLICATE KEY UPDATE age_factor = VALUES(age_factor);

-- Smoker Profiles
INSERT INTO `smoker_profile` (id, code, smoker_factor, loading_pct, created_at)
VALUES
  (1, 'NON_SMOKER', 1.000, 0.000, NOW()),
  (2, 'SMOKER', 1.500, 0.500, NOW()),
  (3, 'FORMER_SMOKER', 1.200, 0.200, NOW())
ON DUPLICATE KEY UPDATE smoker_factor = VALUES(smoker_factor);

-- Benefit Catalog
INSERT INTO `benefit_catalog` (id, code, name, status, version, effective_from, meta_json, created_at)
VALUES
  (1, 'STANDARD_2024', 'Standard Benefit Package 2024', 'active', 'v2024', '2024-01-01',
   JSON_OBJECT('description', 'Standard health insurance benefits for 2024'), NOW())
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- Benefit Catalog Items
INSERT INTO `benefit_catalog_item` (catalog_id, item_code, name, category, limit_type, limit_amount, limit_count, calculation_mode, status, created_at)
VALUES
  (1, 'OUTPATIENT_CONSULT', 'Outpatient Consultation', 'outpatient', 'per_visit', 150.00, 20, 'reimburse', 'active', NOW()),
  (1, 'SPECIALIST_CONSULT', 'Specialist Consultation', 'outpatient', 'per_visit', 300.00, 10, 'reimburse', 'active', NOW()),
  (1, 'DIAGNOSTIC', 'Diagnostic Tests', 'outpatient', 'per_year', 3000.00, 30, 'reimburse', 'active', NOW()),
  (1, 'PHARMACY', 'Pharmacy', 'outpatient', 'per_prescription', 200.00, 100, 'reimburse', 'active', NOW()),
  (1, 'HOSPITALIZATION', 'Hospitalization', 'inpatient', 'per_day', 500.00, 365, 'reimburse', 'active', NOW()),
  (1, 'SURGERY', 'Surgical Procedures', 'inpatient', 'per_procedure', 20000.00, 5, 'reimburse', 'active', NOW()),
  (1, 'EMERGENCY', 'Emergency Treatment', 'emergency', 'per_visit', 1000.00, 50, 'reimburse', 'active', NOW())
ON DUPLICATE KEY UPDATE limit_amount = VALUES(limit_amount);

-- Test Account & Persons
INSERT INTO `account` (id, type, status, created_at, updated_at)
VALUES (1, 'individual', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE status = 'active';

INSERT INTO `person` (id, primary_user_id, full_name, email, date_of_birth, gender, status, created_at, updated_at)
VALUES
  (1000, 1, 'John Doe', 'john.doe@test.com', '1985-06-15', 'male', 'active', NOW(), NOW()),
  (1001, NULL, 'Jane Doe', 'jane.doe@test.com', '1987-08-20', 'female', 'active', NOW(), NOW()),
  (1002, NULL, 'Junior Doe', 'junior.doe@test.com', '2015-03-10', 'male', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);
```

**Verify Prerequisites:**
```sql
SELECT 'Age Bands' as item, COUNT(*) as count FROM age_band
UNION ALL
SELECT 'Smoker Profiles', COUNT(*) FROM smoker_profile
UNION ALL
SELECT 'Benefit Catalogs', COUNT(*) FROM benefit_catalog
UNION ALL
SELECT 'Benefit Items', COUNT(*) FROM benefit_catalog_item
UNION ALL
SELECT 'Test Accounts', COUNT(*) FROM account WHERE id = 1
UNION ALL
SELECT 'Test Persons', COUNT(*) FROM person WHERE id BETWEEN 1000 AND 1002;
```

Expected: All counts should be > 0

---

## Testing Workflow

### Phase 0: Setup Master Data (Admin)

#### Step 0.1: Create Policy Package

**Postman Request:** `0.1 Create Policy Package`

**Expected Response:**
```json
{
  "package_id": 1,
  "code": "PKG_BASIC_2024",
  "name": "Basic Health Plan 2024"
}
```

**Verify in Database:**
```sql
SELECT
  id, code, name,
  monthly_max_cap_default,
  deposit_capacity_multiplier,
  min_deposit_pct
FROM policy_package
WHERE code = 'PKG_BASIC_2024';
```

Expected: 1 row with package details

---

#### Step 0.2: Create Package Rate

**Postman Request:** `0.2 Create Package Rate`

**Expected Response:**
```json
{
  "rate_id": 1,
  "package_id": 1,
  "age_band_id": 2,
  "smoker_profile_id": 1
}
```

**Verify in Database:**
```sql
SELECT
  ppr.id,
  pp.code as package_code,
  ab.code as age_band,
  sp.code as smoker_profile,
  ppr.annual_fee_amount,
  ppr.monthly_max_cap
FROM policy_package_rate ppr
JOIN policy_package pp ON ppr.package_id = pp.id
JOIN age_band ab ON ppr.age_band_id = ab.id
JOIN smoker_profile sp ON ppr.smoker_profile_id = sp.id
WHERE pp.code = 'PKG_BASIC_2024';
```

Expected: 1 row showing the rate configuration

---

### Phase 1: Policy Creation & Activation

#### Step 1.1: Create Policy

**Postman Request:** `1.1 Create Policy`

**Expected Response:**
```json
{
  "policy_id": 1,
  "policy_number": "POL-1234567890-ABC123XYZ",
  "status": "pending"
}
```

**Verify Policy Created:**
```sql
SELECT
  id, policy_number, account_id, holder_person_id,
  status, package_code_snapshot, auto_renew, start_at
FROM policy
WHERE id = 1;
```

Expected: 1 row, status = 'pending'

**Verify Policy Member (Holder):**
```sql
SELECT
  id, policy_id, person_id, role, status
FROM policy_member
WHERE policy_id = 1 AND role = 'holder';
```

Expected: 1 row, person_id = 1000, status = 'active'

**Verify Benefit Entitlement Created:**
```sql
SELECT
  id, policy_id, catalog_code_snapshot,
  catalog_version_snapshot, level_code_snapshot,
  status,
  JSON_PRETTY(entitlement_json) as benefits
FROM policy_benefit_entitlement
WHERE policy_id = 1;
```

Expected: 1 row with JSON containing all 7 benefits from catalog

**Verify Deposit Requirement Created:**
```sql
SELECT
  id, policy_id, monthly_max_cap,
  deposit_capacity_amount, min_required_amount,
  warning_amount, urgent_amount, status
FROM policy_deposit_requirement
WHERE policy_id = 1;
```

Expected: 1 row with calculated amounts based on package settings

**Verify Policy Status Event:**
```sql
SELECT
  id, policy_id, event_type, from_status, to_status,
  trigger_code, actor_type, created_at
FROM policy_status_event
WHERE policy_id = 1
ORDER BY id DESC
LIMIT 5;
```

Expected: 1 event - POLICY_CREATED, to_status = 'pending'

**Verify Outbox Event:**
```sql
SELECT
  id, event_type, aggregate_type, aggregate_id,
  status, occurred_at,
  JSON_PRETTY(payload_json) as payload
FROM outbox_event
WHERE aggregate_type = 'POLICY'
  AND JSON_EXTRACT(payload_json, '$.policy_id') = 1
ORDER BY id DESC
LIMIT 1;
```

Expected: 1 event - event_type = 'POLICY_CREATED', status = 'new'

---

#### Step 1.2: Activate Policy

**Postman Request:** `1.2 Activate Policy`

**Note:** Update `{{policy_id}}` variable with the policy_id from Step 1.1

**Expected Response:**
```json
{
  "policy_id": "1",
  "status": "active"
}
```

**Verify Policy Status Updated:**
```sql
SELECT
  id, policy_number, status, start_at
FROM policy
WHERE id = 1;
```

Expected: status = 'active', start_at = current timestamp

**Verify Status Event:**
```sql
SELECT
  id, event_type, from_status, to_status, trigger_code
FROM policy_status_event
WHERE policy_id = 1
ORDER BY id DESC
LIMIT 1;
```

Expected: event_type = 'POLICY_ACTIVATED', from_status = 'pending', to_status = 'active'

**Verify Outbox Event:**
```sql
SELECT
  id, event_type, aggregate_id, status,
  JSON_PRETTY(payload_json) as payload
FROM outbox_event
WHERE event_type = 'POLICY_ACTIVATED'
ORDER BY id DESC
LIMIT 1;
```

Expected: 1 new event with POLICY_ACTIVATED

---

### Phase 2: Member Management

#### Step 2.1: Add Dependent Member

**Postman Request:** `2.1 Add Policy Member`

**Expected Response:**
```json
{
  "policy_member_id": 2,
  "status": "active"
}
```

**Verify Member Added:**
```sql
SELECT
  pm.id, pm.policy_id, pm.person_id, pm.role, pm.status,
  p.full_name, p.email
FROM policy_member pm
JOIN person p ON pm.person_id = p.id
WHERE pm.policy_id = 1
ORDER BY pm.id;
```

Expected: 2 rows (holder + dependent)

**Verify Outbox Event:**
```sql
SELECT
  id, event_type,
  JSON_EXTRACT(payload_json, '$.person_id') as person_id,
  JSON_EXTRACT(payload_json, '$.role') as role
FROM outbox_event
WHERE event_type = 'POLICY_MEMBER_ADDED'
ORDER BY id DESC
LIMIT 1;
```

Expected: person_id = 1001, role = 'dependent'

---

### Phase 3: Benefit Usage Workflow

#### Step 3.1: Reserve Benefit Usage

**Postman Request:** `3.1 Reserve Benefit Usage`

**Expected Response:**
```json
{
  "usage_id": 1,
  "reserved_amount": 150
}
```

**Verify Benefit Usage Record:**
```sql
SELECT
  id, policy_id, period_key, item_code,
  reserved_amount, reserved_count,
  used_amount, used_count,
  status
FROM policy_benefit_usage
WHERE policy_id = 1 AND item_code = 'OUTPATIENT_CONSULT';
```

Expected: reserved_amount = 150.00, reserved_count = 1, status = 'open'

**Verify Usage Event:**
```sql
SELECT
  id, usage_id, event_type, amount, count,
  ref_type, ref_id, occurred_at
FROM policy_benefit_usage_event
WHERE usage_id = 1
ORDER BY id DESC
LIMIT 1;
```

Expected: event_type = 'reserve', amount = 150.00

**Verify Outbox Event:**
```sql
SELECT
  id, event_type,
  JSON_EXTRACT(payload_json, '$.item_code') as item_code,
  JSON_EXTRACT(payload_json, '$.reserved_amount') as amount
FROM outbox_event
WHERE event_type = 'BENEFIT_USAGE_RESERVED'
ORDER BY id DESC
LIMIT 1;
```

Expected: BENEFIT_USAGE_RESERVED event with item_code = 'OUTPATIENT_CONSULT'

---

#### Step 3.2: Confirm Benefit Usage

**Postman Request:** `3.2 Confirm Benefit Usage`

**Expected Response:**
```json
{
  "usage_id": 1,
  "used_amount": 150
}
```

**Verify Usage Updated:**
```sql
SELECT
  id, reserved_amount, reserved_count,
  used_amount, used_count, status
FROM policy_benefit_usage
WHERE id = 1;
```

Expected:
- reserved_amount = 0.00 (released)
- used_amount = 150.00 (confirmed)
- reserved_count = 0, used_count = 1

**Verify Usage Event:**
```sql
SELECT
  id, event_type, amount, count, occurred_at
FROM policy_benefit_usage_event
WHERE usage_id = 1
ORDER BY id DESC
LIMIT 1;
```

Expected: event_type = 'confirm'

**Verify Outbox Event:**
```sql
SELECT
  id, event_type,
  JSON_EXTRACT(payload_json, '$.used_amount') as used_amount
FROM outbox_event
WHERE event_type = 'BENEFIT_USAGE_CONFIRMED'
ORDER BY id DESC
LIMIT 1;
```

Expected: BENEFIT_USAGE_CONFIRMED event

---

### Phase 4: Billing & Installments

#### Step 4.1: Create Billing Plan

**Postman Request:** `4.1 Create Billing Plan`

**Expected Response:**
```json
{
  "billing_plan_id": 1,
  "installment_count": 12
}
```

**Verify Billing Plan Created:**
```sql
SELECT
  id, policy_id, billing_type, total_amount,
  installment_count, status
FROM policy_billing_plan
WHERE policy_id = 1;
```

Expected: 1 row, status = 'pending', installment_count = 12

**Verify Installments Generated:**
```sql
SELECT
  id, billing_plan_id, installment_no,
  amount, due_at, status
FROM policy_installment
WHERE billing_plan_id = 1
ORDER BY installment_no;
```

Expected: 12 rows with sequential due dates (monthly)

**Verify Outbox Event:**
```sql
SELECT
  id, event_type, aggregate_type,
  JSON_EXTRACT(payload_json, '$.billing_plan_id') as plan_id
FROM outbox_event
WHERE event_type = 'BILLING_PLAN_CREATED'
ORDER BY id DESC
LIMIT 1;
```

Expected: BILLING_PLAN_CREATED event

---

#### Step 4.2: Pay First Installment

**Postman Request:** `4.2 Pay Installment`

**Note:** Update URL to use actual installment ID from Step 4.1

**Expected Response:**
```json
{
  "installment_id": "1",
  "status": "paid"
}
```

**Verify Installment Paid:**
```sql
SELECT
  id, installment_no, status, paid_at,
  payment_method, payment_ref
FROM policy_installment
WHERE id = 1;
```

Expected: status = 'paid', paid_at set, payment_method = 'wallet'

**Verify Billing Plan Status:**
```sql
SELECT
  id, status,
  (SELECT COUNT(*) FROM policy_installment WHERE billing_plan_id = 1 AND status = 'paid') as paid_count,
  (SELECT COUNT(*) FROM policy_installment WHERE billing_plan_id = 1) as total_count
FROM policy_billing_plan
WHERE id = 1;
```

Expected: status = 'pending' (not all paid yet), paid_count = 1, total_count = 12

**Verify Outbox Event:**
```sql
SELECT
  id, event_type,
  JSON_EXTRACT(payload_json, '$.installment_id') as installment_id
FROM outbox_event
WHERE event_type = 'INSTALLMENT_PAID'
ORDER BY id DESC
LIMIT 1;
```

Expected: INSTALLMENT_PAID event

---

### Phase 5: Deposit Requirement

#### Step 5.1: Evaluate Deposit Requirement

**Postman Request:** `5.1 Evaluate Deposit Requirement`

**Expected Response:**
```json
{
  "status": "warning",
  "current_amount": 8000,
  "required_amount": 5000
}
```

**Verify Deposit Requirement Updated:**
```sql
SELECT
  id, policy_id, status,
  min_required_amount, warning_amount, urgent_amount,
  last_evaluated_at
FROM policy_deposit_requirement
WHERE policy_id = 1;
```

Expected: status updated based on threshold (warning/urgent/ok), last_evaluated_at set

**Verify Outbox Event (if status != ok):**
```sql
SELECT
  id, event_type,
  JSON_EXTRACT(payload_json, '$.status') as status,
  JSON_EXTRACT(payload_json, '$.current_balance') as balance
FROM outbox_event
WHERE event_type = 'DEPOSIT_REQUIREMENT_EVALUATED'
ORDER BY id DESC
LIMIT 1;
```

Expected: Event only if status is warning/urgent/critical

---

### Phase 6: Remediation (Optional)

#### Step 6.1: Open Remediation Case

**Postman Request:** `6.1 Open Remediation Case`

**Expected Response:**
```json
{
  "remediation_case_id": 1,
  "grace_end_at": "2024-04-08T00:00:00.000Z"
}
```

**Verify Case Created:**
```sql
SELECT
  id, policy_id, reason_code, status,
  grace_end_at, required_actions, created_at
FROM policy_remediation_case
WHERE policy_id = 1;
```

Expected: 1 row, status = 'open', grace_end_at = 7 days from now

**Verify Outbox Event:**
```sql
SELECT
  id, event_type,
  JSON_EXTRACT(payload_json, '$.reason_code') as reason
FROM outbox_event
WHERE event_type = 'REMEDIATION_CASE_OPENED'
ORDER BY id DESC
LIMIT 1;
```

Expected: REMEDIATION_CASE_OPENED event

---

#### Step 6.2: Clear Remediation Case

**Postman Request:** `6.2 Clear Remediation Case`

**Expected Response:**
```json
{
  "remediation_case_id": 1,
  "status": "cleared"
}
```

**Verify Case Cleared:**
```sql
SELECT
  id, status, cleared_at
FROM policy_remediation_case
WHERE id = 1;
```

Expected: status = 'cleared', cleared_at set

**Verify Outbox Event:**
```sql
SELECT
  id, event_type
FROM outbox_event
WHERE event_type = 'REMEDIATION_CASE_CLEARED'
ORDER BY id DESC
LIMIT 1;
```

Expected: REMEDIATION_CASE_CLEARED event

---

## Summary Verification Queries

### All Policy Data for Policy ID 1

```sql
-- Main Policy
SELECT 'POLICY' as table_name, id, policy_number, status, created_at
FROM policy WHERE id = 1

UNION ALL

-- Members
SELECT 'MEMBERS', pm.id, CONCAT('Person ', pm.person_id, ' - ', pm.role), pm.status, pm.created_at
FROM policy_member pm WHERE pm.policy_id = 1

UNION ALL

-- Benefit Entitlement
SELECT 'ENTITLEMENT', id, catalog_code_snapshot, status, created_at
FROM policy_benefit_entitlement WHERE policy_id = 1

UNION ALL

-- Benefit Usage
SELECT 'USAGE', id, CONCAT(item_code, ' - ', period_key), status, created_at
FROM policy_benefit_usage WHERE policy_id = 1

UNION ALL

-- Billing Plan
SELECT 'BILLING', id, billing_type, status, created_at
FROM policy_billing_plan WHERE policy_id = 1

UNION ALL

-- Deposit Requirement
SELECT 'DEPOSIT', id, CONCAT('Status: ', status), status, created_at
FROM policy_deposit_requirement WHERE policy_id = 1

ORDER BY table_name, id;
```

### All Outbox Events for Policy

```sql
SELECT
  id, event_type, status, occurred_at,
  JSON_EXTRACT(payload_json, '$.policy_id') as policy_id
FROM outbox_event
WHERE aggregate_type = 'POLICY'
  OR aggregate_type LIKE 'POLICY_%'
ORDER BY id DESC
LIMIT 20;
```

### Event Timeline for Policy ID 1

```sql
SELECT
  'STATUS_EVENT' as source,
  event_type as event,
  CONCAT(IFNULL(from_status, 'NULL'), ' → ', to_status) as transition,
  created_at as timestamp
FROM policy_status_event
WHERE policy_id = 1

UNION ALL

SELECT
  'OUTBOX_EVENT',
  event_type,
  aggregate_type,
  occurred_at
FROM outbox_event
WHERE JSON_EXTRACT(payload_json, '$.policy_id') = 1

ORDER BY timestamp DESC;
```

---

## Expected Outbox Events (in order)

1. `POLICY_CREATED` - When policy is created
2. `POLICY_ACTIVATED` - When policy is activated
3. `POLICY_MEMBER_ADDED` - When dependent is added
4. `BENEFIT_USAGE_RESERVED` - When benefit is reserved
5. `BENEFIT_USAGE_CONFIRMED` - When benefit is confirmed
6. `BILLING_PLAN_CREATED` - When billing plan is created
7. `INSTALLMENT_PAID` - When installment is paid
8. `DEPOSIT_REQUIREMENT_EVALUATED` - When deposit is evaluated (optional)
9. `REMEDIATION_CASE_OPENED` - When case is opened (optional)
10. `REMEDIATION_CASE_CLEARED` - When case is cleared (optional)

**Total Events: 7-10** depending on which optional steps you execute

---

## Troubleshooting

### Issue: Package Not Found
**Error:** `PACKAGE_NOT_FOUND`
**Solution:** Run Step 0.1 to create the package first

### Issue: No Active Entitlement
**Error:** `NO_ACTIVE_ENTITLEMENT`
**Solution:** This should be auto-created in Step 1.1. Verify benefit_catalog and benefit_catalog_item have data.

### Issue: Annual Limit Exceeded
**Error:** `ANNUAL_LIMIT_EXCEEDED`
**Solution:** Check current usage vs limits in benefit entitlement JSON. Use different period_key or item_code.

### Issue: Installment Already Paid
**Error:** `INSTALLMENT_ALREADY_PAID`
**Solution:** Use a different installment_id (try ID 2, 3, etc.)

---

## Clean Up (Reset for Re-testing)

```sql
-- Delete in reverse dependency order
DELETE FROM policy_benefit_usage_event WHERE usage_id IN (SELECT id FROM policy_benefit_usage WHERE policy_id = 1);
DELETE FROM policy_benefit_usage WHERE policy_id = 1;
DELETE FROM policy_installment WHERE billing_plan_id IN (SELECT id FROM policy_billing_plan WHERE policy_id = 1);
DELETE FROM policy_billing_plan WHERE policy_id = 1;
DELETE FROM policy_remediation_case WHERE policy_id = 1;
DELETE FROM policy_deposit_requirement WHERE policy_id = 1;
DELETE FROM policy_benefit_entitlement WHERE policy_id = 1;
DELETE FROM policy_member WHERE policy_id = 1;
DELETE FROM policy_status_event WHERE policy_id = 1;
DELETE FROM policy WHERE id = 1;
DELETE FROM outbox_event WHERE aggregate_type LIKE 'POLICY%';
DELETE FROM policy_package_rate WHERE package_id IN (SELECT id FROM policy_package WHERE code = 'PKG_BASIC_2024');
DELETE FROM policy_package WHERE code = 'PKG_BASIC_2024';
```

---

## Success Criteria

✅ All 13+ Postman requests return 200/201 status
✅ 7-10 outbox events created with status = 'new'
✅ Policy lifecycle: pending → active
✅ Benefit usage: 0 → reserved → confirmed
✅ Billing plan: 12 installments generated
✅ Deposit requirement: calculated and evaluated
✅ All events have correct aggregate_type and payload

**Policy Pillar is READY for production! 🎉**
