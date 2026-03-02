# IDENTITY Pillar - DDL

> **Owner**: Identity Service
> **Tables**: 11 tables managing users, persons, accounts, credentials, relationships, and verification
> **Source**: Extracted from FULL-DDL.md based on TABLE-OWNERSHIP.md

---

## Table of Contents
1. [user](#user) - Login identity (phone/email/status)
2. [user_credential](#user_credential) - Credential material refs/hashes
3. [person](#person) - Human profile (type, dob, etc.)
4. [person_identity](#person_identity) - National ID / passport etc.
5. [person_relationship](#person_relationship) - Family/relationship graph
6. [account](#account) - Account container (status/type)
7. [account_person](#account_person) - Who belongs to which account + role
8. [address](#address) - Polymorphic address book (owner_type, owner_id)
9. [device_token](#device_token) - Device push tokens / last seen
10. [registration_token](#registration_token) - OTP/invite tokens for onboarding
11. [verification_status](#verification_status) - "KYC-ish" verification state per account/type

---

## user

Login identity with phone/email and status tracking.

```sql
CREATE TABLE `user` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `phone_number` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verified_at` datetime DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_phone` (`phone_number`),
  UNIQUE KEY `uk_user_email` (`email`),
  KEY `idx_user_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## user_credential

Credential storage with hashes and provider references.

```sql
CREATE TABLE `user_credential` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `secret_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_ref` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_credential_user` (`user_id`),
  KEY `idx_user_credential_type` (`type`),
  CONSTRAINT `fk_user_credential_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## person

Human profile with demographics and lifecycle management.

```sql
CREATE TABLE `person` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `primary_user_id` bigint unsigned DEFAULT NULL,
  `type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dob` date DEFAULT NULL,
  `gender` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nationality` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_person_primary_user` (`primary_user_id`),
  KEY `idx_person_type` (`type`),
  KEY `idx_person_status` (`status`),
  CONSTRAINT `fk_person_primary_user` FOREIGN KEY (`primary_user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## person_identity

National ID, passport, and other identity documents.

```sql
CREATE TABLE `person_identity` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `person_id` bigint unsigned NOT NULL,
  `id_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_no` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `country` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_person_identity_type_no` (`id_type`,`id_no`),
  KEY `idx_person_identity_person` (`person_id`),
  CONSTRAINT `fk_person_identity_person` FOREIGN KEY (`person_id`) REFERENCES `person` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## person_relationship

Family and relationship graph (parent, spouse, dependent, etc.).

```sql
CREATE TABLE `person_relationship` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `from_person_id` bigint unsigned NOT NULL,
  `to_person_id` bigint unsigned NOT NULL,
  `relation_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_person_relation` (`from_person_id`,`to_person_id`,`relation_type`),
  KEY `idx_person_rel_from` (`from_person_id`),
  KEY `idx_person_rel_to` (`to_person_id`),
  CONSTRAINT `fk_person_rel_from` FOREIGN KEY (`from_person_id`) REFERENCES `person` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_person_rel_to` FOREIGN KEY (`to_person_id`) REFERENCES `person` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## account

Account container grouping people and resources.

```sql
CREATE TABLE `account` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_account_type` (`type`),
  KEY `idx_account_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## account_person

Many-to-many mapping of people to accounts with roles.

```sql
CREATE TABLE `account_person` (
  `account_id` bigint unsigned NOT NULL,
  `person_id` bigint unsigned NOT NULL,
  `role` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'owner',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`account_id`,`person_id`),
  KEY `idx_account_person_person` (`person_id`),
  CONSTRAINT `fk_account_person_account` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_account_person_person` FOREIGN KEY (`person_id`) REFERENCES `person` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## address

Polymorphic address book supporting multiple owner types.

```sql
CREATE TABLE `address` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `owner_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner_id` bigint unsigned NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `line1` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `line2` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postcode` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_address_owner` (`owner_type`,`owner_id`),
  KEY `idx_address_default` (`owner_type`,`owner_id`,`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## device_token

Push notification device tokens with last seen tracking.

```sql
CREATE TABLE `device_token` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `platform` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `last_seen_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_device_token` (`platform`,`token`),
  KEY `idx_device_user` (`user_id`),
  KEY `idx_device_status` (`status`),
  CONSTRAINT `fk_device_token_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## registration_token

OTP and invite tokens for registration/onboarding flows.

```sql
CREATE TABLE `registration_token` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `purpose` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'registration',
  `channel_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel_value` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invite_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `token` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `otp_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `meta_json` json DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_regtok_channel` (`channel_type`,`channel_value`),
  KEY `idx_regtok_invite` (`invite_code`),
  KEY `idx_regtok_token` (`token`),
  KEY `idx_regtok_status_expires` (`status`,`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## verification_status

KYC-style verification state tracking per account and verification type.

```sql
CREATE TABLE `verification_status` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `account_id` bigint unsigned NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `meta_json` json DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_verification_account_type` (`account_id`,`type`),
  KEY `idx_verification_status` (`type`,`status`),
  CONSTRAINT `fk_verification_account` FOREIGN KEY (`account_id`) REFERENCES `account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Relationships

```
user
  ├─> user_credential (FK: user_id)
  ├─> person (FK: primary_user_id) [reverse: person can link to user]
  └─> device_token (FK: user_id)

person
  ├─> person_identity (FK: person_id)
  ├─> person_relationship (FK: from_person_id, to_person_id)
  └─> account_person (FK: person_id)

account
  ├─> account_person (FK: account_id)
  └─> verification_status (FK: account_id)

address - Polymorphic (no FK, uses owner_type + owner_id)
registration_token - Standalone (pre-user creation)
```

---

## Key Design Patterns

1. **User vs Person Separation**:
   - `user` = login/authentication identity
   - `person` = human profile (can exist without login, e.g., dependents)

2. **Polymorphic Patterns**:
   - `address.owner_type` + `owner_id` enables addresses for accounts, persons, providers, etc.

3. **Relationship Graph**: `person_relationship` enables family trees and dependent tracking

4. **Account Grouping**: `account` is the billing/subscription unit, groups multiple persons

5. **Multi-Factor Identity**: `person_identity` supports multiple ID types per person (national ID, passport, etc.)

6. **Token Management**:
   - `registration_token` for pre-authentication flows (OTP, invites)
   - `device_token` for push notifications post-authentication

7. **Credential Flexibility**: `user_credential` supports passwords, OAuth, biometric references

8. **Verification Tracking**: `verification_status` enables progressive KYC (email verified, ID verified, etc.)

---

## Usage Guidelines

### User Lifecycle
1. Create `registration_token` with OTP
2. Verify OTP → create `user` + `person` + `account` + `account_person`
3. User logs in → create `device_token`
4. Complete KYC → update `verification_status`

### Address Handling
- Typically `owner_type='person'` or `owner_type='account'`
- Use `is_default=1` for primary address
- Support multiple address types (home, billing, shipping)

### Relationship Management
- Always create bidirectional relationships where needed
- Example: Parent→Child and Child→Parent with appropriate `relation_type`
