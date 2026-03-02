# CLAIMS Pillar - DDL

> **Owner**: Claims Service
> **Tables**: 8 tables managing claim lifecycle, reviews, documents, fraud detection, and settlement
> **Source**: Extracted from FULL-DDL.md based on TABLE-OWNERSHIP.md

---

## Table of Contents
1. [claim](#claim) - Claim lifecycle + uniqueness
2. [claim_number_sequence](#claim_number_sequence) - Claim numbering
3. [claim_event](#claim_event) - State transitions + notes
4. [claim_review](#claim_review) - Reviewer decisions
5. [claim_document](#claim_document) - Claim ↔ file association
6. [claim_fraud_signal](#claim_fraud_signal) - Signals & scoring
7. [claim_link](#claim_link) - Link duplicates/related claims
8. [claim_settlement_flag](#claim_settlement_flag) - Period eligibility flagging

---

## claim

Core claims table with lifecycle management and approval tracking.

```sql
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
```

---

## claim_number_sequence

Sequential claim number generation per year.

```sql
CREATE TABLE `claim_number_sequence` (
  `claim_year` int NOT NULL,
  `next_seq` int NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`claim_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

---

## claim_event

State change audit trail with actor tracking and notes.

```sql
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
```

---

## claim_review

Reviewer decisions and approval workflow.

```sql
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
```

---

## claim_document

File attachments for claims (receipts, medical reports, etc.).

```sql
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
```

---

## claim_fraud_signal

Fraud detection signals and risk scoring.

```sql
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
```

---

## claim_link

Relationship tracking between claims (duplicates, related incidents).

```sql
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
```

---

## claim_settlement_flag

Period-based eligibility tracking for CrowdShare settlement.

```sql
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
```

---

## Relationships

```
claim
  ├─> claim_event (FK: claim_id)
  ├─> claim_review (FK: claim_id)
  ├─> claim_document (FK: claim_id)
  ├─> claim_fraud_signal (FK: claim_id)
  ├─> claim_link (FK: from_claim_id, to_claim_id)
  └─> claim_settlement_flag (FK: claim_id)

claim_number_sequence - Standalone sequence table
```

---

## Key Design Patterns

1. **Unique Numbering**: `claim_number_sequence` ensures sequential, yearly claim numbers
2. **Duplicate Detection**: `idx_claim_duplicate` helps identify potential duplicate submissions
3. **Optimistic Locking**: `version` field prevents concurrent update conflicts
4. **Event Sourcing**: `claim_event` provides complete audit trail
5. **Fraud Scoring**: Accumulate `signal_score` across multiple `claim_fraud_signal` records
6. **Period Settlement**: `claim_settlement_flag` links claims to CrowdShare periods
7. **Graph Relationships**: `claim_link` enables claim networks (related incidents, family claims)

---

## Usage Guidelines

### Claim Number Generation
```sql
-- Atomic claim number generation
INSERT INTO claim_number_sequence (claim_year, next_seq)
VALUES (2024, 1)
ON DUPLICATE KEY UPDATE next_seq = next_seq + 1;

SELECT next_seq FROM claim_number_sequence WHERE claim_year = 2024;
-- Format: CLM-2024-00001
```

### Fraud Risk Calculation
```sql
-- Calculate total fraud risk score for a claim
SELECT claim_id, SUM(signal_score) as total_risk
FROM claim_fraud_signal
WHERE claim_id = ?
GROUP BY claim_id;
```

### Settlement Eligibility
```sql
-- Get eligible claims for a period
SELECT c.* FROM claim c
JOIN claim_settlement_flag csf ON c.id = csf.claim_id
WHERE csf.period_key = '2024-03'
  AND csf.eligible = 1
  AND c.status = 'approved';
```
