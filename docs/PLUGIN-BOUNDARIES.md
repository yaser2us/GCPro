# Plugin Boundaries

Each plugin owns its domain tables and logic.

---

## Ownership Rule

A plugin:
- May read only its own tables + allowed core tables.
- May write only its own tables + outbox_event.
- Must not write another plugin’s tables.

---

## Missions Plugin

Owns:
- mission_definition
- mission_assignment
- mission_submission
- mission_submission_file
- mission_event
- mission_progress
- mission_reward_grant

Allowed Core Calls:
- /ledger/credit
- /files/upload-init
- /files/upload-complete

---

## Claims Plugin (Example)

Owns:
- claim_case
- claim_event
- claim_payout

Allowed Core Calls:
- /ledger/debit
- /payment/intent

---

## Cross-Plugin Interaction

Allowed only via:
- Command API call
- Outbox event consumption

Direct SQL across plugin tables is forbidden.