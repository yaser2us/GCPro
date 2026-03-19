# Multi-Level Referrals (Referral Chains)

## Question: If User B (referred by User A) refers User C, does User A still get commission?

**Answer: YES** - The system is designed to support multi-level referrals through the `referral_chain` table.

---

## How Multi-Level Referrals Work

### Example Scenario:

```
User A (Referrer)
    │
    ├─ Invites User B (Direct Referral - Depth 1)
    │       │
    │       └─ User B Invites User C (Indirect Referral - Depth 2)
    │               │
    │               └─ User C Invites User D (Indirect Referral - Depth 3)
```

### Commission Distribution:

When **User D** signs up and makes a qualifying purchase:

| User   | Relationship to User D | Depth | Commission % | Example Amount |
|--------|------------------------|-------|--------------|----------------|
| User A | Great-Grandparent      | 3     | 5%           | $5.00          |
| User B | Grandparent            | 2     | 10%          | $10.00         |
| User C | Parent (Direct)        | 1     | 25%          | $25.00         |
| User D | Self                   | 0     | N/A          | (Makes purchase)|

**Total Commission Paid:** $40.00 distributed across the chain

---

## Database Schema: `referral_chain`

```sql
CREATE TABLE referral_chain (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  program_id BIGINT NOT NULL,

  -- Who is the ancestor (higher up in the chain)
  ancestor_user_id BIGINT NOT NULL,

  -- Who is the descendant (lower in the chain)
  descendant_user_id BIGINT NOT NULL,

  -- How many levels apart (1 = direct, 2 = indirect, etc.)
  depth INT UNSIGNED NOT NULL,

  -- The original invite that started this chain
  root_invite_id BIGINT,

  -- The original conversion that started this chain
  root_conversion_id BIGINT,

  created_at DATETIME DEFAULT NOW(),

  -- Prevent duplicate entries
  UNIQUE KEY uk_chain_unique (program_id, ancestor_user_id, descendant_user_id),

  -- Fast lookup of all descendants for an ancestor
  INDEX idx_chain_ancestor (program_id, ancestor_user_id, depth),

  -- Fast lookup of all ancestors for a descendant
  INDEX idx_chain_descendant (program_id, descendant_user_id),

  -- Track back to original invite/conversion
  INDEX idx_chain_root_conversion (root_conversion_id),
  INDEX idx_chain_root_invite (root_invite_id)
);
```

---

## Example Data: User A → User B → User C

### When User B signs up (referred by User A):

```sql
-- Direct relationship: User A is ancestor of User B at depth 1
INSERT INTO referral_chain (program_id, ancestor_user_id, descendant_user_id, depth, root_invite_id, root_conversion_id)
VALUES (1, 100, 200, 1, 1, 1);  -- User A(100) → User B(200), depth=1
```

### When User C signs up (referred by User B):

```sql
-- Two relationships are created:

-- 1. Direct: User B is ancestor of User C at depth 1
INSERT INTO referral_chain (program_id, ancestor_user_id, descendant_user_id, depth, root_invite_id, root_conversion_id)
VALUES (1, 200, 300, 1, 5, 5);  -- User B(200) → User C(300), depth=1

-- 2. Indirect: User A is ancestor of User C at depth 2
INSERT INTO referral_chain (program_id, ancestor_user_id, descendant_user_id, depth, root_invite_id, root_conversion_id)
VALUES (1, 100, 300, 2, 1, 5);  -- User A(100) → User C(300), depth=2 (via User B)
```

### When User D signs up (referred by User C):

```sql
-- Three relationships are created:

-- 1. Direct: User C is ancestor of User D at depth 1
INSERT INTO referral_chain (program_id, ancestor_user_id, descendant_user_id, depth, root_invite_id, root_conversion_id)
VALUES (1, 300, 400, 1, 10, 10);  -- User C(300) → User D(400), depth=1

-- 2. Indirect: User B is ancestor of User D at depth 2
INSERT INTO referral_chain (program_id, ancestor_user_id, descendant_user_id, depth, root_invite_id, root_conversion_id)
VALUES (1, 200, 400, 2, 5, 10);   -- User B(200) → User D(400), depth=2 (via User C)

-- 3. Indirect: User A is ancestor of User D at depth 3
INSERT INTO referral_chain (program_id, ancestor_user_id, descendant_user_id, depth, root_invite_id, root_conversion_id)
VALUES (1, 100, 400, 3, 1, 10);   -- User A(100) → User D(400), depth=3 (via User B, User C)
```

