# Mission Spec Comparison: Current vs New

## 📊 Summary

**Current Implementation**: 5 commands (manual TypeScript)
**New Spec Defines**: 17 commands (step-based declarative)

**Coverage**: 29% (5 out of 17)

---

## ✅ What We Already Have (5 commands)

| Command | Current | New Spec | Match? | Notes |
|---------|---------|----------|--------|-------|
| 1. Create | ✅ | MissionDefinition.Create | 🟡 Partial | Different DTO structure |
| 2. Publish | ✅ | MissionDefinition.Publish | 🟢 Good | Needs `reason` field |
| 3. Assign | ✅ | MissionAssignment.Assign | 🟡 Partial | Different endpoint path |
| 4. Submit | ✅ | MissionSubmission.Submit | 🟡 Partial | Different DTO (content_json vs text_content) |
| 5. Approve | ✅ | MissionSubmission.Approve | 🟢 Good | Mostly aligned |

---

## ❌ What's Missing (12 commands)

### **Read Operations** (6 commands)
1. ❌ **MissionDefinition.Get** - Get single mission definition
2. ❌ **MissionDefinition.List** - List all mission definitions
3. ❌ **MissionAssignment.Get** - Get single assignment
4. ❌ **MissionAssignment.ListByUser** - List assignments for a user
5. ❌ **MissionSubmission.Get** - Get single submission
6. ❌ **MissionSubmission.ListFiles** - List files for submission

### **State Transitions** (3 commands)
7. ❌ **MissionDefinition.Pause** - Pause a published mission
8. ❌ **MissionDefinition.Retire** - Retire a mission
9. ❌ **MissionSubmission.Reject** - Reject a submission

### **New Features** (3 commands)
10. ❌ **MissionProgress.Record** - Track progress on a mission
11. ❌ **MissionRewardGrant.GetByAssignment** - Get reward grant details
12. ❌ **MissionEvent.ListByAssignment** - Get mission audit trail

---

## 🔄 Key Differences

### **1. Endpoint Path Changes**

| Current | New Spec |
|---------|----------|
| `POST /v1/missions/definitions` | `POST /v1/missions/definitions` ✅ |
| `POST /v1/missions/definitions/{id}/publish` | `POST /v1/missions/definitions/{mission_definition_id}/publish` |
| `POST /v1/missions/definitions/{id}/assign` | `POST /v1/missions/definitions/{mission_definition_id}/assignments` |
| `POST /v1/missions/assignments/{id}/submit` | `POST /v1/missions/assignments/{assignment_id}/submissions` |
| `POST /v1/missions/submissions/{id}/approve` | `POST /v1/missions/submissions/{submission_id}/approve` ✅ |

**Impact**: 🟡 **Medium** - Need to update controller routes

---

### **2. DTO Structure Changes**

#### **Create Request**
```typescript
// CURRENT
MissionDefinitionCreateRequestDto {
  code, title, description, cadence,
  starts_at, ends_at, max_total, max_per_user,
  criteria_json, reward_json
}

// NEW SPEC
MissionDefinitionCreateRequest {
  code, title, description, cadence,
  starts_at, ends_at, max_total, max_per_user,
  criteria_json, reward_json
}
```
**Impact**: ✅ **Minimal** - Already aligned

---

#### **Submit Request**
```typescript
// CURRENT
MissionSubmitRequestDto {
  text_content?: string;
  meta_json?: any;
  file_ref_ids?: number[];
}

// NEW SPEC
MissionSubmitRequest {
  content_json?: json;
  file_ids?: string[];
}
```
**Impact**: 🟡 **Medium** - Need to rename fields

---

#### **Approve Request**
```typescript
// CURRENT
MissionApproveSubmissionRequestDto {
  feedback?: string;
}

// NEW SPEC (called Review)
MissionSubmissionReviewRequest {
  feedback?: string;  // max_len: 1000
}
```
**Impact**: ✅ **Minimal** - Just rename + add length validation

