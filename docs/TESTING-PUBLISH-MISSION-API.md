# Testing the Mission.Publish API

## 🎯 Complete Implementation Overview

You now have a **fully implemented** `Mission.Publish` API endpoint following the spec from `mission.pillar.yml` lines 254-298.

```
┌─────────────────────────────────────────────────────────────────┐
│                  HTTP Request Flow                               │
└─────────────────────────────────────────────────────────────────┘

1. HTTP Request
   POST /v1/missions/{mission_id}/publish
   Headers: X-User-Id, X-User-Role
   Body: { idempotency_key }

   ↓

2. Controller (missions.controller.ts)
   - @UseGuards(AuthGuard, PermissionsGuard)
   - @RequirePermissions('missions:admin', 'missions:manage')
   - Validates DTO
   - Extracts Actor from request

   ↓

3. AuthGuard + PermissionsGuard
   - Checks if actor has 'missions:admin' OR 'missions:manage'
   - Allows/denies request

   ↓

4. Workflow Service (missions.workflow.service.ts)
   ├─ Idempotency Check (IdempotencyService)
   │  └─ If duplicate → return cached response
   │
   ├─ Transaction Wrapper (TransactionService)
   │  ├─ LOAD Phase (via MissionsRepository)
   │  │  └─ Load mission
   │  │
   │  ├─ GUARD Phase (Business Rules)
   │  │  ├─ Check mission.status == DRAFT or PAUSED
   │  │  └─ Check now() < mission.ends_at
   │  │
   │  ├─ WRITE Phase (Database Update)
   │  │  └─ Update mission:
   │  │      status = 'PUBLISHED'
   │  │      published_at = NOW()
   │  │      updated_by_user_id = actor
   │  │
   │  ├─ EMIT Phase (Outbox Event)
   │  │  └─ MISSION_PUBLISHED event
   │  │
   │  └─ COMMIT (All or nothing!)
   │
   └─ Store Idempotency Response

   ↓

5. HTTP Response
   {
     "mission_id": "...",
     "status": "PUBLISHED"
   }
```

---

## 📁 Files Created

1. **DTO**: `src/plugins/missions/dto/mission-publish.request.dto.ts`
2. **Service Method**: Added `publishMission()` to `missions.workflow.service.ts`
3. **Controller Endpoint**: Added `POST /:mission_id/publish` to `missions.controller.ts`

---

## 🚀 How to Test

### Prerequisites
- Application is running (`npm run start:dev`)
- Database has test data

### Step 1: Insert a Draft Mission

```sql
USE gcpro;

INSERT INTO missions.mission (
  mission_id, status, title, description, starts_at, ends_at,
  visibility, reward_json, created_by_user_id, created_at, updated_at
) VALUES (
  '999e4567-e89b-12d3-a456-426614174999',
  'DRAFT',  -- DRAFT status, ready to be published
  'Test Publish Mission',
  'Mission to test publishing',
  NOW(),
  DATE_ADD(NOW(), INTERVAL 30 DAY),  -- Ends in 30 days
  'PUBLIC',
  '{"reward_type":"FIXED","reward_money":{"currency":"MYR","amount_minor":1000},"reward_reason":"MISSION_COMPLETION"}',
  'admin-user-123',
  NOW(),
  NOW()
);
```

### Step 2: Call the Publish API

```bash
curl -X POST http://localhost:3000/v1/missions/999e4567-e89b-12d3-a456-426614174999/publish \
  -H "Content-Type: application/json" \
  -H "X-User-Id: admin-user-123" \
  -H "X-User-Role: ADMIN" \
  -d '{
    "idempotency_key": "publish_test_mission_001"
  }'
```

### Step 3: Expected Response

```json
{
  "mission_id": "999e4567-e89b-12d3-a456-426614174999",
  "status": "PUBLISHED"
}
```

### Step 4: Verify Database Changes

