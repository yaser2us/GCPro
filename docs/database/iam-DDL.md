# IAM Pillar - DDL

> **Owner**: AuthZ Service
> **Tables**: 5 tables managing roles, permissions, and authorization
> **Source**: Extracted from FULL-DDL.md based on TABLE-OWNERSHIP.md

---

## Table of Contents
1. [role](#role) - Role catalog
2. [permission](#permission) - Permission catalog (codes)
3. [role_permission](#role_permission) - Role → permission mapping
4. [user_role](#user_role) - User → role assignment
5. [user_permission](#user_permission) - Direct grants/denies (effect)

---

## role

Role catalog defining authorization roles.

```sql
CREATE TABLE `role` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## permission

Permission catalog with hierarchical scopes.

```sql
CREATE TABLE `permission` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scope` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'api',
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_permission_code` (`code`),
  KEY `idx_permission_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## role_permission

Many-to-many mapping of roles to permissions.

```sql
CREATE TABLE `role_permission` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `role_id` bigint unsigned NOT NULL,
  `permission_id` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permission` (`role_id`,`permission_id`),
  KEY `idx_rp_permission` (`permission_id`),
  CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permission` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## user_role

User-to-role assignments (many-to-many).

```sql
CREATE TABLE `user_role` (
  `user_id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `idx_user_role_role` (`role_id`),
  CONSTRAINT `fk_user_role_role` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_user_role_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## user_permission

Direct permission grants or denies with effect field (allow/deny).

```sql
CREATE TABLE `user_permission` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `permission_id` bigint unsigned NOT NULL,
  `effect` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'allow',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_permission` (`user_id`,`permission_id`),
  KEY `idx_up_permission` (`permission_id`),
  CONSTRAINT `fk_up_permission` FOREIGN KEY (`permission_id`) REFERENCES `permission` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_up_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Relationships

```
role
  ├─> role_permission (FK: role_id)
  └─> user_role (FK: role_id)

permission
  ├─> role_permission (FK: permission_id)
  └─> user_permission (FK: permission_id)

user (from IDENTITY pillar)
  ├─> user_role (FK: user_id)
  └─> user_permission (FK: user_id)
```

---

## Key Design Patterns

1. **Role-Based Access Control (RBAC)**: Users inherit permissions through roles

2. **Direct Permission Overrides**: `user_permission` enables exceptions
   - `effect='allow'`: Grant specific permission
   - `effect='deny'`: Explicitly deny (overrides role grants)

3. **Permission Evaluation Order**:
   1. Check `user_permission` for explicit deny → DENY
   2. Check `user_permission` for explicit allow → ALLOW
   3. Check `user_role` → `role_permission` → ALLOW if present
   4. Default → DENY

4. **Cascade Behavior**:
   - Deleting a role cascades to `role_permission` (permissions removed)
   - Deleting a role restricts `user_role` deletion (must reassign users first)
   - Deleting a user cascades to both `user_role` and `user_permission`

5. **Immutable Catalog**: `role` and `permission` are typically seed data

---

## Usage Guidelines

### Permission Codes
- Use hierarchical dot notation: `policy.create`, `policy.read`, `policy.*.admin`
- Scope field enables API vs UI vs data-level permissions

### Role Assignment
- Assign users to roles via `user_role` (primary method)
- Use `user_permission` sparingly for exceptions

### Authorization Check
```sql
-- Check if user has permission
SELECT 1
FROM user_permission up
WHERE up.user_id = ? AND up.permission_id = ? AND up.effect = 'allow'
UNION
SELECT 1
FROM user_role ur
JOIN role_permission rp ON ur.role_id = rp.role_id
WHERE ur.user_id = ? AND rp.permission_id = ?
AND NOT EXISTS (
  SELECT 1 FROM user_permission up2
  WHERE up2.user_id = ? AND up2.permission_id = ? AND up2.effect = 'deny'
)
```

### Typical Roles
- `admin`: Full system access
- `agent`: Customer service operations
- `member`: End-user access
- `underwriter`: Medical/claims review
