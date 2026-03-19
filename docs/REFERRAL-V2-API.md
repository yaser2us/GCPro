# Referral V2 API - Multi-Level Referrals

## Overview

The **Referral V2 API** adds multi-level (multi-generational) referral tracking to the system. While V1 only tracks direct referrals (User A → User B), V2 tracks the entire referral chain (User A → User B → User C → User D).

---

## Quick Comparison

| Feature | V1 API (`/v1/referral/*`) | V2 API (`/v2/referral/*`) |
|---------|---------------------------|---------------------------|
| **Direct Referrals** | ✅ Supported | ✅ Supported |
| **Multi-Level Chains** | ❌ Not tracked | ✅ Fully tracked |
| **Commission Levels** | Single level only | Up to 3+ levels |
| **Network Stats** | ❌ Not available | ✅ Available |
| **Downline Query** | ❌ Not available | ✅ Available |
| **Upline Query** | ❌ Not available | ✅ Available |
| **Use Case** | Simple referrals | MLM, Affiliate programs |

---

## Migration from V1 to V2

### Option 1: Run Both (Recommended)

**Keep both modules enabled** - This allows gradual migration:

```typescript
// src/app.module.ts
@Module({
  imports: [
    ReferralModule,    // V1: /v1/referral/*
    ReferralV2Module,  // V2: /v2/referral/*
  ],
})
export class AppModule {}
```

**Benefits:**
- Existing V1 integrations continue to work
- New features can use V2
- Gradual migration

**Drawbacks:**
- Slightly higher memory footprint

### Option 2: V2 Only

**Use V2 module exclusively:**

```typescript
// src/app.module.ts
@Module({
  imports: [
    // ReferralModule,    // Disabled
    ReferralV2Module,  // V2: Handles both /v1 and /v2 endpoints
  ],
})
export class AppModule {}
```

**Benefits:**
- Cleaner, single source of truth
- V1 endpoints still work (controller included in V2 module)

**Drawbacks:**
- All conversions will build chains (slight performance overhead)

---

## API Endpoints

### Shared Endpoints (Same in V1 and V2)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v2/referral/programs` | Create referral program |
| POST | `/v2/referral/programs/:id/pause` | Pause program |
| POST | `/v2/referral/programs/:id/activate` | Activate program |
| POST | `/v2/referral/codes` | Create referral code |
| POST | `/v2/referral/invites` | Create invite |
| POST | `/v2/referral/invites/click` | Track invite click |
| POST | `/v2/referral/conversions` | Record conversion (✨ triggers chain building) |

### V2-Exclusive Endpoints (Multi-Level Features)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v2/referral/programs/:program_id/users/:user_id/network` | Get network statistics |
| GET | `/v2/referral/programs/:program_id/users/:user_id/downline` | Get full downline (descendants) |
| GET | `/v2/referral/programs/:program_id/users/:user_id/upline` | Get full upline (ancestors) |

---

## Example Workflows

### Scenario: Multi-Level Referral Chain

```
User A (ID: 100)
  │
  ├─ Refers User B (ID: 200) ← Direct referral, depth=1
  │      │
  │      └─ User B refers User C (ID: 300) ← Indirect referral via B, depth=2
  │              │
  │              └─ User C refers User D (ID: 400) ← Indirect referral via B & C, depth=3
```

### Step 1: User A Creates Referral Code

```http
POST /v2/referral/codes
Content-Type: application/json
X-User-Id: 100
X-User-Role: USER
Idempotency-Key: code-user-a-123

{
  "program_id": 1
}
```

**Response:**
```json
{
  "code_id": 10,
  "status": "active"
}
```

### Step 2: User A Creates Invite for User B

```http
POST /v2/referral/invites
Content-Type: application/json
X-User-Id: 100
Idempotency-Key: invite-a-to-b-456

{
  "program_id": 1,
  "referral_code_id": 10,
  "channel_type": "email",
  "channel_value": "userB@example.com"
}
```

**Response:**
```json
{
  "invite_id": 1,
  "invite_token": "abc123...",
  "status": "created"
}
```

### Step 3: User B Signs Up (Conversion)

```http
POST /v2/referral/conversions
Content-Type: application/json
X-User-Id: system
Idempotency-Key: conversion-user-b-789

{
  "invite_token": "abc123...",
  "referred_user_id": 200
}
```

**Response:**
```json
{
  "conversion_id": 1,
  "status": "converted"
}
```

**What happens in V2:**
1. Conversion record created
2. Event `REFERRAL_CONVERSION_CREATED` emitted
3. **Chain Consumer builds chain:**
   - User A → User B (depth=1)

**Database state:**
```sql
SELECT * FROM referral_chain WHERE program_id = 1;

-- Results:
-- ancestor_user_id | descendant_user_id | depth
-- 100              | 200                | 1
```

