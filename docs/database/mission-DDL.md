# MISSIONS Pillar - DDL

> **Owner**: MISSIONS Service
> **Tables**: 7 tables managing mission catalog, assignments, progress tracking, events, submissions, and rewards
> **Source**: Extracted from FULL-DDL.md based on TABLE-OWNERSHIP.md

---

## Table of Contents
1. [mission_definition](#mission_definition) - Mission catalog + criteria/reward json
2. [mission_assignment](#mission_assignment) - Per-user mission instance
3. [mission_event](#mission_event) - Progress events (idempotent)
4. [mission_progress](#mission_progress) - Metric tracking
5. [mission_reward_grant](#mission_reward_grant) - Reward issuance (idempotent)
6. [mission_submission](#mission_submission) - User submission + review
7. [mission_submission_file](#mission_submission_file) - Submission ↔ file

---

## mission_definition

Mission catalog with criteria and reward definitions.

```sql
CREATE TABLE `mission_definition` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scope` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'global',
  `cadence` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'one_time',
  `trigger_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'event',
  `criteria_json` json DEFAULT NULL,
  `reward_json` json DEFAULT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `start_at` datetime DEFAULT NULL,
  `end_at` datetime DEFAULT NULL,
  `max_per_user` int unsigned NOT NULL DEFAULT '1',
  `max_total` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_mdef_code` (`code`),
  KEY `idx_mdef_status_time` (`status`,`start_at`,`end_at`),
  KEY `idx_mdef_scope` (`scope`,`cadence`,`trigger_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## mission_assignment

Per-user mission instance tracking status and lifecycle.

```sql
CREATE TABLE `mission_assignment` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mission_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'assigned',
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `idempotency_key` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_massign_mission_user` (`mission_id`,`user_id`),
  UNIQUE KEY `uk_massign_idempotency` (`idempotency_key`),
  KEY `idx_massign_user_status` (`user_id`,`status`),
  KEY `idx_massign_expires` (`expires_at`),
  CONSTRAINT `fk_massign_mission` FOREIGN KEY (`mission_id`) REFERENCES `mission_definition` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_massign_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## mission_event

Progress events linked to assignments (idempotent via idempotency_key).

```sql
CREATE TABLE `mission_event` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `assignment_id` bigint unsigned NOT NULL,
  `event_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ref_type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ref_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payload_json` json DEFAULT NULL,
  `idempotency_key` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_mevent_idempotency` (`idempotency_key`),
  KEY `idx_mevent_assignment_time` (`assignment_id`,`occurred_at`),
  KEY `idx_mevent_ref` (`ref_type`,`ref_id`),
  CONSTRAINT `fk_mevent_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `mission_assignment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## mission_progress

Metric tracking for mission completion criteria.

```sql
CREATE TABLE `mission_progress` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `assignment_id` bigint unsigned NOT NULL,
  `metric_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `current_value` decimal(18,2) NOT NULL DEFAULT '0.00',
  `target_value` decimal(18,2) NOT NULL DEFAULT '1.00',
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'tracking',
  `meta_json` json DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_mprog_assignment_metric` (`assignment_id`,`metric_code`),
  KEY `idx_mprog_status` (`status`),
  CONSTRAINT `fk_mprog_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `mission_assignment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## mission_reward_grant

Reward issuance tracking (idempotent via idempotency_key and uk_mgrant_assignment_once).

```sql
CREATE TABLE `mission_reward_grant` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `assignment_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `reward_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'coins',
  `amount` decimal(18,2) NOT NULL,
  `currency` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'COIN',
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'granted',
  `ref_type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ref_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idempotency_key` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `granted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_mgrant_assignment_once` (`assignment_id`),
  UNIQUE KEY `uk_mgrant_idempotency` (`idempotency_key`),
  KEY `idx_mgrant_user_time` (`user_id`,`granted_at`),
  KEY `idx_mgrant_ref` (`ref_type`,`ref_id`),
  CONSTRAINT `fk_mgrant_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `mission_assignment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_mgrant_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## mission_submission

User submission with review workflow and feedback.

```sql
CREATE TABLE `mission_submission` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `assignment_id` bigint unsigned NOT NULL,
  `status` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `text_content` text COLLATE utf8mb4_unicode_ci,
  `meta_json` json DEFAULT NULL,
  `feedback` text COLLATE utf8mb4_unicode_ci,
  `reviewed_by_user_id` bigint unsigned DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `idempotency_key` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_msub_idempotency` (`idempotency_key`),
  KEY `idx_msub_assignment_status` (`assignment_id`,`status`),
  KEY `idx_msub_status_time` (`status`,`submitted_at`),
  KEY `idx_msub_reviewer` (`reviewed_by_user_id`,`reviewed_at`),
  CONSTRAINT `fk_msub_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `mission_assignment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_msub_reviewer_user` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## mission_submission_file

Links files to mission submissions (polymorphic file reference).

```sql
CREATE TABLE `mission_submission_file` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `submission_id` bigint unsigned NOT NULL,
  `file_ref_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'file_upload',
  `file_ref_id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_msubf_submission` (`submission_id`),
  KEY `idx_msubf_file_ref` (`file_ref_type`,`file_ref_id`),
  CONSTRAINT `fk_msubf_submission` FOREIGN KEY (`submission_id`) REFERENCES `mission_submission` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Relationships

```
mission_definition
  └─> mission_assignment (FK: mission_id)
        ├─> mission_event (FK: assignment_id)
        ├─> mission_progress (FK: assignment_id)
        ├─> mission_reward_grant (FK: assignment_id)
        └─> mission_submission (FK: assignment_id)
              └─> mission_submission_file (FK: submission_id)
```

---

## Key Design Patterns

1. **Idempotency**: Tables use `idempotency_key` for safe retries
2. **Polymorphic References**: `ref_type` + `ref_id` pattern for flexible linking
3. **JSON Flexibility**: `criteria_json`, `reward_json`, `meta_json` for extensibility
4. **Lifecycle Tracking**: Status fields + timestamp tracking (assigned_at, started_at, completed_at)
5. **Cascade Deletes**: Child records cascade when assignments are deleted
