# Pillar Development Guideline

**Version:** 1.0
**Last Updated:** 2026-03-17
**Status:** Official Standard

This document defines the standard architecture and patterns for all GCPro pillars.

---

## Table of Contents

1. [Pillar Architecture Overview](#pillar-architecture-overview)
2. [File Structure Standard](#file-structure-standard)
3. [Layer Responsibilities](#layer-responsibilities)
4. [Event-Driven Patterns](#event-driven-patterns)
5. [Naming Conventions](#naming-conventions)
6. [Code Examples](#code-examples)
7. [Checklist for New Pillars](#checklist-for-new-pillars)

---

## Pillar Architecture Overview

### The 4-Layer Architecture

Every pillar follows a consistent 4-layer architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    1. CONTROLLERS                           │
│                   (HTTP Endpoints)                          │
│  - Receive HTTP requests                                    │
│  - Validate DTOs                                            │
│  - Call services or handlers                                │
│  - Return responses                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              2. SERVICES & HANDLERS                         │
│           (Business Logic Layer)                            │
│                                                             │
│  Shared Services:        Handlers:                         │
│  - Core operations       - Event-specific logic            │
│  - Reusable logic        - One per event type              │
│  - Used by handlers      - Uses shared services            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   3. REPOSITORIES                           │
│                  (Data Access Layer)                        │
│  - Database operations                                      │
│  - Query builders                                           │
│  - CRUD operations                                          │
│  - Transaction support                                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                     4. ENTITIES                             │
│                   (Data Models)                             │
│  - TypeORM entities                                         │
│  - Database schema                                          │
│  - Column definitions                                       │
└─────────────────────────────────────────────────────────────┘
```

### Event-Driven Extension (Optional)

If your pillar needs to react to or emit events:

```
┌─────────────────────────────────────────────────────────────┐
│                    CONSUMERS                                │
│               (Event Routing Layer)                         │
│  - Register for events                                      │
│  - Thin delegation to handlers                              │
│  - Logging only                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                     HANDLERS                                │
│              (Event Business Logic)                         │
│  - One handler per event type                               │
│  - Uses shared services                                     │
│  - Contains event-specific logic                            │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure Standard

### Standard Pillar Structure

```
src/plugins/[pillar-name]/
├── controllers/
│   └── [pillar-name].controller.ts          ← HTTP endpoints
│
├── services/
│   ├── [core-concept].service.ts            ← Shared services
│   ├── [another-concept].service.ts         ← (e.g., wallet.service.ts)
│   └── [pillar-name].workflow.service.ts    ← Legacy/HTTP workflows
│
├── handlers/                                 ← Event handlers (if needed)
│   ├── [event-source].handler.ts            ← (e.g., mission-reward.handler.ts)
│   └── [another-event].handler.ts
│
├── consumers/                                ← Event consumers (if needed)
│   ├── [event-source].consumer.ts           ← (e.g., mission-reward.consumer.ts)
│   └── [another-event].consumer.ts
│
├── repositories/
│   ├── [entity].repo.ts                     ← Data access
│   └── [another-entity].repo.ts
│
├── entities/
│   ├── [entity].entity.ts                   ← TypeORM entities
│   └── [another-entity].entity.ts
│
├── dto/
│   ├── [action].request.dto.ts              ← Request DTOs
│   ├── [action].response.dto.ts             ← Response DTOs
│   └── [entity].dto.ts
│
├── [pillar-name].module.ts                  ← Module definition
├── README.md                                 ← Pillar documentation
└── index.ts                                  ← Public API exports
```

### Example: Wallet Pillar

```
src/plugins/wallet/
├── controllers/
│   └── wallet.controller.ts
│
├── services/
│   ├── wallet.service.ts         ← Find/create wallets
│   ├── ledger.service.ts         ← Ledger transactions
│   ├── balance.service.ts        ← Balance operations
│   └── wallet.workflow.service.ts
│
├── handlers/
│   ├── mission-reward.handler.ts     ← Handles MISSION_REWARD_REQUESTED
│   ├── claim-payout.handler.ts       ← Handles CLAIM_APPROVED (future)
│   └── commission.handler.ts         ← Handles COMMISSION_CALCULATED (future)
│
├── consumers/
│   ├── mission-reward.consumer.ts
│   ├── claim-payout.consumer.ts
│   └── commission.consumer.ts
│
├── repositories/
│   ├── wallet.repo.ts
│   ├── ledger-txn.repo.ts
│   └── balance-snapshot.repo.ts
│
├── entities/
│   ├── wallet.entity.ts
│   ├── ledger-txn.entity.ts
│   └── balance-snapshot.entity.ts
│
├── dto/
│   ├── wallet-create.request.dto.ts
│   ├── wallet-deposit.request.dto.ts
│   └── wallet.response.dto.ts
│
├── wallet.module.ts
├── README.md
└── index.ts
```

---

## Layer Responsibilities

### 1. Controllers (HTTP Layer)

**Purpose:** Handle HTTP requests and responses

**Responsibilities:**
- ✅ Receive HTTP requests
- ✅ Validate request DTOs (via class-validator)
- ✅ Extract user context (from guards)
- ✅ Call services or handlers
- ✅ Format responses
- ✅ Handle HTTP-specific errors

**DO NOT:**
- ❌ Contain business logic
- ❌ Access database directly
- ❌ Call repositories
- ❌ Emit events directly

**Example:**
```typescript
@Controller('v1/wallet')
export class WalletController {
  constructor(
    private readonly walletWorkflowService: WalletWorkflowService,
  ) {}

  @Post('deposits')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions('wallet:write')
  async createDeposit(
    @Body() request: WalletDepositRequestDto,
    @CurrentUser() user: User,
  ) {
    // Just delegate to service
    const result = await this.walletWorkflowService.processDeposit(
      request,
      { actor_user_id: String(user.id) },
    );

    return {
      success: true,
      data: result,
    };
  }
}
```

---

### 2. Shared Services (Core Operations)

**Purpose:** Provide reusable business logic used by multiple handlers

**Responsibilities:**
- ✅ Core domain operations
- ✅ Reusable across handlers
- ✅ Accept QueryRunner for transactions
- ✅ Return domain entities
- ✅ Single responsibility

**DO NOT:**
- ❌ Handle HTTP requests
- ❌ Emit events (that's the handler's job)
- ❌ Know about event consumers

**Example:**
```typescript
// services/wallet.service.ts
@Injectable()
export class WalletService {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly balanceRepo: BalanceSnapshotRepository,
  ) {}

  /**
   * Find or create wallet for a user
   * Used by: MissionRewardHandler, ClaimPayoutHandler, etc.
   */
  async findOrCreateUserWallet(
    user_id: number,
    currency: string = 'COIN',
    wallet_type: string = 'MAIN',
    queryRunner: QueryRunner,
  ): Promise<{ account: any; wallet: any }> {
    // ... implementation
  }
}
```

---

### 3. Handlers (Event Business Logic)

**Purpose:** Handle specific event types with focused business logic

**Responsibilities:**
- ✅ One handler per event type
- ✅ Validate event payload
- ✅ Use shared services
- ✅ Emit events via OutboxService
- ✅ Manage transactions
- ✅ Return structured results

**DO NOT:**
- ❌ Handle multiple event types
- ❌ Duplicate logic from shared services
- ❌ Grow beyond ~200 lines

**Example:**
```typescript
// handlers/mission-reward.handler.ts
@Injectable()
export class MissionRewardHandler {
  constructor(
    private readonly txService: TransactionService,
    private readonly walletService: WalletService,
    private readonly ledgerService: LedgerService,
    private readonly outboxService: OutboxService,
  ) {}

  async handle(event: {
    reward_grant_id: number;
    user_id: number;
  }) {
    return await this.txService.run(async (queryRunner) => {
      // 1. Validate event-specific data
      const reward_grant = await this.validateRewardGrant(...);

      // 2. Use shared services
      const { wallet } = await this.walletService.findOrCreateUserWallet(...);
      const txn_id = await this.ledgerService.createCreditTransaction(...);

      // 3. Emit events
      await this.outboxService.enqueue({
        event_name: 'WALLET_CREDITED',
        payload: { ... }
      }, queryRunner);

      return { txn_id, balance };
    });
  }
}
```

---

### 4. Consumers (Event Routing)

**Purpose:** Thin routing layer for events

**Responsibilities:**
- ✅ Register for events (OnModuleInit)
- ✅ Delegate to handlers
- ✅ Log events
- ✅ Re-throw errors for retry

**DO NOT:**
- ❌ Contain business logic
- ❌ Call repositories
- ❌ Manage transactions
- ❌ Grow beyond ~50 lines

**Example:**
```typescript
// consumers/mission-reward.consumer.ts
@Injectable()
export class MissionRewardConsumer implements OnModuleInit {
  private readonly logger = new Logger(MissionRewardConsumer.name);

  constructor(
    private readonly handler: MissionRewardHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe(
      'MISSION_REWARD_REQUESTED',
      this.handleEvent.bind(this),
    );
  }

  async handleEvent(event: any): Promise<void> {
    this.logger.log(`Processing event: ${event.reward_grant_id}`);

    try {
      await this.handler.handle(event);  // ← Just delegate
      this.logger.log(`Event processed successfully`);
    } catch (error) {
      this.logger.error(`Failed: ${error.message}`);
      throw error;  // ← Re-throw for retry
    }
  }
}
```

---

### 5. Repositories (Data Access)

**Purpose:** Encapsulate database operations

**Responsibilities:**
- ✅ CRUD operations
- ✅ Query building
- ✅ Accept QueryRunner for transactions
- ✅ Return entities or IDs
- ✅ Handle database-specific logic

**DO NOT:**
- ❌ Contain business logic
- ❌ Emit events
- ❌ Call other repositories
- ❌ Validate business rules

**Example:**
```typescript
// repositories/wallet.repo.ts
@Injectable()
export class WalletRepository {
  async findById(
    wallet_id: number,
    queryRunner: QueryRunner,
  ): Promise<Wallet | null> {
    const result = await queryRunner.manager.findOne(Wallet, {
      where: { id: wallet_id },
    });
    return result || null;
  }

  async create(
    data: Partial<Wallet>,
    queryRunner: QueryRunner,
  ): Promise<number> {
    const result = await queryRunner.manager.insert(Wallet, data);
    return result.identifiers[0].id;
  }
}
```

---

## Event-Driven Patterns

### Pattern 1: Producer Only (Emits Events)

**When:** Your pillar triggers actions but doesn't react to other pillars

**Example:** Missions Pillar

**Structure:**
```
src/plugins/missions/
├── controllers/              ← HTTP endpoints
├── services/
│   └── missions.workflow.service.ts  ← Emits events via OutboxService
├── repositories/
├── entities/
└── missions.module.ts

NO consumers/ folder
NO handlers/ folder
```

**Code Pattern:**
```typescript
// In workflow service
async approveSubmission(submission_id: number) {
  await this.txService.run(async (queryRunner) => {
    // Update database
    await this.submissionRepo.update(...);

    // Emit event
    await this.outboxService.enqueue({
      event_name: 'MISSION_REWARD_REQUESTED',
      payload: { ... }
    }, queryRunner);
  });
}
```

---

### Pattern 2: Consumer Only (Reacts to Events)

**When:** Your pillar only reacts to events (notifications, logging, etc.)

**Example:** Notification Pillar (hypothetical)

**Structure:**
```
src/plugins/notification/
├── controllers/              ← HTTP endpoints (if any)
├── services/
│   └── notification.service.ts    ← Send notifications
├── handlers/
│   ├── wallet-credited.handler.ts
│   └── mission-completed.handler.ts
├── consumers/
│   ├── wallet-credited.consumer.ts
│   └── mission-completed.consumer.ts
├── repositories/
├── entities/
└── notification.module.ts

NO OutboxService calls (doesn't emit events)
```

---

### Pattern 3: Producer + Consumer (Both)

**When:** Your pillar reacts to events AND emits its own events

**Example:** Wallet Pillar

**Structure:**
```
src/plugins/wallet/
├── controllers/
├── services/                 ← Shared operations
│   ├── wallet.service.ts
│   ├── ledger.service.ts
│   └── balance.service.ts
├── handlers/                 ← React to events
│   └── mission-reward.handler.ts
├── consumers/
│   └── mission-reward.consumer.ts
├── repositories/
├── entities/
└── wallet.module.ts
```

**Code Pattern:**
```typescript
// Handler emits events after processing
async handle(event) {
  await this.txService.run(async (queryRunner) => {
    // Process event
    const result = await this.walletService.creditBalance(...);

    // Emit new event
    await this.outboxService.enqueue({
      event_name: 'WALLET_CREDITED',
      payload: { ... }
    }, queryRunner);

    return result;
  });
}
```

---

## Naming Conventions

### Files

| Type | Pattern | Example |
|------|---------|---------|
| Controller | `[pillar].controller.ts` | `wallet.controller.ts` |
| Service | `[concept].service.ts` | `wallet.service.ts` |
| Handler | `[event-source].handler.ts` | `mission-reward.handler.ts` |
| Consumer | `[event-source].consumer.ts` | `mission-reward.consumer.ts` |
| Repository | `[entity].repo.ts` | `wallet.repo.ts` |
| Entity | `[entity].entity.ts` | `wallet.entity.ts` |
| DTO | `[action].request.dto.ts` | `wallet-create.request.dto.ts` |
| Module | `[pillar].module.ts` | `wallet.module.ts` |

### Classes

| Type | Pattern | Example |
|------|---------|---------|
| Controller | `[Pillar]Controller` | `WalletController` |
| Service | `[Concept]Service` | `WalletService` |
| Handler | `[EventSource]Handler` | `MissionRewardHandler` |
| Consumer | `[EventSource]Consumer` | `MissionRewardConsumer` |
| Repository | `[Entity]Repository` | `WalletRepository` |
| Entity | `[Entity]` | `Wallet` |

### Events

| Type | Pattern | Example |
|------|---------|---------|
| Event Name | `[NOUN]_[VERB]_[PAST_TENSE]` | `MISSION_REWARD_REQUESTED` |
| Event Name | `[NOUN]_[VERB]_[PAST_TENSE]` | `WALLET_CREDITED` |

---

## Code Examples

### Complete Handler Pattern

```typescript
import { Injectable } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { [Shared]Service } from '../services/[shared].service';

/**
 * [EventSource] Handler
 *
 * Handles [EVENT_NAME] events from the [source] pillar
 *
 * Flow:
 * 1. Validate event data
 * 2. Use shared services to perform operations
 * 3. Emit events if needed
 */
@Injectable()
export class [EventSource]Handler {
  constructor(
    private readonly txService: TransactionService,
    private readonly [shared]Service: [Shared]Service,
    private readonly outboxService: OutboxService,
  ) {}

  async handle(event: {
    field1: type1;
    field2: type2;
  }): Promise<{ result: any }> {
    return await this.txService.run(async (queryRunner) => {

      // Step 1: Validate
      this.validateEvent(event);

      // Step 2: Use shared services
      const result = await this.[shared]Service.doSomething(
        event.field1,
        queryRunner,
      );

      // Step 3: Emit event (optional)
      await this.outboxService.enqueue({
        event_name: 'SOMETHING_HAPPENED',
        event_version: 1,
        aggregate_type: '[AGGREGATE]',
        aggregate_id: String(result.id),
        actor_user_id: String(event.user_id),
        occurred_at: new Date(),
        correlation_id: `[context]-${event.field1}`,
        causation_id: `event-[source]-${event.field1}`,
        payload: {
          id: result.id,
          // ... other fields
        },
      }, queryRunner);

      return { result };
    });
  }

  private validateEvent(event: any): void {
    // Validation logic
  }
}
```

### Complete Consumer Pattern

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { [EventSource]Handler } from '../handlers/[event-source].handler';

/**
 * [EventSource] Consumer
 *
 * Listens to [EVENT_NAME] events and delegates to handler
 */
@Injectable()
export class [EventSource]Consumer implements OnModuleInit {
  private readonly logger = new Logger([EventSource]Consumer.name);

  constructor(
    private readonly handler: [EventSource]Handler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe(
      '[EVENT_NAME]',
      this.handleEvent.bind(this),
    );
    this.logger.log('✅ Registered for [EVENT_NAME] events');
  }

  async handleEvent(event: {
    field1: type1;
    field2: type2;
  }): Promise<void> {
    this.logger.log(`Processing [EVENT_NAME]: ${event.field1}`);

    try {
      const result = await this.handler.handle(event);
      this.logger.log(`Event processed: ${result}`);
    } catch (error) {
      this.logger.error(`Failed: ${error.message}`, error.stack);
      throw error;  // Re-throw for retry
    }
  }
}
```

### Complete Module Pattern

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { [Entity] } from './entities/[entity].entity';

// Repositories
import { [Entity]Repository } from './repositories/[entity].repo';

// Shared Services
import { [Concept]Service } from './services/[concept].service';

// Handlers (if event-driven)
import { [EventSource]Handler } from './handlers/[event-source].handler';

// Consumers (if event-driven)
import { [EventSource]Consumer } from './consumers/[event-source].consumer';

// Controllers
import { [Pillar]Controller } from './controllers/[pillar].controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      [Entity],
      // ... other entities
    ]),
  ],
  controllers: [
    [Pillar]Controller,
  ],
  providers: [
    // Repositories
    [Entity]Repository,

    // Shared Services
    [Concept]Service,

    // Event Handlers (if needed)
    [EventSource]Handler,

    // Event Consumers (if needed)
    [EventSource]Consumer,
  ],
  exports: [
    // Export shared services
    [Concept]Service,
  ],
})
export class [Pillar]Module {}
```

---

## Checklist for New Pillars

### Phase 1: Planning

- [ ] Define pillar name (lowercase, singular)
- [ ] Identify core entities
- [ ] Determine if pillar emits events (Producer)
- [ ] Determine if pillar reacts to events (Consumer)
- [ ] List shared operations (future services)
- [ ] List event types to handle (future handlers)

### Phase 2: Core Setup

- [ ] Create pillar folder: `src/plugins/[pillar-name]/`
- [ ] Create entities in `entities/`
- [ ] Create repositories in `repositories/`
- [ ] Create DTOs in `dto/`
- [ ] Create module: `[pillar-name].module.ts`

### Phase 3: Shared Services

- [ ] Create shared services in `services/`
- [ ] Follow pattern: `[concept].service.ts`
- [ ] Accept QueryRunner in all methods
- [ ] Return domain entities
- [ ] Register in module

### Phase 4: Controllers (HTTP Endpoints)

- [ ] Create controller in `controllers/`
- [ ] Define HTTP endpoints
- [ ] Use guards for auth/permissions
- [ ] Validate DTOs
- [ ] Delegate to services
- [ ] Register in module

### Phase 5: Event Consumers (If Needed)

- [ ] Create `handlers/` folder
- [ ] Create handler: `[event-source].handler.ts`
- [ ] Inject shared services
- [ ] Implement event processing
- [ ] Create `consumers/` folder
- [ ] Create consumer: `[event-source].consumer.ts`
- [ ] Register for events in `onModuleInit()`
- [ ] Delegate to handler
- [ ] Register both in module

### Phase 6: Event Producers (If Needed)

- [ ] Inject OutboxService in handlers/services
- [ ] Call `outboxService.enqueue()` within transactions
- [ ] Define event name (UPPER_SNAKE_CASE)
- [ ] Include all required fields in payload

### Phase 7: Documentation

- [ ] Create `README.md` with:
  - [ ] Purpose and responsibilities
  - [ ] Core entities
  - [ ] HTTP endpoints
  - [ ] Events emitted
  - [ ] Events consumed
  - [ ] Example usage
- [ ] Create `index.ts` for public API
- [ ] Update main `docs/` if needed

### Phase 8: Testing

- [ ] Create seed data if needed
- [ ] Test HTTP endpoints
- [ ] Test event emission
- [ ] Test event consumption
- [ ] Verify idempotency
- [ ] Check transaction atomicity

---

## Anti-Patterns to Avoid

### ❌ God Service

**Problem:** One service with too many responsibilities

```typescript
// BAD: wallet.workflow.service.ts with 2000+ lines
class WalletWorkflowService {
  processMissionReward() { ... }      // 300 lines
  processClaimPayout() { ... }         // 300 lines
  processCommission() { ... }          // 300 lines
  processReferralBonus() { ... }       // 300 lines
  processTournamentPrize() { ... }     // 300 lines
  // ... keeps growing
}
```

**Solution:** Extract to handlers + shared services

```typescript
// GOOD: Separate handlers
class MissionRewardHandler {
  handle() { ... }  // 150 lines
}

class ClaimPayoutHandler {
  handle() { ... }  // 150 lines
}

// GOOD: Shared services
class WalletService {
  findOrCreateWallet() { ... }
}

class LedgerService {
  createTransaction() { ... }
}
```

---

### ❌ Direct Service Calls Between Pillars

**Problem:** Tight coupling

```typescript
// BAD: Missions calling Wallet directly
class MissionsWorkflowService {
  constructor(
    private readonly walletService: WalletService,  // ❌ Cross-pillar dependency
  ) {}

  async approveSubmission() {
    await this.walletService.creditCoins(...);  // ❌ Direct call
  }
}
```

**Solution:** Use events

```typescript
// GOOD: Emit event instead
class MissionsWorkflowService {
  constructor(
    private readonly outboxService: OutboxService,  // ✅ Only corekit dependency
  ) {}

  async approveSubmission() {
    await this.outboxService.enqueue({
      event_name: 'MISSION_REWARD_REQUESTED',  // ✅ Event
      payload: { ... }
    }, queryRunner);
  }
}
```

---

### ❌ Business Logic in Controllers

**Problem:** Hard to test and reuse

```typescript
// BAD: Logic in controller
@Post('deposits')
async createDeposit(@Body() request) {
  const wallet = await this.walletRepo.findById(...);  // ❌ Repository in controller
  const balance = await this.balanceRepo.increment(...);  // ❌ Business logic
  await this.outboxService.enqueue(...);  // ❌ Event emission
  return { balance };
}
```

**Solution:** Move to service

```typescript
// GOOD: Delegate to service
@Post('deposits')
async createDeposit(@Body() request) {
  const result = await this.walletService.processDeposit(request);  // ✅ Delegation
  return { data: result };
}
```

---

### ❌ Business Logic in Consumers

**Problem:** Consumer should be thin

```typescript
// BAD: Logic in consumer
async handleEvent(event) {
  const wallet = await this.walletRepo.findById(...);  // ❌
  const txn = await this.ledgerRepo.create(...);  // ❌
  await this.balanceRepo.update(...);  // ❌
}
```

**Solution:** Delegate to handler

```typescript
// GOOD: Thin consumer
async handleEvent(event) {
  await this.handler.handle(event);  // ✅ Delegation
}
```

---

## Summary

### Key Principles

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Reusability**: Extract common operations to shared services
3. **Single Responsibility**: One handler per event type
4. **Event-Driven**: Pillars communicate via events, not direct calls
5. **Consistency**: All pillars follow the same structure

### When Adding a New Feature

**If it's an HTTP endpoint:**
- Add to controller → Call service/handler

**If it reacts to an event:**
- Create handler in `handlers/`
- Create consumer in `consumers/`
- Register in module

**If it emits an event:**
- Call `outboxService.enqueue()` in service/handler
- Define event name and payload

**If it's shared logic:**
- Extract to service in `services/`
- Use across handlers

### File Count Guidelines

A healthy pillar might have:
- 1-2 controllers
- 3-5 shared services
- 1+ handlers (if event-driven)
- 1+ consumers (if event-driven)
- 5-10 repositories
- 5-10 entities

**More files = Better organized** (as long as each file has a single responsibility)

---

## References

- [Outbox Pattern Guide](./OUTBOX-PATTERN-GUIDE.md)
- [Consumer Architecture Patterns](./CONSUMER-ARCHITECTURE-PATTERNS.md)
- [Event Consumer Patterns](./EVENT-CONSUMER-PATTERNS.md)

---

**Last Updated:** 2026-03-17
**Maintained By:** GCPro Architecture Team
