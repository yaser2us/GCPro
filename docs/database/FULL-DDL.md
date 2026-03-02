-- GC_Pro.account definition

CREATE TABLE `account` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_account_type` (`type`),
  KEY `idx_account_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.address definition

CREATE TABLE `address` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `owner_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner_id` bigint unsigned NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `line1` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `line2` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postcode` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_address_owner` (`owner_type`,`owner_id`),
  KEY `idx_address_default` (`owner_type`,`owner_id`,`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.age_band definition

CREATE TABLE `age_band` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `min_age` int NOT NULL,
  `max_age` int NOT NULL,
  `age_factor` decimal(8,3) NOT NULL DEFAULT '1.000',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_age_band_code` (`code`),
  KEY `idx_age_band_range` (`min_age`,`max_age`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.audit_log definition

CREATE TABLE `audit_log` (
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


-- GC_Pro.benefit_catalog definition

CREATE TABLE `benefit_catalog` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `version` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'v1',
  `effective_from` datetime DEFAULT NULL,
  `effective_to` datetime DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_benefit_catalog_code_ver` (`code`,`version`),
  KEY `idx_benefit_catalog_status` (`status`),
  KEY `idx_benefit_catalog_effective` (`effective_from`,`effective_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.claim definition

CREATE TABLE `claim` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `claim_number` varchar(20) NOT NULL,
  `claim_year` int NOT NULL,
  `claim_seq` int NOT NULL,
  `account_id` bigint NOT NULL,
  `claimant_person_id` bigint NOT NULL,
  `insurant_person_id` bigint NOT NULL,
  `claim_type` varchar(50) NOT NULL,
  `status` varchar(50) NOT NULL,
  `hospital_name` varchar(255) NOT NULL,
  `admission_date` date NOT NULL,
  `discharge_date` date DEFAULT NULL,
  `diagnosis` text NOT NULL,
  `treatment_type` varchar(120) NOT NULL,
  `requested_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `approved_amount` decimal(12,2) DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `rejection_reason` text,
  `version` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_claim_number` (`claim_number`),
  UNIQUE KEY `uk_claim_year_seq` (`claim_year`,`claim_seq`),
  KEY `idx_claim_owner` (`account_id`),
  KEY `idx_claim_insurant` (`insurant_person_id`),
  KEY `idx_claim_status` (`status`),
  KEY `idx_claim_type` (`claim_type`),
  KEY `idx_claim_submitted_at` (`submitted_at`),
  KEY `idx_claim_admission_date` (`admission_date`),
  KEY `idx_claim_duplicate` (`insurant_person_id`,`admission_date`,`hospital_name`(50))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.claim_number_sequence definition

CREATE TABLE `claim_number_sequence` (
  `claim_year` int NOT NULL,
  `next_seq` int NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`claim_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.commission_program definition

CREATE TABLE `commission_program` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `currency` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MYR',
  `settlement_cycle` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'monthly',
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cp_code` (`code`),
  KEY `idx_cp_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.crowd_period definition

CREATE TABLE `crowd_period` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `period_key` varchar(20) NOT NULL,
  `period_from` datetime DEFAULT NULL,
  `period_to` datetime DEFAULT NULL,
  `case_required_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `last_debt_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `last_extra_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_required_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_collected_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `extra_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `debt_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_case` int NOT NULL DEFAULT '0',
  `total_member` int NOT NULL DEFAULT '0',
  `status` varchar(20) NOT NULL DEFAULT 'created',
  `rule_version` varchar(40) DEFAULT NULL,
  `calculated_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `meta` json DEFAULT NULL,
  `input_snapshot` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_crowd_period_uuid` (`uuid`),
  UNIQUE KEY `uk_crowd_period_key` (`period_key`),
  KEY `idx_crowd_period_status` (`status`),
  KEY `idx_crowd_period_from_to` (`period_from`,`period_to`),
  KEY `idx_crowd_period_completed` (`completed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.discount_program definition

CREATE TABLE `discount_program` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(64) NOT NULL,
  `discount_type` varchar(20) NOT NULL,
  `value` decimal(12,2) NOT NULL DEFAULT '0.00',
  `eligibility_rule_version` varchar(40) DEFAULT NULL,
  `rule_json` json DEFAULT NULL,
  `starts_at` datetime DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_discount_code` (`code`),
  KEY `idx_discount_status` (`status`),
  KEY `idx_discount_window` (`starts_at`,`ends_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.file_tag definition

CREATE TABLE `file_tag` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_file_tag_code` (`code`),
  KEY `idx_file_tag_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.file_upload definition

CREATE TABLE `file_upload` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `file_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'created',
  `owner_account_id` bigint unsigned DEFAULT NULL,
  `owner_person_id` bigint unsigned DEFAULT NULL,
  `owner_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'account',
  `purpose_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `visibility` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'private',
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_type` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extension` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size_bytes` bigint unsigned DEFAULT NULL,
  `checksum_sha256` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_provider` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_bucket` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_path` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_region` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_etag` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_at` datetime DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_file_key` (`file_key`),
  KEY `idx_file_status` (`status`),
  KEY `idx_file_owner` (`owner_type`,`owner_account_id`,`owner_person_id`),
  KEY `idx_file_purpose` (`purpose_code`,`status`),
  KEY `idx_file_uploaded` (`uploaded_at`),
  KEY `idx_file_checksum` (`checksum_sha256`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.geo_state definition

CREATE TABLE `geo_state` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `country_code` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MY',
  `state_code` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_geo_state_cc_sc` (`country_code`,`state_code`),
  KEY `idx_geo_state_status` (`status`),
  KEY `idx_geo_state_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.guideline_document definition

CREATE TABLE `guideline_document` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `scope_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'global',
  `scope_ref_type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scope_ref_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_guideline_doc_code` (`code`),
  KEY `idx_guideline_doc_status` (`status`),
  KEY `idx_guideline_doc_scope` (`scope_type`,`scope_ref_type`,`scope_ref_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.kyc definition

CREATE TABLE `kyc` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `subject_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject_id` bigint unsigned NOT NULL,
  `provider` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `verified_at` datetime DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kyc_subject` (`subject_type`,`subject_id`),
  KEY `idx_kyc_status` (`status`,`verified_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.medical_provider definition

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


-- GC_Pro.mission_definition definition

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


-- GC_Pro.notification_preference definition

CREATE TABLE `notification_preference` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `account_id` bigint NOT NULL,
  `person_id` bigint DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `quiet_hours` json DEFAULT NULL,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pref_account_person` (`account_id`,`person_id`),
  KEY `idx_pref_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.notification_template definition

CREATE TABLE `notification_template` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(80) NOT NULL,
  `name` varchar(160) NOT NULL,
  `channel` varchar(20) NOT NULL,
  `locale` varchar(10) NOT NULL DEFAULT 'en',
  `subject_tpl` text,
  `body_tpl` mediumtext NOT NULL,
  `variables_schema_json` json DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `version` varchar(40) NOT NULL DEFAULT 'v1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_template_code_ver_loc` (`code`,`version`,`locale`,`channel`),
  KEY `idx_template_code` (`code`),
  KEY `idx_template_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.outbox_event definition

CREATE TABLE `outbox_event` (
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


-- GC_Pro.payment_method definition

CREATE TABLE `payment_method` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `account_id` bigint unsigned NOT NULL,
  `person_id` bigint unsigned DEFAULT NULL,
  `provider` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `method_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `provider_customer_ref` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_method_ref` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `brand` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last4` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `exp_mm` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `exp_yyyy` varchar(4) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `consent_json` json DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pm_provider_method` (`provider`,`provider_method_ref`),
  KEY `idx_pm_account_status` (`account_id`,`status`),
  KEY `idx_pm_person` (`person_id`),
  KEY `idx_pm_provider` (`provider`,`method_type`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.permission definition

CREATE TABLE `permission` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scope` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'api',
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_permission_code` (`code`),
  KEY `idx_permission_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.policy definition

CREATE TABLE `policy` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `policy_number` varchar(40) NOT NULL,
  `account_id` bigint NOT NULL,
  `holder_person_id` bigint NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `start_at` datetime DEFAULT NULL,
  `end_at` datetime DEFAULT NULL,
  `auto_renew` tinyint(1) NOT NULL DEFAULT '0',
  `package_code_snapshot` varchar(32) DEFAULT NULL,
  `rule_version` varchar(40) DEFAULT NULL,
  `annual_fee_grace_days` int NOT NULL DEFAULT '7',
  `annual_fee_retry_limit` int NOT NULL DEFAULT '3',
  `deposit_topup_grace_days` int NOT NULL DEFAULT '14',
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_policy_number` (`policy_number`),
  KEY `idx_policy_account` (`account_id`),
  KEY `idx_policy_status` (`status`),
  KEY `idx_policy_period` (`start_at`,`end_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.policy_package definition

CREATE TABLE `policy_package` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `name` varchar(120) NOT NULL,
  `monthly_max_cap_default` decimal(12,2) NOT NULL DEFAULT '0.00',
  `deposit_capacity_multiplier` decimal(8,3) NOT NULL DEFAULT '2.000',
  `min_deposit_pct` decimal(8,3) NOT NULL DEFAULT '0.500',
  `warning_pct` decimal(8,3) NOT NULL DEFAULT '0.600',
  `urgent_pct` decimal(8,3) NOT NULL DEFAULT '0.500',
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_policy_package_code` (`code`),
  KEY `idx_policy_package_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.referral_program definition

CREATE TABLE `referral_program` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `start_at` datetime DEFAULT NULL,
  `end_at` datetime DEFAULT NULL,
  `eligibility_json` json DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rp_code` (`code`),
  KEY `idx_rp_status_time` (`status`,`start_at`,`end_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.registration_token definition

CREATE TABLE `registration_token` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `purpose` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'registration',
  `channel_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel_value` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invite_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `token` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `otp_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `meta_json` json DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_regtok_channel` (`channel_type`,`channel_value`),
  KEY `idx_regtok_invite` (`invite_code`),
  KEY `idx_regtok_token` (`token`),
  KEY `idx_regtok_status_expires` (`status`,`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.resource_ref definition

CREATE TABLE `resource_ref` (
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


-- GC_Pro.`role` definition

CREATE TABLE `role` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.smoker_profile definition

CREATE TABLE `smoker_profile` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `smoker_factor` decimal(8,3) NOT NULL DEFAULT '1.000',
  `loading_pct` decimal(8,3) NOT NULL DEFAULT '0.000',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_smoker_profile_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.survey definition

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


-- GC_Pro.`user` definition

CREATE TABLE `user` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `phone_number` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verified_at` datetime DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_phone` (`phone_number`),
  UNIQUE KEY `uk_user_email` (`email`),
  KEY `idx_user_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.wallet_batch definition

CREATE TABLE `wallet_batch` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `batch_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'created',
  `ref_type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ref_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idempotency_key` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_items` int unsigned NOT NULL DEFAULT '0',
  `success_items` int unsigned NOT NULL DEFAULT '0',
  `failed_items` int unsigned NOT NULL DEFAULT '0',
  `attempts` int unsigned NOT NULL DEFAULT '0',
  `meta_json` json DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wb_idempotency` (`idempotency_key`),
  KEY `idx_wb_type_status` (`batch_type`,`status`),
  KEY `idx_wb_ref` (`ref_type`,`ref_id`),
  KEY `idx_wb_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.bank_profile definition

CREATE TABLE `bank_profile` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `account_id` bigint unsigned NOT NULL,
  `bank_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `holder_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_no_masked` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_no_encrypted` varbinary(512) DEFAULT NULL,
  `account_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bank_profile_account` (`account_id`),
  KEY `idx_bank_profile_status` (`status`),
  CONSTRAINT `fk_bank_profile_account` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.benefit_catalog_item definition

CREATE TABLE `benefit_catalog_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `catalog_id` bigint unsigned NOT NULL,
  `item_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `limit_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'per_year',
  `limit_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `limit_count` int unsigned NOT NULL DEFAULT '0',
  `eligibility_rule_version` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `eligibility_rule_json` json DEFAULT NULL,
  `calculation_mode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'reimburse',
  `percent_value` decimal(8,3) DEFAULT NULL,
  `fixed_amount` decimal(18,2) DEFAULT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_benefit_item_code` (`catalog_id`,`item_code`),
  KEY `idx_benefit_item_status` (`status`),
  KEY `idx_benefit_item_category` (`category`),
  CONSTRAINT `fk_benefit_item_catalog` FOREIGN KEY (`catalog_id`) REFERENCES `benefit_catalog` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.benefit_level definition

CREATE TABLE `benefit_level` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `catalog_id` bigint unsigned NOT NULL,
  `level_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `level_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_benefit_level` (`catalog_id`,`level_code`),
  KEY `idx_benefit_level_sort` (`catalog_id`,`sort_order`),
  CONSTRAINT `fk_benefit_level_catalog` FOREIGN KEY (`catalog_id`) REFERENCES `benefit_catalog` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.claim_document definition

CREATE TABLE `claim_document` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `claim_id` bigint NOT NULL,
  `file_upload_id` bigint NOT NULL,
  `document_type` varchar(80) NOT NULL,
  `uploaded_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_claim_doc_unique` (`claim_id`,`file_upload_id`),
  KEY `idx_claim_doc_claim` (`claim_id`),
  KEY `idx_claim_doc_type` (`document_type`),
  CONSTRAINT `fk_claim_document_claim` FOREIGN KEY (`claim_id`) REFERENCES `claim` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.claim_event definition

CREATE TABLE `claim_event` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `claim_id` bigint NOT NULL,
  `event_type` varchar(80) NOT NULL,
  `from_status` varchar(50) DEFAULT NULL,
  `to_status` varchar(50) DEFAULT NULL,
  `actor_type` varchar(20) NOT NULL,
  `actor_id` bigint DEFAULT NULL,
  `is_internal_note` tinyint(1) NOT NULL DEFAULT '0',
  `note` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_claim_event_claim` (`claim_id`,`created_at`),
  KEY `idx_claim_event_type` (`event_type`),
  CONSTRAINT `fk_claim_event_claim` FOREIGN KEY (`claim_id`) REFERENCES `claim` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.claim_fraud_signal definition

CREATE TABLE `claim_fraud_signal` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `claim_id` bigint NOT NULL,
  `signal_type` varchar(60) NOT NULL,
  `signal_score` int NOT NULL,
  `signal_payload` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_claim_fraud_claim` (`claim_id`,`created_at`),
  KEY `idx_claim_fraud_type` (`signal_type`),
  KEY `idx_claim_fraud_score` (`signal_score`),
  CONSTRAINT `fk_claim_fraud_claim` FOREIGN KEY (`claim_id`) REFERENCES `claim` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.claim_link definition

CREATE TABLE `claim_link` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `from_claim_id` bigint NOT NULL,
  `to_claim_id` bigint NOT NULL,
  `link_type` varchar(30) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_claim_link_unique` (`from_claim_id`,`to_claim_id`,`link_type`),
  KEY `idx_claim_link_from` (`from_claim_id`),
  KEY `idx_claim_link_to` (`to_claim_id`),
  CONSTRAINT `fk_claim_link_from` FOREIGN KEY (`from_claim_id`) REFERENCES `claim` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_claim_link_to` FOREIGN KEY (`to_claim_id`) REFERENCES `claim` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.claim_review definition

CREATE TABLE `claim_review` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `claim_id` bigint NOT NULL,
  `reviewer_id` bigint NOT NULL,
  `reviewer_role` varchar(30) NOT NULL,
  `decision` varchar(40) NOT NULL,
  `decision_note` text,
  `decided_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_claim_review_claim` (`claim_id`,`created_at`),
  KEY `idx_claim_review_reviewer` (`reviewer_id`),
  CONSTRAINT `fk_claim_review_claim` FOREIGN KEY (`claim_id`) REFERENCES `claim` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.claim_settlement_flag definition

CREATE TABLE `claim_settlement_flag` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `claim_id` bigint NOT NULL,
  `period_key` char(7) NOT NULL,
  `eligible` tinyint(1) NOT NULL,
  `reason_code` varchar(60) NOT NULL DEFAULT 'OK',
  `note` text,
  `set_by_actor_type` varchar(20) NOT NULL,
  `set_by_actor_id` bigint DEFAULT NULL,
  `set_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_claim_period` (`claim_id`,`period_key`),
  KEY `idx_period_eligible` (`period_key`,`eligible`),
  KEY `idx_claim_settlement` (`claim_id`),
  CONSTRAINT `fk_claim_settlement_claim` FOREIGN KEY (`claim_id`) REFERENCES `claim` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.commission_participant definition

CREATE TABLE `commission_participant` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `program_id` bigint unsigned NOT NULL,
  `participant_type` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `participant_id` bigint unsigned NOT NULL,
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `default_payout_method` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'wallet',
  `wallet_id` bigint unsigned DEFAULT NULL,
  `bank_profile_id` bigint unsigned DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cpart_program_participant` (`program_id`,`participant_type`,`participant_id`),
  KEY `idx_cpart_status` (`program_id`,`status`),
  CONSTRAINT `fk_cpart_program` FOREIGN KEY (`program_id`) REFERENCES `commission_program` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.commission_payout_batch definition

CREATE TABLE `commission_payout_batch` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `program_id` bigint unsigned NOT NULL,
  `batch_code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'planned',
  `currency` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MYR',
  `period_start` datetime NOT NULL,
  `period_end` datetime NOT NULL,
  `total_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cpb_program_batch` (`program_id`,`batch_code`),
  KEY `idx_cpb_program_status` (`program_id`,`status`),
  KEY `idx_cpb_period` (`period_start`,`period_end`),
  CONSTRAINT `fk_cpb_program` FOREIGN KEY (`program_id`) REFERENCES `commission_program` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.commission_payout_item definition

CREATE TABLE `commission_payout_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `batch_id` bigint unsigned NOT NULL,
  `participant_id` bigint unsigned NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MYR',
  `payout_method` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'wallet',
  `ledger_txn_id` bigint unsigned DEFAULT NULL,
  `withdrawal_request_id` bigint unsigned DEFAULT NULL,
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'planned',
  `failure_reason` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cpi_batch_participant` (`batch_id`,`participant_id`),
  KEY `idx_cpi_status` (`status`),
  KEY `idx_cpi_participant` (`participant_id`),
  CONSTRAINT `fk_cpi_batch` FOREIGN KEY (`batch_id`) REFERENCES `commission_payout_batch` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cpi_participant` FOREIGN KEY (`participant_id`) REFERENCES `commission_participant` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.commission_rule definition

CREATE TABLE `commission_rule` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `program_id` bigint unsigned NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `rule_type` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'percent',
  `rate_pct` decimal(8,4) DEFAULT NULL,
  `amount_fixed` decimal(18,2) DEFAULT NULL,
  `priority` int NOT NULL DEFAULT '100',
  `conditions_json` json DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `effective_from` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `effective_to` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cr_program_code` (`program_id`,`code`),
  KEY `idx_cr_program_status_priority` (`program_id`,`status`,`priority`),
  KEY `idx_cr_effective` (`effective_from`,`effective_to`),
  CONSTRAINT `fk_cr_program` FOREIGN KEY (`program_id`) REFERENCES `commission_program` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.crowd_package_bucket definition

CREATE TABLE `crowd_package_bucket` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `crowd_period_id` bigint NOT NULL,
  `package_id` bigint NOT NULL,
  `package_code_snapshot` varchar(32) DEFAULT NULL,
  `weightage` decimal(8,3) NOT NULL DEFAULT '1.000',
  `member_count` int NOT NULL DEFAULT '0',
  `sharing_cost_each` decimal(12,2) NOT NULL DEFAULT '0.00',
  `sharing_cost_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bucket_period_package` (`crowd_period_id`,`package_id`),
  KEY `idx_bucket_period` (`crowd_period_id`),
  KEY `idx_bucket_package` (`package_id`),
  CONSTRAINT `fk_crowd_bucket_period` FOREIGN KEY (`crowd_period_id`) REFERENCES `crowd_period` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.crowd_period_claim definition

CREATE TABLE `crowd_period_claim` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `crowd_period_id` bigint NOT NULL,
  `claim_id` bigint NOT NULL,
  `period_key` varchar(20) NOT NULL,
  `approved_amount_snapshot` decimal(12,2) NOT NULL DEFAULT '0.00',
  `eligibility_version` varchar(50) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'included',
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_period_claim` (`crowd_period_id`,`claim_id`),
  KEY `idx_period_claim_period_key` (`period_key`),
  KEY `idx_period_claim_status` (`crowd_period_id`,`status`),
  KEY `idx_period_claim_claim_id` (`claim_id`),
  CONSTRAINT `fk_crowd_period_claim_period` FOREIGN KEY (`crowd_period_id`) REFERENCES `crowd_period` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.crowd_period_event definition

CREATE TABLE `crowd_period_event` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `crowd_period_id` bigint NOT NULL,
  `event_type` varchar(80) NOT NULL,
  `actor_type` varchar(20) NOT NULL,
  `actor_id` bigint DEFAULT NULL,
  `note` text,
  `payload` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_period_event_period` (`crowd_period_id`,`created_at`),
  KEY `idx_period_event_type` (`event_type`),
  CONSTRAINT `fk_period_event_period` FOREIGN KEY (`crowd_period_id`) REFERENCES `crowd_period` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.crowd_period_member definition

CREATE TABLE `crowd_period_member` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `crowd_period_id` bigint NOT NULL,
  `insurant_id` bigint NOT NULL,
  `package_id` bigint NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `reason_code` varchar(60) NOT NULL DEFAULT 'OK',
  `note` text,
  `package_code_snapshot` varchar(32) DEFAULT NULL,
  `age_years_snapshot` int DEFAULT NULL,
  `smoker_snapshot` tinyint(1) DEFAULT NULL,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_period_member` (`crowd_period_id`,`insurant_id`),
  KEY `idx_period_member_status` (`crowd_period_id`,`status`),
  KEY `idx_period_member_package` (`crowd_period_id`,`package_id`),
  CONSTRAINT `fk_period_member_period` FOREIGN KEY (`crowd_period_id`) REFERENCES `crowd_period` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.crowd_period_run definition

CREATE TABLE `crowd_period_run` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `crowd_period_id` bigint NOT NULL,
  `run_id` char(36) NOT NULL,
  `triggered_by_actor_type` varchar(20) NOT NULL DEFAULT 'system',
  `triggered_by_actor_id` bigint DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'running',
  `current_step` varchar(60) DEFAULT NULL,
  `error_message` text,
  `started_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ended_at` datetime DEFAULT NULL,
  `summary` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_period_run` (`crowd_period_id`,`run_id`),
  KEY `idx_period_run_status` (`crowd_period_id`,`status`),
  CONSTRAINT `fk_period_run_period` FOREIGN KEY (`crowd_period_id`) REFERENCES `crowd_period` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.crowd_period_run_lock definition

CREATE TABLE `crowd_period_run_lock` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `crowd_period_id` bigint NOT NULL,
  `lock_key` varchar(64) NOT NULL,
  `owner_instance_id` varchar(64) NOT NULL,
  `run_id` char(36) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'locked',
  `locked_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `heartbeat_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lease_seconds` int NOT NULL DEFAULT '300',
  `released_at` datetime DEFAULT NULL,
  `meta` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_run_lock_period_key` (`crowd_period_id`,`lock_key`),
  KEY `idx_run_lock_status` (`status`),
  KEY `idx_run_lock_heartbeat` (`heartbeat_at`),
  CONSTRAINT `fk_run_lock_period` FOREIGN KEY (`crowd_period_id`) REFERENCES `crowd_period` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.device_token definition

CREATE TABLE `device_token` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `platform` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `last_seen_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_device_token` (`platform`,`token`),
  KEY `idx_device_user` (`user_id`),
  KEY `idx_device_status` (`status`),
  CONSTRAINT `fk_device_token_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.file_access_token definition

CREATE TABLE `file_access_token` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `file_id` bigint unsigned NOT NULL,
  `token` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'download',
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `expires_at` datetime DEFAULT NULL,
  `scopes_json` json DEFAULT NULL,
  `issued_by_account_id` bigint unsigned DEFAULT NULL,
  `issued_by_person_id` bigint unsigned DEFAULT NULL,
  `issued_for` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issued_for_value` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_uses` int unsigned NOT NULL DEFAULT '0',
  `used_count` int unsigned NOT NULL DEFAULT '0',
  `last_used_at` datetime DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_file_token` (`token`),
  KEY `idx_token_file_status` (`file_id`,`status`),
  KEY `idx_token_expires` (`status`,`expires_at`),
  CONSTRAINT `fk_file_token_file` FOREIGN KEY (`file_id`) REFERENCES `file_upload` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.file_event definition

CREATE TABLE `file_event` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `file_id` bigint unsigned NOT NULL,
  `event_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `actor_id` bigint unsigned DEFAULT NULL,
  `request_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payload_json` json DEFAULT NULL,
  `occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_file_event_file_time` (`file_id`,`occurred_at`),
  KEY `idx_file_event_type` (`event_type`),
  CONSTRAINT `fk_file_event_file` FOREIGN KEY (`file_id`) REFERENCES `file_upload` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.file_link definition

CREATE TABLE `file_link` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `file_id` bigint unsigned NOT NULL,
  `target_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `meta_json` json DEFAULT NULL,
  `linked_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `removed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_file_target_role` (`file_id`,`target_type`,`target_id`,`role_code`),
  KEY `idx_link_target` (`target_type`,`target_id`,`status`),
  KEY `idx_link_file` (`file_id`,`status`),
  CONSTRAINT `fk_file_link_file` FOREIGN KEY (`file_id`) REFERENCES `file_upload` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.file_scan_result definition

CREATE TABLE `file_scan_result` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `file_id` bigint unsigned NOT NULL,
  `scan_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `provider` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `failure_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `summary` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `result_json` json DEFAULT NULL,
  `scanned_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_scan_file_type` (`file_id`,`scan_type`),
  KEY `idx_scan_status` (`scan_type`,`status`),
  CONSTRAINT `fk_scan_file` FOREIGN KEY (`file_id`) REFERENCES `file_upload` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.file_upload_tag definition

CREATE TABLE `file_upload_tag` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `file_id` bigint unsigned NOT NULL,
  `tag_id` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_file_tag_pair` (`file_id`,`tag_id`),
  KEY `idx_file_upload_tag_file` (`file_id`),
  KEY `idx_file_upload_tag_tag` (`tag_id`),
  CONSTRAINT `fk_file_upload_tag_file` FOREIGN KEY (`file_id`) REFERENCES `file_upload` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_file_upload_tag_tag` FOREIGN KEY (`tag_id`) REFERENCES `file_tag` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.file_version definition

CREATE TABLE `file_version` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `file_id` bigint unsigned NOT NULL,
  `version_no` int unsigned NOT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `content_type` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size_bytes` bigint unsigned DEFAULT NULL,
  `checksum_sha256` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_provider` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_bucket` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_path` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_etag` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_file_version` (`file_id`,`version_no`),
  KEY `idx_file_version_status` (`file_id`,`status`),
  CONSTRAINT `fk_file_version_file` FOREIGN KEY (`file_id`) REFERENCES `file_upload` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.guideline_version definition

CREATE TABLE `guideline_version` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `document_id` bigint unsigned NOT NULL,
  `version_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `locale` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'en',
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `effective_from` datetime DEFAULT NULL,
  `effective_to` datetime DEFAULT NULL,
  `checksum_sha256` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'html',
  `content_text` mediumtext COLLATE utf8mb4_unicode_ci,
  `content_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_ref_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT 'file_upload',
  `file_ref_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_guideline_ver` (`document_id`,`version_code`,`locale`),
  KEY `idx_guideline_ver_status` (`status`,`effective_from`,`effective_to`),
  KEY `idx_guideline_ver_document` (`document_id`),
  CONSTRAINT `fk_guideline_version_doc` FOREIGN KEY (`document_id`) REFERENCES `guideline_document` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.ledger_txn definition

CREATE TABLE `ledger_txn` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `account_id` bigint unsigned NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'posted',
  `ref_type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ref_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `external_ref` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idempotency_key` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `txn_group_key` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reversal_of_txn_id` bigint unsigned DEFAULT NULL,
  `occurred_at` datetime NOT NULL,
  `posted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ledger_external_ref` (`external_ref`),
  UNIQUE KEY `uk_ledger_idempotency` (`idempotency_key`),
  KEY `idx_ledger_account_time` (`account_id`,`occurred_at`),
  KEY `idx_ledger_type_time` (`type`,`occurred_at`),
  KEY `idx_ledger_status_time` (`status`,`occurred_at`),
  KEY `idx_ledger_ref` (`ref_type`,`ref_id`),
  KEY `idx_ledger_group_time` (`txn_group_key`,`occurred_at`),
  KEY `idx_ledger_reversal_of` (`reversal_of_txn_id`),
  CONSTRAINT `fk_ledger_reversal_of` FOREIGN KEY (`reversal_of_txn_id`) REFERENCES `ledger_txn` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ledger_txn_account` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.medical_case definition

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


-- GC_Pro.medical_case_event definition

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


-- GC_Pro.medical_underwriting_case definition

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


-- GC_Pro.medical_underwriting_outcome definition

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


-- GC_Pro.medical_underwriting_term definition

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


-- GC_Pro.mission_assignment definition

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


-- GC_Pro.mission_event definition

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


-- GC_Pro.mission_progress definition

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


-- GC_Pro.mission_reward_grant definition

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


-- GC_Pro.mission_submission definition

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


-- GC_Pro.mission_submission_file definition

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


-- GC_Pro.notification_channel_pref definition

CREATE TABLE `notification_channel_pref` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `preference_id` bigint NOT NULL,
  `channel` varchar(20) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `destination` varchar(191) DEFAULT NULL,
  `priority` int NOT NULL DEFAULT '1',
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pref_channel` (`preference_id`,`channel`),
  KEY `idx_channel_enabled` (`channel`,`enabled`),
  CONSTRAINT `fk_channel_pref_preference` FOREIGN KEY (`preference_id`) REFERENCES `notification_preference` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.notification_message definition

CREATE TABLE `notification_message` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `message_key` varchar(120) NOT NULL,
  `template_id` bigint NOT NULL,
  `account_id` bigint NOT NULL,
  `person_id` bigint DEFAULT NULL,
  `channel` varchar(20) NOT NULL,
  `destination` varchar(191) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'queued',
  `max_attempts` int NOT NULL DEFAULT '5',
  `attempt_count` int NOT NULL DEFAULT '0',
  `trigger_event_id` varchar(60) DEFAULT NULL,
  `trigger_event_type` varchar(120) DEFAULT NULL,
  `payload_vars` json DEFAULT NULL,
  `scheduled_for` datetime DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_message_key` (`message_key`),
  KEY `idx_message_status` (`status`,`scheduled_for`),
  KEY `idx_message_account` (`account_id`),
  KEY `idx_message_template` (`template_id`),
  CONSTRAINT `fk_message_template` FOREIGN KEY (`template_id`) REFERENCES `notification_template` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.notification_schedule definition

CREATE TABLE `notification_schedule` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `message_id` bigint NOT NULL,
  `schedule_type` varchar(20) NOT NULL,
  `step_no` int NOT NULL DEFAULT '1',
  `delay_minutes` int NOT NULL DEFAULT '0',
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `fire_at` datetime NOT NULL,
  `fired_at` datetime DEFAULT NULL,
  `meta` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_schedule_fire` (`status`,`fire_at`),
  KEY `idx_schedule_message` (`message_id`),
  CONSTRAINT `fk_schedule_message` FOREIGN KEY (`message_id`) REFERENCES `notification_message` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.onboarding_progress definition

CREATE TABLE `onboarding_progress` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `step_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `state` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `meta_json` json DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_onboarding_user_step` (`user_id`,`step_code`),
  KEY `idx_onboarding_user_state` (`user_id`,`state`),
  CONSTRAINT `fk_onboarding_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.outbox_event_consume definition

CREATE TABLE `outbox_event_consume` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `consumer_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_id` bigint unsigned NOT NULL,
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'processed',
  `attempts` int unsigned NOT NULL DEFAULT '0',
  `available_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `locked_at` datetime DEFAULT NULL,
  `lock_owner` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_error` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `processed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_consumer_event` (`consumer_name`,`event_id`),
  KEY `idx_consume_event` (`event_id`),
  KEY `idx_consume_consumer_time` (`consumer_name`,`processed_at`),
  KEY `idx_oec_pick` (`consumer_name`,`status`,`available_at`),
  KEY `idx_oec_lock` (`consumer_name`,`locked_at`),
  CONSTRAINT `fk_consume_event` FOREIGN KEY (`event_id`) REFERENCES `outbox_event` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.payment_intent definition

CREATE TABLE `payment_intent` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `intent_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `intent_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_id` bigint unsigned NOT NULL,
  `person_id` bigint unsigned DEFAULT NULL,
  `payment_method_id` bigint unsigned DEFAULT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MYR',
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'created',
  `purpose_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `ref_type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ref_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idempotency_key` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_intent_ref` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `return_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `callback_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `ledger_txn_id` bigint unsigned DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `succeeded_at` datetime DEFAULT NULL,
  `failed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pi_intent_key` (`intent_key`),
  UNIQUE KEY `uk_pi_idempotency` (`idempotency_key`),
  KEY `idx_pi_status_time` (`status`,`created_at`),
  KEY `idx_pi_account_purpose` (`account_id`,`purpose_code`,`status`),
  KEY `idx_pi_ref` (`ref_type`,`ref_id`),
  KEY `idx_pi_provider_ref` (`provider`,`provider_intent_ref`),
  KEY `fk_pi_payment_method` (`payment_method_id`),
  CONSTRAINT `fk_pi_payment_method` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.person definition

CREATE TABLE `person` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `primary_user_id` bigint unsigned DEFAULT NULL,
  `type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dob` date DEFAULT NULL,
  `gender` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nationality` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_person_primary_user` (`primary_user_id`),
  KEY `idx_person_type` (`type`),
  KEY `idx_person_status` (`status`),
  CONSTRAINT `fk_person_primary_user` FOREIGN KEY (`primary_user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.person_identity definition

CREATE TABLE `person_identity` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `person_id` bigint unsigned NOT NULL,
  `id_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_no` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `country` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_person_identity_type_no` (`id_type`,`id_no`),
  KEY `idx_person_identity_person` (`person_id`),
  CONSTRAINT `fk_person_identity_person` FOREIGN KEY (`person_id`) REFERENCES `person` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.person_relationship definition

CREATE TABLE `person_relationship` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `from_person_id` bigint unsigned NOT NULL,
  `to_person_id` bigint unsigned NOT NULL,
  `relation_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_person_relation` (`from_person_id`,`to_person_id`,`relation_type`),
  KEY `idx_person_rel_from` (`from_person_id`),
  KEY `idx_person_rel_to` (`to_person_id`),
  CONSTRAINT `fk_person_rel_from` FOREIGN KEY (`from_person_id`) REFERENCES `person` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_person_rel_to` FOREIGN KEY (`to_person_id`) REFERENCES `person` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.policy_benefit_entitlement definition

CREATE TABLE `policy_benefit_entitlement` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `policy_id` bigint NOT NULL,
  `catalog_code_snapshot` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `catalog_version_snapshot` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `level_code_snapshot` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `start_at` datetime DEFAULT NULL,
  `end_at` datetime DEFAULT NULL,
  `entitlement_json` json NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_policy_entitlement_active` (`policy_id`,`status`),
  KEY `idx_policy_entitlement_policy` (`policy_id`),
  CONSTRAINT `fk_entitlement_policy` FOREIGN KEY (`policy_id`) REFERENCES `policy` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.policy_benefit_usage definition

CREATE TABLE `policy_benefit_usage` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `policy_id` bigint NOT NULL,
  `period_key` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `used_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `used_count` int unsigned NOT NULL DEFAULT '0',
  `reserved_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `reserved_count` int unsigned NOT NULL DEFAULT '0',
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_policy_usage` (`policy_id`,`period_key`,`item_code`),
  KEY `idx_policy_usage_policy_period` (`policy_id`,`period_key`),
  KEY `idx_policy_usage_status` (`status`),
  CONSTRAINT `fk_usage_policy` FOREIGN KEY (`policy_id`) REFERENCES `policy` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.policy_benefit_usage_event definition

CREATE TABLE `policy_benefit_usage_event` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `usage_id` bigint unsigned NOT NULL,
  `event_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ref_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ref_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `count` int unsigned NOT NULL DEFAULT '0',
  `idempotency_key` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload_json` json DEFAULT NULL,
  `occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_usage_event_idem` (`idempotency_key`),
  KEY `idx_usage_event_usage_time` (`usage_id`,`occurred_at`),
  KEY `idx_usage_event_ref` (`ref_type`,`ref_id`),
  CONSTRAINT `fk_usage_event_usage` FOREIGN KEY (`usage_id`) REFERENCES `policy_benefit_usage` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.policy_billing_plan definition

CREATE TABLE `policy_billing_plan` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `policy_id` bigint NOT NULL,
  `billing_type` varchar(20) NOT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `installment_count` int NOT NULL DEFAULT '1',
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `activated_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_billing_plan_policy` (`policy_id`),
  KEY `idx_billing_plan_status` (`status`),
  CONSTRAINT `fk_billing_plan_policy` FOREIGN KEY (`policy_id`) REFERENCES `policy` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.policy_deposit_requirement definition

CREATE TABLE `policy_deposit_requirement` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `policy_id` bigint NOT NULL,
  `monthly_max_cap` decimal(12,2) NOT NULL DEFAULT '0.00',
  `deposit_capacity_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `min_required_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `warning_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `urgent_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `deposit_wallet_id` bigint DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ok',
  `last_evaluated_at` datetime DEFAULT NULL,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_deposit_req_policy` (`policy_id`),
  KEY `idx_deposit_req_status` (`status`),
  CONSTRAINT `fk_deposit_req_policy` FOREIGN KEY (`policy_id`) REFERENCES `policy` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.policy_discount_applied definition

CREATE TABLE `policy_discount_applied` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `policy_id` bigint NOT NULL,
  `discount_program_id` bigint NOT NULL,
  `amount_applied` decimal(12,2) NOT NULL DEFAULT '0.00',
  `applied_to` varchar(40) NOT NULL DEFAULT 'annual_fee',
  `applied_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `meta` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_policy_discount_policy` (`policy_id`),
  KEY `idx_policy_discount_program` (`discount_program_id`),
  CONSTRAINT `fk_policy_discount_policy` FOREIGN KEY (`policy_id`) REFERENCES `policy` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_policy_discount_program` FOREIGN KEY (`discount_program_id`) REFERENCES `discount_program` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.policy_installment definition

CREATE TABLE `policy_installment` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `billing_plan_id` bigint NOT NULL,
  `installment_no` int NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `due_at` datetime NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `paid_at` datetime DEFAULT NULL,
  `payment_method` varchar(20) DEFAULT NULL,
  `payment_ref` varchar(64) DEFAULT NULL,
  `idempotency_key` varchar(64) NOT NULL,
  `attempts` int NOT NULL DEFAULT '0',
  `last_attempt_at` datetime DEFAULT NULL,
  `failure_code` varchar(60) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_installment_idem` (`idempotency_key`),
  UNIQUE KEY `uk_installment_no` (`billing_plan_id`,`installment_no`),
  KEY `idx_installment_plan_status` (`billing_plan_id`,`status`),
  KEY `idx_installment_due` (`due_at`),
  KEY `idx_installment_payment_ref` (`payment_ref`),
  CONSTRAINT `fk_installment_plan` FOREIGN KEY (`billing_plan_id`) REFERENCES `policy_billing_plan` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.policy_member definition

CREATE TABLE `policy_member` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `policy_id` bigint NOT NULL,
  `person_id` bigint NOT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'dependent',
  `dob_snapshot` date DEFAULT NULL,
  `age_years_snapshot` int DEFAULT NULL,
  `smoker_snapshot` tinyint(1) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `added_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `removed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_policy_person` (`policy_id`,`person_id`),
  KEY `idx_policy_member_policy` (`policy_id`),
  KEY `idx_policy_member_status` (`policy_id`,`status`),
  CONSTRAINT `fk_policy_member_policy` FOREIGN KEY (`policy_id`) REFERENCES `policy` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.policy_package_rate definition

CREATE TABLE `policy_package_rate` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `package_id` bigint NOT NULL,
  `age_band_id` bigint NOT NULL,
  `smoker_profile_id` bigint NOT NULL,
  `annual_fee_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `monthly_max_cap` decimal(12,2) NOT NULL DEFAULT '0.00',
  `weightage_factor` decimal(12,4) DEFAULT NULL,
  `rate_version` varchar(40) NOT NULL,
  `effective_from` datetime NOT NULL,
  `effective_to` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rate_unique` (`package_id`,`age_band_id`,`smoker_profile_id`,`rate_version`,`effective_from`),
  KEY `idx_rate_lookup` (`package_id`,`age_band_id`,`smoker_profile_id`,`effective_from`,`effective_to`),
  KEY `idx_rate_version` (`rate_version`),
  KEY `fk_rate_age_band` (`age_band_id`),
  KEY `fk_rate_smoker` (`smoker_profile_id`),
  CONSTRAINT `fk_rate_age_band` FOREIGN KEY (`age_band_id`) REFERENCES `age_band` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_rate_package` FOREIGN KEY (`package_id`) REFERENCES `policy_package` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_rate_smoker` FOREIGN KEY (`smoker_profile_id`) REFERENCES `smoker_profile` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.policy_remediation_case definition

CREATE TABLE `policy_remediation_case` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `policy_id` bigint NOT NULL,
  `reason_code` varchar(60) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'open',
  `opened_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `grace_end_at` datetime DEFAULT NULL,
  `cleared_at` datetime DEFAULT NULL,
  `expired_at` datetime DEFAULT NULL,
  `required_actions` json DEFAULT NULL,
  `meta` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_remediation_policy_status` (`policy_id`,`status`),
  KEY `idx_remediation_grace` (`grace_end_at`),
  CONSTRAINT `fk_remediation_policy` FOREIGN KEY (`policy_id`) REFERENCES `policy` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.policy_status_event definition

CREATE TABLE `policy_status_event` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `policy_id` bigint NOT NULL,
  `event_type` varchar(60) NOT NULL,
  `from_status` varchar(20) DEFAULT NULL,
  `to_status` varchar(20) DEFAULT NULL,
  `trigger_code` varchar(60) NOT NULL,
  `actor_type` varchar(20) NOT NULL,
  `actor_id` bigint DEFAULT NULL,
  `note` text,
  `payload` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_policy_event_policy` (`policy_id`,`created_at`),
  KEY `idx_policy_event_type` (`event_type`),
  CONSTRAINT `fk_policy_event_policy` FOREIGN KEY (`policy_id`) REFERENCES `policy` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.receipt definition

CREATE TABLE `receipt` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `receipt_no` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_id` bigint unsigned NOT NULL,
  `person_id` bigint unsigned DEFAULT NULL,
  `payment_intent_id` bigint unsigned DEFAULT NULL,
  `ledger_txn_id` bigint unsigned DEFAULT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MYR',
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'issued',
  `issued_at` datetime NOT NULL,
  `voided_at` datetime DEFAULT NULL,
  `ref_type` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ref_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_receipt_no` (`receipt_no`),
  KEY `idx_receipt_account_time` (`account_id`,`issued_at`),
  KEY `idx_receipt_person_time` (`person_id`,`issued_at`),
  KEY `idx_receipt_status_time` (`status`,`issued_at`),
  KEY `idx_receipt_ref` (`ref_type`,`ref_id`),
  KEY `idx_receipt_payment_intent` (`payment_intent_id`),
  KEY `idx_receipt_ledger_txn` (`ledger_txn_id`),
  CONSTRAINT `fk_receipt_account` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_receipt_ledger_txn` FOREIGN KEY (`ledger_txn_id`) REFERENCES `ledger_txn` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_receipt_person` FOREIGN KEY (`person_id`) REFERENCES `person` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_receipt_pi` FOREIGN KEY (`payment_intent_id`) REFERENCES `payment_intent` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.referral_code definition

CREATE TABLE `referral_code` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `program_id` bigint unsigned NOT NULL,
  `owner_user_id` bigint unsigned NOT NULL,
  `code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rc_program_code` (`program_id`,`code`),
  KEY `idx_rc_owner` (`owner_user_id`,`status`),
  CONSTRAINT `fk_rc_owner_user` FOREIGN KEY (`owner_user_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_rc_program` FOREIGN KEY (`program_id`) REFERENCES `referral_program` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.referral_invite definition

CREATE TABLE `referral_invite` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `program_id` bigint unsigned NOT NULL,
  `referral_code_id` bigint unsigned NOT NULL,
  `referrer_user_id` bigint unsigned NOT NULL,
  `channel_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'link',
  `channel_value` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invite_token` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'created',
  `sent_at` datetime DEFAULT NULL,
  `clicked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ri_invite_token` (`invite_token`),
  KEY `idx_ri_referrer_status` (`referrer_user_id`,`status`),
  KEY `idx_ri_program_time` (`program_id`,`created_at`),
  KEY `fk_ri_code` (`referral_code_id`),
  CONSTRAINT `fk_ri_code` FOREIGN KEY (`referral_code_id`) REFERENCES `referral_code` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ri_program` FOREIGN KEY (`program_id`) REFERENCES `referral_program` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ri_referrer_user` FOREIGN KEY (`referrer_user_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.referral_rule definition

CREATE TABLE `referral_rule` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `program_id` bigint unsigned NOT NULL,
  `rule_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operator` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'eq',
  `value_str` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `value_num` decimal(18,6) DEFAULT NULL,
  `value_json` json DEFAULT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rr_program_rulecode` (`program_id`,`rule_code`),
  KEY `idx_rr_rule_code` (`rule_code`),
  CONSTRAINT `fk_rr_program` FOREIGN KEY (`program_id`) REFERENCES `referral_program` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.role_permission definition

CREATE TABLE `role_permission` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `role_id` bigint unsigned NOT NULL,
  `permission_id` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permission` (`role_id`,`permission_id`),
  KEY `idx_rp_permission` (`permission_id`),
  CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permission` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.survey_version definition

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


-- GC_Pro.user_credential definition

CREATE TABLE `user_credential` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `secret_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_ref` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_credential_user` (`user_id`),
  KEY `idx_user_credential_type` (`type`),
  CONSTRAINT `fk_user_credential_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.user_permission definition

CREATE TABLE `user_permission` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `permission_id` bigint unsigned NOT NULL,
  `effect` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'allow',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_permission` (`user_id`,`permission_id`),
  KEY `idx_up_permission` (`permission_id`),
  CONSTRAINT `fk_up_permission` FOREIGN KEY (`permission_id`) REFERENCES `permission` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_up_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.user_role definition

CREATE TABLE `user_role` (
  `user_id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `idx_user_role_role` (`role_id`),
  CONSTRAINT `fk_user_role_role` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_user_role_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.verification_status definition

CREATE TABLE `verification_status` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `account_id` bigint unsigned NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `meta_json` json DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_verification_account_type` (`account_id`,`type`),
  KEY `idx_verification_status` (`type`,`status`),
  CONSTRAINT `fk_verification_account` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.wallet definition

CREATE TABLE `wallet` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `account_id` bigint unsigned NOT NULL,
  `wallet_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MAIN',
  `currency` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MYR',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wallet_account_currency_type` (`account_id`,`currency`,`wallet_type`),
  KEY `idx_wallet_status` (`status`),
  KEY `idx_wallet_type_status` (`wallet_type`,`status`),
  CONSTRAINT `fk_wallet_account` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.wallet_balance_snapshot definition

CREATE TABLE `wallet_balance_snapshot` (
  `wallet_id` bigint unsigned NOT NULL,
  `available_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `held_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MYR',
  `as_of` datetime NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`wallet_id`),
  CONSTRAINT `fk_wbs_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallet` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.wallet_batch_item definition

CREATE TABLE `wallet_batch_item` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `batch_id` bigint unsigned NOT NULL,
  `wallet_id` bigint unsigned NOT NULL,
  `account_id` bigint unsigned NOT NULL,
  `item_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MYR',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'created',
  `failure_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ref_type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ref_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idempotency_key` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wbi_idempotency` (`idempotency_key`),
  KEY `idx_wbi_batch_status` (`batch_id`,`status`),
  KEY `idx_wbi_wallet` (`wallet_id`),
  KEY `idx_wbi_account` (`account_id`),
  KEY `idx_wbi_ref` (`ref_type`,`ref_id`),
  CONSTRAINT `fk_wbi_account` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_wbi_batch` FOREIGN KEY (`batch_id`) REFERENCES `wallet_batch` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_wbi_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallet` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.wallet_deposit_intent definition

CREATE TABLE `wallet_deposit_intent` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wallet_id` bigint unsigned NOT NULL,
  `account_id` bigint unsigned NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MYR',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'created',
  `ref_type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ref_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idempotency_key` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wdi_idempotency` (`idempotency_key`),
  KEY `idx_wdi_wallet_status` (`wallet_id`,`status`),
  KEY `idx_wdi_account` (`account_id`),
  KEY `idx_wdi_ref` (`ref_type`,`ref_id`),
  CONSTRAINT `fk_wdi_account` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_wdi_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallet` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.wallet_hold definition

CREATE TABLE `wallet_hold` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wallet_id` bigint unsigned NOT NULL,
  `reason_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MYR',
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `ref_type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ref_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idempotency_key` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `captured_at` datetime DEFAULT NULL,
  `released_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wallet_hold_idempotency` (`idempotency_key`),
  KEY `idx_wh_wallet_status` (`wallet_id`,`status`),
  KEY `idx_wh_reason` (`reason_code`),
  KEY `idx_wh_ref` (`ref_type`,`ref_id`),
  KEY `idx_wh_expires` (`expires_at`),
  KEY `idx_wallet_hold_ref` (`ref_type`,`ref_id`),
  KEY `idx_wallet_hold_wallet_status` (`wallet_id`,`status`),
  KEY `idx_wallet_hold_expires` (`status`,`expires_at`),
  CONSTRAINT `fk_wh_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallet` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.wallet_policy_gate definition

CREATE TABLE `wallet_policy_gate` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wallet_id` bigint unsigned NOT NULL,
  `gate_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'on',
  `meta_json` json DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wpg_wallet_gate` (`wallet_id`,`gate_code`),
  KEY `idx_wpg_status` (`gate_code`,`status`),
  CONSTRAINT `fk_wpg_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallet` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.wallet_rule_set definition

CREATE TABLE `wallet_rule_set` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wallet_id` bigint unsigned NOT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `version` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'v1',
  `effective_from` datetime DEFAULT NULL,
  `effective_to` datetime DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wrs_wallet_status` (`wallet_id`,`status`),
  KEY `idx_wrs_effective` (`effective_from`,`effective_to`),
  CONSTRAINT `fk_wrs_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallet` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.wallet_spend_intent definition

CREATE TABLE `wallet_spend_intent` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wallet_id` bigint unsigned NOT NULL,
  `account_id` bigint unsigned NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MYR',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'created',
  `ref_type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ref_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idempotency_key` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wsi_idempotency` (`idempotency_key`),
  KEY `idx_wsi_wallet_status` (`wallet_id`,`status`),
  KEY `idx_wsi_account` (`account_id`),
  KEY `idx_wsi_ref` (`ref_type`,`ref_id`),
  CONSTRAINT `fk_wsi_account` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_wsi_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallet` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.wallet_threshold_event definition

CREATE TABLE `wallet_threshold_event` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wallet_id` bigint unsigned NOT NULL,
  `threshold_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `current_balance` decimal(18,2) NOT NULL,
  `threshold_amount` decimal(18,2) NOT NULL,
  `currency` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MYR',
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'breached',
  `idempotency_key` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payload_json` json DEFAULT NULL,
  `occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wte_idempotency` (`idempotency_key`),
  KEY `idx_wte_wallet_time` (`wallet_id`,`occurred_at`),
  KEY `idx_wte_code_status` (`threshold_code`,`status`),
  CONSTRAINT `fk_wte_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallet` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.wallet_threshold_rule definition

CREATE TABLE `wallet_threshold_rule` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wallet_id` bigint unsigned NOT NULL,
  `threshold_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `threshold_amount` decimal(18,2) NOT NULL,
  `currency` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MYR',
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wtr_wallet_code` (`wallet_id`,`threshold_code`),
  KEY `idx_wtr_status` (`status`),
  CONSTRAINT `fk_wtr_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallet` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.wallet_withdrawal_request definition

CREATE TABLE `wallet_withdrawal_request` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wallet_id` bigint unsigned NOT NULL,
  `account_id` bigint unsigned NOT NULL,
  `bank_profile_id` bigint unsigned NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MYR',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requested',
  `reject_reason_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `requested_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `decided_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wwr_wallet_status` (`wallet_id`,`status`),
  KEY `idx_wwr_account` (`account_id`),
  KEY `idx_wwr_bank` (`bank_profile_id`),
  KEY `idx_wwr_requested` (`requested_at`),
  CONSTRAINT `fk_wwr_account` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_wwr_bank_profile` FOREIGN KEY (`bank_profile_id`) REFERENCES `bank_profile` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_wwr_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallet` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.account_person definition

CREATE TABLE `account_person` (
  `account_id` bigint unsigned NOT NULL,
  `person_id` bigint unsigned NOT NULL,
  `role` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'owner',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`account_id`,`person_id`),
  KEY `idx_account_person_person` (`person_id`),
  CONSTRAINT `fk_account_person_account` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_account_person_person` FOREIGN KEY (`person_id`) REFERENCES `person` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.commission_accrual definition

CREATE TABLE `commission_accrual` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `program_id` bigint unsigned NOT NULL,
  `participant_id` bigint unsigned NOT NULL,
  `rule_id` bigint unsigned DEFAULT NULL,
  `accrual_type` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'recurring',
  `currency` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MYR',
  `base_amount` decimal(18,2) DEFAULT NULL,
  `rate_pct` decimal(8,4) DEFAULT NULL,
  `amount` decimal(18,2) NOT NULL,
  `source_ref_type` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_ref_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idempotency_key` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'accrued',
  `occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ca_idempotency` (`idempotency_key`),
  KEY `idx_ca_participant_time` (`participant_id`,`occurred_at`),
  KEY `idx_ca_program_status_time` (`program_id`,`status`,`occurred_at`),
  KEY `idx_ca_source_ref` (`source_ref_type`,`source_ref_id`),
  KEY `fk_ca_rule` (`rule_id`),
  CONSTRAINT `fk_ca_participant` FOREIGN KEY (`participant_id`) REFERENCES `commission_participant` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ca_program` FOREIGN KEY (`program_id`) REFERENCES `commission_program` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ca_rule` FOREIGN KEY (`rule_id`) REFERENCES `commission_rule` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.commission_payout_item_accrual definition

CREATE TABLE `commission_payout_item_accrual` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `payout_item_id` bigint unsigned NOT NULL,
  `accrual_id` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cpia_once` (`payout_item_id`,`accrual_id`),
  KEY `idx_cpia_accrual` (`accrual_id`),
  CONSTRAINT `fk_cpia_accrual` FOREIGN KEY (`accrual_id`) REFERENCES `commission_accrual` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cpia_item` FOREIGN KEY (`payout_item_id`) REFERENCES `commission_payout_item` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.crowd_claim_payout definition

CREATE TABLE `crowd_claim_payout` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `crowd_period_id` bigint NOT NULL,
  `crowd_period_claim_id` bigint NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `method` varchar(20) NOT NULL DEFAULT 'wallet',
  `payout_ref` varchar(64) DEFAULT NULL,
  `ledger_txn_id` bigint DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'planned',
  `failure_reason` text,
  `idempotency_key` varchar(64) NOT NULL,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_claim_payout_idem` (`idempotency_key`),
  UNIQUE KEY `uk_claim_payout_once` (`crowd_period_claim_id`),
  KEY `idx_claim_payout_status` (`crowd_period_id`,`status`),
  CONSTRAINT `fk_claim_payout_period` FOREIGN KEY (`crowd_period_id`) REFERENCES `crowd_period` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_claim_payout_period_claim` FOREIGN KEY (`crowd_period_claim_id`) REFERENCES `crowd_period_claim` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.crowd_member_charge definition

CREATE TABLE `crowd_member_charge` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `crowd_period_id` bigint NOT NULL,
  `insurant_id` bigint NOT NULL,
  `package_bucket_id` bigint NOT NULL,
  `charge_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `cap_amount` decimal(12,2) DEFAULT NULL,
  `calc_version` varchar(40) DEFAULT NULL,
  `calc_breakdown` json DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'planned',
  `attempts` int NOT NULL DEFAULT '0',
  `paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `remaining_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `due_at` datetime DEFAULT NULL,
  `last_attempt_at` datetime DEFAULT NULL,
  `idempotency_key` varchar(64) NOT NULL,
  `meta` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_member_charge_idem` (`idempotency_key`),
  UNIQUE KEY `uk_member_charge_period_insurant` (`crowd_period_id`,`insurant_id`),
  KEY `idx_member_charge_period_status` (`crowd_period_id`,`status`),
  KEY `idx_member_charge_insurant` (`insurant_id`),
  KEY `idx_member_charge_due` (`due_at`),
  KEY `fk_member_charge_bucket` (`package_bucket_id`),
  CONSTRAINT `fk_member_charge_bucket` FOREIGN KEY (`package_bucket_id`) REFERENCES `crowd_package_bucket` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_member_charge_period` FOREIGN KEY (`crowd_period_id`) REFERENCES `crowd_period` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.guarantee_letter definition

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


-- GC_Pro.guideline_acceptance definition

CREATE TABLE `guideline_acceptance` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `version_id` bigint unsigned NOT NULL,
  `account_id` bigint unsigned DEFAULT NULL,
  `person_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `acceptance_status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'accepted',
  `channel` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'app',
  `source` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `request_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idempotency_key` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accepted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_guideline_accept_idem` (`idempotency_key`),
  UNIQUE KEY `uk_guideline_accept_once` (`version_id`,`account_id`,`person_id`,`user_id`),
  KEY `idx_guideline_accept_version` (`version_id`,`accepted_at`),
  KEY `idx_guideline_accept_account` (`account_id`,`accepted_at`),
  KEY `idx_guideline_accept_person` (`person_id`,`accepted_at`),
  KEY `idx_guideline_accept_user` (`user_id`,`accepted_at`),
  KEY `idx_guideline_accept_status` (`acceptance_status`),
  CONSTRAINT `fk_guideline_accept_version` FOREIGN KEY (`version_id`) REFERENCES `guideline_version` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.ledger_entry definition

CREATE TABLE `ledger_entry` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `txn_id` bigint unsigned NOT NULL,
  `account_id` bigint unsigned NOT NULL,
  `entry_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'principal',
  `direction` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MYR',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ledger_entry_txn` (`txn_id`),
  KEY `idx_ledger_entry_currency` (`currency`),
  KEY `idx_ledger_entry_account_time` (`account_id`,`created_at`),
  KEY `idx_ledger_entry_type` (`entry_type`),
  CONSTRAINT `fk_ledger_entry_account` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ledger_entry_txn` FOREIGN KEY (`txn_id`) REFERENCES `ledger_txn` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.medical_underwriting_current definition

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


-- GC_Pro.notification_delivery_attempt definition

CREATE TABLE `notification_delivery_attempt` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `message_id` bigint NOT NULL,
  `attempt_no` int NOT NULL,
  `provider` varchar(40) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'sending',
  `provider_ref` varchar(120) DEFAULT NULL,
  `error_code` varchar(60) DEFAULT NULL,
  `error_message` text,
  `provider_payload` json DEFAULT NULL,
  `started_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_attempt_message` (`message_id`,`attempt_no`),
  KEY `idx_attempt_status` (`status`),
  KEY `idx_attempt_provider_ref` (`provider_ref`),
  CONSTRAINT `fk_attempt_message` FOREIGN KEY (`message_id`) REFERENCES `notification_message` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.payment_attempt definition

CREATE TABLE `payment_attempt` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `intent_id` bigint unsigned NOT NULL,
  `attempt_no` int unsigned NOT NULL DEFAULT '1',
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'initiated',
  `provider` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_txn_ref` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_status` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `failure_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `failure_message` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_json` json DEFAULT NULL,
  `response_json` json DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pa_intent_attempt` (`intent_id`,`attempt_no`),
  KEY `idx_pa_status_time` (`status`,`created_at`),
  KEY `idx_pa_provider_txn` (`provider`,`provider_txn_ref`),
  CONSTRAINT `fk_pa_intent` FOREIGN KEY (`intent_id`) REFERENCES `payment_intent` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.payment_event definition

CREATE TABLE `payment_event` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `intent_id` bigint unsigned NOT NULL,
  `event_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `actor_id` bigint unsigned DEFAULT NULL,
  `request_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payload_json` json DEFAULT NULL,
  `occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pe_intent_time` (`intent_id`,`occurred_at`),
  KEY `idx_pe_type` (`event_type`),
  CONSTRAINT `fk_pe_intent` FOREIGN KEY (`intent_id`) REFERENCES `payment_intent` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.payment_webhook_inbox definition

CREATE TABLE `payment_webhook_inbox` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `provider` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_event_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'new',
  `signature_status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unknown',
  `intent_key` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_txn_ref` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attempt_id` bigint unsigned DEFAULT NULL,
  `received_ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `headers_json` json DEFAULT NULL,
  `payload_json` json NOT NULL,
  `idempotency_key` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attempts` int unsigned NOT NULL DEFAULT '0',
  `received_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pwi_idempotency` (`idempotency_key`),
  UNIQUE KEY `uk_pwi_provider_event` (`provider`,`provider_event_id`),
  KEY `idx_pwi_status_time` (`status`,`received_at`),
  KEY `idx_pwi_provider_txn` (`provider`,`provider_txn_ref`),
  KEY `fk_pwi_attempt` (`attempt_id`),
  CONSTRAINT `fk_pwi_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `payment_attempt` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.referral_conversion definition

CREATE TABLE `referral_conversion` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `program_id` bigint unsigned NOT NULL,
  `invite_id` bigint unsigned NOT NULL,
  `referred_user_id` bigint unsigned NOT NULL,
  `status` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'converted',
  `converted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `conversion_ref_type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `conversion_ref_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rcv_program_referred_user` (`program_id`,`referred_user_id`),
  UNIQUE KEY `uk_rcv_invite_once` (`invite_id`),
  KEY `idx_rcv_program_time` (`program_id`,`converted_at`),
  KEY `idx_rcv_ref` (`conversion_ref_type`,`conversion_ref_id`),
  KEY `fk_rcv_referred_user` (`referred_user_id`),
  CONSTRAINT `fk_rcv_invite` FOREIGN KEY (`invite_id`) REFERENCES `referral_invite` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_rcv_program` FOREIGN KEY (`program_id`) REFERENCES `referral_program` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rcv_referred_user` FOREIGN KEY (`referred_user_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.referral_event definition

CREATE TABLE `referral_event` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `program_id` bigint unsigned NOT NULL,
  `invite_id` bigint unsigned DEFAULT NULL,
  `conversion_id` bigint unsigned DEFAULT NULL,
  `event_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_user_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ref_type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ref_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payload_json` json DEFAULT NULL,
  `idempotency_key` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_revent_idempotency` (`idempotency_key`),
  KEY `idx_revent_program_time` (`program_id`,`occurred_at`),
  KEY `idx_revent_invite` (`invite_id`,`occurred_at`),
  KEY `idx_revent_conversion` (`conversion_id`,`occurred_at`),
  KEY `idx_revent_ref` (`ref_type`,`ref_id`),
  CONSTRAINT `fk_revent_conversion` FOREIGN KEY (`conversion_id`) REFERENCES `referral_conversion` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_revent_invite` FOREIGN KEY (`invite_id`) REFERENCES `referral_invite` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_revent_program` FOREIGN KEY (`program_id`) REFERENCES `referral_program` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.referral_reward_grant definition

CREATE TABLE `referral_reward_grant` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `program_id` bigint unsigned NOT NULL,
  `conversion_id` bigint unsigned NOT NULL,
  `beneficiary_user_id` bigint unsigned NOT NULL,
  `beneficiary_role` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
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
  UNIQUE KEY `uk_rrg_conversion_role` (`conversion_id`,`beneficiary_role`),
  UNIQUE KEY `uk_rrg_idempotency` (`idempotency_key`),
  KEY `idx_rrg_user_time` (`beneficiary_user_id`,`granted_at`),
  KEY `idx_rrg_ref` (`ref_type`,`ref_id`),
  KEY `fk_rrg_program` (`program_id`),
  CONSTRAINT `fk_rrg_beneficiary_user` FOREIGN KEY (`beneficiary_user_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_rrg_conversion` FOREIGN KEY (`conversion_id`) REFERENCES `referral_conversion` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rrg_program` FOREIGN KEY (`program_id`) REFERENCES `referral_program` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.survey_question definition

CREATE TABLE `survey_question` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `survey_version_id` bigint unsigned NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `help_text` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `answer_type` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `required` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `rules_json` json DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sq_code` (`survey_version_id`,`code`),
  KEY `idx_sq_version_sort` (`survey_version_id`,`sort_order`),
  KEY `idx_sq_answer_type` (`answer_type`),
  CONSTRAINT `fk_sq_version` FOREIGN KEY (`survey_version_id`) REFERENCES `survey_version` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.survey_question_option definition

CREATE TABLE `survey_question_option` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `question_id` bigint unsigned NOT NULL,
  `value` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sqo_question_value` (`question_id`,`value`),
  KEY `idx_sqo_question_sort` (`question_id`,`sort_order`),
  CONSTRAINT `fk_sqo_question` FOREIGN KEY (`question_id`) REFERENCES `survey_question` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.survey_response definition

CREATE TABLE `survey_response` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `survey_version_id` bigint unsigned NOT NULL,
  `actor_ref_id` bigint unsigned NOT NULL,
  `subject_ref_id` bigint unsigned NOT NULL,
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `submitted_at` datetime DEFAULT NULL,
  `created_by_user_id` bigint unsigned DEFAULT NULL,
  `idempotency_key` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sr_idempotency` (`idempotency_key`),
  KEY `idx_sr_subject_time` (`subject_ref_id`,`created_at`),
  KEY `idx_sr_actor_time` (`actor_ref_id`,`created_at`),
  KEY `idx_sr_status_time` (`status`,`submitted_at`),
  KEY `idx_sr_version_time` (`survey_version_id`,`created_at`),
  CONSTRAINT `fk_sr_actor_ref` FOREIGN KEY (`actor_ref_id`) REFERENCES `resource_ref` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sr_subject_ref` FOREIGN KEY (`subject_ref_id`) REFERENCES `resource_ref` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sr_version` FOREIGN KEY (`survey_version_id`) REFERENCES `survey_version` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.survey_response_file definition

CREATE TABLE `survey_response_file` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `response_id` bigint unsigned NOT NULL,
  `file_upload_id` bigint unsigned NOT NULL,
  `kind` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'evidence',
  `sort_order` int NOT NULL DEFAULT '0',
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_srf_response_file` (`response_id`,`file_upload_id`),
  KEY `idx_srf_response_sort` (`response_id`,`sort_order`),
  KEY `idx_srf_file` (`file_upload_id`),
  CONSTRAINT `fk_srf_response` FOREIGN KEY (`response_id`) REFERENCES `survey_response` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.wallet_payout_attempt definition

CREATE TABLE `wallet_payout_attempt` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `withdrawal_request_id` bigint unsigned NOT NULL,
  `provider` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_ref` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'initiated',
  `failure_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_json` json DEFAULT NULL,
  `response_json` json DEFAULT NULL,
  `attempted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wpa_withdrawal` (`withdrawal_request_id`),
  KEY `idx_wpa_status` (`status`),
  KEY `idx_wpa_provider_ref` (`provider`,`provider_ref`),
  CONSTRAINT `fk_wpa_withdrawal` FOREIGN KEY (`withdrawal_request_id`) REFERENCES `wallet_withdrawal_request` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.wallet_rule definition

CREATE TABLE `wallet_rule` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `rule_set_id` bigint unsigned NOT NULL,
  `rule_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operator` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'eq',
  `value_str` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `value_num` decimal(18,6) DEFAULT NULL,
  `value_json` json DEFAULT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wr_ruleset_code` (`rule_set_id`,`rule_code`),
  KEY `idx_wr_code` (`rule_code`),
  KEY `idx_wr_status` (`status`),
  CONSTRAINT `fk_wr_ruleset` FOREIGN KEY (`rule_set_id`) REFERENCES `wallet_rule_set` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.crowd_contribution definition

CREATE TABLE `crowd_contribution` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `crowd_member_charge_id` bigint NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `method` varchar(20) NOT NULL,
  `payment_ref` varchar(64) DEFAULT NULL,
  `ledger_txn_id` bigint DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `idempotency_key` varchar(64) NOT NULL,
  `reversal_of_contribution_id` bigint DEFAULT NULL,
  `reason_code` varchar(60) NOT NULL DEFAULT 'OK',
  `gateway_payload` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_contrib_idem` (`idempotency_key`),
  KEY `idx_contrib_charge` (`crowd_member_charge_id`,`created_at`),
  KEY `idx_contrib_status` (`status`),
  KEY `idx_contrib_payment_ref` (`payment_ref`),
  KEY `idx_contrib_reversal` (`reversal_of_contribution_id`),
  CONSTRAINT `fk_contrib_charge` FOREIGN KEY (`crowd_member_charge_id`) REFERENCES `crowd_member_charge` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_contrib_reversal_of` FOREIGN KEY (`reversal_of_contribution_id`) REFERENCES `crowd_contribution` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- GC_Pro.medical_underwriting_evidence definition

CREATE TABLE `medical_underwriting_evidence` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `case_id` bigint unsigned NOT NULL,
  `evidence_type` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'survey',
  `survey_response_id` bigint unsigned DEFAULT NULL,
  `note` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_muwe_case_time` (`case_id`,`created_at`),
  KEY `idx_muwe_survey` (`survey_response_id`),
  CONSTRAINT `fk_muwe_case` FOREIGN KEY (`case_id`) REFERENCES `medical_underwriting_case` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_muwe_survey_response` FOREIGN KEY (`survey_response_id`) REFERENCES `survey_response` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.referral_chain definition

CREATE TABLE `referral_chain` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `program_id` bigint unsigned NOT NULL,
  `ancestor_user_id` bigint unsigned NOT NULL,
  `descendant_user_id` bigint unsigned NOT NULL,
  `depth` int unsigned NOT NULL,
  `root_invite_id` bigint unsigned DEFAULT NULL,
  `root_conversion_id` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_chain_unique` (`program_id`,`ancestor_user_id`,`descendant_user_id`),
  KEY `idx_chain_ancestor` (`program_id`,`ancestor_user_id`,`depth`),
  KEY `idx_chain_descendant` (`program_id`,`descendant_user_id`),
  KEY `idx_chain_root_conversion` (`root_conversion_id`),
  KEY `idx_chain_root_invite` (`root_invite_id`),
  CONSTRAINT `fk_chain_program` FOREIGN KEY (`program_id`) REFERENCES `referral_program` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_chain_root_conversion` FOREIGN KEY (`root_conversion_id`) REFERENCES `referral_conversion` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_chain_root_invite` FOREIGN KEY (`root_invite_id`) REFERENCES `referral_invite` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- GC_Pro.survey_answer definition

CREATE TABLE `survey_answer` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `response_id` bigint unsigned NOT NULL,
  `question_id` bigint unsigned NOT NULL,
  `value_bool` tinyint(1) DEFAULT NULL,
  `value_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `value_num` decimal(18,6) DEFAULT NULL,
  `value_date` date DEFAULT NULL,
  `value_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sa_response_question` (`response_id`,`question_id`),
  KEY `idx_sa_question` (`question_id`),
  KEY `idx_sa_response` (`response_id`),
  CONSTRAINT `fk_sa_question` FOREIGN KEY (`question_id`) REFERENCES `survey_question` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sa_response` FOREIGN KEY (`response_id`) REFERENCES `survey_response` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;