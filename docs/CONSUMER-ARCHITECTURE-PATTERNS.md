# Consumer Architecture Patterns: Avoiding the "God Service" Problem

## The Problem You Identified

You're absolutely right! As your application grows, the `wallet.workflow.service.ts` will become a **God Object** (anti-pattern).

### Current Architecture (Will Become Problematic)

```typescript
// ❌ BAD: wallet.workflow.service.ts keeps growing
@Injectable()
export class WalletWorkflowService {

  // Consumer 1: Mission rewards
  async processMissionReward(event) { ... }

  // Consumer 2: Claim payouts (future)
  async processClaimPayout(event) { ... }

  // Consumer 3: Commission (future)
  async processCommission(event) { ... }

  // Consumer 4: Referral bonus (future)
  async processReferralBonus(event) { ... }

  // Consumer 5: Tournament prize (future)
  async processTournamentPrize(event) { ... }

  // ... file grows to 2000+ lines! 😱
}
```

**Problems:**
1. 🚫 **Single file becomes huge** (2000+ lines)
2. 🚫 **Hard to maintain** (too many responsibilities)
3. 🚫 **Violates Single Responsibility Principle**
4. 🚫 **Tight coupling** (all consumers depend on one service)
5. 🚫 **Hard to test** (need to mock everything)
6. 🚫 **Merge conflicts** (multiple devs editing same file)

---

## Solution 1: Handler Services Pattern (Recommended)

### Create Dedicated Handler Services

Each consumer gets its own handler service.

**File Structure:**
```
src/plugins/wallet/
├── consumers/
│   ├── mission-reward.consumer.ts        ← Delegates to handler
│   ├── claim-payout.consumer.ts          ← Delegates to handler
│   └── commission.consumer.ts            ← Delegates to handler
│
├── handlers/                              ← NEW: Handler services
│   ├── mission-reward.handler.ts         ← Handles mission rewards
│   ├── claim-payout.handler.ts           ← Handles claim payouts
│   └── commission.handler.ts             ← Handles commissions
│
├── services/
│   ├── wallet.service.ts                 ← Core wallet operations (shared)
│   ├── ledger.service.ts                 ← Ledger operations (shared)
│   └── balance.service.ts                ← Balance operations (shared)
│
└── repositories/
    └── ...
```

### Example Implementation

#### Step 1: Create Shared Services (Core Operations)

**File:** `src/plugins/wallet/services/wallet.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';

/**
 * Core Wallet Service
 * Provides shared wallet operations used by multiple handlers
 */
@Injectable()
export class WalletService {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly balanceRepo: BalanceSnapshotRepository,
  ) {}

  /**
   * Find or create wallet for a user
   * Shared by: mission rewards, claims, commissions, etc.
   */
  async findOrCreateWallet(
    user_id: number,
    queryRunner: QueryRunner,
  ): Promise<Wallet> {
    // 1. Find account for user
    let account = await this.accountRepo.findByUserId(user_id, queryRunner);

    // 2. Auto-create if not exists
    if (!account) {
      account = await this.createAccountForUser(user_id, queryRunner);
    }

    // 3. Find wallet for account
    let wallet = await this.walletRepo.findByAccountId(account.id, queryRunner);

    // 4. Auto-create if not exists
    if (!wallet) {
      wallet = await this.createWallet(account.id, queryRunner);
    }

    return wallet;
  }

  /**
   * Update wallet balance
   * Shared by: mission rewards, claims, commissions, etc.
   */
  async creditBalance(
    wallet_id: number,
    amount: string,
    queryRunner: QueryRunner,
  ): Promise<string> {
    await this.balanceRepo.incrementAvailable(wallet_id, amount, queryRunner);

    const balance = await this.balanceRepo.findByWalletId(wallet_id, queryRunner);
    return balance?.total_amount || '0.00';
  }

  // Other shared operations...
}
```

#### Step 2: Create Handler for Mission Rewards

