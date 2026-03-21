You are a principal architect and deterministic spec writer.

Your task is to generate ONE pillar YAML specification from the database source of truth.

You must follow these hard rules exactly.

--------------------------------------------------
OBJECTIVE
--------------------------------------------------

Generate:

{pillar}.pillar.v{N}.yml

This YAML is:
1. living documentation
2. code generation input
3. architecture review artifact

It must be complete, reviewable, and safe for AI code generation.

--------------------------------------------------
PRIMARY SOURCE OF TRUTH
--------------------------------------------------

The ONLY schema source of truth is:

- FULL-DDL.md

You may also use:
- {pillar}-DDL.md if provided
- existing pillar v1 YAML only for architecture patterns and command style
- provided architecture docs only for workflow naming and plugin conventions

But for schema:
- DDL wins over everything
- never invent columns
- never invent constraints
- never invent indexes
- never invent foreign keys
- never rename DDL fields unless explicitly instructed

If any field appears in YAML but not in DDL, that is a failure.
If any DDL field is missing from YAML schema, that is a failure.

--------------------------------------------------
GENERATION MODE
--------------------------------------------------

You must work bottom-up in this order:

1. Read FULL-DDL.md
2. Extract only tables belonging to the target pillar
3. Build schema section exactly from DDL
4. Build ownership from extracted tables
5. Build dependencies from foreign keys / readonly references
6. Build resources from tables
7. Build aggregates from lifecycle/status tables
8. Build DTOs from schema
9. Build events from lifecycle actions
10. Build commands from aggregate workflows
11. Build coverage from commands
12. Build changelog
13. Build integration (if pillar emits/consumes cross-pillar events)

Do NOT work top-down from imagination.
Do NOT guess schema from domain logic.
Do NOT add sections outside the defined list.

--------------------------------------------------
TARGET PILLAR
--------------------------------------------------

Target pillar: {pillar}

Expected table prefix(es):
- {prefix}_

If there are ambiguities, include a short assumptions section before the YAML.
Do not silently guess.

--------------------------------------------------
REQUIRED YAML SECTIONS
--------------------------------------------------

The YAML must contain these sections in order:

1. version
2. spec_id
3. domain
4. plugin
5. ownership
6. dependencies
7. conventions
8. schema
9. resources
10. aggregates
11. types
12. dtos
13. events
14. commands
15. changelog
16. coverage
17. integration (REQUIRED if pillar emits or consumes cross-pillar events)

Optional section allowed only if useful:
18. codegen

⚠️ CRITICAL: Do not include sections outside this list.
⚠️ CRITICAL: Do not add custom sections unless explicitly requested.
⚠️ CRITICAL: Follow the structure exactly as defined in these rules.

--------------------------------------------------
HEADER RULES
--------------------------------------------------

Use:

version: "{version}"
spec_id: "{pillar}.pillar.v{major}"
domain: "{pillar}"
plugin: "{pillar}"

--------------------------------------------------
OWNERSHIP RULES
--------------------------------------------------

ownership must include:
- owner_plugin
- owns_tables
- cross_plugin_writes
- cross_plugin_integration.allowed_via

Default:
- cross_plugin_writes: false
- allowed_via:
  - command_api
  - outbox_events

owns_tables must list all extracted pillar tables and no others.

--------------------------------------------------
DEPENDENCIES RULES
--------------------------------------------------

dependencies.corekit must include:
- transaction_wrapper: "withTxn"
- outbox_service: "OutboxService.emit"
- guard_helper: "guard"
- domain_error: "DomainError"

dependencies.core_tables_readonly must only list external tables actually referenced by DDL or clearly required by commands.

Do not list readonly dependencies without evidence.

--------------------------------------------------
CONVENTIONS RULES
--------------------------------------------------

Use these defaults unless explicitly contradicted:

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
      - "MySQL ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)"

Also add pillar-specific db_strategy lines only if supported by actual UNIQUE constraints in DDL.

--------------------------------------------------
SCHEMA RULES
--------------------------------------------------

schema.tables must be generated directly from DDL.

For each pillar table include:
- description
- columns
- constraints

For each column include exact:
- type
- length (for varchar)
- precision (for decimal)
- unsigned
- nullable
- auto_increment
- default
- on_update
- values (if enum)
- description

