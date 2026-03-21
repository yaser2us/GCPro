# Commission-Wallet Integration Testing Guide

## Overview

This guide shows how to test the complete **Referral → Commission → Wallet** flow to verify that:
1. Users who refer others earn commission
2. Commission accruals credit participant wallets automatically
3. Multi-level referral chains distribute commissions correctly
4. Wallet balances update properly

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│ COMPLETE REFERRAL-COMMISSION-WALLET FLOW                            │
└──────────────────────────────────────────────────────────────────────┘

User A refers User B
       │
       ├─→ REFERRAL_CONVERSION_CREATED (referral pillar)
       │
       └─→ ReferralChainConsumer builds chain (A → B, depth=1)
              │
              └─→ [Manual trigger] RecordAccrual API call
                     │
                     ├─→ Create commission_accrual record
                     │
                     └─→ ACCRUAL_RECORDED event (outbox_event)
                            │
                            └─→ OutboxPublisher publishes to EventBus
                                   │
                                   └─→ CommissionAccrualConsumer
                                          │
                                          ├─→ Create ledger_txn (credit)
                                          │
                                          └─→ Update wallet_balance +25 COIN
```

## Test Scenario: Multi-Level Referral Commission

### Setup

**Users:**
- Admin (ID: 999)
- User A (ID: 100) - First referrer
- User B (ID: 200) - Referred by A, refers C
- User C (ID: 300) - Referred by B

**Commission Rules:**
- Level 1 (direct): 25% commission
- Level 2 (indirect): 10% commission

**Expected Results:**
- User B refers User C, User C makes $100 purchase
- User B earns: $100 × 25% = $25 (level 1)
- User A earns: $100 × 10% = $10 (level 2 via B)

---

## Step-by-Step Test

### STEP 1: Create Commission Program

```bash
curl -X POST http://localhost:3000/api/commission/programs \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 999" \
  -H "X-User-Role: admin" \
  -H "Idempotency-Key: create-program-001" \
  -d '{
    "code": "REFERRAL_COMMISSION_V2",
    "name": "Referral Commission Program",
    "currency": "COIN",
    "settlement_cycle": "monthly",
    "meta_json": {
      "max_referral_depth": 3
    }
  }'
```

**Expected Response:**
```json
{
  "program_id": 1
}
```

**Verification:**
```sql
SELECT * FROM commission_program WHERE code = 'REFERRAL_COMMISSION_V2';
```

---

### STEP 2: Create Commission Rules

**Level 1 Rule (25%):**
```bash
curl -X POST http://localhost:3000/api/commission/programs/1/rules \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 999" \
  -H "X-User-Role: admin" \
  -H "Idempotency-Key: create-rule-level1" \
  -d '{
    "rule_type": "percentage",
    "conditions": {
      "referral_level": 1
    },
    "rate_pct": 25.00,
    "meta_json": {
      "description": "Direct referral commission"
    }
  }'
```

**Level 2 Rule (10%):**
```bash
curl -X POST http://localhost:3000/api/commission/programs/1/rules \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 999" \
  -H "X-User-Role: admin" \
  -H "Idempotency-Key: create-rule-level2" \
  -d '{
    "rule_type": "percentage",
    "conditions": {
      "referral_level": 2
    },
    "rate_pct": 10.00,
    "meta_json": {
      "description": "Indirect referral commission (2 levels deep)"
    }
  }'
```

**Verification:**
```sql
SELECT id, rule_type, rate_pct FROM commission_rule WHERE program_id = 1;
```

---

### STEP 3: Enroll Participants (User A and User B)

**Enroll User A (ID: 100):**
```bash
curl -X POST http://localhost:3000/api/commission/programs/1/participants \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 999" \
  -H "X-User-Role: admin" \
  -H "Idempotency-Key: enroll-user-a" \
  -d '{
    "participant_type": "user",
    "participant_id": 100,
    "wallet_id": 1000,
    "meta_json": {
      "username": "user_a"
    }
  }'
