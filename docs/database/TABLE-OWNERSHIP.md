# TABLE-OWNERSHIP.md

> Source tables list: see `FULL-DDL.md` 
> Goal: make ownership *crystal clear* so (1) CRUD services don’t become the product, (2) workflows/use-cases stay clean, (3) changes are governed.

---

## 1) Ownership rules (how we decide who owns a table)

### 1.1 Primary owner

A table is owned by the pillar that:

* Defines the **business meaning** of the record
* Defines the **state machine / lifecycle** (status transitions)
* Owns the **invariants** (unique rules, idempotency rules, constraints)

### 1.2 Shared tables (Foundation / Platform)

Some tables are “platform primitives” used everywhere:

* **Audit + outbox + resource_ref** are cross-cutting.
* They have one platform owner, but every pillar must follow the contract.

### 1.3 “Referenced ≠ Owned”

If table A has FK to table B, A does **not** own B.
Ownership stays with who defines the lifecycle and rules.

---

## 2) Pillar owners (names you can change later)

| Pillar        | Owner (team/service)     | What they guarantee                                        |
| ------------- | ------------------------ | ---------------------------------------------------------- |
| FOUNDATION    | Platform / Core Platform | audit/outbox/resource_ref contracts, schema standards      |
| IDENTITY      | Identity Service         | user/person/account identity + mapping rules               |
| IAM           | AuthZ Service            | role/permission/user_role/user_permission semantics        |
| FILES         | File Service             | uploads, versions, tokens, scanning, linking               |
| GUIDELINES    | Compliance Service       | documents, versions, acceptance log                        |
| POLICY        | Policy Service           | policy lifecycle, packages, pricing, billing, entitlements |
| CLAIMS        | Claims Service           | claim lifecycle, review/events/docs/fraud                  |
| CROWD         | CrowdShare Service       | period calculation, membership, charges, payouts, runs     |
| WALLET+LEDGER | Ledger Service           | ledger truth + wallet operational constraints              |
| PAYMENTS      | Payment Orchestrator     | intents, attempts, methods, reconciliation                 |
| MISSIONS      | Missions Service         | missions assignment/progress/rewards/submissions           |
| NOTIFICATIONS | Notification Service     | preferences, templates, messages, schedules, attempts      |
| COMMISSION    | Commission Service       | programs, rules, accrual, payout batches/items             |
| MEDICAL       | Medical Service          | providers, cases, GL, underwriting cases/outcomes          |
| SURVEY        | Survey Service           | survey catalog + versions (schema/logic)                   |
| GEO           | Geo Service              | geo_state reference data                                   |

---

## 3) Table ownership matrix

### 3.1 FOUNDATION (Platform-owned)

| Table                  | Owner      | Notes                                                |
| ---------------------- | ---------- | ---------------------------------------------------- |
| `audit_log`            | FOUNDATION | Immutable audit trail (who/what/when)                |
| `outbox_event`         | FOUNDATION | Event publishing contract (topic/status/idempotency) |
| `outbox_event_consume` | FOUNDATION | Consumer checkpointing + retry/lock pattern          |
| `resource_ref`         | FOUNDATION | Cross-pillar “safe reference” pointer (type/id/uuid) |

---

### 3.2 IDENTITY (User/Person/Account)

| Table                 | Owner    | Notes                                              |
| --------------------- | -------- | -------------------------------------------------- |
| `user`                | IDENTITY | Login identity (phone/email/status)                |
| `user_credential`     | IDENTITY | Credential material refs/hashes                    |
| `person`              | IDENTITY | Human profile (type, dob, etc.)                    |
| `person_identity`     | IDENTITY | National ID / passport etc.                        |
| `person_relationship` | IDENTITY | Family/relationship graph                          |
| `account`             | IDENTITY | Account container (status/type)                    |
| `account_person`      | IDENTITY | Who belongs to which account + role                |
| `address`             | IDENTITY | Polymorphic address book (`owner_type`,`owner_id`) |
| `device_token`        | IDENTITY | Device push tokens / last seen                     |
| `registration_token`  | IDENTITY | OTP/invite tokens for onboarding                   |
| `verification_status` | IDENTITY | “KYC-ish” verification state per account/type      |