```sql
-- Check mission was published
SELECT mission_id, status, published_at, updated_by_user_id
FROM missions.mission
WHERE mission_id = '999e4567-e89b-12d3-a456-426614174999';
-- status should be 'PUBLISHED'
-- published_at should be set
-- updated_by_user_id should be 'admin-user-123'

-- Check outbox event
SELECT event_name, aggregate_type, aggregate_id, payload
FROM core.outbox
WHERE aggregate_id = '999e4567-e89b-12d3-a456-426614174999'
  AND event_name = 'MISSION_PUBLISHED'
ORDER BY created_at DESC
LIMIT 1;
-- Should see MISSION_PUBLISHED event

-- Check idempotency record
SELECT scope, idempotency_key, status, response_body
FROM core.idempotency
WHERE idempotency_key = 'publish_test_mission_001';
-- Should have record with status='completed'
```

---

## 🧪 Test Scenarios

### Scenario 1: Successful Publish ✅

**Setup**: Draft mission with future end date

```sql
-- Mission already inserted above
```

**Request**:
```bash
curl -X POST http://localhost:3000/v1/missions/999e4567-e89b-12d3-a456-426614174999/publish \
  -H "X-User-Id: admin-user-123" \
  -H "X-User-Role: ADMIN" \
  -d '{"idempotency_key": "test1"}'
```

**Expected**: 200 OK, mission status = PUBLISHED

---

### Scenario 2: Idempotency Test ✅

**Request**: Call API again with SAME idempotency_key

```bash
curl -X POST http://localhost:3000/v1/missions/999e4567-e89b-12d3-a456-426614174999/publish \
  -H "X-User-Id: admin-user-123" \
  -H "X-User-Role: ADMIN" \
  -d '{"idempotency_key": "test1"}'  # Same key!
```

**Expected**: 200 OK, SAME response, NO new database changes!

---

### Scenario 3: Already Published ❌

**Setup**: Try to publish an already published mission

```bash
curl -X POST http://localhost:3000/v1/missions/999e4567-e89b-12d3-a456-426614174999/publish \
  -H "X-User-Id: admin-user-123" \
  -H "X-User-Role: ADMIN" \
  -d '{"idempotency_key": "test2"}'  # Different key
```

**Expected**: 409 Conflict - "MISSION_NOT_PUBLISHABLE: Mission status is PUBLISHED, expected DRAFT or PAUSED"

---

### Scenario 4: Mission Already Ended ❌

**Setup**: Create mission with past end date

```sql
INSERT INTO missions.mission (
  mission_id, status, title, starts_at, ends_at,
  visibility, reward_json, created_by_user_id, created_at, updated_at
) VALUES (
  '888e4567-e89b-12d3-a456-426614174888',
  'DRAFT',
  'Expired Mission',
  DATE_SUB(NOW(), INTERVAL 10 DAY),
  DATE_SUB(NOW(), INTERVAL 1 DAY),  -- Ended yesterday!
  'PUBLIC',
  '{"reward_type":"FIXED","reward_money":{"currency":"MYR","amount_minor":1000},"reward_reason":"MISSION_COMPLETION"}',
  'admin-user-123',
  NOW(),
  NOW()
);
```

**Request**:
```bash
curl -X POST http://localhost:3000/v1/missions/888e4567-e89b-12d3-a456-426614174888/publish \
  -H "X-User-Id: admin-user-123" \
  -H "X-User-Role: ADMIN" \
  -d '{"idempotency_key": "test3"}'
```

**Expected**: 409 Conflict - "MISSION_ALREADY_ENDED"

---

### Scenario 5: Permission Denied ❌

**Request**: Try to publish as regular USER

```bash
curl -X POST http://localhost:3000/v1/missions/999e4567-e89b-12d3-a456-426614174999/publish \
  -H "X-User-Id: regular-user-789" \
  -H "X-User-Role: USER" \
  -d '{"idempotency_key": "test4"}'
```

**Expected**: 403 Forbidden - "User lacks required permissions"

---

### Scenario 6: Publish Paused Mission ✅

**Setup**: Create a paused mission

```sql
INSERT INTO missions.mission (
  mission_id, status, title, starts_at, ends_at,
  visibility, reward_json, created_by_user_id, created_at, updated_at
) VALUES (
  '777e4567-e89b-12d3-a456-426614174777',
  'PAUSED',  -- Paused mission
  'Paused Mission',
  NOW(),
  DATE_ADD(NOW(), INTERVAL 30 DAY),
  'PUBLIC',
  '{"reward_type":"FIXED","reward_money":{"currency":"MYR","amount_minor":1000},"reward_reason":"MISSION_COMPLETION"}',
  'admin-user-123',
  NOW(),
  NOW()
);
```

