# Event Catalog

All domain events must be registered here.

---

## Missions Events

MISSION_ASSIGNED
Aggregate: mission_assignment

MISSION_STARTED
Aggregate: mission_assignment

MISSION_EVENT_RECORDED
Aggregate: mission_assignment

MISSION_SUBMISSION_SUBMITTED
Aggregate: mission_submission

MISSION_SUBMISSION_REVIEWED
Aggregate: mission_submission

MISSION_COMPLETED
Aggregate: mission_assignment

MISSION_REWARD_GRANTED
Aggregate: mission_reward_grant

---

## Event Rules

- Event type must be UPPER_SNAKE_CASE
- Must include aggregate_type + aggregate_id
- Must include actor_user_id (nullable)
- Must include payload_json
- Must be emitted via COREKIT OutboxService