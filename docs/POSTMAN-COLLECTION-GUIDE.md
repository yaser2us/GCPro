# Postman Collection Guide for GCPro

This guide explains how to create Postman collections for GCPro APIs to ensure consistency and prevent common errors.

## Table of Contents

1. [Required Headers](#required-headers)
2. [Collection Variables](#collection-variables)
3. [Request Structure](#request-structure)
4. [Pre-request Scripts](#pre-request-scripts)
5. [Test Scripts](#test-scripts)
6. [Common Patterns](#common-patterns)
7. [Checklist](#checklist)

---

## Required Headers

### Authentication Headers (REQUIRED)

Every request to GCPro APIs **MUST** include these headers:

```json
{
  "key": "X-User-Id",
  "value": "{{user_id}}",
  "type": "text"
},
{
  "key": "X-User-Role",
  "value": "{{user_role}}",
  "type": "text"
}
```

**Why?** The `AuthGuard` validates these headers to create an `Actor` object:

- `X-User-Id` (REQUIRED): User identifier performing the action
- `X-User-Role` (OPTIONAL): User's role (defaults to 'USER' if not provided)
- `X-Correlation-Id` (OPTIONAL): For request tracing (auto-generated if not provided)
- `X-Causation-Id` (OPTIONAL): Event/command that caused this action (auto-generated if not provided)

**Source:** `src/corekit/guards/auth.guard.ts`

### Idempotency Header (REQUIRED for write operations)

All POST, PUT, DELETE operations **MUST** include:

```json
{
  "key": "Idempotency-Key",
  "value": "{{$guid}}"
}
```

**Why?** Prevents duplicate operations if the request is retried.

### Content-Type Header (REQUIRED for requests with body)

```json
{
  "key": "Content-Type",
  "value": "application/json"
}
```

---

## Collection Variables

### Minimum Required Variables

Every collection should define these base variables:

```json
"variable": [
  {
    "key": "base_url",
    "value": "http://localhost:3000",
    "type": "string"
  },
  {
    "key": "user_id",
    "value": "admin-123",
    "type": "string",
    "description": "Acting user ID for X-User-Id header"
  },
  {
    "key": "user_role",
    "value": "ADMIN",
    "type": "string",
    "description": "Acting user role for X-User-Role header (ADMIN, USER, MANAGER, etc.)"
  }
]
```

### Domain-Specific Variables

Add variables for IDs that will be captured and reused:

**Referral Plugin:**
```json
{
  "key": "program_id",
  "value": "",
  "type": "string"
},
{
  "key": "code_id",
  "value": "",
  "type": "string"
},
{
  "key": "invite_token",
  "value": "",
  "type": "string"
}
```

**Commission Plugin:**
```json
{
  "key": "program_id",
  "value": "",
  "type": "string"
},
{
  "key": "participant_id",
  "value": "",
  "type": "string"
},
{
  "key": "accrual_id",
  "value": "",
  "type": "string"
},
{
  "key": "payout_batch_id",
  "value": "",
  "type": "string"
}
```

**User Plugin:**
```json
{
  "key": "user_id",
  "value": "",
  "type": "string"
},
{
  "key": "credential_id",
  "value": "",
  "type": "string"
}
```

**Wallet Plugin:**
```json
{
  "key": "account_id",
  "value": "",
  "type": "string"
},
{
  "key": "wallet_id",
  "value": "",
  "type": "string"
},
{
  "key": "ledger_txn_id",
  "value": "",
  "type": "string"
}
```

---

## Request Structure

### Standard POST/PUT Request Template

```json
{
  "name": "Operation Name",
  "event": [
    {
      "listen": "prerequest",
      "script": {
        "exec": [
          "// Auto-generate Idempotency-Key",
          "pm.request.headers.add({",
          "    key: 'Idempotency-Key',",
          "    value: pm.variables.replaceIn('{{$guid}}'),",
          "});"
        ],
        "type": "text/javascript"
      }
    },
    {
      "listen": "test",
      "script": {
        "exec": [
          "// Capture response ID",
          "if (pm.response.code === 201) {",
          "    const response = pm.response.json();",
          "    if (response.entity_id) {",
          "        pm.collectionVariables.set('entity_id', response.entity_id);",
          "        console.log('✅ Entity Created:', response.entity_id);",
          "    }",
          "}"
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
      },
      {
        "key": "X-User-Id",
        "value": "{{user_id}}",
        "type": "text"
      },
      {
        "key": "X-User-Role",
        "value": "{{user_role}}",
        "type": "text"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"field\": \"value\"\n}"
    },
    "url": {
      "raw": "{{base_url}}/api/resource",
      "host": ["{{base_url}}"],
      "path": ["api", "resource"]
    }
  },
  "response": []
}
```

### Standard GET Request Template

```json
{
  "name": "Get Resource",
  "event": [
    {
      "listen": "test",
      "script": {
        "exec": [
          "if (pm.response.code === 200) {",
          "    const response = pm.response.json();",
          "    console.log('✅ Retrieved:', response);",
          "}"
        ],
        "type": "text/javascript"
      }
    }
  ],
  "request": {
    "method": "GET",
    "header": [
      {
        "key": "X-User-Id",
        "value": "{{user_id}}",
        "type": "text"
      },
      {
        "key": "X-User-Role",
        "value": "{{user_role}}",
        "type": "text"
      }
    ],
    "url": {
      "raw": "{{base_url}}/api/resource/:id",
      "host": ["{{base_url}}"],
      "path": ["api", "resource", ":id"],
      "variable": [
        {
          "key": "id",
          "value": "{{entity_id}}"
        }
      ]
    }
  },
  "response": []
}
```

---

## Pre-request Scripts

### Auto-generate Idempotency-Key

**All write operations (POST, PUT, DELETE) MUST have this pre-request script:**

```javascript
pm.request.headers.add({
    key: 'Idempotency-Key',
    value: pm.variables.replaceIn('{{$guid}}'),
});
```

### Set Dynamic Timestamps

```javascript
// For date fields
pm.collectionVariables.set('current_date', new Date().toISOString().split('T')[0]);

// For datetime fields
pm.collectionVariables.set('current_timestamp', new Date().toISOString());
```

### Compute Derived Values

```javascript
// Example: Generate referral code from username
const username = pm.collectionVariables.get('username');
const referralCode = username.toUpperCase() + '2024';
pm.collectionVariables.set('referral_code', referralCode);
```

---

## Test Scripts

### Capture Response IDs

**Pattern for capturing IDs from response:**

```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    if (response.program_id) {
        pm.collectionVariables.set('program_id', response.program_id);
        console.log('✅ Saved program_id:', response.program_id);
    }
}
```

### Validate Response Structure

```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Response has program_id", function () {
    const response = pm.response.json();
    pm.expect(response).to.have.property('program_id');
});

pm.test("Program status is active", function () {
    const response = pm.response.json();
    pm.expect(response.status).to.equal('active');
});
```

### Log Success Messages

```javascript
if (pm.response.code === 200) {
    console.log('✅ Operation Successful');
}
```

---

## Common Patterns

### Pattern 1: Create → Capture ID → Use in Next Request

**Request 1: Create Program**
```javascript
// Test script
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.collectionVariables.set('program_id', response.program_id);
}
```

**Request 2: Use Program ID**
```json
{
  "program_id": {{program_id}},
  "other_field": "value"
}
```

### Pattern 2: Auto-capture Multiple IDs

```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();

    // Capture all relevant IDs
    if (response.invite_id) {
        pm.collectionVariables.set('invite_id', response.invite_id);
    }
    if (response.invite_token) {
        pm.collectionVariables.set('invite_token', response.invite_token);
    }

    console.log('✅ Captured IDs:', response);
}
```

### Pattern 3: Path Parameters with Variables

```json
"url": {
  "raw": "{{base_url}}/api/programs/{{program_id}}/participants",
  "host": ["{{base_url}}"],
  "path": ["api", "programs", "{{program_id}}", "participants"]
}
```

### Pattern 4: Query Parameters

```json
"url": {
  "raw": "{{base_url}}/api/wallets/{{wallet_id}}/transactions?limit=50&offset=0",
  "host": ["{{base_url}}"],
  "path": ["api", "wallets", "{{wallet_id}}", "transactions"],
  "query": [
    {
      "key": "limit",
      "value": "50"
    },
    {
      "key": "offset",
      "value": "0"
    }
  ]
}
```

---

## Checklist

Use this checklist when creating or reviewing Postman collections:

### Collection Level
- [ ] Collection has a descriptive name
- [ ] Collection has a detailed description
- [ ] `base_url` variable is defined
- [ ] `user_id` variable is defined
- [ ] `user_role` variable is defined
- [ ] All domain-specific ID variables are defined (with empty default values)

### Request Level - Headers
- [ ] `X-User-Id` header is present and uses `{{user_id}}`
- [ ] `X-User-Role` header is present and uses `{{user_role}}`
- [ ] `Content-Type: application/json` header is present (for requests with body)
- [ ] Idempotency-Key is added via pre-request script (for write operations)

### Request Level - Scripts
- [ ] Pre-request script auto-generates Idempotency-Key (POST/PUT/DELETE)
- [ ] Test script captures response IDs and saves to collection variables
- [ ] Test script logs success messages with checkmarks (✅)
- [ ] Test script validates response structure (optional but recommended)

### Request Level - Body
- [ ] Request body matches DTO structure from specs
- [ ] Required fields are included
- [ ] Example values are realistic and valid
- [ ] Variables are used for references to other entities (e.g., `{{program_id}}`)

### Request Level - URL
- [ ] URL uses `{{base_url}}` variable
- [ ] Path parameters use collection variables (e.g., `{{program_id}}`)
- [ ] Query parameters are properly defined in `query` array (not hardcoded in `raw`)

### Organization
- [ ] Requests are organized into logical folders
- [ ] Request names are descriptive
- [ ] Requests are ordered logically (create before update, etc.)

---

## Example: Complete Request

Here's a complete example showing all best practices:

```json
{
  "name": "Enroll Participant",
  "event": [
    {
      "listen": "prerequest",
      "script": {
        "exec": [
          "pm.request.headers.add({",
          "    key: 'Idempotency-Key',",
          "    value: pm.variables.replaceIn('{{$guid}}'),",
          "});"
        ],
        "type": "text/javascript"
      }
    },
    {
      "listen": "test",
      "script": {
        "exec": [
          "if (pm.response.code === 201) {",
          "    const response = pm.response.json();",
          "    if (response.participant_id) {",
          "        pm.collectionVariables.set('participant_id', response.participant_id);",
          "        console.log('✅ Participant Enrolled:', response.participant_id);",
          "    }",
          "}",
          "",
          "pm.test('Status code is 201', function () {",
          "    pm.response.to.have.status(201);",
          "});",
          "",
          "pm.test('Response has participant_id', function () {",
          "    const response = pm.response.json();",
          "    pm.expect(response).to.have.property('participant_id');",
          "});"
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
      },
      {
        "key": "X-User-Id",
        "value": "{{user_id}}",
        "type": "text"
      },
      {
        "key": "X-User-Role",
        "value": "{{user_role}}",
        "type": "text"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"user_id\": {{user_a_id}},\n  \"start_date\": \"2024-01-01\",\n  \"meta_json\": {\n    \"employee_id\": \"EMP001\",\n    \"department\": \"Sales\"\n  }\n}"
    },
    "url": {
      "raw": "{{base_url}}/api/commission/programs/{{program_id}}/participants",
      "host": ["{{base_url}}"],
      "path": ["api", "commission", "programs", "{{program_id}}", "participants"]
    }
  },
  "response": []
}
```

---

## Common Errors and Solutions

### Error: "Missing X-User-Id header"

**Cause:** Request doesn't include `X-User-Id` header
**Solution:** Add the header to all requests:
```json
{
  "key": "X-User-Id",
  "value": "{{user_id}}",
  "type": "text"
}
```

### Error: "Idempotency-Key header is required"

**Cause:** Write operation missing idempotency key
**Solution:** Add pre-request script:
```javascript
pm.request.headers.add({
    key: 'Idempotency-Key',
    value: pm.variables.replaceIn('{{$guid}}'),
});
```

### Error: Variable not found

**Cause:** Variable used in request but not captured from previous response
**Solution:**
1. Check test script of previous request captures the variable
2. Verify variable name matches exactly
3. Run requests in order

### Error: Unauthorized

**Cause:** User doesn't have required permissions
**Solution:** Check `X-User-Role` value and endpoint's `@RequirePermissions` decorator

---

## Reference: Headers by Endpoint

### All Endpoints
- `X-User-Id` (REQUIRED)
- `X-User-Role` (OPTIONAL, defaults to 'USER')

### Write Operations (POST/PUT/DELETE)
- All headers above
- `Idempotency-Key` (REQUIRED)
- `Content-Type: application/json` (if body present)

### Read Operations (GET)
- `X-User-Id` (REQUIRED)
- `X-User-Role` (OPTIONAL)

---

## Testing Collections

### Quick Test

1. Import collection into Postman
2. Update collection variables (`user_id`, `user_role`, `base_url`)
3. Run the first request
4. Check:
   - No "Missing X-User-Id header" error
   - Response status is 200/201
   - Console shows captured variables

### Full Test (Collection Runner)

1. Click "Run collection" in Postman
2. Ensure "Save responses" is enabled
3. Check all requests succeed sequentially
4. Verify variables are captured between requests

---

## API Path Reference

### Plugin Base Paths

**IMPORTANT:** Different plugins use different base paths. Always verify the controller `@Controller()` decorator.

| Plugin | Base Path | Example Endpoints |
|--------|-----------|-------------------|
| **Referral** | `/v1/referral` | `/v1/referral/programs`<br>`/v1/referral/codes`<br>`/v1/referral/invites`<br>`/v1/referral/conversions` |
| **Commission** | `/api/commission` | `/api/commission/programs`<br>`/api/commission/accruals`<br>`/api/commission/payout-batches` |
| **User** | `/v1` | `/v1/users`<br>`/v1/users/:id/credentials`<br>`/v1/users/:id/roles` |
| **Wallet** | `/v1` | `/v1/accounts`<br>`/v1/wallets`<br>`/v1/wallets/:id/deposit` |

### How to Verify Paths

1. Open the controller file: `src/plugins/<plugin>/controllers/<plugin>.controller.ts`
2. Check the `@Controller()` decorator at the class level
3. Combine with the `@Post()`, `@Get()`, etc. decorators at the method level

**Example:**
```typescript
@Controller('/v1/referral')  // Base path
export class ReferralController {
  @Post('programs')  // Method path
  async createReferralProgram() { ... }
}
// Result: POST /v1/referral/programs
```

**Common Mistake:**
```json
❌ "path": ["api", "referral", "programs"]    // Wrong for referral
✅ "path": ["v1", "referral", "programs"]     // Correct for referral

❌ "path": ["v1", "commission", "programs"]   // Wrong for commission
✅ "path": ["api", "commission", "programs"]  // Correct for commission
```

## Additional Resources

- **AuthGuard Source:** `src/corekit/guards/auth.guard.ts`
- **Actor Type:** `src/corekit/types/actor.type.ts`
- **CurrentActor Decorator:** `src/corekit/decorators/current-actor.decorator.ts`
- **Pillar Specs:** `specs/<pillar>/<pillar>.pillar.v2.yml`
- **Controller Paths:** `src/plugins/<plugin>/controllers/<plugin>.controller.ts`
- **Example Collections:**
  - `postman/referral-api.postman_collection.json`
  - `postman/commission-api.postman_collection.json`
  - `postman/e2e-referral-commission-workflow.postman_collection.json`

---

## Version History

- **v1.0** (2024-01-15): Initial guide created
  - Required headers documentation
  - Collection variables patterns
  - Pre-request and test script templates
  - Common patterns and checklist
