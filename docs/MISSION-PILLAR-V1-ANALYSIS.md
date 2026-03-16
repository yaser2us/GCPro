# Mission Pillar v1 Spec - Deep Analysis

> **Purpose**: Analyzing what makes missions.pillar.v1.yml an excellent specification
> **Why this matters**: Understanding the structure so we can apply it to all pillars
> **Created**: 2026-03-09

---

## Executive Summary

**Honest Assessment**: YES, v1 gives **HIGH clarity and confidence** about what needs to be built step-by-step.

**Why it works**:
1. **Architectural Clarity** - Clear boundaries, ownership, and integration points
2. **Pattern Documentation** - Explicit conventions that guide all implementations
3. **Complete Context** - Not just "what" but "how" and "why"
4. **Low-Level Precision** - Step-by-step command workflows
5. **Type Safety** - Explicit type definitions
6. **Event Catalog** - Clear event-driven architecture
7. **Resource Map** - High-level view of domain model

---

## Section-by-Section Analysis

### 1. Header (Lines 0-3)

```yaml
version: "1.0"
spec_id: "missions.pillar.v1"
domain: "missions"
plugin: "missions"
```

**What it tells AI:**
- This is versioned documentation (can evolve)
- Unique identifier for reference
- Domain-Driven Design alignment (domain name)
- Maps to code structure (plugin folder name)

**Confidence Level**: ⭐⭐⭐⭐⭐
- I know exactly where code goes: `src/plugins/missions/`
- I know this is version 1 (expect future iterations)

---

### 2. Ownership Section (Lines 5-19)

```yaml
ownership:
  owner_plugin: "missions"
  owns_tables:
    - "mission_definition"
    - "mission_assignment"
    - "mission_progress"
    - "mission_submission"
    - "mission_submission_file"
    - "mission_reward_grant"
    - "mission_event"
  cross_plugin_writes: false
  cross_plugin_integration:
    allowed_via:
      - "command_api"
      - "outbox_events"
```

**What it tells AI:**

✅ **BOUNDARIES** - "These 7 tables belong to me, nobody else can write to them"
- If I see another plugin trying to write to `mission_assignment`, that's a violation
- Other plugins can only interact via APIs or events

✅ **INTEGRATION POLICY** - "If you need mission data, call my API or subscribe to my events"
- No direct database access from other plugins
- Enforces loose coupling
- Prevents dependency hell

✅ **RESPONSIBILITY** - "I am the source of truth for missions data"
- Any mission-related business logic lives here
- Other services are consumers, not producers

**Confidence Level**: ⭐⭐⭐⭐⭐
- I know my boundaries
- I know how to integrate with others
- I can design with confidence that my data won't be corrupted by external writes

**Missing in v2**: ❌ No ownership section - unclear boundaries

---

### 3. Dependencies Section (Lines 21-28)

```yaml
dependencies:
  corekit:
    transaction_wrapper: "withTxn"
    outbox_service: "OutboxService.emit"
    guard_helper: "guard"
    domain_error: "DomainError"
  core_tables_readonly:
    - "user"
```

**What it tells AI:**

✅ **REQUIRED INFRASTRUCTURE** - "I need these corekit services"
- Use `withTxn` for transaction management
- Use `OutboxService.emit` for event publishing
- Use `guard` helper for validation
- Use `DomainError` for error handling

✅ **EXTERNAL TABLE ACCESS** - "I read from user table, but don't write to it"
- Need to join with `user` table for user_id
- Read-only access (no FK constraints with ON DELETE CASCADE to user)
- User service owns that data

**Confidence Level**: ⭐⭐⭐⭐⭐
- I know what infrastructure to import
- I know which external tables I can read
- I know I'm not reinventing wheels (transaction, outbox already exist)

**Code Generation Benefit**:
```typescript
// Auto-generate imports based on dependencies:
import { TransactionService } from '@corekit/services/transaction.service';
import { OutboxService } from '@corekit/services/outbox.service';
import { Guard } from '@corekit/guard';
import { DomainError } from '@corekit/errors';

// Auto-generate readonly repositories for external tables:
import { UserRepository } from '@core/repositories/user.repo'; // read-only
```

