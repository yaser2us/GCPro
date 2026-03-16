# Mission Implementation Plan - Full Spec Alignment

## ✅ Progress Tracker

### ✅ Phase 1: Update 5 Existing Commands (COMPLETE)
### ✅ Phase 2: Add 7 Read Operations (COMPLETE)

### Infrastructure (2/2 Complete)
- ✅ MissionEvent entity + repository
- ✅ MissionProgress entity + repository

### DTOs (4/6)
- ✅ MissionDefinitionStateChangeRequest (NEW - for Pause/Retire)
- ⏳ MissionProgressRecordRequest (NEW - Phase 3)
- ✅ Update MissionSubmitRequest (content_json + file_ids)
- ✅ Update MissionSubmissionReviewRequest (renamed + max_len 1000)
- ✅ MissionDefinitionCreateRequest (existing - OK)
- ✅ MissionAssignRequest (existing - OK)

### Commands (12/17)
#### MissionDefinition (4/6)
- ✅ Create (UPSERT + audit trail + response field updated)
- ✅ Get (simple read)
- ✅ List (simple read)
- ✅ Publish (audit trail + response field updated)
- ❌ Pause (Phase 3)
- ❌ Retire (Phase 3)

#### MissionAssignment (3/3)
- ✅ Assign (UPSERT + audit trail + removed duplicate check)
- ✅ Get (simple read)
- ✅ ListByUser (simple read)

#### MissionProgress (0/1)
- ❌ Record (Phase 3)

#### MissionSubmission (3/5)
- ✅ Submit (DTO fields updated + audit trail)
- ✅ Get (simple read)
- ⏳ ListFiles (requires mission_submission_file table - deferred)
- ✅ Approve (UPSERT for rewards + audit trail)
- ❌ Reject (Phase 3)

#### Other (2/2)
- ✅ MissionRewardGrant.GetByAssignment (simple read)
- ✅ MissionEvent.ListByAssignment (simple read)

**Legend**: ✅ Done | ⏳ In Progress | ❌ Not Started

---

## 📦 Implementation Status

### ✅ Phase 1: COMPLETE (Update 5 Existing Commands)

**What was done:**
1. ✅ Created MissionEvent + MissionProgress entities/repos
2. ✅ Updated all 5 DTOs to match new spec
3. ✅ Added UPSERT methods to all repositories (idempotent by design)
4. ✅ Updated all 5 service methods with:
   - UPSERT instead of INSERT (idempotent creates/assigns)
   - Audit trail inserts (mission_event table)
   - Updated DTO field references (content_json, file_ids)
   - Updated response field names (mission_definition_id)
5. ✅ Updated controller comments and imports
6. ✅ Updated missions.module.ts with new entities/repos
7. ✅ Build successful
8. ✅ All tests passing (133 tests)

**Key Changes:**
- `MissionDefinition.Create` → Now uses UPSERT by code (idempotent)
- `MissionDefinition.Publish` → Adds audit trail, returns mission_definition_id
- `MissionAssignment.Assign` → Uses UPSERT by mission_id+user_id (idempotent)
- `MissionSubmission.Submit` → Uses content_json/file_ids fields
- `MissionSubmission.Approve` → Uses UPSERT for reward grants (exactly-once)

### ✅ Phase 2: COMPLETE (Add 7 Read Operations)

**What was done:**
1. ✅ Added 7 read service methods to `missions.workflow.service.ts`
2. ✅ Added 7 GET controller routes to `missions.controller.ts`
3. ✅ Build successful
4. ✅ All tests passing (133 tests)

**Implemented commands:**
- ✅ MissionDefinition.Get - GET /v1/missions/definitions/{mission_definition_id}
- ✅ MissionDefinition.List - GET /v1/missions/definitions
- ✅ MissionAssignment.Get - GET /v1/missions/assignments/{assignment_id}
- ✅ MissionAssignment.ListByUser - GET /v1/users/{user_id}/mission-assignments
- ✅ MissionSubmission.Get - GET /v1/missions/submissions/{submission_id}
- ✅ MissionRewardGrant.GetByAssignment - GET /v1/missions/assignments/{assignment_id}/reward-grant
- ✅ MissionEvent.ListByAssignment - GET /v1/missions/assignments/{assignment_id}/events

