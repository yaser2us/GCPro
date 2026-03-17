# Event Consumer Patterns in GCPro

## Do I Need a Consumer for My Pillar?

**Short answer:** Only if your pillar needs to REACT to events from OTHER pillars.

## Three Pillar Patterns

### Pattern 1: Producer Only (No Consumer Needed)

**Example:** Missions Pillar

```
Missions Pillar
├── Emits Events:
│   ├── MISSION_DEFINITION_CREATED
│   ├── MISSION_ASSIGNED
│   ├── MISSION_SUBMISSION_CREATED
│   └── MISSION_REWARD_REQUESTED ← Other pillars consume this
│
└── Consumers: NONE
    (Missions doesn't need to react to other pillars)
```

**Files:**
- ✅ `src/plugins/missions/services/missions.workflow.service.ts` - Emits events
- ❌ NO consumer folder needed

**When to use:**
- Your pillar triggers actions but doesn't need to react to other pillars
- Example: User creates a mission definition, no need to listen to wallet events

---

### Pattern 2: Consumer Only (No Events Emitted)

**Example:** Notification Pillar (hypothetical)

```
Notification Pillar
├── Emits Events: NONE
│
└── Consumers:
    ├── mission-completed.consumer.ts → Sends notification
    ├── wallet-credited.consumer.ts → Sends notification
    └── user-registered.consumer.ts → Sends welcome email
```

**Files:**
- ❌ NO events emitted
- ✅ `src/plugins/notification/consumers/mission-completed.consumer.ts`
- ✅ `src/plugins/notification/consumers/wallet-credited.consumer.ts`

**When to use:**
- Your pillar only reacts to events (like notifications, logging, analytics)
- Doesn't need to notify other pillars about its actions

---

### Pattern 3: Producer AND Consumer (Both)

**Example:** Wallet Pillar

```
Wallet Pillar
├── Emits Events:
│   ├── WALLET_CREATED
│   ├── WALLET_CREDITED ← Other pillars might consume this
│   ├── WALLET_DEBITED
│   └── WITHDRAWAL_COMPLETED
│
└── Consumers:
    └── mission-reward.consumer.ts → Listens to MISSION_REWARD_REQUESTED
        (Missions tells Wallet to credit coins)
```

**Files:**
- ✅ `src/plugins/wallet/services/wallet.workflow.service.ts` - Emits events
- ✅ `src/plugins/wallet/consumers/mission-reward.consumer.ts` - Consumes events

**When to use:**
- Your pillar needs to react to other pillars AND notify them back
- Example: Wallet reacts to mission rewards and emits wallet credited events

---

## Decision Tree: Do I Need a Consumer?

```
                    START
                      |
                      ▼
        Does your pillar need to DO SOMETHING
        when another pillar's event happens?
                      |
            ┌─────────┴─────────┐
            │                   │
           YES                 NO
            │                   │
            ▼                   ▼
    ✅ CREATE CONSUMER    ❌ NO CONSUMER NEEDED
                              │
                              ▼
                     Does your pillar emit events
                     that other pillars care about?
                              |
                    ┌─────────┴─────────┐
                    │                   │
                   YES                 NO
                    │                   │
                    ▼                   ▼
            ✅ EMIT EVENTS      ✅ JUST BUSINESS LOGIC
          (Use OutboxService)    (No events at all)
```

---

## Real Examples from GCPro

### Example 1: Missions Pillar (Producer Only)

**Scenario:** Admin approves a mission submission

```typescript
// src/plugins/missions/services/missions.workflow.service.ts

async approveSubmission(submission_id: number) {
  await this.txService.run(async (queryRunner) => {
    // Business logic
    await queryRunner.update('mission_submission', ...);

    // EMIT event (tell other pillars)
    await this.outboxService.enqueue({
      event_name: 'MISSION_REWARD_REQUESTED',
      payload: {
        reward_grant_id: 1,
        user_id: 2,
        amount: 50.00
      }
    }, queryRunner);
  });
}
```

**No consumer needed** because Missions doesn't care about wallet events, notification events, etc.

---

### Example 2: Wallet Pillar (Consumer + Producer)

**Consumer side:**

```typescript
// src/plugins/wallet/consumers/mission-reward.consumer.ts

@Injectable()
export class MissionRewardConsumer implements OnModuleInit {

  onModuleInit() {
    // LISTEN to missions pillar events
    this.eventBus.subscribe(
      'MISSION_REWARD_REQUESTED',  // From Missions pillar
      this.handleMissionRewardRequested.bind(this)
    );
  }

  async handleMissionRewardRequested(event) {
    // REACT: Credit user's wallet
    await this.workflowService.processMissionReward(event);
  }
}
```

**Producer side:**