**Missing in v2**: ❌ No dependencies section - unclear what services to use

---

### 4. Conventions Section (Lines 30-54)

```yaml
conventions:
  workflow_discipline:
    - "guard"
    - "write"
    - "emit"
    - "commit"
  status_mutation_policy: "Status fields may only be mutated through commands."
  outbox:
    required_envelope_fields:
      - "event_name"
      - "event_version"
      - "aggregate_type"
      - "aggregate_id"
      - "actor_user_id"
      - "occurred_at"
      - "correlation_id"
      - "causation_id"
  idempotency:
    required_header: "Idempotency-Key"
    default_scope: "actor_user_id + command_name"
    db_strategy:
      - "UNIQUE(idempotency_key) where applicable"
      - "UNIQUE(user_id, mission_definition_id) for assignment-style dedupe"
      - "UNIQUE(assignment_id) for reward grant exactly-once"
      - "MySQL ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)"
```

**What it tells AI:**

✅ **WORKFLOW PATTERN** - Every command follows: Guard → Write → Emit → Commit
- Don't write before validating (guard first)
- Don't emit events before writes complete
- Transaction commits last
- **Consistency across all commands**

✅ **STATUS IMMUTABILITY** - "Never UPDATE status directly in code - use commands only"
- No backdoor status changes
- All state transitions trackable
- Audit trail complete

✅ **EVENT CONTRACT** - "All events must have these 8 fields"
- Enforces event schema consistency
- Makes event consumers reliable
- Enables distributed tracing (correlation_id, causation_id)

✅ **IDEMPOTENCY STRATEGY** - "Here's exactly how we prevent duplicates"
- Database-level enforcement (UNIQUE constraints)
- Multiple strategies for different use cases:
  - Simple idempotency_key for single-entity operations
  - Composite keys for relationship operations (user + mission)
  - Single-assignment constraints for one-time operations (reward grant)
- MySQL-specific implementation (ON DUPLICATE KEY UPDATE)

**Confidence Level**: ⭐⭐⭐⭐⭐
- I know EXACTLY how to structure every service method
- I know EXACTLY what fields every event needs
- I know EXACTLY how to make operations idempotent
- I can generate consistent code across all commands

**Code Generation Benefit**:
```typescript
// Auto-generate service method template:
async commandName(request, actor, idempotencyKey) {
  return this.txService.run(async (queryRunner) => {
    // 1. GUARD phase
    if (!someCondition) {
      throw new DomainError('ERROR_CODE', 400);
    }

    // 2. WRITE phase
    const id = await this.repo.upsert(...);

    // 3. EMIT phase
    await this.outboxService.enqueue({
      event_name: 'EVENT_NAME',
      event_version: 1,
      aggregate_type: 'AGGREGATE',
      aggregate_id: String(id),
      actor_user_id: actor.actor_user_id,
      occurred_at: new Date(),
      correlation_id: actor.correlation_id,
      causation_id: actor.causation_id,
      // ... required fields
    });

    // 4. COMMIT (automatic via txService.run)
    return { id };
  });
}
```

**Missing in v2**: ❌ No conventions - each command might use different patterns

---

### 5. Resources Section (Lines 56-141)

```yaml
resources:
  - name: "mission_definition"
    kind: "aggregate"
    table: "mission_definition"
    primary_key: "id"
    statuses:
      - "draft"
      - "published"
      - "paused"
      - "retired"
    api_surface:
      - "create"
      - "get"
      - "list"
      - "publish"
      - "pause"
      - "retire"

  - name: "mission_assignment"
    kind: "aggregate"
    table: "mission_assignment"
    primary_key: "id"
    statuses:
      - "assigned"
      - "in_progress"
      - "submitted"
      - "completed"
      - "cancelled"
    api_surface:
      - "assign"
      - "get"
      - "listByUser"
      - "cancel"
  # ... more resources
```

