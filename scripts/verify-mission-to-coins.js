/**
 * Verify Mission-to-Coins Flow
 * Shows the complete data flow from mission rewards to wallet balance
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
  console.log('='.repeat(80));
  console.log('MISSION-TO-COINS FLOW VERIFICATION');
  console.log('='.repeat(80));

  // 1. Mission Reward Grants
  console.log('\n📋 Mission Reward Grants:');
  const [grants] = await connection.execute(
    `SELECT id, assignment_id, user_id, amount, currency, status, ref_type, ref_id
     FROM mission_reward_grant
     ORDER BY id`
  );
  console.table(grants);

  // 2. Ledger Transactions
  console.log('\n📋 Ledger Transactions:');
  const [txns] = await connection.execute(
    `SELECT id, account_id, type, status, ref_type, ref_id, idempotency_key
     FROM ledger_txn
     ORDER BY id`
  );
  console.table(txns);

  // 3. Wallet Balance
  console.log('\n📋 Wallet Balance:');
  const [balances] = await connection.execute(
    `SELECT wallet_id, available_amount, held_amount, total_amount, as_of
     FROM wallet_balance_snapshot
     ORDER BY wallet_id`
  );
  console.table(balances);

  // 4. Transaction History
  console.log('\n📋 Transaction History:');
  const [history] = await connection.execute(
    `SELECT id, wallet_id, ledger_txn_id, type, amount, balance_after, description
     FROM wallet_txn_history
     ORDER BY id`
  );
  console.table(history);

  // 5. Outbox Events
  console.log('\n📋 Outbox Events (last 10):');
  const [events] = await connection.execute(
    `SELECT id, event_type, status, attempts, created_at
     FROM outbox_event
     ORDER BY created_at DESC
     LIMIT 10`
  );
  console.table(events);

  await connection.end();

  console.log('\n' + '='.repeat(80));
  console.log('✅ VERIFICATION COMPLETE!');
  console.log('='.repeat(80));
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
