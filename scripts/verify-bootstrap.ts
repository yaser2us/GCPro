import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function verify() {
  // Load environment variables
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

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

  // Check user
  const [user] = await dataSource.query('SELECT * FROM user WHERE id = 1');
  console.log('👤 Admin User:', user);

  // Check role
  const [userRole] = await dataSource.query(`
    SELECT r.* FROM role r
    JOIN user_role ur ON r.id = ur.role_id
    WHERE ur.user_id = 1
  `);
  console.log('\n🎭 Admin Role:', userRole);

  // Check permissions
  const permissions = await dataSource.query(`
    SELECT p.code, p.name
    FROM permission p
    INNER JOIN role_permission rp ON p.id = rp.permission_id
    INNER JOIN user_role ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = 1
    ORDER BY p.code
  `);
  console.log(`\n🔑 Admin Permissions (${permissions.length} total):`);
  permissions.forEach((p: any) => console.log(`   - ${p.code}: ${p.name}`));

  await dataSource.destroy();
}

verify()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
