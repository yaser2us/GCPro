# Commission Events Reference

Quick reference for all events emitted by the Commission pillar.

---

## Event Catalog

### 1. PROGRAM_CREATED
**Emitted by:** `CommissionWorkflowService.createProgram()`
**When:** A new commission program is created
**Aggregate:** `PROGRAM`

**Payload:**
```json
{
  "program_id": 1,
  "code": "REFERRAL_COMMISSION_2024",
  "name": "Referral Commission Program 2024"
}
```

**Metadata:**
```json
{
  "_meta": {
    "event_name": "PROGRAM_CREATED",
    "event_version": 1,
    "actor_user_id": "admin-123",
    "correlation_id": "create-program-1-1234567890",
    "causation_id": "cmd-create-program-1"
  }
}
```

**Potential Consumers:**
- Analytics Service (track program creation)
- Notification Service (notify admins)
- Audit Service (log program changes)

---

### 2. PROGRAM_PAUSED
**Emitted by:** `CommissionWorkflowService.pauseProgram()`
**When:** A commission program is paused
**Aggregate:** `PROGRAM`

**Payload:**
```json
{
  "program_id": 1
}
```

**Potential Consumers:**
- Notification Service (notify participants)
- Analytics Service (track program status changes)

---

### 3. PROGRAM_ACTIVATED
**Emitted by:** `CommissionWorkflowService.activateProgram()`
**When:** A paused commission program is activated
**Aggregate:** `PROGRAM`

**Payload:**
```json
{
  "program_id": 1
}
```

**Potential Consumers:**
- Notification Service (notify participants)
- Analytics Service (track program status changes)

---

### 4. PARTICIPANT_ENROLLED
**Emitted by:** `CommissionWorkflowService.enrollParticipant()`
**When:** A participant is enrolled in a commission program
**Aggregate:** `PROGRAM`

**Payload:**
```json
{
  "participant_id": 42,
  "program_id": 1
}
```

**Potential Consumers:**
- Analytics Service (track enrollments)
- Notification Service (welcome email)
- CRM Service (update user profile)

---

### 5. PARTICIPANT_STATUS_UPDATED
**Emitted by:** `CommissionWorkflowService.updateParticipantStatus()`
**When:** A participant's status changes (active/inactive/suspended)
**Aggregate:** `PROGRAM`

**Payload:**
```json
{
  "participant_id": 42,
  "status": "active"
}
```

**Potential Consumers:**
- Notification Service (status change email)
- Analytics Service (track status changes)
- Compliance Service (audit participant status)

---

### 6. RULE_CREATED
**Emitted by:** `CommissionWorkflowService.createRule()`
**When:** A new commission rule is created
**Aggregate:** `PROGRAM`

**Payload:**
```json
{
  "rule_id": 10,
  "program_id": 1
}
```

**Potential Consumers:**
- Analytics Service (track rule changes)
- Notification Service (notify participants of new rules)

---

### 7. ACCRUAL_RECORDED ⭐
**Emitted by:** `CommissionWorkflowService.recordAccrual()`
**When:** A commission accrual is recorded
**Aggregate:** `PROGRAM`

**Payload:**
```json
{
  "accrual_id": 123,
  "program_id": 1,
  "participant_id": 42,
  "amount": 100.00
}
```

**Metadata:**
```json
{
  "_meta": {
    "event_name": "ACCRUAL_RECORDED",
    "event_version": 1,
    "actor_user_id": "system",
    "correlation_id": "record-accrual-123-1234567890",
    "causation_id": "cmd-record-accrual-123"
  }
}
```

**Critical Consumers:**
- **Wallet Service** (credit participant wallet via ledger) ✅ MUST IMPLEMENT
- Notification Service (notify participant of earnings)
- Analytics Service (track commission metrics)
- Tax Service (track taxable income)

