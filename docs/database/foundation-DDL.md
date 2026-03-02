# FOUNDATION Pillar - DDL

> **Owner**: Platform / Core Platform
> **Tables**: 4 cross-cutting platform primitives used by all services
> **Source**: Extracted from FULL-DDL.md based on TABLE-OWNERSHIP.md

---

## Table of Contents
1. [audit_log](#audit_log) - Immutable audit trail (who/what/when)
2. [outbox_event](#outbox_event) - Event publishing contract (topic/status/idempotency)
3. [outbox_event_consume](#outbox_event_consume) - Consumer checkpointing + retry/lock pattern
4. [resource_ref](#resource_ref) - Cross-pillar "safe reference" pointer (type/id/uuid)

---

## audit_log

Immutable audit trail capturing who did what, when, and the result.

```sql
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
```

---

## outbox_event

Event publishing contract for reliable event delivery with idempotency.

```sql
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
```

---

## outbox_event_consume

Consumer checkpointing with retry logic and distributed locking.

```sql
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
```

---

## resource_ref

Cross-pillar safe reference pointer enabling external references without direct FK dependencies.

```sql
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
```

---

## Relationships

```
outbox_event
  └─> outbox_event_consume (FK: event_id)

audit_log, resource_ref - Standalone (no FK dependencies)
```

---

## Key Design Patterns

1. **Immutable Audit**: `audit_log` is append-only with before/after snapshots
2. **Transactional Outbox**: Events written in same transaction as domain changes, ensuring consistency
3. **Idempotent Publishing**: `idempotency_key` prevents duplicate event publishing
4. **At-Least-Once Delivery**: `outbox_event_consume` tracks consumer progress with retry logic
5. **Distributed Locking**: `lock_owner` and `locked_at` enable multi-worker event processing
6. **UUID References**: `resource_ref.resource_uuid` provides stable external identifiers
7. **Polymorphic References**: `resource_type` + `resource_id` pattern enables cross-domain references

---

## Usage Guidelines

### audit_log
- **Write**: Every pillar writes audit entries for state changes
- **Read**: Security, compliance, debugging
- **Retention**: Long-term (typically years)

### outbox_event
- **Write**: Domain services write events during business transactions
- **Read**: Event publisher daemon polls for new events
- **Status flow**: new → published → archived

### outbox_event_consume
- **Write**: Consumer services checkpoint after processing
- **Read**: Consumer workers query for unprocessed events
- **Lock pattern**: Workers claim events via `lock_owner` to prevent duplicate processing

### resource_ref
- **Write**: Created when external systems need stable references
- **Read**: External APIs query by UUID to get internal IDs
- **Use case**: Public API contracts, external integrations