---

#### **NEW: State Change Request**
```typescript
// NOT IMPLEMENTED
MissionDefinitionStateChangeRequest {
  reason?: string;  // max_len: 500
}
```
**Impact**: 🔴 **High** - Need to create new DTO for Pause/Retire

---

#### **NEW: Progress Request**
```typescript
// NOT IMPLEMENTED
MissionProgressRecordRequest {
  metric_code: string;     // max_len: 64
  metric_value: string;    // max_len: 255
  progress_json?: json;
}
```
**Impact**: 🔴 **High** - Completely new feature

---

### **3. Step-Based vs Manual Implementation**

#### **Current: Manual TypeScript**
```typescript
async publishMissionDefinition(...) {
  return await this.txService.run(async (qr) => {
    const defn = await this.missionDefRepo.findById(id, qr);
    if (!defn) throw new NotFoundException(...);
    if (defn.status !== 'draft' && defn.status !== 'paused') {
      throw new ConflictException(...);
    }
    await this.missionDefRepo.update(id, { status: 'published' }, qr);
    await this.outboxService.enqueue({...}, qr);
    return { id, status: 'published' };
  });
}
```

#### **New Spec: Step-Based Declarative**
```yaml
steps:
  - kind: "read"
    table: "mission_definition"
    where: { id: "path.mission_definition_id" }
    into: "definition"

  - kind: "guard"
    expr: "definition != null"
    error_code: "MISSION_DEFINITION_NOT_FOUND"
    error_status: 404

  - kind: "guard"
    expr: "definition.status == 'draft' || definition.status == 'paused'"
    error_code: "MISSION_DEFINITION_NOT_PUBLISHABLE"
    error_status: 409

  - kind: "update"
    table: "mission_definition"
    where: { id: "path.mission_definition_id" }
    values: { status: "published" }

  - kind: "outbox_emit"
    event: "MISSION_DEFINITION_PUBLISHED"
    aggregate_type: "MISSION_DEFINITION"
    aggregate_id: "path.mission_definition_id"
```

**Impact**: 🔴 **High** - Could use Foundation StepRunner for new commands!

---

### **4. Upsert Strategy**

#### **Current: Insert with Conflict Check**
```typescript
// Check for existing assignment
const existing = await this.assignmentRepo.findByMissionAndUser(...);
if (existing !== null) throw new ConflictException('ALREADY_ASSIGNED');

// Insert new
const assignment_id = await this.assignmentRepo.create({...}, qr);
```

#### **New Spec: Upsert**
```yaml
- kind: "upsert"
  table: "mission_assignment"
  unique_by: ["mission_definition_id", "user_id"]
  values:
    mission_definition_id: "path.mission_definition_id"
    user_id: "request.user_id"
    status: "assigned"
```

**Impact**: 🟡 **Medium** - Simpler, idempotent, but needs DB constraint

---

### **5. Mission Event Audit Trail**

#### **Current: No Audit Trail**
We don't write to `mission_event` table

#### **New Spec: Every Command Writes Audit Event**
```yaml
- kind: "insert"
  table: "mission_event"
  values:
    mission_definition_id: "path.mission_definition_id"
    assignment_id: null
    event_type: "definition_published"
    payload_json: { reason: "request.reason" }
```

**Impact**: 🔴 **High** - Need to add mission_event inserts to all commands

---

### **6. Progress Tracking**

#### **Current: No Progress Tracking**
Only states: assigned → submitted → completed

#### **New Spec: Granular Progress**
- `mission_progress` table
- Track metrics: `metric_code`, `metric_value`, `progress_json`
- Status transitions: assigned → **in_progress** → submitted → completed

**Impact**: 🔴 **High** - New feature, new table, new command

---

### **7. Submission Status Flow**

#### **Current: 2 States**
```
pending → approved
```

#### **New Spec: 4 States**
```
pending → approved
       → rejected → can resubmit
       → invalidated
```

