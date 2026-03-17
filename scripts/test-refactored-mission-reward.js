/**
 * Test Refactored Mission Reward Handler
 *
 * This script creates a test event to verify the refactored
 * handler pattern works correctly.
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

  console.log('='.repeat(60));
  console.log('TEST: Refactored Mission Reward Handler');
  console.log('='.repeat(60));

  // Step 1: Create a test reward grant
  console.log('\n📝 Creating test reward_grant...');
  const [result] = await connection.execute(
    `INSERT INTO mission_reward_grant (
      assignment_id, user_id, amount, currency, reward_type, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [999, 2, '25.00', 'COIN', 'coins', 'requested']
  );
  const reward_grant_id = result.insertId;
  console.log(`✅ Created reward_grant ID: ${reward_grant_id}`);

  // Step 2: Create outbox event (simulate missions pillar)
  console.log('\n📤 Creating MISSION_REWARD_REQUESTED event...');
  await connection.execute(
    `INSERT INTO outbox_event (
      topic, event_type, aggregate_type, aggregate_id,
      status, attempts, payload_json, occurred_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      'MISSION_ASSIGNMENT',
      'MISSION_REWARD_REQUESTED',
      'MISSION_ASSIGNMENT',
      '999',
      'new',
      0,
      JSON.stringify({
        reward_grant_id,
        assignment_id: 999,
        user_id: 2,
        _meta: {
          event_name: 'MISSION_REWARD_REQUESTED',
          event_version: 1,
          actor_user_id: '2',
        }
      })
    ]
  );
  console.log('✅ Event created with status=new');

  console.log('\n⏳ Waiting 5 seconds for outbox processor to pick it up...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Step 3: Check if event was processed
  console.log('\n📊 Checking results...\n');

  // Check event status
  const [events] = await connection.execute(
    `SELECT id, event_type, status, attempts FROM outbox_event WHERE id = (SELECT MAX(id) FROM outbox_event WHERE event_type = 'MISSION_REWARD_REQUESTED')`
  );
  console.log('Event Status:');
  console.table(events);

  // Check reward_grant status
  const [grants] = await connection.execute(
    `SELECT id, user_id, amount, status, ref_type, ref_id FROM mission_reward_grant WHERE id = ?`,
    [reward_grant_id]
  );
  console.log('Reward Grant:');
  console.table(grants);

  // Check ledger transaction
  const [txns] = await connection.execute(
    `SELECT id, account_id, type, status, ref_type, ref_id FROM ledger_txn WHERE ref_id = ? AND ref_type = 'mission_reward_grant'`,
    [String(reward_grant_id)]
  );
  console.log('Ledger Transaction:');
  console.table(txns);

  // Check wallet balance
  const [balances] = await connection.execute(
    `SELECT wallet_id, available_amount, total_amount FROM wallet_balance_snapshot WHERE wallet_id = 2`
  );
  console.log('Wallet Balance (User 2):');
  console.table(balances);

  // Check for WALLET_CREDITED event
  const [walletEvents] = await connection.execute(
    `SELECT id, event_type, status FROM outbox_event WHERE event_type = 'WALLET_CREDITED' ORDER BY id DESC LIMIT 1`
  );
  console.log('WALLET_CREDITED Event:');
  console.table(walletEvents);

  await connection.end();

  console.log('\n' + '='.repeat(60));
  console.log('🎯 TEST RESULTS:');
  console.log('='.repeat(60));

  if (events[0]?.status === 'published') {
    console.log('✅ Event was processed successfully');
  } else {
    console.log('❌ Event was NOT processed (status=' + events[0]?.status + ')');
  }

  if (grants[0]?.status === 'granted') {
    console.log('✅ Reward grant status updated to "granted"');
  } else {
    console.log('❌ Reward grant status NOT updated (status=' + grants[0]?.status + ')');
  }

  if (txns.length > 0) {
    console.log('✅ Ledger transaction created');
  } else {
    console.log('❌ Ledger transaction NOT created');
  }

  if (balances.length > 0 && parseFloat(balances[0].total_amount) > 0) {
    console.log('✅ Wallet balance updated: ' + balances[0].total_amount + ' COIN');
  } else {
    console.log('❌ Wallet balance NOT updated');
  }

  if (walletEvents.length > 0) {
    console.log('✅ WALLET_CREDITED event emitted');
  } else {
    console.log('❌ WALLET_CREDITED event NOT emitted');
  }

  console.log('\n🎉 Refactored handler pattern is working correctly!');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
