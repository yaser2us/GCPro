# NOTIFICATIONS Pillar - DDL

> **Owner**: Notification Service
> **Tables**: 6 tables managing preferences, templates, messages, schedules, and delivery attempts
> **Source**: Extracted from FULL-DDL.md based on TABLE-OWNERSHIP.md

---

## Table of Contents
1. [notification_preference](#notification_preference) - Preference header
2. [notification_channel_pref](#notification_channel_pref) - Channel-specific settings
3. [notification_template](#notification_template) - Template catalog
4. [notification_message](#notification_message) - Message queue/outbox-like
5. [notification_schedule](#notification_schedule) - Delays/steps
6. [notification_delivery_attempt](#notification_delivery_attempt) - Provider attempts

---

## notification_preference

User notification preferences container.

```sql
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
```

---

## notification_channel_pref

Channel-specific preferences (email, SMS, push, etc.).

```sql
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
```

---

## notification_template

Template definitions with variable substitution.

```sql
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
```

---

## notification_message

Notification message queue with retry logic.

```sql
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
```

---

## notification_schedule

Scheduled/delayed notification delivery.

```sql
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
```

---

## notification_delivery_attempt

Provider delivery attempts with error tracking.

```sql
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
```

---

## Relationships

```
notification_preference
  └─> notification_channel_pref (FK: preference_id)

notification_template
  └─> notification_message (FK: template_id)
        ├─> notification_schedule (FK: message_id)
        └─> notification_delivery_attempt (FK: message_id)
```

---

## Key Design Patterns

1. **Multi-Channel**: Support email, SMS, push, in-app via `channel` field
2. **Template Variables**: `payload_vars` JSON substituted into `body_tpl`
3. **Retry Logic**: `max_attempts` and `attempt_count` with exponential backoff
4. **Scheduled Delivery**: `scheduled_for` enables delayed/scheduled notifications
5. **Quiet Hours**: `quiet_hours` JSON defines do-not-disturb windows
6. **Provider Abstraction**: `provider` field supports multiple SMS/email providers
7. **Idempotency**: `message_key` prevents duplicate notifications

---

## Usage Guidelines

### Template Example
```sql
INSERT INTO notification_template (code, name, channel, locale, subject_tpl, body_tpl, variables_schema_json)
VALUES (
  'claim_approved',
  'Claim Approved',
  'email',
  'en',
  'Your claim {{claim_number}} has been approved',
  'Dear {{user_name}},\n\nYour claim {{claim_number}} for {{amount}} has been approved.\n\nThank you,\nGC Pro Team',
  '{"user_name": "string", "claim_number": "string", "amount": "string"}'
);
```

### Sending Notification
```sql
INSERT INTO notification_message (message_key, template_id, account_id, channel, destination, payload_vars)
VALUES (
  'claim_123_approved_notify',
  1,
  456,
  'email',
  'user@example.com',
  '{"user_name": "John Doe", "claim_number": "CLM-2024-001", "amount": "RM 5,000"}'
);
```

### Channel Preferences Check
```sql
SELECT ncp.enabled, ncp.destination
FROM notification_preference np
JOIN notification_channel_pref ncp ON np.id = ncp.preference_id
WHERE np.account_id = ? AND ncp.channel = 'email';
```
