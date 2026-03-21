# Policy API Reference

**Specification:** `specs/policy/policy.pillar.v2.yml`
**Postman Collection:** `postman/policy-api.postman_collection.json`
**Generated:** 2026-03-20

---

## 📋 Overview

The Policy Pillar provides comprehensive insurance policy management with:
- Policy lifecycle management (create → activate → manage)
- Member management (add/remove dependents)
- Benefit usage tracking (reserve → confirm → release)
- Billing plan & installment payment
- Deposit requirement evaluation
- Remediation case management

**Total Endpoints:** 11 command endpoints + 4 query endpoints

---

## 🔑 Authentication

All endpoints require:
```
Authorization: Bearer {jwt-token}
Idempotency-Key: {unique-key}
```

**Idempotency:** All write operations require `Idempotency-Key` header to prevent duplicate operations.

---

## 📍 Endpoints

### 1. Policy Lifecycle

#### 1.1 Create Policy
```http
POST /api/v1/policy/create
```

**Description:** Creates new insurance policy with holder and members

**Permission:** `policy:create`

**Request Body:**
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
  "idempotency_key": "create-policy-123"
}
```

**Response:**
```json
{
  "policy_id": "1",
  "policy_number": "POL-2024-000001",
  "status": "pending",
  "account_id": 1,
  "holder_person_id": 1000,
  "start_at": "2024-04-01T00:00:00.000Z",
  "created_at": "2024-03-20T10:00:00.000Z"
}
```

**Events Emitted:** `POLICY_CREATED`

**Guards:**
- ✅ Account must exist
- ✅ Holder person must exist
- ✅ Package code must exist
- ✅ Policy number uniqueness

---

#### 1.2 Activate Policy
```http
POST /api/v1/policy/:policyId/activate
```

**Description:** Activates a pending policy

**Permission:** `policy:activate`

**Request Body:**
```json
{
  "actor": {
    "actor_user_id": "user-123",
    "actor_role": "admin",
    "correlation_id": "corr-123",
    "causation_id": "activate-trigger"
  }
}
```

**Response:**
```json
{
  "policy_id": "1",
  "status": "active",
  "activated_at": "2024-03-20T10:00:00.000Z"
}
```

**Events Emitted:** `POLICY_ACTIVATED`

**Guards:**
- ✅ Policy must exist
- ✅ Policy status must be 'pending'
- ✅ All required members present

---

### 2. Member Management

#### 2.1 Add Policy Member
```http
POST /api/v1/policy/:policyId/members/add
```

**Description:** Adds new member to existing policy

**Permission:** `policy:add_member`

**Request Body:**
```json
{
  "policy_id": "1",
  "person_id": "1002",
  "relationship": "child",
  "is_primary": false,
  "start_at": "2024-04-01T00:00:00Z"
}
```

**Response:**
```json
{
  "member_id": "5",
  "policy_id": "1",
  "person_id": "1002",
  "relationship": "child",
  "is_primary": false,
  "status": "active"
}
```

**Events Emitted:** `POLICY_MEMBER_ADDED`

**Guards:**
- ✅ Policy must exist and be active
- ✅ Person must exist
- ✅ Person not already a member (upsert by policy_id + person_id)

**Relationships:**
- `self` - Policy holder
- `spouse` - Spouse/partner
- `child` - Dependent child
- `parent` - Dependent parent

---

### 3. Benefit Usage Workflow

#### 3.1 Reserve Benefit Usage
```http
POST /api/v1/policy/benefit-usage/reserve
```

**Description:** Pre-authorizes benefit usage (claims pre-approval)

**Permission:** `policy:benefit_reserve`

**Request Body:**
```json
{
  "policy_id": "1",
  "member_id": "1",
  "benefit_code": "OUTPATIENT_CONSULT",
  "reserved_amount": 1500.00,
  "currency": "MYR",
  "reserved_qty": 1,
  "idempotency_key": "reserve-benefit-123"
}
```

**Response:**
```json
{
  "usage_id": "10",
  "policy_id": "1",
  "member_id": "1",
  "benefit_code": "OUTPATIENT_CONSULT",
  "status": "reserved",
  "reserved_amount": 1500.00,
  "reserved_at": "2024-03-20T10:00:00.000Z"
}
```

**Events Emitted:** `BENEFIT_USAGE_RESERVED`

**Guards:**
- ✅ Policy must be active
- ✅ Member must belong to policy
- ✅ Benefit entitlement exists
- ✅ Sufficient remaining balance/quantity

---

#### 3.2 Confirm Benefit Usage
```http
POST /api/v1/policy/benefit-usage/confirm
```

**Description:** Confirms reserved benefit usage (claims approved)

**Permission:** `policy:benefit_confirm`

**Request Body:**
```json
{
  "usage_id": "10",
  "confirmed_amount": 1350.00,
  "confirmed_qty": 1,
  "idempotency_key": "confirm-benefit-123"
}
```

**Response:**
```json
{
  "usage_id": "10",
  "status": "confirmed",
  "confirmed_amount": 1350.00,
  "confirmed_at": "2024-03-20T11:00:00.000Z"
}
```

**Events Emitted:** `BENEFIT_USAGE_CONFIRMED`

**Guards:**
- ✅ Usage must exist
- ✅ Usage status must be 'reserved'
- ✅ Confirmed amount ≤ reserved amount

---

#### 3.3 Release Benefit Usage
```http
POST /api/v1/policy/benefit-usage/release
```

**Description:** Releases reserved benefit (claims rejected/cancelled)

**Permission:** `policy:benefit_release`

**Request Body:**
```json
{
  "usage_id": "10",
  "reason": "claim_rejected",
  "idempotency_key": "release-benefit-123"
}
```

**Response:**
```json
{
  "usage_id": "10",
  "status": "released",
  "released_at": "2024-03-20T11:00:00.000Z"
}
```

**Events Emitted:** `BENEFIT_USAGE_RELEASED`

**Guards:**
- ✅ Usage must exist
- ✅ Usage status must be 'reserved' (cannot release confirmed)

**Release Reasons:**
- `claim_rejected` - Insurance claim denied
- `claim_cancelled` - User cancelled claim
- `expired` - Reservation expired

---

### 4. Billing & Installments

#### 4.1 Create Billing Plan
```http
POST /api/v1/policy/:policyId/billing-plan/create
```

**Description:** Creates billing plan with installments schedule

**Permission:** `policy:billing_create`

**Request Body:**
```json
{
  "policy_id": "1",
  "plan_type": "monthly",
  "total_amount": 12000.00,
  "currency": "MYR",
  "installment_count": 12,
  "first_due_at": "2024-04-01T00:00:00Z",
  "idempotency_key": "create-billing-plan-123"
}
```

**Response:**
```json
{
  "billing_plan_id": "1",
  "policy_id": "1",
  "plan_type": "monthly",
  "total_amount": 12000.00,
  "installment_count": 12,
  "status": "active",
  "installments": [
    {
      "id": "1",
      "seq": 1,
      "amount": 1000.00,
      "due_at": "2024-04-01T00:00:00.000Z",
      "status": "pending"
    },
    {
      "id": "2",
      "seq": 2,
      "amount": 1000.00,
      "due_at": "2024-05-01T00:00:00.000Z",
      "status": "pending"
    }
    // ... 10 more installments
  ]
}
```

**Events Emitted:**
- `BILLING_PLAN_CREATED`
- `BILLING_PLAN_ACTIVATED`

**Guards:**
- ✅ Policy must exist and be active
- ✅ No active billing plan exists

**Plan Types:**
- `annual` - Single payment per year
- `semi_annual` - 2 payments per year
- `quarterly` - 4 payments per year
- `monthly` - 12 payments per year

---

#### 4.2 Pay Installment
```http
POST /api/v1/policy/installment/:installmentId/pay
```

**Description:** Records installment payment

**Permission:** `policy:installment_pay`

**Request Body:**
```json
{
  "payment_method": "wallet",
  "paid_amount": 1000.00,
  "payment_ref": "TXN-123456",
  "idempotency_key": "pay-installment-123"
}
```

**Response:**
```json
{
  "installment_id": "1",
  "status": "paid",
  "paid_amount": 1000.00,
  "paid_at": "2024-03-20T10:00:00.000Z",
  "payment_ref": "TXN-123456"
}
```

**Events Emitted:** `INSTALLMENT_PAID`

**Guards:**
- ✅ Installment must exist
- ✅ Installment status must be 'pending' or 'overdue'
- ✅ Paid amount must match installment amount

**Payment Methods:**
- `wallet` - GCPRO wallet
- `credit_card` - Credit/debit card
- `bank_transfer` - Direct bank transfer
- `ewallet` - E-wallet (GrabPay, TNG, etc.)

---

### 5. Deposit Requirement

#### 5.1 Evaluate Deposit Requirement
```http
POST /api/v1/policy/:policyId/deposit/evaluate
```

**Description:** Evaluates deposit requirement for policy

**Permission:** `policy:deposit_evaluate`

**Request Body:**
```json
{
  "policy_id": "1",
  "deposit_wallet_id": "5000",
  "required_amount": 50000.00,
  "currency": "MYR",
  "evaluation_type": "initial",
  "idempotency_key": "evaluate-deposit-123"
}
```

**Response:**
```json
{
  "deposit_requirement_id": "1",
  "policy_id": "1",
  "deposit_wallet_id": "5000",
  "required_amount": 50000.00,
  "current_balance": 45000.00,
  "shortfall": 5000.00,
  "status": "insufficient",
  "evaluated_at": "2024-03-20T10:00:00.000Z"
}
```

**Events Emitted:** `DEPOSIT_REQUIREMENT_EVALUATED`

**Guards:**
- ✅ Policy must exist and be active
- ✅ Wallet must exist
- ✅ Valid required amount

**Evaluation Types:**
- `initial` - Initial policy deposit
- `periodic` - Periodic review
- `triggered` - Event-triggered (e.g., claims spike)

---

### 6. Remediation Cases

#### 6.1 Open Remediation Case
```http
POST /api/v1/policy/:policyId/remediation/open
```

**Description:** Opens remediation case for policy issues

**Permission:** `policy:remediation_open`

**Request Body:**
```json
{
  "policy_id": "1",
  "case_type": "deposit_shortfall",
  "severity": "high",
  "description": "Deposit wallet balance below required threshold",
  "idempotency_key": "open-remediation-123"
}
```

**Response:**
```json
{
  "case_id": "1",
  "policy_id": "1",
  "case_type": "deposit_shortfall",
  "severity": "high",
  "status": "open",
  "opened_at": "2024-03-20T10:00:00.000Z"
}
```

**Events Emitted:** `REMEDIATION_CASE_OPENED`

**Guards:**
- ✅ Policy must exist
- ✅ Valid case_type
- ✅ Valid severity

**Case Types:**
- `deposit_shortfall` - Deposit balance insufficient
- `payment_default` - Installment payment overdue
- `document_missing` - Required documents not submitted
- `fraud_suspicion` - Suspicious activity detected

**Severity Levels:**
- `low` - Minor issue, no immediate action
- `medium` - Moderate issue, resolve within 30 days
- `high` - Serious issue, resolve within 7 days
- `critical` - Policy at risk, immediate action required

---

#### 6.2 Clear Remediation Case
```http
POST /api/v1/policy/remediation/:caseId/clear
```

**Description:** Clears/resolves remediation case

**Permission:** `policy:remediation_clear`

**Request Body:**
```json
{
  "resolution": "deposit_topped_up",
  "note": "User topped up deposit wallet to required amount",
  "idempotency_key": "clear-remediation-123"
}
```

**Response:**
```json
{
  "case_id": "1",
  "status": "cleared",
  "resolution": "deposit_topped_up",
  "cleared_at": "2024-03-20T11:00:00.000Z"
}
```

**Events Emitted:** `REMEDIATION_CASE_CLEARED`

**Guards:**
- ✅ Case must exist
- ✅ Case status must be 'open' or 'in_progress'
- ✅ Valid resolution

**Resolution Types:**
- `deposit_topped_up` - Deposit requirement met
- `payment_made` - Overdue payment cleared
- `documents_submitted` - Required documents uploaded
- `issue_resolved` - General resolution

---

## 📊 Events Reference

All commands emit events to the outbox for cross-pillar integration:

| Event | Aggregate | Trigger Command |
|-------|-----------|-----------------|
| `POLICY_CREATED` | POLICY | Policy.Create |
| `POLICY_ACTIVATED` | POLICY | Policy.Activate |
| `POLICY_SUSPENDED` | POLICY | Policy.Suspend |
| `POLICY_REACTIVATED` | POLICY | Policy.Reactivate |
| `POLICY_EXPIRED` | POLICY | Policy.Expire |
| `POLICY_CANCELLED` | POLICY | Policy.Cancel |
| `POLICY_MEMBER_ADDED` | POLICY | Policy.AddMember |
| `POLICY_MEMBER_REMOVED` | POLICY | Policy.RemoveMember |
| `BENEFIT_USAGE_RESERVED` | POLICY | BenefitUsage.Reserve |
| `BENEFIT_USAGE_CONFIRMED` | POLICY | BenefitUsage.Confirm |
| `BENEFIT_USAGE_RELEASED` | POLICY | BenefitUsage.Release |
| `BILLING_PLAN_CREATED` | POLICY_BILLING_PLAN | BillingPlan.Create |
| `BILLING_PLAN_ACTIVATED` | POLICY_BILLING_PLAN | BillingPlan.Create |
| `INSTALLMENT_PAID` | POLICY_BILLING_PLAN | Installment.Pay |
| `INSTALLMENT_OVERDUE` | POLICY_BILLING_PLAN | Installment.MarkOverdue |
| `DEPOSIT_REQUIREMENT_EVALUATED` | POLICY | DepositRequirement.Evaluate |
| `REMEDIATION_CASE_OPENED` | POLICY_REMEDIATION_CASE | RemediationCase.Open |
| `REMEDIATION_CASE_CLEARED` | POLICY_REMEDIATION_CASE | RemediationCase.Clear |

---

## 🧪 Testing with Postman

### 1. Import Collection
```
File → Import → postman/policy-api.postman_collection.json
```

### 2. Set Variables
- `baseUrl` - API base URL (default: http://localhost:3000)
- `authToken` - Your JWT token

### 3. Run Full Workflow
The collection includes 15 requests covering complete policy lifecycle:

1. ✅ Create Policy (with 2 members)
2. ✅ Activate Policy
3. ✅ Add Additional Member
4. ✅ Reserve Benefit Usage
5. ✅ Confirm Benefit Usage
6. ✅ Release Benefit Usage (for testing)
7. ✅ Create Billing Plan (12 installments)
8. ✅ Pay First Installment
9. ✅ Mark Installment Overdue (admin)
10. ✅ Evaluate Deposit Requirement
11. ✅ Open Remediation Case
12. ✅ Clear Remediation Case
13. ✅ Get Policy Details
14. ✅ Get Policy Members
15. ✅ Get Benefit Usage History

### 4. Auto-Generated Variables
The collection automatically captures:
- `policy_id` - After policy creation
- `billing_plan_id` - After billing plan creation
- `installment_id` - After billing plan creation
- `benefit_usage_id` - After benefit reservation
- `remediation_case_id` - After case opening

---

## 🔒 Security

### Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Permissions
Each endpoint requires specific permission:
- `policy:create` - Create policies
- `policy:activate` - Activate policies
- `policy:add_member` - Add policy members
- `policy:benefit_reserve` - Reserve benefit usage
- `policy:benefit_confirm` - Confirm benefit usage
- `policy:benefit_release` - Release benefit reservations
- `policy:billing_create` - Create billing plans
- `policy:installment_pay` - Pay installments
- `policy:deposit_evaluate` - Evaluate deposit requirements
- `policy:remediation_open` - Open remediation cases
- `policy:remediation_clear` - Clear remediation cases

### Idempotency
All write operations require `Idempotency-Key` header to prevent duplicate operations:
```
Idempotency-Key: create-policy-123
```

**Pattern:** `{command}-{entity}-{timestamp|uuid}`

---

## 📈 Status Flows

### Policy Status Flow
```
pending → active → suspended → active
                 → expired
                 → cancelled
