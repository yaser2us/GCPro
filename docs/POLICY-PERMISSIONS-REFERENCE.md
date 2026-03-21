# Policy Pillar Permissions Reference

**SQL Script:** `scripts/policy-permissions.sql`
**Total Permissions:** 19

---

## 🔧 Installation

### Run SQL Script
```bash
mysql -u root -p GCPRO < scripts/policy-permissions.sql
```

### Verify Installation
```sql
-- Check all policy permissions
SELECT code, name, description
FROM permission
WHERE code LIKE 'policy:%'
ORDER BY code;

-- Check admin user has permissions
SELECT p.code, p.name
FROM user_permission up
JOIN permission p ON up.permission_id = p.id
WHERE up.user_id = 1 AND p.code LIKE 'policy:%';
```

---

## 📋 Permission List

### Admin & Management (3 permissions)

| Code | Name | Description | Grants Access To |
|------|------|-------------|------------------|
| `policy:admin` | Policy Admin | Full administrative access | All policy endpoints |
| `policy:manage` | Policy Manage | Manage policies and data | Create, update, view policies |
| `policy:read` | Policy Read | Read-only access | View policy data only |

---

### Policy Lifecycle (4 permissions)

| Code | Name | Description | Endpoint |
|------|------|-------------|----------|
| `policy:create` | Policy Create | Create new insurance policies | `POST /api/v1/policy/create` |
| `policy:activate` | Policy Activate | Activate pending policies | `POST /api/v1/policy/:id/activate` |
| `policy:suspend` | Policy Suspend | Suspend active policies | `POST /api/v1/policy/:id/suspend` |
| `policy:cancel` | Policy Cancel | Cancel policies | `POST /api/v1/policy/:id/cancel` |

**Status Flow:**
```
pending → active → suspended → active
                 → expired
                 → cancelled
```

---

### Member Management (2 permissions)

| Code | Name | Description | Endpoint |
|------|------|-------------|----------|
| `policy:add_member` | Policy Add Member | Add members to policies | `POST /api/v1/policy/:id/members/add` |
| `policy:remove_member` | Policy Remove Member | Remove members from policies | `POST /api/v1/policy/:id/members/remove` |

**Use Cases:**
- Adding dependents (spouse, children, parents)
- Removing members when coverage ends
- Managing primary vs. dependent members

---

### Benefit Usage (3 permissions)

| Code | Name | Description | Endpoint |
|------|------|-------------|----------|
| `policy:benefit_reserve` | Policy Benefit Reserve | Reserve benefit usage (pre-auth) | `POST /api/v1/policy/benefit-usage/reserve` |
| `policy:benefit_confirm` | Policy Benefit Confirm | Confirm benefit usage (approve) | `POST /api/v1/policy/benefit-usage/confirm` |
| `policy:benefit_release` | Policy Benefit Release | Release reservations (reject) | `POST /api/v1/policy/benefit-usage/release` |

**3-Phase Workflow:**
```
1. Reserve  → Pre-authorize benefit (book appointment)
2. Confirm  → Approve claim (actual usage)
3. Release  → Cancel reservation (appointment cancelled)
```

---

### Billing & Installments (3 permissions)

| Code | Name | Description | Endpoint |
|------|------|-------------|----------|
| `policy:billing_create` | Policy Billing Create | Create billing plans | `POST /api/v1/policy/:id/billing-plan/create` |
| `policy:installment_pay` | Policy Installment Pay | Record installment payments | `POST /api/v1/policy/installment/:id/pay` |
| `policy:installment_mark_overdue` | Policy Installment Mark Overdue | Mark installments overdue | `POST /api/v1/policy/installment/:id/mark-overdue` |

**Billing Plan Types:**
- `annual` - 1 payment/year
- `semi_annual` - 2 payments/year
- `quarterly` - 4 payments/year
- `monthly` - 12 payments/year

---

### Deposit Requirement (1 permission)