**Integration Example:**
```typescript
// Wallet Service Consumer
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
    // Get participant wallet
    const participant = await this.participantRepo.findById(event.participant_id);

    // Create ledger transaction (idempotent)
    await this.ledgerService.createTransaction({
      wallet_id: participant.wallet_id,
      amount: event.amount,
      currency: 'COIN',
      type: 'credit',
      ref_type: 'commission_accrual',
      ref_id: String(event.accrual_id),
      idempotency_key: `accrual-${event.accrual_id}`,
    });
  }
}
```

---

### 8. ACCRUAL_VOIDED
**Emitted by:** `CommissionWorkflowService.voidAccrual()`
**When:** A commission accrual is voided
**Aggregate:** `PROGRAM`

**Payload:**
```json
{
  "accrual_id": 123,
  "reason": "Duplicate entry"
}
```

**Critical Consumers:**
- **Wallet Service** (reverse the credit) ✅ MUST IMPLEMENT
- Notification Service (notify participant)
- Audit Service (log void action)

---

### 9. PAYOUT_BATCH_CREATED
**Emitted by:** `CommissionWorkflowService.createPayoutBatch()`
**When:** A new payout batch is created
**Aggregate:** `PAYOUT_BATCH`

**Payload:**
```json
{
  "batch_id": 10,
  "program_id": 1
}
```

**Potential Consumers:**
- Analytics Service (track batch creation)
- Finance Service (prepare payment processing)

---

### 10. PAYOUT_BATCH_COMPLETED ⭐
**Emitted by:** `CommissionWorkflowService.processPayoutBatch()`
**When:** A payout batch processing completes
**Aggregate:** `PAYOUT_BATCH`

**Payload:**
```json
{
  "batch_id": 10
}
```

**Critical Consumers:**
- **Wallet Service** (process bulk payouts) ✅ SHOULD IMPLEMENT
- Notification Service (notify participants)
- Finance Service (reconciliation)

---

## Event Flow Diagrams

### Commission Accrual Flow

```
┌─────────────┐
│   User      │
│  Completes  │
│  Referral   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Commission Service                  │
│ POST /api/commission/accruals       │
│                                     │
│ 1. Write commission_accrual         │
│ 2. Emit ACCRUAL_RECORDED event      │
│    → Outbox (same transaction)      │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Outbox Event Table                  │
│ status: 'new'                       │
└──────┬──────────────────────────────┘
       │
       ▼ (Background Worker)
┌─────────────────────────────────────┐
│ EventBus.publish('ACCRUAL_RECORDED')│
└──────┬──────────────────────────────┘
       │
       ├────────────────┬──────────────┬─────────────┐
       ▼                ▼              ▼             ▼
┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│   Wallet    │  │Notification│ │ Analytics│ │   Tax    │
│   Service   │  │  Service   │ │  Service │ │  Service │
│             │  │            │ │          │ │          │
│1. Create    │  │Send email  │ │Track     │ │Calculate │
│  ledger_txn │  │to user     │ │metrics   │ │tax       │
│2. Credit    │  │            │ │          │ │          │
│  wallet     │  │            │ │          │ │          │
└─────────────┘  └────────────┘  └──────────┘  └──────────┘
```

---

## Consumer Implementation Checklist

### Must Implement (Critical for System Integrity)

- ✅ **ACCRUAL_RECORDED → Wallet Service**
  - Create ledger transaction
  - Update wallet balance
  - Use idempotency key to prevent duplicates

- ✅ **ACCRUAL_VOIDED → Wallet Service**
  - Reverse ledger transaction
  - Deduct from wallet balance
  - Handle insufficient balance edge case

### Should Implement (Important for UX)

- ⚠️ **PARTICIPANT_ENROLLED → Notification Service**
  - Send welcome email
  - Explain commission program

- ⚠️ **ACCRUAL_RECORDED → Notification Service**
  - Notify user of earnings
  - Show current balance

### Optional (Nice to Have)

