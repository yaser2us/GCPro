## GC Pro – Database Architecture Constitution (v1)

---

# 1. Purpose

This document defines **rules for how database tables must be designed**.

It is not the schema itself.
It is the architectural contract that all DDL must follow.

AI agents, developers, and reviewers must validate new tables against this standard.

---

# 2. Global Principles

## 2.1 Plugin Ownership Model

Each table belongs to exactly one plugin.

Naming rule:

```
<plugin>_<entity>
```

Examples:

* mission_assignment
* claim_case
* payment_intent
* referral_chain

No table may be shared between plugins.

Cross-plugin interaction must happen via:

* Command APIs
* Outbox events

Never via direct cross-table writes.

---

# 3. Required Base Columns

All domain tables must include:

```sql
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY
created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

Reason:

* Auditing
* Deterministic ordering
* Consistent ORM behavior

---

# 4. Event Table Standard

All event tables must follow:

Table naming:

```
<plugin>_event
```

Required columns:

```sql
id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT
<parent>_id BIGINT UNSIGNED NOT NULL
event_type VARCHAR(64) NOT NULL
payload_json JSON NULL
idempotency_key VARCHAR(128) NULL
created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
```

Required constraint:

```sql
UNIQUE KEY uk_<plugin>_event_idem (idempotency_key)
```

Why:

* Exactly-once processing
* Safe retries
* Deterministic behavior

---

# 5. Idempotency Rules

All tables participating in retryable workflows must support idempotency via database constraint.

Allowed patterns:

### Pattern A – UNIQUE idempotency key

```sql
UNIQUE KEY uk_idem (idempotency_key)
```

### Pattern B – Unique parent constraint

Example:

```sql
UNIQUE KEY uk_reward_once (assignment_id)
```

Used for:

* reward grants
* payouts
* finalization records

---

# 6. Progress Table Standard

Progress tables must follow:

```
<plugin>_progress
```

Required constraint:

```sql
UNIQUE KEY uk_progress (parent_id, metric_code)
```

Why:

* Prevent duplicate metric accumulation
* Allow idempotent upsert

---

# 7. Status Column Rules

Status columns must:

* Be NOT NULL
* Use VARCHAR(32) or ENUM
* Be indexed

Example:

```sql
status VARCHAR(32) NOT NULL DEFAULT 'draft'
INDEX idx_status (status)
```

Status transitions must only occur through workflow commands.

Never allow:

* PATCH /jsonapi/... status update

---

# 8. Foreign Key Policy (Linux Mode)

By default:

* Avoid foreign key constraints between plugins.
* Enforce referential integrity at service layer.

Within a plugin:

* FK allowed but optional.
* Use FK only if strong integrity required.

Reason:

* Plugin isolation
* Easier migration
* Reduced lock contention

---

# 9. Outbox Table Standard (Global)

Single global table:

```sql
outbox_event (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  aggregate_type VARCHAR(64) NOT NULL,
  aggregate_id BIGINT UNSIGNED NOT NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  payload_json JSON NOT NULL,
  idempotency_key VARCHAR(128) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at)
)
```

Rules:

* Must be written inside same transaction as domain changes.
* No external API calls inside main transaction.
* Consumers process asynchronously.

---

# 10. Indexing Rules

Mandatory indexes:

* All *_id columns
* All status columns
* All foreign reference columns
* All event_type columns
* created_at on event tables

Reason:

* Prevent full table scans
* Stable performance under growth

---

# 11. Soft Delete Policy

Soft delete must be explicit.

If enabled:

```sql
deleted_at DATETIME NULL
INDEX idx_deleted_at (deleted_at)
```

If not required:

* Do not add deleted_at blindly.

---

# 12. Monetary / Ledger Rules

Never:

* Update balance columns directly.

Always:

* Insert ledger entries.
* Balance derived from aggregation.

Tables storing reward grants must:

* Not store running balance.
* Only store event of grant.

---

# 13. JSON Usage Rules

JSON columns allowed only for:

* payload_json
* metadata
* extensibility fields

Must not use JSON for:

* core relational logic
* join keys
* status

---

# 14. Migration Rules

All schema changes must:

* Be backward compatible
* Add columns nullable first
* Populate
* Then enforce NOT NULL

No destructive changes without migration plan.

---

# 15. Determinism Rule

DDL must be:

* Explicit
* No implicit defaults
* No hidden cascade rules

Every constraint must be intentional.

---

# 16. Review Checklist (AI + Human)

Before merging new table:

* Does it follow naming convention?
* Does it include base columns?
* Does it support idempotency if needed?
* Does it violate plugin boundary?
* Does it index status?
* Does it emit outbox events properly?

If any answer is no → reject PR.

---

# 17. Philosophy Summary

Database is not just storage.

It is:

* Concurrency control layer
* Idempotency enforcement layer
* State machine guardrail
* Deterministic execution engine

Good schema prevents bugs before code runs.

---

# Status

DATABASE-STANDARD.md v1
Aligned with:

* Linux plugin isolation
* Option B outbox
* Idempotent workflow design
* MySQL InnoDB

---

🔥 Now your architecture pack is complete:

* Architecture Principles
* Plugin Boundaries
* Workflow Rules
* Event Catalog
* Codegen Spec
* Database Standard
* Corekit Standard