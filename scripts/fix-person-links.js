/**
 * Fix Person-User Links
 * Updates person records to link them to their primary users
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

  // Update person ID 1 to link to user ID 1
  await connection.execute(
    'UPDATE person SET primary_user_id = ?, status = ? WHERE id = ?',
    [1, 'active', 1]
  );
  console.log('✅ Linked person ID 1 to user ID 1');

  // Update person ID 2 to link to user ID 2
  await connection.execute(
    'UPDATE person SET primary_user_id = ?, status = ? WHERE id = ?',
    [2, 'active', 2]
  );
  console.log('✅ Linked person ID 2 to user ID 2');

  // Verify
  console.log('\n📋 Updated Persons:');
  const [persons] = await connection.execute(
    'SELECT id, primary_user_id, type, full_name, status FROM person WHERE id IN (1, 2)'
  );
  console.table(persons);

  await connection.end();
  console.log('\n🎉 Person-user links fixed!');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