- 💡 **All Events → Analytics Service**
  - Track commission metrics
  - Generate reports

- 💡 **All Events → Audit Service**
  - Log all commission actions
  - Compliance tracking

---

## Testing Events

### 1. Manual Event Trigger (Development)

```typescript
// Inject EventBusService in any service
await this.eventBus.publish('ACCRUAL_RECORDED', {
  accrual_id: 123,
  participant_id: 42,
  amount: 100.00,
});
```

### 2. Check Outbox Events (Database)

```sql
-- View recent events
SELECT
  id,
  event_type,
  aggregate_id,
  status,
  payload_json,
  created_at
FROM outbox_event
ORDER BY created_at DESC
LIMIT 10;

-- View failed events
SELECT *
FROM outbox_event
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Retry failed event
UPDATE outbox_event
SET status = 'new', attempts = 0
WHERE id = 42;
```

### 3. Mock Consumer for Testing

```typescript
// test/mock-consumer.ts
@Injectable()
export class MockCommissionConsumer implements OnModuleInit {
  private readonly events: any[] = [];

  onModuleInit() {
    this.eventBus.subscribe('ACCRUAL_RECORDED', (event) => {
      this.events.push(event);
      console.log('Mock consumer received:', event);
    });
  }

  getReceivedEvents() {
    return this.events;
  }
}
```

---

## Event Versioning

All events include `event_version` in metadata:

```json
{
  "_meta": {
    "event_name": "ACCRUAL_RECORDED",
    "event_version": 1,  // ← Version number
    ...
  }
}
```

### Version Upgrade Strategy

**When schema changes (e.g., adding new field):**

1. Increment version: `event_version: 2`
2. Consumers handle both versions:

```typescript
async handleAccrualRecorded(event: any) {
  const version = event._meta.event_version;

  if (version === 1) {
    // Old schema
    return this.handleV1(event);
  } else if (version === 2) {
    // New schema
    return this.handleV2(event);
  }
}
```

---

## Monitoring & Observability

### Key Metrics to Track

1. **Event Publish Rate**
   - Events/second by type
   - Alert if rate drops to zero

2. **Processing Latency**
   - Time from event creation to processing
   - Target: < 5 seconds

3. **Failure Rate**
   - % of events marked as 'failed'
   - Alert if > 1%

4. **Retry Count**
   - Events with attempts > 3
   - May indicate systemic issue

### Example Monitoring Query

```sql
-- Events stuck in 'new' for > 5 minutes
SELECT COUNT(*)
FROM outbox_event
WHERE status = 'new'
  AND created_at < NOW() - INTERVAL 5 MINUTE;

-- Failed events in last hour
SELECT event_type, COUNT(*) as failures
FROM outbox_event
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL 1 HOUR
GROUP BY event_type;
```

---

## Frequently Asked Questions

### Q: What if the wallet service is down when ACCRUAL_RECORDED is published?

**A:** The event remains in the outbox with status 'new'. The background worker will retry automatically until the wallet service recovers.

### Q: Can the same event be processed twice?

**A:** Yes, events can be redelivered. Consumers MUST be idempotent. Use `idempotency_key` in ledger transactions to prevent duplicates.

### Q: How long are events kept in the outbox?

**A:** Processed events can be archived after 30 days. Failed events should be investigated before deletion.

### Q: Can I replay events?

**A:** Yes, update event status from 'processed' to 'new' to trigger reprocessing. Ensure consumers are idempotent.

### Q: What happens if event processing fails?

**A:** The event is marked as 'failed', attempts are incremented, and error_message is stored. Background worker will retry with exponential backoff.

---

## Related Documentation

- [Commission Outbox Integration Guide](./COMMISSION-OUTBOX-INTEGRATION.md)
- [API Endpoints Reference](./API-ENDPOINTS-REFERENCE.md)
- [Postman Collection Guide](./POSTMAN-COLLECTION-GUIDE.md)
