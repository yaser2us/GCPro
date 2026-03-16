# Pillar YAML Specification Guide

> **Purpose**: Instructions for creating pillar specification YAML files that serve as living documentation and code generation source
> **Audience**: AI assistants, developers, business stakeholders
> **Last Updated**: 2026-03-09

---

## Overview

Pillar YAML specifications serve **three critical functions**:

1. **Code Generation Source** - AI reads YAML to generate TypeORM entities, repositories, services, controllers
2. **Business Documentation** - Stakeholders understand what the system does without reading code
3. **Developer Reference** - API contracts, workflows, and database schema in one place

---

## Source of Truth Hierarchy

```
FULL-DDL.md (Database Schema)
    ↓ [FROZEN - Cannot Change]
    ↓ [Single Source of Truth]
    ↓
{pillar}.pillar.v{N}.yml (Specification)
    ↓ [Living Documentation]
    ↓ [MUST Match Database Exactly]
    ↓ [Used for Code Generation]
    ↓
TypeScript Code (Entities, Services, Controllers)
    ↓ [Generated/Derived from YAML]
    ↓ [MUST Match YAML Exactly]
    ↓
Running Application
```

### Critical Rule: Database is FROZEN

- ✅ **FULL-DDL.md** is the authoritative source
- ❌ **DO NOT** invent fields not in DDL
- ❌ **DO NOT** change data types from DDL
- ❌ **DO NOT** add tables not in DDL
- ❌ **DO NOT** suggest schema changes in YAML
- ✅ **DO** reverse-engineer YAML from DDL exactly

---

## YAML File Structure

### 1. Metadata Section

```yaml
name: "Mission"
version: "2.0"
description: "Mission catalog, assignments, progress tracking, and rewards"
owner: "MISSIONS"
database_source: "docs/database/FULL-DDL.md"
```

### 2. Schema Section

Document every table from FULL-DDL.md with exact column specifications:

```yaml
schema:
  tables:
    mission_progress:
      columns:
        id:
          type: "bigint"
          unsigned: true
          nullable: false
          auto_increment: true

        assignment_id:
          type: "bigint"
          unsigned: true
          nullable: false

        metric_code:
          type: "varchar"
          length: 64
          nullable: false

        current_value:
          type: "decimal"
          precision: [18, 2]
          nullable: false
          default: "0.00"

        target_value:
          type: "decimal"
          precision: [18, 2]
          nullable: false
          default: "1.00"

        status:
          type: "varchar"
          length: 16
          nullable: false
          default: "tracking"

        meta_json:
          type: "json"
          nullable: true

        updated_at:
          type: "datetime"
          nullable: false
          default: "CURRENT_TIMESTAMP"
          on_update: "CURRENT_TIMESTAMP"

        created_at:
          type: "datetime"
          nullable: false
          default: "CURRENT_TIMESTAMP"

      constraints:
        primary_key: ["id"]
        unique_keys:
          - name: "uk_mprog_assignment_metric"
            columns: ["assignment_id", "metric_code"]
        foreign_keys:
          - name: "fk_mprog_assignment"
            column: "assignment_id"
            references: "mission_assignment(id)"
            on_delete: "CASCADE"
            on_update: "CASCADE"
        indexes:
          - name: "idx_mprog_status"
            columns: ["status"]
```

#### Mapping SQL to YAML Types

| SQL Type | YAML Type | Notes |
|----------|-----------|-------|
| `bigint` | `bigint` | Add `unsigned: true` if applicable |
| `varchar(N)` | `varchar` | Include `length: N` |
| `text` | `text` | No length needed |
| `json` | `json` | Always nullable in MySQL |
| `decimal(M,D)` | `decimal` | Include `precision: [M, D]` |
| `datetime` | `datetime` | Note DEFAULT and ON UPDATE |
| `int` | `int` | Add `unsigned: true` if applicable |

### 3. DTOs Section

Define request/response shapes based on table schemas:

```yaml
dtos:
  - name: "MissionProgressRecordRequest"
    description: "Request to record progress on a mission assignment"
    source_spec_line: 615
    fields:
      metric_code:
        type: "string"
        required: true
        max_length: 64
        description: "Metric identifier (e.g., 'applications_submitted')"

      current_value:
        type: "number"
        required: true
        description: "Current value of the metric"

      target_value:
        type: "number"
        required: false
        default: 1.0
        description: "Target value to reach"

      meta_json:
        type: "object"
        required: false
        description: "Additional metadata"
```