---

## Current Implementation Status

### ✅ **What Exists:**
- `referral_chain` table (entity defined)
- Database indexes for efficient queries
- Schema for tracking multi-level relationships

### ❌ **What's Missing (TODO):**
- `ReferralChainService.buildChain()` method
- Automatic chain building when conversion occurs
- Commission calculation based on depth
- Commission rule configuration (% per depth level)

### 📍 **Where to Implement:**

In `src/plugins/referral/services/referral.workflow.service.ts` line 554:
```typescript
// TODO: Call ReferralChainService.buildChain (lines 1220-1228)
// This would be implemented in a separate service
```

---

## Implementation Guide

### Step 1: Create `ReferralChainService`

```typescript
// src/plugins/referral/services/referral-chain.service.ts

import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { ReferralChainRepository } from '../repositories/referral-chain.repo';
import { ReferralConversionRepository } from '../repositories/referral-conversion.repo';

@Injectable()
export class ReferralChainService {
  constructor(
    private readonly chainRepo: ReferralChainRepository,
    private readonly conversionRepo: ReferralConversionRepository,
  ) {}

  /**
   * Build referral chain when a new conversion occurs
   *
   * Example:
   * - User A invites User B (conversion_id=1)
   * - User B invites User C (conversion_id=5)
   *
   * When User C converts, create:
   * 1. User B → User C (depth=1, direct)
   * 2. User A → User C (depth=2, indirect via User B)
   */
  async buildChain(
    conversion_id: number,
    queryRunner: QueryRunner,
  ): Promise<void> {
    // 1. Get the conversion details
    const conversion = await this.conversionRepo.findById(conversion_id, queryRunner);
    if (!conversion) {
      throw new Error(`Conversion ${conversion_id} not found`);
    }

    // 2. Get the invite that led to this conversion
    const invite = await this.inviteRepo.findById(conversion.invite_id, queryRunner);

    // 3. Create direct relationship (depth=1)
    await this.chainRepo.upsert({
      program_id: conversion.program_id,
      ancestor_user_id: invite.referrer_user_id,
      descendant_user_id: conversion.referred_user_id,
      depth: 1,
      root_invite_id: conversion.invite_id,
      root_conversion_id: conversion.id,
    }, queryRunner);

    // 4. Find all ancestors of the referrer (User B's ancestors)
    const ancestorChains = await this.chainRepo.findByDescendant(
      conversion.program_id,
      invite.referrer_user_id,
      queryRunner,
    );

    // 5. Create indirect relationships (depth=2, 3, 4, etc.)
    for (const ancestorChain of ancestorChains) {
      await this.chainRepo.upsert({
        program_id: conversion.program_id,
        ancestor_user_id: ancestorChain.ancestor_user_id,
        descendant_user_id: conversion.referred_user_id,
        depth: ancestorChain.depth + 1,
        root_invite_id: ancestorChain.root_invite_id,
        root_conversion_id: conversion.id,
      }, queryRunner);
    }
  }

  /**
   * Get all users who should receive commission when a user makes a purchase
   *
   * Returns array of { user_id, depth } sorted by depth (closest first)
   */
  async getCommissionEligibleAncestors(
    program_id: number,
    user_id: number,
    max_depth: number = 3,
    queryRunner?: QueryRunner,
  ): Promise<Array<{ user_id: number; depth: number }>> {
    const chains = await this.chainRepo.findAncestors(
      program_id,
      user_id,
      max_depth,
      queryRunner,
    );

    return chains.map(chain => ({
      user_id: chain.ancestor_user_id,
      depth: chain.depth,
    }));
  }
}
```

### Step 2: Create `ReferralChainRepository`