**Impact**: 🟡 **Medium** - Add Reject command, handle resubmission

---

## 📝 Detailed Command Comparison

### **Command 1: MissionDefinition.Create**

| Aspect | Current | New Spec | Impact |
|--------|---------|----------|--------|
| Path | `/v1/missions/definitions` | `/v1/missions/definitions` | ✅ Same |
| Method | POST | POST | ✅ Same |
| DTO | MissionDefinitionCreateRequestDto | MissionDefinitionCreateRequest | ✅ Same structure |
| Response | `{ id, status }` | `{ mission_definition_id, status }` | 🟡 Rename field |
| Audit | ❌ No | ✅ mission_event insert | 🔴 Add audit |
| Strategy | INSERT | UPSERT by code | 🟡 Change to upsert |

**Changes Needed**:
1. Change INSERT to UPSERT (idempotent by code)
2. Add mission_event insert
3. Rename response field `id` → `mission_definition_id`

---

### **Command 2: MissionDefinition.Publish**

| Aspect | Current | New Spec | Impact |
|--------|---------|----------|--------|
| Path | `/definitions/{id}/publish` | `/definitions/{mission_definition_id}/publish` | 🟡 Rename param |
| Input | Empty `{}` | `MissionDefinitionStateChangeRequest` | 🟡 Add reason field |
| Guard | ✅ status check | ✅ status check | ✅ Same |
| Audit | ❌ No | ✅ mission_event insert | 🔴 Add audit |

**Changes Needed**:
1. Add `reason` field to request
2. Add mission_event insert
3. Update path parameter name

---

### **Command 3: MissionAssignment.Assign**

| Aspect | Current | New Spec | Impact |
|--------|---------|----------|--------|
| Path | `/definitions/{id}/assign` | `/definitions/{mission_definition_id}/assignments` | 🔴 Different path |
| Strategy | INSERT with check | UPSERT | 🟡 Change logic |
| Response | `{ assignment_id, status }` | `{ assignment_id, mission_definition_id, user_id, status }` | 🟡 Add fields |
| Audit | ❌ No | ✅ mission_event insert | 🔴 Add audit |

**Changes Needed**:
1. Update endpoint path
2. Change to UPSERT strategy
3. Add mission_event insert
4. Expand response

---

### **Command 4: MissionSubmission.Submit**

| Aspect | Current | New Spec | Impact |
|--------|---------|----------|--------|
| Path | `/assignments/{id}/submit` | `/assignments/{assignment_id}/submissions` | 🟡 Rename param |
| DTO fields | `text_content`, `meta_json`, `file_ref_ids` | `content_json`, `file_ids` | 🔴 Rename fields |
| File handling | ❌ Not implemented | ✅ Hook: attachSubmissionFiles | 🔴 Add file handling |
| Audit | ❌ No | ✅ mission_event insert | 🔴 Add audit |

**Changes Needed**:
1. Rename DTO fields
2. Implement file attachment hook
3. Add mission_event insert
4. Update path

---

### **Command 5: MissionSubmission.Approve**

| Aspect | Current | New Spec | Impact |
|--------|---------|----------|--------|
| Path | `/submissions/{id}/approve` | `/submissions/{submission_id}/approve` | ✅ Same (just param name) |
| Logic | ✅ Update submission, assignment, create reward | ✅ Same | ✅ Aligned |
| Strategy | INSERT reward | UPSERT reward by assignment_id | 🟡 Change to upsert |
| Audit | ❌ No | ✅ mission_event insert | 🔴 Add audit |
| Reward fields | Basic | `reward_type`, `amount`, `currency`, `idempotency_key` | 🟡 Add fields |

**Changes Needed**:
1. Change reward grant to UPSERT
2. Add reward_type, currency fields
3. Add mission_event insert
4. Use spec's idempotency_key: `concat('mission_reward:', assignment.id)`

---

