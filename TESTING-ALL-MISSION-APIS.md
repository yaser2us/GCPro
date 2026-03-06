# Testing All Mission APIs - Complete Guide

## 📋 Overview

This guide covers testing ALL 5 Mission APIs implemented from `specs/mission/mission.pillar.yml`:

1. ✅ **MissionDefinition.Create** - Create a new mission
2. ✅ **MissionDefinition.Publish** - Publish a draft mission
3. ✅ **Mission.Assign** - Assign a user to a mission
4. ✅ **Mission.Submit** - User submits proof of completion
5. ✅ **Mission.ApproveSubmission** - Reviewer approves submission

---

## 🚀 Setup

### Step 1: Database Setup

```bash
# Create tables
mysql -u root -pOdenza@2026 < database/setup-database.sql

# Insert test data
mysql -u root -pOdenza@2026 < database/test-data-all-apis.sql
```

### Step 2: Start Server

```bash
npm run start:dev
```

Wait for: `[Nest] Application successfully started`

---

## 🎯 API Tests

### API 1: MissionDefinition.Create

**Purpose**: Create a new mission in DRAFT status

**Endpoint**: `POST /v1/missions/definitions`

**Permissions**: `missions:admin` OR `missions:manage`

**Test Command**:
```bash
curl -X POST http://localhost:3000/v1/missions/definitions \
  -H "Content-Type: application/json" \
  -H "X-User-Id: admin-123" \
  -H "X-User-Role: ADMIN" \
  -H "Idempotency-Key: create-test-1" \
  -d '{
    "code": "POLICY_APP_5X",
    "title": "Complete 5 Policy Applications",
    "description": "Submit and get approved for 5 policy applications to earn rewards",
    "cadence": "one_time",
    "starts_at": null,
    "ends_at": null,
    "max_per_user": 1,
    "reward_json": {
      "reward_type": "FIXED",
      "amount": 50,
      "currency": "MYR"
    }
  }'
```

**Expected Response**:
```json
{
  "id": 1,
  "status": "draft"
}
```

**Verify in Database**:
```sql
SELECT id, code, name, status FROM mission_definition WHERE code = 'POLICY_APP_5X';
-- status should be 'draft'

SELECT * FROM outbox_event WHERE event_type = 'MISSION_DEFINITION_CREATED' ORDER BY created_at DESC LIMIT 1;
-- Should see the event
```

**Error Cases to Test**:

1. **Duplicate Code**:
```bash
# Run same curl command twice
# Second call should fail with unique constraint error
```

2. **Invalid Time Range**:
```bash
curl -X POST http://localhost:3000/v1/missions/definitions \
  -H "Content-Type: application/json" \
  -H "X-User-Id: admin-123" \
  -H "X-User-Role: ADMIN" \
  -H "Idempotency-Key: create-test-bad-time" \
  -d '{
    "code": "TEST_BAD_TIME",
    "title": "Test Mission",
    "cadence": "one_time",
    "starts_at": "2024-12-31T00:00:00Z",
    "ends_at": "2024-01-01T00:00:00Z"
  }'
# Should fail with INVALID_TIME_RANGE
```

---

### API 2: MissionDefinition.Publish

**Purpose**: Publish a draft mission to make it available for enrollment

**Endpoint**: `POST /v1/missions/definitions/{id}/publish`

**Permissions**: `missions:admin` OR `missions:manage`

**Get Test Mission ID**:
```sql
SELECT id FROM mission_definition WHERE code = 'PUBLISH_TEST_1';
-- Use this ID in the curl command below
```

**Test Command**:
```bash
curl -X POST http://localhost:3000/v1/missions/definitions/1/publish \
  -H "Content-Type: application/json" \
  -H "X-User-Id: admin-123" \
  -H "X-User-Role: ADMIN" \
  -H "Idempotency-Key: publish-test-1" \
  -d '{}'
```

**Expected Response**:
```json
{
  "id": 1,
  "status": "published"
}
```

**Verify in Database**:
```sql
SELECT id, code, status FROM mission_definition WHERE code = 'PUBLISH_TEST_1';
-- status should be 'published'

SELECT * FROM outbox_event WHERE event_type = 'MISSION_DEFINITION_PUBLISHED' ORDER BY created_at DESC LIMIT 1;
```

**Error Cases**:

1. **Already Published** (run publish twice):
```bash
# Run same curl command twice
# Second call should fail with MISSION_DEFINITION_NOT_PUBLISHABLE
```

2. **Permission Denied**:
```bash
curl -X POST http://localhost:3000/v1/missions/definitions/1/publish \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-456" \
  -H "X-User-Role: USER" \
  -H "Idempotency-Key: publish-test-denied" \
  -d '{}'
# Should fail with 403 Forbidden
```

---

### API 3: Mission.Assign

**Purpose**: Assign a user to a published mission

**Endpoint**: `POST /v1/missions/definitions/{definition_id}/assign`

**Permissions**: `missions:admin` OR `missions:manage` OR `missions:enroll`

