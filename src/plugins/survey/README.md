# Survey Plugin

Survey management system with versioning, questions, responses, and file attachments.

**Spec:** `specs/survey/survey.pillar.v2.yml`

## Overview

The Survey plugin provides comprehensive survey management capabilities including:
- Survey catalog management with versioning
- Dynamic question creation with various answer types
- Response tracking with file attachments
- Multi-value answer support (bool, text, number, date, JSON)

## Architecture

### Aggregates

1. **SURVEY** - Survey catalog
   - Statuses: `active`, `inactive`

2. **SURVEY_VERSION** - Survey versions
   - Statuses: `draft`, `published`, `archived`

3. **SURVEY_RESPONSE** - User responses
   - Statuses: `draft`, `submitted`, `completed`, `invalidated`

### Resources

- `survey_question` - Questions for survey versions
- `survey_question_option` - Multiple choice options
- `survey_response_file` - File attachments to responses
- `survey_answer` - Individual question answers

## Database Schema

### Core Tables

1. **survey** - Survey catalog
2. **survey_version** - Versioned survey definitions
3. **survey_question** - Questions per version
4. **survey_question_option** - Options for choice questions
5. **survey_response** - User survey responses
6. **survey_response_file** - Attached files
7. **survey_answer** - Individual answers

See: `docs/database/FULL-DDL.md` for complete DDL

## API Endpoints

### Survey Management

#### Create Survey
```http
POST /v1/surveys
Headers:
  Idempotency-Key: <unique-key>
  X-User-Id: <user-id>
Body:
{
  "code": "nps-2024",
  "name": "Net Promoter Score 2024",
  "description": "Annual NPS survey"
}
Response: 201 Created
{
  "survey_id": 123,
  "status": "active"
}
```

#### Get Survey
```http
GET /v1/surveys/{survey_id}
Response: 200 OK
{
  "id": 123,
  "code": "nps-2024",
  "name": "Net Promoter Score 2024",
  ...
}
```

#### List Surveys
```http
GET /v1/surveys
Response: 200 OK
{
  "items": [...]
}
```

#### Deactivate Survey
```http
POST /v1/surveys/{survey_id}/deactivate
Headers:
  Idempotency-Key: <unique-key>
Response: 200 OK
{
  "survey_id": 123,
  "status": "inactive"
}
```

### Survey Version Management

#### Create Survey Version
```http
POST /v1/surveys/{survey_id}/versions
Headers:
  Idempotency-Key: <unique-key>
Body:
{
  "version": "1.0",
  "schema_json": {...},
  "logic_json": {...}
}
Response: 201 Created
{
  "survey_version_id": 456,
  "status": "draft"
}
```

#### Publish Survey Version
```http
POST /v1/survey-versions/{survey_version_id}/publish
Headers:
  Idempotency-Key: <unique-key>
Response: 200 OK
{
  "survey_version_id": 456,
  "status": "published"
}
```

### Question Management

#### Create Questions (Bulk)
```http
POST /v1/survey-versions/{survey_version_id}/questions/bulk
Headers:
  Idempotency-Key: <unique-key>
Body:
{
  "questions": [
    {
      "code": "q1",
      "label": "How satisfied are you?",
      "answer_type": "scale",
      "required": true,
      "sort_order": 1
    }
  ]
}
Response: 201 Created
{
  "created_count": 1
}
```

#### Create Question Options (Bulk)
```http
POST /v1/survey-questions/{question_id}/options/bulk
Headers:
  Idempotency-Key: <unique-key>
Body:
{
  "options": [
    {
      "value": "1",
      "label": "Very Dissatisfied",
      "sort_order": 1
    }
  ]
}
Response: 201 Created
{
  "created_count": 1
}
```

### Response Management

#### Create Response
```http
POST /v1/survey-responses
Headers:
  Idempotency-Key: <unique-key>
Body:
{
  "survey_version_id": "456",
  "actor_ref_id": "789",
  "subject_ref_id": "789"
}
Response: 201 Created
{
  "survey_response_id": 999,
  "status": "draft"
}
```

#### Save Answer
```http
POST /v1/survey-answers
Headers:
  Idempotency-Key: <unique-key>
Body:
{
  "response_id": "999",
  "question_id": "111",
  "value_text": "Very satisfied with the service"
}
Response: 200 OK
{
  "survey_answer_id": 1001
}
```