**File:** `src/plugins/wallet/handlers/mission-reward.handler.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { WalletService } from '../services/wallet.service';
import { LedgerService } from '../services/ledger.service';

/**
 * Mission Reward Handler
 *
 * Handles MISSION_REWARD_REQUESTED events
 * Scope: Single responsibility - only mission rewards
 */
@Injectable()
export class MissionRewardHandler {
  constructor(
    private readonly txService: TransactionService,
    private readonly walletService: WalletService,
    private readonly ledgerService: LedgerService,
    private readonly outboxService: OutboxService,
    private readonly rewardGrantRepo: MissionRewardGrantRepository,
  ) {}

  /**
   * Process mission reward event
   */
  async handle(event: {
    reward_grant_id: number;
    assignment_id: number;
    user_id: number;
  }) {
    return await this.txService.run(async (queryRunner) => {

      // === STEP 1: Validate reward_grant ===
      const reward_grant = await this.rewardGrantRepo.findById(
        event.reward_grant_id,
        queryRunner,
      );

      if (!reward_grant) {
        throw new NotFoundException('Reward grant not found');
      }

      if (reward_grant.status !== 'requested') {
        throw new ConflictException(
          `Reward status is ${reward_grant.status}, expected 'requested'`
        );
      }

      // === STEP 2: Get or create wallet (shared service) ===
      const wallet = await this.walletService.findOrCreateWallet(
        event.user_id,
        queryRunner,
      );

      // === STEP 3: Check idempotency ===
      const idempotency_key = `mission_reward_${event.reward_grant_id}`;
      const existingTxn = await this.ledgerService.findByIdempotencyKey(
        idempotency_key,
        queryRunner,
      );

      if (existingTxn) {
        // Already processed
        return {
          ledger_txn_id: existingTxn.id,
          already_processed: true,
        };
      }

      // === STEP 4: Create ledger transaction (shared service) ===
      const ledger_txn_id = await this.ledgerService.createTransaction(
        {
          account_id: wallet.account_id,
          type: 'mission_reward',
          amount: reward_grant.amount,
          currency: 'COIN',
          ref_type: 'mission_reward_grant',
          ref_id: String(event.reward_grant_id),
          idempotency_key,
        },
        queryRunner,
      );

      // === STEP 5: Credit wallet balance (shared service) ===
      const new_balance = await this.walletService.creditBalance(
        wallet.id,
        String(reward_grant.amount),
        queryRunner,
      );

      // === STEP 6: Update reward_grant status ===
      await this.rewardGrantRepo.updateStatus(
        event.reward_grant_id,
        'granted',
        ledger_txn_id,
        queryRunner,
      );

      // === STEP 7: Emit WALLET_CREDITED event ===
      await this.outboxService.enqueue(
        {
          event_name: 'WALLET_CREDITED',
          event_version: 1,
          aggregate_type: 'WALLET',
          aggregate_id: String(wallet.id),
          actor_user_id: String(event.user_id),
          occurred_at: new Date(),
          correlation_id: `mission-reward-${event.reward_grant_id}`,
          causation_id: `event-mission-reward-requested-${event.reward_grant_id}`,
          payload: {
            wallet_id: wallet.id,
            ledger_txn_id,
            amount: Number(reward_grant.amount),
            currency: 'COIN',
            new_balance,
            source: 'mission_reward',
            source_id: event.reward_grant_id,
          },
        },
        queryRunner,
      );

      return {
        ledger_txn_id,
        new_balance,
        already_processed: false,
      };
    });
  }
}
```

**Key Points:**
- ✅ Single responsibility (only mission rewards)
- ✅ Uses shared services (WalletService, LedgerService)
- ✅ Clean separation of concerns
- ✅ Easy to test in isolation
- ✅ ~150 lines instead of being part of a 2000-line file

#### Step 3: Create Handler for Claim Payouts