```

**Enroll User B (ID: 200):**
```bash
curl -X POST http://localhost:3000/api/commission/programs/1/participants \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 999" \
  -H "X-User-Role: admin" \
  -H "Idempotency-Key: enroll-user-b" \
  -d '{
    "participant_type": "user",
    "participant_id": 200,
    "wallet_id": 2000,
    "meta_json": {
      "username": "user_b"
    }
  }'
```

**Verification:**
```sql
SELECT id, participant_type, participant_id, wallet_id, status
FROM commission_participant
WHERE program_id = 1;

-- Expected:
-- id | participant_type | participant_id | wallet_id | status
-- 1  | user             | 100            | 1000      | active
-- 2  | user             | 200            | 2000      | active
```

---

### STEP 4: Create Referral Chain (A → B → C)

**User A refers User B:**
```bash
# Already done via referral V2 API in e2e-referral-commission-workflow.postman_collection.json
# Referral chain: A → B (depth=1)
```

**User B refers User C:**
```bash
# Create User B's referral code
curl -X POST http://localhost:3000/v2/referral/codes \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 200" \
  -H "X-User-Role: user" \
  -H "Idempotency-Key: code-user-b-001" \
  -d '{
    "program_id": 1
  }'

# Create invite for User C
curl -X POST http://localhost:3000/v2/referral/invites \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 200" \
  -H "Idempotency-Key: invite-b-to-c" \
  -d '{
    "program_id": 1,
    "referral_code_id": <code_id_from_previous_step>,
    "channel_type": "email",
    "channel_value": "userC@example.com"
  }'

# User C converts (signs up)
curl -X POST http://localhost:3000/v2/referral/conversions \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 999" \
  -H "Idempotency-Key: conversion-user-c" \
  -d '{
    "invite_token": "<token_from_previous_step>",
    "referred_user_id": 300
  }'
```

**Verification:**
```sql
SELECT ancestor_user_id, descendant_user_id, depth
FROM referral_chain
WHERE program_id = 1
ORDER BY depth, ancestor_user_id;

-- Expected:
-- ancestor | descendant | depth
-- 100      | 200        | 1     (A → B)
-- 200      | 300        | 1     (B → C)
-- 100      | 300        | 2     (A → C via B)
```

---

### STEP 5: Record Commission Accruals

**User C makes $100 purchase → Calculate commissions for User B and User A**

**User B Commission (Level 1, 25%):**
```bash
curl -X POST http://localhost:3000/api/commission/programs/1/accruals \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 999" \
  -H "X-User-Role: admin" \
  -H "Idempotency-Key: accrual-userb-from-userc" \
  -d '{
    "participant_id": 2,
    "rule_id": 1,
    "accrual_type": "recurring",
    "currency": "COIN",
    "base_amount": 100.00,
    "rate_pct": 25.00,
    "amount": 25.00,
    "source_ref_type": "referral_conversion",
    "source_ref_id": "300",
    "meta_json": {
      "conversion_id": 3,
      "referred_user_id": 300,
      "level": 1
    }
  }'
```

**Expected Response:**
```json
{
  "accrual_id": 1
}
```

**User A Commission (Level 2, 10%):**
```bash
curl -X POST http://localhost:3000/api/commission/programs/1/accruals \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 999" \
  -H "X-User-Role: admin" \
  -H "Idempotency-Key: accrual-usera-from-userc" \
  -d '{
    "participant_id": 1,
    "rule_id": 2,
    "accrual_type": "recurring",
    "currency": "COIN",
    "base_amount": 100.00,
    "rate_pct": 10.00,
    "amount": 10.00,
    "source_ref_type": "referral_conversion",
    "source_ref_id": "300",
    "meta_json": {
      "conversion_id": 3,
      "referred_user_id": 300,
      "level": 2
    }
  }'
```

**Expected Response:**
```json
{
  "accrual_id": 2
}
```

**Verification (Commission Accruals Created):**
```sql
SELECT id, participant_id, amount, currency, status
FROM commission_accrual
WHERE program_id = 1;

