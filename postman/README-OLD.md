# Postman Collection - GCPro Mission APIs

## 📦 What's Included

This Postman collection provides comprehensive testing for the Mission APIs:

### APIs Included
1. **Mission.Publish** (5 test cases)
   - Success case
   - Idempotency test
   - Already published error
   - Permission denied error
   - Mission not found error

2. **Mission.ApproveSubmission** (6 test cases)
   - Success case (ADMIN role)
   - Success case (REVIEWER role)
   - Idempotency test
   - Already approved error
   - Permission denied error
   - Submission not found error

3. **Database Setup Scripts** (2 SQL helpers)
   - Insert draft mission
   - Insert test data for approval

---

## 🚀 Quick Start

### Step 1: Import Collection

1. Open Postman
2. Click **Import** button
3. Select `GCPro-Mission-APIs.postman_collection.json`
4. Collection appears in your sidebar

### Step 2: Configure Variables

The collection uses these variables (already set with defaults):

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `base_url` | `http://localhost:3000` | Your API server URL |
| `admin_user_id` | `admin-user-123` | Admin user ID for testing |
| `mission_id` | `123e4567-e89b-12d3-a456-426614174000` | Test mission ID |
| `submission_id` | `987f6543-e21b-43d1-b098-765432109876` | Test submission ID |

**To edit variables:**
1. Click on the collection name
2. Go to **Variables** tab
3. Update **Current Value** column
4. Click **Save**

### Step 3: Start Your Server

```bash
npm run start:dev
```

Wait for:
```
[Nest] Application successfully started
```

### Step 4: Set Up Database

Open MySQL and run:

```sql
CREATE DATABASE IF NOT EXISTS GC_PRO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE GC_PRO;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS missions;
CREATE SCHEMA IF NOT EXISTS core;
```

**Note:** Tables will be auto-created by TypeORM if `DB_SYNC=true` in your `.env` file.

### Step 5: Insert Test Data

#### For Mission.Publish API:

```sql
USE GC_PRO;

INSERT INTO missions.mission (
  mission_id, status, title, description, starts_at, ends_at,
  visibility, reward_json, created_by_user_id, created_at, updated_at
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'DRAFT',  -- DRAFT status
  'Complete 5 Policy Applications',
  'Submit and get approved for 5 policy applications',
  NOW(),
  DATE_ADD(NOW(), INTERVAL 30 DAY),  -- Future end date
  'PUBLIC',
  '{"reward_type":"FIXED","reward_money":{"currency":"MYR","amount_minor":5000},"reward_reason":"MISSION_COMPLETION"}',
  'admin-user-123',
  NOW(),
  NOW()
);
```

#### For Mission.ApproveSubmission API:

```sql
USE GC_PRO;

-- 1. Mission (published)
INSERT INTO missions.mission (
  mission_id, status, title, description, starts_at, ends_at,
  visibility, reward_json, created_by_user_id, created_at, updated_at
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'PUBLISHED',  -- Already published
  'Complete 5 Policy Applications',
  'Submit and get approved for 5 policy applications',
  NOW(),
  DATE_ADD(NOW(), INTERVAL 30 DAY),
  'PUBLIC',
  '{"reward_type":"FIXED","reward_money":{"currency":"MYR","amount_minor":5000},"reward_reason":"MISSION_COMPLETION"}',
  'admin-user-123',
  NOW(),
  NOW()
);

-- 2. Enrollment (submitted)
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

-- 3. Submission (pending)
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

### Step 6: Run Tests!

Open any request and click **Send**.

---

## 📝 Test Scenarios Explained

### Mission.Publish

#### 1️⃣ Publish Draft Mission (Success)
- **Purpose**: Successfully publish a draft mission
- **Expected**: `200 OK` with `{ mission_id, status: "PUBLISHED" }`
- **Prerequisites**: Mission with status='DRAFT', not expired

#### 2️⃣ Idempotency Test
- **Purpose**: Test duplicate prevention
- **Action**: Call twice with same `idempotency_key`
- **Expected**: Same response both times, no database changes on second call

#### 3️⃣ Already Published (Error)
- **Purpose**: Test guard - can't publish already published mission
- **Expected**: `409 Conflict` - "MISSION_NOT_PUBLISHABLE"

#### 4️⃣ Permission Denied (Error)
- **Purpose**: Test permission guard
- **Action**: Use `X-User-Role: USER` (not ADMIN/MANAGER)
- **Expected**: `403 Forbidden` - "User lacks required permissions"

#### 5️⃣ Mission Not Found (Error)
- **Purpose**: Test mission existence check
- **Expected**: `404 Not Found` - "MISSION_NOT_FOUND"

---

### Mission.ApproveSubmission

#### 1️⃣ Approve Submission (Success - ADMIN)
- **Purpose**: Successfully approve a submission as ADMIN
- **Expected**: `200 OK` with submission and enrollment status
- **Side Effects**:
  - Submission → APPROVED
  - Enrollment → COMPLETED
  - 3 events emitted (including MISSION_REWARD_REQUESTED)

#### 2️⃣ Approve with Reviewer Role
- **Purpose**: Test approval with REVIEWER role (not just ADMIN)
- **Expected**: `200 OK` (REVIEWER also has missions:review permission)

#### 3️⃣ Idempotency Test
- **Purpose**: Test duplicate prevention
- **Action**: Call twice with same `idempotency_key`
- **Expected**: Same response both times

#### 4️⃣ Already Approved (Error)
- **Purpose**: Test guard - can't approve already approved submission
- **Expected**: `409 Conflict` - "SUBMISSION_NOT_APPROVABLE"

#### 5️⃣ Permission Denied (Error)
- **Purpose**: Test permission guard
- **Action**: Use `X-User-Role: USER`
- **Expected**: `403 Forbidden`

#### 6️⃣ Submission Not Found (Error)
- **Purpose**: Test submission existence check
- **Expected**: `404 Not Found` - "SUBMISSION_NOT_FOUND"

---

## 🔑 Authentication Headers

All requests require these headers:

```
X-User-Id: <user-id>
X-User-Role: <role>
```

### Roles and Permissions

| Role | Permissions | Can Publish? | Can Approve? |
|------|-------------|--------------|--------------|
| `ADMIN` | All | ✅ | ✅ |
| `REVIEWER` | missions:review | ❌ | ✅ |
| `USER` | missions:enroll | ❌ | ❌ |

---

## 📊 Variables Reference

### Collection Variables

Edit these in **Collection → Variables** tab:

```
{{base_url}}              - API server URL
{{admin_user_id}}         - Admin user for testing
{{mission_id}}            - Mission ID for tests
{{submission_id}}         - Submission ID for tests
{{published_mission_id}}  - Already published mission (for error tests)
{{approved_submission_id}} - Already approved submission (for error tests)
```

### Dynamic Variables

Postman provides these automatically:

```
{{$timestamp}}  - Current Unix timestamp (e.g., 1710504123)
{{$randomUUID}} - Random UUID v4
```

---

## 🧪 Testing Workflow

### Test Mission.Publish

1. **Insert draft mission** (SQL)
2. **Run "Publish Draft Mission"** → Should succeed
3. **Run "Idempotency Test"** (same key twice) → Same response both times
4. **Run "Already Published"** → Should fail with 409
5. **Run "Permission Denied"** → Should fail with 403

### Test Mission.ApproveSubmission

1. **Insert mission, enrollment, submission** (SQL)
2. **Run "Approve Submission"** → Should succeed
3. **Verify database**:
   ```sql
   SELECT * FROM missions.mission_submission WHERE submission_id = '987...';
   -- status should be 'APPROVED'

   SELECT * FROM core.outbox ORDER BY created_at DESC LIMIT 3;
   -- Should see 3 events including MISSION_REWARD_REQUESTED
   ```
4. **Run "Idempotency Test"** → Same response
5. **Run error scenarios** → Test all error cases

---

## 🔍 Debugging Tips

### Check Database Changes

After each request, verify in MySQL:

```sql
-- Check mission status
SELECT mission_id, status, published_at
FROM missions.mission
WHERE mission_id = '123e4567-e89b-12d3-a456-426614174000';

-- Check submission status
SELECT submission_id, status, approved_at, approved_by_user_id
FROM missions.mission_submission
WHERE submission_id = '987f6543-e21b-43d1-b098-765432109876';

-- Check outbox events
SELECT id, event_name, aggregate_type, status, created_at
FROM core.outbox
ORDER BY created_at DESC
LIMIT 10;

-- Check idempotency records
SELECT id, scope, idempotency_key, status, created_at
FROM core.idempotency
ORDER BY created_at DESC
LIMIT 10;
```

### Common Issues

**Issue**: `Connection refused`
- **Solution**: Make sure server is running (`npm run start:dev`)

**Issue**: `404 Not Found` on all requests
- **Solution**: Check `base_url` variable is correct

**Issue**: `500 Internal Server Error`
- **Solution**: Check server logs for errors
- Verify database connection in `.env` file

**Issue**: Data not found in database
- **Solution**: Run SQL insert scripts first
- Check database name matches (default: `GC_PRO`)

---

## 📚 Additional Resources

- **Testing Guide**: `/docs/TESTING-PUBLISH-MISSION-API.md`
- **Testing Guide**: `/docs/TESTING-APPROVE-SUBMISSION-API.md`
- **API Summary**: `/docs/MISSION-APIS-SUMMARY.md`
- **Implementation Details**: `/docs/COMPLETE-IMPLEMENTATION-SUMMARY.md`

---

## 🎯 Next Steps

After testing these APIs:

1. **Verify database changes** after each test
2. **Check outbox events** to see event emission working
3. **Test idempotency** by calling APIs twice with same key
4. **Implement more APIs** using the same pattern (Create, Enroll, Submit, etc.)

---

**Happy Testing!** 🚀
