# Commission Pillar: Outbox Pattern & Event-Driven Integration

## Overview

The **Commission Pillar** communicates with the **Ledger** and **Wallet** services using the **Transactional Outbox Pattern**. This ensures reliable, decoupled, and eventually-consistent communication between services.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Commission Pillar (Producer)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. User Action (API Request)                                      │
│     POST /api/commission/accruals                                  │
│                    │                                                │
│                    ▼                                                │
│  2. CommissionWorkflowService.recordAccrual()                      │
│     ┌──────────────────────────────────────────┐                  │
│     │ TRANSACTION BEGIN                        │                  │
│     │                                          │                  │
│     │  ┌─────────────────────────────────┐    │                  │
│     │  │ WRITE: commission_accrual        │    │                  │
│     │  │ INSERT accrual record            │    │                  │
│     │  └─────────────────────────────────┘    │                  │
│     │                                          │                  │
│     │  ┌─────────────────────────────────┐    │                  │
│     │  │ EMIT: ACCRUAL_RECORDED event     │    │                  │
│     │  │ via OutboxService.enqueue()      │    │                  │
│     │  │                                  │    │                  │
│     │  │ INSERT INTO outbox_event         │    │                  │
│     │  │ - event_name: ACCRUAL_RECORDED   │    │                  │
│     │  │ - payload: { accrual_id, ... }   │    │                  │
│     │  │ - status: 'new'                  │    │                  │
│     │  └─────────────────────────────────┘    │                  │
│     │                                          │                  │
│     │ TRANSACTION COMMIT ✓                    │                  │
│     └──────────────────────────────────────────┘                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           │ Event is persisted in same DB transaction
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Outbox Event Table (Database)                    │
├─────────────────────────────────────────────────────────────────────┤
│ id | event_type        | status | payload_json          | attempts │
│────┼───────────────────┼────────┼───────────────────────┼──────────│
│ 42 | ACCRUAL_RECORDED  | new    | {"accrual_id": 123..} | 0        │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           │ Background worker polls for 'new' events
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Outbox Processor (Background Worker)                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  3. OutboxProcessor.processEvents()                                │
│     - SELECT * FROM outbox_event WHERE status='new'                │
│     - For each event:                                              │
│       ┌────────────────────────────────────┐                       │
│       │ EventBusService.publish()          │                       │
│       │ - Route to registered consumers    │                       │
│       └────────────────────────────────────┘                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           │ Event published to EventBus
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Wallet/Ledger Pillar (Consumers)                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  4. CommissionAccrualConsumer.handleAccrualRecorded()              │
│     ┌──────────────────────────────────────────┐                  │
│     │ TRANSACTION BEGIN                        │                  │
│     │                                          │                  │
│     │  ┌─────────────────────────────────┐    │                  │
│     │  │ WRITE: ledger_txn                │    │                  │
│     │  │ - amount: 100.00 COIN            │    │                  │
│     │  │ - type: 'commission_reward'      │    │                  │
│     │  │ - ref_type: 'commission_accrual' │    │                  │
│     │  │ - ref_id: '123'                  │    │                  │
│     │  │ - idempotency_key: <dedupe_key>  │    │                  │
│     │  └─────────────────────────────────┘    │                  │
│     │                                          │                  │
│     │  ┌─────────────────────────────────┐    │                  │
│     │  │ UPDATE: wallet_balance           │    │                  │
│     │  │ - available_amount += 100.00     │    │                  │
│     │  └─────────────────────────────────┘    │                  │
│     │                                          │                  │
│     │ TRANSACTION COMMIT ✓                    │                  │
│     └──────────────────────────────────────────┘                  │
│                                                                     │
│  5. Consumer returns success → Outbox marks event 'processed'      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. **OutboxService** (`src/corekit/services/outbox.service.ts`)

Handles event persistence within the same database transaction as the business operation.