**File:** `src/plugins/wallet/handlers/claim-payout.handler.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { WalletService } from '../services/wallet.service';
import { LedgerService } from '../services/ledger.service';

/**
 * Claim Payout Handler
 *
 * Handles CLAIM_APPROVED events
 * Scope: Single responsibility - only claim payouts
 */
@Injectable()
export class ClaimPayoutHandler {
  constructor(
    private readonly txService: TransactionService,
    private readonly walletService: WalletService,
    private readonly ledgerService: LedgerService,
  ) {}

  /**
   * Process claim payout event
   */
  async handle(event: {
    claim_id: number;
    user_id: number;
    amount: number;
  }) {
    return await this.txService.run(async (queryRunner) => {

      // === STEP 1: Validate claim ===
      const claim = await this.claimRepo.findById(event.claim_id, queryRunner);

      if (claim.status !== 'approved') {
        throw new ConflictException('Claim not approved');
      }

      // === STEP 2: Get or create wallet (shared service) ===
      const wallet = await this.walletService.findOrCreateWallet(
        event.user_id,
        queryRunner,
      );

      // === STEP 3: Check idempotency ===
      const idempotency_key = `claim_payout_${event.claim_id}`;
      const existingTxn = await this.ledgerService.findByIdempotencyKey(
        idempotency_key,
        queryRunner,
      );

      if (existingTxn) {
        return { already_processed: true };
      }

      // === STEP 4: Create ledger transaction ===
      const ledger_txn_id = await this.ledgerService.createTransaction(
        {
          account_id: wallet.account_id,
          type: 'claim_payout',  // Different type
          amount: String(event.amount),
          currency: 'COIN',
          ref_type: 'claim',
          ref_id: String(event.claim_id),
          idempotency_key,
        },
        queryRunner,
      );

      // === STEP 5: Credit wallet balance ===
      const new_balance = await this.walletService.creditBalance(
        wallet.id,
        String(event.amount),
        queryRunner,
      );

      // === STEP 6: Update claim status ===
      await this.claimRepo.updateStatus(
        event.claim_id,
        'paid',
        ledger_txn_id,
        queryRunner,
      );

      return {
        ledger_txn_id,
        new_balance,
        already_processed: false,
      };
    });
  }
}
```

**Key Points:**
- ✅ Separate file for claim-specific logic
- ✅ Reuses shared services (WalletService, LedgerService)
- ✅ Different transaction type (`claim_payout` vs `mission_reward`)
- ✅ Same pattern, different business rules

#### Step 4: Update Consumer to Use Handler

**File:** `src/plugins/wallet/consumers/mission-reward.consumer.ts`

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { MissionRewardHandler } from '../handlers/mission-reward.handler';

@Injectable()
export class MissionRewardConsumer implements OnModuleInit {
  private readonly logger = new Logger(MissionRewardConsumer.name);

  constructor(
    private readonly handler: MissionRewardHandler,  // ← Inject handler
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe(
      'MISSION_REWARD_REQUESTED',
      this.handleMissionRewardRequested.bind(this),
    );
    this.logger.log('✅ Registered for MISSION_REWARD_REQUESTED events');
  }

  async handleMissionRewardRequested(event: {
    reward_grant_id: number;
    assignment_id: number;
    user_id: number;
  }): Promise<void> {
    this.logger.log(
      `Processing MISSION_REWARD_REQUESTED: reward_grant_id=${event.reward_grant_id}`
    );

    try {
      // Delegate to handler
      const result = await this.handler.handle(event);  // ← Simple delegation

      if (result.already_processed) {
        this.logger.log(`Reward already processed: ${event.reward_grant_id}`);
      } else {
        this.logger.log(
          `Reward processed: txn_id=${result.ledger_txn_id}, balance=${result.new_balance}`
        );
      }
    } catch (error) {
      this.logger.error(`Failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

**Key Points:**
- ✅ Consumer is now thin (just routing)
- ✅ All business logic in handler
- ✅ Easy to test consumer and handler separately

#### Step 5: Register Everything in Module

**File:** `src/plugins/wallet/wallet.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Wallet } from './entities/wallet.entity';
import { Account } from './entities/account.entity';
import { LedgerTxn } from './entities/ledger-txn.entity';

// Shared Services
import { WalletService } from './services/wallet.service';
import { LedgerService } from './services/ledger.service';
import { BalanceService } from './services/balance.service';

// Handlers
import { MissionRewardHandler } from './handlers/mission-reward.handler';
import { ClaimPayoutHandler } from './handlers/claim-payout.handler';
import { CommissionHandler } from './handlers/commission.handler';

// Consumers
import { MissionRewardConsumer } from './consumers/mission-reward.consumer';
import { ClaimPayoutConsumer } from './consumers/claim-payout.consumer';
import { CommissionConsumer } from './consumers/commission.consumer';

// Controllers
import { WalletController } from './controllers/wallet.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Wallet,
      Account,
      LedgerTxn,
      // ... other entities
    ]),
  ],
  providers: [
    // Shared services (used by multiple handlers)
    WalletService,
    LedgerService,
    BalanceService,

    // Handlers (one per event type)
    MissionRewardHandler,
    ClaimPayoutHandler,
    CommissionHandler,

    // Consumers (one per event source)
    MissionRewardConsumer,
    ClaimPayoutConsumer,
    CommissionConsumer,

    // Repositories
    // ...
  ],
  controllers: [WalletController],
  exports: [
    WalletService,
    LedgerService,
    BalanceService,
  ],
})
export class WalletModule {}
```

---

## Solution 2: Command Pattern (Alternative)

If you want even more structure, use the Command/Handler pattern.

### File Structure

```
src/plugins/wallet/
├── commands/
│   ├── credit-mission-reward.command.ts
│   ├── credit-claim-payout.command.ts
│   └── credit-commission.command.ts
│
├── handlers/
│   ├── credit-mission-reward.handler.ts
│   ├── credit-claim-payout.handler.ts
│   └── credit-commission.handler.ts
│
├── consumers/
│   ├── mission-reward.consumer.ts
│   ├── claim-payout.consumer.ts
│   └── commission.consumer.ts
│
└── services/
    ├── wallet.service.ts
    └── ledger.service.ts
