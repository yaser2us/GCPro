# MEDICAL Pillar - DDL

> **Owner**: Medical Service
> **Tables**: 8 tables managing providers, cases, guarantee letters, and underwriting
> **Source**: Extracted from FULL-DDL.md based on TABLE-OWNERSHIP.md

---

## Table of Contents
1. [medical_provider](#medical_provider) - Provider/hospital registry
2. [medical_case](#medical_case) - Case lifecycle
3. [medical_case_event](#medical_case_event) - Case events
4. [guarantee_letter](#guarantee_letter) - GL issuance lifecycle
5. [medical_underwriting_case](#medical_underwriting_case) - Underwriting case
6. [medical_underwriting_outcome](#medical_underwriting_outcome) - Decisions versioned
7. [medical_underwriting_term](#medical_underwriting_term) - Terms per outcome
8. [medical_underwriting_current](#medical_underwriting_current) - Current pointer (subject/context)

---

## medical_provider

Provider and hospital registry with panel status.

```sql
CREATE TABLE `medical_provider` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `provider_code` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` varchar(16) NOT NULL DEFAULT 'hospital',
  `panel_status` varchar(16) NOT NULL DEFAULT 'active',
  `contact_phone` varchar(64) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_provider_code` (`provider_code`),
  KEY `idx_provider_status` (`panel_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

---

## medical_case

Medical case lifecycle tracking with admission details.

```sql
CREATE TABLE `medical_case` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `case_number` varchar(64) NOT NULL,
  `account_id` bigint unsigned NOT NULL,
  `person_id` bigint unsigned NOT NULL,
  `policy_id` bigint unsigned NOT NULL,
  `provider_id` bigint unsigned NOT NULL,
  `admission_type` varchar(16) NOT NULL DEFAULT 'emergency',
  `diagnosis_code` varchar(64) DEFAULT NULL,
  `diagnosis_text` varchar(255) DEFAULT NULL,
  `admitted_at` datetime DEFAULT NULL,
  `discharged_at` datetime DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'reported',
  `eligibility_snapshot` json DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_medical_case_number` (`case_number`),
  KEY `idx_case_policy` (`policy_id`,`status`),
  KEY `idx_case_provider` (`provider_id`,`status`),
  KEY `idx_case_person` (`person_id`),
  CONSTRAINT `fk_case_provider` FOREIGN KEY (`provider_id`) REFERENCES `medical_provider` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

---

## medical_case_event

Medical case event log with actor tracking.

```sql
CREATE TABLE `medical_case_event` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `medical_case_id` bigint unsigned NOT NULL,
  `event_type` varchar(64) NOT NULL,
  `actor_type` varchar(16) NOT NULL DEFAULT 'system',
  `actor_id` bigint unsigned DEFAULT NULL,
  `payload_json` json DEFAULT NULL,
  `occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mce_case_time` (`medical_case_id`,`occurred_at`),
  CONSTRAINT `fk_mce_case` FOREIGN KEY (`medical_case_id`) REFERENCES `medical_case` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

---

## guarantee_letter

Guarantee letter issuance with approved limits and validity period.

```sql
CREATE TABLE `guarantee_letter` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `medical_case_id` bigint unsigned NOT NULL,
  `gl_number` varchar(64) NOT NULL,
  `approved_limit_amount` decimal(18,2) NOT NULL,
  `currency` varchar(8) NOT NULL DEFAULT 'MYR',
  `status` varchar(32) NOT NULL DEFAULT 'issued',
  `valid_from` datetime NOT NULL,
  `valid_until` datetime NOT NULL,
  `coverage_snapshot` json DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `issued_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cancelled_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_gl_number` (`gl_number`),
  UNIQUE KEY `uk_gl_case` (`medical_case_id`),
  KEY `idx_gl_status` (`status`),
  KEY `idx_gl_valid` (`valid_from`,`valid_until`),
  CONSTRAINT `fk_gl_case` FOREIGN KEY (`medical_case_id`) REFERENCES `medical_case` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

---

## medical_underwriting_case

Medical underwriting case header with subject/context references.

```sql
CREATE TABLE `medical_underwriting_case` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `subject_ref_id` bigint unsigned NOT NULL,
  `context_ref_id` bigint unsigned DEFAULT NULL,
  `case_no` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `channel` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `priority` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `created_by_user_id` bigint unsigned DEFAULT NULL,
  `assigned_to_user_id` bigint unsigned DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `closed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_muw_case_no` (`case_no`),
  KEY `idx_muw_subject_time` (`subject_ref_id`,`created_at`),
  KEY `idx_muw_context_time` (`context_ref_id`,`created_at`),
  KEY `idx_muw_status_time` (`status`,`updated_at`),
  CONSTRAINT `fk_muw_case_context_ref` FOREIGN KEY (`context_ref_id`) REFERENCES `resource_ref` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_muw_case_subject_ref` FOREIGN KEY (`subject_ref_id`) REFERENCES `resource_ref` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## medical_underwriting_outcome

Versioned underwriting decisions with risk levels and loading factors.

```sql
CREATE TABLE `medical_underwriting_outcome` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `case_id` bigint unsigned NOT NULL,
  `version_no` int unsigned NOT NULL DEFAULT '1',
  `decision` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `risk_level` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `overall_loading_factor` decimal(8,4) DEFAULT NULL,
  `decision_reason_json` json DEFAULT NULL,
  `decision_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `effective_from` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `effective_to` datetime DEFAULT NULL,
  `decided_by_user_id` bigint unsigned DEFAULT NULL,
  `decided_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_muw_outcome_case_version` (`case_id`,`version_no`),
  KEY `idx_muw_outcome_case_time` (`case_id`,`decided_at`),
  KEY `idx_muw_outcome_decision_time` (`decision`,`decided_at`),
  KEY `idx_muw_outcome_effective` (`effective_from`,`effective_to`),
  CONSTRAINT `fk_muw_outcome_case` FOREIGN KEY (`case_id`) REFERENCES `medical_underwriting_case` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## medical_underwriting_term

Special terms and conditions per outcome (exclusions, loadings, waiting periods).

```sql
CREATE TABLE `medical_underwriting_term` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `outcome_id` bigint unsigned NOT NULL,
  `term_type` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `value_factor` decimal(8,4) DEFAULT NULL,
  `value_amount` decimal(18,2) DEFAULT NULL,
  `value_days` int unsigned DEFAULT NULL,
  `value_text` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_muw_term_outcome` (`outcome_id`),
  KEY `idx_muw_term_type` (`term_type`),
  KEY `idx_muw_term_code` (`code`),
  CONSTRAINT `fk_muw_term_outcome` FOREIGN KEY (`outcome_id`) REFERENCES `medical_underwriting_outcome` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## medical_underwriting_current

Current underwriting pointer for fast lookups.

```sql
CREATE TABLE `medical_underwriting_current` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `subject_ref_id` bigint unsigned NOT NULL,
  `context_ref_id` bigint unsigned DEFAULT NULL,
  `case_id` bigint unsigned NOT NULL,
  `outcome_id` bigint unsigned NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_muw_current_subject_context` (`subject_ref_id`,`context_ref_id`),
  KEY `idx_muw_current_subject` (`subject_ref_id`),
  KEY `fk_muw_current_context_ref` (`context_ref_id`),
  KEY `fk_muw_current_case` (`case_id`),
  KEY `fk_muw_current_outcome` (`outcome_id`),
  CONSTRAINT `fk_muw_current_case` FOREIGN KEY (`case_id`) REFERENCES `medical_underwriting_case` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_muw_current_context_ref` FOREIGN KEY (`context_ref_id`) REFERENCES `resource_ref` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_muw_current_outcome` FOREIGN KEY (`outcome_id`) REFERENCES `medical_underwriting_outcome` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_muw_current_subject_ref` FOREIGN KEY (`subject_ref_id`) REFERENCES `resource_ref` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Relationships

```
medical_provider
  └─> medical_case (FK: provider_id)
        ├─> medical_case_event (FK: medical_case_id)
        └─> guarantee_letter (FK: medical_case_id)

resource_ref (from FOUNDATION)
  └─> medical_underwriting_case (FK: subject_ref_id, context_ref_id)
        ├─> medical_underwriting_outcome (FK: case_id)
        │     └─> medical_underwriting_term (FK: outcome_id)
        └─> medical_underwriting_current (FK: case_id, outcome_id)
```

---

## Key Design Patterns

1. **Provider Panel**: `panel_status` enables network management
2. **Case Lifecycle**: Medical cases track admission → discharge → claim
3. **Guarantee Letters**: Pre-approval for hospital cashless treatment
4. **Versioned Outcomes**: Multiple underwriting decisions over time
5. **Special Terms**: Flexible terms (exclusions, loadings, waiting periods)
6. **Current Pointer**: Fast lookup of latest underwriting decision
7. **Resource References**: Subject/context pattern enables underwriting for persons, policies, etc.

---

## Usage Guidelines

### Medical Case Flow
1. Create `medical_case` when admission reported
2. Issue `guarantee_letter` for cashless treatment
3. Log events via `medical_case_event`
4. Link to claim when submitted

### Underwriting Flow
1. Create `medical_underwriting_case` (subject = person, context = policy application)
2. Create `medical_underwriting_outcome` with decision
3. Add `medical_underwriting_term` records (exclusions, loadings)
4. Update `medical_underwriting_current` for fast lookups

### Term Types
- `exclusion`: Specific conditions not covered
- `loading`: Premium increase (e.g., 1.25x = 25% loading)
- `waiting_period`: Days before coverage starts
- `special_condition`: Custom terms

### Current Underwriting Lookup
```sql
SELECT muo.decision, muo.risk_level, muo.overall_loading_factor
FROM medical_underwriting_current muc
JOIN medical_underwriting_outcome muo ON muc.outcome_id = muo.id
WHERE muc.subject_ref_id = ?
  AND muc.context_ref_id = ?;
```