**DTO Naming Convention:**
- Request: `{Aggregate}{Action}Request` (e.g., `MissionSubmitRequest`)
- Response: `{Aggregate}{Action}Response` (e.g., `MissionSubmitResponse`)
- Use aggregate name from table (drop table prefix): `mission_assignment` → `MissionAssignment`

### 4. Commands Section

Document each API operation using step-based workflow:

```yaml
commands:
  - name: "MissionProgress.Record"
    description: "Record or update progress on a mission metric"
    path: "/v1/missions/assignments/{assignment_id}/progress"
    method: "POST"
    idempotent: true
    permissions: ["missions:enroll", "missions:manage"]
    input: "MissionProgressRecordRequest"

    steps:
      # Step 1: Load assignment
      - kind: "read"
        table: "mission_assignment"
        where:
          id: "path.assignment_id"
        into: "assignment"

      # Step 2: Validate assignment exists
      - kind: "guard"
        expr: "assignment != null"
        error_code: "MISSION_ASSIGNMENT_NOT_FOUND"
        error_status: 404

      # Step 3: Validate assignment status
      - kind: "guard"
        expr: "assignment.status == 'assigned' || assignment.status == 'in_progress'"
        error_code: "MISSION_PROGRESS_NOT_ALLOWED"
        error_status: 409

      # Step 4: Upsert progress (idempotent by assignment_id + metric_code)
      - kind: "upsert"
        table: "mission_progress"
        unique_by: ["assignment_id", "metric_code"]
        values:
          assignment_id: "path.assignment_id"
          metric_code: "request.metric_code"
          current_value: "request.current_value"
          target_value: "request.target_value"
          status: "tracking"
          meta_json: "request.meta_json"

      # Step 5: Conditional update if first progress
      - kind: "when"
        condition: "assignment.status == 'assigned'"
        steps:
          - kind: "update"
            table: "mission_assignment"
            where:
              id: "path.assignment_id"
            values:
              status: "in_progress"
              started_at: "NOW()"

      # Step 6: Emit event
      - kind: "outbox_emit"
        event: "MISSION_PROGRESS_RECORDED"
        aggregate_type: "MISSION_ASSIGNMENT"
        aggregate_id: "path.assignment_id"
        payload:
          assignment_id: "path.assignment_id"
          metric_code: "request.metric_code"
          current_value: "request.current_value"

    response:
      status: 200
      body:
        assignment_id: "path.assignment_id"
        metric_code: "request.metric_code"
        current_value: "request.current_value"
        status: "tracking"
```

#### Step Types Reference

| Step Kind | Purpose | Maps to SQL |
|-----------|---------|-------------|
| `read` | Load data from table | `SELECT ... WHERE ...` |
| `guard` | Validation/assertion | `IF NOT condition THEN throw` |
| `insert` | Create new record | `INSERT INTO ... VALUES ...` |
| `upsert` | Idempotent create/update | `INSERT ... ON DUPLICATE KEY UPDATE` |
| `update` | Modify existing record | `UPDATE ... SET ... WHERE ...` |
| `when` | Conditional execution | `IF condition THEN ...` |
| `outbox_emit` | Publish event | Insert into outbox table |

#### When to Use UPSERT

Use `upsert` when the table has a **UNIQUE constraint** that makes the operation idempotent:

```yaml
# If DDL has:
UNIQUE KEY `uk_mprog_assignment_metric` (`assignment_id`,`metric_code`)

# Then use:
- kind: "upsert"
  table: "mission_progress"
  unique_by: ["assignment_id", "metric_code"]  # Match the UNIQUE KEY
```

**Common UPSERT patterns:**
- `mission_definition`: unique by `code`
- `mission_assignment`: unique by `mission_id` + `user_id`
- `mission_progress`: unique by `assignment_id` + `metric_code`
- `mission_reward_grant`: unique by `assignment_id`

### 5. Coverage Section

Document which commands touch which tables (for impact analysis):

```yaml
coverage:
  tables:
    mission_progress:
      touched_by:
        - "MissionProgress.Record"
        - "MissionProgress.Get"

    mission_assignment:
      touched_by:
        - "MissionAssignment.Assign"
        - "MissionProgress.Record"
        - "MissionSubmission.Submit"

  events:
    MISSION_PROGRESS_RECORDED:
      emitted_by:
        - "MissionProgress.Record"
```

---

## Validation Checklist

Before finalizing a pillar YAML spec, verify:

### Schema Section
- [ ] Every table from `{pillar}-DDL.md` is documented
- [ ] Every column matches DDL exactly (name, type, nullable, default)
- [ ] All UNIQUE constraints are documented
- [ ] All FOREIGN KEY relationships are noted
- [ ] All indexes are listed
- [ ] No fields exist in YAML that don't exist in DDL

