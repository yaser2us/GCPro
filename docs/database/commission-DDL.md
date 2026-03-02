# COMMISSION Pillar - DDL

> **Owner**: Commission Service
> **Tables**: 11 tables managing commission programs, participants, rules, accruals, and payouts
> **Source**: Extracted from FULL-DDL.md based on TABLE-OWNERSHIP.md

---

## Table of Contents

**Program & Participants (2):**
1. [commission_program](#commission_program) - Commission program catalog
2. [commission_participant](#commission_participant) - Program participants with payout preferences

**Rules (1):**
3. [commission_rule](#commission_rule) - Commission calculation rules

**Accruals (2):**
4. [commission_accrual](#commission_accrual) - Commission accrual events
5. [commission_payout_item_accrual](#commission_payout_item_accrual) - Links accruals to payout items

**Payouts (2):**
6. [commission_payout_batch](#commission_payout_batch) - Payout batch orchestration
7. [commission_payout_item](#commission_payout_item) - Individual payout items

---

## commission_program

Commission program catalog with settlement cycles and currency configuration.

```sql
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
```

---

## commission_participant

Program participants with payout method preferences.

```sql
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
```

---

## commission_rule

Commission calculation rules with conditions, rates, and priority.

```sql
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
```

---

## commission_accrual

Commission accrual events tracking earned commissions.

```sql
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
```

---

## commission_payout_batch

Payout batch orchestration for settlement periods.

```sql
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
```

---

## commission_payout_item

Individual payout items within a batch.

```sql
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
```

---

## commission_payout_item_accrual

Links accruals to payout items for traceability.

```sql
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
```

---

## Relationships

```
commission_program
  ├─> commission_participant (FK: program_id)
  │     ├─> commission_accrual (FK: participant_id)
  │     │     └─> commission_payout_item_accrual (FK: accrual_id)
  │     └─> commission_payout_item (FK: participant_id)
  │           └─> commission_payout_item_accrual (FK: payout_item_id)
  ├─> commission_rule (FK: program_id)
  │     └─> commission_accrual (FK: rule_id)
  ├─> commission_accrual (FK: program_id)
  └─> commission_payout_batch (FK: program_id)
        └─> commission_payout_item (FK: batch_id)
```

---

## Key Design Patterns

1. **Program-Based Organization**: All commission logic scoped to programs
2. **Participant Flexibility**: Supports different participant types (user, agent, etc.)
3. **Rule Engine**: Flexible rule definition with conditions, priority, and effective dates
4. **Accrual Tracking**: Separate accrual from payout for accurate accounting
5. **Batch Settlement**: Groups payouts by period for efficient processing
6. **Payout Methods**: Supports wallet and bank transfer payouts
7. **Traceability**: Links payout items back to source accruals via junction table
8. **Idempotency**: Prevents duplicate accruals via `idempotency_key`
9. **Status Workflow**: Clear status progression (planned → processing → completed/failed)
10. **Polymorphic Source References**: Accruals can reference any source entity (policy, sale, etc.)

---

## Usage Guidelines

### Calculate Commission Accrual
```sql
-- Record commission accrual from policy sale
INSERT INTO commission_accrual (
    program_id, participant_id, rule_id,
    accrual_type, currency, base_amount, rate_pct, amount,
    source_ref_type, source_ref_id, idempotency_key,
    status, occurred_at
)
SELECT
    cr.program_id,
    cp.id as participant_id,
    cr.id as rule_id,
    'one_time' as accrual_type,
    'MYR' as currency,
    p.annual_fee as base_amount,
    cr.rate_pct,
    ROUND(p.annual_fee * cr.rate_pct / 100, 2) as amount,
    'policy' as source_ref_type,
    p.id as source_ref_id,
    CONCAT('policy_', p.id, '_agent_', cp.participant_id) as idempotency_key,
    'accrued' as status,
    NOW() as occurred_at
FROM policy p
JOIN commission_participant cp ON cp.participant_id = p.agent_user_id
JOIN commission_rule cr ON cr.program_id = cp.program_id
WHERE p.id = ?
  AND cp.status = 'active'
  AND cr.status = 'active'
  AND cr.rule_type = 'percent'
  AND NOW() BETWEEN cr.effective_from AND COALESCE(cr.effective_to, '9999-12-31');
```

### Create Payout Batch
```sql
-- Create payout batch for period
INSERT INTO commission_payout_batch (
    program_id, batch_code, status, currency,
    period_start, period_end, total_amount
)
VALUES (
    ?,
    CONCAT('BATCH_', DATE_FORMAT(NOW(), '%Y%m')),
    'planned',
    'MYR',
    DATE_FORMAT(NOW() - INTERVAL 1 MONTH, '%Y-%m-01'),
    LAST_DAY(NOW() - INTERVAL 1 MONTH),
    0.00
);

SET @batch_id = LAST_INSERT_ID();

-- Create payout items for participants with accruals in period
INSERT INTO commission_payout_item (
    batch_id, participant_id, amount, currency,
    payout_method, status
)
SELECT
    @batch_id,
    ca.participant_id,
    SUM(ca.amount) as total_amount,
    ca.currency,
    cp.default_payout_method,
    'planned'
FROM commission_accrual ca
JOIN commission_participant cp ON ca.participant_id = cp.id
WHERE ca.program_id = ?
  AND ca.status = 'accrued'
  AND ca.occurred_at BETWEEN ? AND ?
GROUP BY ca.participant_id, ca.currency, cp.default_payout_method;

-- Link accruals to payout items
INSERT INTO commission_payout_item_accrual (payout_item_id, accrual_id)
SELECT
    cpi.id as payout_item_id,
    ca.id as accrual_id
FROM commission_payout_item cpi
JOIN commission_accrual ca ON cpi.participant_id = ca.participant_id
WHERE cpi.batch_id = @batch_id
  AND ca.status = 'accrued'
  AND ca.occurred_at BETWEEN ? AND ?;

-- Update batch total
UPDATE commission_payout_batch
SET total_amount = (
    SELECT SUM(amount)
    FROM commission_payout_item
    WHERE batch_id = @batch_id
)
WHERE id = @batch_id;
```

### Process Payout
```sql
-- Process payout item (wallet method)
UPDATE commission_payout_item
SET
    status = 'processing',
    updated_at = NOW()
WHERE id = ? AND status = 'planned';

-- Create ledger transaction for wallet payout
INSERT INTO ledger_txn (
    account_id, type, ref_type, ref_id,
    idempotency_key, occurred_at, posted_at, status
)
VALUES (?, 'commission_payout', 'commission_payout_item', ?, ?, NOW(), NOW(), 'posted');

SET @ledger_txn_id = LAST_INSERT_ID();

-- Update payout item with ledger reference
UPDATE commission_payout_item
SET
    ledger_txn_id = @ledger_txn_id,
    status = 'completed',
    updated_at = NOW()
WHERE id = ?;

-- Mark accruals as paid
UPDATE commission_accrual ca
JOIN commission_payout_item_accrual cpia ON ca.id = cpia.accrual_id
SET ca.status = 'paid'
WHERE cpia.payout_item_id = ?;
```

### Participant Performance Report
```sql
-- Commission summary by participant
SELECT
    cp.id as participant_id,
    cp.participant_type,
    cp.participant_id as user_id,
    COUNT(DISTINCT ca.id) as total_accruals,
    SUM(ca.amount) as total_earned,
    SUM(CASE WHEN ca.status = 'accrued' THEN ca.amount ELSE 0 END) as pending_amount,
    SUM(CASE WHEN ca.status = 'paid' THEN ca.amount ELSE 0 END) as paid_amount,
    COUNT(DISTINCT cpi.id) as total_payouts
FROM commission_participant cp
LEFT JOIN commission_accrual ca ON cp.id = ca.participant_id
LEFT JOIN commission_payout_item_accrual cpia ON ca.id = cpia.accrual_id
LEFT JOIN commission_payout_item cpi ON cpia.payout_item_id = cpi.id
WHERE cp.program_id = ?
  AND ca.occurred_at >= DATE_FORMAT(NOW() - INTERVAL 12 MONTH, '%Y-%m-01')
GROUP BY cp.id
ORDER BY total_earned DESC;
```

---

## Notes

- **Accrual vs Payout**: Accruals track when commission is earned; payouts track when it's paid
- **Batch Processing**: Reduces transaction overhead by grouping payouts by period
- **Payout Methods**: Wallet payouts are instant; bank transfers may have delays
- **Rule Priority**: Higher priority rules evaluate first; first matching rule applies
- **Effective Dates**: Rules support time-bounded activation for campaigns
- **Idempotency**: Prevents duplicate accruals for same source event
- **Status Tracking**: Clear status flow for accruals (accrued → paid) and payouts (planned → processing → completed/failed)
- **Traceability**: Full audit trail from source event → accrual → batch → payout item
- **Settlement Cycles**: Common cycles are daily, weekly, monthly, or on-demand
- **Multi-Currency**: Supports international commission programs
- **Polymorphic Sources**: Commission can be earned from any entity (policy, referral, sale, etc.)