```typescript
// src/plugins/referral/repositories/referral-chain.repo.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ReferralChain } from '../entities/referral-chain.entity';

@Injectable()
export class ReferralChainRepository {
  constructor(
    @InjectRepository(ReferralChain)
    private readonly repo: Repository<ReferralChain>,
  ) {}

  /**
   * Find all ancestors of a user (users who referred them)
   */
  async findAncestors(
    program_id: number,
    descendant_user_id: number,
    max_depth?: number,
    queryRunner?: QueryRunner,
  ): Promise<ReferralChain[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const query = manager
      .createQueryBuilder(ReferralChain, 'rc')
      .where('rc.program_id = :program_id', { program_id })
      .andWhere('rc.descendant_user_id = :descendant_user_id', { descendant_user_id })
      .orderBy('rc.depth', 'ASC');

    if (max_depth) {
      query.andWhere('rc.depth <= :max_depth', { max_depth });
    }

    return query.getMany();
  }

  /**
   * Find all descendants of a user (users they referred)
   */
  async findDescendants(
    program_id: number,
    ancestor_user_id: number,
    max_depth?: number,
    queryRunner?: QueryRunner,
  ): Promise<ReferralChain[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const query = manager
      .createQueryBuilder(ReferralChain, 'rc')
      .where('rc.program_id = :program_id', { program_id })
      .andWhere('rc.ancestor_user_id = :ancestor_user_id', { ancestor_user_id })
      .orderBy('rc.depth', 'ASC');

    if (max_depth) {
      query.andWhere('rc.depth <= :max_depth', { max_depth });
    }

    return query.getMany();
  }

  /**
   * Upsert chain entry (idempotent)
   */
  async upsert(
    data: Partial<ReferralChain>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const fields = Object.keys(data).filter((k) => k !== 'id' && data[k] !== undefined);
    const values = fields.map((k) => {
      const value = data[k];
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
      if (value === null) return 'NULL';
      if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
      return String(value);
    });

    const fieldList = fields.join(', ');
    const valueList = values.join(', ');
    const updateList = fields
      .filter((k) => !['program_id', 'ancestor_user_id', 'descendant_user_id'].includes(k))
      .map((k) => `${k}=VALUES(${k})`)
      .join(', ');

    const sql = `
      INSERT INTO referral_chain (${fieldList})
      VALUES (${valueList})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)${updateList ? ', ' + updateList : ''}
    `;

    const result = await manager.query(sql);
    return result.insertId;
  }
}
```

### Step 3: Update `ReferralWorkflowService.createReferralConversion()`

```typescript
// Replace the TODO at line 554

// Build referral chain (multi-level tracking)
await this.referralChainService.buildChain(conversionId, queryRunner);
```

### Step 4: Commission Rule Configuration

Add depth-based commission rules to `commission_rule`:

```sql
-- Example: 3-level deep commissions

-- Level 1 (Direct referral): 25%
INSERT INTO commission_rule (program_id, code, name, rate_pct, meta_json)
VALUES (1, 'REFERRAL_L1', 'Direct Referral Commission', 25.00, '{"depth":1}');

-- Level 2 (Indirect via 1 person): 10%
INSERT INTO commission_rule (program_id, code, name, rate_pct, meta_json)
VALUES (1, 'REFERRAL_L2', 'Indirect Referral L2 Commission', 10.00, '{"depth":2}');

-- Level 3 (Indirect via 2 people): 5%
INSERT INTO commission_rule (program_id, code, name, rate_pct, meta_json)
VALUES (1, 'REFERRAL_L3', 'Indirect Referral L3 Commission', 5.00, '{"depth":3}');
```

### Step 5: Process Multi-Level Commissions

```typescript
// When User D makes a purchase, credit all ancestors

async processReferralPurchase(user_id: number, purchase_amount: number) {
  // Get all ancestors who should receive commission
  const ancestors = await this.chainService.getCommissionEligibleAncestors(
    program_id,
    user_id,
    3, // Max 3 levels deep
  );

  for (const ancestor of ancestors) {
    // Get commission rule for this depth level
    const rule = await this.ruleRepo.findByDepth(program_id, ancestor.depth);

    // Calculate commission
    const commission_amount = purchase_amount * (rule.rate_pct / 100);

    // Record accrual
    await this.workflowService.recordAccrual({
      program_id: program_id,
      participant_id: ancestor.user_id,
      rule_id: rule.id,
      accrual_type: 'one_time',
      amount: commission_amount,
      base_amount: purchase_amount,
      rate_pct: rule.rate_pct,
      source_ref_type: 'user_purchase',
      source_ref_id: String(user_id),
      meta_json: {
        depth: ancestor.depth,
        referred_user_id: user_id,
      },
      idempotency_key: `purchase-${user_id}-${ancestor.user_id}`,
    });
  }
}
```

