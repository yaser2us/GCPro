# Postman Collections for GCPro

This directory contains Postman collections for testing the GCPro API.

---

## Collections

### 1. **wallet-api.postman_collection.json**
Complete wallet API collection with all endpoints.

**Includes:**
- Account creation
- Wallet management
- Deposit/Withdraw operations
- Balance queries
- Transaction history
- Error case testing
- Idempotency verification

**Sections:**
1. Account Management (3 requests)
2. Wallet Management (3 requests)
3. Deposit Operations (3 requests)
4. Withdraw Operations (3 requests)
5. Balance & Transactions (4 requests)
6. Error Cases (5 requests)
7. Idempotency Tests (2 requests)

**Total:** 23 requests

---

### 2. **mission-to-coins-workflow.postman_collection.json** ⭐
End-to-end workflow demonstrating the outbox pattern.

**Flow:**
1. Create Mission Definition (50 COIN reward)
2. Assign Mission to User
3. User Submits Mission
4. Admin Approves Submission
5. ✨ **Event-driven magic happens** ✨
   - MISSION_REWARD_GRANTED → outbox
   - Outbox processor → wallet consumer
   - Wallet auto-credits 50 COIN
6. Check Wallet Balance (coins appear!)
7. View Transaction History
8. Verify Reward Grant Linkage
9. View Mission Events

**Total:** 9 requests (run in sequence)

---

## Quick Start

### Method 1: Collection Runner (Recommended) ⭐

**Run the complete mission-to-coins workflow:**

1. Import both collections into Postman
2. Select "Mission-to-Coins Workflow" collection
3. Click "▶ Run" button
4. In Collection Runner:
   - ✅ Select all requests
   - Set delay: 1000ms (1 second between requests)
   - Click "Run Mission-to-Coins Workflow"
5. Watch the console output! 🎉

**Expected Results:**
- ✅ All tests pass
- 💰 Balance shows 50 COIN
- 📜 Transaction history shows mission_reward
- 🔗 Reward linked to ledger

### Method 2: Manual Step-by-Step

Run each request individually to observe the flow.

---

## Environment Setup

Both collections use these variables (already configured):

```
base_url = http://localhost:3000
admin_user_id = 1
test_user_id = 2
```

No additional setup needed! The collections manage all other variables automatically.

---

## What You'll See

### Console Output During Workflow

```
🎯 MISSION CREATED
Mission ID: 123
Reward: 50 COIN

👤 MISSION ASSIGNED
Assignment ID: 456
User ID: 2

📝 MISSION SUBMITTED
Submission ID: 789

✅ SUBMISSION APPROVED
✨ MAGIC HAPPENING NOW...
1. MISSION_REWARD_GRANTED event → outbox
2. Outbox processor delivers event
3. Wallet consumer credits 50 COIN

💰 WALLET BALANCE:
   Available:    50.00 COIN
   Total:        50.00 COIN

📜 TRANSACTION HISTORY:
Transaction #1:
  Type: mission_reward
  ⭐ THIS IS THE MISSION REWARD! ⭐

🎉 SUCCESS! COINS IN WALLET! 🎉
```

Open **View → Show Postman Console** to see detailed logs!

---

## How the Outbox Pattern Works

```
┌─────────────────┐
│ Missions Plugin │
└────────┬────────┘
         │ 1. Create mission_reward_grant
         │ 2. EMIT event to outbox table
         ↓
    ┌─────────┐
    │ Outbox  │ ← Event stored here
    └────┬────┘
         │ 3. Outbox processor polls
         ↓
┌──────────────────┐
│ Wallet Consumer  │
└────────┬─────────┘
         │ 4. Read mission_reward_grant
         │ 5. Auto-create account/wallet
         │ 6. Create ledger_txn (double-entry)
         │ 7. Credit 50 COIN
         │ 8. Update balance_snapshot
         ↓
    💰 Coins in wallet!
```

