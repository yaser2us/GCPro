# Policy Pillar - Quick Start Guide

Complete end-to-end testing in 6 phases with outbox pattern verification.

---

## 🚀 Quick Setup (5 minutes)

### 1. Run Prerequisites SQL

```bash
# Execute the seed data
mysql -u root -p GCPRO < scripts/policy-seed-data.sql
```

This creates:
- ✅ 4 age bands
- ✅ 3 smoker profiles
- ✅ 1 benefit catalog with 7 items
- ✅ 3 test persons (ID: 1000, 1001, 1002)
- ✅ 1 test account (ID: 1)

### 2. Add Permissions

```bash
mysql -u root -p GCPRO < scripts/policy-permissions.sql
```

This grants all 19 policy permissions to user_id=1 and role_id=1.

### 3. Import Postman Collection

1. Open Postman
2. Import `postman/policy-api.postman_collection.json`
3. Set variables:
   - `base_url`: `http://localhost:3000`
   - `user_id`: `1` (or your test user ID)
   - `user_role`: `ADMIN`

---

## 📋 Testing Workflow (Run in Order)

### Phase 0: Setup (Admin) - 2 requests

```
0.1 Create Policy Package ✓
0.2 Create Package Rate ✓
```

**What happens:**
- Creates PKG_BASIC_2024 package
- Links package to age band and smoker profile
- No outbox events yet

---

### Phase 1: Policy Lifecycle - 2 requests

```
1.1 Create Policy ✓ → POLICY_CREATED event
1.2 Activate Policy ✓ → POLICY_ACTIVATED event
```

**What happens:**
- Policy created in `pending` status
- Auto-creates benefit entitlement (7 benefits)
- Auto-creates deposit requirement
- Adds holder as primary member
- Activates policy → `active` status

**Outbox Events: 2**

**Quick Verify:**
```sql
SELECT policy_number, status FROM policy WHERE id = 1;
-- Expected: status = 'active'

SELECT COUNT(*) FROM outbox_event WHERE aggregate_type = 'POLICY';
-- Expected: 2 events
```

---

### Phase 2: Add Member - 1 request

```
2.1 Add Policy Member ✓ → POLICY_MEMBER_ADDED event
```

**What happens:**
- Adds person_id=1001 as dependent

**Outbox Events: 3 total**

**Quick Verify:**
```sql
SELECT COUNT(*) FROM policy_member WHERE policy_id = 1;
-- Expected: 2 members (holder + dependent)
```

---

### Phase 3: Benefit Usage - 3 requests

```
3.1 Reserve Benefit Usage ✓ → BENEFIT_USAGE_RESERVED event
3.2 Confirm Benefit Usage ✓ → BENEFIT_USAGE_CONFIRMED event
3.3 Release Benefit Usage (optional)
```

**What happens:**
- Reserve 150 MYR for OUTPATIENT_CONSULT
- Validates against annual limit (3000 MYR)
- Confirms usage → moves from reserved to used
- Can release if claim rejected

**Outbox Events: 5 total**

**Quick Verify:**
```sql
SELECT reserved_amount, used_amount FROM policy_benefit_usage
WHERE policy_id = 1 AND item_code = 'OUTPATIENT_CONSULT';
-- After reserve: reserved=150, used=0
-- After confirm: reserved=0, used=150
```

---

### Phase 4: Billing - 2 requests

```
4.1 Create Billing Plan ✓ → BILLING_PLAN_CREATED event
4.2 Pay Installment ✓ → INSTALLMENT_PAID event
```

**What happens:**
- Creates billing plan with 12 monthly installments
- Auto-generates 12 installment records
- Pays first installment
- Auto-updates billing plan when all paid

**Outbox Events: 7 total**

**Quick Verify:**
```sql
SELECT COUNT(*) FROM policy_installment WHERE billing_plan_id = 1;
-- Expected: 12 installments

SELECT COUNT(*) FROM policy_installment
WHERE billing_plan_id = 1 AND status = 'paid';
-- Expected: 1 (after Step 4.2)
```

---

### Phase 5: Deposit - 1 request

```
5.1 Evaluate Deposit Requirement ✓ → DEPOSIT_REQUIREMENT_EVALUATED event (if warning)
```

**What happens:**
- Evaluates current balance vs thresholds
- Updates status: ok / warning / urgent / critical
- Emits event only if status != ok

**Outbox Events: 7-8 total**

**Quick Verify:**
```sql
SELECT status, min_required_amount, warning_amount
FROM policy_deposit_requirement WHERE policy_id = 1;
```

---

### Phase 6: Remediation (Optional) - 2 requests

```
6.1 Open Remediation Case ✓ → REMEDIATION_CASE_OPENED event
6.2 Clear Remediation Case ✓ → REMEDIATION_CASE_CLEARED event
```

**What happens:**
- Opens case for policy issues (deposit shortfall, payment default, etc.)
- Sets grace period (7 days)
- Clears case when resolved