---

### 3.3 IAM (Authorization)

| Table             | Owner | Notes                         |
| ----------------- | ----- | ----------------------------- |
| `role`            | IAM   | Role catalog                  |
| `permission`      | IAM   | Permission catalog (codes)    |
| `role_permission` | IAM   | Role → permission mapping     |
| `user_role`       | IAM   | User → role assignment        |
| `user_permission` | IAM   | Direct grants/denies (effect) |

---

### 3.4 FILES (Uploads, access, scanning, linking)

| Table               | Owner | Notes                                        |
| ------------------- | ----- | -------------------------------------------- |
| `file_upload`       | FILES | Canonical file record + metadata             |
| `file_version`      | FILES | Versioning + checksum                        |
| `file_event`        | FILES | File lifecycle events                        |
| `file_access_token` | FILES | Download/share tokens + expiry               |
| `file_scan_result`  | FILES | AV/validation scan results                   |
| `file_tag`          | FILES | Tag dictionary                               |
| `file_upload_tag`   | FILES | Many-to-many tagging                         |
| `file_link`         | FILES | Attach file to any target (`target_type/id`) |

---

### 3.5 GUIDELINES (Compliance docs + acceptance)

| Table                  | Owner      | Notes                                  |
| ---------------------- | ---------- | -------------------------------------- |
| `guideline_document`   | GUIDELINES | Document catalog                       |
| `guideline_version`    | GUIDELINES | Versioned content + effective window   |
| `guideline_acceptance` | GUIDELINES | Immutable acceptance log + idempotency |

---

### 3.6 GEO (Reference data)

| Table       | Owner | Notes                   |
| ----------- | ----- | ----------------------- |
| `geo_state` | GEO   | Country/state reference |

---

### 3.7 POLICY (Product, pricing, entitlements, billing)

| Table                        | Owner  | Notes                               |
| ---------------------------- | ------ | ----------------------------------- |
| `policy`                     | POLICY | Core policy lifecycle               |
| `policy_package`             | POLICY | Package catalog                     |
| `age_band`                   | POLICY | Pricing input                       |
| `smoker_profile`             | POLICY | Pricing input                       |
| `policy_package_rate`        | POLICY | Rate table (versioned/effective)    |
| `policy_member`              | POLICY | Members on policy (role/status)     |
| `policy_deposit_requirement` | POLICY | Deposit thresholds + wallet linkage |
| `policy_billing_plan`        | POLICY | Billing plan                        |
| `policy_installment`         | POLICY | Installments + idempotency          |
| `policy_status_event`        | POLICY | Policy state transitions            |
| `policy_remediation_case`    | POLICY | Grace/remediation workflow          |
| `discount_program`           | POLICY | Discount catalog + rule json        |
| `policy_discount_applied`    | POLICY | Application log                     |
| `benefit_catalog`            | POLICY | Benefit catalog header              |
| `benefit_level`              | POLICY | Benefit levels                      |
| `benefit_catalog_item`       | POLICY | Benefit items                       |
| `policy_benefit_entitlement` | POLICY | Snapshot entitlement json           |
| `policy_benefit_usage`       | POLICY | Usage counters (per period/item)    |
| `policy_benefit_usage_event` | POLICY | Usage deltas + idempotency          |

---

### 3.8 CLAIMS (Claims lifecycle)