**What it tells AI:**

✅ **DOMAIN MODEL AT A GLANCE** - "Here's everything in this pillar"
- 7 resources total
- 4 aggregates (stateful entities)
- 3 supporting resources

✅ **STATE MACHINES** - "These are valid statuses for each aggregate"
- `mission_definition`: 4 states (draft → published → paused → retired)
- `mission_assignment`: 5 states (assigned → in_progress → submitted → completed/cancelled)
- `mission_submission`: 4 states (pending → approved/rejected/invalidated)
- `mission_reward_grant`: 5 states (created → requested → granted/failed/revoked)

✅ **API INVENTORY** - "These are all the operations available"
- Write operations: create, publish, pause, retire, assign, submit, approve, reject, etc.
- Read operations: get, list, listByUser, listByAssignment
- **Complete API surface** - I know when I'm done

✅ **AGGREGATE vs RESOURCE** - DDD pattern clarity
- `aggregate`: Has statuses, lifecycle, business rules
- `resource`: Data storage, no lifecycle

**Confidence Level**: ⭐⭐⭐⭐⭐
- I can see the entire domain model in 86 lines
- I know which entities have state machines
- I know what APIs to implement
- I can validate completeness (did I implement all api_surface items?)

**Code Generation Benefit**:
```typescript
// Auto-generate enum types:
export enum MissionDefinitionStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  PAUSED = 'paused',
  RETIRED = 'retired',
}

// Auto-generate validation:
const VALID_STATUSES = ['draft', 'published', 'paused', 'retired'];
if (!VALID_STATUSES.includes(status)) {
  throw new ValidationError('INVALID_STATUS');
}

// Auto-generate service interface:
interface IMissionDefinitionService {
  create(...): Promise<...>;
  get(...): Promise<...>;
  list(...): Promise<...>;
  publish(...): Promise<...>;
  pause(...): Promise<...>;
  retire(...): Promise<...>;
}
```

**Missing in v2**: ❌ No resources section - unclear domain model overview

---

### 6. Aggregates Section (Lines 143-181)

```yaml
aggregates:
  MISSION_DEFINITION:
    root_table: "mission_definition"
    primary_key: "id"
    statuses:
      - "draft"
      - "published"
      - "paused"
      - "retired"

  MISSION_ASSIGNMENT:
    root_table: "mission_assignment"
    primary_key: "id"
    statuses:
      - "assigned"
      - "in_progress"
      - "submitted"
      - "completed"
      - "cancelled"
  # ... more aggregates
```

**What it tells AI:**

✅ **EVENT AGGREGATE TYPES** - "These are the aggregate types for events"
- Maps to `aggregate_type` field in outbox envelope
- UPPERCASE naming convention
- 4 aggregates total

✅ **AGGREGATE BOUNDARIES** - Each aggregate is a transaction boundary
- Changes to `MISSION_DEFINITION` are atomic
- Changes to `MISSION_ASSIGNMENT` are atomic
- Can't update both in single transaction (unless parent-child relationship)

**Confidence Level**: ⭐⭐⭐⭐⭐
- I know what aggregate_type to use in events
- I understand transactional boundaries
- I can implement event sourcing correctly

**Code Generation Benefit**:
```typescript
// Auto-generate aggregate type enum:
export enum AggregateType {
  MISSION_DEFINITION = 'MISSION_DEFINITION',
  MISSION_ASSIGNMENT = 'MISSION_ASSIGNMENT',
  MISSION_SUBMISSION = 'MISSION_SUBMISSION',
  MISSION_REWARD_GRANT = 'MISSION_REWARD_GRANT',
}

// Auto-generate event emission helper:
await this.outboxService.enqueue({
  aggregate_type: AggregateType.MISSION_DEFINITION, // Type-safe!
  aggregate_id: String(id),
  // ...
});
```

**Missing in v2**: ❌ No aggregates section - unclear event aggregate types

---

