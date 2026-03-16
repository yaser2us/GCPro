-- ========================================
-- GCPro Bootstrap Script
-- Creates initial admin user with full permissions
-- ========================================
-- Run this once to solve the chicken-egg problem
-- ========================================

-- 1. Create System Account (id=1)
INSERT INTO `account` (`id`, `type`, `status`, `created_at`, `updated_at`)
VALUES (1, 'system', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE `status` = 'active';

-- 2. Create Admin Person (id=1)
INSERT INTO `person` (
    `id`,
    `first_name`,
    `last_name`,
    `date_of_birth`,
    `gender`,
    `nationality`,
    `email`,
    `phone_number`,
    `status`,
    `created_at`,
    `updated_at`
) VALUES (
    1,
    'System',
    'Administrator',
    '1990-01-01',
    'other',
    'US',
    'admin@gcpro.local',
    '+10000000000',
    'active',
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE `status` = 'active';

-- 3. Create Admin User (id=1)
INSERT INTO `user` (
    `id`,
    `account_id`,
    `person_id`,
    `username`,
    `email`,
    `status`,
    `is_verified`,
    `created_at`,
    `updated_at`
) VALUES (
    1,
    1,
    1,
    'admin',
    'admin@gcpro.local',
    'active',
    1,
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE `status` = 'active', `is_verified` = 1;

-- 4. Create Admin Password Credential
-- Password: Admin@123 (bcrypt hash with salt rounds=10)
INSERT INTO `user_credential` (
    `user_id`,
    `type`,
    `secret`,
    `status`,
    `created_at`
) VALUES (
    1,
    'password',
    '$2b$10$YourBcryptHashHere.ReplaceThisWithActualHash',
    'active',
    NOW()
) ON DUPLICATE KEY UPDATE `status` = 'active';

-- 5. Create Core Permissions
INSERT INTO `permission` (`code`, `name`, `description`, `resource`, `action`, `created_at`)
VALUES
    ('permission:admin', 'Permission Admin', 'Full permission management access', 'permission', 'admin', NOW()),
    ('permission:read', 'Permission Read', 'Read permission data', 'permission', 'read', NOW()),
    ('permission:write', 'Permission Write', 'Create and update permissions', 'permission', 'write', NOW()),
    ('role:admin', 'Role Admin', 'Full role management access', 'role', 'admin', NOW()),
    ('role:read', 'Role Read', 'Read role data', 'role', 'read', NOW()),
    ('role:write', 'Role Write', 'Create and update roles', 'role', 'write', NOW()),
    ('user:admin', 'User Admin', 'Full user management access', 'user', 'admin', NOW()),
    ('user:read', 'User Read', 'Read user data', 'user', 'read', NOW()),
    ('user:write', 'User Write', 'Create and update users', 'user', 'write', NOW()),
    ('person:admin', 'Person Admin', 'Full person management access', 'person', 'admin', NOW()),
    ('person:read', 'Person Read', 'Read person data', 'person', 'read', NOW()),
    ('person:write', 'Person Write', 'Create and update persons', 'person', 'write', NOW()),
    ('file:admin', 'File Admin', 'Full file management access', 'file', 'admin', NOW()),
    ('file:read', 'File Read', 'Read file data', 'file', 'read', NOW()),
    ('file:write', 'File Write', 'Create and update files', 'file', 'write', NOW()),
    ('notification:admin', 'Notification Admin', 'Full notification management access', 'notification', 'admin', NOW()),
    ('notification:read', 'Notification Read', 'Read notification data', 'notification', 'read', NOW()),
    ('notification:write', 'Notification Write', 'Create and update notifications', 'notification', 'write', NOW()),
    ('mission:admin', 'Mission Admin', 'Full mission management access', 'mission', 'admin', NOW()),
    ('mission:approve', 'Mission Approve', 'Approve mission submissions', 'mission', 'approve', NOW()),
    ('mission:read', 'Mission Read', 'Read mission data', 'mission', 'read', NOW()),
    ('mission:write', 'Mission Write', 'Create and update missions', 'mission', 'write', NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 6. Create Super Admin Role
INSERT INTO `role` (`code`, `name`, `description`, `status`, `created_at`)
VALUES ('super_admin', 'Super Administrator', 'Full system access with all permissions', 'active', NOW())
ON DUPLICATE KEY UPDATE `status` = 'active';

-- 7. Get permission and role IDs
SET @super_admin_role_id = (SELECT `id` FROM `role` WHERE `code` = 'super_admin' LIMIT 1);
SET @perm_permission_admin = (SELECT `id` FROM `permission` WHERE `code` = 'permission:admin' LIMIT 1);
SET @perm_permission_read = (SELECT `id` FROM `permission` WHERE `code` = 'permission:read' LIMIT 1);
SET @perm_permission_write = (SELECT `id` FROM `permission` WHERE `code` = 'permission:write' LIMIT 1);
SET @perm_role_admin = (SELECT `id` FROM `permission` WHERE `code` = 'role:admin' LIMIT 1);
SET @perm_role_read = (SELECT `id` FROM `permission` WHERE `code` = 'role:read' LIMIT 1);
SET @perm_role_write = (SELECT `id` FROM `permission` WHERE `code` = 'role:write' LIMIT 1);
SET @perm_user_admin = (SELECT `id` FROM `permission` WHERE `code` = 'user:admin' LIMIT 1);
SET @perm_user_read = (SELECT `id` FROM `permission` WHERE `code` = 'user:read' LIMIT 1);
SET @perm_user_write = (SELECT `id` FROM `permission` WHERE `code` = 'user:write' LIMIT 1);
SET @perm_person_admin = (SELECT `id` FROM `permission` WHERE `code` = 'person:admin' LIMIT 1);
SET @perm_person_read = (SELECT `id` FROM `permission` WHERE `code` = 'person:read' LIMIT 1);
SET @perm_person_write = (SELECT `id` FROM `permission` WHERE `code` = 'person:write' LIMIT 1);
SET @perm_file_admin = (SELECT `id` FROM `permission` WHERE `code` = 'file:admin' LIMIT 1);
SET @perm_file_read = (SELECT `id` FROM `permission` WHERE `code` = 'file:read' LIMIT 1);
SET @perm_file_write = (SELECT `id` FROM `permission` WHERE `code` = 'file:write' LIMIT 1);
SET @perm_notification_admin = (SELECT `id` FROM `permission` WHERE `code` = 'notification:admin' LIMIT 1);
SET @perm_notification_read = (SELECT `id` FROM `permission` WHERE `code` = 'notification:read' LIMIT 1);
SET @perm_notification_write = (SELECT `id` FROM `permission` WHERE `code` = 'notification:write' LIMIT 1);
SET @perm_mission_admin = (SELECT `id` FROM `permission` WHERE `code` = 'mission:admin' LIMIT 1);
SET @perm_mission_approve = (SELECT `id` FROM `permission` WHERE `code` = 'mission:approve' LIMIT 1);
SET @perm_mission_read = (SELECT `id` FROM `permission` WHERE `code` = 'mission:read' LIMIT 1);
SET @perm_mission_write = (SELECT `id` FROM `permission` WHERE `code` = 'mission:write' LIMIT 1);

-- 8. Assign ALL permissions to Super Admin role
INSERT INTO `role_permission` (`role_id`, `permission_id`, `created_at`)
VALUES
    (@super_admin_role_id, @perm_permission_admin, NOW()),
    (@super_admin_role_id, @perm_permission_read, NOW()),
    (@super_admin_role_id, @perm_permission_write, NOW()),
    (@super_admin_role_id, @perm_role_admin, NOW()),
    (@super_admin_role_id, @perm_role_read, NOW()),
    (@super_admin_role_id, @perm_role_write, NOW()),
    (@super_admin_role_id, @perm_user_admin, NOW()),
    (@super_admin_role_id, @perm_user_read, NOW()),
    (@super_admin_role_id, @perm_user_write, NOW()),
    (@super_admin_role_id, @perm_person_admin, NOW()),
    (@super_admin_role_id, @perm_person_read, NOW()),
    (@super_admin_role_id, @perm_person_write, NOW()),
    (@super_admin_role_id, @perm_file_admin, NOW()),
    (@super_admin_role_id, @perm_file_read, NOW()),
    (@super_admin_role_id, @perm_file_write, NOW()),
    (@super_admin_role_id, @perm_notification_admin, NOW()),
    (@super_admin_role_id, @perm_notification_read, NOW()),
    (@super_admin_role_id, @perm_notification_write, NOW()),
    (@super_admin_role_id, @perm_mission_admin, NOW()),
    (@super_admin_role_id, @perm_mission_approve, NOW()),
    (@super_admin_role_id, @perm_mission_read, NOW()),
    (@super_admin_role_id, @perm_mission_write, NOW())
ON DUPLICATE KEY UPDATE `created_at` = NOW();

-- 9. Assign Super Admin role to admin user (user_id=1)
INSERT INTO `user_role` (`user_id`, `role_id`, `created_at`)
VALUES (1, @super_admin_role_id, NOW())
ON DUPLICATE KEY UPDATE `created_at` = NOW();

-- 10. Summary
SELECT
    'Bootstrap completed successfully!' as message,
    (SELECT COUNT(*) FROM `permission`) as total_permissions,
    (SELECT COUNT(*) FROM `role`) as total_roles,
    (SELECT COUNT(*) FROM `role_permission`) as role_permission_mappings,
    (SELECT COUNT(*) FROM `user_role`) as user_role_mappings;

SELECT 'Admin user created:' as info, `id`, `username`, `email`, `status` FROM `user` WHERE `id` = 1;
SELECT 'Admin role created:' as info, `id`, `code`, `name`, `status` FROM `role` WHERE `code` = 'super_admin';
