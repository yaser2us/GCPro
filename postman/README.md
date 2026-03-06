# Postman Collection - All Mission APIs

## 📦 What's Included

This Postman collection provides comprehensive testing for **ALL 5 Mission APIs**:

### APIs Included

1. **MissionDefinition.Create** (3 test cases)
   - Success case
   - Invalid time range error
   - Permission denied error

2. **MissionDefinition.Publish** (4 test cases)
   - Success case
   - Idempotency test
   - Already published error
   - Not found error

3. **Mission.Assign** (4 test cases)
   - Success case (self enroll)
   - Admin assigns user
   - Already assigned error
   - Mission not published error

4. **Mission.Submit** (3 test cases)
   - Success case
   - Already submitted error
   - Not owner error

5. **Mission.ApproveSubmission** (5 test cases)
   - Success case (ADMIN role)
   - Success case (REVIEWER role)
   - Already approved error
   - Permission denied error
   - Submission not found error

**Total**: 19 test cases + 3 SQL helper scripts

---

## 🚀 Quick Start

### Step 1: Import Collection

1. Open Postman
2. Click **Import** button
3. Select `GCPro-All-Mission-APIs.postman_collection.json`
4. Collection appears in your sidebar

### Step 2: Configure Variables

The collection uses these variables (you need to update them):

| Variable | Default | Description |
|----------|---------|-------------|
| `base_url` | `http://localhost:3000` | Your API server URL |
| `admin_user_id` | `admin-123` | Admin user ID |
| `draft_mission_id` | `1` | ID of a draft mission |
| `published_mission_id` | `2` | ID of a published mission |
| `assignment_id` | `1` | ID of an assignment |
| `submission_id` | `1` | ID of a pending submission |
| `approved_submission_id` | `99` | ID of approved submission (for error test) |

**To edit variables:**
1. Click on the collection name
2. Go to **Variables** tab
3. Update **Current Value** column
4. Click **Save**

### Step 3: Start Your Server

```bash
npm run start:dev
```

Wait for: `[Nest] Application successfully started`

### Step 4: Set Up Database

```bash
# Create tables
mysql -u root -pOdenza@2026 < database/setup-database.sql

# Insert test data
mysql -u root -pOdenza@2026 < database/test-data-all-apis.sql
```

### Step 5: Get Test IDs

Run these SQL queries to get the IDs for your variables:

```sql
USE GC_PRO;

-- For draft_mission_id
SELECT id FROM mission_definition WHERE code = 'PUBLISH_TEST_1';

-- For published_mission_id
SELECT id FROM mission_definition WHERE code = 'ASSIGN_TEST_1';

-- For assignment_id (after running Assign API)
SELECT id FROM mission_assignment WHERE user_id = 888;

-- For submission_id (after running Submit API)
SELECT id FROM mission_submission WHERE status = 'pending' LIMIT 1;
```

Copy these IDs to the Postman variables.

### Step 6: Run Tests!

Test in order:
1. **Create** → Creates a new draft mission
2. **Publish** → Use the ID from Create
3. **Assign** → Use a published mission ID
4. **Submit** → Use the assignment ID from Assign
5. **Approve** → Use the submission ID from Submit

---

## 📝 Test Scenarios Explained

### API 1: MissionDefinition.Create

#### 1️⃣ Create Mission - Success
- **Purpose**: Create a new mission in draft status
- **Expected**: `201 Created` with `{ id, status: "draft" }`
- **Note**: Uses dynamic code with `{{$timestamp}}` to avoid duplicates

#### 2️⃣ Create Mission - Invalid Time Range
- **Purpose**: Test validation
- **Action**: Send ends_at before starts_at
- **Expected**: `400 Bad Request` - "INVALID_TIME_RANGE"

#### 3️⃣ Create Mission - Permission Denied
- **Purpose**: Test permission guard
- **Action**: Use `X-User-Role: USER` (not ADMIN)
- **Expected**: `403 Forbidden`

---

### API 2: MissionDefinition.Publish

#### 1️⃣ Publish Mission - Success
- **Purpose**: Publish a draft mission
- **Expected**: `200 OK` with `{ id, status: "published" }`
- **Prerequisites**: Mission with status='draft'

