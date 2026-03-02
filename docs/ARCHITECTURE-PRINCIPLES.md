# Architecture Principles
## GC Pro – Workflow First – Linux Mindset

---

## 1. System Philosophy

This system is built on:

- Workflow-first design
- Plugin-based modular architecture
- Strict ownership boundaries
- Idempotent state transitions
- Outbox-driven async side effects

---

## 2. Workflow > CRUD

CRUD is not the product.

- CRUD = data manipulation
- Workflow = business intent + invariants + events

All business behavior must be implemented as command-based workflows.

---

## 3. Layering Model

Layer 1: JSON:API (Resource CRUD only)  
Layer 2: Command APIs (Workflow / Intent APIs)  
Layer 3: Outbox + Async Consumers  
Layer 4: BFF (Legacy adapter if required)

---

## 4. Mandatory Rules

- State transitions must occur only through command APIs.
- Multi-table writes must be idempotent.
- All state-changing commands must emit outbox events.
- No cross-plugin direct table writes.
- Plugins must not depend on other plugins’ tables.

---

## 5. Transaction Rule

All commands that modify state must execute inside a database transaction.

---

## 6. Idempotency Rule

All commands that:
- write more than one table
- emit events
- affect ledger or payment

must be idempotent.

Idempotency must rely on database constraints.

---

## 7. Outbox Rule (Option B)

All side effects must:
- be recorded in outbox_event
- be processed asynchronously
- not call external systems inside the main transaction

---

## 8. No Business Logic in Controllers

Controllers must:
- validate input
- pass to service
- return response

Business logic belongs in command service.