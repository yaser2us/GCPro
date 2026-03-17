# Wallet Plugin

Complete wallet management system with double-entry accounting, event-driven mission rewards, and real-time balance tracking.

**Based on:** `specs/wallet/wallet.pillar.v2.yml`

---

## Overview

The Wallet plugin implements a complete financial ledger system with:

- **Account Management**: User, merchant, and system accounts
- **Wallet Operations**: Multi-currency wallet creation and management
- **Double-Entry Accounting**: Full audit trail with balanced debits/credits
- **Real-time Balances**: Snapshot-based balance tracking
- **Event-Driven Rewards**: Automatic coin crediting from mission completions
- **Idempotent Operations**: Safe retry logic with duplicate key protection

---

## Architecture

### Core Entities

1. **Account** (`account` table)
   - Polymorphic container for users, merchants, system
   - Links to persons via `account_person` join table
   - Owns multiple wallets

2. **Wallet** (`wallet` table)
   - Currency-specific balance holder
   - Types: MAIN, BONUS, SAVINGS
   - Currencies: MYR, USD, COIN
   - Unique per (account_id, currency, wallet_type)

3. **WalletBalanceSnapshot** (`wallet_balance_snapshot` table)
   - Single-row real-time balance per wallet
   - Tracks available, held, and total amounts
   - Timestamp-based snapshot (as_of)

4. **LedgerTxn** (`ledger_txn` table)
   - Transaction header for double-entry accounting
   - Contains type, reference, idempotency_key
   - Parent of multiple ledger entries

5. **LedgerEntry** (`ledger_entry` table)
   - Debit/credit lines for balanced accounting
   - Each transaction has multiple entries
   - Supports principal, fee, tax entry types

6. **AccountPerson** (`account_person` table)
   - Many-to-many linkage between accounts and persons
   - Supports owner and authorized roles

---

## Commands (HTTP Endpoints)

### ACCOUNT.CREATE
**POST /v1/accounts**

Creates a new account.

```typescript
Request:
{
  "type": "user" | "merchant" | "system"
}

Response:
{
  "account_id": 123
}
```

**Permissions:** `wallet:admin`

---

### WALLET.CREATE
**POST /v1/wallets**

Creates a new wallet for an account.

```typescript
Request:
{
  "account_id": "123",
  "wallet_type": "MAIN",  // optional, default: "MAIN"
  "currency": "COIN"      // optional, default: "COIN"
}

Response:
{
  "wallet_id": 456
}
```

**Permissions:** `wallet:admin`, `wallet:manage`
**Idempotency:** UNIQUE(account_id, currency, wallet_type)

---

### WALLET.DEPOSIT
**POST /v1/wallets/:wallet_id/deposit**

Deposits funds into a wallet.

```typescript
Request:
{
  "wallet_id": "456",
  "amount": 100,
  "currency": "COIN",
  "type": "manual_deposit" | "mission_reward" | ...,
  "ref_type": "admin_adjustment",  // optional
  "ref_id": "adj-789",              // optional
  "meta_json": {}                   // optional
}

Response:
{
  "ledger_txn_id": 1011,
  "new_balance": "100.00"
}
```

**Permissions:** `wallet:admin`, `wallet:manage`
**Idempotency:** Via `Idempotency-Key` header

**Double-Entry Flow:**
1. Debit system account (id=1) - money leaving system
2. Credit user account - money arriving to user
3. Update wallet_balance_snapshot

---

### WALLET.WITHDRAW
**POST /v1/wallets/:wallet_id/withdraw**

Withdraws funds from a wallet.

```typescript
Request:
{
  "wallet_id": "456",
  "amount": 50,
  "currency": "COIN",
  "type": "manual_withdrawal",
  "meta_json": {}  // optional
}

Response:
{
  "ledger_txn_id": 1012,
  "new_balance": "50.00"
}
```

**Permissions:** `wallet:admin`, `wallet:manage`
**Idempotency:** Via `Idempotency-Key` header

**Guards:**
- Wallet exists and status='active'
- Amount > 0
- Available balance >= amount

**Double-Entry Flow:**
1. Debit user account - money leaving user
2. Credit system account (id=1) - money returning to system
3. Update wallet_balance_snapshot

---

### WALLET.GET_BALANCE
**GET /v1/wallets/:wallet_id/balance**

Retrieves current wallet balance.

```typescript
Response:
{
  "wallet_id": 456,
  "available_amount": "50.00",
  "held_amount": "0.00",
  "total_amount": "50.00",
  "currency": "COIN",
  "as_of": "2024-01-15T10:30:00.000Z"
}
```

