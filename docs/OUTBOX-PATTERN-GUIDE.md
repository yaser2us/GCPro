# Outbox Pattern: Complete Code-Level Guide

## Table of Contents
1. [What is the Outbox Pattern?](#what-is-the-outbox-pattern)
2. [Why Use the Outbox Pattern?](#why-use-the-outbox-pattern)
3. [Architecture Overview](#architecture-overview)
4. [Database Schema](#database-schema)
5. [Code Implementation](#code-implementation)
6. [Complete Flow Example](#complete-flow-example)
7. [Error Handling & Retry Logic](#error-handling--retry-logic)
8. [Testing the Pattern](#testing-the-pattern)
9. [Common Pitfalls](#common-pitfalls)

---

## What is the Outbox Pattern?

The Outbox Pattern is a reliable way to publish events when you're modifying data in a database. Instead of publishing events directly (which can fail), you:

1. **Store the event in the database** within the same transaction as your business data
2. **Poll the outbox table** with a background process
3. **Publish events** to consumers asynchronously

This guarantees that if your data changes are saved, the event will eventually be published.

### The Problem It Solves

❌ **Without Outbox Pattern:**
```typescript
// PROBLEM: This can fail!
async approveSubmission(id: number) {
  // 1. Update database
  await this.db.update('submission', { status: 'approved' });

  // 2. Publish event (what if this fails?)
  await this.eventBus.publish('SUBMISSION_APPROVED', { id });
  // ^ If this fails, the database is updated but no event was sent!
  // ^ If database commit fails, the event might have been sent already!
}
```

✅ **With Outbox Pattern:**
```typescript
// SOLUTION: Both happen in the same transaction!
async approveSubmission(id: number) {
  await this.txService.run(async (queryRunner) => {
    // 1. Update database
    await queryRunner.update('submission', { status: 'approved' });

    // 2. Store event in outbox table (same transaction!)
    await this.outboxService.enqueue({
      event_name: 'SUBMISSION_APPROVED',
      payload: { id }
    }, queryRunner);
  });
  // Both succeed or both fail together (ATOMIC)

  // 3. Background processor picks up the event later
}
```

---

## Why Use the Outbox Pattern?

### Benefits

1. **Atomicity**: Events and data changes are stored in a single database transaction
2. **Reliability**: Events will never be lost (stored in DB)
3. **Exactly-once processing**: Idempotency keys prevent duplicate events
4. **Decoupling**: Services don't call each other directly
5. **Resilience**: If event processing fails, it can be retried
6. **Audit trail**: All events are stored with metadata

### When to Use It

- ✅ Microservices communicating via events
- ✅ When you need guaranteed event delivery
- ✅ When database changes should trigger actions in other services
- ✅ When you want to decouple services

### When NOT to Use It

- ❌ Real-time synchronous responses needed (use HTTP calls)
- ❌ Single monolithic application with no events
- ❌ Read-only operations

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRODUCER SERVICE                           │
│                     (Missions Plugin)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Business Logic                                              │
│     ┌──────────────────────┐                                   │
│     │ approveSubmission()  │                                   │
│     └──────────┬───────────┘                                   │
│                │                                                │
│                ▼                                                │
│  2. Transaction Starts                                          │
│     ┌────────────────────────────────────┐                     │
│     │ TransactionService.run()           │                     │
│     │ ┌────────────────────────────────┐ │                     │
│     │ │ UPDATE mission_assignment      │ │                     │
│     │ │ INSERT mission_reward_grant    │ │                     │
│     │ │ INSERT outbox_event ◄──────────┼─┼─── SAME TX!        │
│     │ └────────────────────────────────┘ │                     │
│     └────────────────────────────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ Database
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE                                │
├─────────────────────────────────────────────────────────────────┤
│  mission_assignment                                             │
│  mission_reward_grant                                           │
│  outbox_event  ◄───── Event stored here                        │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ Polling every 2s
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OUTBOX PROCESSOR                             │
│                  (Background Worker)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  3. Poll Outbox Table                                           │
│     ┌──────────────────────────────┐                           │
│     │ SELECT * FROM outbox_event   │                           │
│     │ WHERE status = 'new'         │                           │
│     │ ORDER BY created_at          │                           │
│     │ LIMIT 10                     │                           │
│     └──────────┬───────────────────┘                           │
│                │                                                │
│                ▼                                                │
│  4. Publish to EventBus                                         │
│     ┌──────────────────────────────┐                           │
│     │ eventBus.publish(event)      │                           │
│     └──────────┬───────────────────┘                           │
│                │                                                │
│                ▼                                                │
│  5. Update Status                                               │
│     ┌──────────────────────────────┐                           │
│     │ UPDATE outbox_event          │                           │
│     │ SET status = 'published'     │                           │
│     └──────────────────────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ In-memory publish
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       EVENT BUS                                 │
│                  (In-Memory Router)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  6. Route to Consumers                                          │
│     ┌──────────────────────────────────────┐                   │
│     │ Map<eventName, handlers[]>           │                   │
│     │                                      │                   │
│     │ 'MISSION_REWARD_REQUESTED' =>       │                   │
│     │   [MissionRewardConsumer.handle()]  │                   │
│     └──────────┬───────────────────────────┘                   │
│                │                                                │
│                ▼                                                │
│     Invoke all registered handlers                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ Handler invocation
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONSUMER SERVICE                             │
│                    (Wallet Plugin)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  7. Process Event                                               │
│     ┌──────────────────────────────┐                           │
│     │ MissionRewardConsumer        │                           │
│     │  .handleMissionReward()      │                           │
│     └──────────┬───────────────────┘                           │
│                │                                                │
│                ▼                                                │
│  8. Execute Business Logic                                      │
│     ┌────────────────────────────────────┐                     │
│     │ TransactionService.run()           │                     │
│     │ ┌────────────────────────────────┐ │                     │
│     │ │ INSERT ledger_txn              │ │                     │
│     │ │ INSERT ledger_entry (DR/CR)    │ │                     │
│     │ │ UPDATE wallet_balance          │ │                     │
│     │ │ UPDATE reward_grant (granted)  │ │                     │
│     │ │ INSERT outbox_event (credited) │ │                     │
│     │ └────────────────────────────────┘ │                     │
│     └────────────────────────────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### outbox_event Table

This is the heart of the outbox pattern. Every event is stored here.

```sql
CREATE TABLE outbox_event (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  -- Event classification
  topic VARCHAR(128) NOT NULL,              -- e.g., 'MISSION'
  event_type VARCHAR(128),                  -- e.g., 'MISSION_REWARD_REQUESTED'
  aggregate_type VARCHAR(64) NOT NULL,      -- e.g., 'MISSION_ASSIGNMENT'
  aggregate_id VARCHAR(128) NOT NULL,       -- ID of the entity

  -- Processing status
  status VARCHAR(16) DEFAULT 'new',         -- 'new', 'published', 'archived'
  attempts INT UNSIGNED DEFAULT 0,          -- Retry counter

  -- Idempotency & tracing
  idempotency_key VARCHAR(128) UNIQUE,      -- Prevents duplicates
  request_id VARCHAR(128),                  -- Correlation ID

  -- Timing
  occurred_at DATETIME NOT NULL,            -- When the event happened
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Event payload
  payload_json JSON NOT NULL,               -- All event data

  INDEX idx_status_created (status, created_at),
  INDEX idx_idempotency (idempotency_key)
);
```

### Key Fields Explained

| Field | Purpose | Example |
|-------|---------|---------|
| `id` | Unique event identifier | `34` |
| `event_type` | Event name in UPPER_SNAKE_CASE | `MISSION_REWARD_REQUESTED` |
| `aggregate_type` | Type of entity this event is about | `MISSION_ASSIGNMENT` |
| `aggregate_id` | ID of the specific entity | `"2"` |
| `status` | Processing status | `new` → `published` → `archived` |
| `attempts` | How many times we tried to process | `0`, `1`, `2`... |
| `idempotency_key` | Prevents duplicate events | `mission_reward_1` |
| `payload_json` | The actual event data | `{reward_grant_id: 1, user_id: 2}` |

---

## Code Implementation

### 1. The Outbox Entity

**File:** `src/corekit/entities/outbox-event.entity.ts`

```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('outbox_event')
export class OutboxEvent {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 128 })
  topic: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  event_type: string | null;

  @Column({ type: 'varchar', length: 64 })
  aggregate_type: string;

  @Column({ type: 'varchar', length: 128 })
  aggregate_id: string;

  @Column({ type: 'varchar', length: 16, default: 'new' })
  status: 'new' | 'published' | 'archived';

  @Column({ type: 'int', unsigned: true, default: 0 })
  attempts: number;

  @Column({ type: 'varchar', length: 128, nullable: true, unique: true })
  idempotency_key: string | null;

  @Column({ type: 'datetime' })
  occurred_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @Column({ type: 'json' })
  payload_json: any;
}
```

**Key Points:**
- `status` starts at `'new'`
- `idempotency_key` is UNIQUE to prevent duplicate events
- `payload_json` stores all event data as JSON

---

### 2. The Outbox Service (Producer Side)

**File:** `src/corekit/services/outbox.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { OutboxEvent } from '../entities/outbox-event.entity';

@Injectable()
export class OutboxService {
  /**
   * Enqueue an event to the outbox within a transaction
   *
   * CRITICAL: This MUST be called within a transaction (queryRunner)
   * so the event and business data are saved atomically.
   */
  async enqueue(
    envelope: {
      event_name: string;        // e.g., 'MISSION_REWARD_REQUESTED'
      event_version: number;      // Schema version
      aggregate_type: string;     // e.g., 'MISSION_ASSIGNMENT'
      aggregate_id: string;       // e.g., '2'
      actor_user_id: string;      // Who triggered it
      occurred_at: Date;          // When it happened
      correlation_id: string;     // Trace ID
      causation_id: string;       // What caused this
      payload: Record<string, any>; // Event data
      dedupe_key?: string;        // Optional idempotency key
    },
    queryRunner: QueryRunner,     // MUST be within transaction!
  ): Promise<void> {
    const outboxEvent = new OutboxEvent();

    // Map fields to database schema
    outboxEvent.topic = envelope.aggregate_type;
    outboxEvent.event_type = envelope.event_name;
    outboxEvent.aggregate_type = envelope.aggregate_type;
    outboxEvent.aggregate_id = envelope.aggregate_id;
    outboxEvent.occurred_at = envelope.occurred_at;
    outboxEvent.idempotency_key = envelope.dedupe_key || null;
    outboxEvent.request_id = envelope.correlation_id;
    outboxEvent.status = 'new';  // Will be picked up by processor
    outboxEvent.attempts = 0;

    // Store payload with metadata
    outboxEvent.payload_json = {
      ...envelope.payload,
      _meta: {
        event_name: envelope.event_name,
        event_version: envelope.event_version,
        actor_user_id: envelope.actor_user_id,
        correlation_id: envelope.correlation_id,
        causation_id: envelope.causation_id,
      },
    };

    // Save within the same transaction as business data
    await queryRunner.manager.save(OutboxEvent, outboxEvent);
  }
}
```

**Key Points:**
- Takes a `queryRunner` - this is THE transaction context
- Sets `status = 'new'` so the processor will find it
- Stores metadata in `_meta` for event processing
- Saves with `queryRunner.manager.save()` to be part of the transaction

---

### 3. Using Outbox in Business Logic (Producer)

**File:** `src/plugins/missions/services/missions.workflow.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';

@Injectable()
export class MissionsWorkflowService {
  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Approve a mission submission
   *
   * This method demonstrates the outbox pattern:
   * 1. Update business data
   * 2. Store event in outbox
   * 3. Both happen in same transaction
   */
  async approveSubmission(submission_id: number, actor: { actor_user_id: string }) {
    // Start a database transaction
    const result = await this.txService.run(async (queryRunner) => {

      // === STEP 1: Update business data ===

      // Update submission status to 'approved'
      await queryRunner.manager.update(
        'mission_submission',
        { id: submission_id },
        { status: 'approved' }
      );

      // Update assignment status to 'completed'
      await queryRunner.manager.update(
        'mission_assignment',
        { id: assignment_id },
        { status: 'completed' }
      );

      // Create reward grant
      const reward_grant_id = await this.rewardGrantRepo.create(
        {
          assignment_id: assignment_id,
          user_id: user_id,
          amount: 50.00,
          currency: 'COIN',
          reward_type: 'coins',
          status: 'requested',  // Wallet will change this to 'granted'
        },
        queryRunner
      );

      // === STEP 2: Store event in outbox ===

      await this.outboxService.enqueue(
        {
          event_name: 'MISSION_REWARD_REQUESTED',  // Event name
          event_version: 1,
          aggregate_type: 'MISSION_ASSIGNMENT',
          aggregate_id: String(assignment_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: `approve-${submission_id}-${Date.now()}`,
          causation_id: `cmd-approve-${submission_id}`,
          payload: {
            // This is what the consumer will receive
            reward_grant_id: reward_grant_id,
            assignment_id: assignment_id,
            user_id: user_id,
          },
          dedupe_key: `mission_reward_${reward_grant_id}`, // Idempotency
        },
        queryRunner  // CRITICAL: Same transaction!
      );

      return {
        submission_id,
        reward_grant_id,
      };
    });

    return result;
  }
}
```

**Key Points:**
- Everything happens inside `txService.run()`
- Business data and event are saved in the same transaction
- If ANY step fails, the entire transaction rolls back
- The event won't be processed until the transaction commits

---

### 4. The Outbox Processor (Background Worker)

**File:** `src/corekit/services/outbox-processor.service.ts`

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutboxEvent } from '../entities/outbox-event.entity';
import { EventBusService } from './event-bus.service';

@Injectable()
export class OutboxProcessorService implements OnModuleInit {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private isProcessing = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepo: Repository<OutboxEvent>,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Auto-start on module initialization
   */
  onModuleInit() {
    this.startProcessing();
  }

  /**
   * Start the outbox processor
   * Polls every 2 seconds for new events
   */
  startProcessing() {
    if (this.intervalId) {
      this.logger.warn('Outbox processor already running');
      return;
    }

    this.logger.log('🚀 Starting outbox processor...');
    this.logger.log('📮 Polling interval: 2 seconds');

    // Process immediately on start
    this.processEvents();

    // Then poll every 2 seconds
    this.intervalId = setInterval(() => {
      this.processEvents();
    }, 2000);  // Poll every 2 seconds
  }

  /**
   * Process pending events from outbox
   */
  private async processEvents() {
    // Skip if already processing (prevents concurrent runs)
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // === STEP 1: Fetch unprocessed events ===
      const events = await this.outboxRepo.find({
        where: { status: 'new' },          // Only 'new' events
        order: { created_at: 'ASC' },      // Oldest first (FIFO)
        take: 10,                          // Batch size
      });

      if (events.length === 0) {
        return; // Nothing to do
      }

      this.logger.log(`📦 Processing ${events.length} event(s)...`);

      // === STEP 2: Process each event ===
      for (const event of events) {
        await this.processEvent(event);
      }

    } catch (error) {
      this.logger.error(`Error processing outbox: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(event: OutboxEvent) {
    try {
      this.logger.log(`📨 Delivering event: ${event.event_type} (ID: ${event.id})`);

      // === STEP 1: Extract payload and metadata ===
      const payload = { ...event.payload_json };
      delete payload._meta; // Remove metadata from payload

      // Merge payload with metadata
      const eventPayload = {
        ...payload,
        ...payload._meta,  // Include metadata fields
      };

      // === STEP 2: Publish to event bus ===
      await this.eventBus.publish(event.event_type!, eventPayload);

      // === STEP 3: Mark as published ===
      await this.outboxRepo.update(event.id, {
        status: 'published',
        attempts: event.attempts + 1,
      });

      this.logger.log(`✅ Event ${event.id} (${event.event_type}) published successfully`);

    } catch (error) {
      this.logger.error(
        `❌ Failed to process event ${event.id}: ${error.message}`,
        error.stack,
      );

      // === STEP 4: Increment attempts ===
      await this.outboxRepo.update(event.id, {
        attempts: event.attempts + 1,
      });

      // === STEP 5: Archive after too many failures ===
      if (event.attempts >= 5) {
        this.logger.error(`Event ${event.id} failed after ${event.attempts} attempts`);
        await this.outboxRepo.update(event.id, {
          status: 'archived',  // Stop retrying
        });
      }
    }
  }
}
```

**Key Points:**
- **Auto-starts** on module init via `OnModuleInit`
- **Polls every 2 seconds** using `setInterval()`
- **Processes 10 events at a time** (configurable batch size)
- **Updates status** to `'published'` on success
- **Archives events** after 5 failed attempts
- **Prevents concurrent runs** with `isProcessing` flag

---

### 5. The Event Bus (In-Memory Router)

**File:** `src/corekit/services/event-bus.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  // In-memory map: eventName => array of handler functions
  private readonly consumers = new Map<string, Function[]>();

  /**
   * Register a consumer for an event
   *
   * This is called by consumers during startup (OnModuleInit)
   */
  subscribe(eventName: string, handler: Function): void {
    if (!this.consumers.has(eventName)) {
      this.consumers.set(eventName, []);
    }

    this.consumers.get(eventName)!.push(handler);
    this.logger.log(`Registered consumer for event: ${eventName}`);
  }

  /**
   * Publish an event to all registered consumers
   *
   * This is called by the outbox processor
   */
  async publish(eventName: string, payload: any): Promise<void> {
    const handlers = this.consumers.get(eventName) || [];

    if (handlers.length === 0) {
      this.logger.warn(`No consumers registered for event: ${eventName}`);
      return;
    }

    this.logger.log(`Publishing ${eventName} to ${handlers.length} consumer(s)`);

    // Invoke all registered handlers
    for (const handler of handlers) {
      try {
        await handler(payload);  // Call the consumer's handler
      } catch (error) {
        this.logger.error(
          `Error in consumer for ${eventName}: ${error.message}`,
          error.stack,
        );
        throw error; // Re-throw to mark event as failed
      }
    }
  }

  /**
   * Get registered events (for debugging)
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.consumers.keys());
  }
}
```

**Key Points:**
- Simple in-memory **Map** of event names to handlers
- Consumers **subscribe** during startup
- Outbox processor **publishes** events
- Errors are **re-thrown** to mark event as failed

---

### 6. The Consumer (Subscriber Side)

**File:** `src/plugins/wallet/consumers/mission-reward.consumer.ts`

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { WalletWorkflowService } from '../services/wallet.workflow.service';
import { EventBusService } from '../../../corekit/services/event-bus.service';

@Injectable()
export class MissionRewardConsumer implements OnModuleInit {
  private readonly logger = new Logger(MissionRewardConsumer.name);

  constructor(
    private readonly workflowService: WalletWorkflowService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Register event handler on module initialization
   */
  onModuleInit() {
    // Subscribe to the event
    this.eventBus.subscribe(
      'MISSION_REWARD_REQUESTED',           // Event name to listen for
      this.handleMissionRewardRequested.bind(this),  // Handler function
    );

    this.logger.log('✅ Registered for MISSION_REWARD_REQUESTED events');
  }

  /**
   * Handle MISSION_REWARD_REQUESTED event
   *
   * Event payload:
   * - reward_grant_id: ID of the reward grant
   * - assignment_id: ID of the mission assignment
   * - user_id: ID of the user who completed the mission
   */
  async handleMissionRewardRequested(event: {
    reward_grant_id: number;
    assignment_id: number;
    user_id: number;
  }): Promise<void> {
    this.logger.log(
      `Processing MISSION_REWARD_REQUESTED event: reward_grant_id=${event.reward_grant_id}, user_id=${event.user_id}`,
    );

    try {
      // Call workflow service to process the reward
      const result = await this.workflowService.processMissionReward(event);

      if (result.already_processed) {
        // Idempotency: Event was already processed before
        this.logger.log(
          `Reward already processed: reward_grant_id=${event.reward_grant_id}`,
        );
      } else {
        // Success: Wallet was credited
        this.logger.log(
          `Reward processed successfully: reward_grant_id=${event.reward_grant_id}, balance=${result.new_balance}`,
        );
      }

    } catch (error) {
      this.logger.error(
        `Failed to process mission reward: reward_grant_id=${event.reward_grant_id}, error=${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to allow retry by outbox processor
    }
  }
}
```

**Key Points:**
- Implements `OnModuleInit` to register on startup
- **Subscribes** to `MISSION_REWARD_REQUESTED` event
- Handler receives the **payload** from the event
- **Re-throws errors** to trigger retry in outbox processor
- Handles **idempotency** (already processed events)

---

## Complete Flow Example

Let's trace a complete mission-to-coins flow:

### Step 1: User Completes Mission

```
POST /v1/missions/assignments/2/submissions
{
  "files": [{"file_id": 123}]
}
```

### Step 2: Admin Approves Submission

```
POST /v1/missions/submissions/5/approve
Authorization: Bearer admin_token
```

**Code execution:**
```typescript
// missions.workflow.service.ts - approveSubmission()

await this.txService.run(async (queryRunner) => {

  // Update submission: status = 'approved'
  UPDATE mission_submission SET status = 'approved' WHERE id = 5

  // Update assignment: status = 'completed'
  UPDATE mission_assignment SET status = 'completed' WHERE id = 2

  // Create reward grant
  INSERT INTO mission_reward_grant (
    assignment_id, user_id, amount, currency, status
  ) VALUES (2, 2, 50.00, 'COIN', 'requested')
  // Returns: reward_grant_id = 1

  // Store event in outbox (SAME TRANSACTION!)
  INSERT INTO outbox_event (
    topic, event_type, aggregate_type, aggregate_id,
    status, attempts, payload_json, occurred_at
  ) VALUES (
    'MISSION_ASSIGNMENT',
    'MISSION_REWARD_REQUESTED',
    'MISSION_ASSIGNMENT',
    '2',
    'new',
    0,
    '{"reward_grant_id": 1, "assignment_id": 2, "user_id": 2, "_meta": {...}}',
    NOW()
  )
  // Returns: outbox_event.id = 34

  COMMIT; // Both updates and event are saved atomically!
});
```

**Database state after commit:**
```sql
-- mission_reward_grant table
id  assignment_id  user_id  amount  currency  status      ref_type  ref_id
1   2              2        50.00   COIN      requested   NULL      NULL

-- outbox_event table
id  event_type                status  attempts  payload_json
34  MISSION_REWARD_REQUESTED  new     0         {"reward_grant_id": 1, ...}
```

### Step 3: Outbox Processor Picks Up Event (2 seconds later)

```typescript
// outbox-processor.service.ts - processEvents()

// Poll for new events
SELECT * FROM outbox_event
WHERE status = 'new'
ORDER BY created_at ASC
LIMIT 10

// Found: event ID 34

// Publish to EventBus
await this.eventBus.publish('MISSION_REWARD_REQUESTED', {
  reward_grant_id: 1,
  assignment_id: 2,
  user_id: 2
});

// Update status
UPDATE outbox_event
SET status = 'published', attempts = 1
WHERE id = 34
```

**Logs:**
```
[OutboxProcessorService] 📦 Processing 1 event(s)...
[OutboxProcessorService] 📨 Delivering event: MISSION_REWARD_REQUESTED (ID: 34)
[EventBusService] Publishing MISSION_REWARD_REQUESTED to 1 consumer(s)
```

### Step 4: Event Bus Routes to Consumer

```typescript
// event-bus.service.ts - publish()

const handlers = this.consumers.get('MISSION_REWARD_REQUESTED');
// handlers = [MissionRewardConsumer.handleMissionRewardRequested]

for (const handler of handlers) {
  await handler({
    reward_grant_id: 1,
    assignment_id: 2,
    user_id: 2
  });
}
```

### Step 5: Wallet Consumer Processes Event

```typescript
// mission-reward.consumer.ts - handleMissionRewardRequested()

const result = await this.workflowService.processMissionReward({
  reward_grant_id: 1,
  assignment_id: 2,
  user_id: 2
});
```

**Logs:**
```
[MissionRewardConsumer] Processing MISSION_REWARD_REQUESTED event: reward_grant_id=1, user_id=2
```

### Step 6: Wallet Workflow Processes Reward

```typescript
// wallet.workflow.service.ts - processMissionReward()

await this.txService.run(async (queryRunner) => {

  // Validate reward_grant
  SELECT * FROM mission_reward_grant WHERE id = 1
  // status = 'requested' ✅

  // Find or create account for user
  SELECT * FROM account a
  JOIN account_person ap ON a.id = ap.account_id
  JOIN person p ON ap.person_id = p.id
  WHERE p.primary_user_id = 2
  // Found: account_id = 3

  // Find or create wallet
  SELECT * FROM wallet WHERE account_id = 3
  // Found: wallet_id = 2

  // Check idempotency
  SELECT * FROM ledger_txn
  WHERE idempotency_key = 'mission_reward_1'
  // Not found (first time processing)

  // Create ledger transaction
  INSERT INTO ledger_txn (
    account_id, type, status, ref_type, ref_id, idempotency_key
  ) VALUES (
    3, 'mission_reward', 'posted', 'mission_reward_grant', '1', 'mission_reward_1'
  )
  // Returns: ledger_txn_id = 1

  // Create ledger entries (double-entry accounting)
  INSERT INTO ledger_entry (ledger_txn_id, entry_type, amount, currency)
  VALUES (1, 'debit', 50.00, 'COIN'),   -- Debit system account
         (1, 'credit', 50.00, 'COIN')   -- Credit user account

  // Update wallet balance
  UPDATE wallet_balance_snapshot
  SET available_amount = available_amount + 50.00,
      total_amount = total_amount + 50.00
  WHERE wallet_id = 2
  // New balance: 50.00

  // Update reward_grant status and link to ledger_txn
  UPDATE mission_reward_grant
  SET ref_type = 'ledger_txn',
      ref_id = '1',
      status = 'granted'    -- Changed from 'requested' to 'granted'
  WHERE id = 1

  // Emit WALLET_CREDITED event
  INSERT INTO outbox_event (
    event_type, aggregate_type, aggregate_id,
    status, payload_json
  ) VALUES (
    'WALLET_CREDITED',
    'WALLET',
    '2',
    'new',
    '{"wallet_id": 2, "amount": 50.00, "new_balance": "50.00", ...}'
  )

  COMMIT; // All updates saved atomically!
});
```

**Database state after commit:**
```sql
-- mission_reward_grant table (UPDATED)
id  assignment_id  user_id  amount  currency  status   ref_type     ref_id
1   2              2        50.00   COIN      granted  ledger_txn   1

-- ledger_txn table (NEW)
id  account_id  type             status  ref_type               ref_id  idempotency_key
1   3           mission_reward   posted  mission_reward_grant   1       mission_reward_1

-- wallet_balance_snapshot table (UPDATED)
wallet_id  available_amount  held_amount  total_amount
2          50.00             0.00         50.00

-- outbox_event table (UPDATED + NEW)
id  event_type                status      attempts
34  MISSION_REWARD_REQUESTED  published   1         <-- Marked as published
57  WALLET_CREDITED           new         0         <-- New event
```

**Logs:**
```
[MissionRewardConsumer] Reward processed successfully: reward_grant_id=1, ledger_txn_id=1, new_balance=50.00
[OutboxProcessorService] ✅ Event 34 (MISSION_REWARD_REQUESTED) published successfully
```

### Step 7: Complete!

The user now has **50.00 COIN** in their wallet, and the entire flow was:
- ✅ **Atomic**: All data changes in transactions
- ✅ **Reliable**: Events stored in database
- ✅ **Idempotent**: Can retry safely
- ✅ **Auditable**: Full event history in outbox_event

---

## Error Handling & Retry Logic

### Scenario 1: Consumer Throws Error

```typescript
// Consumer fails
async handleMissionRewardRequested(event) {
  // This throws an error
  throw new Error('Database connection lost');
}
```

**What happens:**
1. EventBus catches error and re-throws
2. OutboxProcessor catches error
3. Increments `attempts` counter
4. Event stays in `status = 'new'`
5. Next poll (2 seconds later) retries the event
6. After 5 attempts, event is archived

**Database:**
```sql
-- After failure
UPDATE outbox_event
SET attempts = attempts + 1
WHERE id = 34

-- After 5 failures
UPDATE outbox_event
SET status = 'archived'
WHERE id = 34
```

### Scenario 2: Duplicate Event (Idempotency)

```typescript
// Same event processed twice
await this.workflowService.processMissionReward({
  reward_grant_id: 1,  // Already processed!
  assignment_id: 2,
  user_id: 2
});
```

**What happens:**
1. Wallet service checks `idempotency_key`
2. Finds existing `ledger_txn` with same key
3. Returns early with `already_processed: true`
4. No duplicate transaction created
5. Event marked as published

**Code:**
```typescript
const existingTxn = await this.ledgerTxnRepo.findByIdempotencyKey(
  'mission_reward_1',
  queryRunner
);

if (existingTxn) {
  // Already processed, return early
  return {
    ledger_txn_id: existingTxn.id,
    new_balance: currentBalance?.total_amount,
    already_processed: true  // ← Idempotency flag
  };
}
```

### Scenario 3: Transaction Rollback

```typescript
// Transaction fails mid-way
await this.txService.run(async (queryRunner) => {
  await queryRunner.update(...);  // Success
  await this.outboxService.enqueue(...);  // Success
  throw new Error('Validation failed');  // ROLLBACK!
});
```

**What happens:**
1. All database changes are rolled back
2. Event is NOT stored in outbox_event
3. No event is published
4. Data remains consistent

---

## Testing the Pattern

### 1. Check Pending Events

```sql
SELECT id, event_type, status, attempts, created_at
FROM outbox_event
WHERE status = 'new'
ORDER BY created_at DESC;
```

### 2. Check Published Events

```sql
SELECT id, event_type, status, attempts, created_at
FROM outbox_event
WHERE status = 'published'
ORDER BY created_at DESC
LIMIT 10;
```

### 3. Check Failed Events

```sql
SELECT id, event_type, status, attempts, created_at, payload_json
FROM outbox_event
WHERE status = 'archived'
ORDER BY created_at DESC;
```

### 4. Reset Archived Events (Retry)

```javascript
// scripts/reset-archived-events.js
const [result] = await connection.execute(
  'UPDATE outbox_event SET status = ?, attempts = 0 WHERE status = ?',
  ['new', 'archived']
);
console.log(`Reset ${result.affectedRows} events`);
```

### 5. Monitor Processor Logs

```bash
# Watch for event processing
tail -f logs/app.log | grep OutboxProcessorService

# Expected output:
[OutboxProcessorService] 📦 Processing 4 event(s)...
[OutboxProcessorService] 📨 Delivering event: MISSION_REWARD_REQUESTED (ID: 34)
[OutboxProcessorService] ✅ Event 34 published successfully
```

### 6. Test Idempotency

```bash
# Submit the same request twice with same idempotency key
curl -X POST http://localhost:3000/v1/missions/submissions/5/approve \
  -H "Idempotency-Key: approve-submission-5" \
  -H "Authorization: Bearer token"

# Second call should not create duplicate events
curl -X POST http://localhost:3000/v1/missions/submissions/5/approve \
  -H "Idempotency-Key: approve-submission-5" \
  -H "Authorization: Bearer token"
```

---

## Common Pitfalls

### ❌ Pitfall 1: Publishing Events Outside Transaction

```typescript
// WRONG: Event published outside transaction
async approveSubmission(id: number) {
  await this.txService.run(async (queryRunner) => {
    await queryRunner.update(...);
  });

  // This is OUTSIDE the transaction!
  await this.outboxService.enqueue(..., queryRunner); // WRONG!
}
```

**Problem:** If transaction rolls back, event is still published.

**Solution:**
```typescript
// CORRECT: Event inside transaction
async approveSubmission(id: number) {
  await this.txService.run(async (queryRunner) => {
    await queryRunner.update(...);
    await this.outboxService.enqueue(..., queryRunner); // ✅
  });
}
```

---

### ❌ Pitfall 2: Forgetting to Bind Consumer Handler

```typescript
// WRONG: Handler not bound
onModuleInit() {
  this.eventBus.subscribe(
    'MISSION_REWARD_REQUESTED',
    this.handleMissionRewardRequested  // WRONG! 'this' context lost
  );
}
```

**Problem:** When handler is called, `this` is undefined.

**Solution:**
```typescript
// CORRECT: Bind handler
onModuleInit() {
  this.eventBus.subscribe(
    'MISSION_REWARD_REQUESTED',
    this.handleMissionRewardRequested.bind(this)  // ✅
  );
}
```

---

### ❌ Pitfall 3: Not Re-throwing Errors in Consumer

```typescript
// WRONG: Error swallowed
async handleMissionRewardRequested(event) {
  try {
    await this.workflowService.processMissionReward(event);
  } catch (error) {
    this.logger.error('Failed', error);
    // Error not re-thrown! ❌
  }
}
```

**Problem:** Outbox processor thinks event succeeded, marks as published.

**Solution:**
```typescript
// CORRECT: Re-throw errors
async handleMissionRewardRequested(event) {
  try {
    await this.workflowService.processMissionReward(event);
  } catch (error) {
    this.logger.error('Failed', error);
    throw error; // ✅ Re-throw for retry
  }
}
```

---

### ❌ Pitfall 4: Duplicate idempotency_key

```typescript
// WRONG: Same key for different events
await this.outboxService.enqueue({
  event_name: 'EVENT_A',
  dedupe_key: 'user-1',  // Too generic!
  ...
});

await this.outboxService.enqueue({
  event_name: 'EVENT_B',
  dedupe_key: 'user-1',  // Same key! ❌
  ...
});
```

**Problem:** Second event fails with UNIQUE constraint violation.

**Solution:**
```typescript
// CORRECT: Unique keys
await this.outboxService.enqueue({
  event_name: 'EVENT_A',
  dedupe_key: 'event-a-user-1',  // ✅ Specific
  ...
});

await this.outboxService.enqueue({
  event_name: 'EVENT_B',
  dedupe_key: 'event-b-user-1',  // ✅ Different
  ...
});
```

---

## Summary

The Outbox Pattern provides **reliable event publishing** by:

1. **Storing events in the database** within the same transaction as business data
2. **Polling the outbox table** with a background processor
3. **Publishing to an event bus** that routes to consumers
4. **Handling failures** with automatic retries

**Key benefits:**
- ✅ Atomicity (events + data in one transaction)
- ✅ Reliability (events never lost)
- ✅ Idempotency (safe to retry)
- ✅ Decoupling (services don't call each other)
- ✅ Auditability (full event history)

**Core components:**
- **OutboxService** - Enqueues events within transactions
- **OutboxProcessor** - Polls and publishes events
- **EventBus** - Routes events to consumers
- **Consumer** - Handles events and executes business logic

---

## Further Reading

- [Microservices.io - Transactional Outbox](https://microservices.io/patterns/data/transactional-outbox.html)
- [Martin Fowler - Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Debezium - Change Data Capture](https://debezium.io/)

**GCPro References:**
- CoreKit Foundation: `specs/corekit/corekit.foundation.v1.yml`
- Wallet Pillar: `specs/wallet/wallet.pillar.v2.yml`
- Database DDL: `docs/database/foundation-DDL.md`
