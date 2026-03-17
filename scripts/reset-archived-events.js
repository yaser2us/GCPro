/**
 * Reset Archived Outbox Events
 *
 * This script resets archived outbox events back to 'new' status
 * so they can be reprocessed by the outbox processor.
 */

const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Odenza@2026',
    database: 'GCPRO',
  });

  console.log('✅ Connected to database');

  // Check for archived events
  const [archived] = await connection.execute(
    'SELECT id, event_type, status, attempts, created_at FROM outbox_event WHERE status = ? ORDER BY created_at DESC',
    ['archived']
  );

  if (archived.length === 0) {
    console.log('📭 No archived events found');
    await connection.end();
    return;
  }

  console.log(`\n📦 Found ${archived.length} archived event(s):`);
  archived.forEach(event => {
    console.log(`  - ID: ${event.id}, Type: ${event.event_type}, Attempts: ${event.attempts}`);
  });

  // Reset archived events to 'new' status
  const [result] = await connection.execute(
    'UPDATE outbox_event SET status = ?, attempts = 0 WHERE status = ?',
    ['new', 'archived']
  );

  console.log(`\n✅ Reset ${result.affectedRows} event(s) to 'new' status`);
  console.log('🚀 The outbox processor will pick them up within 2 seconds');

  await connection.end();
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