**Get Test Mission ID**:
```sql
SELECT id FROM mission_definition WHERE code = 'ASSIGN_TEST_1';
-- Use this ID in the curl command below
```

**Test Command**:
```bash
curl -X POST http://localhost:3000/v1/missions/definitions/2/assign \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-999" \
  -H "X-User-Role: USER" \
  -H "Idempotency-Key: assign-test-1" \
  -d '{
    "user_id": 999,
    "assignment_type": "self_enroll"
  }'
```

**Expected Response**:
```json
{
  "assignment_id": 1,
  "status": "assigned"
}
```

**Verify in Database**:
```sql
SELECT * FROM mission_assignment WHERE user_id = 999;
-- status should be 'assigned'

SELECT * FROM outbox_event WHERE event_type = 'MISSION_ASSIGNED' ORDER BY created_at DESC LIMIT 1;
```

**Error Cases**:

1. **Already Assigned** (run assign twice):
```bash
# Run same curl command twice
# Second call should fail with ALREADY_ASSIGNED
```

2. **Mission Not Published**:
```bash
# Try to assign to a draft mission (from API 1)
curl -X POST http://localhost:3000/v1/missions/definitions/1/assign \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-999" \
  -H "X-User-Role: USER" \
  -H "Idempotency-Key: assign-test-draft" \
  -d '{
    "user_id": 999,
    "assignment_type": "self_enroll"
  }'
# Should fail with MISSION_NOT_OPEN
```

---

### API 4: Mission.Submit

**Purpose**: User submits proof of mission completion

**Endpoint**: `POST /v1/missions/assignments/{assignment_id}/submit`

**Permissions**: `missions:enroll`

**Get Test Assignment ID**:
```sql
SELECT id FROM mission_assignment
WHERE mission_id = (SELECT id FROM mission_definition WHERE code = 'SUBMIT_TEST_1');
-- Use this ID in the curl command below
```

**Test Command**:
```bash
curl -X POST http://localhost:3000/v1/missions/assignments/2/submit \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 888" \
  -H "X-User-Role: USER" \
  -H "Idempotency-Key: submit-test-1" \
  -d '{
    "text_content": "I completed all 5 policy applications!",
    "meta_json": {
      "application_ids": [101, 102, 103, 104, 105],
      "notes": "All applications were approved"
    }
  }'
```

**Expected Response**:
```json
{
  "submission_id": 1,
  "status": "pending"
}
```

**Verify in Database**:
```sql
SELECT * FROM mission_submission WHERE assignment_id = 2;
-- status should be 'pending', text_content should match

SELECT * FROM mission_assignment WHERE id = 2;
-- status should be 'submitted'

SELECT * FROM outbox_event WHERE event_type = 'MISSION_SUBMITTED' ORDER BY created_at DESC LIMIT 1;
```

**Error Cases**:

1. **Already Submitted** (run submit twice):
```bash
# Run same curl command twice
# Second call should fail with ALREADY_SUBMITTED
```

2. **Not Owner** (wrong user):
```bash
curl -X POST http://localhost:3000/v1/missions/assignments/2/submit \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 777" \
  -H "X-User-Role: USER" \
  -H "Idempotency-Key: submit-test-wrong-user" \
  -d '{
    "text_content": "Trying to submit for someone else"
  }'
# Should fail with NOT_OWNER
```

---

### API 5: Mission.ApproveSubmission

**Purpose**: Reviewer approves a pending submission

**Endpoint**: `POST /v1/missions/submissions/{submission_id}/approve`

**Permissions**: `missions:admin` OR `missions:review`

**Get Test Submission ID**:
```sql
SELECT id FROM mission_submission
WHERE assignment_id = (
  SELECT id FROM mission_assignment
  WHERE mission_id = (SELECT id FROM mission_definition WHERE code = 'APPROVE_TEST_1')
);
-- Use this ID in the curl command below
```

**Test Command**:
```bash
curl -X POST http://localhost:3000/v1/missions/submissions/2/approve \
  -H "Content-Type: application/json" \
  -H "X-User-Id: reviewer-456" \
  -H "X-User-Role: ADMIN" \
  -H "Idempotency-Key: approve-test-1" \
  -d '{
    "feedback": "Excellent work! All applications look good."
  }'
```

**Expected Response**:
```json
{
  "submission_id": 2,
  "submission_status": "approved",
  "assignment_id": 3,
  "assignment_status": "completed",
  "reward_grant_id": 1,
  "reward_status": "requested"
}
```

**Verify in Database**:
```sql
-- Check submission
SELECT id, status, feedback, reviewed_by_user_id FROM mission_submission WHERE id = 2;
-- status='approved', feedback should match, reviewed_by_user_id=456

-- Check assignment
SELECT id, status, completed_at FROM mission_assignment WHERE id = 3;
-- status='completed', completed_at should be set

-- Check reward grant
SELECT * FROM mission_reward_grant WHERE assignment_id = 3;
-- status='requested', amount should match mission reward

-- Check outbox events
SELECT id, event_type, aggregate_type FROM outbox_event ORDER BY created_at DESC LIMIT 3;
-- Should see: MISSION_REWARD_REQUESTED, MISSION_COMPLETED, MISSION_SUBMISSION_APPROVED
```

