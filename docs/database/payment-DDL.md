# PAYMENTS Pillar - DDL

> **Owner**: Payment Orchestrator
> **Tables**: 5 tables managing payment methods, intents, attempts, events, and webhook processing
> **Source**: Extracted from FULL-DDL.md based on TABLE-OWNERSHIP.md

---

## Table of Contents
1. [payment_method](#payment_method) - Saved methods (provider refs)
2. [payment_intent](#payment_intent) - Intent lifecycle (status, ref, idempotency)
3. [payment_attempt](#payment_attempt) - Attempts per intent (gateway state machine)
4. [payment_event](#payment_event) - Payment lifecycle events
5. [payment_webhook_inbox](#payment_webhook_inbox) - Webhook receiver + idempotency

---

## payment_method

Saved payment methods with provider references (cards, bank accounts, etc.).

```sql
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
```

---

## payment_intent

Payment intent lifecycle orchestration with idempotency and provider tracking.

```sql
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
```

---

## payment_attempt

Individual payment attempts per intent (provider transaction state machine).

```sql
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
```

---

## payment_event

Payment intent event log with actor tracking.

```sql
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
```

---

## payment_webhook_inbox

Webhook receiver with signature validation and idempotent processing.

```sql
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
```

---

## Relationships

```
payment_method
  └─> payment_intent (FK: payment_method_id)
        ├─> payment_attempt (FK: intent_id)
        │     └─> payment_webhook_inbox (FK: attempt_id)
        └─> payment_event (FK: intent_id)
```

---

## Key Design Patterns

1. **Intent-Based Pattern**: Payment intent represents the user's desire to pay, separated from execution attempts
2. **Idempotency**: Multiple layers of idempotency protection:
   - `payment_intent.idempotency_key` - Prevents duplicate payment creation
   - `payment_webhook_inbox.idempotency_key` - Prevents duplicate webhook processing
   - `uk_pwi_provider_event` - Provider-level event deduplication
3. **Retry Logic**: `payment_attempt.attempt_no` enables multiple attempts per intent
4. **Provider Abstraction**: Provider-specific fields (`provider`, `provider_*_ref`) enable multi-gateway support
5. **Audit Trail**: `payment_event` logs all state changes with actor tracking
6. **Webhook Security**: `signature_status` validates webhook authenticity
7. **Polymorphic References**: `ref_type` + `ref_id` links payments to any entity (policy, claim, etc.)
8. **Lifecycle Timestamps**: Tracks created/succeeded/failed/processed timestamps for observability

---

## Notes

- **Receipt table**: According to TABLE-OWNERSHIP.md, `receipt` is owned by WALLET+LEDGER (not PAYMENTS), as it represents a financial artifact after ledger posting
- **Ledger integration**: `payment_intent.ledger_txn_id` links successful payments to ledger records
- **Status flow**: created → processing → succeeded/failed (intent level)
- **Attempt status flow**: initiated → processing → completed/failed (attempt level)