**Permissions:** `wallet:read`

---

### WALLET.GET_TRANSACTIONS
**GET /v1/wallets/:wallet_id/transactions?limit=50&offset=0**

Lists ledger transactions for a wallet.

```typescript
Response:
{
  "items": [
    {
      "id": 1011,
      "type": "manual_deposit",
      "status": "posted",
      "ref_type": "admin_adjustment",
      "ref_id": "adj-789",
      "occurred_at": "2024-01-15T10:30:00.000Z",
      "entries": [...]
    },
    ...
  ]
}
```

**Permissions:** `wallet:read`

---

## Event Consumer

### WALLET.PROCESS_MISSION_REWARD
**Event:** `MISSION_REWARD_GRANTED` (from missions plugin)

Automatically credits wallet when mission is completed.

**Event Payload:**
```typescript
{
  "reward_grant_id": 789,
  "assignment_id": 456,
  "user_id": 123
}
```

**Workflow:**
1. **READ** mission_reward_grant from missions plugin
2. **GUARD** validate reward_grant (status='granted', type='coins', currency='COIN')
3. **READ** account via person linkage: user → person → account_person → account
4. **AUTO_CREATE** account if not exists (links to person)
5. **AUTO_CREATE** wallet if not exists (MAIN wallet, COIN currency)
6. **WRITE** ledger_txn with idempotency_key='mission_reward_{reward_grant_id}'
7. **WRITE** ledger_entry (debit system, credit user)
8. **UPDATE** wallet_balance_snapshot (increment available amount)
9. **UPDATE** mission_reward_grant.ref_type='ledger_txn', ref_id={txn_id}
10. **EMIT** WALLET_CREDITED event

**Idempotency:**
- Ledger transaction has UNIQUE(idempotency_key)
- Safe to retry on failure
- Returns early if already processed

**Error Handling:**
- Reward grant not found → NotFoundException
- Invalid reward type/currency → BadRequestException
- User not found → Creates account + wallet automatically
- Duplicate processing → Returns existing transaction

---

## Events Emitted

### ACCOUNT_CREATED
Emitted when a new account is created.

```typescript
{
  "account_id": 123,
  "type": "user",
  "status": "active"
}
```

---

### WALLET_CREATED
Emitted when a new wallet is created.

```typescript
{
  "wallet_id": 456,
  "account_id": 123,
  "wallet_type": "MAIN",
  "currency": "COIN"
}
```

---

### WALLET_CREDITED
Emitted when funds are deposited into a wallet.

```typescript
{
  "wallet_id": 456,
  "ledger_txn_id": 1011,
  "amount": 100,
  "currency": "COIN",
  "new_balance": "100.00",
  "ref_type": "mission_reward_grant",
  "ref_id": "789"
}
```

---

### WALLET_DEBITED
Emitted when funds are withdrawn from a wallet.

```typescript
{
  "wallet_id": 456,
  "ledger_txn_id": 1012,
  "amount": 50,
  "currency": "COIN",
  "new_balance": "50.00"
}
```

---

### LEDGER_TRANSACTION_CREATED
Emitted when a ledger transaction is created.

```typescript
{
  "ledger_txn_id": 1011,
  "account_id": 123,
  "type": "mission_reward",
  "total_debits": 100,
  "total_credits": 100
}
```

---

## File Structure

```
src/plugins/wallet/
├── consumers/
│   └── mission-reward.consumer.ts    # MISSION_REWARD_GRANTED event handler
├── controllers/
│   └── wallet.controller.ts          # HTTP endpoints
├── dto/
│   ├── account-create.request.dto.ts
│   ├── wallet-create.request.dto.ts
│   ├── deposit.request.dto.ts
│   ├── withdraw.request.dto.ts
│   └── index.ts
├── entities/
│   ├── account.entity.ts             # Polymorphic account container
│   ├── account-person.entity.ts      # Account-person linkage
│   ├── wallet.entity.ts              # Currency wallet
│   ├── wallet-balance-snapshot.entity.ts  # Real-time balance
│   ├── ledger-txn.entity.ts          # Transaction header
│   ├── ledger-entry.entity.ts        # Debit/credit lines
│   └── index.ts
├── repositories/
│   ├── account.repo.ts               # Account CRUD + findByUserId
│   ├── account-person.repo.ts        # Account-person linkage
│   ├── wallet.repo.ts                # Wallet CRUD + createOrGet
│   ├── wallet-balance-snapshot.repo.ts  # Balance operations
│   ├── ledger-txn.repo.ts            # Transaction CRUD + findByIdempotencyKey
│   ├── ledger-entry.repo.ts          # Entry CRUD + calculateBalance
│   └── index.ts
├── services/
│   └── wallet.workflow.service.ts    # Business logic (Guard → Write → Emit → Commit)
├── wallet.module.ts                   # NestJS module definition
├── index.ts                           # Public API exports
└── README.md                          # This file
```

