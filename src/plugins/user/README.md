# User Plugin

User management system with authentication, role-based access control (RBAC), and permission management.

**Spec:** `specs/user/user.pillar.v2.yml`

## Overview

The User plugin provides comprehensive user account management including:
- User account creation and management
- Credential management (passwords, OAuth)
- Role assignment and management
- User-specific permission overrides
- Email verification
- Account suspension and activation

## Architecture

### Aggregates

1. **USER** - User account
   - Statuses: `active`, `suspended`, `inactive`

### Resources

- `user_credential` - Authentication credentials
- `user_permission` - Permission overrides
- `user_role` - Role assignments

## Database Schema

### Core Tables

1. **user** - User accounts
2. **user_credential** - Authentication credentials
3. **user_permission** - User-specific permission overrides
4. **user_role** - Role assignments

See: `docs/database/FULL-DDL.md` for complete DDL

## API Endpoints

### User Management

#### Create User
```http
POST /v1/users
Headers:
  Idempotency-Key: <unique-key>
  X-User-Id: <user-id>
Body:
{
  "phone_number": "+60123456789",
  "email": "user@example.com"
}
Response: 201 Created
{
  "user_id": 123,
  "status": "active"
}
```

#### Get User
```http
GET /v1/users/{user_id}
Response: 200 OK
{
  "id": 123,
  "phone_number": "+60123456789",
  "email": "user@example.com",
  "email_verified_at": null,
  "status": "active",
  "created_at": "2026-03-15T10:00:00Z",
  "updated_at": "2026-03-15T10:00:00Z"
}
```

#### List Users
```http
GET /v1/users
Response: 200 OK
{
  "items": [
    {
      "id": 123,
      "phone_number": "+60123456789",
      "email": "user@example.com",
      ...
    }
  ]
}
```

#### Update User Profile
```http
PUT /v1/users/{user_id}/profile
Headers:
  Idempotency-Key: <unique-key>
Body:
{
  "phone_number": "+60987654321",
  "email": "newemail@example.com"
}
Response: 200 OK
{
  "user_id": 123
}
```

#### Verify Email
```http
POST /v1/users/{user_id}/verify-email
Headers:
  Idempotency-Key: <unique-key>
Body:
{
  "verification_token": "abc123def456"
}
Response: 200 OK
{
  "user_id": 123,
  "email_verified_at": "2026-03-15T10:30:00Z"
}
```

#### Suspend User
```http
POST /v1/users/{user_id}/suspend
Headers:
  Idempotency-Key: <unique-key>
Response: 200 OK
{
  "user_id": 123,
  "status": "suspended"
}
```

#### Activate User
```http
POST /v1/users/{user_id}/activate
Headers:
  Idempotency-Key: <unique-key>
Response: 200 OK
{
  "user_id": 123,
  "status": "active"
}
```

### Credential Management

#### Create Credential
```http
POST /v1/users/{user_id}/credentials
Headers:
  Idempotency-Key: <unique-key>
Body:
{
  "type": "password",
  "secret": "MySecureP@ssw0rd"
}
Response: 201 Created
{
  "user_credential_id": 456
}
```

#### Verify Credential
```http
POST /v1/users/{user_id}/credentials/verify
Body:
{
  "type": "password",
  "secret": "MySecureP@ssw0rd"
}
Response: 200 OK
{
  "verified": true,
  "user_id": 123
}
```

#### List Credentials
```http
GET /v1/users/{user_id}/credentials
Response: 200 OK
{
  "items": [
    {
      "id": 456,
      "user_id": 123,
      "type": "password",
      "provider_ref": null,
      "created_at": "2026-03-15T10:00:00Z"
    }
  ]
}
```

### Role Management

#### Assign Role to User
```http
POST /v1/users/{user_id}/roles
Headers:
  Idempotency-Key: <unique-key>
Body:
{
  "role_id": "789"
}
Response: 201 Created
{
  "user_id": 123,
  "role_id": 789
}
```

#### Revoke Role from User
```http
DELETE /v1/users/{user_id}/roles/{role_id}
Headers:
  Idempotency-Key: <unique-key>
Response: 200 OK
{
  "user_id": 123,
  "role_id": 789
}
```

#### List User Roles
```http
GET /v1/users/{user_id}/roles
Response: 200 OK
{
  "items": [
    {
      "id": 789,
      "code": "admin",
      "name": "Administrator",
      ...
    }
  ]
}
```