### DTOs Section
- [ ] Field names match table columns (or are documented transformations)
- [ ] Validation rules match column constraints (max_length matches varchar length)
- [ ] Required fields match NOT NULL columns
- [ ] Defaults match DDL DEFAULT values

### Commands Section
- [ ] Every `read` step references real table + columns
- [ ] Every `insert`/`upsert`/`update` uses only fields from DDL
- [ ] `upsert` steps target actual UNIQUE constraints from DDL
- [ ] Guard expressions use fields that exist
- [ ] Paths follow REST conventions
- [ ] Response bodies only return fields that exist

### Data Type Mapping
- [ ] SQL `bigint` → TypeScript `number` (or `bigint` for very large values)
- [ ] SQL `varchar` → TypeScript `string`
- [ ] SQL `text` → TypeScript `string`
- [ ] SQL `json` → TypeScript `any` or specific interface
- [ ] SQL `decimal` → TypeScript `number`
- [ ] SQL `datetime` → TypeScript `Date`

---

## Common Patterns

### Pattern 1: Idempotent Create (UPSERT)

```yaml
# For tables with UNIQUE constraint on business key
- kind: "upsert"
  table: "mission_definition"
  unique_by: ["code"]  # Based on: UNIQUE KEY `uk_mdef_code` (`code`)
  values:
    code: "request.code"
    name: "request.name"
    status: "draft"
```

### Pattern 2: Status Transition with Guards

```yaml
# Load current state
- kind: "read"
  table: "mission_definition"
  where:
    id: "path.mission_definition_id"
  into: "definition"

# Guard: must exist
- kind: "guard"
  expr: "definition != null"
  error_code: "MISSION_DEFINITION_NOT_FOUND"
  error_status: 404

# Guard: valid state transition
- kind: "guard"
  expr: "definition.status == 'draft' || definition.status == 'paused'"
  error_code: "INVALID_STATUS_TRANSITION"
  error_status: 409

# Update status
- kind: "update"
  table: "mission_definition"
  where:
    id: "path.mission_definition_id"
  values:
    status: "published"
```

### Pattern 3: Audit Trail

```yaml
# After any state-changing operation, insert audit event
- kind: "insert"
  table: "mission_event"
  values:
    assignment_id: "path.assignment_id"
    event_type: "submitted"
    payload_json:
      submission_id: "last_insert_id()"
      user_id: "actor.user_id"
```

### Pattern 4: Conditional Logic

```yaml
# Only update if condition is met
- kind: "when"
  condition: "assignment.status == 'assigned'"
  steps:
    - kind: "update"
      table: "mission_assignment"
      where:
        id: "path.assignment_id"
      values:
        status: "in_progress"
        started_at: "NOW()"
```

---

## Expression Syntax

### Field References

| Syntax | Meaning | Example |
|--------|---------|---------|
| `request.{field}` | From request body | `request.metric_code` |
| `path.{param}` | From URL path | `path.assignment_id` |
| `{context}.{field}` | From loaded entity | `assignment.status` |
| `actor.{field}` | From authenticated user | `actor.user_id` |
| `last_insert_id()` | Last inserted ID | Used in audit/events |

### Guard Expressions

```yaml
# Equality
expr: "status == 'active'"

# Inequality
expr: "status != 'retired'"

# OR conditions
expr: "status == 'assigned' || status == 'in_progress'"

# AND conditions
expr: "status == 'published' && end_at > NOW()"

# Null checks
expr: "definition != null"

# Comparisons
expr: "current_value >= target_value"
```

---

## Generating Code from YAML

### Entity Generation

For each table in `schema.tables`, generate a TypeORM entity:

```typescript
// From YAML table: mission_progress
@Entity('mission_progress')
export class MissionProgress {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  assignment_id: number;

  @Column({ type: 'varchar', length: 64 })
  metric_code: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0.00 })
  current_value: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 1.00 })
  target_value: number;

  @Column({ type: 'varchar', length: 16, default: 'tracking' })
  status: string;

  @Column({ type: 'json', nullable: true })
  meta_json: any | null;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
```

### Repository Method Generation

For each `upsert` step, generate repository method:

```typescript
// From YAML: upsert on mission_progress
async upsert(
  data: Partial<MissionProgress>,
  queryRunner?: QueryRunner,
): Promise<number> {
  const manager = queryRunner ? queryRunner.manager : this.repo.manager;

  const query = `
    INSERT INTO mission_progress
      (assignment_id, metric_code, current_value, target_value, status, meta_json)
    VALUES
      (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      current_value = VALUES(current_value),
      target_value = VALUES(target_value),
      status = VALUES(status),
      meta_json = VALUES(meta_json),
      updated_at = NOW(),
      id = LAST_INSERT_ID(id)
  `;

  const result = await manager.query(query, [
    data.assignment_id,
    data.metric_code,
    data.current_value,
    data.target_value,
    data.status,
    data.meta_json ? JSON.stringify(data.meta_json) : null,
  ]);

  return result.insertId;
}
```

### Service Method Generation

For each command, generate service method implementing steps:

```typescript
// From YAML: MissionProgress.Record command
async recordProgress(
  assignment_id: number,
  request: MissionProgressRecordRequest,
  actor: Actor,
  idempotencyKey: string,
) {
  return this.txService.run(async (queryRunner) => {
    // Step: read assignment
    const assignment = await this.assignmentRepo.findById(assignment_id, queryRunner);

    // Step: guard - assignment exists
    if (!assignment) {
      throw new NotFoundException({
        code: 'MISSION_ASSIGNMENT_NOT_FOUND',
        message: `Assignment ${assignment_id} not found`,
      });
    }

    // Step: guard - valid status
    if (!['assigned', 'in_progress'].includes(assignment.status)) {
      throw new ConflictException({
        code: 'MISSION_PROGRESS_NOT_ALLOWED',
        message: `Cannot record progress for status: ${assignment.status}`,
      });
    }

    // Step: upsert progress
    await this.progressRepo.upsert({
      assignment_id,
      metric_code: request.metric_code,
      current_value: request.current_value,
      target_value: request.target_value || 1.0,
      status: 'tracking',
      meta_json: request.meta_json || null,
    }, queryRunner);

    // Step: when - conditional update
    if (assignment.status === 'assigned') {
      await this.assignmentRepo.update(assignment_id, {
        status: 'in_progress',
        started_at: new Date(),
      }, queryRunner);
    }

    // Step: outbox_emit
    await this.outboxService.enqueue({
      event_name: 'MISSION_PROGRESS_RECORDED',
      aggregate_type: 'MISSION_ASSIGNMENT',
      aggregate_id: String(assignment_id),
      actor_user_id: actor.actor_user_id,
      payload: {
        assignment_id,
        metric_code: request.metric_code,
        current_value: request.current_value,
      },
    }, queryRunner);

    return {
      assignment_id,
      metric_code: request.metric_code,
      current_value: request.current_value,
      status: 'tracking',
    };
  });
}
```

---

## Best Practices

### 1. **Always Start from DDL**
- Open `FULL-DDL.md`
- Copy table definitions
- Transform to YAML schema section
- Never invent fields

### 2. **Document Business Intent**
Add descriptions that explain WHY, not just WHAT:

```yaml
# Good
metric_code:
  type: "varchar"
  length: 64
  description: "Business metric identifier (e.g., 'applications_submitted', 'policies_activated')"

# Bad
metric_code:
  type: "varchar"
  length: 64
  description: "A code for the metric"
```

### 3. **Leverage UNIQUE Constraints**
Every UNIQUE constraint is an opportunity for idempotent UPSERT operations.

### 4. **Keep Commands Atomic**
Each command should do ONE business operation. Don't combine multiple operations.

### 5. **Use Consistent Naming**
- Tables: `snake_case`
- Entities: `PascalCase`
- DTOs: `PascalCase` + suffix
- Fields in DTO: `snake_case` (match DB) or `camelCase` (JS convention)
- Events: `UPPER_SNAKE_CASE`

---

## Future: Code Generator

Once all pillar YAMLs are created, build a generator:

```bash
npm run generate:pillar -- --spec=specs/mission/missions.pillar.v2.yml --output=src/plugins/missions
```

This will auto-generate:
- Entities
- Repositories (with UPSERT methods)
- DTOs
- Services (step-by-step workflow)
- Controllers (routes + validation)

**Benefits:**
- Consistency across all pillars
- Faster development (minutes vs hours)
- Single source of truth (YAML)
- Easy to update (change YAML, regenerate)

---

## Example: Full Pillar Structure

See `specs/mission/missions.pillar.v2.yml` for complete reference implementation.

---

## Maintenance

When database schema changes:
1. Update `FULL-DDL.md` first (source of truth)
2. Update pillar YAML to match
3. Regenerate code
4. Update tests

**Never skip step 1.** The database is always the source of truth.
