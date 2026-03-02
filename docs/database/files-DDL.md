# FILES Pillar - DDL

> **Owner**: File Service
> **Tables**: 8 tables managing uploads, versions, access tokens, scanning, tagging, and linking
> **Source**: Extracted from FULL-DDL.md based on TABLE-OWNERSHIP.md

---

## Table of Contents
1. [file_upload](#file_upload) - Canonical file record + metadata
2. [file_version](#file_version) - Versioning + checksum
3. [file_event](#file_event) - File lifecycle events
4. [file_access_token](#file_access_token) - Download/share tokens + expiry
5. [file_scan_result](#file_scan_result) - AV/validation scan results
6. [file_tag](#file_tag) - Tag dictionary
7. [file_upload_tag](#file_upload_tag) - Many-to-many tagging
8. [file_link](#file_link) - Attach file to any target (target_type/id)

---

## file_upload

Canonical file record with storage metadata and ownership tracking.

```sql
CREATE TABLE `file_upload` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `file_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'created',
  `owner_account_id` bigint unsigned DEFAULT NULL,
  `owner_person_id` bigint unsigned DEFAULT NULL,
  `owner_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'account',
  `purpose_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `visibility` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'private',
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_type` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extension` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size_bytes` bigint unsigned DEFAULT NULL,
  `checksum_sha256` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_provider` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_bucket` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_path` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_region` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_etag` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_at` datetime DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_file_key` (`file_key`),
  KEY `idx_file_status` (`status`),
  KEY `idx_file_owner` (`owner_type`,`owner_account_id`,`owner_person_id`),
  KEY `idx_file_purpose` (`purpose_code`,`status`),
  KEY `idx_file_uploaded` (`uploaded_at`),
  KEY `idx_file_checksum` (`checksum_sha256`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## file_version

File versioning with separate storage references per version.

```sql
CREATE TABLE `file_version` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `file_id` bigint unsigned NOT NULL,
  `version_no` int unsigned NOT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `content_type` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size_bytes` bigint unsigned DEFAULT NULL,
  `checksum_sha256` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_provider` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_bucket` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_path` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_etag` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_file_version` (`file_id`,`version_no`),
  KEY `idx_file_version_status` (`file_id`,`status`),
  CONSTRAINT `fk_file_version_file` FOREIGN KEY (`file_id`) REFERENCES `file_upload` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## file_event

File lifecycle event log with actor tracking.

```sql
CREATE TABLE `file_event` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `file_id` bigint unsigned NOT NULL,
  `event_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `actor_id` bigint unsigned DEFAULT NULL,
  `request_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payload_json` json DEFAULT NULL,
  `occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_file_event_file_time` (`file_id`,`occurred_at`),
  KEY `idx_file_event_type` (`event_type`),
  CONSTRAINT `fk_file_event_file` FOREIGN KEY (`file_id`) REFERENCES `file_upload` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## file_access_token

Download and share tokens with expiry, usage limits, and revocation.

```sql
CREATE TABLE `file_access_token` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `file_id` bigint unsigned NOT NULL,
  `token` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'download',
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `expires_at` datetime DEFAULT NULL,
  `scopes_json` json DEFAULT NULL,
  `issued_by_account_id` bigint unsigned DEFAULT NULL,
  `issued_by_person_id` bigint unsigned DEFAULT NULL,
  `issued_for` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issued_for_value` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_uses` int unsigned NOT NULL DEFAULT '0',
  `used_count` int unsigned NOT NULL DEFAULT '0',
  `last_used_at` datetime DEFAULT NULL,
  `meta_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_file_token` (`token`),
  KEY `idx_token_file_status` (`file_id`,`status`),
  KEY `idx_token_expires` (`status`,`expires_at`),
  CONSTRAINT `fk_file_token_file` FOREIGN KEY (`file_id`) REFERENCES `file_upload` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## file_scan_result

Antivirus and validation scan results.

```sql
CREATE TABLE `file_scan_result` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `file_id` bigint unsigned NOT NULL,
  `scan_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `provider` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `failure_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `summary` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `result_json` json DEFAULT NULL,
  `scanned_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_scan_file_type` (`file_id`,`scan_type`),
  KEY `idx_scan_status` (`scan_type`,`status`),
  CONSTRAINT `fk_scan_file` FOREIGN KEY (`file_id`) REFERENCES `file_upload` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## file_tag

Tag catalog for categorizing files.

```sql
CREATE TABLE `file_tag` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_file_tag_code` (`code`),
  KEY `idx_file_tag_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## file_upload_tag

Many-to-many tagging of files.

```sql
CREATE TABLE `file_upload_tag` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `file_id` bigint unsigned NOT NULL,
  `tag_id` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_file_tag_pair` (`file_id`,`tag_id`),
  KEY `idx_file_upload_tag_file` (`file_id`),
  KEY `idx_file_upload_tag_tag` (`tag_id`),
  CONSTRAINT `fk_file_upload_tag_file` FOREIGN KEY (`file_id`) REFERENCES `file_upload` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_file_upload_tag_tag` FOREIGN KEY (`tag_id`) REFERENCES `file_tag` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## file_link

Polymorphic linking of files to any target entity.

```sql
CREATE TABLE `file_link` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `file_id` bigint unsigned NOT NULL,
  `target_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `meta_json` json DEFAULT NULL,
  `linked_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `removed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_file_target_role` (`file_id`,`target_type`,`target_id`,`role_code`),
  KEY `idx_link_target` (`target_type`,`target_id`,`status`),
  KEY `idx_link_file` (`file_id`,`status`),
  CONSTRAINT `fk_file_link_file` FOREIGN KEY (`file_id`) REFERENCES `file_upload` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Relationships

```
file_upload
  ├─> file_version (FK: file_id)
  ├─> file_event (FK: file_id)
  ├─> file_access_token (FK: file_id)
  ├─> file_scan_result (FK: file_id)
  ├─> file_upload_tag (FK: file_id)
  └─> file_link (FK: file_id)

file_tag
  └─> file_upload_tag (FK: tag_id)
```

---

## Key Design Patterns

1. **Versioning**: `file_version` enables file history and rollback
2. **Soft Delete**: `deleted_at` marks files as deleted without removing data
3. **Access Control**: `file_access_token` enables temporary download links
4. **Usage Tracking**: `used_count` and `max_uses` prevent token abuse
5. **Polymorphic Linking**: `file_link` attaches files to claims, policies, etc.
6. **Security Scanning**: `file_scan_result` prevents malware distribution
7. **Tagging**: `file_tag` + `file_upload_tag` enables categorization
8. **Storage Abstraction**: Fields support S3, GCS, Azure, etc.
