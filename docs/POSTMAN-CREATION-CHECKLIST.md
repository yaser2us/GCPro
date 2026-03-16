# Postman Collection Creation Checklist

Use this checklist when creating a new Postman collection to ensure accuracy.

## Plugin: _________________

## Pre-Creation Steps

### 1. Database Schema Review
- [ ] Read `docs/database/FULL-DDL.md`
- [ ] Found table definition for: `_______________`
- [ ] Listed all column names:
  - [ ] `_______________` (required/optional, type: _______)
  - [ ] `_______________` (required/optional, type: _______)
  - [ ] `_______________` (required/optional, type: _______)
  - [ ] `_______________` (required/optional, type: _______)
- [ ] Noted UNIQUE constraints: `_______________`
- [ ] Noted DEFAULT values: `_______________`

### 2. Entity File Review
- [ ] Read `src/plugins/{plugin}/entities/{entity}.entity.ts`
- [ ] Verified @Column names match DDL
- [ ] Checked for `nullable: true` (optional fields)
- [ ] Checked for `default:` values
- [ ] No extra fields that don't exist in DDL

### 3. DTO File Review
- [ ] Read `src/plugins/{plugin}/dto/{command}-create.request.dto.ts`
- [ ] Listed all properties:
  - [ ] `_______________` (@IsOptional? yes/no)
  - [ ] `_______________` (@IsOptional? yes/no)
  - [ ] `_______________` (@IsOptional? yes/no)
  - [ ] `_______________` (@IsOptional? yes/no)
- [ ] No fields with `@IsOptional()` will be marked as required in Postman
- [ ] Verified DTO property names match Entity property names

### 4. Controller Review
- [ ] Read `src/plugins/{plugin}/controllers/{plugin}.controller.ts`
- [ ] Listed all endpoints:

#### Endpoint 1: _______________
- [ ] Method: `_______________` (@Post, @Get, @Put, @Delete)
- [ ] Route: `_______________`
- [ ] Required headers:
  - [ ] `Content-Type: application/json` (if POST/PUT)
  - [ ] `Idempotency-Key` (check @Headers decorator)
  - [ ] `X-User-Id` (auto-added by pre-request script)
  - [ ] Other: `_______________`
- [ ] Route params: `_______________`
- [ ] Body DTO: `_______________`
- [ ] Permissions required: `_______________`

#### Endpoint 2: _______________
- [ ] Method: `_______________`
- [ ] Route: `_______________`
- [ ] Required headers: `_______________`
- [ ] Route params: `_______________`
- [ ] Body DTO: `_______________`
- [ ] Permissions required: `_______________`

## Collection Creation

### 5. Collection Setup
- [ ] Created collection with name: `{Plugin} API`
- [ ] Added description with source: `specs/{plugin}/{plugin}.pillar.v2.yml`
- [ ] Added pre-request script (see template below)
- [ ] Added collection variables:
  - [ ] `base_url` = `http://localhost:3000`
  - [ ] `user_id` = `1`
  - [ ] Other plugin-specific variables

### 6. Request Creation - Endpoint: _______________
- [ ] Created request folder: `_______________`
- [ ] Created request: `_______________`
- [ ] Set HTTP method: `_______________`
- [ ] Set URL: `{{base_url}}/_______________`
- [ ] Added headers:
  - [ ] Content-Type: application/json (if POST/PUT)
  - [ ] (Other headers auto-added by pre-request script)
- [ ] Created request body from DTO:
```json
{
  "field_from_dto": "value",
  "another_field": "value"
}
```
- [ ] Verified ALL field names match DTO exactly
- [ ] Added test script to save response ID (if applicable)
- [ ] Added description with idempotency info

### 7. Request Body Verification
For each field in the request body:
- [ ] Field `_______________`:
  - [ ] Exists in DTO? yes/no
  - [ ] Exists in Entity? yes/no
  - [ ] Exists in DDL? yes/no
  - [ ] Optional or required? _______________
  - [ ] Type: _______________

## Testing

### 8. Pre-Test Checks
- [ ] Bootstrap script run? (user_id=1 has permissions)
- [ ] App is running (`npm run start:dev`)
- [ ] Database is accessible
- [ ] Collection variable `user_id` is set to `1`

### 9. Test Each Request
- [ ] Request: `_______________`
  - [ ] Status: _____ (expected: _____)
  - [ ] Error (if any): `_______________`
  - [ ] Fixed? yes/no
  - [ ] Notes: `_______________`

- [ ] Request: `_______________`
  - [ ] Status: _____ (expected: _____)
  - [ ] Error (if any): `_______________`
  - [ ] Fixed? yes/no
  - [ ] Notes: `_______________`

### 10. Common Errors Checklist
If request fails, check:
- [ ] Error: "Missing X-User-Id header"
  - [ ] Fix: Verify pre-request script is added
- [ ] Error: "Idempotency-Key header is required"
  - [ ] Fix: Verify pre-request script generates {{$guid}}
- [ ] Error: "Unknown column 'field_name'"
  - [ ] Fix: Field name doesn't exist in DB, check DDL
- [ ] Error: "User lacks required permissions"
  - [ ] Fix: Run bootstrap script, verify user_id=1 has permissions
- [ ] Error: "field_name is required"
  - [ ] Fix: Add required field from DTO
- [ ] Error: "NaN"
  - [ ] Fix: Wrong route match, check URL path
- [ ] Error: "TYPE_REQUIRED" or similar
  - [ ] Fix: Missing required field from DTO

## Final Review

### 11. Collection Quality Check
- [ ] All requests tested successfully
- [ ] All response IDs saved to variables
- [ ] All error scenarios handled
- [ ] No invented field names
- [ ] No fields from other tables
- [ ] All routes match controller exactly
- [ ] All HTTP methods match controller
- [ ] All required headers present
- [ ] Pre-request script working
- [ ] Collection variables defined
- [ ] Saved to: `postman/{plugin}-api.postman_collection.json`

### 12. Documentation
- [ ] Added comments to complex requests
- [ ] Added descriptions with idempotency info
- [ ] Created "Complete Workflow" folder (if applicable)
- [ ] Ordered requests logically (CRUD order)
- [ ] Collection is ready for team use

---

## Pre-Request Script Template

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

## Test Script Template (Save Response ID)

```javascript
var jsonData = pm.response.json();
pm.environment.set("{entity}_id", jsonData.{entity}_id);
```

---

**Sign-off:**

- [ ] Created by: _______________
- [ ] Date: _______________
- [ ] Reviewed by: _______________
- [ ] Approved for use: yes/no

---

**Notes:**
