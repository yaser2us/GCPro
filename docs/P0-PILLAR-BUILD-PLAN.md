# P0 Foundation Pillars - Build Plan

**Objective:** Build YAML specs first, then implement all P0 (Priority 0) foundation pillars

**Approach:** Bottom-up from DDL → YAML spec → Implementation

**Reference:** `docs/HOW-TO-CREATE-PILLAR-SPEC.V2.md`

---

## 📋 P0 PILLARS OVERVIEW

| # | Pillar | Tables | Status | Complexity | Dependencies |
|---|--------|--------|--------|------------|--------------|
| 1 | ✅ Missions | 7 | Complete | Medium | user |
| 2 | ✅ Survey | 7 | Complete | Medium | resource_ref |
| 3 | 🔨 Permission & Role | 3 | Pending | Low | None |
| 4 | 🔨 User Management | 4 | Pending | Medium | permission, role |
| 5 | 🔨 Person Management | 3 | Pending | Medium | None |
| 6 | 🔨 File Management | 8 | Pending | Medium | None |
| 7 | 🔨 Notification | 6 | Pending | Medium | user |

**Total Remaining:** 5 pillars, 24 tables

---

## 🎯 BUILD ORDER (Dependency-Based)

### Phase 1: Core Identity (No dependencies)
1. **Permission & Role** (3 tables) - RBAC foundation
2. **Person Management** (3 tables) - Identity foundation

### Phase 2: User System (Depends on Phase 1)
3. **User Management** (4 tables) - Requires permission, role

### Phase 3: Supporting Systems (Can be parallel)
4. **File Management** (8 tables) - Independent
5. **Notification** (6 tables) - Requires user

---

## 📝 PILLAR 1: PERMISSION & ROLE MANAGEMENT

### Table Analysis
```
permission
role
role_permission
```

### DDL Extract Needed
- `permission` table (simple lookup)
- `role` table (simple lookup)
- `role_permission` (junction table)

### Aggregates
- **ROLE** (root: role, statuses: active/inactive)

### Resources
- permission (resource - no lifecycle)
- role_permission (resource - junction)

### Key Commands
1. Permission.Create
2. Permission.List
3. Role.Create
4. Role.Get
5. Role.List
6. Role.AssignPermission
7. Role.RevokePermission
8. Role.ListPermissions

### Events
- PERMISSION_CREATED
- ROLE_CREATED
- ROLE_PERMISSION_ASSIGNED
- ROLE_PERMISSION_REVOKED

### Idempotency
- permission: UNIQUE(code)
- role: UNIQUE(code)
- role_permission: UNIQUE(role_id, permission_id)

### Complexity: ⭐ Low
- Simple CRUD
- No complex workflows
- Standard junction table pattern

---

## 📝 PILLAR 2: PERSON MANAGEMENT

### Table Analysis
```
person
person_identity
person_relationship
```

### DDL Extract Needed
- `person` table (individual person record)
- `person_identity` table (ID documents)
- `person_relationship` table (family/dependent relationships)

### Aggregates
- **PERSON** (root: person, statuses: active/inactive/deceased)

### Resources
- person_identity (resource - ID documents)
- person_relationship (resource - relationships)

### Key Commands
1. Person.Create
2. Person.Get
3. Person.Update
4. Person.List
5. Person.Deactivate
6. PersonIdentity.Add
7. PersonIdentity.Verify
8. PersonRelationship.Create
9. PersonRelationship.List

### Events
- PERSON_CREATED
- PERSON_UPDATED
- PERSON_DEACTIVATED
- PERSON_IDENTITY_ADDED
- PERSON_IDENTITY_VERIFIED
- PERSON_RELATIONSHIP_CREATED

### Idempotency
- person: UNIQUE(idempotency_key) or composite unique on identity fields
- person_identity: UNIQUE(person_id, identity_type, identity_number)
- person_relationship: UNIQUE(person_id, related_person_id, relationship_type)

### Complexity: ⭐⭐ Medium
- Basic lifecycle management
- Multiple related entities
- Identity verification workflow

---

## 📝 PILLAR 3: USER MANAGEMENT

### Table Analysis
```
user
user_credential
user_permission
user_role
```

### DDL Extract Needed
- `user` table (user account)
- `user_credential` table (passwords, OAuth tokens)
- `user_permission` table (user-specific permissions)
- `user_role` table (role assignments)

### Aggregates
- **USER** (root: user, statuses: active/suspended/inactive)

### Resources
- user_credential (resource - credentials)
- user_permission (resource - permission overrides)
- user_role (resource - role assignments)

