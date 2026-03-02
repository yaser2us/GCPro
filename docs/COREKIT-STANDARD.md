Here you go — **one clean, production-ready Markdown** that defines your reusable abstraction layer for all pillars.

You can drop this directly into your repo as:

> `docs/COREKIT-STANDARD.md`

---

# COREKIT Standard (v1)

## Shared Infrastructure for All Pillars

### GC Pro • Linux Mindset • Workflow-First • Safe Delivery

---

## 0. Purpose

COREKIT defines the **shared infrastructure layer** used by all plugins (missions, claims, payments, referral, carer, etc.).

It standardizes:

* Transactions
* Domain errors
* Guards
* Idempotency patterns
* Outbox emission
* (Optional) Step runner for YAML codegen

It does **NOT** contain domain logic.

---

## 1. Linux Principles

1. Core provides primitives (syscalls).
2. Plugins implement domain behavior.
3. Core must not import plugin modules.
4. Plugins may import Core.
5. Workflows > CRUD.
6. Idempotency must be enforced via DB constraints.
7. Outbox emission must be atomic with writes.

---

## 2. Folder Structure

```
src/corekit/
  tx.ts
  errors.ts
  guard.ts
  outbox/
    outbox.service.ts
    outbox.types.ts
  idempotency/
    idem.util.ts
  steps/
    step.types.ts
    step.context.ts
    step.runner.ts
```

Plugins:

```
src/plugins/<plugin>/
  repo/
    <plugin>.sql.ts
    <plugin>.repo.ts
  commands/
    <plugin>-commands.service.ts
    <plugin>-commands.controller.ts
  custom/
    hooks.ts
    policies.ts
```

---

## 3. Transactions (Standard)

### Rule:

Every workflow command runs inside a transaction.

### Implementation

```ts
// src/corekit/tx.ts
import { DataSource, EntityManager } from 'typeorm';

export async function withTxn<T>(
  ds: DataSource,
  fn: (em: EntityManager) => Promise<T>,
): Promise<T> {
  return ds.transaction(async (em) => fn(em));
}
```

Usage:

```ts
return withTxn(this.ds, async (em) => {
  // workflow steps
});
```

---

## 4. Domain Errors

### Rule:

All workflow failures throw DomainError.

```ts
// src/corekit/errors.ts
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    public readonly details?: Record<string, any>,
  ) {
    super(code);
  }
}
```

---

## 5. Guard Helper

```ts
// src/corekit/guard.ts
import { DomainError } from './errors';

export function guard(
  condition: any,
  error: DomainError,
): asserts condition {
  if (!condition) throw error;
}
```

Usage:

```ts
guard(row, new DomainError('ASSIGNMENT_NOT_FOUND', 404));
guard(row.user_id === actor.user_id, new DomainError('FORBIDDEN', 403));
```

---

## 6. Outbox Standard

### Rule:

All state-changing commands must emit outbox events.

### Event Envelope

```ts
// src/corekit/outbox/outbox.types.ts
export type OutboxEvent = {
  type: string;
  aggregate: { type: string; id: string };
  actor_user_id: string | null;
  data: Record<string, any>;
  idempotency_key?: string | null;
};
```

### Outbox Service

