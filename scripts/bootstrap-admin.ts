import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * Bootstrap Script - Creates initial admin user with full permissions
 *
 * This solves the chicken-egg problem where you need permissions to create permissions.
 *
 * Run with: npm run bootstrap:admin
 * or: npx ts-node scripts/bootstrap-admin.ts
 */

const DEFAULT_PASSWORD = 'Admin@123';
const BCRYPT_ROUNDS = 10;

async function bootstrap() {
  console.log('🚀 Starting GCPro Bootstrap...\n');

  // Load environment variables from .env file
  const envPath = path.resolve(__dirname, '..', '.env');
  dotenv.config({ path: envPath });
  console.log('📁 Loading environment from:', envPath);

  // Log connection details (without password)
  console.log('🔌 Database connection:');
  console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`   Port: ${process.env.DB_PORT || '3306'}`);
  console.log(`   User: ${process.env.DB_USERNAME || 'root'}`);
  console.log(`   Database: ${process.env.DB_DATABASE || 'gcpro'}`);
  console.log(`   Password: ${process.env.DB_PASSWORD ? '***' : '(empty)'}\n`);

  // Initialize DataSource
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'gcpro',
  });

  await dataSource.initialize();
  console.log('✅ Database connected\n');

  const qr = dataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();

  try {
    // Hash password
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);
    console.log('🔐 Password hashed');

    // 1. Create System Account
    await qr.query(`
      INSERT INTO account (id, type, status, created_at, updated_at)
      VALUES (1, 'system', 'active', NOW(), NOW())
      ON DUPLICATE KEY UPDATE status = 'active'
    `);
    console.log('✅ System account created (id=1)');

    // 2. Create Admin Person
    await qr.query(`
      INSERT INTO person (
        id, type, full_name, dob, gender, nationality, status, created_at, updated_at
      ) VALUES (
        1, 'individual', 'System Administrator', '1990-01-01', 'other', 'US', 'active', NOW(), NOW()
      ) ON DUPLICATE KEY UPDATE status = 'active'
    `);
    console.log('✅ Admin person created (id=1)');

    // 3. Create Admin User
    await qr.query(`
      INSERT INTO user (
        id, email, phone_number, email_verified_at, status, created_at, updated_at
      ) VALUES (
        1, 'admin@gcpro.local', '+10000000000', NOW(), 'active', NOW(), NOW()
      ) ON DUPLICATE KEY UPDATE status = 'active', email_verified_at = NOW()
    `);
    console.log('✅ Admin user created (id=1, email=admin@gcpro.local)');

    // 4. Create Admin Password Credential
    await qr.query(`
      INSERT INTO user_credential (user_id, type, secret_hash, created_at)
      VALUES (1, 'password', ?, NOW())
      ON DUPLICATE KEY UPDATE secret_hash = ?
    `, [passwordHash, passwordHash]);
    console.log(`✅ Password credential created (password: ${DEFAULT_PASSWORD})\n`);

    // 5. Create Core Permissions
    const permissions = [
      ['permission:admin', 'Permission Admin', 'Full permission management access'],
      ['permission:read', 'Permission Read', 'Read permission data'],
      ['permission:write', 'Permission Write', 'Create and update permissions'],
      ['role:admin', 'Role Admin', 'Full role management access'],
      ['role:read', 'Role Read', 'Read role data'],
      ['role:write', 'Role Write', 'Create and update roles'],
      ['user:admin', 'User Admin', 'Full user management access'],
      ['user:read', 'User Read', 'Read user data'],
      ['user:write', 'User Write', 'Create and update users'],
      ['person:admin', 'Person Admin', 'Full person management access'],
      ['person:read', 'Person Read', 'Read person data'],
      ['person:write', 'Person Write', 'Create and update persons'],
      ['file:admin', 'File Admin', 'Full file management access'],
      ['file:read', 'File Read', 'Read file data'],
      ['file:write', 'File Write', 'Create and update files'],
      ['notification:admin', 'Notification Admin', 'Full notification management access'],
      ['notification:read', 'Notification Read', 'Read notification data'],
      ['notification:write', 'Notification Write', 'Create and update notifications'],
      ['mission:admin', 'Mission Admin', 'Full mission management access'],
      ['mission:approve', 'Mission Approve', 'Approve mission submissions'],
      ['mission:read', 'Mission Read', 'Read mission data'],
      ['mission:write', 'Mission Write', 'Create and update missions'],
    ];

    for (const [code, name, description] of permissions) {
      await qr.query(`
        INSERT INTO permission (code, name, description, scope, status, created_at)
        VALUES (?, ?, ?, 'api', 'active', NOW())
        ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)
      `, [code, name, description]);
    }
    console.log(`✅ Created ${permissions.length} core permissions`);

    // 6. Create Super Admin Role
    await qr.query(`
      INSERT INTO role (code, name, created_at)
      VALUES ('super_admin', 'Super Administrator', NOW())
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);
    console.log('✅ Super Admin role created');

    // 7. Get role and permission IDs
    const [roleResult] = await qr.query(`SELECT id FROM role WHERE code = 'super_admin' LIMIT 1`);
    const roleId = roleResult.id;

    const permissionResults = await qr.query(`SELECT id, code FROM permission`);

    // 8. Assign all permissions to Super Admin role
    for (const perm of permissionResults) {
      await qr.query(`
        INSERT INTO role_permission (role_id, permission_id, created_at)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE created_at = NOW()
      `, [roleId, perm.id]);
    }
    console.log(`✅ Assigned ${permissionResults.length} permissions to Super Admin role`);

    // 9. Assign Super Admin role to admin user
    await qr.query(`
      INSERT INTO user_role (user_id, role_id, created_at)
      VALUES (1, ?, NOW())
      ON DUPLICATE KEY UPDATE created_at = NOW()
    `, [roleId]);
    console.log('✅ Assigned Super Admin role to admin user\n');

    await qr.commitTransaction();

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 Bootstrap completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`   - Admin User ID: 1`);
    console.log(`   - Username: admin`);
    console.log(`   - Password: ${DEFAULT_PASSWORD}`);
    console.log(`   - Email: admin@gcpro.local`);
    console.log(`   - Role: Super Administrator`);
    console.log(`   - Permissions: ${permissionResults.length} (all system permissions)`);
    console.log('\n💡 Next Steps:');
    console.log('   1. Update your Postman collection variable: user_id = 1');
    console.log('   2. Test the Permission API endpoints');
    console.log('   3. Create additional users and roles as needed');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    await qr.rollbackTransaction();
    console.error('❌ Bootstrap failed:', error);
    throw error;
  } finally {
    await qr.release();
    await dataSource.destroy();
  }
}

// Run bootstrap
bootstrap()
  .then(() => {
    console.log('✅ Process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
