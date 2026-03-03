# 🚀 QUICKSTART - Test ApproveSubmission API in 5 Minutes

## Step 1: Environment Setup (1 min)

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your MySQL credentials
# DB_PASSWORD=your_mysql_password
```

## Step 2: Start Application (30 sec)

```bash
npm run start:dev
```

Wait for:
```
[Nest] Mapped {/v1/missions/:mission_id/submissions/:submission_id/approve, POST}
[Nest] Application successfully started
```

## Step 3: Create Database & Insert Test Data (2 min)

Open MySQL and run:

```sql
-- Create database
CREATE DATABASE gcpro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gcpro;

-- Tables will be auto-created by TypeORM (DB_SYNC=true)
-- But you need to create schemas first
CREATE SCHEMA IF NOT EXISTS missions;
CREATE SCHEMA IF NOT EXISTS core;

-- Wait for app to create tables, then insert test data:

-- 1. Mission
INSERT INTO missions.mission (
  mission_id, status, title, starts_at, ends_at,
  visibility, reward_json, created_by_user_id, created_at, updated_at
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'PUBLISHED',
  'Complete 5 Policy Applications',
  '2024-01-01 00:00:00',
  '2024-12-31 23:59:59',
  'PUBLIC',
  '{"reward_type":"FIXED","reward_money":{"currency":"MYR","amount_minor":5000},"reward_reason":"MISSION_COMPLETION"}',
  'admin-user-123',
  NOW(),
  NOW()
);

-- 2. Enrollment
INSERT INTO missions.mission_enrollment (
  enrollment_id, mission_id, participant_user_id,
  status, enrolled_at, created_at, updated_at
) VALUES (
  '456f7890-a12b-34c5-d678-901234567890',
  '123e4567-e89b-12d3-a456-426614174000',
  'participant-user-456',
  'SUBMITTED',
  NOW(),
  NOW(),
  NOW()
);

-- 3. Submission
INSERT INTO missions.mission_submission (
  submission_id, mission_id, enrollment_id, participant_user_id,
  status, proof_type, proof_payload_json, submitted_at,
  created_at, updated_at
) VALUES (
  '987f6543-e21b-43d1-b098-765432109876',
  '123e4567-e89b-12d3-a456-426614174000',
  '456f7890-a12b-34c5-d678-901234567890',
  'participant-user-456',
  'PENDING',
  'TEXT',
  '{"text":"I completed 5 applications!"}',
  NOW(),
  NOW(),
  NOW()
);
```

## Step 4: Call the API (30 sec)

```bash
curl -X POST http://localhost:3000/v1/missions/123e4567-e89b-12d3-a456-426614174000/submissions/987f6543-e21b-43d1-b098-765432109876/approve \
  -H "Content-Type: application/json" \
  -H "X-User-Id: admin-user-123" \
  -H "X-User-Role: ADMIN" \
  -d '{
    "idempotency_key": "approve_test_001",
    "approval_note": "Looks good!"
  }'
```

## Step 5: Verify (1 min)

### Expected Response:
```json
{
  "submission_id": "987f6543-e21b-43d1-b098-765432109876",
  "submission_status": "APPROVED",
  "enrollment_id": "456f7890-a12b-34c5-d678-901234567890",
  "enrollment_status": "COMPLETED"
}
```

### Check Database:
```sql
-- Submission should be APPROVED
SELECT status, approved_by_user_id, approval_note
FROM missions.mission_submission
WHERE submission_id = '987f6543-e21b-43d1-b098-765432109876';

-- Enrollment should be COMPLETED
SELECT status, completed_at
FROM missions.mission_enrollment
WHERE enrollment_id = '456f7890-a12b-34c5-d678-901234567890';

-- Should have 3 outbox events
SELECT event_name, aggregate_type, status
FROM core.outbox
ORDER BY created_at DESC
LIMIT 3;
```

## 🎉 Success!

You just:
- ✅ Approved a mission submission
- ✅ Completed an enrollment
- ✅ Emitted 3 events (including MISSION_REWARD_REQUESTED!)
- ✅ All in ONE atomic transaction
- ✅ Protected by idempotency

## 🧪 Test Idempotency

Call the API again with the **same** idempotency_key:

```bash
curl -X POST http://localhost:3000/v1/missions/123e4567-e89b-12d3-a456-426614174000/submissions/987f6543-e21b-43d1-b098-765432109876/approve \
  -H "Content-Type: application/json" \
  -H "X-User-Id: admin-user-123" \
  -H "X-User-Role: ADMIN" \
  -d '{
    "idempotency_key": "approve_test_001",
    "approval_note": "Different note this time"
  }'
```

**Expected**: Same response, NO new database changes! ✨

---

## 📚 Next Steps

Read full docs:
- `docs/TESTING-APPROVE-SUBMISSION-API.md` - Complete testing guide
- `docs/COMPLETE-IMPLEMENTATION-SUMMARY.md` - Implementation details

**You're ready to build more commands following the same pattern!** 🚀
