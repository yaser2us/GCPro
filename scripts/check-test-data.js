/**
 * Check Test Data
 * Verifies that all required test data exists
 */

const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Odenza@2026',
    database: 'GCPRO',
  });

  console.log('✅ Connected to database\n');

  // Check users
  console.log('📋 Users:');
  const [users] = await connection.execute(
    'SELECT id, email, phone_number, status FROM user WHERE id IN (1, 2)'
  );
  console.table(users);

  // Check persons
  console.log('\n📋 Persons:');
  const [persons] = await connection.execute(
    'SELECT id, primary_user_id, type, full_name, status FROM person WHERE id IN (1, 2) OR primary_user_id IN (1, 2)'
  );
  console.table(persons);

  // Check system account
  console.log('\n📋 System Account:');
  const [accounts] = await connection.execute(
    'SELECT id, type, status FROM account WHERE id = 1'
  );
  console.table(accounts);

  // Check pending events
  console.log('\n📋 Pending Events:');
  const [events] = await connection.execute(
    'SELECT id, event_type, status, attempts FROM outbox_event WHERE status = ?',
    ['new']
  );
  console.table(events);

  await connection.end();
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