## 🆕 New Commands to Implement

### **Read Operations (Easy - No Business Logic)**

#### **1. MissionDefinition.Get**
```yaml
GET /v1/missions/definitions/{mission_definition_id}
- Read mission_definition by ID
- Guard: definition != null
- Response: definition
```
**Effort**: ⏱️ 10 minutes

---

#### **2. MissionDefinition.List**
```yaml
GET /v1/missions/definitions
- Read all mission_definition
- Response: { items: definitions }
```
**Effort**: ⏱️ 5 minutes

---

#### **3. MissionAssignment.Get**
```yaml
GET /v1/missions/assignments/{assignment_id}
- Read mission_assignment by ID
- Guard: assignment != null
- Response: assignment
```
**Effort**: ⏱️ 10 minutes

---

#### **4. MissionAssignment.ListByUser**
```yaml
GET /v1/users/{user_id}/mission-assignments
- Read mission_assignment where user_id = X
- Response: { items: assignments }
```
**Effort**: ⏱️ 10 minutes

---

#### **5. MissionSubmission.Get**
```yaml
GET /v1/missions/submissions/{submission_id}
- Read mission_submission by ID
- Guard: submission != null
- Response: submission
```
**Effort**: ⏱️ 10 minutes

---

#### **6. MissionSubmission.ListFiles**
```yaml
GET /v1/missions/submissions/{submission_id}/files
- Read mission_submission_file where submission_id = X
- Response: { items: files }
```
**Effort**: ⏱️ 10 minutes

---

#### **7. MissionRewardGrant.GetByAssignment**
```yaml
GET /v1/missions/assignments/{assignment_id}/reward-grant
- Read mission_reward_grant where assignment_id = X
- Response: reward_grant
```
**Effort**: ⏱️ 10 minutes

---

#### **8. MissionEvent.ListByAssignment**
```yaml
GET /v1/missions/assignments/{assignment_id}/events
- Read mission_event where assignment_id = X
- Response: { items: events }
```
**Effort**: ⏱️ 10 minutes

---

### **State Transition Commands (Medium Effort)**

#### **9. MissionDefinition.Pause**
```yaml
POST /v1/missions/definitions/{mission_definition_id}/pause
Input: { reason? }
- Guard: status == 'published'
- Update: status = 'paused'
- Insert: mission_event
- Emit: MISSION_DEFINITION_PAUSED
```
**Effort**: ⏱️ 20 minutes (similar to Publish)

---

#### **10. MissionDefinition.Retire**
```yaml
POST /v1/missions/definitions/{mission_definition_id}/retire
Input: { reason? }
- Guard: status != 'retired'
- Update: status = 'retired'
- Insert: mission_event
- Emit: MISSION_DEFINITION_RETIRED
```
**Effort**: ⏱️ 20 minutes

---

#### **11. MissionSubmission.Reject**
```yaml
POST /v1/missions/submissions/{submission_id}/reject
Input: { feedback? }
- Guard: submission.status == 'pending'
- Update submission: status = 'rejected', feedback
- Update assignment: status = 'in_progress' (allow resubmit)
- Insert: mission_event
- Emit: MISSION_SUBMISSION_REJECTED
```
**Effort**: ⏱️ 30 minutes (similar to Approve)

---

### **New Feature Commands (High Effort)**

#### **12. MissionProgress.Record**
```yaml
POST /v1/missions/assignments/{assignment_id}/progress
Input: { metric_code, metric_value, progress_json? }
- Guard: assignment exists
- Guard: assignment.status == 'assigned' || 'in_progress'
- Upsert: mission_progress (by assignment_id + metric_code)
- If assignment.status == 'assigned': Update to 'in_progress'
- Insert: mission_event
- Emit: MISSION_PROGRESS_RECORDED
```
**Effort**: ⏱️ 45 minutes (new table, new logic)

---

## 📋 Implementation Checklist

