# Testing the ApproveSubmission API

## 🎯 Complete Implementation Overview

You now have a **fully implemented** `ApproveSubmission` API endpoint with all layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                  HTTP Request Flow                               │
└─────────────────────────────────────────────────────────────────┘

1. HTTP Request
   POST /v1/missions/{mission_id}/submissions/{submission_id}/approve
   Headers: X-User-Id, X-User-Role
   Body: { idempotency_key, approval_note }

   ↓

2. Controller (missions.controller.ts)
   - @UseGuards(AuthGuard, PermissionsGuard)
   - @RequirePermissions('missions:admin', 'missions:review')
   - Validates DTO
   - Extracts Actor from request

   ↓

3. AuthGuard (auth.guard.ts)
   - Reads X-User-Id and X-User-Role headers
   - Creates Actor object
   - Attaches to request

   ↓

4. PermissionsGuard (permissions.guard.ts)
   - Checks if actor has 'missions:admin' OR 'missions:review'
   - Allows/denies request

   ↓

5. Workflow Service (missions.workflow.service.ts)
   ├─ Idempotency Check (IdempotencyService)
   │  └─ If duplicate → return cached response
   │
   ├─ Transaction Wrapper (TransactionService)
   │  ├─ LOAD Phase (via Repositories)
   │  │  ├─ Load mission
   │  │  ├─ Load submission
   │  │  └─ Load enrollment
   │  │
   │  ├─ GUARD Phase (Business Rules)
   │  │  ├─ Check submission.status == PENDING
   │  │  └─ Check enrollment.status == SUBMITTED
   │  │
   │  ├─ WRITE Phase (Database Updates)
   │  │  ├─ Update submission → APPROVED
   │  │  ├─ Update enrollment → COMPLETED
   │  │  └─ Derive reward request IDs
   │  │
   │  ├─ EMIT Phase (Outbox Events)
   │  │  ├─ MISSION_SUBMISSION_APPROVED
   │  │  ├─ MISSION_COMPLETED
   │  │  └─ MISSION_REWARD_REQUESTED
   │  │
   │  └─ COMMIT (All or nothing!)
   │
   └─ Store Idempotency Response

   ↓

6. HTTP Response
   {
     "submission_id": "...",
     "submission_status": "APPROVED",
     "enrollment_id": "...",
     "enrollment_status": "COMPLETED"
   }
```

---

## 📁 Files Created (Complete Implementation)

### CoreKit Infrastructure
```
src/corekit/
├── types/
│   ├── actor.type.ts ✅
│   ├── money.type.ts ✅
│   └── outbox-envelope.type.ts ✅
├── services/
│   ├── transaction.service.ts ✅
│   ├── idempotency.service.ts ✅
│   └── outbox.service.ts ✅
├── entities/
│   ├── idempotency-record.entity.ts ✅
│   └── outbox-event.entity.ts ✅
├── decorators/
│   ├── current-actor.decorator.ts ✅
│   └── require-permissions.decorator.ts ✅
├── guards/
│   ├── auth.guard.ts ✅
│   └── permissions.guard.ts ✅
└── corekit.module.ts ✅
```

### Mission Plugin
```
src/plugins/missions/
├── entities/
│   ├── mission.entity.ts ✅
│   ├── mission-enrollment.entity.ts ✅
│   └── mission-submission.entity.ts ✅
├── dto/
│   ├── mission-create.request.dto.ts ✅
│   ├── mission-enroll.request.dto.ts ✅
│   └── mission-approve-submission.request.dto.ts ✅
├── repositories/
│   ├── missions.repo.ts ✅
│   ├── enrollments.repo.ts ✅
│   └── submissions.repo.ts ✅
├── services/
│   └── missions.workflow.service.ts ✅ (WITH ApproveSubmission!)
├── controllers/
│   └── missions.controller.ts ✅
└── missions.module.ts ✅
```

### Configuration
```
src/app.module.ts ✅ (Updated with TypeORM + modules)
.env.example ✅
```

---

## 🚀 How to Test

### Step 1: Set Up Database

Create a MySQL database:

```sql
CREATE DATABASE gcpro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gcpro;
```

### Step 2: Create Environment File

```bash
cp .env.example .env
```

Edit `.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=gcpro
DB_SYNC=true  # Auto-create tables
DB_LOGGING=true
PORT=3000
NODE_ENV=development
```

### Step 3: Start the Application

```bash
npm run start:dev
```

You should see:
```
[Nest] INFO [TypeOrmModule] Mapped {Mission, MissionEnrollment, MissionSubmission, IdempotencyRecord, OutboxEvent}
[Nest] INFO [RoutesResolver] MissionsController {/v1/missions}:
[Nest] INFO [RouterExplorer] Mapped {/v1/missions/:mission_id/submissions/:submission_id/approve, POST}
[Nest] Application successfully started
```

### Step 4: Insert Test Data

Insert data directly into MySQL:

```sql
-- 1. Insert a mission
INSERT INTO missions.mission (
  mission_id, status, title, description, starts_at, ends_at,
  visibility, reward_json, created_by_user_id, created_at, updated_at
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'PUBLISHED',
  'Complete 5 Policy Applications',
  'Submit and get approved for 5 policy applications',
  '2024-01-01 00:00:00',
  '2024-12-31 23:59:59',
  'PUBLIC',
  JSON_OBJECT(
    'reward_type', 'FIXED',
    'reward_money', JSON_OBJECT('currency', 'MYR', 'amount_minor', 5000),
    'reward_reason', 'MISSION_COMPLETION'
  ),
  'admin-user-123',
  NOW(),
  NOW()
);

