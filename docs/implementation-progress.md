# Mission Plugin Implementation Progress

## ✅ Completed Components

### 1. CoreKit Foundation (Infrastructure Layer)

**Types** (`src/corekit/types/`):
- ✅ `actor.type.ts` - Actor interface for user/system actions
- ✅ `money.type.ts` - Money type with currency and amount_minor
- ✅ `outbox-envelope.type.ts` - Event envelope structure

**Services** (`src/corekit/services/`):
- ✅ `transaction.service.ts` - Database transaction wrapper (commit/rollback)
- ✅ `idempotency.service.ts` - Prevents duplicate operations
- ✅ `outbox.service.ts` - Reliable event publishing

**Entities** (`src/corekit/entities/`):
- ✅ `idempotency-record.entity.ts` - Tracks idempotency keys
- ✅ `outbox-event.entity.ts` - Stores events for async publishing

### 2. Mission Plugin (Business Layer)

**Entities** (`src/plugins/missions/entities/`):
- ✅ `mission.entity.ts` - Mission catalog (status: DRAFT → PUBLISHED → PAUSED → RETIRED)
- ✅ `mission-enrollment.entity.ts` - User enrollment (status: ENROLLED → SUBMITTED → COMPLETED)
- ✅ `mission-submission.entity.ts` - Proof submissions (status: PENDING → APPROVED/REJECTED)

**DTOs** (`src/plugins/missions/dto/`):
- ✅ `mission-create.request.dto.ts` - Create mission with validation
- ✅ `mission-enroll.request.dto.ts` - Enroll in mission
- ✅ `mission-approve-submission.request.dto.ts` - Approve user submission

---

## 🚧 Remaining Work

### 3. Mission Repositories (Data Access Layer)
**Files to Create:**
- `src/plugins/missions/repositories/missions.repo.ts`
- `src/plugins/missions/repositories/enrollments.repo.ts`
- `src/plugins/missions/repositories/submissions.repo.ts`

### 4. Mission Workflow Service (Business Logic)
**File to Create:**
- `src/plugins/missions/services/missions.workflow.service.ts`
  - `createMission()`
  - `publishMission()`
  - `enrollInMission()`
  - `submitProof()`
  - `approveSubmission()` ← The one we explained in detail!

### 5. Mission Controller (HTTP Layer)
**File to Create:**
- `src/plugins/missions/controllers/missions.controller.ts`
  - `POST /v1/missions` → createMission
  - `POST /v1/missions/:id/publish` → publishMission
  - `POST /v1/missions/:id/enroll` → enrollInMission
  - `POST /v1/missions/:id/submissions` → submitProof
  - `POST /v1/missions/:id/submissions/:sid/approve` → approveSubmission

### 6. NestJS Modules
**Files to Create:**
- `src/corekit/corekit.module.ts` - Export CoreKit services
- `src/plugins/missions/missions.module.ts` - Wire up missions plugin
- Update `src/app.module.ts` - Import missions module

### 7. Database Setup
**Files to Create:**
- Database migration scripts
- TypeORM configuration
- Connection setup

### 8. Testing
**Files to Create:**
- E2E tests for mission workflows
- Test database setup

---

## 📊 Architecture Summary

```
Request Flow:
┌─────────────────┐
│   HTTP Client   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Controller    │ ← Validates DTO, extracts Actor
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Workflow Service│ ← Implements Guard → Validate → Write → Emit → Commit
└────────┬────────┘
         │
         ├→ [Idempotency Check] ← Prevent duplicates
         │
         ├→ [Transaction.run]
         │   ├→ Load data (Repositories)
         │   ├→ Guard checks (business rules)
         │   ├→ Write changes (Repositories)
         │   ├→ Emit events (OutboxService)
         │   └→ Commit
         │
         └→ [Store idempotency response]
```

---

## 🎯 Key Patterns Implemented

1. **Transaction Atomicity**
   - All writes + events in ONE transaction
   - Rollback on any error

2. **Idempotency Protection**
   - Same `idempotency_key` → returns cached response
   - No duplicate operations

3. **Event-Driven Integration**
   - Missions emit `MISSION_REWARD_REQUESTED`
   - Wallet plugin listens and credits reward
   - No direct DB writes across plugins!

4. **Workflow Discipline**
   - Every command: Guard → Validate → Write → Emit → Commit
   - Explicit, ordered steps

---

## 🚀 Next Steps

**Option A: Continue Full Implementation**
Complete repositories, services, controllers, modules, and tests for a fully working system.

**Option B: Quick Test**
Create minimal implementations just to test one API endpoint (e.g., create mission).

**Option C: Explain Specific Component**
Deep dive into any specific part (e.g., how repositories work, how to set up the database).

---

## 📁 Current Folder Structure

```
src/
├── corekit/
│   ├── types/
│   │   ├── actor.type.ts ✅
│   │   ├── money.type.ts ✅
│   │   └── outbox-envelope.type.ts ✅
│   ├── services/
│   │   ├── transaction.service.ts ✅
│   │   ├── idempotency.service.ts ✅
│   │   └── outbox.service.ts ✅
│   └── entities/
│       ├── idempotency-record.entity.ts ✅
│       └── outbox-event.entity.ts ✅
│
└── plugins/
    └── missions/
        ├── entities/
        │   ├── mission.entity.ts ✅
        │   ├── mission-enrollment.entity.ts ✅
        │   └── mission-submission.entity.ts ✅
        ├── dto/
        │   ├── mission-create.request.dto.ts ✅
        │   ├── mission-enroll.request.dto.ts ✅
        │   └── mission-approve-submission.request.dto.ts ✅
        ├── repositories/ (todo)
        ├── services/ (todo)
        └── controllers/ (todo)
```

---

Ready to continue? Let me know which option you prefer! 🚀