---

## Key Design Patterns

### 1. Double-Entry Accounting
Every financial transaction creates balanced debit and credit entries:

```typescript
// Deposit 100 COIN to user wallet
Debit:  System Account (id=1)  -100 COIN  (money leaving system)
Credit: User Account (id=123)  +100 COIN  (money arriving to user)
```

**Invariant:** `SUM(debits) = SUM(credits)` for every transaction

---

### 2. Idempotency

**Wallet Creation:**
- UNIQUE(account_id, currency, wallet_type)
- Uses `ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`
- Returns existing wallet_id if duplicate

**Ledger Transactions:**
- UNIQUE(idempotency_key)
- Mission rewards use `mission_reward_{reward_grant_id}`
- HTTP endpoints use `Idempotency-Key` header

---

### 3. Real-time Balance Snapshots

Instead of calculating balance from ledger entries on every read:
- Single row per wallet in `wallet_balance_snapshot`
- Updated atomically with transaction
- Fast reads, consistent balance

```sql
-- Update balance on deposit
UPDATE wallet_balance_snapshot
SET available_amount = available_amount + :amount,
    total_amount = total_amount + :amount,
    as_of = NOW()
WHERE wallet_id = :wallet_id
```

---

### 4. Event-Driven Integration

**Mission → Wallet Flow:**
1. Mission service: User completes mission
2. Mission service: Creates `mission_reward_grant` row
3. Mission service: Emits `MISSION_REWARD_GRANTED` to outbox
4. Outbox processor: Delivers event to wallet consumer
5. Wallet service: Credits wallet automatically
6. Wallet service: Updates mission_reward_grant.ref_type/ref_id
7. Wallet service: Emits `WALLET_CREDITED` event

**Benefits:**
- Loose coupling between missions and wallet
- Eventual consistency
- Automatic retry on failure
- Full audit trail via events

---

### 5. Guard → Write → Emit → Commit

All commands follow this workflow:

```typescript
async deposit(...) {
  return this.txService.run(async (queryRunner) => {
    // 1. LOAD
    const wallet = await this.walletRepo.findById(id, queryRunner);

    // 2. GUARD
    if (!wallet) throw new NotFoundException(...);
    if (wallet.status !== 'active') throw new ConflictException(...);
    if (amount <= 0) throw new BadRequestException(...);

    // 3. WRITE
    const txn_id = await this.ledgerTxnRepo.create(..., queryRunner);
    await this.ledgerEntryRepo.create(..., queryRunner);
    await this.balanceRepo.incrementAvailable(..., queryRunner);

    // 4. EMIT
    await this.outboxService.enqueue(..., queryRunner);

    // 5. COMMIT (implicit via txService.run)
    return { ledger_txn_id: txn_id, new_balance: ... };
  });
}
```

---

## Cross-Plugin Integration

### Reads from Missions Plugin

The wallet plugin reads the `mission_reward_grant` table:

```typescript
// Read mission reward details
const reward_grant = await queryRunner.manager.query(
  'SELECT * FROM mission_reward_grant WHERE id = ?',
  [reward_grant_id]
);
```

**Fields accessed:**
- `user_id` - To find the account
- `amount` - How many coins to credit
- `currency` - Must be 'COIN'
- `reward_type` - Must be 'coins'
- `status` - Must be 'granted'

---

### Writes to Missions Plugin

Updates `mission_reward_grant` with ledger reference:

```typescript
// Link back to ledger transaction
await queryRunner.manager.query(
  'UPDATE mission_reward_grant SET ref_type = ?, ref_id = ? WHERE id = ?',
  ['ledger_txn', ledger_txn_id, reward_grant_id]
);
```

This creates a bidirectional reference:
- Mission → Ledger via `mission_reward_grant.ref_type/ref_id`
- Ledger → Mission via `ledger_txn.ref_type/ref_id`

---

## Testing the Flow

### 1. Create Account
```bash
POST /v1/accounts
Headers:
  X-User-Id: admin-1
  X-User-Role: ADMIN
  Idempotency-Key: create-account-user123

Body:
{
  "type": "user"
}
```

### 2. Create Wallet
```bash
POST /v1/wallets
Headers:
  X-User-Id: admin-1
  X-User-Role: ADMIN
  Idempotency-Key: create-wallet-user123

Body:
{
  "account_id": "1",
  "wallet_type": "MAIN",
  "currency": "COIN"
}
```

