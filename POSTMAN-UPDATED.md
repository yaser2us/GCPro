# ✅ Postman Collection Updated

## 🎉 What's New

Updated Postman collection with **ALL 5 Mission APIs** and comprehensive test scenarios!

---

## 📦 New Collection

**File**: `postman/GCPro-All-Mission-APIs.postman_collection.json`

### Coverage

| API | Test Cases |
|-----|------------|
| 1. MissionDefinition.Create | 3 tests |
| 2. MissionDefinition.Publish | 4 tests |
| 3. Mission.Assign | 4 tests |
| 4. Mission.Submit | 3 tests |
| 5. Mission.ApproveSubmission | 5 tests |
| **Total** | **19 test cases** |

---

## 🚀 Quick Start

### Step 1: Import to Postman

```bash
File: postman/GCPro-All-Mission-APIs.postman_collection.json
```

1. Open Postman
2. Click **Import**
3. Select the file
4. Collection imported!

### Step 2: Setup Database

```bash
# Create tables
mysql -u root -pOdenza@2026 < database/setup-database.sql

# Insert test data
mysql -u root -pOdenza@2026 < database/test-data-all-apis.sql
```

### Step 3: Get Variable IDs

```sql
USE GC_PRO;

-- Get IDs for Postman variables
SELECT id FROM mission_definition WHERE code = 'PUBLISH_TEST_1';
-- Copy to draft_mission_id variable

SELECT id FROM mission_definition WHERE code = 'ASSIGN_TEST_1';
-- Copy to published_mission_id variable
```

### Step 4: Update Variables in Postman

1. Click collection name
2. Go to **Variables** tab
3. Update these:
   - `draft_mission_id` → (from query above)
   - `published_mission_id` → (from query above)
4. Click **Save**

### Step 5: Start Server & Test

```bash
npm run start:dev
```

Then run tests in this order:
1. **Create Mission** → Success
2. **Publish Mission** → Success (use ID from Create)
3. **Assign Mission** → Success
4. **Submit Mission** → Success (use assignment_id)
5. **Approve Submission** → Success (use submission_id)

---

## 📋 What Each API Tests

### API 1: MissionDefinition.Create
- ✅ Success: Create new draft mission
- ❌ Error: Invalid time range
- ❌ Error: Permission denied (USER role)

### API 2: MissionDefinition.Publish
- ✅ Success: Publish draft mission
- ✅ Idempotency: Same key returns same response
- ❌ Error: Already published
- ❌ Error: Mission not found

### API 3: Mission.Assign
- ✅ Success: User self-enrolls
- ✅ Success: Admin assigns user
- ❌ Error: Already assigned
- ❌ Error: Mission not published (draft)

### API 4: Mission.Submit
- ✅ Success: Submit proof with text + metadata
- ❌ Error: Already submitted
- ❌ Error: Not assignment owner

### API 5: Mission.ApproveSubmission
- ✅ Success: Approve as ADMIN
- ✅ Success: Approve as REVIEWER
- ❌ Error: Already approved
- ❌ Error: Permission denied (USER role)
- ❌ Error: Submission not found

---

## 🔑 Key Features

### Dynamic Variables
- Uses `{{$timestamp}}` for unique codes/keys
- No manual cleanup needed between tests

### Proper Headers
All requests include:
```
X-User-Id: admin-123 (or user-specific)
X-User-Role: ADMIN (or MANAGER, REVIEWER, USER)
Idempotency-Key: unique-key-{{$timestamp}}
Content-Type: application/json
```

### Complete Lifecycle Testing
Test the full mission flow:
```
CREATE → PUBLISH → ASSIGN → SUBMIT → APPROVE
```

### Database Helpers
- SQL scripts included in collection
- Quick reference for test data setup
- Verification queries included

---

## 📊 Collection Variables

| Variable | Default | Update With |
|----------|---------|-------------|
| `base_url` | `http://localhost:3000` | Your server URL |
| `admin_user_id` | `admin-123` | Admin user ID |
| `draft_mission_id` | `1` | Draft mission from SQL |
| `published_mission_id` | `2` | Published mission from SQL |
| `assignment_id` | `1` | From Assign API response |
| `submission_id` | `1` | From Submit API response |

---

## 📚 Documentation

**Complete Guide**: `postman/README.md`
- Detailed test scenarios
- Step-by-step workflow
- Debugging tips
- SQL verification queries

**API Reference**: `ALL-MISSION-APIS-COMPLETE.md`
- All 5 APIs documented
- Architecture overview
- Complete examples

**Testing Guide**: `TESTING-ALL-MISSION-APIS.md`
- Curl examples
- Database verification
- Error scenarios

---

## ✅ Verification

After running all tests, verify:

```sql
-- Check missions created/published
SELECT id, code, status FROM mission_definition
ORDER BY created_at DESC
LIMIT 5;

-- Check assignments
SELECT id, mission_id, user_id, status FROM mission_assignment
ORDER BY created_at DESC;

-- Check submissions
SELECT id, assignment_id, status, feedback FROM mission_submission
ORDER BY created_at DESC;

-- Check reward grants
SELECT id, assignment_id, user_id, amount, status FROM mission_reward_grant
ORDER BY created_at DESC;

-- Check events emitted
SELECT id, event_type, aggregate_type, created_at FROM outbox_event
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 Success Checklist

After testing all APIs:

- ✅ All 5 APIs working
- ✅ 19 test cases executed
- ✅ Success scenarios pass
- ✅ Error scenarios return correct codes
- ✅ Idempotency working
- ✅ Permissions enforced
- ✅ Events emitted to outbox
- ✅ Database state correct

---

## 🔄 Old vs New

| Feature | Old Collection | New Collection |
|---------|---------------|----------------|
| APIs | 2 (Publish, Approve) | 5 (All APIs) |
| Test Cases | 11 | 19 |
| Variables | UUID-based IDs | bigint IDs |
| Endpoints | Old paths | Updated paths |
| Test Data | Manual SQL | Automated scripts |

---

**Ready to test!** 🚀

Import the collection and follow `postman/README.md` for detailed instructions.