### **Phase 1: Quick Wins - Read Operations** (⏱️ 1-2 hours)
- [ ] MissionDefinition.Get
- [ ] MissionDefinition.List
- [ ] MissionAssignment.Get
- [ ] MissionAssignment.ListByUser
- [ ] MissionSubmission.Get
- [ ] MissionSubmission.ListFiles
- [ ] MissionRewardGrant.GetByAssignment
- [ ] MissionEvent.ListByAssignment

### **Phase 2: Update Existing Commands** (⏱️ 2-3 hours)
- [ ] Update Create: UPSERT strategy, mission_event, rename response
- [ ] Update Publish: Add reason field, mission_event, rename param
- [ ] Update Assign: UPSERT strategy, mission_event, update path, expand response
- [ ] Update Submit: Rename DTO fields, file handling, mission_event
- [ ] Update Approve: UPSERT reward, add fields, mission_event

### **Phase 3: New State Transitions** (⏱️ 1-2 hours)
- [ ] MissionDefinition.Pause
- [ ] MissionDefinition.Retire
- [ ] MissionSubmission.Reject

### **Phase 4: New Features** (⏱️ 1-2 hours)
- [ ] MissionProgress.Record (completely new)

### **Phase 5: Infrastructure Updates** (⏱️ 1-2 hours)
- [ ] Add mission_event table inserts to all commands
- [ ] Update database constraints for upsert strategy
- [ ] Add new DTOs (StateChangeRequest, ProgressRecordRequest)
- [ ] Update tests
- [ ] Update Postman collection

---

## ⏱️ Total Effort Estimate

| Phase | Time | Complexity |
|-------|------|------------|
| Phase 1: Read Operations | 1-2 hours | ✅ Easy |
| Phase 2: Update Existing | 2-3 hours | 🟡 Medium |
| Phase 3: State Transitions | 1-2 hours | 🟡 Medium |
| Phase 4: New Features | 1-2 hours | 🔴 Medium-High |
| Phase 5: Infrastructure | 1-2 hours | 🟡 Medium |
| **Total** | **6-11 hours** | **Mixed** |

---

## 🎯 Recommended Approach

### **Option A: Manual Implementation** (Traditional TypeScript)
- Continue current approach
- Add 12 new commands manually
- Update 5 existing commands
- Pros: Full control, familiar
- Cons: Repetitive, error-prone
- Time: 6-11 hours

### **Option B: Code Generation from Spec** (Step-Based)
- Build code generator that reads missions.pillar.v1.yml
- Generates DTOs, services, controllers from step definitions
- Leverage Foundation StepRunner
- Pros: Consistent, fast, maintainable
- Cons: Upfront investment
- Time: 4-6 hours to build generator, then <1 hour per pillar

### **Option C: Hybrid Approach** (Recommended)
1. **Phase 1**: Manually add 8 read operations (simple, low risk) - **1 hour**
2. **Phase 2**: Build simple code generator for step-based commands - **3 hours**
3. **Phase 3**: Generate remaining commands from spec - **1 hour**
4. **Phase 4**: Manual testing and refinement - **1 hour**
- Total: ~6 hours
- Benefit: Reusable generator for future pillars!

---

## 🚀 Next Steps

1. **Choose approach** (A, B, or C)
2. **Start with Phase 1** (read operations - quick wins)
3. **Build momentum** with visible progress
4. **Consider code generation** for long-term efficiency

---

## 💡 Key Insights

**Spec Alignment**: The new spec uses Foundation patterns (step-based) that align perfectly with our StepRunner!

**Audit Trail**: Every command needs mission_event insert - important for compliance

**Idempotency**: Upsert strategy is cleaner than insert+check

**Progress Tracking**: New feature that enables better UX (show mission completion %)

**Rejection Flow**: Allows users to fix and resubmit

**Code Generation**: The step-based spec is PERFECT for code generation!

---

**Ready to implement?** Let me know which approach you prefer! 🚀