### Key Commands
1. User.Create
2. User.Get
3. User.List
4. User.UpdateProfile
5. User.Suspend
6. User.Activate
7. UserCredential.Create
8. UserCredential.Verify
9. UserCredential.Reset
10. UserRole.Assign
11. UserRole.Revoke
12. UserPermission.Grant
13. UserPermission.Revoke

### Events
- USER_CREATED
- USER_PROFILE_UPDATED
- USER_SUSPENDED
- USER_ACTIVATED
- USER_CREDENTIAL_CREATED
- USER_CREDENTIAL_VERIFIED
- USER_CREDENTIAL_RESET
- USER_ROLE_ASSIGNED
- USER_ROLE_REVOKED
- USER_PERMISSION_GRANTED
- USER_PERMISSION_REVOKED

### Idempotency
- user: UNIQUE(phone_number), UNIQUE(email)
- user_credential: UNIQUE(user_id, type)
- user_permission: UNIQUE(user_id, permission_id)
- user_role: UNIQUE(user_id, role_id)

### Complexity: ⭐⭐⭐ Medium-High
- Multiple sub-entities
- Security-sensitive operations
- Credential management
- RBAC integration

---

## 📝 PILLAR 4: FILE MANAGEMENT

### Table Analysis
```
file_upload
file_version
file_access_token
file_event
file_link
file_scan_result
file_tag
file_upload_tag
```

### DDL Extract Needed
- `file_upload` (main file record)
- `file_version` (versioning)
- `file_access_token` (temporary access)
- `file_event` (audit trail)
- `file_link` (polymorphic links to entities)
- `file_scan_result` (virus scanning)
- `file_tag` (tag definitions)
- `file_upload_tag` (tagging junction)

### Aggregates
- **FILE_UPLOAD** (root: file_upload, statuses: pending/scanning/clean/infected/failed)
- **FILE_ACCESS_TOKEN** (root: file_access_token, statuses: active/expired/used)

### Resources
- file_version (resource - versions)
- file_event (resource - audit)
- file_link (resource - links)
- file_scan_result (resource - scan)
- file_tag (resource - tags)
- file_upload_tag (resource - junction)

### Key Commands
1. FileUpload.Create
2. FileUpload.Get
3. FileUpload.List
4. FileUpload.Delete
5. FileVersion.Create
6. FileVersion.List
7. FileAccessToken.Generate
8. FileAccessToken.Validate
9. FileLink.Create
10. FileLink.ListByEntity
11. FileScan.Record
12. FileTag.Create
13. FileTag.Assign
14. FileTag.Remove

### Events
- FILE_UPLOADED
- FILE_SCANNED
- FILE_SCAN_COMPLETED
- FILE_SCAN_FAILED
- FILE_INFECTED
- FILE_VERSION_CREATED
- FILE_ACCESS_TOKEN_GENERATED
- FILE_ACCESS_TOKEN_USED
- FILE_LINKED
- FILE_TAGGED
- FILE_DELETED

### Idempotency
- file_upload: UNIQUE(idempotency_key)
- file_access_token: UNIQUE(token)
- file_link: UNIQUE(file_upload_id, entity_type, entity_id)
- file_upload_tag: UNIQUE(file_upload_id, file_tag_id)

### Complexity: ⭐⭐⭐ Medium-High
- File lifecycle management
- Virus scanning integration
- Access control
- Versioning
- Polymorphic linking

---

## 📝 PILLAR 5: NOTIFICATION SYSTEM

### Table Analysis
```
notification_message
notification_delivery_attempt
notification_template
notification_schedule
notification_preference
notification_channel_preference
```

### DDL Extract Needed
- `notification_message` (message record)
- `notification_delivery_attempt` (delivery tracking)
- `notification_template` (templates)
- `notification_schedule` (scheduled notifications)
- `notification_preference` (user preferences)
- `notification_channel_preference` (channel settings)

### Aggregates
- **NOTIFICATION_MESSAGE** (root: notification_message, statuses: pending/sent/failed/cancelled)
- **NOTIFICATION_SCHEDULE** (root: notification_schedule, statuses: active/paused/cancelled)

### Resources
- notification_delivery_attempt (resource - attempts)
- notification_template (resource - templates)
- notification_preference (resource - preferences)
- notification_channel_preference (resource - channel prefs)