| Code | Name | Description | Endpoint |
|------|------|-------------|----------|
| `policy:deposit_evaluate` | Policy Deposit Evaluate | Evaluate deposit requirements | `POST /api/v1/policy/:id/deposit/evaluate` |

**Evaluation Types:**
- `initial` - Initial policy deposit
- `periodic` - Periodic review
- `triggered` - Event-triggered (e.g., claims spike)

---

### Remediation Cases (3 permissions)

| Code | Name | Description | Endpoint |
|------|------|-------------|----------|
| `policy:remediation_open` | Policy Remediation Open | Open remediation cases | `POST /api/v1/policy/:id/remediation/open` |
| `policy:remediation_clear` | Policy Remediation Clear | Clear/resolve cases | `POST /api/v1/policy/remediation/:id/clear` |
| `policy:remediation_manage` | Policy Remediation Manage | Manage remediation cases | `GET/PUT /api/v1/policy/remediation/*` |

**Case Types:**
- `deposit_shortfall` - Deposit balance insufficient
- `payment_default` - Installment overdue
- `document_missing` - Required documents not submitted
- `fraud_suspicion` - Suspicious activity

**Severity Levels:**
- `low` - Minor issue
- `medium` - Moderate (30 days)
- `high` - Serious (7 days)
- `critical` - Immediate action required

---

## 🔐 Permission Assignment Examples

### Assign All Policy Permissions to User
```sql
-- Assign to user ID 5
INSERT INTO user_permission (user_id, permission_id, created_at)
SELECT 5, id, NOW()
FROM permission
WHERE code LIKE 'policy:%'
ON DUPLICATE KEY UPDATE user_id = user_id;
```

### Assign Specific Permissions
```sql
-- Assign only create and read permissions to user ID 10
INSERT INTO user_permission (user_id, permission_id, created_at)
SELECT 10, id, NOW()
FROM permission
WHERE code IN ('policy:create', 'policy:read', 'policy:add_member')
ON DUPLICATE KEY UPDATE user_id = user_id;
```

### Assign to Role (if using role-based permissions)
```sql
-- Assign all policy permissions to admin role (role_id = 1)
INSERT INTO role_permission (role_id, permission_id, created_at)
SELECT 1, id, NOW()
FROM permission
WHERE code LIKE 'policy:%'
ON DUPLICATE KEY UPDATE role_id = role_id;
```

---

## 📊 Permission Matrix

### By User Role

| Permission | Admin | Manager | Agent | User |
|------------|-------|---------|-------|------|
| `policy:admin` | ✅ | ❌ | ❌ | ❌ |
| `policy:manage` | ✅ | ✅ | ❌ | ❌ |
| `policy:read` | ✅ | ✅ | ✅ | ✅ (own only) |
| `policy:create` | ✅ | ✅ | ✅ | ❌ |
| `policy:activate` | ✅ | ✅ | ❌ | ❌ |
| `policy:add_member` | ✅ | ✅ | ✅ | ✅ (own only) |
| `policy:benefit_reserve` | ✅ | ✅ | ✅ | ✅ |
| `policy:benefit_confirm` | ✅ | ✅ | ❌ | ❌ |
| `policy:billing_create` | ✅ | ✅ | ✅ | ❌ |
| `policy:installment_pay` | ✅ | ✅ | ✅ | ✅ |
| `policy:remediation_open` | ✅ | ✅ | ✅ | ❌ |
| `policy:remediation_clear` | ✅ | ✅ | ❌ | ❌ |