```typescript
/**
 * Enqueue an event to the outbox within a transaction
 */
async enqueue(
  envelope: OutboxEventEnvelope,
  queryRunner: QueryRunner,
): Promise<void> {
  const outboxEvent = new OutboxEvent();

  outboxEvent.topic = envelope.aggregate_type;
  outboxEvent.event_type = envelope.event_name;
  outboxEvent.aggregate_id = envelope.aggregate_id;
  outboxEvent.occurred_at = envelope.occurred_at;
  outboxEvent.idempotency_key = envelope.dedupe_key;
  outboxEvent.status = 'new';
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

  // Save within the transaction
  await queryRunner.manager.save(OutboxEvent, outboxEvent);
}
```

### 2. **EventBusService** (`src/corekit/services/event-bus.service.ts`)

Routes events to registered consumers (subscribers).

```typescript
/**
 * Publish an event to all registered consumers
 */
async publish(eventName: string, payload: any): Promise<void> {
  const handlers = this.consumers.get(eventName) || [];

  for (const handler of handlers) {
    await handler(payload);
  }
}
```

### 3. **Event Consumer** (Example Pattern)

Registers for specific events and delegates to handlers.

```typescript
@Injectable()
export class CommissionAccrualConsumer implements OnModuleInit {
  constructor(
    private readonly handler: CommissionAccrualHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe(
      'ACCRUAL_RECORDED',
      this.handleAccrualRecorded.bind(this),
    );
  }

  async handleAccrualRecorded(event: any): Promise<void> {
    // Delegate to handler for business logic
    await this.handler.handle(event);
  }
}
```

---

## Event Flow: Commission → Wallet

### **Step 1: Commission Records an Accrual**

**API Request:**
```http
POST /api/commission/accruals
Content-Type: application/json
Idempotency-Key: accrual-12345

{
  "program_id": 1,
  "participant_id": 42,
  "accrual_type": "one_time",
  "amount": 100.00,
  "currency": "COIN",
  "idempotency_key": "accrual-12345"
}
```

**Commission Workflow Service:**
```typescript
async recordAccrual(request, actor, idempotencyKey) {
  return await this.txService.run(async (queryRunner) => {
    // WRITE: Insert accrual record
    const accrualId = await this.accrualRepo.upsert({
      program_id: request.program_id,
      participant_id: request.participant_id,
      amount: request.amount,
      status: 'accrued',
      // ... other fields
    }, queryRunner);

    // EMIT: ACCRUAL_RECORDED event to outbox
    await this.outboxService.enqueue({
      event_name: 'ACCRUAL_RECORDED',
      event_version: 1,
      aggregate_type: 'PROGRAM',
      aggregate_id: String(request.program_id),
      actor_user_id: actor.actor_user_id,
      occurred_at: new Date(),
      correlation_id: `record-accrual-${accrualId}`,
      causation_id: `cmd-record-accrual-${accrualId}`,
      payload: {
        accrual_id: accrualId,
        program_id: request.program_id,
        participant_id: request.participant_id,
        amount: request.amount,
      },
      dedupe_key: idempotencyKey,
    }, queryRunner);

    // COMMIT: Both accrual and event are committed together
    return { accrual_id: accrualId };
  });
}
```

**Database State After Commit:**
```sql
-- commission_accrual table
INSERT INTO commission_accrual (id, program_id, participant_id, amount, status)
VALUES (123, 1, 42, 100.00, 'accrued');

-- outbox_event table (same transaction)
INSERT INTO outbox_event (event_type, aggregate_id, payload_json, status)
VALUES ('ACCRUAL_RECORDED', '1', '{"accrual_id":123,"amount":100.00}', 'new');
```

---

### **Step 2: Outbox Processor Publishes Event**

**Background Worker:**
```typescript
class OutboxProcessor {
  async processEvents() {
    // Poll for new events
    const events = await this.outboxRepo.findPending(100);

    for (const event of events) {
      try {
        // Publish to EventBus
        await this.eventBus.publish(event.event_type, event.payload_json);

        // Mark as processed
        await this.outboxRepo.markProcessed(event.id);
      } catch (error) {
        // Mark as failed, retry later
        await this.outboxRepo.markFailed(event.id, error);
      }
    }
  }
}
```

---

### **Step 3: Wallet Consumer Processes Event**

