# CROWD Pillar - DDL

> **Owner**: CrowdShare Service
> **Tables**: 9 tables managing period calculation, membership, charges, payouts, and distributed runs
> **Source**: Extracted from FULL-DDL.md based on TABLE-OWNERSHIP.md

---

## Table of Contents
1. [crowd_period](#crowd_period) - Period aggregate + totals/status
2. [crowd_package_bucket](#crowd_package_bucket) - Period x package breakdown
3. [crowd_period_member](#crowd_period_member) - Members included per period
4. [crowd_period_claim](#crowd_period_claim) - Claims included per period
5. [crowd_member_charge](#crowd_member_charge) - Charges per member per period
6. [crowd_claim_payout](#crowd_claim_payout) - Payouts per claim per period
7. [crowd_period_event](#crowd_period_event) - Period events
8. [crowd_period_run](#crowd_period_run) - Run execution tracking
9. [crowd_period_run_lock](#crowd_period_run_lock) - Distributed lock + heartbeat

---

## crowd_period

Period aggregate with totals and calculation status.

```sql
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
```

---

## crowd_package_bucket

Period breakdown by package with weightage and per-member costs.

```sql
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
```

---

## crowd_period_member

Members included in the period with snapshot data.

```sql
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
```

---

## crowd_period_claim

Claims included in the period with eligibility tracking.

```sql
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
```

---

## crowd_member_charge

Charges per member with payment tracking and idempotency.

```sql
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
```

---

## crowd_claim_payout

Payouts per claim with idempotency and wallet/ledger linkage.

```sql
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
```

---

## crowd_period_event

Period lifecycle event log.

```sql
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
```

---

## crowd_period_run

Run execution tracking for period calculation.

```sql
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
```

---

## crowd_period_run_lock

Distributed lock with heartbeat for multi-worker coordination.

```sql
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
```

---

## Relationships

```
crowd_period
  ├─> crowd_package_bucket (FK: crowd_period_id)
  │     └─> crowd_member_charge (FK: package_bucket_id)
  ├─> crowd_period_member (FK: crowd_period_id)
  ├─> crowd_period_claim (FK: crowd_period_id)
  │     └─> crowd_claim_payout (FK: crowd_period_claim_id)
  ├─> crowd_member_charge (FK: crowd_period_id)
  ├─> crowd_claim_payout (FK: crowd_period_id)
  ├─> crowd_period_event (FK: crowd_period_id)
  ├─> crowd_period_run (FK: crowd_period_id)
  └─> crowd_period_run_lock (FK: crowd_period_id)
```

---

## Key Design Patterns

1. **Period Aggregation**: `crowd_period` stores calculated totals
2. **Package Buckets**: Members grouped by package for weighted cost sharing
3. **Snapshot Pattern**: Snapshot member/claim data at period freeze
4. **Idempotency**: `idempotency_key` prevents duplicate charges/payouts
5. **Distributed Locking**: `crowd_period_run_lock` with heartbeat enables multi-worker processing
6. **Debt/Extra Rollover**: `debt_amount` and `extra_amount` track period-to-period carryover
7. **Calculation Versioning**: `rule_version` and `calc_version` for audit trail

---

## Usage Guidelines

### Period Calculation Flow
1. Create `crowd_period` with status='created'
2. Populate `crowd_period_member` (active members)
3. Populate `crowd_period_claim` (eligible claims)
4. Calculate `crowd_package_bucket` (cost per package)
5. Generate `crowd_member_charge` records
6. Generate `crowd_claim_payout` records
7. Update period status='calculated'

### Distributed Lock Pattern
```sql
-- Acquire lock
INSERT INTO crowd_period_run_lock (crowd_period_id, lock_key, owner_instance_id, run_id)
VALUES (?, 'calculation', 'worker-123', UUID())
ON DUPLICATE KEY UPDATE
  owner_instance_id = IF(heartbeat_at < NOW() - INTERVAL lease_seconds SECOND, 'worker-123', owner_instance_id);

-- Heartbeat
UPDATE crowd_period_run_lock
SET heartbeat_at = NOW()
WHERE crowd_period_id = ? AND lock_key = 'calculation' AND owner_instance_id = 'worker-123';

-- Release lock
UPDATE crowd_period_run_lock
SET status = 'released', released_at = NOW()
WHERE crowd_period_id = ? AND lock_key = 'calculation' AND owner_instance_id = 'worker-123';
```
