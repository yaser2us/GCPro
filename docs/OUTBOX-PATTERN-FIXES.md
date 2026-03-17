# Outbox Pattern Implementation - Fixes Applied

## Summary

Successfully implemented and fixed the outbox pattern for event-driven communication between the Missions and Wallet pillars.

## Issues Fixed

### 1. Status Validation Mismatch ✅

**Problem:**
- Missions service creates `mission_reward_grant` with `status='requested'`
- Wallet service was validating for `status='granted'`
- Events failed with error: "Reward status is requested, expected 'granted'"

**Solution:**
Updated `src/plugins/wallet/services/wallet.workflow.service.ts`:

```typescript
// Before (line 652)
if (reward_grant.status !== 'granted') {
  throw new ConflictException({
    code: 'REWARD_NOT_GRANTED',
    message: `Reward status is ${reward_grant.status}, expected 'granted'`,
  });
}

// After
if (reward_grant.status !== 'requested') {
  throw new ConflictException({
    code: 'REWARD_NOT_REQUESTED',
    message: `Reward status is ${reward_grant.status}, expected 'requested'`,
  });
}
```

Also updated the SQL to set status to 'granted' after processing (line 825):

```typescript
// Before
UPDATE mission_reward_grant
SET ref_type = ?, ref_id = ?
WHERE id = ?

// After
UPDATE mission_reward_grant
SET ref_type = ?, ref_id = ?, status = ?
WHERE id = ?
```

### 2. Missing Person-User Links ✅

**Problem:**
- Person records existed but `primary_user_id` was NULL
- Wallet service couldn't find person for user_id
- Events failed with error: "Person with user_id 2 not found"

**Solution:**
Created and ran `scripts/fix-person-links.js` to update:
- Person ID 1: Set `primary_user_id=1`, `status='active'`
- Person ID 2: Set `primary_user_id=2`, `status='active'`

### 3. Archived Events Needed Reset ✅

**Problem:**
- Previous failures caused events to be archived (5+ attempts)
- Archived events aren't reprocessed by outbox processor

**Solution:**
Created and ran `scripts/reset-archived-events.js` to:
- Find all events with `status='archived'`
- Reset them to `status='new'`, `attempts=0`
- Allow outbox processor to retry with fixed code

## Files Created

### Outbox Infrastructure
- `src/corekit/services/event-bus.service.ts` - Routes events to consumers
- `src/corekit/services/outbox-processor.service.ts` - Polls outbox table every 2s

### Utility Scripts
- `scripts/reset-archived-events.js` - Reset failed events for reprocessing
- `scripts/fix-person-links.js` - Fix person-user relationships
- `scripts/check-test-data.js` - Verify test data setup
- `scripts/verify-mission-to-coins.js` - Verify complete workflow

### Documentation
- `postman/README.md` - Postman collection usage guide
- `scripts/README.md` - Setup scripts documentation
- This file - Implementation notes and fixes

## Files Modified

- `src/plugins/wallet/services/wallet.workflow.service.ts` - Fixed status validation
- `src/plugins/wallet/consumers/mission-reward.consumer.ts` - Updated event name
- `src/corekit/corekit.module.ts` - Registered EventBus and OutboxProcessor
- `scripts/seed-test-data.sql` - Fixed schema mismatches

## Final Verification

**Mission Reward Grants:**
```
┌────┬───────────────┬─────────┬─────────┬──────────┬───────────┬──────────────┬────────┐
│ id │ assignment_id │ user_id │ amount  │ currency │ status    │ ref_type     │ ref_id │
├────┼───────────────┼─────────┼─────────┼──────────┼───────────┼──────────────┼────────┤
│ 1  │ 2             │ 2       │ 50.00   │ COIN     │ granted   │ ledger_txn   │ 1      │
│ 2  │ 5             │ 2       │ 50.00   │ COIN     │ granted   │ ledger_txn   │ 2      │
│ 3  │ 8             │ 2       │ 50.00   │ COIN     │ granted   │ ledger_txn   │ 3      │
│ 4  │ 9             │ 2       │ 50.00   │ COIN     │ granted   │ ledger_txn   │ 4      │
└────┴───────────────┴─────────┴─────────┴──────────┴───────────┴──────────────┴────────┘
```

