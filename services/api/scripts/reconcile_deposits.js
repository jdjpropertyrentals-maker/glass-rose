/*
  Reconciliation script (manual) - example template
  - Connects to Postgres, finds deposits with status 'pending', calls provider APIs or checks local provider ids,
    and marks deposits settled by creating ledger entries via SQL.

  NOTE: This is a template; adapt DB connection, SQL, and provider API calls for production.
*/

const { Client } = require('pg')
require('dotenv').config()

async function main(){
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  // Find pending deposits
  const res = await client.query("SELECT id, user_id, provider, provider_charge_id, amount, currency FROM deposits WHERE status='pending'")
  for (const row of res.rows){
    console.log('Reconciling deposit', row.id, row.provider)
    // TODO: call provider API to confirm settlement. Here we assume settled for demo.
    try {
      await client.query('BEGIN')
      // mark deposit settled
      await client.query("UPDATE deposits SET status='settled' WHERE id=$1", [row.id])
      // create ledger transaction crediting user's account (simplified)
      const insertLedger = `INSERT INTO ledger_transactions (account_id, type, amount, balance_before, balance_after, related_id, related_type) VALUES ((SELECT id FROM accounts WHERE user_id=$1 AND currency=$2), 'deposit', $3, 0, $3, $4, 'deposit')`
      await client.query(insertLedger, [row.user_id, row.currency, row.amount, row.id])
      await client.query('COMMIT')
      console.log('Reconciled', row.id)
    } catch (err){
      await client.query('ROLLBACK')
      console.error('Failed to reconcile', row.id, err)
    }
  }

  await client.end()
}

main().catch(err=>{ console.error(err); process.exit(1) })