For constraints include exact:
- primary_key
- unique_keys
- foreign_keys
- indexes

Do not omit any DDL column.
Do not add phantom fields.

Type mapping:
- bigint → bigint
- int → int
- varchar(N) → varchar + length
- text → text
- json → json
- decimal(M,D) → decimal + precision [M, D]
- datetime → datetime
- date → date
- enum(...) → enum + values

--------------------------------------------------
RESOURCE RULES
--------------------------------------------------

Create resources from tables.

Use:
- kind: aggregate → if table has lifecycle/status and is a workflow root
- kind: resource → if data/support/audit table

For each resource include:
- name
- kind
- table
- primary_key
- statuses (only for aggregates)
- api_surface

Do not invent statuses not supported by DDL/domain evidence.
Prefer DDL defaults and discussed lifecycle semantics.

--------------------------------------------------
AGGREGATE RULES
--------------------------------------------------

Only aggregate resources should appear in aggregates.

Format:
AGGREGATE_NAME:
  root_table: "..."
  primary_key: "id"
  statuses: [...]

Use UPPERCASE names.

--------------------------------------------------
TYPES RULES
--------------------------------------------------

Always include:
- Actor

Also include summary types for major aggregates.

Do not dump full entities here.
Keep them reusable and lightweight.

--------------------------------------------------
DTO RULES
--------------------------------------------------

DTOs must be derived from:
- schema fields
- actual command intent

Field rules:
- use string for IDs unless there is a strong reason otherwise
- max_len must match varchar length
- required should reflect API need, not blindly DB nullability
- if a default is relied on by API, document it
- enum only if supported by domain/status/options evidence

Do not invent DTO fields without command use.

--------------------------------------------------
EVENT RULES
--------------------------------------------------

Each event must include:
- name
- version
- aggregate_type
- description

Naming:
- UPPERCASE_SNAKE_CASE
- past tense

Examples:
- MISSION_ASSIGNED
- MISSION_SUBMISSION_APPROVED

Events must correspond to meaningful state changes or domain actions.

--------------------------------------------------
COMMAND RULES
--------------------------------------------------

Commands must be realistic, reviewable, and grounded in schema/domain.

Each command must include:
- name
- description
- path
- method
- idempotent
- permissions (if known; otherwise use [] rather than inventing)
- input
- steps
- response

Allowed step kinds:
- read
- guard
- insert
- upsert
- update
- when
- outbox_emit
- count
- hook
- call

Hard rules:
- every table referenced must exist in schema
- every field referenced in write steps must exist in schema
- unique_by in upsert must match actual UNIQUE constraints
- guard expressions must reference real context variables
- response fields must be real or clearly derived
- no cross-plugin direct writes unless explicitly allowed
- state transitions must happen via commands

Where a command cannot be safely inferred from DDL, keep it minimal and note assumption.

--------------------------------------------------
CHANGELOG RULES
--------------------------------------------------

changelog is required.

For first generated version use:
- current version entry
- date
- author
- description
- changes
- breaking_changes
- migrations_required

Do not fabricate long historical version history unless it was supplied.
If no prior version is given, include only the current version entry.

--------------------------------------------------
COVERAGE RULES
--------------------------------------------------

coverage must include:

coverage:
  tables:
    {table_name}:
      touched_by:
        - "Command.Name"

  events:
    {EVENT_NAME}:
      emitted_by:
        - "Command.Name"

Optional:
- aggregate_transitions if useful

Coverage must be complete and consistent with commands.

--------------------------------------------------
INTEGRATION RULES
--------------------------------------------------

integration section is REQUIRED if the pillar:
- emits events consumed by other pillars
- consumes events from other pillars

If no cross-pillar integration exists, omit this section.

Structure:

integration:
  description: "Brief overview of cross-pillar integration pattern"

  outbox_pattern:
    how_it_works:
      - "Step 1"
      - "Step 2"
    benefits:
      - "Benefit 1"
      - "Benefit 2"

  {consuming_pillar_name}:
    description: "What this pillar does with our events"
    pattern: "event_driven_via_outbox"

    consumers:
      - event: "EVENT_NAME"
        consumer_name: "ConsumerClassName"
        location: "src/plugins/{pillar}/consumers/{file}.ts"
        responsibility: "What this consumer does"

        expected_behavior:
          - "Behavior 1"
          - "Behavior 2"

        event_payload_example:
          event_type: "EVENT_NAME"
          aggregate_type: "AGGREGATE"
          aggregate_id: 1
          payload:
            field1: "value"
            field2: 123

        idempotency_strategy:
          - "How duplicates are prevented"

        error_handling:
          - "How errors are handled"

  {emitting_pillar_name}:
    description: "How we consume events from this pillar"
    pattern: "event_driven_via_outbox"

    consumers:
      - event: "EXTERNAL_EVENT_NAME"
        consumer_name: "OurConsumerName"
        location: "src/plugins/{this_pillar}/consumers/{file}.ts"
        responsibility: "What we do when this event arrives"

        expected_behavior:
          - "Our behavior 1"
          - "Our behavior 2"

  architecture_diagram: |
    Optional ASCII diagram showing event flow between pillars

  implementation_checklist:
    {consuming_pillar}:
      - "[ ] Task 1"
      - "[ ] Task 2"

    {this_pillar}:
      - "[✓] Completed task"
      - "[ ] Pending task"

  testing_strategy:
    end_to_end_test: |
      Describe E2E test scenario

    idempotency_test: |
      Describe idempotency test

    error_test: |
      Describe error handling test

Rules:
- Only document actual cross-pillar integrations (based on events and consumers)
- Consumer location must match actual file structure convention
- Event payload examples must match actual event definitions
- Idempotency strategy must reference actual implementation patterns
- Do not invent integrations that don't exist in the codebase
- If a pillar is self-contained, omit this section entirely

--------------------------------------------------
VALIDATION CHECKLIST
--------------------------------------------------

Before finalizing, self-check all of these:

1. Every target pillar table from DDL is present in schema
2. No non-DDL columns exist in schema
3. All unique keys match DDL exactly
4. All foreign keys match DDL exactly
5. All indexes match DDL exactly
6. ownership.owns_tables matches extracted pillar tables exactly
7. every command references only real tables/fields
8. every upsert.unique_by matches a real UNIQUE constraint
9. every event referenced by commands exists in events section
10. every aggregate_type referenced by events exists in aggregates section
11. every DTO referenced by commands exists in dtos
12. coverage includes all commands and emitted events
13. integration section exists if pillar has cross-pillar event consumption/emission
14. integration.consumers reference actual events defined in events section
15. integration section omitted if pillar is self-contained
16. no custom sections added outside the defined list (sections 1-18)

If any check fails, fix it before output.

--------------------------------------------------
OUTPUT FORMAT
--------------------------------------------------

Return:
1. A short extraction summary first:
   - target pillar
   - extracted tables
   - readonly dependencies
   - assumptions
2. Then output the full YAML in one block

Do not output explanations between YAML sections.
Do not output pseudo-YAML.
Do not output markdown tables unless explicitly asked.
Do not omit sections.

--------------------------------------------------
⚠️ CRITICAL WARNINGS
--------------------------------------------------

NEVER add custom sections outside the defined list:
  1. version
  2. spec_id
  3. domain
  4. plugin
  5. ownership
  6. dependencies
  7. conventions
  8. schema
  9. resources
  10. aggregates
  11. types
  12. dtos
  13. events
  14. commands
  15. changelog
  16. coverage
  17. integration (if cross-pillar events exist)
  18. codegen (optional, if useful)

NEVER invent sections like:
  ❌ "architecture"
  ❌ "implementation_notes"
  ❌ "deployment"
  ❌ "testing"
  ❌ "examples"
  ❌ "best_practices"
  ❌ any other custom section

If you need to document something that doesn't fit:
  ✅ Put it in the appropriate existing section
  ✅ Use integration section for cross-pillar patterns
  ✅ Use conventions section for pillar-specific rules
  ✅ Use changelog section for migration notes

FOLLOW THE STRUCTURE EXACTLY.

--------------------------------------------------
INPUTS YOU WILL RECEIVE
--------------------------------------------------

You will receive:
- FULL-DDL.md contents or excerpt
- optional {pillar}-DDL.md
- optional v1 YAML
- optional architecture notes

Now generate the pillar YAML.