**Benefits:**
- ✅ Decoupled services
- ✅ Reliable delivery
- ✅ Idempotent operations
- ✅ Complete audit trail

---

## Database Verification

After running the workflow:

```sql
-- Check reward grant
SELECT * FROM mission_reward_grant WHERE id = {reward_grant_id};
-- Should show: ref_type='ledger_txn', ref_id={txn_id}

-- Check ledger transaction
SELECT * FROM ledger_txn WHERE ref_type = 'mission_reward_grant';

-- Check double-entry ledger (debits = credits)
SELECT * FROM ledger_entry WHERE txn_id = {ledger_txn_id};
-- Should show:
--   Debit:  account_id=1 (system), amount=50, direction='debit'
--   Credit: account_id=X (user),   amount=50, direction='credit'

-- Check balance
SELECT * FROM wallet_balance_snapshot WHERE wallet_id = {wallet_id};
-- Should show: total_amount='50.00'

-- Check outbox events
SELECT * FROM outbox WHERE event_name = 'MISSION_REWARD_GRANTED';
```

---

## Troubleshooting

### Balance doesn't show coins?

1. Wait 3-5 seconds for async processing
2. Check outbox table: `SELECT * FROM outbox ORDER BY created_at DESC LIMIT 5;`
3. Check app logs for errors
4. Verify person record exists for user_id

### WALLET_NOT_FOUND error?

- Wallet is auto-created on first mission reward
- Make sure mission approval completed
- Check if event was processed in outbox

### Permission denied?

- Admin operations need `X-User-Role: ADMIN`
- User operations need `X-User-Role: USER`
- Collections set this automatically

---

## Testing Individual Wallet Endpoints

### Basic Flow

1. **Create Account** → `POST /v1/accounts`
2. **Create Wallet** → `POST /v1/wallets`
3. **Deposit** → `POST /v1/wallets/{id}/deposit`
4. **Check Balance** → `GET /v1/wallets/{id}/balance`
5. **Withdraw** → `POST /v1/wallets/{id}/withdraw`
6. **View Transactions** → `GET /v1/wallets/{id}/transactions`

### Error Testing

Test validation and guards:
- Missing required fields
- Negative amounts
- Insufficient balance
- Invalid wallet IDs
- Non-existent accounts

See "Error Cases" folder in wallet-api collection.

### Idempotency Testing

Test safe retries:
- Create same wallet twice → returns same wallet_id
- Same deposit with same key → balance only increases once
- Mission rewards → auto-idempotent via reward_grant_id

See "Idempotency Tests" folder in wallet-api collection.

---

## Advanced Scenarios

### Multiple Missions Per User

Run the workflow multiple times:
- Each creates a new mission
- All assign to same user
- Complete all missions
- Balance grows: 50 + 50 + 50 = 150 COIN!

### High-Value Rewards

Modify mission creation:
```json
{
  "reward_json": {
    "amount": 1000,  // Change to 1000
    "currency": "COIN"
  }
}
```

### Parallel Testing

Use Collection Runner:
- Set iterations: 10
- Enable "Keep variable values"
- Creates 10 missions with 10 rewards!

---

## Related Documentation

- **Wallet Plugin:** `src/plugins/wallet/README.md`
- **Wallet Spec:** `specs/wallet/wallet.pillar.v2.yml`
- **Mission Spec:** `specs/mission/missions.pillar.v2.yml`
- **Database DDL:** `docs/database/FULL-DDL.md`

---

## Summary

✅ **23 wallet API requests** - Complete CRUD operations
✅ **9-step workflow** - End-to-end outbox pattern demo
✅ **Auto-variables** - No manual configuration needed
✅ **Rich console output** - Detailed flow visibility
✅ **Error testing** - Validation and guards
✅ **Idempotency** - Safe retry mechanisms
✅ **Audit trail** - Double-entry ledger + events

**🎉 Heheheh, coins in wallet! 🪙**

Enjoy testing the event-driven architecture!
