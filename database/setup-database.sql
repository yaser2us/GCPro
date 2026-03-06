-- ============================================================================
-- GCPro Database Setup Script
-- ============================================================================
-- This script creates the database and all required tables for Mission APIs
-- Run this script in MySQL before starting the application
-- ============================================================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS GC_PRO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE GC_PRO;

-- ============================================================================
-- FOUNDATION TABLES (Core Infrastructure)
-- ============================================================================
-- Source: docs/database/foundation-DDL.md

-- Table: audit_log
-- Purpose: Immutable audit trail capturing who did what, when, and the result
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `actor_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `result` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'success',
  `before_json` json DEFAULT NULL,
  `after_json` json DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `occurred_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_time` (`occurred_at`),
  KEY `idx_audit_actor` (`actor_type`,`actor_id`),
  KEY `idx_audit_resource` (`resource_type`,`resource_id`),
  KEY `idx_audit_request` (`request_id`),
  KEY `idx_audit_action_result` (`action`,`result`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: outbox_event
-- Purpose: Event publishing contract for reliable event delivery with idempotency
CREATE TABLE IF NOT EXISTS `outbox_event` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `topic` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_type` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aggregate_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `aggregate_id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'new',
  `attempts` int unsigned NOT NULL DEFAULT '0',
  `idempotency_key` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `occurred_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `payload_json` json NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_outbox_idempotency` (`idempotency_key`),
  KEY `idx_outbox_status_time` (`status`,`occurred_at`),
  KEY `idx_outbox_aggregate` (`aggregate_type`,`aggregate_id`),
  KEY `idx_outbox_topic` (`topic`),
  KEY `idx_outbox_request` (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: resource_ref
-- Purpose: Cross-pillar safe reference pointer
CREATE TABLE IF NOT EXISTS `resource_ref` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `resource_type` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_id` bigint unsigned NOT NULL,
  `resource_uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_resource_type_id` (`resource_type`,`resource_id`),
  UNIQUE KEY `uk_resource_uuid` (`resource_uuid`),
  KEY `idx_resource_type_status` (`resource_type`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- MISSIONS TABLES (Business Logic)
-- ============================================================================
-- Source: docs/database/mission-DDL.md

-- Table: mission_definition
-- Purpose: Mission catalog with criteria and reward definitions
CREATE TABLE IF NOT EXISTS `mission_definition` (
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

-- Table: mission_assignment
-- Purpose: Per-user mission instance tracking status and lifecycle
-- NOTE: Requires user table to exist - skip FK constraint for now, add it later
CREATE TABLE IF NOT EXISTS `mission_assignment` (
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
  CONSTRAINT `fk_massign_mission` FOREIGN KEY (`mission_id`) REFERENCES `mission_definition` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
  -- FK to user table: CONSTRAINT `fk_massign_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: mission_event
-- Purpose: Progress events linked to assignments (idempotent via idempotency_key)
CREATE TABLE IF NOT EXISTS `mission_event` (
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

-- Table: mission_progress
-- Purpose: Metric tracking for mission completion criteria
CREATE TABLE IF NOT EXISTS `mission_progress` (
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

-- Table: mission_reward_grant
-- Purpose: Reward issuance tracking (idempotent via idempotency_key and uk_mgrant_assignment_once)
-- NOTE: Requires user table to exist - skip FK constraint for now
CREATE TABLE IF NOT EXISTS `mission_reward_grant` (
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
  CONSTRAINT `fk_mgrant_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `mission_assignment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
  -- FK to user table: CONSTRAINT `fk_mgrant_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: mission_submission
-- Purpose: User submission with review workflow and feedback
-- NOTE: Requires user table to exist - skip FK constraint for now
CREATE TABLE IF NOT EXISTS `mission_submission` (
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
  CONSTRAINT `fk_msub_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `mission_assignment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
  -- FK to user table: CONSTRAINT `fk_msub_reviewer_user` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: mission_submission_file
-- Purpose: Links files to mission submissions (polymorphic file reference)
CREATE TABLE IF NOT EXISTS `mission_submission_file` (
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

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SHOW TABLES;

SELECT 'Database setup completed successfully!' AS status;