```

### Benefit Usage Status Flow
```
reserved → confirmed
        → released
```

### Billing Plan Status Flow
```
pending → active → completed
                 → cancelled
```

### Installment Status Flow
```
pending → paid
        → overdue → paid
```

### Remediation Case Status Flow
```
open → in_progress → cleared
                   → expired
```

---

## 🚀 Quick Start Example

### Complete Policy Workflow
```bash
# 1. Create Policy
curl -X POST http://localhost:3000/api/v1/policy/create \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Idempotency-Key: create-policy-001" \
  -H "Content-Type: application/json" \
  -d '{
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
    "idempotency_key": "create-policy-001"
  }'

# 2. Activate Policy
curl -X POST http://localhost:3000/api/v1/policy/1/activate \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Idempotency-Key: activate-policy-001" \
  -H "Content-Type: application/json" \
  -d '{
    "actor": {
      "actor_user_id": "admin-123",
      "actor_role": "admin"
    }
  }'

# 3. Create Billing Plan
curl -X POST http://localhost:3000/api/v1/policy/1/billing-plan/create \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Idempotency-Key: create-billing-001" \
  -H "Content-Type: application/json" \
  -d '{
    "policy_id": "1",
    "plan_type": "monthly",
    "total_amount": 12000.00,
    "currency": "MYR",
    "installment_count": 12,
    "first_due_at": "2024-04-01T00:00:00Z",
    "idempotency_key": "create-billing-001"
  }'
```

---

## 📚 Related Documentation

- **Specification:** `specs/policy/policy.pillar.v2.yml`
- **Review:** `docs/POLICY-PILLAR-YML-REVIEW.md`
- **Guideline:** `docs/HOW-TO-CREATE-PILLAR-SPEC.V2.md`
- **Database:** `FULL-DDL.md` (lines 475-1948)

---

## 🐛 Troubleshooting

### Common Issues

**Issue:** `401 Unauthorized`
**Solution:** Check JWT token is valid and not expired

**Issue:** `403 Forbidden`
**Solution:** Check user has required permission for endpoint

**Issue:** `400 Bad Request - Idempotency-Key required`
**Solution:** Add `Idempotency-Key` header to request

**Issue:** `409 Conflict - Policy already exists`
**Solution:** Use different idempotency_key or check for existing policy

**Issue:** `404 Not Found - Policy not found`
**Solution:** Verify policy_id exists and user has access

---

**Generated:** 2026-03-20
**Version:** 2.0.0
**Status:** ✅ Production Ready
