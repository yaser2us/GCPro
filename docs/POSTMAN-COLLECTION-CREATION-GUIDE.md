# Postman Collection Creation Guide

## ⚠️ CRITICAL RULE

**NEVER invent or assume field names. ALWAYS follow the actual database schema and code.**

The Postman collection MUST match:
1. **Database schema** (DDL)
2. **Entity definitions** (TypeORM entities)
3. **DTO definitions** (Request/Response DTOs)
4. **Controller signatures** (Endpoint definitions)

## Step-by-Step Process

### Step 1: Read the DDL (Database Schema)

**Location:** `docs/database/FULL-DDL.md`

**What to check:**
- Table name
- Column names (EXACT spelling, case-sensitive)
- Column types
- Which columns are required (NOT NULL)
- Which columns have defaults
- Unique constraints

**Example:**
```sql
-- From FULL-DDL.md
CREATE TABLE `person` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `primary_user_id` bigint unsigned DEFAULT NULL,
  `type` varchar(16) NOT NULL,              -- ✅ REQUIRED
  `full_name` varchar(255) NOT NULL,        -- ✅ REQUIRED (NOT first_name/last_name!)
  `dob` date DEFAULT NULL,                  -- ✅ OPTIONAL (NOT date_of_birth!)
  `gender` varchar(16) DEFAULT NULL,
  `nationality` varchar(64) DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;
```

**Key Observations:**
- ✅ Use `full_name` NOT `first_name` + `last_name`
- ✅ Use `dob` NOT `date_of_birth`
- ✅ `type` is REQUIRED
- ❌ NO `email` or `phone_number` columns (those are in `user` table)

---

### Step 2: Check the Entity File

**Location:** `src/plugins/{plugin-name}/entities/{entity-name}.entity.ts`

**What to check:**
- `@Column()` decorators show exact field names
- `nullable: true` means optional
- `default:` values
- Column lengths

**Example:**
```typescript
// src/plugins/person/entities/person.entity.ts
@Entity('person')
export class Person {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  primary_user_id: number | null;  // ✅ OPTIONAL

  @Column({ type: 'varchar', length: 16 })
  type: string;  // ✅ REQUIRED

  @Column({ type: 'varchar', length: 255 })
  full_name: string;  // ✅ REQUIRED - NOT first_name/last_name!

  @Column({ type: 'date', nullable: true })
  dob: Date | null;  // ✅ OPTIONAL - NOT date_of_birth!

  @Column({ type: 'varchar', length: 16, nullable: true })
  gender: string | null;  // ✅ OPTIONAL

  @Column({ type: 'varchar', length: 64, nullable: true })
  nationality: string | null;  // ✅ OPTIONAL
}
```

**Rules:**
- If `nullable: true` → field is OPTIONAL in Postman
- If no `nullable` or `nullable: false` → field is REQUIRED
- Column name in `@Entity()` is the TABLE name
- Property name is the FIELD name (use this in Postman JSON)

---

### Step 3: Check the DTO File

**Location:** `src/plugins/{plugin-name}/dto/{command-name}.request.dto.ts`

**What to check:**
- `@IsOptional()` decorator means field is optional
- No `@IsOptional()` means field is REQUIRED
- Property names are EXACT field names to use in Postman

**Example:**
```typescript
// src/plugins/person/dto/person-create.request.dto.ts
export class PersonCreateRequestDto {
  @IsOptional()
  @IsString()
  primary_user_id?: string;  // ✅ OPTIONAL

  @IsString()
  @MaxLength(16)
  type: string;  // ✅ REQUIRED

  @IsString()
  @MaxLength(255)
  full_name: string;  // ✅ REQUIRED

  @IsOptional()
  @IsString()
  dob?: string;  // ✅ OPTIONAL

  @IsOptional()
  @IsString()
  @MaxLength(16)
  gender?: string;  // ✅ OPTIONAL

  @IsOptional()
  @IsString()
  @MaxLength(64)
  nationality?: string;  // ✅ OPTIONAL
}
```

**Create Postman JSON from this:**
```json
{
  "type": "individual",        // REQUIRED - from DTO
  "full_name": "John Doe",     // REQUIRED - from DTO
  "dob": "1990-05-15",         // OPTIONAL - from DTO
  "gender": "male",            // OPTIONAL - from DTO
  "nationality": "US"          // OPTIONAL - from DTO
}
```

**❌ WRONG - DON'T DO THIS:**
```json
{
  "first_name": "John",        // ❌ Not in DTO!
  "last_name": "Doe",          // ❌ Not in DTO!
  "date_of_birth": "1990-05-15", // ❌ Wrong field name!
  "email": "john@example.com", // ❌ Not in DTO!
  "phone_number": "+1234567890" // ❌ Not in DTO!
}
```