```typescript
// src/plugins/wallet/services/wallet.workflow.service.ts

async processMissionReward(event) {
  await this.txService.run(async (queryRunner) => {
    // Credit wallet
    await this.updateBalance(...);

    // EMIT event (tell other pillars)
    await this.outboxService.enqueue({
      event_name: 'WALLET_CREDITED',  // Other pillars can listen to this
      payload: {
        wallet_id: 2,
        amount: 50.00,
        new_balance: 200.00
      }
    }, queryRunner);
  });
}
```

**Consumer needed** because Wallet needs to react to mission events AND emit its own events.

---

### Example 3: Notification Pillar (Consumer Only - Hypothetical)

**Only consumes, never emits:**

```typescript
// src/plugins/notification/consumers/wallet-credited.consumer.ts

@Injectable()
export class WalletCreditedConsumer implements OnModuleInit {

  onModuleInit() {
    // LISTEN to wallet events
    this.eventBus.subscribe(
      'WALLET_CREDITED',
      this.handleWalletCredited.bind(this)
    );
  }

  async handleWalletCredited(event) {
    // REACT: Send push notification
    await this.notificationService.sendPushNotification({
      user_id: event.user_id,
      title: 'Coins Received!',
      message: `You received ${event.amount} coins. New balance: ${event.new_balance}`
    });

    // NO EVENT EMITTED
    // Notifications don't need to tell other pillars about sending notifications
  }
}
```

**No events emitted** because other pillars don't care about notification delivery status (usually).

---

## File Structure for Each Pattern

### Pattern 1: Producer Only (Missions)

```
src/plugins/missions/
├── controllers/
│   └── missions.controller.ts
├── services/
│   └── missions.workflow.service.ts  ✅ Emits events via OutboxService
├── repositories/
│   └── ...
└── NO consumers/ folder needed ❌
```

### Pattern 2: Consumer Only (Notification)

```
src/plugins/notification/
├── controllers/
│   └── notification.controller.ts
├── services/
│   └── notification.service.ts  ❌ NO OutboxService calls
├── consumers/  ✅ NEEDED
│   ├── wallet-credited.consumer.ts
│   ├── mission-completed.consumer.ts
│   └── user-registered.consumer.ts
└── repositories/
    └── ...
```

### Pattern 3: Producer + Consumer (Wallet)

```
src/plugins/wallet/
├── controllers/
│   └── wallet.controller.ts
├── services/
│   └── wallet.workflow.service.ts  ✅ Emits events
├── consumers/  ✅ NEEDED
│   ├── mission-reward.consumer.ts
│   └── commission-payout.consumer.ts (future)
└── repositories/
    └── ...
```

---

## How to Create a Consumer

### Step 1: Create Consumer File

**File:** `src/plugins/[pillar]/consumers/[event-source].consumer.ts`

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { [YourWorkflow]Service } from '../services/[your].workflow.service';

@Injectable()
export class [EventSource]Consumer implements OnModuleInit {
  private readonly logger = new Logger([EventSource]Consumer.name);