### 7. Types Section (Lines 182-201)

```yaml
types:
  Actor:
    fields:
      - { name: "actor_user_id", type: "string", required: true }
      - { name: "roles", type: "string[]", required: false }

  MissionDefinitionSummary:
    fields:
      - { name: "id", type: "string", required: true }
      - { name: "code", type: "string", required: true }
      - { name: "title", type: "string", required: true }
      - { name: "status", type: "string", required: true }

  MissionAssignmentSummary:
    fields:
      - { name: "id", type: "string", required: true }
      - { name: "mission_definition_id", type: "string", required: true }
      - { name: "user_id", type: "string", required: true }
      - { name: "status", type: "string", required: true }
```

**What it tells AI:**

✅ **REUSABLE TYPE DEFINITIONS** - "Use these consistently"
- `Actor` type for authentication context
- Summary types for list responses (don't return full entities)

✅ **TYPE CONTRACTS** - "These fields are always present"
- Required vs optional clearly marked
- Array types explicitly noted (string[])

**Confidence Level**: ⭐⭐⭐⭐
- I can generate TypeScript interfaces
- I understand what summary responses should contain
- I can enforce consistency across endpoints

**Code Generation Benefit**:
```typescript
// Auto-generate TypeScript types:
export interface Actor {
  actor_user_id: string;
  roles?: string[];
}

export interface MissionDefinitionSummary {
  id: string;
  code: string;
  title: string;
  status: string;
}
```

**Missing in v2**: ❌ No types section - inconsistent response shapes

---

### 8. DTOs Section (Lines 202-238)

```yaml
dtos:
  MissionDefinitionCreateRequest:
    fields:
      - { name: "code", type: "string", required: true, max_len: 64 }
      - { name: "title", type: "string", required: true, max_len: 200 }
      - { name: "description", type: "string", required: false, max_len: 5000 }
      - { name: "cadence", type: "string", required: true, example: "one_time" }
      - { name: "starts_at", type: "datetime", required: false }
      - { name: "ends_at", type: "datetime", required: false }
      - { name: "max_total", type: "int32", required: false }
      - { name: "max_per_user", type: "int32", required: false }
      - { name: "criteria_json", type: "json", required: false }
      - { name: "reward_json", type: "json", required: false }

  MissionProgressRecordRequest:
    fields:
      - { name: "metric_code", type: "string", required: true, max_len: 64 }
      - { name: "metric_value", type: "string", required: true, max_len: 255 }
      - { name: "progress_json", type: "json", required: false }
```

**What it tells AI:**

✅ **VALIDATION RULES** - "Validate these constraints"
- max_len for strings (prevents database truncation)
- required fields (enforce NOT NULL)
- type validation (string, int32, datetime, json)

✅ **API CONTRACT** - "This is exactly what the endpoint accepts"
- No surprises - complete field list
- Examples provided for clarity
- Optional vs required clearly marked

**Confidence Level**: ⭐⭐⭐⭐⭐
- I can generate class-validator decorators
- I can generate API documentation
- I know exactly what to validate

**Code Generation Benefit**:
```typescript
// Auto-generate DTO class:
export class MissionDefinitionCreateRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @IsNotEmpty()
  cadence: string; // TODO: Could be enum

  @IsOptional()
  @IsDateString()
  starts_at?: string;

  // ... etc
}
```

**Missing in v2**: ✅ v2 has DTOs but less detailed (no max_len, no examples)

---

### 9. Events Section (Lines 239-283)

```yaml
events:
  - name: "MISSION_DEFINITION_CREATED"
    version: 1
    aggregate_type: "MISSION_DEFINITION"

  - name: "MISSION_DEFINITION_PUBLISHED"
    version: 1
    aggregate_type: "MISSION_DEFINITION"

  - name: "MISSION_ASSIGNED"
    version: 1
    aggregate_type: "MISSION_ASSIGNMENT"

  - name: "MISSION_SUBMITTED"
    version: 1
    aggregate_type: "MISSION_SUBMISSION"

  - name: "MISSION_SUBMISSION_APPROVED"
    version: 1
    aggregate_type: "MISSION_SUBMISSION"

  # ... 11 events total
```

**What it tells AI:**

✅ **EVENT CATALOG** - "These are ALL events this pillar publishes"
- 11 events total
- Versioned (all v1 currently, can evolve)
- Aggregate type clearly marked

✅ **EVENT-DRIVEN ARCHITECTURE** - "Other services can subscribe to these"
- Clear integration points
- Event consumers know what's available
- Version management for backward compatibility

**Confidence Level**: ⭐⭐⭐⭐⭐
- I know all events to emit
- I can generate event enum
- I can document event-driven flows

**Code Generation Benefit**:
```typescript
// Auto-generate event enum:
export enum MissionEvent {
  MISSION_DEFINITION_CREATED = 'MISSION_DEFINITION_CREATED',
  MISSION_DEFINITION_PUBLISHED = 'MISSION_DEFINITION_PUBLISHED',
  MISSION_ASSIGNED = 'MISSION_ASSIGNED',
  MISSION_SUBMITTED = 'MISSION_SUBMITTED',
  // ... etc
}

// Auto-generate event payload types:
export interface MissionDefinitionCreatedPayload {
  mission_definition_id: string;
  code: string;
  title: string;
}
```

**Missing in v2**: ✅ v2 has events in coverage section, but not as detailed

---

### 10. Commands Section (Lines 284-1141)

This is the **MOST IMPORTANT** section - 858 lines of step-by-step workflows.

**Example Command**:
```yaml
- name: "MissionDefinition.Create"
  path: "/v1/missions/definitions"
  method: "POST"
  idempotent: true
  input: "MissionDefinitionCreateRequest"
  steps:
    - kind: "guard"
      expr: "request.code != null && request.code != ''"
      error_code: "MISSION_CODE_REQUIRED"
      error_status: 400

    - kind: "upsert"
      table: "mission_definition"
      unique_by: ["code"]
      values:
        code: "request.code"
        title: "request.title"
        description: "request.description"
        cadence: "request.cadence"
        starts_at: "request.starts_at"
        ends_at: "request.ends_at"
        max_total: "request.max_total"
        max_per_user: "request.max_per_user"
        criteria_json: "request.criteria_json"
        reward_json: "request.reward_json"
        status: "draft"

    - kind: "insert"
      table: "mission_event"
      values:
        mission_definition_id: "last_insert_id()"
        assignment_id: null
        event_type: "definition_created"
        payload_json:
          code: "request.code"
          title: "request.title"

    - kind: "outbox_emit"
      event: "MISSION_DEFINITION_CREATED"
      aggregate_type: "MISSION_DEFINITION"
      aggregate_id: "last_insert_id()"
      payload:
        mission_definition_id: "last_insert_id()"
        code: "request.code"
        title: "request.title"
  response:
    status: 201
    body:
      mission_definition_id: "last_insert_id()"
      status: "draft"
```

**What it tells AI:**

✅ **COMPLETE IMPLEMENTATION SPEC** - "Here's EXACTLY what this command does"
- HTTP method and path
- Idempotency flag
- Input DTO reference
- Every step in order
- Response format

✅ **STEP-BY-STEP WORKFLOW** - "Execute in this exact order"
1. Guard: Validate request
2. Upsert: Write to database (idempotent)
3. Insert: Audit trail
4. Outbox emit: Publish event
5. Return: Response shape

✅ **IDEMPOTENCY IMPLEMENTATION** - "Use UPSERT with unique_by: ['code']"
- Leverages database UNIQUE constraint
- ON DUPLICATE KEY UPDATE pattern
- Safe to retry

✅ **ERROR HANDLING** - "Throw this error code with this status"
- Specific error codes
- HTTP status codes
- Clear error messages

**Confidence Level**: ⭐⭐⭐⭐⭐⭐ (6 stars!)
- I can generate the ENTIRE service method
- I know EXACTLY what to do in what order
- I know error codes, status codes, field mappings
- **ZERO ambiguity**

**Code Generation - COMPLETE**:
```typescript
async createMissionDefinition(
  request: MissionDefinitionCreateRequestDto,
  actor: Actor,
  idempotencyKey: string,
): Promise<{ mission_definition_id: number; status: string }> {
  return this.txService.run(async (queryRunner) => {
    // Step 1: Guard
    if (!request.code || request.code === '') {
      throw new DomainError('MISSION_CODE_REQUIRED', 400);
    }

    // Step 2: Upsert
    const mission_definition_id = await this.missionDefRepo.upsert({
      code: request.code,
      title: request.title,
      description: request.description,
      cadence: request.cadence,
      starts_at: request.starts_at,
      ends_at: request.ends_at,
      max_total: request.max_total,
      max_per_user: request.max_per_user,
      criteria_json: request.criteria_json,
      reward_json: request.reward_json,
      status: 'draft',
    }, queryRunner);

    // Step 3: Insert audit event
    await this.missionEventRepo.create({
      mission_definition_id,
      assignment_id: null,
      event_type: 'definition_created',
      payload_json: {
        code: request.code,
        title: request.title,
      },
    }, queryRunner);

    // Step 4: Outbox emit
    await this.outboxService.enqueue({
      event_name: 'MISSION_DEFINITION_CREATED',
      event_version: 1,
      aggregate_type: 'MISSION_DEFINITION',
      aggregate_id: String(mission_definition_id),
      actor_user_id: actor.actor_user_id,
      occurred_at: new Date(),
      correlation_id: actor.correlation_id || uuidv4(),
      causation_id: actor.causation_id || `cmd-create-${mission_definition_id}`,
      payload: {
        mission_definition_id,
        code: request.code,
        title: request.title,
      },
      dedupe_key: idempotencyKey,
    }, queryRunner);

    // Step 5: Return response
    return {
      mission_definition_id,
      status: 'draft',
    };
  });
}
```

**This is 95% of the code** - I just need to:
- Add TypeScript syntax
- Add proper imports
- Wrap in class structure

**Missing in v2**: ✅ v2 has commands but missing guard expressions, event payloads, audit trail details

---

## Comparison: v1 vs v2

| Section | v1 | v2 | Impact |
|---------|----|----|--------|
| **Ownership** | ✅ Detailed | ❌ Missing | Can't understand boundaries |
| **Dependencies** | ✅ Explicit | ❌ Missing | Don't know what services to use |
| **Conventions** | ✅ Comprehensive | ❌ Missing | Inconsistent implementations |
| **Resources** | ✅ Complete catalog | ❌ Missing | Can't see domain model |
| **Aggregates** | ✅ Clear boundaries | ❌ Missing | Event types unclear |
| **Types** | ✅ Reusable types | ❌ Missing | Inconsistent responses |
| **DTOs** | ✅ Detailed (max_len, examples) | ⚠️ Basic | Less validation guidance |
| **Events** | ✅ Full catalog | ⚠️ In coverage | Less prominent |
| **Commands** | ✅ Very detailed steps | ✅ Good steps | v1 slightly more detail |
| **Schema** | ❌ Missing | ✅ Detailed DDL | v2 adds this! |

---

## What Makes v1 Excellent (Ranked)

### 1. ⭐⭐⭐⭐⭐⭐ Conventions Section
**Why**: Gives architectural patterns that ensure consistency across ALL commands
- Every developer follows same workflow
- Every command has same shape
- Idempotency strategy is standardized
- Event contracts are uniform

### 2. ⭐⭐⭐⭐⭐⭐ Commands Section (Step-by-Step)
**Why**: Zero ambiguity - I can generate 95% of the code automatically
- Exact execution order
- Exact field mappings
- Exact error codes
- Exact response shapes

### 3. ⭐⭐⭐⭐⭐ Resources Section
**Why**: Domain model at a glance - understand the big picture in 2 minutes
- Know all entities
- Know all state machines
- Know all operations
- Can validate completeness

### 4. ⭐⭐⭐⭐⭐ Ownership Section
**Why**: Clear boundaries prevent architectural chaos
- No accidental coupling
- Clear integration points
- Maintainable over time

### 5. ⭐⭐⭐⭐⭐ Dependencies Section
**Why**: Know what infrastructure exists vs what to build
- Don't reinvent transaction management
- Don't reinvent outbox pattern
- Use standard error types

### 6. ⭐⭐⭐⭐ Events Section
**Why**: Event catalog enables event-driven architecture
- Other services know what to subscribe to
- Clear integration points
- Version management

### 7. ⭐⭐⭐⭐ DTOs Section
**Why**: API contract validation
- Generate validation decorators
- Generate API docs
- Prevent bad data

### 8. ⭐⭐⭐ Types Section
**Why**: Consistent type usage
- Reusable interfaces
- Consistent responses

### 9. ⭐⭐⭐ Aggregates Section
**Why**: Event sourcing clarity
- Know aggregate types
- Understand boundaries

---

## What v2 Needs to Add

### Critical (Must Have):
1. **Ownership section** - Copy from v1, update table list from DDL
2. **Dependencies section** - Copy from v1, validate corekit services exist
3. **Conventions section** - Copy from v1, adjust for actual implementation
4. **Resources section** - Build from DDL + existing commands

### Important (Should Have):
5. **Aggregates section** - Extract from events
6. **Types section** - Define reusable types
7. **Enhance DTOs** - Add max_len, examples

### Nice to Have:
8. **More guard details** - Explicit validation expressions
9. **Event payload schemas** - What fields in each event

---

## Honest Assessment: Does v1 Give Clarity & Confidence?

### ✅ **YES - For Command Implementation**

Reading v1, I know:
- ✅ What infrastructure to use (dependencies)
- ✅ What pattern to follow (conventions)
- ✅ What tables I own (ownership)
- ✅ What the domain model looks like (resources)
- ✅ Every step of every command (commands section)
- ✅ What to validate (DTOs + guards)
- ✅ What events to emit (events section)
- ✅ What to return (response section)

**Confidence Level**: 95%
- 5% missing: Need to see DDL to know exact column types
- But I can implement 95% of the code just from v1

### ⚠️ **PARTIAL - For Database Schema**

Reading v1, I DON'T know:
- ❌ Exact column types (varchar vs text, lengths)
- ❌ Nullable vs NOT NULL
- ❌ Foreign key constraints
- ❌ Index definitions
- ❌ Default values

**Confidence Level**: 40%
- Need DDL file to know schema details

---

## Recommendation: v2 Structure

```yaml
# Combine best of both:

version: "2.0"
spec_id: "missions.pillar.v2"
domain: "missions"
plugin: "missions"

# From v1 (architectural context)
ownership: { ... }
dependencies: { ... }
conventions: { ... }
resources: { ... }
aggregates: { ... }
types: { ... }

# From v2 (database schema)
schema:
  tables: { ... }

# Enhanced DTOs (v1 detail + v2 structure)
dtos: { ... }

# Events catalog
events: { ... }

# Commands (v1 detail + v2 structure)
commands: { ... }

# Coverage
coverage: { ... }
```

**Result**: Complete specification that gives 95%+ clarity for both:
- Architectural understanding (from v1 sections)
- Database schema (from v2 schema section)
- Implementation details (from v1 commands detail)

---

## Bottom Line

**v1 is EXCELLENT for giving low-level implementation clarity.**

The step-by-step commands section combined with conventions, ownership, and resources sections create a complete picture that enables:
- Confident code generation
- Consistent architecture
- Clear boundaries
- Maintainable code

**v2's weakness**: Missing the architectural context (ownership, dependencies, conventions, resources) that v1 provides.

**v2's strength**: Has detailed database schema that v1 lacks.

**Perfect spec** = v1 structure + v2 schema section ✨