---

### Step 4: Check the Controller

**Location:** `src/plugins/{plugin-name}/controllers/{plugin-name}.controller.ts`

**What to check:**
- HTTP method (`@Post()`, `@Get()`, `@Put()`, `@Delete()`)
- Route path
- Required headers (`@Headers()`)
- Required params (`@Param()`)
- Body type (`@Body()`)

**Example:**
```typescript
// src/plugins/person/controllers/person.controller.ts

@Post('v1/persons')
@HttpCode(HttpStatus.CREATED)
@RequirePermissions('person:admin', 'person:manage')
async createPerson(
  @Body() request: PersonCreateRequestDto,  // ✅ Use PersonCreateRequestDto fields
  @Headers('idempotency-key') idempotencyKey: string,  // ✅ Required header
  @CurrentActor() actor: Actor,
) {
  if (!idempotencyKey) {
    throw new Error('Idempotency-Key header is required');
  }
  return this.workflowService.createPerson(request, actor, idempotencyKey);
}
```

**Postman Request:**
```
Method: POST
URL: {{base_url}}/v1/persons
Headers:
  - Content-Type: application/json
  - Idempotency-Key: {{$guid}}  // Auto-generated
  - X-User-Id: 1  // Auto-added by pre-request script
Body (raw JSON):
{
  "type": "individual",
  "full_name": "John Doe",
  "dob": "1990-05-15",
  "gender": "male",
  "nationality": "US"
}
```

---

### Step 5: Verify with Pillar YAML (Optional)

**Location:** `specs/{plugin-name}/{plugin-name}.pillar.v2.yml`

**What to check:**
- Command definitions
- Table schema
- Event definitions

**Note:** The YAML may be out of sync with the actual implementation. Always prioritize:
1. **Database DDL** (source of truth)
2. **Entity files** (implementation)
3. **DTO files** (API contract)
4. **YAML spec** (design document, may be outdated)

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Inventing Field Names

**Wrong:**
```json
{
  "firstName": "John",  // ❌ Camel case invented
  "lastName": "Doe"     // ❌ Not in schema
}
```

**Correct:**
```json
{
  "full_name": "John Doe"  // ✅ Exact match from DTO
}
```

---

### ❌ Mistake 2: Using Wrong Field Names

**Wrong:**
```json
{
  "date_of_birth": "1990-05-15"  // ❌ Assumed name
}
```

**Correct:**
```json
{
  "dob": "1990-05-15"  // ✅ From entity: @Column dob
}
```

---

### ❌ Mistake 3: Adding Fields from Other Tables

**Wrong:**
```json
{
  "type": "individual",
  "full_name": "John Doe",
  "email": "john@example.com",     // ❌ This is in 'user' table!
  "phone_number": "+1234567890"    // ❌ This is in 'user' table!
}
```

**Correct:**
```json
{
  "type": "individual",
  "full_name": "John Doe",
  "dob": "1990-05-15"
}
```

---

### ❌ Mistake 4: Wrong HTTP Method

**Wrong:**
```
POST /v1/permissions/123  // ❌ Doesn't exist
```

**Correct (check controller):**
```typescript
@Get('v1/permissions/:permission_id')  // ✅ GET, not POST
```

---

### ❌ Mistake 5: Missing Required Headers

**Wrong:**
```
POST /v1/permissions
Headers: (none)
```

**Correct:**
```
POST /v1/permissions
Headers:
  - Content-Type: application/json
  - Idempotency-Key: {{$guid}}
  - X-User-Id: 1
```

---

### ❌ Mistake 6: Adding Routes That Don't Exist

**Wrong:**
```json
// Invented route based on assumptions
POST /v1/person-identities/{{identity_id}}/verify
{
  "verified_by": "admin",
  "verification_method": "manual_check"
}
```

**Why it's wrong:**
- This route doesn't exist in the controller
- It wasn't in the YAML spec
- It was invented based on "what should exist"

**Correct (check controller first):**
```typescript
// src/plugins/person/controllers/person.controller.ts
// Only these routes exist:
@Post('v1/persons/:person_id/identities')  // ✅ Add identity
@Get('v1/persons/:person_id/identities')   // ✅ List identities

// NO VERIFY ROUTE EXISTS ❌
```

**Rule:** Only create Postman requests for routes that ACTUALLY exist in the controller. Don't assume or invent routes.

---

## Postman Collection Structure

### Required Pre-Request Script

Add this to EVERY collection (collection-level):