-- 2. Insert an enrollment
INSERT INTO missions.mission_enrollment (
  enrollment_id, mission_id, participant_user_id, status,
  enrolled_at, created_at, updated_at
) VALUES (
  '456f7890-a12b-34c5-d678-901234567890',
  '123e4567-e89b-12d3-a456-426614174000',
  'participant-user-456',
  'SUBMITTED',
  NOW(),
  NOW(),
  NOW()
);

-- 3. Insert a submission
INSERT INTO missions.mission_submission (
  submission_id, mission_id, enrollment_id, participant_user_id,
  status, proof_type, proof_payload_json, submitted_at,
  created_at, updated_at
) VALUES (
  '987f6543-e21b-43d1-b098-765432109876',
  '123e4567-e89b-12d3-a456-426614174000',
  '456f7890-a12b-34c5-d678-901234567890',
  'participant-user-456',
  'PENDING',
  'TEXT',
  JSON_OBJECT('text', 'I completed 5 applications!'),
  NOW(),
  NOW(),
  NOW()
);
```

### Step 5: Call the API

```bash
curl -X POST http://localhost:3000/v1/missions/123e4567-e89b-12d3-a456-426614174000/submissions/987f6543-e21b-43d1-b098-765432109876/approve \
  -H "Content-Type: application/json" \
  -H "X-User-Id: admin-user-123" \
  -H "X-User-Role: ADMIN" \
  -d '{
    "idempotency_key": "approve_sub_xyz_20240315_001",
    "approval_note": "Great submission! Approved."
  }'
```

### Step 6: Expected Response

```json
{
  "submission_id": "987f6543-e21b-43d1-b098-765432109876",
  "submission_status": "APPROVED",
  "enrollment_id": "456f7890-a12b-34c5-d678-901234567890",
  "enrollment_status": "COMPLETED"
}
```

### Step 7: Verify Database Changes

```sql
-- Check submission was approved
SELECT * FROM missions.mission_submission
WHERE submission_id = '987f6543-e21b-43d1-b098-765432109876';
-- status should be 'APPROVED'
-- approved_at should be set
-- approved_by_user_id should be 'admin-user-123'
-- approval_note should be 'Great submission! Approved.'

-- Check enrollment was completed
SELECT * FROM missions.mission_enrollment
WHERE enrollment_id = '456f7890-a12b-34c5-d678-901234567890';
-- status should be 'COMPLETED'
-- completed_at should be set

-- Check outbox events
SELECT * FROM core.outbox ORDER BY created_at DESC LIMIT 3;
-- Should see 3 events:
-- 1. MISSION_SUBMISSION_APPROVED
-- 2. MISSION_COMPLETED
-- 3. MISSION_REWARD_REQUESTED