#### Submit Response
```http
POST /v1/survey-responses/{response_id}/submit
Headers:
  Idempotency-Key: <unique-key>
Body:
{
  "answers": [
    {
      "question_id": 111,
      "value_text": "Great service!"
    }
  ]
}
Response: 200 OK
{
  "survey_response_id": 999,
  "status": "submitted"
}
```

#### Attach File to Response
```http
POST /v1/survey-responses/{response_id}/files
Headers:
  Idempotency-Key: <unique-key>
Body:
{
  "file_upload_id": "7777",
  "kind": "evidence",
  "sort_order": 1
}
Response: 201 Created
{
  "survey_response_file_id": 8888
}
```

## Workflow Patterns

### Creating a Complete Survey

1. Create Survey
2. Create Survey Version (status: draft)
3. Add Questions (bulk)
4. Add Question Options (for choice questions)
5. Publish Survey Version
6. Survey is ready for responses

### Collecting Responses

1. Create Survey Response (status: draft)
2. Save individual answers (can be done incrementally)
3. Optionally attach files
4. Submit response (status: submitted)

## Events

All state changes emit outbox events:

- `SURVEY_CREATED`
- `SURVEY_DEACTIVATED`
- `SURVEY_VERSION_CREATED`
- `SURVEY_VERSION_PUBLISHED`
- `SURVEY_QUESTIONS_CREATED`
- `SURVEY_QUESTION_OPTIONS_CREATED`
- `SURVEY_RESPONSE_CREATED`
- `SURVEY_RESPONSE_SUBMITTED`
- `SURVEY_ANSWER_SAVED`
- `SURVEY_RESPONSE_FILE_ATTACHED`

## Permissions

- `survey:admin` - Full survey management
- `survey:manage` - Create and publish surveys
- `survey:read` - Read surveys and responses
- `survey:respond` - Submit survey responses

## Idempotency

All write operations require the `Idempotency-Key` header.

Unique constraints provide database-level idempotency:
- Survey: `UNIQUE(code)`
- Survey Version: `UNIQUE(survey_id, version)`
- Survey Question: `UNIQUE(survey_version_id, code)`
- Survey Question Option: `UNIQUE(question_id, value)`
- Survey Response: `UNIQUE(idempotency_key)`
- Survey Response File: `UNIQUE(response_id, file_upload_id)`
- Survey Answer: `UNIQUE(response_id, question_id)`

## Answer Types

Surveys support multiple answer value types:

- `value_bool` - Boolean (yes/no, true/false)
- `value_text` - Text responses
- `value_num` - Numeric responses
- `value_date` - Date responses
- `value_json` - Complex structured data

Only one value field should be populated per answer based on the question's `answer_type`.

## Dependencies

### Core Services
- `TransactionService` - Transaction management
- `OutboxService` - Event publishing
- `AuthGuard` - Authentication
- `PermissionsGuard` - Authorization

### External Tables (readonly)
- `resource_ref` - For actor and subject references

## File Structure

```
src/plugins/survey/
├── entities/
│   ├── survey.entity.ts
│   ├── survey-version.entity.ts
│   ├── survey-question.entity.ts
│   ├── survey-question-option.entity.ts
│   ├── survey-response.entity.ts
│   ├── survey-response-file.entity.ts
│   └── survey-answer.entity.ts
├── repositories/
│   ├── survey.repo.ts
│   ├── survey-version.repo.ts
│   ├── survey-question.repo.ts
│   ├── survey-question-option.repo.ts
│   ├── survey-response.repo.ts
│   ├── survey-response-file.repo.ts
│   └── survey-answer.repo.ts
├── dto/
│   ├── survey-create.request.dto.ts
│   ├── survey-version-create.request.dto.ts
│   ├── survey-question-bulk-create.request.dto.ts
│   ├── survey-question-option-bulk-create.request.dto.ts
│   ├── survey-response-create.request.dto.ts
│   ├── survey-response-submit.request.dto.ts
│   ├── survey-answer-upsert.request.dto.ts
│   └── survey-response-file-attach.request.dto.ts
├── services/
│   └── survey.workflow.service.ts
├── controllers/
│   └── survey.controller.ts
├── survey.module.ts
├── index.ts
└── README.md
```

## Testing

Test coverage is defined in the spec. All commands should be tested for:
- Happy path
- Guard failures
- Idempotency
- Event emission

## Version History

- **2.0** (2026-03-13) - Initial implementation from FULL-DDL.md
