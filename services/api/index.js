/*
  Admin API + simple ledger endpoints (demo)
  - Admin endpoints for KYC and reconciliation (stubs)
  - Wallet endpoints for reserve/commit/release to support atomic bet flows
  NOTE: This is a demo; in production implement DB transactions and strong auth.
*/

const express = require('express')
const bodyParser = require('body-parser')
const crypto = require('crypto')
require('dotenv').config()

const app = express()
app.use(bodyParser.json())

const PORT = process.env.PORT || 4300

// choose DB adapter: prefer Postgres if DATABASE_URL set, otherwise use sqlite dev adapter
let db
if (process.env.USE_INMEM_WALLET === '1' || process.env.USE_INMEM_WALLET === 'true') {
  db = require('./db_inmem')
} else if (process.env.DATABASE_URL) {
  db = require('./db')
} else {
  db = require('./db_sqlite')
}

// initialize DB resources (create tables)
db.init().catch(err => {
  console.error('DB init error', err)
})

// --- Wallet / Ledger endpoints ---
// Reserve funds for a pending bet
app.post('/v1/wallets/reserve', async (req, res) => {
  const { user_id, currency = 'CRED', amount } = req.body || {}
  if (!user_id || typeof amount !== 'number') return res.status(400).json({ error: 'user_id and numeric amount required' })
  try {
    const r = await db.reserveFunds(user_id, currency, amount)
    if (r && r.error === 'insufficient_funds') return res.status(402).json({ error: 'insufficient_funds' })
    res.json(r)
  } catch (err) {
    console.error('reserve error', err)
    res.status(500).json({ error: 'reserve_failed' })
  }
})

// Commit a reservation: finalize bet and credit any payout
app.post('/v1/wallets/commit', async (req, res) => {
  const { reservation_id, payout_amount = 0, related_id } = req.body || {}
  if (!reservation_id) return res.status(400).json({ error: 'reservation_id required' })
  try {
    const result = await db.commitReservation(reservation_id, payout_amount, related_id)
    if (result && result.error === 'invalid_reservation_id') return res.status(400).json({ error: 'invalid_reservation_id' })
    res.json(result)
  } catch (err) {
    console.error('commit error', err)
    res.status(500).json({ error: 'commit_failed' })
  }
})

// Release a reservation (refund to available balance)
app.post('/v1/wallets/release', async (req, res) => {
  const { reservation_id } = req.body || {}
  if (!reservation_id) return res.status(400).json({ error: 'reservation_id required' })
  try {
    const result = await db.releaseReservation(reservation_id)
    if (result && result.error === 'invalid_reservation_id') return res.status(400).json({ error: 'invalid_reservation_id' })
    res.json(result)
  } catch (err) {
    console.error('release error', err)
    res.status(500).json({ error: 'release_failed' })
  }
})

app.get('/v1/accounts/:user_id', async (req, res) => {
  const user_id = req.params.user_id
  try {
    if (db.getAccounts) {
      // sqlite adapter
      const rows = await db.getAccounts(user_id)
      const accounts = {}
      rows.forEach(r => { accounts[r.currency] = { available: parseFloat(r.available_balance), hold: parseFloat(r.hold_balance) } })
      return res.json({ user_id, accounts })
    }

    // postgres adapter
    const q = await db.pool.query('SELECT currency, available_balance, hold_balance FROM accounts WHERE user_id = $1', [user_id])
    const accounts = {}
    q.rows.forEach(r => { accounts[r.currency] = { available: parseFloat(r.available_balance), hold: parseFloat(r.hold_balance) } })
    res.json({ user_id, accounts })
  } catch (err) {
    console.error('accounts fetch error', err)
    res.status(500).json({ error: 'accounts_fetch_failed' })
  }
})

// --- Admin endpoints (existing stubs) ---
app.post('/v1/admin/kyc/:id/review', (req, res) => {
  const kycId = req.params.id
  const { action, notes } = req.body || {}
  if (!action || (action !== 'approve' && action !== 'reject')) return res.status(400).json({ error: 'invalid action' })
  console.log(`Admin ${action} kyc ${kycId}`, { notes })
  res.json({ id: kycId, status: action === 'approve' ? 'approved' : 'rejected' })
})

app.post('/v1/admin/reconcile-deposit', (req, res) => {
  const { deposit_id } = req.body || {}
  if (!deposit_id) return res.status(400).json({ error: 'deposit_id required' })
  console.log('Reconciling deposit', deposit_id)
  res.json({ deposit_id, reconciled: true })
})

app.post('/v1/admin/process-withdrawal', (req, res) => {
  const { withdrawal_id, action } = req.body || {}
  if (!withdrawal_id || !action) return res.status(400).json({ error: 'withdrawal_id and action required' })
  console.log('Withdrawal action', withdrawal_id, action)
  res.json({ withdrawal_id, action, processed: true })
})

app.listen(PORT, () => console.log(`API admin service running on http://localhost:${PORT}`))
