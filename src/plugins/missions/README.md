# Missions Plugin

Production-ready NestJS implementation of the Missions domain based on `specs/mission/missions.pillar.v2.yml`.

## Overview

The Missions plugin implements a complete mission system with:
- Mission definition management
- User assignment tracking
- Progress tracking
- Submission and review workflow
- Reward grant management
- Event audit trail

## Architecture

### Entities (7 total)

All entities follow TypeORM patterns with proper indexes and constraints:

1. **MissionDefinition** - Mission catalog with criteria and reward definitions
2. **MissionAssignment** - Per-user mission instance tracking
3. **MissionEvent** - Audit log for mission operations
4. **MissionProgress** - Granular progress tracking with metrics
5. **MissionSubmission** - User submissions with review workflow
6. **MissionSubmissionFile** - File attachments for submissions
7. **MissionRewardGrant** - Reward issuance tracking

### DTOs (7 total)

Request DTOs with class-validator decorators:

1. **MissionDefinitionCreateRequestDto** - Create mission definition
2. **MissionDefinitionPublishRequestDto** - Publish mission
3. **MissionDefinitionStateChangeRequestDto** - Pause/retire mission
4. **MissionAssignRequestDto** - Assign mission to user
5. **MissionSubmitRequestDto** - Submit mission for review
6. **MissionSubmissionReviewRequestDto** - Approve/reject submission
7. **MissionProgressRecordRequestDto** - Record mission progress

### Repositories (7 total)

Data access layer with transaction support:

1. **MissionDefinitionRepository**
2. **MissionAssignmentRepository**
3. **MissionEventRepository**
4. **MissionProgressRepository**
5. **MissionSubmissionRepository**
6. **MissionSubmissionFileRepository**
7. **MissionRewardGrantRepository**

### Service Layer

**MissionsWorkflowService** implements all commands following the Guard → Write → Emit → Commit pattern:

**Commands:**
- `createMissionDefinition()` - Create new mission
- `publishMissionDefinition()` - Publish mission (make it assignable)
- `pauseMissionDefinition()` - Pause active mission
- `retireMissionDefinition()` - Retire mission permanently
- `assignMission()` - Assign mission to user
- `submitMission()` - Submit mission for review
- `approveSubmission()` - Approve submission and grant rewards
- `rejectSubmission()` - Reject submission
- `recordMissionProgress()` - Record progress metrics

**Queries:**
- `getMissionDefinition()` - Get definition by ID
- `listMissionDefinitions()` - List all definitions
- `getMissionAssignment()` - Get assignment by ID
- `listMissionAssignmentsByUser()` - List user's assignments
- `getMissionSubmission()` - Get submission by ID
- `getRewardGrantByAssignment()` - Get reward grant
- `listEventsByAssignment()` - List audit events
- `listSubmissionFiles()` - List submission files
- `listProgressByAssignment()` - List progress metrics

### Controller

**MissionsController** exposes RESTful API endpoints:

#### Mission Definitions
- `POST /v1/missions/definitions` - Create mission
- `GET /v1/missions/definitions` - List all missions
- `GET /v1/missions/definitions/:id` - Get mission by ID
- `POST /v1/missions/definitions/:id/publish` - Publish mission
- `POST /v1/missions/definitions/:id/pause` - Pause mission
- `POST /v1/missions/definitions/:id/retire` - Retire mission

#### Mission Assignments
- `POST /v1/missions/definitions/:id/assignments` - Assign mission
- `GET /v1/missions/assignments/:id` - Get assignment
- `GET /v1/users/:user_id/mission-assignments` - List user assignments

#### Mission Progress
- `POST /v1/missions/assignments/:id/progress` - Record progress
- `GET /v1/missions/assignments/:id/progress` - List progress

#### Mission Submissions
- `POST /v1/missions/assignments/:id/submissions` - Submit mission
- `GET /v1/missions/submissions/:id` - Get submission
- `POST /v1/missions/submissions/:id/approve` - Approve submission
- `POST /v1/missions/submissions/:id/reject` - Reject submission
- `GET /v1/missions/submissions/:id/files` - List submission files

#### Rewards & Events
- `GET /v1/missions/assignments/:id/reward-grant` - Get reward grant
- `GET /v1/missions/assignments/:id/events` - List events

## Key Features

### Idempotency
All write commands require `Idempotency-Key` header and use:
- Database unique constraints (e.g., `UNIQUE(mission_id, user_id)`)
- Explicit idempotency keys in entities
- MySQL `ON DUPLICATE KEY UPDATE` pattern

### Transaction Safety
All commands use `TransactionService.run()` to ensure atomicity.

