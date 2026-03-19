# API Endpoints Reference

Quick reference for all GCPro API endpoints. Use this to verify Postman collection paths.

## Referral Plugin

**Base Path:** `/v1/referral`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/v1/referral/programs` | Create referral program | `referral:admin` |
| POST | `/v1/referral/programs/:id/pause` | Pause referral program | `referral:admin` |
| POST | `/v1/referral/programs/:id/activate` | Activate referral program | `referral:admin` |
| POST | `/v1/referral/codes` | Create referral code | - |
| POST | `/v1/referral/invites` | Create referral invite | - |
| POST | `/v1/referral/invites/click` | Record invite click | - |
| POST | `/v1/referral/conversions` | Record referral conversion | - |

**Source:** `src/plugins/referral/controllers/referral.controller.ts`

---

## Commission Plugin

**Base Path:** `/api/commission`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/commission/programs` | Create commission program | `commission:admin`, `commission:manager` |
| POST | `/api/commission/programs/:id/pause` | Pause commission program | `commission:admin`, `commission:manager` |
| POST | `/api/commission/programs/:id/activate` | Activate commission program | `commission:admin`, `commission:manager` |
| POST | `/api/commission/programs/:program_id/participants` | Enroll participant | `commission:admin`, `commission:manager` |
| PUT | `/api/commission/participants/:id/status` | Update participant status | `commission:admin`, `commission:manager` |
| POST | `/api/commission/programs/:program_id/rules` | Create commission rule | `commission:admin`, `commission:manager` |
| POST | `/api/commission/accruals` | Record accrual | - |
| PUT | `/api/commission/accruals/:id/void` | Void accrual | `commission:admin`, `commission:manager` |
| POST | `/api/commission/programs/:program_id/payout-batches` | Create payout batch | `commission:admin`, `commission:manager` |
| POST | `/api/commission/payout-batches/:id/process` | Process payout batch | `commission:admin`, `commission:manager` |

**Source:** `src/plugins/commission/controllers/commission.controller.ts`

---

## User Plugin

**Base Path:** `/v1`

### User Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/v1/users` | Create user | `user:admin`, `user:manage` |
| GET | `/v1/users` | List users | `user:read` |
| GET | `/v1/users/:user_id` | Get user | `user:read` |
| PUT | `/v1/users/:user_id/profile` | Update user profile | `user:admin`, `user:manage` |
| POST | `/v1/users/:user_id/verify-email` | Verify user email | `user:admin`, `user:manage` |
| POST | `/v1/users/:user_id/suspend` | Suspend user | `user:admin` |
| POST | `/v1/users/:user_id/activate` | Activate user | `user:admin` |

### User Credentials

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/v1/users/:user_id/credentials` | Create credential | `user:admin`, `user:manage` |
| POST | `/v1/users/:user_id/credentials/verify` | Verify credential | - |
| GET | `/v1/users/:user_id/credentials` | List credentials | `user:admin`, `user:read` |

### User Roles

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/v1/users/:user_id/roles` | Assign role | `user:admin` |
| DELETE | `/v1/users/:user_id/roles/:role_id` | Revoke role | `user:admin` |
| GET | `/v1/users/:user_id/roles` | List user roles | `user:read` |

### User Permissions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/v1/users/:user_id/permissions` | Grant permission | `user:admin` |
| DELETE | `/v1/users/:user_id/permissions/:permission_id` | Revoke permission | `user:admin` |
| GET | `/v1/users/:user_id/permissions` | List user permissions | `user:read` |

**Source:** `src/plugins/user/controllers/user.controller.ts`

---

## Wallet Plugin

**Base Path:** `/v1`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/v1/accounts` | Create account | `wallet:admin` |
| POST | `/v1/wallets` | Create wallet | `wallet:admin`, `wallet:manage` |
| POST | `/v1/wallets/:wallet_id/deposit` | Deposit funds | `wallet:admin`, `wallet:manage` |
| POST | `/v1/wallets/:wallet_id/withdraw` | Withdraw funds | `wallet:admin`, `wallet:manage` |
| GET | `/v1/wallets/:wallet_id/balance` | Get balance | `wallet:read` |
| GET | `/v1/wallets/:wallet_id/transactions` | Get transactions | `wallet:read` |

**Source:** `src/plugins/wallet/controllers/wallet.controller.ts`

---

## Required Headers

All endpoints require these headers:

```http
X-User-Id: <user_id>
X-User-Role: <role>
```

Write operations (POST/PUT/DELETE) also require:

```http
Idempotency-Key: <unique_uuid>
```

---

## Path Patterns Summary

### Plugin Base Paths
- **Referral:** `/v1/referral`
- **Commission:** `/api/commission`
- **User:** `/v1`
- **Wallet:** `/v1`

### Common Mistakes

| ❌ Wrong | ✅ Correct | Plugin |
|---------|-----------|--------|
| `/api/referral/programs` | `/v1/referral/programs` | Referral |
| `/v1/commission/programs` | `/api/commission/programs` | Commission |
| `/api/users` | `/v1/users` | User |
| `/api/wallets` | `/v1/wallets` | Wallet |

---

## How to Verify

If you get a 404 error:

1. Check the controller file: `src/plugins/<plugin>/controllers/<plugin>.controller.ts`
2. Look for `@Controller()` decorator (line ~30)
3. Combine controller path + method decorator path
4. Update your Postman collection

**Example:**

```typescript
// File: src/plugins/referral/controllers/referral.controller.ts
@Controller('/v1/referral')  // ← Base path
export class ReferralController {
  @Post('programs')  // ← Method path
  async createReferralProgram() { ... }
}

// Result: POST /v1/referral/programs
```

---

## Testing with cURL

### Referral - Create Program
```bash
curl -X POST http://localhost:3000/v1/referral/programs \
  -H "Content-Type: application/json" \
  -H "X-User-Id: admin-123" \
  -H "X-User-Role: ADMIN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "code": "WELCOME2024",
    "name": "Welcome Program"
  }'
```

### Commission - Create Program
```bash
curl -X POST http://localhost:3000/api/commission/programs \
  -H "Content-Type: application/json" \
  -H "X-User-Id: admin-123" \
  -H "X-User-Role: ADMIN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "code": "SALES_2024",
    "name": "Sales Commission Program"
  }'
```

### User - Create User
```bash
curl -X POST http://localhost:3000/v1/users \
  -H "Content-Type: application/json" \
  -H "X-User-Id: admin-123" \
  -H "X-User-Role: ADMIN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "email": "user@example.com",
    "username": "testuser"
  }'
```

### Wallet - Create Account
```bash
curl -X POST http://localhost:3000/v1/accounts \
  -H "Content-Type: application/json" \
  -H "X-User-Id: admin-123" \
  -H "X-User-Role: ADMIN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "type": "user"
  }'
```

---

## Related Documentation

- **Postman Collection Guide:** `docs/POSTMAN-COLLECTION-GUIDE.md`
- **Pillar Specifications:** `specs/<pillar>/<pillar>.pillar.v2.yml`
- **Controller Source:** `src/plugins/<plugin>/controllers/<plugin>.controller.ts`
