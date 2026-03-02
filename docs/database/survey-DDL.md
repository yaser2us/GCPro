# SURVEY Pillar - DDL

> **Owner**: Survey Service
> **Tables**: 2 tables managing survey catalog and versioned schemas
> **Source**: Extracted from FULL-DDL.md based on TABLE-OWNERSHIP.md

---

## Table of Contents
1. [survey](#survey) - Survey catalog
2. [survey_version](#survey_version) - Versioned schema/logic

---

## survey

Survey catalog header.

```sql
CREATE TABLE `survey` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_survey_code` (`code`),
  KEY `idx_survey_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## survey_version

Versioned survey schemas with JSON-based form definitions and logic.

```sql
CREATE TABLE `survey_version` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `survey_id` bigint unsigned NOT NULL,
  `version` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `schema_json` json DEFAULT NULL,
  `logic_json` json DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_survey_version` (`survey_id`,`version`),
  KEY `idx_sv_status` (`status`),
  KEY `idx_sv_survey_status` (`survey_id`,`status`),
  CONSTRAINT `fk_sv_survey` FOREIGN KEY (`survey_id`) REFERENCES `survey` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Relationships

```
survey
  └─> survey_version (FK: survey_id)
```

---

## Key Design Patterns

1. **Versioning**: Each survey can have multiple versions for iterative improvements
2. **JSON Schema**: `schema_json` defines form structure (questions, field types, validation)
3. **Logic Engine**: `logic_json` defines conditional logic (skip patterns, calculations)
4. **Draft → Published**: Versions start as `draft` and transition to `published`
5. **Cascade Delete**: Deleting survey removes all versions

---

## Usage Guidelines

### Schema JSON Example
```json
{
  "title": "Health Declaration",
  "sections": [
    {
      "id": "section_1",
      "title": "Personal Health",
      "questions": [
        {
          "id": "q1",
          "type": "yes_no",
          "text": "Do you smoke?",
          "required": true
        },
        {
          "id": "q2",
          "type": "number",
          "text": "What is your height (cm)?",
          "validation": {"min": 100, "max": 250}
        }
      ]
    }
  ]
}
```

### Logic JSON Example
```json
{
  "rules": [
    {
      "condition": "q1 == 'yes'",
      "actions": ["show:q1a", "set:smoker_profile=smoker"]
    },
    {
      "condition": "q2 < 150",
      "actions": ["warn:Please verify height"]
    }
  ]
}
```

### Typical Use Cases
- Medical underwriting questionnaires
- Claims submission forms
- Member onboarding surveys
- Satisfaction/feedback collection

### Querying Latest Published Version
```sql
SELECT * FROM survey_version
WHERE survey_id = ? AND status = 'published'
ORDER BY published_at DESC
LIMIT 1;
```

### Survey Response Storage
> Note: Survey responses are typically stored in a separate pillar/service (e.g., `survey_response` table in MEDICAL or CLAIMS pillar), not in the SURVEY pillar itself. The SURVEY pillar only defines the survey structure.