-- Expected:
-- id | participant_id | amount | currency | status
-- 1  | 2              | 25.00  | COIN     | accrued
-- 2  | 1              | 10.00  | COIN     | accrued
```

**Verification (Events Emitted to Outbox):**
```sql
SELECT id, event_name, aggregate_id, payload
FROM outbox_event
WHERE event_name = 'ACCRUAL_RECORDED'
ORDER BY id DESC
LIMIT 2;

-- Expected:
-- Two ACCRUAL_RECORDED events with accrual_id 1 and 2
```

---

### STEP 6: Verify Wallet Credits (Automatic via Event Consumer)

**Wait 5-10 seconds for OutboxPublisher to process events**

The `CommissionAccrualConsumer` should automatically:
1. Listen to `ACCRUAL_RECORDED` events
2. Credit participant wallets
3. Create ledger transactions

**Verification (Ledger Transactions Created):**
```sql
SELECT id, account_id, txn_type, amount, currency, ref_type, ref_id
FROM ledger_txn
WHERE ref_type = 'commission_accrual'
ORDER BY id DESC
LIMIT 2;

-- Expected:
-- id | account_id | txn_type | amount | currency | ref_type            | ref_id
-- 1  | 2000       | credit   | 25.00  | COIN     | commission_accrual  | 1
-- 2  | 1000       | credit   | 10.00  | COIN     | commission_accrual  | 2
```

**Verification (Wallet Balances Updated):**
```sql
SELECT wallet_id, available_amount, total_amount
FROM wallet_balance
WHERE wallet_id IN (1000, 2000);

-- Expected:
-- wallet_id | available_amount | total_amount
-- 1000      | 10.00            | 10.00       (User A)
-- 2000      | 25.00            | 25.00       (User B)
```

**Verification (Outbox Consumer Status):**
```sql
SELECT consumer_name, event_id, status
FROM outbox_event_consumer
WHERE consumer_name = 'CommissionAccrualConsumer'
ORDER BY event_id DESC
LIMIT 2;

-- Expected:
-- consumer_name             | event_id | status
-- CommissionAccrualConsumer | 1        | success
-- CommissionAccrualConsumer | 2        | success
```

---

### STEP 7: Test Idempotency (Retry Same Event)

**Manually trigger same event again:**
```bash
# Republish the same accrual event (simulate retry)
# This should NOT create duplicate wallet credits
```

**Verification:**
```sql
-- Should still be only 2 ledger transactions (no duplicates)
SELECT COUNT(*) FROM ledger_txn WHERE ref_type = 'commission_accrual';
-- Expected: 2

-- Wallet balances should NOT change
SELECT wallet_id, available_amount
FROM wallet_balance
WHERE wallet_id IN (1000, 2000);
-- Expected:
-- 1000 | 10.00 (unchanged)
-- 2000 | 25.00 (unchanged)
```

---

### STEP 8: Test Accrual Void (Reversal)

**Scenario: User C's conversion is fraudulent, void the accrual**

```bash
curl -X POST http://localhost:3000/api/commission/programs/1/accruals/1/void \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 999" \
  -H "X-User-Role: admin" \
  -H "Idempotency-Key: void-accrual-1" \
  -d '{
    "reason": "Fraudulent conversion detected"
  }'
```

**Expected Response:**
```json
{
  "success": true
}
```

**Verification (Commission Accrual Voided):**
```sql
SELECT id, status FROM commission_accrual WHERE id = 1;
-- Expected: status = 'voided'
```

**Verification (ACCRUAL_VOIDED Event Emitted):**
```sql
SELECT event_name, payload
FROM outbox_event
WHERE event_name = 'ACCRUAL_VOIDED'
ORDER BY id DESC
LIMIT 1;

-- Expected: payload contains accrual_id=1, original_amount=25.00
```

**Verification (Wallet Debited via Consumer):**
```sql
-- Wait 5-10 seconds for event processing

-- Reversal transaction should be created
SELECT id, account_id, txn_type, amount, ref_type, ref_id
FROM ledger_txn
WHERE ref_type = 'commission_accrual_void'
ORDER BY id DESC
LIMIT 1;