| Table                   | Owner  | Notes                          |
| ----------------------- | ------ | ------------------------------ |
| `claim`                 | CLAIMS | Claim lifecycle + uniqueness   |
| `claim_number_sequence` | CLAIMS | Claim numbering                |
| `claim_event`           | CLAIMS | State transitions + notes      |
| `claim_review`          | CLAIMS | Reviewer decisions             |
| `claim_document`        | CLAIMS | Claim ↔ file association       |
| `claim_fraud_signal`    | CLAIMS | Signals & scoring              |
| `claim_link`            | CLAIMS | Link duplicates/related claims |
| `claim_settlement_flag` | CLAIMS | Period eligibility flagging    |

---

### 3.9 CROWD (CrowdShare period engine)

| Table                   | Owner | Notes                            |
| ----------------------- | ----- | -------------------------------- |
| `crowd_period`          | CROWD | Period aggregate + totals/status |
| `crowd_package_bucket`  | CROWD | Period x package breakdown       |
| `crowd_period_member`   | CROWD | Members included per period      |
| `crowd_period_claim`    | CROWD | Claims included per period       |
| `crowd_member_charge`   | CROWD | Charges per member per period    |
| `crowd_claim_payout`    | CROWD | Payouts per claim per period     |
| `crowd_period_event`    | CROWD | Period events                    |
| `crowd_period_run`      | CROWD | Run execution tracking           |
| `crowd_period_run_lock` | CROWD | Distributed lock + heartbeat     |

---

### 3.10 WALLET + LEDGER (Money truth)

| Table                       | Owner         | Notes                                      |
| --------------------------- | ------------- | ------------------------------------------ |
| `wallet`                    | WALLET+LEDGER | Wallet container per account/currency/type |
| `wallet_balance_snapshot`   | WALLET+LEDGER | Cached balances (derived)                  |
| `ledger_txn`                | WALLET+LEDGER | Ledger transaction (source of truth)       |
| `ledger_entry`              | WALLET+LEDGER | Double-entry lines                         |
| `wallet_hold`               | WALLET+LEDGER | Holds/escrow (idempotent)                  |
| `wallet_policy_gate`        | WALLET+LEDGER | Allow/deny gates                           |
| `wallet_rule_set`           | WALLET+LEDGER | Rule versioning                            |
| `wallet_threshold_rule`     | WALLET+LEDGER | Threshold config                           |
| `wallet_threshold_event`    | WALLET+LEDGER | Threshold breach events                    |
| `wallet_deposit_intent`     | WALLET+LEDGER | Deposit intent (internal)                  |
| `wallet_spend_intent`       | WALLET+LEDGER | Spend intent (internal)                    |
| `wallet_withdrawal_request` | WALLET+LEDGER | Withdrawal workflow                        |
| `wallet_batch`              | WALLET+LEDGER | Batch orchestration                        |
| `wallet_batch_item`         | WALLET+LEDGER | Batch items                                |

---

### 3.11 PAYMENTS (Orchestrator)

| Table             | Owner    | Notes                                       |
| ----------------- | -------- | ------------------------------------------- |
| `payment_method`  | PAYMENTS | Saved methods (provider refs)               |
| `payment_intent`  | PAYMENTS | Intent lifecycle (status, ref, idempotency) |
| `payment_attempt` | PAYMENTS | Attempts per intent (gateway state machine) |

> `receipt` usually belongs to **WALLET+LEDGER** *or* **PAYMENTS** depending on your stance:
>
> * If receipt is “financial artifact after ledger posting” → WALLET+LEDGER owns it.
> * If receipt is “payment artifact after payment success” → PAYMENTS owns it.
>   Your schema shows it can reference both `payment_intent` and `ledger_txn`, so treat it as **FINANCE ARTIFACT** (recommended owner: WALLET+LEDGER for governance).

| Table     | Owner         | Notes                              |
| --------- | ------------- | ---------------------------------- |
| `receipt` | WALLET+LEDGER | Receipt issuance/voiding lifecycle |

---

### 3.12 NOTIFICATIONS