### 3. Manual Deposit
```bash
POST /v1/wallets/1/deposit
Headers:
  X-User-Id: admin-1
  X-User-Role: ADMIN
  Idempotency-Key: deposit-test-1

Body:
{
  "wallet_id": "1",
  "amount": 100,
  "currency": "COIN",
  "type": "manual_deposit"
}
```

### 4. Check Balance
```bash
GET /v1/wallets/1/balance
Headers:
  X-User-Id: user-1
  X-User-Role: USER
```

### 5. Complete Mission (Triggers Automatic Reward)
```bash
# In missions plugin
POST /v1/missions/submissions/123/approve
Headers:
  X-User-Id: admin-1
  X-User-Role: ADMIN
  Idempotency-Key: approve-submission-123

Body:
{
  "feedback": "Great work!"
}

# This will:
# 1. Create mission_reward_grant
# 2. Emit MISSION_REWARD_GRANTED event
# 3. Wallet consumer automatically credits wallet
# 4. Balance updated in real-time
```

### 6. Verify Automatic Credit
```bash
GET /v1/wallets/1/transactions
Headers:
  X-User-Id: user-1
  X-User-Role: USER

# Should show ledger_txn with type='mission_reward'
```

---

## Database Tables Owned

1. `account` - Polymorphic account container
2. `account_person` - Account-person linkage
3. `wallet` - Currency-specific wallets
4. `wallet_balance_snapshot` - Real-time balances
5. `ledger_txn` - Transaction headers
6. `ledger_entry` - Debit/credit lines

---

## Dependencies

### Required Modules
- `CoreKitModule` - TransactionService, OutboxService, Guards
- `TypeOrmModule` - Database access

### Cross-Plugin Access
- **Missions Plugin**: Reads `mission_reward_grant` table
- **Person Plugin**: Reads `person` table for account linkage

---

## Error Handling

### Common Errors

**WALLET_NOT_FOUND**
```json
{
  "statusCode": 404,
  "error": {
    "code": "WALLET_NOT_FOUND",
    "message": "Wallet 456 not found"
  }
}
```

**INSUFFICIENT_BALANCE**
```json
{
  "statusCode": 409,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance. Available: 10.00, Required: 50.00"
  }
}
```

**WALLET_NOT_ACTIVE**
```json
{
  "statusCode": 409,
  "error": {
    "code": "WALLET_NOT_ACTIVE",
    "message": "Wallet is not active, current status: frozen"
  }
}
```

---

## Observability

### Event Consumer Logs
```typescript
this.logger.log('Processing MISSION_REWARD_GRANTED event: reward_grant_id=789, user_id=123');
this.logger.log('Reward processed successfully: ledger_txn_id=1011, new_balance=100.00');
this.logger.error('Failed to process mission reward: reward_grant_id=789, error=...');
```

### Balance Audit Trail
Every balance change creates:
1. `ledger_txn` record (transaction header)
2. `ledger_entry` records (debit + credit)
3. `wallet_balance_snapshot` update (new balance + timestamp)
4. `WALLET_CREDITED` or `WALLET_DEBITED` event

To audit a balance:
```sql
-- Current balance
SELECT * FROM wallet_balance_snapshot WHERE wallet_id = 1;

-- All transactions
SELECT * FROM ledger_txn
WHERE account_id = (SELECT account_id FROM wallet WHERE id = 1)
ORDER BY occurred_at DESC;

-- All entries (verify double-entry balance)
SELECT direction, SUM(amount)
FROM ledger_entry
WHERE account_id = 1
GROUP BY direction;
```

---

## Future Enhancements

### Planned Features
- [ ] Multi-currency exchange rates
- [ ] Held balance (for pending transactions)
- [ ] Transaction reversal/refund workflow
- [ ] Batch deposit/withdrawal operations
- [ ] Account statements (PDF export)
- [ ] Wallet freeze/unfreeze commands
- [ ] Fee and tax entry types
- [ ] Scheduled/recurring transactions

### Security Enhancements
- [ ] Two-factor authentication for withdrawals
- [ ] Daily withdrawal limits
- [ ] Suspicious activity detection
- [ ] KYC/AML integration
- [ ] Transaction approval workflow

---

## References

- **Spec:** `specs/wallet/wallet.pillar.v2.yml`
- **DDL:** `docs/database/FULL-DDL.md`
- **Mission Integration:** `specs/mission/missions.pillar.v2.yml` (MISSION_REWARD_GRANTED event)
- **CoreKit Patterns:** `src/corekit/` (TransactionService, OutboxService)