  constructor(
    private readonly workflowService: [YourWorkflow]Service,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Register event handlers on startup
   */
  onModuleInit() {
    this.eventBus.subscribe(
      'EVENT_NAME_FROM_OTHER_PILLAR',  // e.g., 'MISSION_REWARD_REQUESTED'
      this.handleEvent.bind(this),
    );

    this.logger.log('✅ Registered for EVENT_NAME_FROM_OTHER_PILLAR events');
  }

  /**
   * Handle the event
   */
  async handleEvent(event: {
    // Event payload structure
    field1: string;
    field2: number;
  }): Promise<void> {
    this.logger.log(`Processing EVENT_NAME: ${event.field1}`);

    try {
      // Call your workflow service
      const result = await this.workflowService.doSomething(event);

      this.logger.log(`Event processed successfully: ${result}`);
    } catch (error) {
      this.logger.error(`Failed to process event: ${error.message}`, error.stack);
      throw error; // Re-throw for retry
    }
  }
}
```

### Step 2: Register Consumer in Module

**File:** `src/plugins/[pillar]/[pillar].module.ts`

```typescript
import { Module } from '@nestjs/common';
import { [EventSource]Consumer } from './consumers/[event-source].consumer';

@Module({
  providers: [
    // Services
    [YourWorkflow]Service,

    // Consumers
    [EventSource]Consumer,  // ← Add this
  ],
})
export class [Pillar]Module {}
```

### Step 3: Consumer Auto-Registers on Startup

When the app starts:
1. NestJS creates the consumer instance
2. `OnModuleInit` lifecycle hook is called
3. Consumer calls `eventBus.subscribe()` to register
4. Consumer is ready to receive events

---

## Event Flow Summary

```
┌──────────────────────────────────────────────────────────────────┐
│                         EVENT FLOW                               │
└──────────────────────────────────────────────────────────────────┘

1. Producer Pillar (e.g., Missions)
   ↓
   Emits event via OutboxService.enqueue()
   ↓
   Stored in outbox_event table (status='new')
   ↓
2. OutboxProcessor (polls every 2s)
   ↓
   Publishes to EventBus
   ↓
3. EventBus (in-memory router)
   ↓
   Routes to registered consumers
   ↓
4. Consumer Pillar (e.g., Wallet)
   ↓
   Handler function is invoked
   ↓
   Executes business logic
   ↓
   (Optional) Emits new events
```

---

## Quick Reference: When to Create What

| Scenario | Need Consumer? | Emit Events? |
|----------|---------------|--------------|
| Pillar reacts to other pillars | ✅ YES | Maybe |
| Pillar notifies other pillars | NO | ✅ YES |
| Pillar does both | ✅ YES | ✅ YES |
| Pillar is standalone (no events) | NO | NO |

---

## Examples by Pillar

### Missions Pillar
- **Consumers:** ❌ None needed (standalone)
- **Events emitted:** ✅ MISSION_REWARD_REQUESTED, MISSION_ASSIGNED, etc.
- **Reason:** Triggers rewards but doesn't need to react to wallet/notifications

### Wallet Pillar
- **Consumers:** ✅ mission-reward.consumer.ts (listens to MISSION_REWARD_REQUESTED)
- **Events emitted:** ✅ WALLET_CREDITED, WALLET_DEBITED, etc.
- **Reason:** Reacts to missions AND notifies other pillars about balance changes

### Commission Pillar (Future)
- **Consumers:** ✅ wallet-credited.consumer.ts (listens to WALLET_CREDITED)
- **Events emitted:** ✅ COMMISSION_CALCULATED, COMMISSION_PAID, etc.
- **Reason:** Reacts to wallet credits AND emits commission events

### Notification Pillar (Future)
- **Consumers:** ✅ Multiple consumers (mission-completed, wallet-credited, etc.)
- **Events emitted:** ❌ Probably none (notifications don't need to notify)
- **Reason:** Pure reactor - only sends notifications, doesn't trigger business logic

### File Pillar
- **Consumers:** ❌ None needed
- **Events emitted:** ✅ FILE_UPLOADED, FILE_SCANNED, etc.
- **Reason:** Manages files independently, other pillars react to file events

### User Pillar
- **Consumers:** ❌ None needed (maybe future: react to referral events)
- **Events emitted:** ✅ USER_REGISTERED, USER_VERIFIED, etc.
- **Reason:** User lifecycle events that other pillars react to

---

## Common Mistakes

### ❌ Mistake 1: Creating Consumer When Not Needed

```typescript
// WRONG: Missions doesn't need to react to wallet events
// src/plugins/missions/consumers/wallet-credited.consumer.ts ❌
// DON'T CREATE THIS!
```

**Why wrong:** Missions doesn't care about wallet balance changes. No business logic depends on it.

---

### ❌ Mistake 2: Forgetting Consumer When Needed

```typescript
// WRONG: Wallet needs to react to mission rewards
// but no consumer created ❌

// Result: Mission rewards are created but wallet is never credited!
```

**Why wrong:** Without a consumer, nobody is listening to MISSION_REWARD_REQUESTED events.

---

### ❌ Mistake 3: Direct Service Calls Instead of Events

```typescript
// WRONG: Direct call between pillars ❌
// src/plugins/missions/services/missions.workflow.service.ts

async approveSubmission(submission_id: number) {
  await this.txService.run(async (queryRunner) => {
    // Update mission data
    await queryRunner.update(...);

    // WRONG: Direct call to wallet service ❌
    await this.walletService.creditCoins(user_id, 50.00);
  });
}
```

**Why wrong:**
- Tight coupling between pillars
- No auditability
- Can't retry if wallet service is down
- Breaks microservices principles

**Correct approach:**
```typescript
// CORRECT: Emit event instead ✅
async approveSubmission(submission_id: number) {
  await this.txService.run(async (queryRunner) => {
    await queryRunner.update(...);

    // Emit event, let wallet consumer handle it ✅
    await this.outboxService.enqueue({
      event_name: 'MISSION_REWARD_REQUESTED',
      payload: { user_id, amount: 50.00 }
    }, queryRunner);
  });
}
```

---

## Summary

**Key Principle:**
- 🎯 **Create a consumer** when your pillar needs to REACT to events from OTHER pillars
- 🎯 **Emit events** when you want to NOTIFY other pillars about something
- 🎯 **Neither** if your pillar is completely standalone

**Simple Rule:**
```
If you need to DO SOMETHING when another pillar's event happens
→ Create a consumer

If you want to TELL other pillars about something
→ Emit an event via OutboxService
```

**Most Common Pattern in GCPro:**
- **Producer + Consumer** - Pillars that both react and notify (like Wallet)
- This creates a decoupled event-driven architecture where pillars communicate via events instead of direct calls.
