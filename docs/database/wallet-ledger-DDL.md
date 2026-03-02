# WALLET+LEDGER Pillar - DDL

> **Owner**: Wallet & Ledger Service
> **Tables**: 15 tables managing wallet balances, transactions, ledger entries, and receipts
> **Source**: Extracted from FULL-DDL.md based on TABLE-OWNERSHIP.md

---

## Table of Contents

**Core Wallet (3):**
1. [wallet](#wallet) - Wallet instances per account
2. [wallet_balance_snapshot](#wallet_balance_snapshot) - Real-time balance tracking
3. [wallet_hold](#wallet_hold) - Balance holds/reservations

**Wallet Operations (6):**
4. [wallet_deposit_intent](#wallet_deposit_intent) - Deposit orchestration
5. [wallet_spend_intent](#wallet_spend_intent) - Spend orchestration
6. [wallet_withdrawal_request](#wallet_withdrawal_request) - Withdrawal requests
7. [wallet_payout_attempt](#wallet_payout_attempt) - Payout execution attempts
8. [wallet_batch](#wallet_batch) - Batch operation orchestration
9. [wallet_batch_item](#wallet_batch_item) - Individual batch items

**Wallet Rules & Policies (4):**
10. [wallet_policy_gate](#wallet_policy_gate) - Feature gates per wallet
11. [wallet_rule_set](#wallet_rule_set) - Rule set versions
12. [wallet_rule](#wallet_rule) - Individual wallet rules
13. [wallet_threshold_rule](#wallet_threshold_rule) - Balance threshold rules
14. [wallet_threshold_event](#wallet_threshold_event) - Threshold breach events

**Ledger (1):**
15. [ledger_txn](#ledger_txn) - Transaction log with reversal support
16. [ledger_entry](#ledger_entry) - Double-entry ledger entries

**Receipt (1):**
17. [receipt](#receipt) - Receipt/invoice generation

---

## wallet

Wallet instances with multi-currency and wallet type support.

```sql
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
```

---

## wallet_balance_snapshot

Real-time balance tracking with available, held, and total amounts.

```sql
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
```

---

## wallet_hold

Balance holds/reservations with expiration and capture support.

```sql
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
```

---

## wallet_deposit_intent

Deposit orchestration with idempotency and status tracking.

```sql
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
```

---

## wallet_spend_intent

Spend orchestration with idempotency and status tracking.

```sql
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
```

---

## wallet_withdrawal_request

Withdrawal requests with bank profile linking and approval workflow.

```sql
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
```

---

## wallet_payout_attempt

Payout execution attempts with provider tracking.

```sql
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
```

---

## wallet_batch

Batch operation orchestration for bulk wallet operations.

```sql
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
```

---

## wallet_batch_item

Individual items within a wallet batch operation.

```sql
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
```

---

## wallet_policy_gate

Feature gates for wallet functionality (e.g., enable/disable deposits, withdrawals).

```sql
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
```

---

## wallet_rule_set

Rule set versions for wallet configuration management.

```sql
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
```

---

## wallet_rule

Individual wallet rules within a rule set.

```sql
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
```

---

## wallet_threshold_rule

Balance threshold rules for alerting and automation.

```sql
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
```

---

## wallet_threshold_event

Events triggered when balance thresholds are breached.

```sql
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
```

---

## ledger_txn

Transaction log with idempotency, reversals, and polymorphic references.

```sql
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
```

---

## ledger_entry

Double-entry ledger entries linking to transactions.

```sql
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
```

---

## receipt

Receipt/invoice generation for payments and transactions.

```sql
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
```

---

## Relationships

```
wallet
  ├─> wallet_balance_snapshot (FK: wallet_id)
  ├─> wallet_hold (FK: wallet_id)
  ├─> wallet_deposit_intent (FK: wallet_id)
  ├─> wallet_spend_intent (FK: wallet_id)
  ├─> wallet_withdrawal_request (FK: wallet_id)
  │     └─> wallet_payout_attempt (FK: withdrawal_request_id)
  ├─> wallet_batch_item (FK: wallet_id)
  │     └─> wallet_batch (FK: batch_id)
  ├─> wallet_policy_gate (FK: wallet_id)
  ├─> wallet_rule_set (FK: wallet_id)
  │     └─> wallet_rule (FK: rule_set_id)
  ├─> wallet_threshold_rule (FK: wallet_id)
  └─> wallet_threshold_event (FK: wallet_id)

ledger_txn
  ├─> ledger_entry (FK: txn_id)
  ├─> ledger_txn (self-reference: reversal_of_txn_id)
  └─> receipt (FK: ledger_txn_id)
```

---

## Key Design Patterns

1. **Intent-Based Operations**: Separate intents (deposit/spend) from execution for orchestration
2. **Balance Decomposition**: Tracks available, held, and total amounts separately
3. **Hold Mechanism**: Temporary reservations with expiration and capture/release lifecycle
4. **Idempotency**: Multiple layers of idempotency protection across all operations
5. **Batch Processing**: Supports bulk operations with item-level tracking and rollback
6. **Policy Gates**: Feature flags per wallet for dynamic capability control
7. **Rule Engine**: Flexible rule configuration with versioning and effective dates
8. **Threshold Monitoring**: Automated alerts when balance crosses configured thresholds
9. **Double-Entry Ledger**: Every transaction has balanced entries (debit = credit)
10. **Reversal Support**: Self-referencing `reversal_of_txn_id` for transaction corrections
11. **Receipt Generation**: Links receipts to payments, ledger transactions, or any entity
12. **Polymorphic References**: `ref_type` + `ref_id` pattern enables linking to any entity

---

## Usage Guidelines

### Balance Check with Holds
```sql
-- Check wallet balance including holds
SELECT
    w.id as wallet_id,
    wbs.total_amount,
    wbs.available_amount,
    wbs.held_amount,
    COUNT(wh.id) as active_holds
FROM wallet w
JOIN wallet_balance_snapshot wbs ON w.id = wbs.wallet_id
LEFT JOIN wallet_hold wh ON w.id = wh.wallet_id
    AND wh.status = 'active'
WHERE w.account_id = ?
GROUP BY w.id;
```

### Create Hold and Spend
```sql
-- 1. Create hold (reserve funds)
INSERT INTO wallet_hold (
    wallet_id, reason_code, amount,
    ref_type, ref_id, idempotency_key, expires_at
) VALUES (?, 'claim_approval', 500.00, 'claim', ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY));

-- 2. Capture hold (execute spend)
UPDATE wallet_hold
SET status = 'captured', captured_at = NOW()
WHERE id = ? AND status = 'active';

-- 3. Create spend intent
INSERT INTO wallet_spend_intent (
    wallet_id, account_id, amount,
    ref_type, ref_id, idempotency_key, status
) VALUES (?, ?, 500.00, 'claim', ?, ?, 'completed');
```

### Ledger Transaction with Entries
```sql
-- Create transaction
INSERT INTO ledger_txn (
    account_id, type, ref_type, ref_id,
    idempotency_key, occurred_at, posted_at, status
) VALUES (?, 'deposit', 'payment_intent', ?, ?, NOW(), NOW(), 'posted');

SET @txn_id = LAST_INSERT_ID();

-- Create debit entry (from external account)
INSERT INTO ledger_entry (
    txn_id, account_id, entry_type, direction, amount, currency
) VALUES (@txn_id, ?, 'principal', 'debit', 1000.00, 'MYR');

-- Create credit entry (to wallet)
INSERT INTO ledger_entry (
    txn_id, account_id, entry_type, direction, amount, currency
) VALUES (@txn_id, ?, 'principal', 'credit', 1000.00, 'MYR');
```

### Threshold Monitoring
```sql
-- Check wallets approaching thresholds
SELECT
    w.id,
    w.account_id,
    wtr.threshold_code,
    wbs.available_amount,
    wtr.threshold_amount,
    (wbs.available_amount - wtr.threshold_amount) as buffer
FROM wallet w
JOIN wallet_balance_snapshot wbs ON w.id = wbs.wallet_id
JOIN wallet_threshold_rule wtr ON w.id = wtr.wallet_id
WHERE wtr.status = 'active'
  AND wbs.available_amount < (wtr.threshold_amount * 1.1)
ORDER BY buffer ASC;
```

---

## Notes

- **Balance Snapshot**: Updated in real-time via triggers or application logic
- **Hold Expiration**: Background job should release expired holds
- **Batch Operations**: Used for bulk deposits/withdrawals (e.g., commission payouts)
- **Policy Gates**: Enable/disable wallet features dynamically (deposits, withdrawals, transfers)
- **Double-Entry Accounting**: Every `ledger_txn` must have balanced `ledger_entry` records
- **Reversals**: Use `reversal_of_txn_id` to link correction transactions to original
- **Receipt Integration**: Receipts can reference payment_intent, ledger_txn, or any entity via ref_type/ref_id
- **Idempotency Keys**: Prevent duplicate operations across intents, holds, batches, and transactions
- **Currency Support**: Multi-currency support at wallet level (one wallet per currency per account)