**Deferred:**
- ⏳ MissionSubmission.ListFiles - Requires `mission_submission_file` table (not in current DDL)

All operations are simple reads with no business logic - just repository calls with existence checks where needed.

### 🔄 Next: Phase 3 (Add 4 New Commands)

**Phase 3 scope:**
- MissionDefinition.Pause - POST /v1/missions/definitions/{id}/pause
- MissionDefinition.Retire - POST /v1/missions/definitions/{id}/retire
- MissionSubmission.Reject - POST /v1/missions/submissions/{id}/reject
- MissionProgress.Record - POST /v1/missions/assignments/{id}/progress

These are state transition commands with business logic similar to Phase 1 commands.

### 🎯 After Phase 3: Code Generator (Option C)

Once manual implementation is complete, we'll build a YAML→TypeScript code generator for:
- Identity pillar (17 more commands)
- Future pillars
- Spec-driven development workflow

---

## 📝 Phase 1 Implementation Details

### ✅ New Entities Created
```typescript
// mission-event.entity.ts (src/plugins/missions/entities/)
@Entity('mission_event')
export class MissionEvent {
  id: number;                           // Auto-increment
  mission_definition_id: number | null; // FK to mission_definition
  assignment_id: number | null;         // FK to mission_assignment
  event_type: string;                   // MISSION_DEFINITION_CREATED, etc.
  payload_json: any | null;             // Event payload
  created_at: Date;                     // Timestamp
}

// mission-progress.entity.ts (src/plugins/missions/entities/)
@Entity('mission_progress')
export class MissionProgress {
  id: number;                           // Auto-increment
  assignment_id: number;                // FK to mission_assignment
  metric_code: string;                  // e.g., "applications_submitted"
  metric_value: string;                 // Current value
  progress_json: any | null;            // Additional progress data
  created_at: Date;
  updated_at: Date;
}
// UNIQUE KEY: (assignment_id, metric_code)
```

### ✅ New Repositories Created
```typescript
// mission-event.repo.ts (src/plugins/missions/repositories/)
- create(data, queryRunner?) → number
  Insert audit event, returns event_id

- findByAssignmentId(assignment_id, queryRunner?) → MissionEvent[]
  List all events for an assignment

- findByMissionDefinitionId(mission_definition_id, queryRunner?) → MissionEvent[]
  List all events for a mission definition

// mission-progress.repo.ts (src/plugins/missions/repositories/)
- upsert(data, queryRunner?) → number
  Idempotent progress update using MySQL ON DUPLICATE KEY UPDATE
  Unique by (assignment_id, metric_code)

- findByAssignmentId(assignment_id, queryRunner?) → MissionProgress[]
  List all progress metrics for an assignment

- findByMetric(assignment_id, metric_code, queryRunner?) → MissionProgress | null
  Get specific metric value
```

### ✅ Updated Repositories (Added UPSERT)
```typescript
// mission-definition.repo.ts
+ upsert(data, queryRunner?) → number
  Idempotent create by 'code' field
  Uses MySQL ON DUPLICATE KEY UPDATE

+ findAll(queryRunner?) → MissionDefinition[]
  List all mission definitions (for Phase 2)

// mission-assignment.repo.ts
+ upsert(data, queryRunner?) → number
  Idempotent assign by (mission_id, user_id)
  Uses MySQL ON DUPLICATE KEY UPDATE

+ findByUserId(user_id, queryRunner?) → MissionAssignment[]
  List all assignments for a user (for Phase 2)

// mission-reward-grant.repo.ts
+ upsert(data, queryRunner?) → number
  Exactly-once grant by assignment_id
  Uses MySQL ON DUPLICATE KEY UPDATE
```

### ✅ Updated DTOs
```typescript
// mission-definition-state-change.request.dto.ts (NEW)
export class MissionDefinitionStateChangeRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

// mission-submit.request.dto.ts (UPDATED)
export class MissionSubmitRequestDto {
  @IsOptional()
  content_json?: any;  // Was: text_content

  @IsOptional()
  @IsArray()
  file_ids?: string[]; // Was: file_ref_ids (number[])
}

// mission-approve-submission.request.dto.ts (UPDATED)
export class MissionSubmissionReviewRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)  // Was: 2000
  feedback?: string;
}
// Also exported as MissionApproveSubmissionRequestDto for backward compat
```

