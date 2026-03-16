# Person Plugin

Person management system with identity documents and relationship tracking.

**Spec:** `specs/person/person.pillar.v2.yml`

## Overview

The Person plugin provides comprehensive person management capabilities including:
- Person entity management (individuals, dependents, beneficiaries)
- Identity document management (passport, IC, NRIC, etc.)
- Person relationship tracking (family, dependent relationships)
- Person lifecycle management (active, inactive, deceased)

## Architecture

### Aggregates

1. **PERSON** - Person entity
   - Statuses: `active`, `inactive`, `deceased`

### Resources

- `person_identity` - Identity documents attached to persons
- `person_relationship` - Relationships between persons

## Database Schema

### Core Tables

1. **person** - Person entities
2. **person_identity** - Identity documents
3. **person_relationship** - Person-to-person relationships

See: `docs/database/FULL-DDL.md` for complete DDL

## API Endpoints

### Person Management

#### Create Person
```http
POST /v1/persons
Headers:
  Idempotency-Key: <unique-key>
  X-User-Id: <user-id>
Body:
{
  "primary_user_id": "123",
  "type": "individual",
  "full_name": "John Doe",
  "dob": "1990-01-15",
  "gender": "male",
  "nationality": "MY"
}
Response: 201 Created
{
  "person_id": 456,
  "status": "active"
}
```

#### Get Person
```http
GET /v1/persons/{person_id}
Response: 200 OK
{
  "id": 456,
  "primary_user_id": 123,
  "type": "individual",
  "full_name": "John Doe",
  "dob": "1990-01-15",
  "gender": "male",
  "nationality": "MY",
  "status": "active",
  "created_at": "2026-03-15T10:00:00Z",
  "updated_at": "2026-03-15T10:00:00Z"
}
```

#### List Persons
```http
GET /v1/persons
Response: 200 OK
{
  "items": [
    {
      "id": 456,
      "full_name": "John Doe",
      ...
    }
  ]
}
```

#### Update Person
```http
PUT /v1/persons/{person_id}
Headers:
  Idempotency-Key: <unique-key>
Body:
{
  "full_name": "John A. Doe",
  "nationality": "SG"
}
Response: 200 OK
{
  "person_id": 456
}
```

#### Deactivate Person
```http
POST /v1/persons/{person_id}/deactivate
Headers:
  Idempotency-Key: <unique-key>
Response: 200 OK
{
  "person_id": 456,
  "status": "inactive"
}
```

#### Mark Person Deceased
```http
POST /v1/persons/{person_id}/deceased
Headers:
  Idempotency-Key: <unique-key>
Response: 200 OK
{
  "person_id": 456,
  "status": "deceased"
}
```

### Identity Management

#### Add Person Identity
```http
POST /v1/persons/{person_id}/identities
Headers:
  Idempotency-Key: <unique-key>
Body:
{
  "id_type": "passport",
  "id_no": "A12345678",
  "country": "MY"
}
Response: 201 Created
{
  "person_identity_id": 789
}
```

#### List Person Identities
```http
GET /v1/persons/{person_id}/identities
Response: 200 OK
{
  "items": [
    {
      "id": 789,
      "person_id": 456,
      "id_type": "passport",
      "id_no": "A12345678",
      "country": "MY",
      "created_at": "2026-03-15T10:00:00Z"
    }
  ]
}
```

### Relationship Management

#### Create Person Relationship
```http
POST /v1/persons/{person_id}/relationships
Headers:
  Idempotency-Key: <unique-key>
Body:
{
  "to_person_id": "999",
  "relation_type": "spouse"
}
Response: 201 Created
{
  "person_relationship_id": 111
}
```

#### List Person Relationships
```http
GET /v1/persons/{person_id}/relationships
Response: 200 OK
{
  "items": [
    {
      "id": 111,
      "from_person_id": 456,
      "to_person_id": 999,
      "relation_type": "spouse",
      "created_at": "2026-03-15T10:00:00Z"
    }
  ]
}
```

## Workflow Patterns

### Creating a Person with Identity

1. Create Person
2. Add Identity Document(s)
3. Person is ready for use in other systems

### Managing Family Relationships

1. Create primary person (e.g., policyholder)
2. Create related persons (e.g., spouse, children)
3. Create relationships between persons
4. Relationships are bidirectional (can be queried from either person)

## Events

All state changes emit outbox events:

- `PERSON_CREATED`
- `PERSON_UPDATED`
- `PERSON_DEACTIVATED`
- `PERSON_DECEASED`
- `PERSON_IDENTITY_ADDED`
- `PERSON_RELATIONSHIP_CREATED`

## Permissions

- `person:admin` - Full person management including deactivation and deceased marking
- `person:manage` - Create and update persons, add identities, create relationships
- `person:read` - Read persons, identities, and relationships

## Idempotency

All write operations require the `Idempotency-Key` header.

Unique constraints provide database-level idempotency:
- Person: Via Idempotency-Key header
- Person Identity: `UNIQUE(id_type, id_no)` - prevents duplicate identity documents globally
- Person Relationship: `UNIQUE(from_person_id, to_person_id, relation_type)` - prevents duplicate relationships

## Person Types

Common person types:
- `individual` - Regular individual person
- `dependent` - Dependent (e.g., child, elderly parent)
- `beneficiary` - Beneficiary of a policy
- Custom types as needed by business logic

## Relationship Types

Common relationship types:
- `spouse` - Married partner
- `parent` - Parent relationship
- `child` - Child relationship
- `dependent` - Generic dependent
- `beneficiary` - Beneficiary relationship
- Custom types as needed

## Dependencies

### Core Services
- `TransactionService` - Transaction management
- `OutboxService` - Event publishing
- `AuthGuard` - Authentication
- `PermissionsGuard` - Authorization

### External Tables (readonly)
- `user` - For person.primary_user_id references

## File Structure

```
src/plugins/person/
├── entities/
│   ├── person.entity.ts
│   ├── person-identity.entity.ts
│   └── person-relationship.entity.ts
├── repositories/
│   ├── person.repo.ts
│   ├── person-identity.repo.ts
│   └── person-relationship.repo.ts
├── dto/
│   ├── person-create.request.dto.ts
│   ├── person-update.request.dto.ts
│   ├── person-identity-add.request.dto.ts
│   └── person-relationship-create.request.dto.ts
├── services/
│   └── person.workflow.service.ts
├── controllers/
│   └── person.controller.ts
├── person.module.ts
├── index.ts
└── README.md
```

## Testing

Test coverage is defined in the spec. All commands should be tested for:
- Happy path
- Guard failures (not found, invalid status transitions)
- Idempotency
- Event emission

## Version History

- **2.0** (2026-03-15) - Initial implementation from FULL-DDL.md