### Step 4: User B Creates Referral Code

```http
POST /v2/referral/codes
X-User-Id: 200

{
  "program_id": 1
}
```

### Step 5: User B Invites User C

```http
POST /v2/referral/invites
X-User-Id: 200

{
  "program_id": 1,
  "referral_code_id": 11,
  "channel_type": "email",
  "channel_value": "userC@example.com"
}
```

### Step 6: User C Signs Up (Conversion)

```http
POST /v2/referral/conversions
X-User-Id: system

{
  "invite_token": "def456...",
  "referred_user_id": 300
}
```

**What happens in V2:**
1. Conversion record created
2. Event `REFERRAL_CONVERSION_CREATED` emitted
3. **Chain Consumer builds chain:**
   - User B → User C (depth=1, direct)
   - User A → User C (depth=2, indirect via User B)

**Database state:**
```sql
SELECT * FROM referral_chain WHERE program_id = 1 ORDER BY depth, ancestor_user_id;

-- Results:
-- ancestor_user_id | descendant_user_id | depth
-- 100              | 200                | 1     (A → B)
-- 200              | 300                | 1     (B → C)
-- 100              | 300                | 2     (A → C via B)
```

### Step 7: Query User A's Network

```http
GET /v2/referral/programs/1/users/100/network
X-User-Id: 100
```

**Response:**
```json
{
  "total_descendants": 2,
  "level_1_count": 1,  // User B
  "level_2_count": 1,  // User C
  "level_3_count": 0
}
```

### Step 8: Query User A's Downline

```http
GET /v2/referral/programs/1/users/100/downline
X-User-Id: 100
```

**Response:**
```json
{
  "downline": [
    { "user_id": 200, "depth": 1 },  // User B (direct)
    { "user_id": 300, "depth": 2 }   // User C (via User B)
  ],
  "total_count": 2
}
```

### Step 9: Query User C's Upline

```http
GET /v2/referral/programs/1/users/300/upline
X-User-Id: 300
```

**Response:**
```json
{
  "upline": [
    { "user_id": 200, "depth": 1 },  // User B (direct referrer)
    { "user_id": 100, "depth": 2 }   // User A (indirect via B)
  ],
  "total_count": 2
}
```

---

## Commission Integration (Multi-Level)

When User D makes a $100 purchase, the commission pillar can query the chain to distribute commissions across all levels:

```typescript
// Get all ancestors who should receive commission
const ancestors = await referralChainService.getCommissionEligibleAncestors(
  program_id,
  user_d_id,
  3, // Max 3 levels
);

// ancestors = [
//   { user_id: 300, depth: 1 },  // User C
//   { user_id: 200, depth: 2 },  // User B
//   { user_id: 100, depth: 3 }   // User A
// ]

for (const ancestor of ancestors) {
  // Get commission rule for this depth
  const rate = getCommissionRate(ancestor.depth);
  // depth=1: 25%, depth=2: 10%, depth=3: 5%

  // Record commission accrual
  await commissionService.recordAccrual({
    participant_id: ancestor.user_id,
    amount: purchase_amount * rate,
    depth: ancestor.depth,
  });
}
```

**Result:**
- User C earns: $100 × 25% = $25
- User B earns: $100 × 10% = $10
- User A earns: $100 × 5% = $5
- **Total distributed: $40**

---

## Architecture

### How Chain Building Works

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User B refers User C                                    │
│    POST /v2/referral/conversions                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ReferralWorkflowService.createReferralConversion()      │
│    - Creates conversion record                             │
│    - Emits REFERRAL_CONVERSION_CREATED event               │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. EventBus.publish('REFERRAL_CONVERSION_CREATED')         │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. ReferralChainConsumer (V2 only)                         │
│    - Listens to event                                      │
│    - Calls ReferralChainService.buildChain()               │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. ReferralChainService.buildChain()                       │
│    Algorithm:                                              │
│    a) Create direct chain: B → C (depth=1)                 │
│    b) Find all ancestors of B                              │
│    c) For each ancestor A:                                 │
│       - Create indirect chain: A → C (depth=ancestor+1)    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. referral_chain table                                    │
│    - A → B (depth=1)  [existing]                           │
│    - B → C (depth=1)  [new]                                │
│    - A → C (depth=2)  [new]                                │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **ReferralChainService** - Builds and queries multi-level chains
2. **ReferralChainRepository** - Database access for chain table
3. **ReferralChainConsumer** - Event listener (V2 only)
4. **ReferralV2Controller** - HTTP endpoints with network stats
5. **ReferralV2Module** - Bundles all V2 components

---

## Database Schema