```javascript
// Add X-User-Id header
pm.request.headers.add({
  key: 'X-User-Id',
  value: pm.collectionVariables.get('user_id') || '1'
});

// Add Idempotency-Key for POST/PUT requests
if (pm.request.method === 'POST' || pm.request.method === 'PUT') {
  const existingKey = pm.request.headers.get('Idempotency-Key');
  if (!existingKey) {
    pm.request.headers.add({
      key: 'Idempotency-Key',
      value: pm.variables.replaceIn('{{$guid}}')
    });
  }
}
```

### Required Collection Variables

```json
{
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000",
      "type": "string"
    },
    {
      "key": "user_id",
      "value": "1",
      "type": "string"
    }
  ]
}
```

---

## Verification Checklist

Before finalizing a Postman collection, verify:

- [ ] Check DDL for exact table and column names
- [ ] Check Entity file for field names and types
- [ ] Check DTO file for required vs optional fields
- [ ] Check Controller for HTTP method and route
- [ ] Check Controller for required headers
- [ ] No invented or assumed field names
- [ ] No fields from other tables
- [ ] Pre-request script added for headers
- [ ] Collection variables defined
- [ ] Test scripts to save response IDs
- [ ] All routes match controller exactly

---

## Example: Complete Workflow

### 1. You want to create "Create Permission" endpoint

### 2. Check DDL:
```sql
CREATE TABLE `permission` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(128) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(512) DEFAULT NULL,
  `scope` varchar(32) NOT NULL DEFAULT 'api',
  `status` varchar(16) NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_permission_code` (`code`)
) ENGINE=InnoDB;
```

**Observations:**
- `code` (required, unique)
- `name` (required)
- `description` (optional)
- `scope` (has default 'api', can be omitted)
- `status` (has default 'active', can be omitted)

### 3. Check Entity:
```typescript
@Entity('permission')
export class Permission {
  @Column({ type: 'varchar', length: 128, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 32, default: 'api' })
  scope: string;
}
```

### 4. Check DTO:
```typescript
export class PermissionCreateRequestDto {
  @IsString()
  @MaxLength(128)
  code: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  scope?: string;
}
```

### 5. Check Controller:
```typescript
@Post('v1/permissions')
@HttpCode(HttpStatus.CREATED)
@RequirePermissions('permission:admin')
async createPermission(
  @Body() request: PermissionCreateRequestDto,
  @Headers('idempotency-key') idempotencyKey: string,
  @CurrentActor() actor: Actor,
) { ... }
```

### 6. Create Postman Request:

```json
{
  "name": "Create Permission",
  "event": [
    {
      "listen": "test",
      "script": {
        "exec": [
          "var jsonData = pm.response.json();",
          "pm.environment.set(\"permission_id\", jsonData.permission_id);"
        ],
        "type": "text/javascript"
      }
    }
  ],
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Content-Type",
        "value": "application/json"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"code\": \"user.read\",\n  \"name\": \"Read Users\",\n  \"description\": \"Allows reading user data\",\n  \"scope\": \"api\"\n}"
    },
    "url": {
      "raw": "{{base_url}}/v1/permissions",
      "host": ["{{base_url}}"],
      "path": ["v1", "permissions"]
    },
    "description": "Create a new permission\n\nIdempotency: Via UNIQUE(code)"
  },
  "response": []
}
```

---

## Tools to Help

### Quick Check Script

Run this before finalizing your Postman collection:

```bash
# Check what fields the DTO expects
grep -A 20 "export class.*CreateRequestDto" src/plugins/*/dto/*.dto.ts

# Check entity fields
grep -A 30 "@Entity" src/plugins/*/entities/*.entity.ts

# Check controller routes
grep -A 5 "@Post\|@Get\|@Put\|@Delete" src/plugins/*/controllers/*.controller.ts
```

### Verify Entity vs Postman

```bash
# 1. Get entity fields
cat src/plugins/person/entities/person.entity.ts | grep "@Column"

# 2. Get DTO fields
cat src/plugins/person/dto/person-create.request.dto.ts

# 3. Compare with your Postman JSON body
```

---

## Summary

**Golden Rules:**

1. ✅ **Always check DDL first** - This is the source of truth
2. ✅ **Always check Entity file** - This shows actual field names
3. ✅ **Always check DTO file** - This shows API contract
4. ✅ **Always check Controller** - This shows routes and headers
5. ❌ **Never invent field names** - Use exact names from code
6. ❌ **Never assume schema** - Always verify
7. ❌ **Never add fields from other tables** - Stay focused on one entity
8. ✅ **Always add required headers** - X-User-Id, Idempotency-Key, Content-Type
9. ✅ **Always test the request** - Verify it works before committing

**When in doubt:**
1. Read the DTO file (`*.request.dto.ts`)
2. Copy field names EXACTLY as they appear
3. Test the request
4. If it fails, check the error message and adjust

---

**Remember:** The code is the truth. The YAML spec may be outdated. Always follow the actual implementation in the codebase.