### Event Emission
Commands emit events to the outbox table within the same transaction:
- `MISSION_DEFINITION_CREATED`
- `MISSION_DEFINITION_PUBLISHED`
- `MISSION_DEFINITION_PAUSED`
- `MISSION_DEFINITION_RETIRED`
- `MISSION_ASSIGNED`
- `MISSION_PROGRESS_RECORDED`
- `MISSION_SUBMITTED`
- `MISSION_SUBMISSION_APPROVED`
- `MISSION_SUBMISSION_REJECTED`
- `MISSION_COMPLETED`
- `MISSION_REWARD_GRANTED`

### Audit Trail
All mission operations are logged to `mission_event` table with:
- Event type
- Payload JSON
- Reference tracking (ref_type, ref_id)
- Timestamp (occurred_at)

### Status Transitions

**MissionDefinition:**
- `active` → `paused` → `active` (via publish)
- `active` → `retired` (final)
- `paused` → `retired` (final)

**MissionAssignment:**
- `assigned` → `in_progress` → `submitted` → `completed`
- `submitted` → `in_progress` (on rejection)

**MissionSubmission:**
- `draft` → `pending` → `approved` (final)
- `pending` → `rejected` (can resubmit)

## Usage Example

```typescript
// 1. Create mission definition
const mission = await workflowService.createMissionDefinition(
  {
    code: 'POLICY_5X',
    name: 'Complete 5 Policy Applications',
    cadence: 'one_time',
    max_per_user: 1,
    criteria_json: { policies_required: 5 },
    reward_json: { amount: 50, currency: 'MYR' }
  },
  actor,
  idempotencyKey
);

// 2. Publish mission
await workflowService.publishMissionDefinition(
  mission.mission_definition_id,
  {},
  actor,
  idempotencyKey
);

// 3. Assign to user
const assignment = await workflowService.assignMission(
  mission.mission_definition_id,
  { user_id: '123' },
  actor,
  idempotencyKey
);

// 4. Record progress
await workflowService.recordMissionProgress(
  assignment.assignment_id,
  {
    metric_code: 'policies_completed',
    current_value: 3,
    target_value: 5
  },
  actor,
  idempotencyKey
);

// 5. Submit for review
const submission = await workflowService.submitMission(
  assignment.assignment_id,
  { text_content: 'Completed all 5 policies!' },
  actor,
  idempotencyKey
);

// 6. Approve submission (grants reward)
await workflowService.approveSubmission(
  submission.submission_id,
  { feedback: 'Great work!' },
  actor,
  idempotencyKey
);
```

## Integration Points

### Dependencies
- **TransactionService** - Transaction management
- **OutboxService** - Event emission
- **AuthGuard** - Authentication
- **PermissionsGuard** - Authorization

### External References
- `user` table (read-only) - Referenced by assignments and rewards

### Events Emitted
All events follow the outbox pattern and include:
- event_name, event_version
- aggregate_type, aggregate_id
- actor_user_id, occurred_at
- correlation_id, causation_id
- payload, dedupe_key

## Testing

TODO: Generate test files following the pattern:
- Unit tests for services
- Integration tests for repositories
- E2E tests for controllers

## Database Schema

See `specs/mission/missions.pillar.v2.yml` for complete DDL including:
- All column types and constraints
- Foreign key relationships
- Unique constraints for idempotency
- Indexes for query optimization

## File Structure

```
src/plugins/missions/
├── controllers/
│   └── missions.controller.ts
├── dto/
│   ├── mission-approve-submission.request.dto.ts
│   ├── mission-assign.request.dto.ts
│   ├── mission-definition-create.request.dto.ts
│   ├── mission-definition-publish.request.dto.ts
│   ├── mission-definition-state-change.request.dto.ts
│   ├── mission-progress-record.request.dto.ts
│   └── mission-submit.request.dto.ts
├── entities/
│   ├── mission-assignment.entity.ts
│   ├── mission-definition.entity.ts
│   ├── mission-event.entity.ts
│   ├── mission-progress.entity.ts
│   ├── mission-reward-grant.entity.ts
│   ├── mission-submission-file.entity.ts
│   └── mission-submission.entity.ts
├── repositories/
│   ├── mission-assignment.repo.ts
│   ├── mission-definition.repo.ts
│   ├── mission-event.repo.ts
│   ├── mission-progress.repo.ts
│   ├── mission-reward-grant.repo.ts
│   ├── mission-submission-file.repo.ts
│   └── mission-submission.repo.ts
├── services/
│   └── missions.workflow.service.ts
├── index.ts
├── missions.module.ts
└── README.md
```

## Notes

- All IDs use `bigint` in database, mapped to `number` in TypeScript
- All datetime fields use MySQL `datetime` type
- JSON columns use MySQL `json` type
- Default status values are set at database level
- Idempotency handled via unique constraints + ON DUPLICATE KEY UPDATE

## TODO

- [ ] Add unit tests for all service methods
- [ ] Add integration tests for repositories
- [ ] Add E2E tests for API endpoints
- [ ] Add OpenAPI/Swagger documentation
- [ ] Add background workers for reward processing
- [ ] Add mission expiration cron job
- [ ] Add metrics and monitoring