### Key Commands
1. NotificationMessage.Send
2. NotificationMessage.Get
3. NotificationMessage.List
4. NotificationMessage.Cancel
5. NotificationDelivery.Record
6. NotificationDelivery.Retry
7. NotificationTemplate.Create
8. NotificationTemplate.Update
9. NotificationTemplate.Get
10. NotificationSchedule.Create
11. NotificationSchedule.Pause
12. NotificationSchedule.Resume
13. NotificationPreference.Update
14. NotificationChannelPreference.Update

### Events
- NOTIFICATION_SENT
- NOTIFICATION_DELIVERED
- NOTIFICATION_FAILED
- NOTIFICATION_CANCELLED
- NOTIFICATION_DELIVERY_ATTEMPTED
- NOTIFICATION_SCHEDULE_CREATED
- NOTIFICATION_SCHEDULE_PAUSED
- NOTIFICATION_PREFERENCE_UPDATED

### Idempotency
- notification_message: UNIQUE(idempotency_key)
- notification_template: UNIQUE(code, version)
- notification_preference: UNIQUE(user_id, notification_type)
- notification_channel_preference: UNIQUE(user_id, channel_type)

### Complexity: ⭐⭐⭐ Medium-High
- Multi-channel delivery
- Retry logic
- Template rendering
- Scheduling
- User preferences

---

## 🔄 YAML GENERATION WORKFLOW

For each pillar, follow this process:

### Step 1: Extract DDL
```bash
# Extract specific tables from FULL-DDL.md
grep -A 50 "CREATE TABLE \`{table_name}\`" docs/database/FULL-DDL.md
```

### Step 2: Create YAML Spec
Using `docs/HOW-TO-CREATE-PILLAR-SPEC.V2.md`:

1. **Read FULL-DDL.md** - Extract target tables
2. **Build Schema** - Map exact DDL columns, constraints, indexes
3. **Build Ownership** - List owned tables
4. **Build Dependencies** - Identify readonly tables
5. **Build Resources** - Identify aggregates vs resources
6. **Build Aggregates** - Define statuses
7. **Build DTOs** - From schema fields
8. **Build Events** - From state changes
9. **Build Commands** - From workflows
10. **Build Coverage** - Map commands to tables/events
11. **Build Changelog** - Initial version

### Step 3: Validate
- ✅ Every DDL column in schema
- ✅ No phantom fields
- ✅ All unique keys match DDL
- ✅ All foreign keys match DDL
- ✅ All indexes match DDL
- ✅ Commands reference only real tables/fields
- ✅ Upserts match UNIQUE constraints
- ✅ All events exist in events section
- ✅ All aggregates exist in aggregates section
- ✅ Coverage includes all commands

### Step 4: Save
```
specs/{pillar}/{pillar}.pillar.v2.yml
```

---

## 📅 EXECUTION TIMELINE

### Week 1: YAML Specs
- **Day 1:** Permission & Role (simple - 3 tables)
- **Day 2:** Person Management (medium - 3 tables)
- **Day 3:** User Management (complex - 4 tables)
- **Day 4:** File Management (complex - 8 tables)
- **Day 5:** Notification (complex - 6 tables)

### Week 2-4: Implementation
- **Week 2:** Permission, Role, Person
- **Week 3:** User Management
- **Week 4:** File & Notification

---

## 🎯 SUCCESS CRITERIA

For each pillar YAML:

✅ **Schema Section**
- All DDL columns mapped exactly
- All constraints documented
- All indexes documented
- No missing fields
- No phantom fields

✅ **Commands Section**
- All CRUD operations covered
- State transitions defined
- Guards implemented
- Events emitted
- Idempotency handled

✅ **Coverage Section**
- All tables touched by commands
- All events emitted by commands
- Aggregate transitions documented

✅ **Validation**
- Passes all 12 validation checks from guideline
- No inconsistencies
- No undefined references

---

## 📂 DIRECTORY STRUCTURE

```
specs/
├── permission/
│   └── permission.pillar.v2.yml
├── person/
│   └── person.pillar.v2.yml
├── user/
│   └── user.pillar.v2.yml
├── file/
│   └── file.pillar.v2.yml
├── notification/
│   └── notification.pillar.v2.yml
├── mission/           # ✅ Complete
│   └── missions.pillar.v2.yml
└── survey/            # ✅ Complete
    └── survey.pillar.v2.yml
```

---

## 🚀 READY TO START

**Recommended Order:**

1. **permission** (easiest, no dependencies)
2. **person** (independent, medium complexity)
3. **user** (depends on permission)
4. **file** (independent, complex)
5. **notification** (depends on user)

Let me know which pillar you want to start with, and I'll generate the complete YAML spec following the guideline exactly!