```ts
// src/corekit/outbox/outbox.service.ts
import { EntityManager } from 'typeorm';
import { OutboxEvent } from './outbox.types';

export class OutboxService {
  constructor(private readonly tableName = 'outbox_event') {}

  async emit(em: EntityManager, e: OutboxEvent): Promise<void> {
    await em.query(
      `INSERT INTO ${this.tableName}
        (event_type, aggregate_type, aggregate_id, actor_user_id, payload_json, idempotency_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        e.type,
        e.aggregate.type,
        e.aggregate.id,
        e.actor_user_id,
        JSON.stringify({
          type: e.type,
          aggregate: e.aggregate,
          actor_user_id: e.actor_user_id,
          data: e.data,
        }),
        e.idempotency_key ?? null,
      ],
    );
  }
}
```

---

## 7. Idempotency Strategy (v1)

### Preferred Method: Database Constraints

Use UNIQUE keys to guarantee exactly-once behavior.

Examples:

* `UNIQUE(idempotency_key)` on event tables
* `UNIQUE(assignment_id, metric_code)` on progress tables
* `UNIQUE(assignment_id)` on reward tables

Use MySQL pattern:

```sql
INSERT INTO table (...)
VALUES (...)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
```

Then fetch:

```sql
SELECT LAST_INSERT_ID();
```

This guarantees:

* Safe retries
* No race conditions
* Exactly-once semantics

---

## 8. SQL Catalog Pattern

Each plugin must define SQL in one file:

```ts
// src/plugins/missions/repo/missions.sql.ts
export const MissionsSQL = {
  selectAssignmentById: `
    SELECT id, user_id, status
    FROM mission_assignment
    WHERE id = ?
    LIMIT 1
  `,
};
```

Rules:

* No inline SQL in controllers.
* Always parameterized.
* One statement per function.
* Reviewed once.

---

## 9. Repository Pattern

```ts
// src/plugins/missions/repo/missions.repo.ts
import { EntityManager } from 'typeorm';
import { MissionsSQL } from './missions.sql';

export class MissionsRepo {
  async getAssignmentById(em: EntityManager, id: string) {
    const rows = await em.query(MissionsSQL.selectAssignmentById, [id]);
    return rows?.[0] ?? null;
  }
}
```

Repository responsibilities:

* Execute SQL
* Return typed rows
* No business logic

---

## 10. Workflow Service Standard

Every command must follow this structure:

```ts
return withTxn(this.ds, async (em) => {
  const row = await repo.loadSomething(em, input.id);
  guard(row, new DomainError('NOT_FOUND', 404));

  guard(row.status !== 'completed',
        new DomainError('ALREADY_COMPLETED', 409));

  await repo.writeSomethingIdempotent(em, {...});

  await outbox.emit(em, {...});

  return result;
});
```

Controllers must be thin.

---

## 11. Optional: Step Runner (For YAML Codegen)

Purpose:

* YAML generates `steps[]`
* Runner executes reusable step types
* Reduces boilerplate 60–80%

### Step Types

```ts
export type Step =
  | { kind: 'read'; table: string; where: Record<string, any>; into: string }
  | { kind: 'insert'; table: string; values: Record<string, any> }
  | { kind: 'update'; table: string; where: Record<string, any>; values: Record<string, any> }
  | { kind: 'upsert'; table: string; unique_by: string[]; values: Record<string, any> }
  | { kind: 'count'; table: string; where: Record<string, any>; into: string }
  | { kind: 'outbox_emit'; ... };
```

Important:

* Guards must be compiled at codegen time (no runtime eval).
* Runner must not know business rules.
* Runner only handles generic DB operations.

---

## 12. Plugin Responsibilities

Plugins must:

* Define SQL
* Define repository
* Define domain guards
* Define hook functions
* Use COREKIT utilities

Plugins must NOT:

* Reimplement transactions
* Reimplement outbox
* Reimplement error system
* Write SQL in controllers

---

## 13. Definition of Done

COREKIT v1 is complete when:

* All commands use `withTxn`
* All guards use `DomainError`
* All state changes emit outbox events
* SQL is centralized
* Idempotency uses DB constraints
* Controllers contain zero business logic

---

## 14. Long-Term Evolution

Future versions may add:

* Idempotency replay table
* Metrics instrumentation wrapper
* Audit trail integration
* Policy engine abstraction
* Runtime workflow engine (optional)

---

# Final Philosophy

COREKIT is your **kernel**.

Plugins are your **modules**.

YAML is your **spec layer**.

Generated code is your **binary**.

Workflows are your **product**.