#### 2️⃣ Publish Mission - Idempotency Test
- **Purpose**: Test duplicate prevention
- **Action**: Call twice with same `Idempotency-Key`
- **Expected**: Same response both times

#### 3️⃣ Publish Mission - Already Published
- **Purpose**: Test guard
- **Expected**: `409 Conflict` - "MISSION_DEFINITION_NOT_PUBLISHABLE"

#### 4️⃣ Publish Mission - Not Found
- **Purpose**: Test error handling
- **Expected**: `404 Not Found`

---

### API 3: Mission.Assign

#### 1️⃣ Assign Mission - Success (Self Enroll)
- **Purpose**: User enrolls themselves
- **Expected**: `201 Created` with `{ assignment_id, status: "assigned" }`

#### 2️⃣ Assign Mission - Admin Assigns User
- **Purpose**: Admin assigns another user
- **Expected**: `201 Created`

#### 3️⃣ Assign Mission - Already Assigned
- **Purpose**: Test duplicate prevention
- **Expected**: `409 Conflict` - "ALREADY_ASSIGNED"

#### 4️⃣ Assign Mission - Not Published
- **Purpose**: Test guard
- **Expected**: `409 Conflict` - "MISSION_NOT_OPEN"

---

### API 4: Mission.Submit

#### 1️⃣ Submit Mission - Success
- **Purpose**: User submits proof of completion
- **Expected**: `201 Created` with `{ submission_id, status: "pending" }`
- **Side Effects**:
  - Submission created
  - Assignment status → "submitted"

#### 2️⃣ Submit Mission - Already Submitted
- **Purpose**: Test duplicate prevention
- **Expected**: `409 Conflict` - "ALREADY_SUBMITTED"

#### 3️⃣ Submit Mission - Not Owner
- **Purpose**: Test ownership validation
- **Action**: Use different user_id in header
- **Expected**: `409 Conflict` - "NOT_OWNER"

---

### API 5: Mission.ApproveSubmission

#### 1️⃣ Approve Submission - Success (ADMIN)
- **Purpose**: Admin approves a submission
- **Expected**: `200 OK` with complete response
- **Side Effects**:
  - Submission → "approved"
  - Assignment → "completed"
  - Reward grant created
  - 3 events emitted

#### 2️⃣ Approve Submission - Success (REVIEWER)
- **Purpose**: Test with REVIEWER role
- **Expected**: `200 OK`

#### 3️⃣ Approve Submission - Already Approved
- **Purpose**: Test guard
- **Expected**: `409 Conflict` - "SUBMISSION_NOT_APPROVABLE"

#### 4️⃣ Approve Submission - Permission Denied
- **Purpose**: Test permissions
- **Expected**: `403 Forbidden`

#### 5️⃣ Approve Submission - Not Found
- **Purpose**: Test error handling
- **Expected**: `404 Not Found`

---

## 🔑 Authentication Headers

All requests require these headers:

```
X-User-Id: <user-id>
X-User-Role: <role>
Idempotency-Key: <unique-key>
```

### Roles and Permissions

| Role | Permissions | Create | Publish | Assign | Submit | Approve |
|------|-------------|--------|---------|--------|--------|---------|
| `ADMIN` | All | ✅ | ✅ | ✅ | ✅ | ✅ |
| `MANAGER` | missions:manage | ✅ | ✅ | ✅ | ❌ | ❌ |
| `REVIEWER` | missions:review | ❌ | ❌ | ❌ | ❌ | ✅ |
| `USER` | missions:enroll | ❌ | ❌ | ✅ | ✅ | ❌ |

---

## 📊 Variables Reference

### Collection Variables

| Variable | Purpose | How to Get |
|----------|---------|------------|
| `base_url` | API server URL | Default: `http://localhost:3000` |
| `admin_user_id` | Admin user for testing | Default: `admin-123` |
| `draft_mission_id` | Draft mission to publish | Query: `SELECT id FROM mission_definition WHERE status='draft' LIMIT 1` |
| `published_mission_id` | Published mission to assign | Query: `SELECT id FROM mission_definition WHERE status='published' LIMIT 1` |
| `assignment_id` | Assignment to submit | Created by Assign API |
| `submission_id` | Submission to approve | Created by Submit API |

