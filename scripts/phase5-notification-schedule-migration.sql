-- Phase 5: notification_schedule schema extension
-- Adds ref_type, ref_id, payload_json, created_at, updated_at
-- Makes message_id nullable (to support cross-plugin generic schedules)

ALTER TABLE `notification_schedule`
  MODIFY COLUMN `message_id` BIGINT NULL COMMENT 'NULL for generic ref-based schedules',
  ADD COLUMN `ref_type`    VARCHAR(50)  NULL        COMMENT 'Cross-plugin ref type (e.g. policy_remediation_case)' AFTER `message_id`,
  ADD COLUMN `ref_id`      BIGINT       NULL        COMMENT 'ID of the referenced entity'                          AFTER `ref_type`,
  ADD COLUMN `payload_json` JSON        NULL        COMMENT 'Arbitrary payload for the scheduler to act on'        AFTER `meta`,
  ADD COLUMN `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP                                         AFTER `payload_json`,
  ADD COLUMN `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP             AFTER `created_at`,
  ADD INDEX  `idx_schedule_ref` (`ref_type`, `ref_id`);
