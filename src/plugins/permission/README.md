# Permission Plugin

Role-Based Access Control (RBAC) system for managing permissions and roles.

**Spec:** `specs/permission/permission.pillar.v2.yml`

## Overview

The Permission plugin provides comprehensive RBAC capabilities including:
- Permission catalog management with scopes
- Role management
- Role-permission assignment
- Permission activation/deactivation

## Architecture

### Aggregates

1. **ROLE** - Role management
   - Controls role creation and permission assignments

### Resources

- `permission` - System permissions
  - Statuses: `active`, `inactive`
- `role_permission` - Role-permission junction table

## Database Schema

### Core Tables

1. **permission** - System permissions catalog
2. **role** - Roles for RBAC
3. **role_permission** - Role-permission assignments

See: `docs/database/FULL-DDL.md` for complete DDL

## API Endpoints

### Permission Management

#### Create Permission
```http
POST /v1/permissions
Headers:
  Idempotency-Key: <unique-key>
  X-User-Id: <user-id>
Body:
{
  "code": "survey:admin",
  "name": "Survey Administrator",
  "description": "Full control over survey management",
  "scope": "api"
}
Response: 201 Created
{
  "permission_id": 123,
  "status": "active"
}
```

#### Get Permission
```http
GET /v1/permissions/{permission_id}
Response: 200 OK
{
  "id": 123,
  "code": "survey:admin",
  "name": "Survey Administrator",
  "description": "Full control over survey management",
  "scope": "api",
  "status": "active",
  "created_at": "2026-03-13T10:00:00Z"
}
```

#### List Permissions
```http
GET /v1/permissions
Response: 200 OK
{
  "items": [
    {
      "id": 123,
      "code": "survey:admin",
      "name": "Survey Administrator",
      ...
    }
  ]
}
```

#### Update Permission
```http
PUT /v1/permissions/{permission_id}
Headers:
  Idempotency-Key: <unique-key>
Body:
{
  "name": "Survey Full Administrator",
  "description": "Updated description",
  "scope": "api"
}
Response: 200 OK
{
  "permission_id": 123
}
```

#### Deactivate Permission
```http
POST /v1/permissions/{permission_id}/deactivate
Headers:
  Idempotency-Key: <unique-key>
Response: 200 OK
{
  "permission_id": 123,
  "status": "inactive"
}
```

### Role Management

#### Create Role
```http
POST /v1/roles
Headers:
  Idempotency-Key: <unique-key>
Body:
{
  "code": "admin",
  "name": "Administrator"
}
Response: 201 Created
{
  "role_id": 456
}
```

#### Get Role
```http
GET /v1/roles/{role_id}
Response: 200 OK
{
  "id": 456,
  "code": "admin",
  "name": "Administrator",
  "created_at": "2026-03-13T10:00:00Z"
}
```

#### List Roles
```http
GET /v1/roles
Response: 200 OK
{
  "items": [
    {
      "id": 456,
      "code": "admin",
      "name": "Administrator",
      ...
    }
  ]
}
```

### Role-Permission Management

#### Assign Permission to Role
```http
POST /v1/roles/{role_id}/permissions
Headers:
  Idempotency-Key: <unique-key>
Body:
{
  "permission_id": "123"
}
Response: 201 Created
{
  "role_permission_id": 789
}
```

#### Revoke Permission from Role
```http
DELETE /v1/roles/{role_id}/permissions/{permission_id}
Headers:
  Idempotency-Key: <unique-key>
Response: 200 OK
{
  "role_id": 456,
  "permission_id": 123
}
```

#### List Role Permissions
```http
GET /v1/roles/{role_id}/permissions
Response: 200 OK
{
  "items": [
    {
      "id": 123,
      "code": "survey:admin",
      "name": "Survey Administrator",
      ...
    }
  ]
}
```

## Workflow Patterns

### Setting Up RBAC

1. Create permissions for different operations
2. Create roles (e.g., admin, manager, viewer)
3. Assign permissions to roles
4. Assign roles to users (via user management system)

### Permission Lifecycle

1. Create permission (status: active)
2. Assign to roles
3. Optionally deactivate permission when no longer needed

## Events

All state changes emit outbox events:

- `PERMISSION_CREATED`
- `PERMISSION_UPDATED`
- `PERMISSION_DEACTIVATED`
- `ROLE_CREATED`
- `ROLE_PERMISSION_ASSIGNED`
- `ROLE_PERMISSION_REVOKED`

## Permissions

The permission plugin uses these permissions:
- `permission:admin` - Full permission and role management
- `permission:read` - Read permissions and roles

## Idempotency

All write operations require the `Idempotency-Key` header.

Unique constraints provide database-level idempotency:
- Permission: `UNIQUE(code)`
- Role: `UNIQUE(code)`
- Role Permission: `UNIQUE(role_id, permission_id)`

## Permission Scopes

Permissions can be scoped to different contexts:
- `api` - API-level permissions (default)
- `ui` - UI-level permissions
- `data` - Data-level permissions
- Custom scopes as needed

## Dependencies

### Core Services
- `TransactionService` - Transaction management
- `OutboxService` - Event publishing
- `AuthGuard` - Authentication
- `PermissionsGuard` - Authorization

## File Structure

```
src/plugins/permission/
├── entities/
│   ├── permission.entity.ts
│   ├── role.entity.ts
│   └── role-permission.entity.ts
├── repositories/
│   ├── permission.repo.ts
│   ├── role.repo.ts
│   └── role-permission.repo.ts
├── dto/
│   ├── permission-create.request.dto.ts
│   ├── permission-update.request.dto.ts
│   ├── role-create.request.dto.ts
│   └── role-assign-permission.request.dto.ts
├── services/
│   └── permission.workflow.service.ts
├── controllers/
│   └── permission.controller.ts
├── permission.module.ts
├── index.ts
└── README.md
```

## Testing

Test coverage is defined in the spec. All commands should be tested for:
- Happy path
- Guard failures (permission checks, not found errors)
- Idempotency
- Event emission

## Version History

- **2.0** (2026-03-13) - Initial implementation from FULL-DDL.md
