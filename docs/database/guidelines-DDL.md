# GUIDELINES Pillar - DDL

> **Owner**: Compliance Service
> **Tables**: 3 tables managing compliance documents, versions, and acceptance tracking
> **Source**: Extracted from FULL-DDL.md based on TABLE-OWNERSHIP.md

---

## Table of Contents
1. [guideline_document](#guideline_document) - Document catalog
2. [guideline_version](#guideline_version) - Versioned content + effective window
3. [guideline_acceptance](#guideline_acceptance) - Immutable acceptance log + idempotency

---

## guideline_document

Document catalog with scoping support (global, per-package, per-account).

```sql
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
```

---

## guideline_version

Versioned content with effective date windows and multi-locale support.

```sql
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
```

---

## guideline_acceptance

Immutable acceptance log with idempotency and audit trail.

```sql
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
```

---

## Relationships

```
guideline_document
  └─> guideline_version (FK: document_id)
        └─> guideline_acceptance (FK: version_id)
```

---

## Key Design Patterns

1. **Versioning**: Separate versions per document with effective date windows
2. **Temporal Validity**: `effective_from` and `effective_to` enable scheduling
3. **Multi-Locale**: Support translations via `locale` field
4. **Idempotency**: `idempotency_key` prevents duplicate acceptance records
5. **One Acceptance Per Entity**: `uk_guideline_accept_once` ensures users can't accept same version twice
6. **Flexible Content Storage**: Inline text, URL, or file reference
7. **Audit Trail**: Captures IP, user agent, channel for compliance
8. **Scoping**: Documents can be global or scoped to specific entities

---

## Usage Guidelines

### Document Lifecycle
1. Create `guideline_document` with unique `code`
2. Create `guideline_version` with `status='draft'`
3. Publish version → set `status='published'`, `effective_from`
4. Users accept → create `guideline_acceptance` records

### Effective Date Queries
```sql
-- Get current effective version for a document
SELECT * FROM guideline_version
WHERE document_id = ?
  AND status = 'published'
  AND effective_from <= NOW()
  AND (effective_to IS NULL OR effective_to > NOW())
ORDER BY effective_from DESC
LIMIT 1;
```

### Acceptance Checking
```sql
-- Check if user accepted latest version
SELECT 1 FROM guideline_acceptance ga
JOIN guideline_version gv ON ga.version_id = gv.id
WHERE gv.document_id = ?
  AND ga.user_id = ?
  AND ga.acceptance_status = 'accepted'
  AND gv.status = 'published'
ORDER BY ga.accepted_at DESC
LIMIT 1;
```

### Typical Use Cases
- Terms of Service acceptance
- Privacy Policy acknowledgment
- Package-specific terms (e.g., travel insurance conditions)
- Regulatory disclosures