```sql
CREATE TABLE referral_chain (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  program_id BIGINT NOT NULL,
  ancestor_user_id BIGINT NOT NULL,     -- Who is higher in the chain
  descendant_user_id BIGINT NOT NULL,   -- Who is lower in the chain
  depth INT UNSIGNED NOT NULL,          -- How many levels apart (1=direct, 2=grandparent, etc.)
  root_invite_id BIGINT,                -- Original invite at top of chain
  root_conversion_id BIGINT,            -- Conversion that created this entry
  created_at DATETIME DEFAULT NOW(),

  -- Prevent duplicates
  UNIQUE KEY uk_chain_unique (program_id, ancestor_user_id, descendant_user_id),

  -- Fast queries
  INDEX idx_chain_ancestor (program_id, ancestor_user_id, depth),
  INDEX idx_chain_descendant (program_id, descendant_user_id),
  INDEX idx_chain_root_conversion (root_conversion_id),
  INDEX idx_chain_root_invite (root_invite_id)
);
```

---

## Performance Considerations

### Chain Building Overhead

- **V1:** No overhead, simple conversion insert
- **V2:** Additional inserts per depth level

**Example:**
- User A → User B → User C → User D → User E
- When User E converts:
  - **V1:** 1 insert (conversion)
  - **V2:** 1 insert (conversion) + 4 inserts (chain entries)

**Mitigation:**
- Chain building happens asynchronously via event
- Main conversion API returns immediately
- Failed chain builds can be retried

### Query Performance

**Get downline (all descendants):**
```sql
-- Optimized with index on (program_id, ancestor_user_id, depth)
SELECT * FROM referral_chain
WHERE program_id = 1 AND ancestor_user_id = 100
ORDER BY depth ASC;
```

**Get upline (all ancestors):**
```sql
-- Optimized with index on (program_id, descendant_user_id)
SELECT * FROM referral_chain
WHERE program_id = 1 AND descendant_user_id = 400
ORDER BY depth ASC;
```

---

## Testing

### Test Multi-Level Chain Building

```bash
# 1. Create User A's code
curl -X POST http://localhost:3000/v2/referral/codes \
  -H "X-User-Id: 100" \
  -d '{"program_id": 1}'

# 2. User B converts via A's code
curl -X POST http://localhost:3000/v2/referral/conversions \
  -d '{"invite_token": "token-a", "referred_user_id": 200}'

# 3. Create User B's code
curl -X POST http://localhost:3000/v2/referral/codes \
  -H "X-User-Id: 200" \
  -d '{"program_id": 1}'

# 4. User C converts via B's code
curl -X POST http://localhost:3000/v2/referral/conversions \
  -d '{"invite_token": "token-b", "referred_user_id": 300}'

# 5. Check chains were built
curl http://localhost:3000/v2/referral/programs/1/users/100/downline

# Expected:
# {
#   "downline": [
#     {"user_id": 200, "depth": 1},
#     {"user_id": 300, "depth": 2}
#   ]
# }
```

---

## Configuration

### Max Depth Limit

To prevent infinite chains, configure max depth in commission program:

```json
{
  "meta_json": {
    "max_referral_depth": 3
  }
}
```

When querying ancestors for commission:
```typescript
const ancestors = await chainService.getCommissionEligibleAncestors(
  program_id,
  user_id,
  3, // Max depth = 3 levels
);
```

---

## FAQ

### Q: Can I backfill chains for existing V1 conversions?

**A:** Yes, replay the `REFERRAL_CONVERSION_CREATED` events:

```sql
-- Get all conversion IDs
SELECT id FROM referral_conversion WHERE program_id = 1;

-- For each ID, publish event again
-- (Manual script or admin endpoint needed)
```

### Q: What if chain building fails?

**A:** The conversion still succeeds. Chain building happens async and can be retried.

### Q: Can I disable chain building temporarily?

**A:** Yes, unregister the `ReferralChainConsumer`:

```typescript
// Comment out in referral-v2.module.ts
// ReferralChainConsumer,
```

### Q: Does this affect V1 API performance?

**A:** No, V1 and V2 modules are independent. V1 doesn't have the chain consumer.

---

## Summary

✅ **V2 adds multi-level tracking** without breaking V1
✅ **Both APIs can run simultaneously**
✅ **Chain building is event-driven** (async, non-blocking)
✅ **Commission pillar can query chains** for multi-level payouts
✅ **Network stats available** via V2-exclusive endpoints

**When to use:**
- **V1:** Simple direct referrals
- **V2:** MLM, affiliate programs with multi-level commissions

**Related Documentation:**
- [Multi-Level Referrals Guide](./MULTI-LEVEL-REFERRALS.md)
- [Commission Outbox Integration](./COMMISSION-OUTBOX-INTEGRATION.md)
- [API Endpoints Reference](./API-ENDPOINTS-REFERENCE.md)