### Permission Management

#### Grant Permission to User
```http
POST /v1/users/{user_id}/permissions
Headers:
  Idempotency-Key: <unique-key>
Body:
{
  "permission_id": "999",
  "effect": "allow"
}
Response: 201 Created
{
  "user_permission_id": 1001
}
```

#### Revoke Permission from User
```http
DELETE /v1/users/{user_id}/permissions/{permission_id}
Headers:
  Idempotency-Key: <unique-key>
Response: 200 OK
{
  "user_id": 123,
  "permission_id": 999
}
```

#### List User Permissions
```http
GET /v1/users/{user_id}/permissions
Response: 200 OK
{
  "items": [
    {
      "id": 999,
      "code": "survey:admin",
      "name": "Survey Administrator",
      "effect": "allow",
      ...
    }
  ]
}
```

## Workflow Patterns

### User Registration Flow

1. Create user with phone or email
2. Create password credential
3. Send email verification
4. User verifies email
5. Assign default role(s)

### Authentication Flow

1. User provides credentials
2. Verify credential via API
3. If verified, generate session/token
4. Use token for subsequent requests

### Permission Management

1. Assign roles to users (provides role permissions)
2. Optionally grant/deny specific permissions to override role permissions
3. Permission effect can be "allow" or "deny"

## Events

All state changes emit outbox events:

- `USER_CREATED`
- `USER_PROFILE_UPDATED`
- `USER_EMAIL_VERIFIED`
- `USER_SUSPENDED`
- `USER_ACTIVATED`
- `USER_CREDENTIAL_CREATED`
- `USER_CREDENTIAL_VERIFIED`
- `USER_ROLE_ASSIGNED`
- `USER_ROLE_REVOKED`
- `USER_PERMISSION_GRANTED`
- `USER_PERMISSION_REVOKED`

## Permissions

- `user:admin` - Full user management including suspension
- `user:manage` - Create and update users, manage credentials
- `user:read` - Read users, credentials, roles, and permissions

## Idempotency

All write operations require the `Idempotency-Key` header.

Unique constraints provide database-level idempotency:
- User: `UNIQUE(phone_number)`, `UNIQUE(email)`
- User Permission: `UNIQUE(user_id, permission_id)`
- User Role: `PRIMARY KEY(user_id, role_id)`

## Security

### Password Hashing
- All passwords are hashed using bcrypt with salt rounds of 10
- Passwords are never returned in API responses
- Secret comparison uses constant-time comparison to prevent timing attacks

### Credential Types
- `password` - Hashed password
- `oauth_google` - Google OAuth
- `oauth_facebook` - Facebook OAuth
- Custom types as needed

### Permission Effects
- `allow` - Grants the permission (default)
- `deny` - Explicitly denies the permission (overrides role permissions)

## Dependencies

### Core Services
- `TransactionService` - Transaction management
- `OutboxService` - Event publishing
- `AuthGuard` - Authentication
- `PermissionsGuard` - Authorization

### External Dependencies
- `bcrypt` - Password hashing
- `permission` plugin - For permission references
- `role` plugin - For role references

## File Structure

```
src/plugins/user/
├── entities/
│   ├── user.entity.ts
│   ├── user-credential.entity.ts
│   ├── user-permission.entity.ts
│   └── user-role.entity.ts
├── repositories/
│   ├── user.repo.ts
│   ├── user-credential.repo.ts
│   ├── user-permission.repo.ts
│   └── user-role.repo.ts
├── dto/
│   ├── user-create.request.dto.ts
│   ├── user-update-profile.request.dto.ts
│   ├── user-verify-email.request.dto.ts
│   ├── user-credential-create.request.dto.ts
│   ├── user-credential-verify.request.dto.ts
│   ├── user-role-assign.request.dto.ts
│   └── user-permission-grant.request.dto.ts
├── services/
│   └── user.workflow.service.ts
├── controllers/
│   └── user.controller.ts
├── user.module.ts
├── index.ts
└── README.md
```

## Testing

Test coverage is defined in the spec. All commands should be tested for:
- Happy path
- Guard failures (not found, invalid status transitions)
- Idempotency
- Event emission
- Password hashing verification
- Permission/role assignment and revocation

## Version History

- **2.0** (2026-03-15) - Initial implementation from FULL-DDL.md