**Consumer Registration:**
```typescript
@Injectable()
export class CommissionAccrualConsumer implements OnModuleInit {
  onModuleInit() {
    this.eventBus.subscribe('ACCRUAL_RECORDED', this.handleAccrualRecorded.bind(this));
  }

  async handleAccrualRecorded(event: {
    accrual_id: number;
    participant_id: number;
    amount: number;
  }) {
    // Delegate to handler
    await this.commissionAccrualHandler.handle(event);
  }
}
```

**Handler Implementation:**
```typescript
@Injectable()
export class CommissionAccrualHandler {
  constructor(
    private readonly ledgerService: LedgerService,
    private readonly walletService: WalletService,
  ) {}

  async handle(event: any) {
    return await this.txService.run(async (queryRunner) => {
      // 1. Get participant wallet
      const participant = await this.participantRepo.findById(event.participant_id);
      const wallet = await this.walletRepo.findById(participant.wallet_id);

      // 2. Create ledger transaction (idempotent)
      const ledgerTxn = await this.ledgerService.createTransaction({
        wallet_id: wallet.id,
        amount: event.amount,
        currency: 'COIN',
        type: 'credit',
        ref_type: 'commission_accrual',
        ref_id: String(event.accrual_id),
        idempotency_key: `accrual-${event.accrual_id}`,
      }, queryRunner);

      // 3. Update wallet balance
      await this.walletService.updateBalance({
        wallet_id: wallet.id,
        amount: event.amount,
        operation: 'add',
      }, queryRunner);

      return {
        ledger_txn_id: ledgerTxn.id,
        new_balance: wallet.available_amount + event.amount,
      };
    });
  }
}
```

**Database State After Processing:**
```sql
-- ledger_txn table
INSERT INTO ledger_txn (wallet_id, amount, type, ref_type, ref_id, idempotency_key)
VALUES (456, 100.00, 'credit', 'commission_accrual', '123', 'accrual-123');

-- wallet_balance table
UPDATE wallet_balance
SET available_amount = available_amount + 100.00
WHERE wallet_id = 456;

-- outbox_event table
UPDATE outbox_event
SET status = 'processed', processed_at = NOW()
WHERE id = 42;
```

---

## Key Events Emitted by Commission Pillar

### 1. **ACCRUAL_RECORDED**
**When:** A commission accrual is recorded
**Consumers:** Wallet Service (credits participant wallet)
**Payload:**
```json
{
  "accrual_id": 123,
  "program_id": 1,
  "participant_id": 42,
  "amount": 100.00,
  "currency": "COIN"
}
```

### 2. **PAYOUT_BATCH_COMPLETED**
**When:** A payout batch processing completes
**Consumers:** Wallet Service (processes bulk payouts), Notification Service
**Payload:**
```json
{
  "batch_id": 10,
  "program_id": 1,
  "total_amount": 5000.00,
  "item_count": 50
}
```

### 3. **PARTICIPANT_ENROLLED**
**When:** A user is enrolled in a commission program
**Consumers:** Analytics Service, Notification Service
**Payload:**
```json
{
  "participant_id": 42,
  "program_id": 1,
  "user_id": 100
}
```

---

## Benefits of Outbox Pattern

### ✅ **Atomicity**
- Event persistence happens in the **same transaction** as the business operation
- Either both succeed or both fail (no partial state)

### ✅ **Guaranteed Delivery**
- Events are persisted to database before publishing
- Background worker ensures events are eventually processed
- Automatic retries on failure

### ✅ **Idempotency**
- Each event has an `idempotency_key`
- Consumers can safely process the same event multiple times
- Ledger transactions use idempotency keys to prevent duplicates

### ✅ **Decoupling**
- Commission service doesn't directly call Wallet/Ledger APIs
- Services communicate via events
- Easy to add new consumers without changing producers

### ✅ **Resilience**
- If Wallet service is down, events wait in the outbox
- Processing resumes automatically when service recovers
- No data loss even during failures

### ✅ **Auditability**
- Full event history in `outbox_event` table
- Can replay events if needed
- Complete audit trail of all commission actions

---

## Implementing a New Event Consumer

### Example: Listen to ACCRUAL_RECORDED and Send Notification

