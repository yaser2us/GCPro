# POLICY Pillar - DDL

> **Owner**: Policy Service
> **Tables**: 19 tables managing policy lifecycle, pricing, entitlements, billing, and benefits
> **Source**: Extracted from FULL-DDL.md based on TABLE-OWNERSHIP.md

---

## Table of Contents

**Core Policy & Pricing (5):**
1. [policy](#policy) - Policy instance with lifecycle management
2. [policy_package](#policy_package) - Package catalog with deposit rules
3. [age_band](#age_band) - Age-based pricing factors
4. [smoker_profile](#smoker_profile) - Smoker status pricing factors
5. [policy_package_rate](#policy_package_rate) - Pricing matrix (package × age × smoker)

**Membership (1):**
6. [policy_member](#policy_member) - Members covered by policy

**Financial (3):**
7. [policy_deposit_requirement](#policy_deposit_requirement) - Deposit calculation + wallet link
8. [policy_billing_plan](#policy_billing_plan) - Billing plan per policy
9. [policy_installment](#policy_installment) - Individual installments

**Lifecycle (2):**
10. [policy_status_event](#policy_status_event) - Status change audit trail
11. [policy_remediation_case](#policy_remediation_case) - Grace period management

**Discounts (2):**
12. [discount_program](#discount_program) - Discount program catalog
13. [policy_discount_applied](#policy_discount_applied) - Discounts applied to policies

**Benefits (6):**
14. [benefit_catalog](#benefit_catalog) - Benefit catalog versions
15. [benefit_level](#benefit_level) - Benefit levels within catalog
16. [benefit_catalog_item](#benefit_catalog_item) - Individual benefit items
17. [policy_benefit_entitlement](#policy_benefit_entitlement) - Policy → benefit snapshot
18. [policy_benefit_usage](#policy_benefit_usage) - Usage tracking per period
19. [policy_benefit_usage_event](#policy_benefit_usage_event) - Usage event log

---

## policy

Core policy instance managing lifecycle, coverage period, and package reference.

```sql
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
```

---

## policy_package

Package catalog defining deposit capacity, thresholds, and monthly caps.

```sql
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
```

---

## age_band

Age-based pricing factors for rate calculation.

```sql
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
```

---

## smoker_profile

Smoker status pricing factors and loadings.

```sql
CREATE TABLE `smoker_profile` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(32) NOT NULL,
  `smoker_factor` decimal(8,3) NOT NULL DEFAULT '1.000',
  `loading_pct` decimal(8,3) NOT NULL DEFAULT '0.000',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_smoker_profile_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

---

## policy_package_rate

Pricing matrix combining package, age band, and smoker profile with versioning.

```sql
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
```

---

## policy_member

Members covered under the policy with role and demographic snapshots.

```sql
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
```

---

## policy_deposit_requirement

Deposit wallet requirements with calculated thresholds and status tracking.

```sql
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
```

---

## policy_billing_plan

Billing plan orchestration for policy payments.

```sql
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
```

---

## policy_installment

Individual installment tracking with payment retry logic.

```sql
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
```

---

## policy_status_event

Audit trail for all policy status transitions with actor tracking.

```sql
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
```

---

## policy_remediation_case

Grace period and remediation tracking for policy issues.

```sql
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
```

---

## discount_program

Discount program catalog with eligibility rules and validity windows.

```sql
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
```

---

## policy_discount_applied

Tracks which discounts have been applied to specific policies.

```sql
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
```

---

## benefit_catalog

Benefit catalog with versioning and effective date management.

```sql
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
```

---

## benefit_level

Benefit levels within a catalog (e.g., Basic, Standard, Premium).

```sql
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
```

---

## benefit_catalog_item

Individual benefit items with limits, eligibility, and calculation modes.

```sql
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
```

---

## policy_benefit_entitlement

Snapshot of benefit entitlement at policy activation (immutable).

```sql
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
```

---

## policy_benefit_usage

Tracks benefit usage per policy, period, and item with reservations.

```sql
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
```

---

## policy_benefit_usage_event

Idempotent event log for benefit usage and reservation changes.

```sql
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
```

---

## Relationships

```
policy_package
  ├─> policy_package_rate (FK: package_id)
  │     ├─> age_band (FK: age_band_id)
  │     └─> smoker_profile (FK: smoker_profile_id)
  └─> policy (snapshot: package_code_snapshot)
        ├─> policy_member (FK: policy_id)
        ├─> policy_deposit_requirement (FK: policy_id)
        ├─> policy_billing_plan (FK: policy_id)
        │     └─> policy_installment (FK: billing_plan_id)
        ├─> policy_status_event (FK: policy_id)
        ├─> policy_remediation_case (FK: policy_id)
        ├─> policy_discount_applied (FK: policy_id)
        │     └─> discount_program (FK: discount_program_id)
        ├─> policy_benefit_entitlement (FK: policy_id)
        │     └─> benefit_catalog (snapshot: catalog_code_snapshot)
        │           ├─> benefit_level (FK: catalog_id)
        │           └─> benefit_catalog_item (FK: catalog_id)
        └─> policy_benefit_usage (FK: policy_id)
              └─> policy_benefit_usage_event (FK: usage_id)
```

---

## Key Design Patterns

1. **Snapshot Pattern**: Policy captures `package_code_snapshot` and `rule_version` at creation to ensure pricing immutability
2. **Pricing Matrix**: Three-dimensional pricing (package × age × smoker) with versioning via `rate_version` and effective dates
3. **Deposit Calculation**: Package defines multipliers and percentages; policy_deposit_requirement stores calculated amounts
4. **Threshold Monitoring**: Three levels (min_required, warning, urgent) for deposit status alerts
5. **Billing Flexibility**: Supports multiple installments with retry logic and idempotency
6. **Grace Period Management**: policy_remediation_case tracks grace periods for various policy issues
7. **Benefit Immutability**: Entitlement snapshots preserve benefit structure at policy activation
8. **Usage Tracking**: Separate used vs reserved amounts for accurate limit enforcement
9. **Event Sourcing**: All usage changes logged with idempotency for safe retries
10. **Polymorphic References**: `ref_type` + `ref_id` pattern enables linking to any entity

---

## Usage Guidelines

### Rate Calculation
```sql
-- Find applicable rate for a policy member
SELECT rate.*
FROM policy_package_rate rate
JOIN age_band ab ON rate.age_band_id = ab.id
JOIN smoker_profile sp ON rate.smoker_profile_id = sp.id
WHERE rate.package_id = ?
  AND ? BETWEEN ab.min_age AND ab.max_age
  AND sp.code = ?
  AND rate.effective_from <= NOW()
  AND (rate.effective_to IS NULL OR rate.effective_to > NOW());
```

### Deposit Status Check
```sql
-- Monitor policies requiring deposit top-up
SELECT p.policy_number, pdr.status, pdr.min_required_amount,
       wbs.available_amount, wbs.total_amount
FROM policy p
JOIN policy_deposit_requirement pdr ON p.id = pdr.policy_id
LEFT JOIN wallet_balance_snapshot wbs ON pdr.deposit_wallet_id = wbs.wallet_id
WHERE pdr.status IN ('warning', 'urgent')
  AND p.status = 'active';
```

### Benefit Usage Check
```sql
-- Check remaining benefit balance
SELECT usage.item_code,
       ent.entitlement_json->'$.items[*]' as limits,
       usage.used_amount,
       usage.reserved_amount,
       (limit_amount - used_amount - reserved_amount) as available_amount
FROM policy_benefit_usage usage
JOIN policy_benefit_entitlement ent ON usage.policy_id = ent.policy_id
WHERE usage.policy_id = ?
  AND usage.period_key = ?
  AND usage.status = 'open';
```

---

## Notes

- **Immutability**: Policy snapshots ensure consistent pricing even when rates change
- **Deposit Wallet**: Links to WALLET+LEDGER pillar via `deposit_wallet_id`
- **Billing Integration**: Installments link to PAYMENTS via `payment_ref`
- **Benefit Catalog**: Benefits managed centrally but snapshotted per policy for immutability
- **Grace Periods**: Configurable at policy level (`annual_fee_grace_days`, `deposit_topup_grace_days`)
- **Remediation**: Open cases prevent policy from moving to certain statuses until cleared or expired