### ✅ Updated Service Methods
All 5 methods in `missions.workflow.service.ts` updated:

1. **createMissionDefinition()**
   - Changed: create() → upsert() (idempotent by code)
   - Added: mission_event audit trail
   - Changed: response field `id` → `mission_definition_id`

2. **publishMissionDefinition()**
   - Added: mission_event audit trail
   - Changed: response field `id` → `mission_definition_id`

3. **assignMission()**
   - Changed: create() → upsert() (idempotent by mission_id + user_id)
   - Removed: duplicate assignment check (UPSERT handles it)
   - Added: mission_event audit trail

4. **submitMission()**
   - Changed: DTO field references (text_content → content_json, file_ids)
   - Added: mission_event audit trail

5. **approveSubmission()**
   - Changed: reward grant create() → upsert() (exactly-once)
   - Removed: existing_grant check (UPSERT handles it)
   - Added: mission_event audit trail

### ✅ Updated Controller
```typescript
// missions.controller.ts (src/plugins/missions/controllers/)
- Updated import: MissionSubmissionReviewRequestDto
- Updated example comments: mission_definition_id, content_json, file_ids
- Routes unchanged (already match spec)
```

### ✅ Updated Module
```typescript
// missions.module.ts
+ MissionEvent entity
+ MissionProgress entity
+ MissionEventRepository provider
+ MissionProgressRepository provider
```

---

## 📝 Phase 2 Implementation Details

### ✅ New Service Methods (7 methods)
All added to `missions.workflow.service.ts`:

```typescript
// Query methods - no transactions needed
async getMissionDefinition(mission_definition_id: number)
async listMissionDefinitions()
async getMissionAssignment(assignment_id: number)
async listMissionAssignmentsByUser(user_id: number)
async getMissionSubmission(submission_id: number)
async getRewardGrantByAssignment(assignment_id: number)
async listEventsByAssignment(assignment_id: number)
```

### ✅ New Controller Routes (7 routes)
All added to `missions.controller.ts`:

```typescript
@Get('definitions/:mission_definition_id')
async getMissionDefinition()

@Get('definitions')
async listMissionDefinitions()

@Get('assignments/:assignment_id')
async getMissionAssignment()

@Get('/users/:user_id/mission-assignments')
async listMissionAssignmentsByUser()

@Get('submissions/:submission_id')
async getMissionSubmission()

@Get('assignments/:assignment_id/reward-grant')
async getRewardGrantByAssignment()

@Get('assignments/:assignment_id/events')
async listEventsByAssignment()
```

**Permissions:**
- All routes require one of: `missions:read`, `missions:admin`, or context-appropriate permissions
- Protected by `AuthGuard` and `PermissionsGuard`

**Response patterns:**
- Single item: Returns entity directly
- List: Returns `{ items: [...] }`
- Not found: Throws `NotFoundException` with appropriate error code

---

## 🚀 Next Steps

**Ready to start Phase 3: Add 4 New Commands**

Phase 3 will add state transition commands with business logic:

1. **MissionDefinition.Pause**
   - POST /v1/missions/definitions/{id}/pause
   - Guard: status must be 'published'
   - Update: status → 'paused'
   - Emit: MISSION_DEFINITION_PAUSED event

2. **MissionDefinition.Retire**
   - POST /v1/missions/definitions/{id}/retire
   - Guard: status must not be 'retired'
   - Update: status → 'retired'
   - Emit: MISSION_DEFINITION_RETIRED event

3. **MissionSubmission.Reject**
   - POST /v1/missions/submissions/{id}/reject
   - Guard: submission.status == 'pending'
   - Update: submission status → 'rejected', assignment status → 'in_progress'
   - Emit: MISSION_SUBMISSION_REJECTED event

4. **MissionProgress.Record**
   - POST /v1/missions/assignments/{id}/progress
   - Guard: assignment status in ['assigned', 'in_progress']
   - Upsert: mission_progress by (assignment_id, metric_code)
   - Conditional: If assignment was 'assigned', update to 'in_progress'
   - Emit: MISSION_PROGRESS_RECORDED event

**After Phase 3:** We'll have 16/17 commands complete (94% coverage)!

Let me know when you're ready to proceed with Phase 3! 🎯
