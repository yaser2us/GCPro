-- ============================================================================
-- GCPro Database Setup Script
-- ============================================================================
-- This script creates the database, schemas, and all required tables
-- Run this script in MySQL before starting the application
-- ============================================================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS GC_PRO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE GC_PRO;

-- ============================================================================
-- CREATE SCHEMAS
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS missions;

-- ============================================================================
-- CORE SCHEMA TABLES (Infrastructure)
-- ============================================================================

-- Table: core.idempotency
-- Purpose: Tracks idempotency keys to prevent duplicate operations
CREATE TABLE IF NOT EXISTS `core`.`idempotency` (
  `id` int NOT NULL AUTO_INCREMENT,
  `scope` varchar(120) NOT NULL,
  `idempotency_key` varchar(120) NOT NULL,
  `fingerprint` varchar(255) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'in_progress',
  `http_status` int DEFAULT NULL,
  `response_body` json DEFAULT NULL,
  `claimed_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `completed_at` timestamp NULL DEFAULT NULL,
  `ttl_seconds` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_scope_key` (`scope`, `idempotency_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: core.outbox
-- Purpose: Stores events for reliable async publishing
CREATE TABLE IF NOT EXISTS `core`.`outbox` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_name` varchar(80) NOT NULL,
  `event_version` int NOT NULL,
  `aggregate_type` varchar(60) NOT NULL,
  `aggregate_id` varchar(120) NOT NULL,
  `actor_user_id` varchar(120) NOT NULL,
  `occurred_at` timestamp NOT NULL,
  `correlation_id` varchar(120) NOT NULL,
  `causation_id` varchar(120) NOT NULL,
  `payload` json NOT NULL,
  `dedupe_key` varchar(120) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `published_at` timestamp NULL DEFAULT NULL,
  `retry_count` int NOT NULL DEFAULT '0',
  `error_message` text,
  PRIMARY KEY (`id`),
  KEY `IDX_status_occurred` (`status`, `occurred_at`),
  KEY `IDX_aggregate` (`aggregate_type`, `aggregate_id`),
  UNIQUE KEY `IDX_dedupe_key` (`dedupe_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- MISSIONS SCHEMA TABLES (Business Logic)
-- ============================================================================

-- Table: missions.mission
-- Purpose: Mission catalog with status lifecycle
CREATE TABLE IF NOT EXISTS `missions`.`mission` (
  `mission_id` varchar(36) NOT NULL,
  `external_ref` varchar(80) DEFAULT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'DRAFT',
  `title` varchar(200) NOT NULL,
  `description` text,
  `starts_at` timestamp NOT NULL,
  `ends_at` timestamp NOT NULL,
  `max_participants` int DEFAULT NULL,
  `reward_json` json NOT NULL,
  `tags_json` json DEFAULT NULL,
  `visibility` varchar(16) NOT NULL,
  `created_by_user_id` varchar(120) NOT NULL,
  `updated_by_user_id` varchar(120) DEFAULT NULL,
  `published_at` timestamp NULL DEFAULT NULL,
  `pause_reason` varchar(300) DEFAULT NULL,
  `paused_at` timestamp NULL DEFAULT NULL,
  `retire_reason` varchar(300) DEFAULT NULL,
  `retired_at` timestamp NULL DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`mission_id`),
  KEY `IDX_status` (`status`),
  KEY `IDX_visibility` (`visibility`),
  UNIQUE KEY `IDX_external_ref` (`external_ref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: missions.mission_enrollment
-- Purpose: User enrollment in missions
CREATE TABLE IF NOT EXISTS `missions`.`mission_enrollment` (
  `enrollment_id` varchar(36) NOT NULL,
  `mission_id` varchar(36) NOT NULL,
  `participant_user_id` varchar(120) NOT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'ENROLLED',
  `enrolled_at` timestamp NOT NULL,
  `last_submission_id` varchar(36) DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`enrollment_id`),
  UNIQUE KEY `IDX_mission_participant` (`mission_id`, `participant_user_id`),
  KEY `IDX_participant_status` (`participant_user_id`, `status`),
  CONSTRAINT `FK_enrollment_mission` FOREIGN KEY (`mission_id`) REFERENCES `missions`.`mission` (`mission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: missions.mission_submission
-- Purpose: User proof submissions for mission completion
CREATE TABLE IF NOT EXISTS `missions`.`mission_submission` (
  `submission_id` varchar(36) NOT NULL,
  `mission_id` varchar(36) NOT NULL,
  `enrollment_id` varchar(36) NOT NULL,
  `participant_user_id` varchar(120) NOT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'PENDING',
  `proof_type` varchar(32) NOT NULL,
  `proof_payload_json` json NOT NULL,
  `submitted_at` timestamp NOT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `approved_by_user_id` varchar(120) DEFAULT NULL,
  `approval_note` text,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `rejected_by_user_id` varchar(120) DEFAULT NULL,
  `rejection_reason` varchar(500) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`submission_id`),
  KEY `IDX_mission_enrollment` (`mission_id`, `enrollment_id`),
  KEY `IDX_participant` (`participant_user_id`),
  KEY `IDX_status` (`status`),
  CONSTRAINT `FK_submission_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `missions`.`mission_enrollment` (`enrollment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show created tables
SHOW TABLES FROM `core`;
SHOW TABLES FROM `missions`;

-- Verify table structures
DESCRIBE `core`.`idempotency`;
DESCRIBE `core`.`outbox`;
DESCRIBE `missions`.`mission`;
DESCRIBE `missions`.`mission_enrollment`;
DESCRIBE `missions`.`mission_submission`;

SELECT 'Database setup completed successfully!' AS status;