---

## Query Examples

### Get all descendants of User A (entire downline)

```sql
SELECT
  rc.descendant_user_id,
  rc.depth,
  u.username,
  COUNT(*) OVER (PARTITION BY rc.depth) as count_at_depth
FROM referral_chain rc
JOIN users u ON u.id = rc.descendant_user_id
WHERE rc.program_id = 1
  AND rc.ancestor_user_id = 100  -- User A
ORDER BY rc.depth ASC, rc.created_at ASC;
```

Result:
```
descendant_user_id | depth | username | count_at_depth
-------------------|-------|----------|---------------
200                | 1     | user_b   | 1
300                | 2     | user_c   | 1
400                | 3     | user_d   | 1
```

### Get all ancestors of User D (entire upline)

```sql
SELECT
  rc.ancestor_user_id,
  rc.depth,
  u.username
FROM referral_chain rc
JOIN users u ON u.id = rc.ancestor_user_id
WHERE rc.program_id = 1
  AND rc.descendant_user_id = 400  -- User D
ORDER BY rc.depth ASC;
```

Result:
```
ancestor_user_id | depth | username
-----------------|-------|----------
300              | 1     | user_c
200              | 2     | user_b
100              | 3     | user_a
```

### Get total network size for User A

```sql
SELECT
  rc.depth,
  COUNT(*) as count
FROM referral_chain rc
WHERE rc.program_id = 1
  AND rc.ancestor_user_id = 100  -- User A
GROUP BY rc.depth
ORDER BY rc.depth ASC;
```

Result:
```
depth | count
------|------
1     | 1     (User B - direct)
2     | 1     (User C - via User B)
3     | 1     (User D - via User B, User C)
```

### Calculate total earnings for User A from entire network

```sql
SELECT
  SUM(ca.amount) as total_earnings,
  COUNT(*) as accrual_count
FROM commission_accrual ca
WHERE ca.program_id = 1
  AND ca.participant_id = (
    SELECT id FROM commission_participant
    WHERE program_id = 1 AND participant_id = 100
  )
  AND ca.status = 'accrued';
```

---

## Testing Multi-Level Referrals

### Test Scenario:

1. **User A creates referral code**
2. **User B signs up with User A's code**
3. **User B creates referral code**
4. **User C signs up with User B's code**
5. **User C makes a purchase**

**Expected Result:**
- User B gets 25% commission (direct referral)
- User A gets 10% commission (indirect referral)

### Verification Queries:

```sql
-- Check referral chain was built correctly
SELECT * FROM referral_chain WHERE program_id = 1;

-- Check commissions were recorded
SELECT * FROM commission_accrual WHERE program_id = 1;

-- Check wallet balances
SELECT * FROM wallet_balance WHERE wallet_id IN (
  SELECT wallet_id FROM commission_participant WHERE program_id = 1
);
```

---

## Configuration: Max Depth Limit

To prevent infinite chains (pyramid schemes), configure max depth:

```typescript
// In commission program meta_json
{
  "max_referral_depth": 3,  // Max 3 levels deep
  "commission_rates": {
    "1": 25,  // Direct: 25%
    "2": 10,  // 1 level removed: 10%
    "3": 5    // 2 levels removed: 5%
  }
}
```

---

## Summary

### Current Answer to Your Question:

**YES, User A will get commission when User B refers User C** - but only after you implement `ReferralChainService.buildChain()`.

### What Needs to Be Implemented:

1. ✅ Database schema exists (`referral_chain` table)
2. ❌ `ReferralChainService` - Build chain on conversion
3. ❌ `ReferralChainRepository` - Query ancestors/descendants
4. ❌ Commission processing for multiple levels
5. ❌ Commission rules per depth level

### Implementation Priority:

1. **High Priority:** `ReferralChainService.buildChain()` - Core functionality
2. **High Priority:** Multi-level commission processing
3. **Medium Priority:** Admin UI to configure depth limits
4. **Low Priority:** Analytics dashboard showing referral trees

---

## Related Documentation

- [Commission Outbox Integration](./COMMISSION-OUTBOX-INTEGRATION.md)
- [Commission Events Reference](./COMMISSION-EVENTS-REFERENCE.md)
- [API Endpoints Reference](./API-ENDPOINTS-REFERENCE.md)