```

### Example: Command

**File:** `src/plugins/wallet/commands/credit-mission-reward.command.ts`

```typescript
export class CreditMissionRewardCommand {
  constructor(
    public readonly reward_grant_id: number,
    public readonly user_id: number,
    public readonly amount: number,
    public readonly assignment_id: number,
  ) {}
}
```

### Example: Command Handler

**File:** `src/plugins/wallet/handlers/credit-mission-reward.handler.ts`

```typescript
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreditMissionRewardCommand } from '../commands/credit-mission-reward.command';

@CommandHandler(CreditMissionRewardCommand)
export class CreditMissionRewardHandler
  implements ICommandHandler<CreditMissionRewardCommand>
{
  constructor(
    private readonly txService: TransactionService,
    private readonly walletService: WalletService,
    private readonly ledgerService: LedgerService,
  ) {}

  async execute(command: CreditMissionRewardCommand): Promise<any> {
    // Same logic as before
    return await this.txService.run(async (queryRunner) => {
      // ... process mission reward
    });
  }
}
```

### Example: Consumer with Command

**File:** `src/plugins/wallet/consumers/mission-reward.consumer.ts`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { CreditMissionRewardCommand } from '../commands/credit-mission-reward.command';

@Injectable()
export class MissionRewardConsumer implements OnModuleInit {
  constructor(
    private readonly commandBus: CommandBus,  // ← Use CommandBus
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe(
      'MISSION_REWARD_REQUESTED',
      this.handleMissionRewardRequested.bind(this),
    );
  }

  async handleMissionRewardRequested(event: any): Promise<void> {
    // Create and execute command
    const command = new CreditMissionRewardCommand(
      event.reward_grant_id,
      event.user_id,
      event.amount,
      event.assignment_id,
    );

    await this.commandBus.execute(command);  // ← Dispatch to handler
  }
}
```

**Benefits of Command Pattern:**
- ✅ Even cleaner separation
- ✅ Commands are testable DTOs
- ✅ Handlers are discovered automatically
- ✅ Follows CQRS pattern
- ❌ More boilerplate (overkill for simple apps)

---

## Comparison: Approaches

### Approach 1: Single Workflow Service (Current - Not Recommended)

```
❌ wallet.workflow.service.ts (2000+ lines)
   ├── processMissionReward()
   ├── processClaimPayout()
   ├── processCommission()
   └── processReferralBonus()
   └── ... (keeps growing)
```

**Pros:**
- Simple (everything in one place)

**Cons:**
- 🚫 Violates Single Responsibility
- 🚫 Hard to maintain
- 🚫 Hard to test
- 🚫 Merge conflicts

---

### Approach 2: Handler Services (Recommended for GCPro)

```
✅ handlers/
   ├── mission-reward.handler.ts (150 lines)
   ├── claim-payout.handler.ts (150 lines)
   ├── commission.handler.ts (150 lines)
   └── referral-bonus.handler.ts (150 lines)

✅ services/
   ├── wallet.service.ts (shared operations)
   ├── ledger.service.ts (shared operations)
   └── balance.service.ts (shared operations)
```

**Pros:**
- ✅ Single responsibility per handler
- ✅ Shared logic in services
- ✅ Easy to maintain
- ✅ Easy to test
- ✅ No merge conflicts
- ✅ Clear separation

