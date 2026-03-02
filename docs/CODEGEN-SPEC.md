# YAML Codegen Specification (v1)

---

## Purpose

YAML files define business workflows.
Generated code must be deterministic.

---

## YAML Location

flows/<plugin>/experience.yml

---

## Required Sections

- version
- domain
- ownership
- events
- commands

---

## Command Structure

Each command must define:

- name
- path
- method
- idempotent
- input
- steps
- response

---

## Allowed Step Types

- read
- insert
- update
- upsert
- count
- guard
- outbox_emit
- when
- hook
- call

---

## Codegen Output

For each command generate:

- DTO
- Controller route
- Service method
- Tests
- OpenAPI entry
- SDK function

---

## Determinism Rule

Generated files:
- Must not be manually edited.
- Must be overwritten safely.
- Must follow naming convention.

---

## Guard Compilation

Guard expressions must be compiled to TypeScript.
No runtime string eval allowed.

---

## Ownership Validation

Generator must reject YAML that:
- writes table outside plugin ownership
- emits undefined event type
- skips idempotent flag for multi-table writes