-- Expected:
-- id | account_id | txn_type | amount | ref_type                 | ref_id
-- 3  | 2000       | debit    | 25.00  | commission_accrual_void  | 1

-- User B wallet should be debited
SELECT wallet_id, available_amount
FROM wallet_balance
WHERE wallet_id = 2000;

-- Expected:
-- wallet_id | available_amount
-- 2000      | 0.00  (25.00 - 25.00 = 0.00)
```

---

## Test Checklist

### Commission Pillar
- [ ] Create commission program
- [ ] Create commission rules (level 1: 25%, level 2: 10%)
- [ ] Enroll participants (User A, User B)
- [ ] Record accruals manually
- [ ] ACCRUAL_RECORDED events emitted to outbox
- [ ] ACCRUAL_VOIDED events emitted on void

### Wallet Pillar
- [ ] CommissionAccrualConsumer registered and listening
- [ ] Wallet credited automatically on ACCRUAL_RECORDED
- [ ] Ledger transactions created with ref_type='commission_accrual'
- [ ] Wallet balances updated correctly
- [ ] Idempotency works (no duplicate credits)
- [ ] Wallet debited on ACCRUAL_VOIDED
- [ ] Insufficient balance handled gracefully

### Referral Chain
- [ ] Multi-level chain built (A → B → C)
- [ ] Chain depth calculated correctly
- [ ] Commission distributed to all levels

---

## Troubleshooting

### Issue: Wallet Not Credited

**Possible Causes:**
1. CommissionAccrualConsumer not registered
2. OutboxPublisher not running
3. Event not published to outbox
4. Participant has no wallet_id

**Debug Steps:**
```sql
-- Check if consumer is registered
SELECT * FROM outbox_event_consumer WHERE consumer_name = 'CommissionAccrualConsumer';

-- Check if event was published
SELECT * FROM outbox_event WHERE event_name = 'ACCRUAL_RECORDED' ORDER BY id DESC LIMIT 5;

-- Check participant wallet_id
SELECT id, participant_id, wallet_id FROM commission_participant WHERE id = 1;

-- Check server logs
tail -f /tmp/gcpro-server.log | grep CommissionAccrualConsumer
```

### Issue: Duplicate Wallet Credits

**Possible Cause:** Idempotency not working

**Debug Steps:**
```sql
-- Check ledger transactions for duplicates
SELECT ref_id, COUNT(*) as count
FROM ledger_txn
WHERE ref_type = 'commission_accrual'
GROUP BY ref_id
HAVING count > 1;

-- Check idempotency key uniqueness
SELECT idempotency_key, COUNT(*) as count
FROM ledger_txn
GROUP BY idempotency_key
HAVING count > 1;
```

### Issue: ACCRUAL_VOIDED Not Reversing Wallet

**Possible Causes:**
1. Insufficient balance
2. Original transaction not found
3. Consumer error

**Debug Steps:**
```sql
-- Check wallet balance
SELECT * FROM wallet_balance WHERE wallet_id = 2000;

-- Check if original transaction exists
SELECT * FROM ledger_txn
WHERE ref_type = 'commission_accrual' AND ref_id = '1';

-- Check consumer error logs
SELECT * FROM outbox_event_consumer
WHERE consumer_name = 'CommissionAccrualConsumer' AND status = 'failed';
```

---

## Success Criteria

✅ **Complete Success** when:
1. User B earns 25 COIN commission (level 1)
2. User A earns 10 COIN commission (level 2)
3. Wallet balances reflect correct amounts
4. Ledger transactions created with proper ref_type
5. Idempotency prevents duplicate credits
6. Accrual void reverses wallet balance
7. All consumer statuses are 'success'

---

## Related Documentation

- [Commission Pillar YML](../specs/commission/commission.pillar.v2.yml)
- [Commission-Outbox Integration](./COMMISSION-OUTBOX-INTEGRATION.md)
- [Multi-Level Referrals](./MULTI-LEVEL-REFERRALS.md)
- [Referral V2 API](./REFERRAL-V2-API.md)
