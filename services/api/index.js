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

// In-memory demo stores (replace with DB in production)
const accounts = {} // user_id -> { currency -> available_balance }
const reservations = {} // reservation_id -> { user_id, currency, amount, created_at }
const ledger = [] // push ledger transaction records for demo

function ensureAccount(user_id, currency){
  if (!accounts[user_id]) accounts[user_id] = {}
  if (!accounts[user_id][currency]) accounts[user_id][currency] = 1000.0 // seed demo balance
  return accounts[user_id]
}

// --- Wallet / Ledger endpoints ---
// Reserve funds for a pending bet
app.post('/v1/wallets/reserve', (req, res) => {
  const { user_id, currency = 'CRED', amount } = req.body || {}
  if (!user_id || typeof amount !== 'number') return res.status(400).json({ error: 'user_id and numeric amount required' })
  const acct = ensureAccount(user_id, currency)
  if (acct[currency] < amount) return res.status(402).json({ error: 'insufficient_funds' })
  acct[currency] -= amount
  const reservation_id = crypto.randomUUID()
  reservations[reservation_id] = { user_id, currency, amount, created_at: new Date().toISOString() }
  console.log('Reserved', reservation_id, user_id, amount, currency)
  res.json({ reservation_id, available_balance: acct[currency] })
})

// Commit a reservation: finalize bet and credit any payout
app.post('/v1/wallets/commit', (req, res) => {
  const { reservation_id, payout_amount = 0, related_id } = req.body || {}
  if (!reservation_id || !reservations[reservation_id]) return res.status(400).json({ error: 'invalid reservation_id' })
  const r = reservations[reservation_id]
  // create bet ledger entry (debit was already applied by reserve, we record the transaction now)
  const betTx = { id: crypto.randomUUID(), account_user: r.user_id, type: 'bet', amount: -r.amount, currency: r.currency, related_id, timestamp: new Date().toISOString() }
  ledger.push(betTx)

  let payoutTx = null
  if (payout_amount > 0){
    // credit payout
    ensureAccount(r.user_id, r.currency)
    accounts[r.user_id][r.currency] += payout_amount
    payoutTx = { id: crypto.randomUUID(), account_user: r.user_id, type: 'win', amount: payout_amount, currency: r.currency, related_id, timestamp: new Date().toISOString() }
    ledger.push(payoutTx)
  }

  delete reservations[reservation_id]
  res.json({ committed: true, bet: betTx, payout: payoutTx, balance: accounts[r.user_id][r.currency] })
})

// Release a reservation (refund to available balance)
app.post('/v1/wallets/release', (req, res) => {
  const { reservation_id } = req.body || {}
  if (!reservation_id || !reservations[reservation_id]) return res.status(400).json({ error: 'invalid reservation_id' })
  const r = reservations[reservation_id]
  ensureAccount(r.user_id, r.currency)
  accounts[r.user_id][r.currency] += r.amount
  delete reservations[reservation_id]
  res.json({ released: true, balance: accounts[r.user_id][r.currency] })
})

app.get('/v1/accounts/:user_id', (req, res) => {
  const user_id = req.params.user_id
  res.json({ user_id, accounts: accounts[user_id] || {} })
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