**1. Create Handler:**
```typescript
// src/plugins/notification/handlers/commission-accrual.handler.ts
@Injectable()
export class CommissionAccrualHandler {
  async handle(event: { accrual_id: number; participant_id: number; amount: number }) {
    // Get participant details
    const participant = await this.participantRepo.findById(event.participant_id);

    // Send email notification
    await this.emailService.send({
      to: participant.email,
      subject: 'Commission Earned!',
      body: `You earned ${event.amount} COIN commission!`,
    });
  }
}
```

**2. Create Consumer:**
```typescript
// src/plugins/notification/consumers/commission-accrual.consumer.ts
@Injectable()
export class CommissionAccrualConsumer implements OnModuleInit {
  constructor(
    private readonly handler: CommissionAccrualHandler,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('ACCRUAL_RECORDED', this.handleAccrualRecorded.bind(this));
    console.log('✅ Registered for ACCRUAL_RECORDED events');
  }

  async handleAccrualRecorded(event: any): Promise<void> {
    await this.handler.handle(event);
  }
}
```

**3. Register in Module:**
```typescript
@Module({
  providers: [
    CommissionAccrualConsumer,
    CommissionAccrualHandler,
  ],
})
export class NotificationModule {}
```

---

## Outbox Event Schema

```sql
CREATE TABLE outbox_event (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  topic VARCHAR(128) NOT NULL,              -- Aggregate type (e.g., 'PROGRAM')
  event_type VARCHAR(128) NOT NULL,         -- Event name (e.g., 'ACCRUAL_RECORDED')
  aggregate_type VARCHAR(64) NOT NULL,
  aggregate_id VARCHAR(128) NOT NULL,
  occurred_at DATETIME NOT NULL,
  idempotency_key VARCHAR(128),             -- For deduplication
  request_id VARCHAR(128),                  -- Correlation ID
  payload_json JSON NOT NULL,               -- Event data
  status VARCHAR(16) DEFAULT 'new',         -- new | processed | failed
  attempts INT DEFAULT 0,                   -- Retry count
  processed_at DATETIME,
  error_message TEXT,
  created_at DATETIME DEFAULT NOW(),

  INDEX idx_status_created (status, created_at),
  UNIQUE INDEX uk_idempotency (idempotency_key)
);
```

---

## Testing the Integration

### 1. **Record a Commission Accrual**
```bash
curl -X POST http://localhost:3000/api/commission/accruals \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-accrual-001" \
  -d '{
    "program_id": 1,
    "participant_id": 42,
    "accrual_type": "one_time",
    "amount": 100.00,
    "currency": "COIN",
    "idempotency_key": "test-accrual-001"
  }'
```

### 2. **Verify Outbox Event**
```sql
SELECT * FROM outbox_event
WHERE event_type = 'ACCRUAL_RECORDED'
ORDER BY created_at DESC LIMIT 1;
```

### 3. **Check Wallet Balance**
```bash
curl http://localhost:3000/v1/wallets/456/balance
```

Expected response:
```json
{
  "wallet_id": 456,
  "available_amount": 100.00,
  "currency": "COIN"
}
```

---

## Troubleshooting

### Event Stuck in 'new' Status
**Cause:** Outbox processor not running
**Solution:** Start the background worker or manually trigger processing

### Event Marked as 'failed'
**Cause:** Consumer threw an exception
**Solution:** Check `error_message` column, fix issue, mark as 'new' to retry

### Duplicate Credits
**Cause:** Idempotency key not being used
**Solution:** Ensure all ledger transactions use unique idempotency keys

---

## Summary

The **Commission Pillar** uses the **Transactional Outbox Pattern** to reliably communicate with the **Wallet** and **Ledger** services:

1. **Commission records accrual** → Writes to DB + Outbox in same transaction
2. **Background worker polls outbox** → Publishes events to EventBus
3. **Wallet consumer receives event** → Credits user wallet via Ledger
4. **Outbox marks event processed** → Audit trail preserved

This pattern ensures **atomicity**, **guaranteed delivery**, **idempotency**, and **decoupling** between services.