**Request**:
```bash
curl -X POST http://localhost:3000/v1/missions/777e4567-e89b-12d3-a456-426614174777/publish \
  -H "X-User-Id: admin-user-123" \
  -H "X-User-Role: ADMIN" \
  -d '{"idempotency_key": "test5"}'
```

**Expected**: 200 OK, mission status = PUBLISHED (can resume paused missions!)

---

### Scenario 7: Mission Not Found ❌

**Request**:
```bash
curl -X POST http://localhost:3000/v1/missions/nonexistent-id/publish \
  -H "X-User-Id: admin-user-123" \
  -H "X-User-Role: ADMIN" \
  -d '{"idempotency_key": "test6"}'
```

**Expected**: 404 Not Found - "MISSION_NOT_FOUND"

---

## 📊 What Happens Under the Hood

When you call the Publish API:

1. **AuthGuard** reads headers, creates Actor
2. **PermissionsGuard** checks if ADMIN or MANAGER role
3. **Controller** validates DTO, calls service
4. **Service** executes workflow:
   - Claims idempotency key
   - Opens transaction
   - Loads mission from database
   - Checks business rules (guards):
     - Status must be DRAFT or PAUSED
     - Mission must not have ended
   - Updates mission → status = PUBLISHED
   - Inserts MISSION_PUBLISHED event to outbox
   - Commits transaction (ALL or NOTHING!)
   - Stores idempotency response
5. **Response** returned to client

---

## 🎯 Key Features

1. **State Transition**: DRAFT/PAUSED → PUBLISHED
2. **Business Rules**:
   - Can only publish DRAFT or PAUSED missions
   - Cannot publish expired missions
3. **Idempotency**: Duplicate requests return cached response
4. **Event Emission**: MISSION_PUBLISHED event for other services
5. **Transaction Safety**: All changes in ONE atomic transaction
6. **Permission Control**: Only ADMIN/MANAGER can publish

---

## 🔄 Complete Mission Lifecycle

```
CREATE → DRAFT → PUBLISH → PUBLISHED → PAUSE → PAUSED
                    ↓                      ↓
                RETIRE ← ← ← ← ← ← ← ← ← ← RETIRED
```

**Publish API** handles: DRAFT → PUBLISHED and PAUSED → PUBLISHED

---

## 🚀 Quick Test Script

```bash
#!/bin/bash
# Quick test script for Mission.Publish API

MISSION_ID="999e4567-e89b-12d3-a456-426614174999"
BASE_URL="http://localhost:3000"

echo "Testing Mission.Publish API..."

# Test 1: Publish draft mission
echo "Test 1: Publishing draft mission..."
curl -X POST "$BASE_URL/v1/missions/$MISSION_ID/publish" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: admin-user-123" \
  -H "X-User-Role: ADMIN" \
  -d '{"idempotency_key": "publish_test_1"}'
echo -e "\n"

# Test 2: Idempotency check (same key)
echo "Test 2: Testing idempotency (same key)..."
curl -X POST "$BASE_URL/v1/missions/$MISSION_ID/publish" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: admin-user-123" \
  -H "X-User-Role: ADMIN" \
  -d '{"idempotency_key": "publish_test_1"}'
echo -e "\n"

# Test 3: Try to publish again (should fail - already published)
echo "Test 3: Trying to publish already published mission..."
curl -X POST "$BASE_URL/v1/missions/$MISSION_ID/publish" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: admin-user-123" \
  -H "X-User-Role: ADMIN" \
  -d '{"idempotency_key": "publish_test_2"}'
echo -e "\n"

echo "Tests completed!"
```

---

## 📝 Summary

The Mission.Publish API:
- ✅ Validates permissions (ADMIN/MANAGER only)
- ✅ Checks business rules (status, expiration)
- ✅ Updates mission atomically
- ✅ Emits event for other services
- ✅ Protects against duplicate publishes
- ✅ Returns clear error messages
- ✅ Follows spec exactly (mission.pillar.yml lines 254-298)

**This is production-ready code!** 🎉