| Table                           | Owner         | Notes                     |
| ------------------------------- | ------------- | ------------------------- |
| `notification_preference`       | NOTIFICATIONS | Preference header         |
| `notification_channel_pref`     | NOTIFICATIONS | Channel-specific settings |
| `notification_template`         | NOTIFICATIONS | Template catalog          |
| `notification_message`          | NOTIFICATIONS | Message queue/outbox-like |
| `notification_schedule`         | NOTIFICATIONS | Delays/steps              |
| `notification_delivery_attempt` | NOTIFICATIONS | Provider attempts         |

---

### 3.13 COMMISSION

| Table                            | Owner      | Notes                           |
| -------------------------------- | ---------- | ------------------------------- |
| `commission_program`             | COMMISSION | Program definition              |
| `commission_rule`                | COMMISSION | Rule definitions                |
| `commission_participant`         | COMMISSION | Who earns + payout config       |
| `commission_accrual`             | COMMISSION | Earned commissions (idempotent) |
| `commission_payout_batch`        | COMMISSION | Payout cycle                    |
| `commission_payout_item`         | COMMISSION | Participant payout items        |
| `commission_payout_item_accrual` | COMMISSION | Linking accruals to payout      |

---

### 3.14 REFERRAL (often part of COMMISSION/GROWTH)

| Table              | Owner      | Notes                   |
| ------------------ | ---------- | ----------------------- |
| `referral_program` | COMMISSION | Growth/Referral program |
| `referral_rule`    | COMMISSION | Eligibility/logic rules |
| `referral_code`    | COMMISSION | User’s referral codes   |
| `referral_invite`  | COMMISSION | Invite tracking         |

---

### 3.15 MISSIONS

| Table                     | Owner    | Notes                                  |
| ------------------------- | -------- | -------------------------------------- |
| `mission_definition`      | MISSIONS | Mission catalog + criteria/reward json |
| `mission_assignment`      | MISSIONS | Per-user mission instance              |
| `mission_progress`        | MISSIONS | Metric tracking                        |
| `mission_event`           | MISSIONS | Progress events (idempotent)           |
| `mission_submission`      | MISSIONS | User submission + review               |
| `mission_submission_file` | MISSIONS | Submission ↔ file                      |
| `mission_reward_grant`    | MISSIONS | Reward issuance (idempotent)           |

---

### 3.16 SURVEY

| Table            | Owner  | Notes                  |
| ---------------- | ------ | ---------------------- |
| `survey`         | SURVEY | Survey catalog         |
| `survey_version` | SURVEY | Versioned schema/logic |

---

### 3.17 MEDICAL

| Table                          | Owner   | Notes                             |
| ------------------------------ | ------- | --------------------------------- |
| `medical_provider`             | MEDICAL | Provider/hospital registry        |
| `medical_case`                 | MEDICAL | Case lifecycle                    |
| `medical_case_event`           | MEDICAL | Case events                       |
| `guarantee_letter`             | MEDICAL | GL issuance lifecycle             |
| `medical_underwriting_case`    | MEDICAL | Underwriting case                 |
| `medical_underwriting_outcome` | MEDICAL | Decisions versioned               |
| `medical_underwriting_term`    | MEDICAL | Terms per outcome                 |
| `medical_underwriting_current` | MEDICAL | Current pointer (subject/context) |

---

## 4) “Read vs Write” contract (super important for your workflow engine)

For each pillar:

* **Only owner can WRITE** (create/update/delete) tables in that pillar.
* Other pillars can:

  * **READ via API** (preferred)
  * Or **read replica/query model** (if you later add CQRS/materialized views)
  * Or **subscribe to outbox events** and maintain local projections

This keeps your YAML-usecase engine clean: steps call APIs, not random DB writes.

---

## 5) Minimum governance metadata (add these headers per table)

Add as comments in migrations or as a registry (YAML/JSON):

* `owner_pillar`
* `data_classification` (PII / Financial / Operational / Reference)
* `system_of_record` (yes/no)
* `retention_policy` (days/years)
* `audit_required` (yes/no)
* `event_topic` (if changes publish outbox event)

---
