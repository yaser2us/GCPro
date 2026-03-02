# Workflow Rules

---

## 1. Status Transitions

Status fields must:
- Never be modified via CRUD
- Only change via command API

Example:
mission_submission.status may change only through:
- submit_submission
- review_submission

---

## 2. Guard Rule

Before state change:
- Load current row
- Validate ownership
- Validate state
- Throw DomainError if invalid

---

## 3. Idempotent Write Pattern

Use DB constraints:

- UNIQUE(idempotency_key)
- UNIQUE(parent_id, metric_code)
- UNIQUE(assignment_id)

Use:
INSERT ... ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)

---

## 4. Outbox Requirement

All state changes must:
- Insert outbox_event inside the same transaction
- Emit event after successful commit

---

## 5. Command Structure

Every command must:

1. Begin transaction
2. Load required rows
3. Validate guards
4. Write domain changes
5. Emit outbox
6. Return response