**Wallet Balance:**
```
┌───────────┬──────────────────┬─────────────┬──────────────┐
│ wallet_id │ available_amount │ held_amount │ total_amount │
├───────────┼──────────────────┼─────────────┼──────────────┤
│ 2         │ 200.00           │ 0.00        │ 200.00       │
└───────────┴──────────────────┴─────────────┴──────────────┘
```

**Result:** User 2 successfully received 200.00 COIN from 4 approved mission submissions! 🎉

## How the Outbox Pattern Works

1. **Missions Service** (src/plugins/missions):
   - User completes mission and admin approves submission
   - Creates `mission_reward_grant` with status='requested'
   - Emits `MISSION_REWARD_REQUESTED` event to outbox table
   - Event stored in same transaction (atomic)

2. **Outbox Processor** (src/corekit):
   - Polls `outbox_event` table every 2 seconds
   - Finds events with status='new'
   - Publishes to EventBus
   - Marks as 'published' on success, 'archived' after 5 failures

3. **EventBus** (src/corekit):
   - In-memory event router
   - Consumers register for events on startup
   - Delivers events to all registered handlers

4. **Wallet Consumer** (src/plugins/wallet):
   - Listens for `MISSION_REWARD_REQUESTED` events
   - Validates reward_grant status='requested'
   - Creates ledger transaction (double-entry)
   - Updates wallet balance
   - Updates reward_grant status='granted'
   - Emits `WALLET_CREDITED` event

## Key Design Decisions

### Why 'requested' → 'granted' Status Flow?

- Missions creates reward with status='requested' (pending wallet processing)
- Wallet processes and updates to status='granted' (completed)
- This creates a clear audit trail and prevents duplicate processing

### Why Polling Instead of Event Bus?

- Outbox pattern requires polling for reliability
- Events stored in DB within transaction (atomic)
- Polling ensures events aren't lost if app crashes
- 2-second interval balances latency vs. DB load

### Why Separate EventBus and OutboxProcessor?

- EventBus: In-memory routing (fast, synchronous)
- OutboxProcessor: Persistent polling (reliable, asynchronous)
- Separation of concerns: routing logic vs. delivery mechanism

## Testing

Run the complete workflow using Postman:
```bash
# In Postman Collection Runner
postman/mission-to-coins-workflow.postman_collection.json
```

Or test individual APIs:
```bash
postman/wallet-api.postman_collection.json
```

## Monitoring

Check outbox processor logs:
```bash
# Watch for event processing
tail -f logs/app.log | grep OutboxProcessorService

# Expected output:
📦 Processing 4 event(s)...
📨 Delivering event: MISSION_REWARD_REQUESTED (ID: 34)
✅ Event 34 (MISSION_REWARD_REQUESTED) published successfully
```

Check for failed events:
```sql
SELECT id, event_type, status, attempts, created_at
FROM outbox_event
WHERE status IN ('new', 'archived')
ORDER BY created_at DESC;
```

## Future Improvements

1. **Add retry with exponential backoff** instead of fixed 5 attempts
2. **Add dead letter queue** for events that fail permanently
3. **Add event versioning** to handle schema evolution
4. **Add consumer idempotency** to handle duplicate deliveries
5. **Add metrics** for event processing latency and throughput

## References

- Outbox Pattern: https://microservices.io/patterns/data/transactional-outbox.html
- Event-Driven Architecture: https://martinfowler.com/articles/201701-event-driven.html
- CoreKit Foundation Spec: `specs/corekit/corekit.foundation.v1.yml`
- Wallet Pillar Spec: `specs/wallet/wallet.pillar.v2.yml`