### Setup Example Roles
```sql
-- Admin Role (Full Access)
INSERT INTO role_permission (role_id, permission_id, created_at)
SELECT 1, id, NOW()
FROM permission
WHERE code LIKE 'policy:%';

-- Manager Role (Management Access)
INSERT INTO role_permission (role_id, permission_id, created_at)
SELECT 2, id, NOW()
FROM permission
WHERE code IN (
  'policy:manage', 'policy:read', 'policy:create', 'policy:activate',
  'policy:add_member', 'policy:benefit_reserve', 'policy:benefit_confirm',
  'policy:billing_create', 'policy:installment_pay',
  'policy:remediation_open', 'policy:remediation_clear'
);

-- Agent Role (Limited Access)
INSERT INTO role_permission (role_id, permission_id, created_at)
SELECT 3, id, NOW()
FROM permission
WHERE code IN (
  'policy:read', 'policy:create', 'policy:add_member',
  'policy:benefit_reserve', 'policy:billing_create',
  'policy:installment_pay', 'policy:remediation_open'
);

-- User Role (Self-Service Only)
INSERT INTO role_permission (role_id, permission_id, created_at)
SELECT 4, id, NOW()
FROM permission
WHERE code IN (
  'policy:read', 'policy:add_member',
  'policy:benefit_reserve', 'policy:installment_pay'
);
```

---

## 🧪 Testing Permissions

### Check User Has Permission
```sql
-- Check if user ID 5 has policy:create permission
SELECT
  u.id AS user_id,
  u.email,
  p.code,
  p.name,
  CASE WHEN up.id IS NOT NULL THEN 'YES' ELSE 'NO' END AS has_permission
FROM user u
CROSS JOIN permission p
LEFT JOIN user_permission up ON up.user_id = u.id AND up.permission_id = p.id
WHERE u.id = 5
  AND p.code = 'policy:create';
```

### List All User Permissions
```sql
-- List all policy permissions for user ID 5
SELECT
  p.code,
  p.name,
  p.description
FROM user_permission up
JOIN permission p ON up.permission_id = p.id
WHERE up.user_id = 5
  AND p.code LIKE 'policy:%'
ORDER BY p.code;
```

### Revoke Permission
```sql
-- Revoke policy:admin from user ID 5
DELETE FROM user_permission
WHERE user_id = 5
  AND permission_id = (SELECT id FROM permission WHERE code = 'policy:admin');
```

---

## 🔍 Common Queries

### Find Users with Specific Permission
```sql
-- Find all users with policy:admin permission
SELECT
  u.id,
  u.email,
  p.code,
  p.name
FROM user u
JOIN user_permission up ON up.user_id = u.id
JOIN permission p ON p.id = up.permission_id
WHERE p.code = 'policy:admin';
```

### Count Permissions by User
```sql
-- Count policy permissions for each user
SELECT
  u.id,
  u.email,
  COUNT(up.id) AS policy_permissions
FROM user u
LEFT JOIN user_permission up ON up.user_id = u.id
LEFT JOIN permission p ON p.id = up.permission_id AND p.code LIKE 'policy:%'
GROUP BY u.id, u.email
HAVING policy_permissions > 0
ORDER BY policy_permissions DESC;
```

### Audit Permission Usage
```sql
-- List all users and their policy permissions
SELECT
  u.id AS user_id,
  u.email,
  GROUP_CONCAT(p.code ORDER BY p.code SEPARATOR ', ') AS permissions
FROM user u
JOIN user_permission up ON up.user_id = u.id
JOIN permission p ON p.id = up.permission_id
WHERE p.code LIKE 'policy:%'
GROUP BY u.id, u.email
ORDER BY u.id;
```

---

## 📚 Related Documentation

- **API Reference:** `docs/POLICY-API-REFERENCE.md`
- **Postman Collection:** `postman/policy-api.postman_collection.json`
- **Specification:** `specs/policy/policy.pillar.v2.yml`
- **SQL Script:** `scripts/policy-permissions.sql`

---

## 🚀 Quick Start

1. **Run SQL Script:**
   ```bash
   mysql -u root -p GCPRO < scripts/policy-permissions.sql
   ```

2. **Verify Installation:**
   ```bash
   mysql -u root -p GCPRO -e "SELECT COUNT(*) FROM permission WHERE code LIKE 'policy:%';"
   ```
   Should return: `19`

3. **Test API with Postman:**
   - Import: `postman/policy-api.postman_collection.json`
   - Set `user_id` = 1 (admin with all permissions)
   - Run collection

---

**Created:** 2026-03-20
**Version:** 1.0.0
**Status:** ✅ Production Ready