### Dynamic Variables

Postman provides these automatically:
- `{{$timestamp}}` - Current Unix timestamp
- `{{$randomUUID}}` - Random UUID v4

---

## 🧪 Complete Testing Workflow

### Test the Complete Lifecycle

Follow this order to test end-to-end:

#### 1. Create Mission
```
POST /v1/missions/definitions
→ Get mission ID from response
→ Save to draft_mission_id variable
```

#### 2. Publish Mission
```
POST /v1/missions/definitions/{{draft_mission_id}}/publish
→ Mission becomes published
→ Update published_mission_id if needed
```

#### 3. Assign User
```
POST /v1/missions/definitions/{{published_mission_id}}/assign
→ Get assignment_id from response
→ Save to assignment_id variable
```

#### 4. Submit Proof
```
POST /v1/missions/assignments/{{assignment_id}}/submit
→ Get submission_id from response
→ Save to submission_id variable
```

#### 5. Approve Submission
```
POST /v1/missions/submissions/{{submission_id}}/approve
→ Complete! Check all status updates
```

#### 6. Verify Database

```sql
-- View the complete flow
SELECT
  d.id AS mission_id,
  d.code,
  d.status AS mission_status,
  a.id AS assignment_id,
  a.user_id,
  a.status AS assignment_status,
  s.id AS submission_id,
  s.status AS submission_status,
  r.id AS reward_id,
  r.amount
FROM mission_definition d
LEFT JOIN mission_assignment a ON d.id = a.mission_id
LEFT JOIN mission_submission s ON a.id = s.assignment_id
LEFT JOIN mission_reward_grant r ON a.id = r.assignment_id
WHERE d.id = {{mission_id}};

-- Check events emitted
SELECT id, event_type, aggregate_type, status
FROM outbox_event
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🔍 Debugging Tips

### Check Database State

```sql
-- View all test missions
SELECT id, code, name, status FROM mission_definition
WHERE code LIKE '%TEST%'
ORDER BY created_at DESC;

-- View all assignments
SELECT a.id, a.mission_id, a.user_id, a.status, d.code
FROM mission_assignment a
JOIN mission_definition d ON a.mission_id = d.id
ORDER BY a.created_at DESC;

-- View all submissions
SELECT s.id, s.assignment_id, s.status, s.text_content
FROM mission_submission s
ORDER BY s.created_at DESC;

-- View all events
SELECT id, event_type, aggregate_type, aggregate_id, created_at
FROM outbox_event
ORDER BY created_at DESC
LIMIT 20;
```

### Common Issues

**Issue**: `Connection refused`
- **Solution**: Start server with `npm run start:dev`

**Issue**: `404 Not Found` on all requests
- **Solution**: Check `base_url` variable

**Issue**: `403 Forbidden`
- **Solution**: Check `X-User-Role` header matches required permissions

**Issue**: `MISSION_NOT_FOUND` or similar
- **Solution**: Update the ID variables with correct values from database

**Issue**: Idempotency key conflicts
- **Solution**: Change the idempotency key or use `{{$timestamp}}` for uniqueness

---

## 📚 Additional Resources

- **Complete Testing Guide**: `/TESTING-ALL-MISSION-APIS.md`
- **API Summary**: `/ALL-MISSION-APIS-COMPLETE.md`
- **Database Setup**: `/database/setup-database.sql`
- **Test Data**: `/database/test-data-all-apis.sql`

---

## 🎯 Test Coverage Summary

| API | Test Cases | Success | Errors |
|-----|------------|---------|--------|
| Create | 3 | ✅ | Invalid time, Permission |
| Publish | 4 | ✅ | Idempotency, Already published, Not found |
| Assign | 4 | ✅ (2 types) | Already assigned, Not published |
| Submit | 3 | ✅ | Already submitted, Not owner |
| Approve | 5 | ✅ (2 roles) | Already approved, Permission, Not found |
| **Total** | **19** | **7** | **12** |

---

**Happy Testing!** 🚀

All 5 Mission APIs are ready to test with comprehensive scenarios covering success cases, error handling, permissions, and idempotency!