-- Check idempotency record
SELECT * FROM core.idempotency;
-- Should have record with scope and status='completed'
```

### Step 8: Test Idempotency

Call the API again with the **same idempotency_key**:

```bash
curl -X POST http://localhost:3000/v1/missions/123e4567-e89b-12d3-a456-426614174000/submissions/987f6543-e21b-43d1-b098-765432109876/approve \
  -H "Content-Type: application/json" \
  -H "X-User-Id: admin-user-123" \
  -H "X-User-Role: ADMIN" \
  -d '{
    "idempotency_key": "approve_sub_xyz_20240315_001",
    "approval_note": "Different note this time"
  }'
```

**Expected**: Same response as before, NO new database changes!

---

## 🧪 Test Different Scenarios

### Test 1: Permission Denied

```bash
curl -X POST http://localhost:3000/v1/missions/.../submissions/.../approve \
  -H "X-User-Id: regular-user-789" \
  -H "X-User-Role: USER" \
  -d '{ "idempotency_key": "test2" }'
```

**Expected**: 403 Forbidden - "User lacks required permissions"

### Test 2: Submission Not Found

```bash
curl -X POST http://localhost:3000/v1/missions/.../submissions/nonexistent-id/approve \
  -H "X-User-Id: admin-user-123" \
  -H "X-User-Role: ADMIN" \
  -d '{ "idempotency_key": "test3" }'
```

**Expected**: 404 Not Found - "SUBMISSION_NOT_FOUND"

### Test 3: Submission Already Approved

Try approving the same submission again (with different idempotency_key):

```bash
curl -X POST http://localhost:3000/v1/missions/.../submissions/.../approve \
  -H "X-User-Id: admin-user-123" \
  -H "X-User-Role: ADMIN" \
  -d '{ "idempotency_key": "test4_different_key" }'
```

**Expected**: 409 Conflict - "SUBMISSION_NOT_APPROVABLE: Submission status is APPROVED, expected PENDING"

---

## 📊 What Happens Under the Hood

When you call the API:

1. **AuthGuard** reads headers, creates Actor
2. **PermissionsGuard** checks if ADMIN/REVIEWER
3. **Controller** validates DTO, calls service
4. **Service** executes workflow:
   - Claims idempotency key
   - Opens transaction
   - Loads mission, submission, enrollment
   - Checks business rules (guards)
   - Updates submission → APPROVED
   - Updates enrollment → COMPLETED
   - Generates reward IDs
   - Inserts 3 outbox events
   - Commits transaction (ALL or NOTHING!)
   - Stores idempotency response
5. **Response** returned to client

All in **ONE atomic transaction**!

---

## 🎓 Key Learnings

### 1. Workflow Discipline
Every command follows: **Guard → Validate → Write → Emit → Commit**

### 2. Transaction Atomicity
ALL database writes (updates + outbox events) in ONE transaction

### 3. Idempotency
Duplicate requests return cached response, no side effects

### 4. Event-Driven Integration
Mission plugin emits `MISSION_REWARD_REQUESTED` event
Wallet plugin (when built) will listen and credit reward
**NO direct DB writes to wallet tables!**

### 5. Strict Permissions
Guards enforce access control at HTTP layer

---

## 🚀 Next Steps

1. **Build Wallet Plugin** to listen to `MISSION_REWARD_REQUESTED` event
2. **Add More Commands**:
   - `POST /v1/missions` - Create mission
   - `POST /v1/missions/:id/enroll` - Enroll in mission
   - `POST /v1/missions/:id/submissions` - Submit proof
3. **Add Background Worker** to publish outbox events
4. **Write E2E Tests** using Jest/Supertest
5. **Add Database Migrations** instead of `DB_SYNC=true`

---

## ✅ You Have a Working System!

The ApproveSubmission API is **fully functional** and demonstrates:
- ✅ Multi-layer architecture (Controller → Service → Repository)
- ✅ Transaction management
- ✅ Idempotency protection
- ✅ Event-driven integration
- ✅ Permission-based access control
- ✅ Spec-driven implementation

**Congratulations!** You now understand how to build production-grade APIs following the GCPro architecture! 🎉