---

## 🔄 Complete Flow Test

Test the entire mission lifecycle from creation to approval:

```bash
# 1. Create Mission
curl -X POST http://localhost:3000/v1/missions/definitions \
  -H "Content-Type: application/json" \
  -H "X-User-Id: admin-123" \
  -H "X-User-Role: ADMIN" \
  -H "Idempotency-Key: flow-create" \
  -d '{
    "code": "FULL_FLOW_TEST",
    "title": "Full Flow Test Mission",
    "cadence": "one_time",
    "max_per_user": 1,
    "reward_json": {"reward_type":"FIXED","amount":200,"currency":"MYR"}
  }'
# Response: {"id": X, "status": "draft"}

# 2. Publish Mission (use ID from step 1)
curl -X POST http://localhost:3000/v1/missions/definitions/X/publish \
  -H "Content-Type: application/json" \
  -H "X-User-Id: admin-123" \
  -H "X-User-Role: ADMIN" \
  -H "Idempotency-Key: flow-publish" \
  -d '{}'
# Response: {"id": X, "status": "published"}

# 3. Assign to User (use mission ID from step 1)
curl -X POST http://localhost:3000/v1/missions/definitions/X/assign \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 555" \
  -H "X-User-Role: USER" \
  -H "Idempotency-Key: flow-assign" \
  -d '{
    "user_id": 555,
    "assignment_type": "self_enroll"
  }'
# Response: {"assignment_id": Y, "status": "assigned"}

# 4. Submit Proof (use assignment_id from step 3)
curl -X POST http://localhost:3000/v1/missions/assignments/Y/submit \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 555" \
  -H "X-User-Role: USER" \
  -H "Idempotency-Key: flow-submit" \
  -d '{
    "text_content": "Mission completed successfully!"
  }'
# Response: {"submission_id": Z, "status": "pending"}

# 5. Approve Submission (use submission_id from step 4)
curl -X POST http://localhost:3000/v1/missions/submissions/Z/approve \
  -H "Content-Type: application/json" \
  -H "X-User-Id: reviewer-456" \
  -H "X-User-Role: ADMIN" \
  -H "Idempotency-Key: flow-approve" \
  -d '{
    "feedback": "Great work!"
  }'
# Response: {"submission_id": Z, "submission_status": "approved", ...}
```

**Verify Complete Flow**:
```sql
-- View the entire mission lifecycle
SELECT
  d.id AS mission_id,
  d.code,
  d.status AS mission_status,
  a.id AS assignment_id,
  a.user_id,
  a.status AS assignment_status,
  s.id AS submission_id,
  s.status AS submission_status,
  r.id AS reward_grant_id,
  r.status AS reward_status,
  r.amount AS reward_amount
FROM mission_definition d
LEFT JOIN mission_assignment a ON d.id = a.mission_id
LEFT JOIN mission_submission s ON a.id = s.assignment_id
LEFT JOIN mission_reward_grant r ON a.id = r.assignment_id
WHERE d.code = 'FULL_FLOW_TEST';

-- View all events emitted
SELECT id, event_type, aggregate_type, aggregate_id, created_at
FROM outbox_event
WHERE aggregate_id IN (
  SELECT CAST(id AS CHAR) FROM mission_definition WHERE code = 'FULL_FLOW_TEST'
  UNION
  SELECT CAST(id AS CHAR) FROM mission_assignment WHERE mission_id = (SELECT id FROM mission_definition WHERE code = 'FULL_FLOW_TEST')
  UNION
  SELECT CAST(id AS CHAR) FROM mission_submission WHERE assignment_id IN (SELECT id FROM mission_assignment WHERE mission_id = (SELECT id FROM mission_definition WHERE code = 'FULL_FLOW_TEST'))
)
ORDER BY created_at;
```

---

## 📊 Quick Reference

| API | Endpoint | Method | Status Code | Permission |
|-----|----------|--------|-------------|------------|
| Create | `/v1/missions/definitions` | POST | 201 | admin, manage |
| Publish | `/v1/missions/definitions/{id}/publish` | POST | 200 | admin, manage |
| Assign | `/v1/missions/definitions/{id}/assign` | POST | 201 | admin, manage, enroll |
| Submit | `/v1/missions/assignments/{id}/submit` | POST | 201 | enroll |
| Approve | `/v1/missions/submissions/{id}/approve` | POST | 200 | admin, review |

---

## 🎉 Success Checklist

After running all tests, you should have:

- ✅ 5+ missions in `mission_definition` table
- ✅ 3+ assignments in `mission_assignment` table
- ✅ 2+ submissions in `mission_submission` table
- ✅ 1+ reward grants in `mission_reward_grant` table
- ✅ 10+ events in `outbox_event` table
- ✅ All status transitions working correctly
- ✅ All permissions enforced
- ✅ Idempotency working (duplicate requests return same response)

---

**Happy Testing!** 🚀
