const seedBalance = 1000.0

const accounts = new Map() // key: `${user_id}:${currency}` -> { id, user_id, currency, available_balance, hold_balance }
const accountsById = new Map() // key: id -> account object (secondary index for fast lookup)
const reservations = new Map() // key: reservation_id -> { id, account_id, user_id, currency, amount, created_at }

function cryptoUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

async function init() {
  // no-op for in-memory
}

async function getOrCreateAccount(user_id, currency = 'CRED') {
  const key = `${user_id}:${currency}`
  if (!accounts.has(key)) {
    const id = cryptoUUID()
    const account = { id, user_id, currency, available_balance: seedBalance, hold_balance: 0 }
    accounts.set(key, account)
    accountsById.set(id, account) // Add to secondary index
  }
  return accounts.get(key)
}

async function reserveFunds(user_id, currency = 'CRED', amount) {
  const key = `${user_id}:${currency}`
  if (!accounts.has(key)) {
    const acc = await getOrCreateAccount(user_id, currency)
    // Account is already set by getOrCreateAccount, no need to set again
  }
  const account = accounts.get(key)
  if (account.available_balance < amount) return { error: 'insufficient_funds' }
  // Reduce redundant parseFloat/toFixed by doing precision handling once
  account.available_balance = Math.round((account.available_balance - amount) * 1e8) / 1e8
  account.hold_balance = Math.round((account.hold_balance + amount) * 1e8) / 1e8
  const reservation_id = cryptoUUID()
  reservations.set(reservation_id, { id: reservation_id, account_id: account.id, user_id, currency, amount, created_at: new Date().toISOString() })
  return { reservation_id, available_balance: account.available_balance }
}

async function commitReservation(reservation_id, payout_amount = 0, related_id = null) {
  const r = reservations.get(reservation_id)
  if (!r) return { error: 'invalid_reservation_id' }
  // Use secondary index for O(1) lookup instead of O(n) scan
  const acc = accountsById.get(r.account_id)
  if (!acc) return { error: 'invalid_reservation_id' }
  acc.hold_balance = Math.round((acc.hold_balance - r.amount) * 1e8) / 1e8
  let payoutTx = null
  if (payout_amount > 0) {
    acc.available_balance = Math.round((acc.available_balance + payout_amount) * 1e8) / 1e8
    payoutTx = { amount: payout_amount }
  }
  reservations.delete(reservation_id)
  return { committed: true, payout: payoutTx }
}

async function releaseReservation(reservation_id) {
  const r = reservations.get(reservation_id)
  if (!r) return { error: 'invalid_reservation_id' }
  // Use secondary index for O(1) lookup instead of O(n) scan
  const acc = accountsById.get(r.account_id)
  if (!acc) return { error: 'invalid_reservation_id' }
  acc.available_balance = Math.round((acc.available_balance + r.amount) * 1e8) / 1e8
  acc.hold_balance = Math.round((acc.hold_balance - r.amount) * 1e8) / 1e8
  reservations.delete(reservation_id)
  return { released: true, balance: acc.available_balance }
}

async function getAccounts(user_id) {
  const rows = []
  for (const a of accounts.values()) {
    if (a.user_id === user_id) rows.push({ currency: a.currency, available_balance: a.available_balance, hold_balance: a.hold_balance })
  }
  return rows
}

module.exports = { init, reserveFunds, commitReservation, releaseReservation, getOrCreateAccount, getAccounts }
