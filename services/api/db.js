const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool()

async function init() {
  // Ensure pgcrypto and reservations table exist (safe to call multiple times)
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      currency TEXT NOT NULL,
      amount NUMERIC(18,8) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
}

async function getOrCreateAccount(user_id, currency = 'CRED') {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    let res = await client.query('SELECT * FROM accounts WHERE user_id = $1 AND currency = $2 FOR UPDATE', [user_id, currency])
    if (res.rowCount === 0) {
      // create with demo seed balance for local/dev use
      const seed = 1000.0
      await client.query('INSERT INTO accounts(user_id, currency, available_balance, hold_balance) VALUES($1,$2,$3,$4)', [user_id, currency, seed, 0])
      res = await client.query('SELECT * FROM accounts WHERE user_id = $1 AND currency = $2 FOR UPDATE', [user_id, currency])
    }
    await client.query('COMMIT')
    return res.rows[0]
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function reserveFunds(user_id, currency = 'CRED', amount) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // lock account row
    let res = await client.query('SELECT * FROM accounts WHERE user_id = $1 AND currency = $2 FOR UPDATE', [user_id, currency])
    if (res.rowCount === 0) {
      // create with seed
      const seed = 1000.0
      await client.query('INSERT INTO accounts(user_id, currency, available_balance, hold_balance) VALUES($1,$2,$3,$4)', [user_id, currency, seed, 0])
      res = await client.query('SELECT * FROM accounts WHERE user_id = $1 AND currency = $2 FOR UPDATE', [user_id, currency])
    }
    const account = res.rows[0]
    const available = parseFloat(account.available_balance)
    if (available < amount) {
      await client.query('ROLLBACK')
      return { error: 'insufficient_funds' }
    }
    const balance_before = available
    const new_available = (available - amount).toFixed(8)
    const new_hold = (parseFloat(account.hold_balance) + amount).toFixed(8)
    await client.query('UPDATE accounts SET available_balance = $1::numeric, hold_balance = $2::numeric WHERE id = $3', [new_available, new_hold, account.id])
    // create reservation
    const r = await client.query('INSERT INTO reservations(account_id, user_id, currency, amount) VALUES($1,$2,$3,$4) RETURNING id, created_at', [account.id, user_id, currency, amount])
    // ledger entry for reserve
    await client.query('INSERT INTO ledger_transactions(account_id, type, amount, balance_before, balance_after, related_type) VALUES($1,$2,$3,$4,$5,$6)', [account.id, 'reserve', (-amount), balance_before, new_available, 'reservation'])
    await client.query('COMMIT')
    return { reservation_id: r.rows[0].id, available_balance: parseFloat(new_available) }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function commitReservation(reservation_id, payout_amount = 0, related_id = null) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const rRes = await client.query('SELECT * FROM reservations WHERE id = $1 FOR UPDATE', [reservation_id])
    if (rRes.rowCount === 0) {
      await client.query('ROLLBACK')
      return { error: 'invalid_reservation_id' }
    }
    const r = rRes.rows[0]
    const accRes = await client.query('SELECT * FROM accounts WHERE id = $1 FOR UPDATE', [r.account_id])
    const account = accRes.rows[0]
    // finalize: reduce hold_balance by reserved amount
    const hold_before = parseFloat(account.hold_balance)
    const new_hold = (hold_before - parseFloat(r.amount)).toFixed(8)
    await client.query('UPDATE accounts SET hold_balance = $1::numeric WHERE id = $2', [new_hold, account.id])
    // ledger entry for bet (reserved funds consumed)
    await client.query('INSERT INTO ledger_transactions(account_id, type, amount, balance_before, balance_after, related_id, related_type) VALUES($1,$2,$3,$4,$5,$6,$7)', [account.id, 'bet', (-r.amount), (parseFloat(account.available_balance)).toFixed(8), (parseFloat(account.available_balance)).toFixed(8), related_id, 'game'])

    let payoutTx = null
    if (payout_amount > 0) {
      // credit payout to available_balance
      const avail_before = parseFloat(account.available_balance)
      const new_avail = (avail_before + parseFloat(payout_amount)).toFixed(8)
      await client.query('UPDATE accounts SET available_balance = $1::numeric WHERE id = $2', [new_avail, account.id])
      await client.query('INSERT INTO ledger_transactions(account_id, type, amount, balance_before, balance_after, related_id, related_type) VALUES($1,$2,$3,$4,$5,$6,$7)', [account.id, 'win', payout_amount, avail_before, new_avail, related_id, 'game'])
      payoutTx = { amount: payout_amount }
    }

    await client.query('DELETE FROM reservations WHERE id = $1', [reservation_id])
    await client.query('COMMIT')
    return { committed: true, payout: payoutTx }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function releaseReservation(reservation_id) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const rRes = await client.query('SELECT * FROM reservations WHERE id = $1 FOR UPDATE', [reservation_id])
    if (rRes.rowCount === 0) {
      await client.query('ROLLBACK')
      return { error: 'invalid_reservation_id' }
    }
    const r = rRes.rows[0]
    const accRes = await client.query('SELECT * FROM accounts WHERE id = $1 FOR UPDATE', [r.account_id])
    const account = accRes.rows[0]
    const avail_before = parseFloat(account.available_balance)
    const new_avail = (avail_before + parseFloat(r.amount)).toFixed(8)
    const hold_before = parseFloat(account.hold_balance)
    const new_hold = (hold_before - parseFloat(r.amount)).toFixed(8)
    await client.query('UPDATE accounts SET available_balance = $1::numeric, hold_balance = $2::numeric WHERE id = $3', [new_avail, new_hold, account.id])
    await client.query('INSERT INTO ledger_transactions(account_id, type, amount, balance_before, balance_after, related_type) VALUES($1,$2,$3,$4,$5,$6)', [account.id, 'refund', r.amount, avail_before, new_avail, 'reservation'])
    await client.query('DELETE FROM reservations WHERE id = $1', [reservation_id])
    await client.query('COMMIT')
    return { released: true, balance: parseFloat(new_avail) }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

module.exports = { init, reserveFunds, commitReservation, releaseReservation, getOrCreateAccount, pool }