**Cons:**
- More files (but better organized)

---

### Approach 3: Command/Handler Pattern (CQRS)

```
✅ commands/
   ├── credit-mission-reward.command.ts
   ├── credit-claim-payout.command.ts
   └── ...

✅ handlers/
   ├── credit-mission-reward.handler.ts
   ├── credit-claim-payout.handler.ts
   └── ...
```

**Pros:**
- ✅ Most structured
- ✅ Follows CQRS
- ✅ Commands are testable
- ✅ Auto-discovery of handlers

**Cons:**
- ❌ More boilerplate
- ❌ Overkill for simple apps
- ❌ Requires @nestjs/cqrs

---

## Migration Path: From Workflow Service to Handlers

### Step 1: Create Shared Services

Extract common operations from `wallet.workflow.service.ts`:

```typescript
// wallet.service.ts
class WalletService {
  findOrCreateWallet(user_id, queryRunner) { ... }
  creditBalance(wallet_id, amount, queryRunner) { ... }
  debitBalance(wallet_id, amount, queryRunner) { ... }
}

// ledger.service.ts
class LedgerService {
  createTransaction(data, queryRunner) { ... }
  findByIdempotencyKey(key, queryRunner) { ... }
  createDoubleEntry(txn_id, amount, queryRunner) { ... }
}
```

### Step 2: Create First Handler

Move `processMissionReward()` to `mission-reward.handler.ts`:

```typescript
// handlers/mission-reward.handler.ts
class MissionRewardHandler {
  async handle(event) {
    // Copy logic from processMissionReward()
    // Replace this.walletRepo with this.walletService
    // Replace this.ledgerRepo with this.ledgerService
  }
}
```

### Step 3: Update Consumer

Change consumer to use handler:

```typescript
// Before
constructor(private readonly workflowService: WalletWorkflowService) {}
await this.workflowService.processMissionReward(event);

// After
constructor(private readonly handler: MissionRewardHandler) {}
await this.handler.handle(event);
```

### Step 4: Repeat for Each Consumer

One by one, extract methods to handlers.

### Step 5: Delete Workflow Service

Once all methods are extracted, delete `wallet.workflow.service.ts`.

---

## When to Refactor?

### Refactor NOW if:
- ✅ You have 2+ consumers already
- ✅ You're about to add a 3rd consumer
- ✅ Your workflow service is >500 lines

### Wait if:
- ⏸️ You only have 1 consumer (mission rewards)
- ⏸️ Your workflow service is <300 lines
- ⏸️ You're still prototyping

**For GCPro:** Since you mentioned "claim or others which need wallet executions", you should **refactor now** before adding more consumers.

---

## Recommended Action for GCPro

### Immediate (This Sprint):

1. **Create shared services:**
   - `src/plugins/wallet/services/wallet.service.ts`
   - `src/plugins/wallet/services/ledger.service.ts`
   - `src/plugins/wallet/services/balance.service.ts`

2. **Create handlers folder:**
   - `src/plugins/wallet/handlers/mission-reward.handler.ts`

3. **Refactor existing:**
   - Move `processMissionReward()` to `MissionRewardHandler`
   - Update `mission-reward.consumer.ts` to use handler
   - Keep `wallet.workflow.service.ts` for HTTP endpoints (if any)

### Next Consumers (Future Sprints):

When you add claim/commission/referral:

1. Create new handler: `handlers/claim-payout.handler.ts`
2. Create new consumer: `consumers/claim-payout.consumer.ts`
3. Register both in module
4. Reuse shared services

**Each new feature = 2 new files** (handler + consumer), not 1 growing file.

---

## Summary

**Your concern is valid!** The `wallet.workflow.service.ts` will become unmaintainable.

**Solution:**
- 🎯 **Create Handler Services** (one per event type)
- 🎯 **Extract Shared Services** (wallet, ledger, balance operations)
- 🎯 **Keep Consumers Thin** (just routing to handlers)

**Benefits:**
- ✅ Each handler ~150 lines (readable)
- ✅ Shared logic in services (DRY)
- ✅ Easy to test in isolation
- ✅ No merge conflicts
- ✅ Scales to 10+ event types

**File count goes up, but maintainability goes WAY up!** 🚀
