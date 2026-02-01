const seedBalance = 1000.0

const accounts = new Map() // key: `${user_id}:${currency}` -> { id, user_id, currency, available_balance, hold_balance }
const reservations = new Map() // key: reservation_id -> { id, account_id, user_id, currency, amount, created_at }

function cryptoUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
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
    accounts.set(key, { id, user_id, currency, available_balance: seedBalance, hold_balance: 0 })
  }
  return accounts.get(key)
}

async function reserveFunds(user_id, currency = 'CRED', amount) {
  const key = `${user_id}:${currency}`
  if (!accounts.has(key)) {
    const acc = await getOrCreateAccount(user_id, currency)
    accounts.set(key, acc)
  }
  const account = accounts.get(key)
  if (account.available_balance < amount) return { error: 'insufficient_funds' }
  account.available_balance = parseFloat((account.available_balance - amount).toFixed(8))
  account.hold_balance = parseFloat((account.hold_balance + amount).toFixed(8))
  const reservation_id = cryptoUUID()
  reservations.set(reservation_id, { id: reservation_id, account_id: account.id, user_id, currency, amount, created_at: new Date().toISOString() })
  return { reservation_id, available_balance: account.available_balance }
}

async function commitReservation(reservation_id, payout_amount = 0, related_id = null) {
  const r = reservations.get(reservation_id)
  if (!r) return { error: 'invalid_reservation_id' }
  // find account by id
  const acc = Array.from(accounts.values()).find(a => a.id === r.account_id)
  if (!acc) return { error: 'invalid_reservation_id' }
  acc.hold_balance = parseFloat((acc.hold_balance - r.amount).toFixed(8))
  let payoutTx = null
  if (payout_amount > 0) {
    acc.available_balance = parseFloat((acc.available_balance + payout_amount).toFixed(8))
    payoutTx = { amount: payout_amount }
  }
  reservations.delete(reservation_id)
  return { committed: true, payout: payoutTx }
}

async function releaseReservation(reservation_id) {
  const r = reservations.get(reservation_id)
  if (!r) return { error: 'invalid_reservation_id' }
  const acc = Array.from(accounts.values()).find(a => a.id === r.account_id)
  if (!acc) return { error: 'invalid_reservation_id' }
  acc.available_balance = parseFloat((acc.available_balance + r.amount).toFixed(8))
  acc.hold_balance = parseFloat((acc.hold_balance - r.amount).toFixed(8))
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