**Outbox Events: 9-10 total**

---

## 🎯 Success Checklist

After running all requests:

✅ **Policy Status**
```sql
SELECT id, policy_number, status FROM policy WHERE id = 1;
-- status = 'active'
```

✅ **Members**
```sql
SELECT COUNT(*) FROM policy_member WHERE policy_id = 1;
-- count = 2
```

✅ **Benefit Entitlement**
```sql
SELECT catalog_code_snapshot, status FROM policy_benefit_entitlement WHERE policy_id = 1;
-- status = 'active'
```

✅ **Benefit Usage**
```sql
SELECT used_amount FROM policy_benefit_usage
WHERE policy_id = 1 AND item_code = 'OUTPATIENT_CONSULT';
-- used_amount = 150.00
```

✅ **Billing Plan**
```sql
SELECT status, installment_count FROM policy_billing_plan WHERE policy_id = 1;
-- installment_count = 12
```

✅ **Outbox Events**
```sql
SELECT COUNT(*) FROM outbox_event WHERE aggregate_type LIKE 'POLICY%';
-- count = 7-10 (depending on which phases you ran)
```

✅ **Event Types**
```sql
SELECT event_type, COUNT(*) as count FROM outbox_event
WHERE aggregate_type LIKE 'POLICY%'
GROUP BY event_type
ORDER BY event_type;
```

Expected events:
- BENEFIT_USAGE_CONFIRMED
- BENEFIT_USAGE_RESERVED
- BILLING_PLAN_CREATED
- DEPOSIT_REQUIREMENT_EVALUATED (optional)
- INSTALLMENT_PAID
- POLICY_ACTIVATED
- POLICY_CREATED
- POLICY_MEMBER_ADDED
- REMEDIATION_CASE_CLEARED (optional)
- REMEDIATION_CASE_OPENED (optional)

---

## 🔍 Outbox Pattern Verification

### Check All Events for Policy

```sql
SELECT
  id,
  event_type,
  status,
  occurred_at,
  JSON_EXTRACT(payload_json, '$.policy_id') as policy_id
FROM outbox_event
WHERE aggregate_type LIKE 'POLICY%'
ORDER BY id;
```

### Event Timeline

```sql
SELECT
  id,
  event_type,
  status,
  DATE_FORMAT(occurred_at, '%H:%i:%s') as time,
  JSON_PRETTY(payload_json) as payload
FROM outbox_event
WHERE JSON_EXTRACT(payload_json, '$.policy_id') = 1
ORDER BY id;
```

### Verify Event Payload Structure

Each event should have:
- ✅ `event_type` - matches workflow command
- ✅ `aggregate_type` - 'POLICY' or 'POLICY_*'
- ✅ `aggregate_id` - policy_id or related ID
- ✅ `status` - 'new' (ready for processing)
- ✅ `payload_json` - contains relevant data
- ✅ `occurred_at` - timestamp of event
- ✅ `idempotency_key` - prevents duplicates

---

## 🧹 Reset for Re-testing

```sql
-- Quick reset (deletes policy #1 and all related data)
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
```

Now re-run from Phase 1!

---

## 📊 Sample Test Results

After running all phases, you should see:

| Table | Records |
|-------|---------|
| policy | 1 |
| policy_member | 2 |
| policy_benefit_entitlement | 1 |
| policy_benefit_usage | 1 |
| policy_benefit_usage_event | 2-3 |
| policy_billing_plan | 1 |
| policy_installment | 12 |
| policy_deposit_requirement | 1 |
| policy_status_event | 2 |
| policy_remediation_case | 0-1 |
| **outbox_event** | **7-10** |

---

## 🐛 Common Issues

### ❌ "Package with code PKG_BASIC_2024 not found"
**Fix:** Run Phase 0 requests first

### ❌ "No active benefit entitlement found"
**Fix:** Check benefit_catalog_item has 7 items. Re-run Phase 1.1

### ❌ "Annual limit exceeded"
**Fix:** Use different period_key (e.g., "2025" instead of "2024")

### ❌ "Installment already paid"
**Fix:** Change installment ID in URL (use 2, 3, etc.)

---

## 📖 Detailed Documentation

For detailed SQL verification queries and troubleshooting, see:
- `docs/POLICY-E2E-TESTING-WORKFLOW.md`

For Postman collection:
- `postman/policy-api.postman_collection.json`

---

## ✅ You're Done!

If all requests return 200/201 and you see 7-10 outbox events, **Policy Pillar is working perfectly!** 🎉

The outbox pattern ensures:
- ✅ Events are reliably stored
- ✅ Events can be consumed by other services
- ✅ No events are lost (transactional consistency)
- ✅ Idempotency prevents duplicates

**Next Steps:**
- Set up outbox consumer to process events
- Integrate with other pillars (Claims, Wallet, etc.)
- Monitor outbox_event table for processing
