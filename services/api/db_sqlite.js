const path = require('path')
const fs = require('fs')
const sqlite3 = require('sqlite3')

const DB_FILE = path.join(__dirname, 'dev.sqlite3')
const seedBalance = 1000.0
const USE_INMEM = process.env.USE_SQLITE_INMEM === '1' || process.env.USE_SQLITE_INMEM === 'true'
let inMemoryDb = null

function openDb() {
  if (USE_INMEM) {
    if (!inMemoryDb) inMemoryDb = new sqlite3.Database(':memory:')
    return { db: inMemoryDb, exists: true }
  }
  const exists = fs.existsSync(DB_FILE)
  const db = new sqlite3.Database(DB_FILE)
  return { db, exists }
}

function run(db, sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err)
      resolve(this)
    })
  })
}

function get(db, sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err)
      resolve(row)
    })
  })
}

function all(db, sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err)
      resolve(rows)
    })
  })
}

async function init() {
  const { db, exists } = openDb()
  // create minimal tables needed for wallet flows
  await run(db, `PRAGMA journal_mode = WAL;`)
  await run(db, `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT);`)
  await run(db, `CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, user_id TEXT, currency TEXT, available_balance REAL, hold_balance REAL, UNIQUE(user_id, currency));`)
  await run(db, `CREATE TABLE IF NOT EXISTS reservations (id TEXT PRIMARY KEY, account_id TEXT, user_id TEXT, currency TEXT, amount REAL, created_at TEXT);`)
  await run(db, `CREATE TABLE IF NOT EXISTS ledger_transactions (id TEXT PRIMARY KEY, account_id TEXT, type TEXT, amount REAL, balance_before REAL, balance_after REAL, related_id TEXT, related_type TEXT, created_at TEXT);`)
  if (!USE_INMEM) db.close()
}

async function getOrCreateAccount(user_id, currency='CRED') {
  const { db } = openDb()
  try {
    await run(db, 'BEGIN TRANSACTION')
    let row = await get(db, 'SELECT rowid as id, * FROM accounts WHERE user_id = ? AND currency = ?;', [user_id, currency])
    if (!row) {
      const id = cryptoUUID()
      await run(db, 'INSERT INTO accounts(id, user_id, currency, available_balance, hold_balance) VALUES(?,?,?,?,?)', [id, user_id, currency, seedBalance, 0])
      row = await get(db, 'SELECT rowid as id, * FROM accounts WHERE id = ?', [id])
    }
    await run(db, 'COMMIT')
    return row
  } catch (err) {
    await run(db, 'ROLLBACK')
    throw err
  } finally {
    if (!USE_INMEM) db.close()
  }
}

function cryptoUUID() {
  // simple UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

async function reserveFunds(user_id, currency='CRED', amount) {
  const { db } = openDb()
  try {
    await run(db, 'BEGIN TRANSACTION')
    let account = await get(db, 'SELECT * FROM accounts WHERE user_id = ? AND currency = ?;', [user_id, currency])
    if (!account) {
      const accId = cryptoUUID()
      await run(db, 'INSERT INTO accounts(id, user_id, currency, available_balance, hold_balance) VALUES(?,?,?,?,?)', [accId, user_id, currency, seedBalance, 0])
      account = await get(db, 'SELECT * FROM accounts WHERE id = ?', [accId])
    }
    if (account.available_balance < amount) {
      await run(db, 'ROLLBACK')
      return { error: 'insufficient_funds' }
    }
    const newAvailable = account.available_balance - amount
    const newHold = account.hold_balance + amount
    await run(db, 'UPDATE accounts SET available_balance = ?, hold_balance = ? WHERE id = ?', [newAvailable, newHold, account.id])
    const reservationId = cryptoUUID()
    await run(db, 'INSERT INTO reservations(id, account_id, user_id, currency, amount, created_at) VALUES(?,?,?,?,?,?)', [reservationId, account.id, user_id, currency, amount, new Date().toISOString()])
    await run(db, 'INSERT INTO ledger_transactions(id, account_id, type, amount, balance_before, balance_after, related_type, created_at) VALUES(?,?,?,?,?,?,?,?)', [cryptoUUID(), account.id, 'reserve', -amount, account.available_balance, newAvailable, 'reservation', new Date().toISOString()])
    await run(db, 'COMMIT')
    return { reservation_id: reservationId, available_balance: newAvailable }
  } catch (err) {
    await run(db, 'ROLLBACK')
    throw err
  } finally {
    if (!USE_INMEM) db.close()
  }
}

async function commitReservation(reservation_id, payout_amount=0, related_id=null) {
  const { db } = openDb()
  try {
    await run(db, 'BEGIN TRANSACTION')
    const r = await get(db, 'SELECT * FROM reservations WHERE id = ?', [reservation_id])
    if (!r) { await run(db, 'ROLLBACK'); return { error: 'invalid_reservation_id' } }
    const account = await get(db, 'SELECT * FROM accounts WHERE id = ?', [r.account_id])
    // reduce hold
    const newHold = account.hold_balance - r.amount
    await run(db, 'UPDATE accounts SET hold_balance = ? WHERE id = ?', [newHold, account.id])
    await run(db, 'INSERT INTO ledger_transactions(id, account_id, type, amount, balance_before, balance_after, related_id, related_type, created_at) VALUES(?,?,?,?,?,?,?,?,?)', [cryptoUUID(), account.id, 'bet', -r.amount, account.available_balance, account.available_balance, related_id, 'game', new Date().toISOString()])
    let payoutTx = null
    if (payout_amount > 0) {
      const newAvail = account.available_balance + payout_amount
      await run(db, 'UPDATE accounts SET available_balance = ? WHERE id = ?', [newAvail, account.id])
      await run(db, 'INSERT INTO ledger_transactions(id, account_id, type, amount, balance_before, balance_after, related_id, related_type, created_at) VALUES(?,?,?,?,?,?,?,?,?)', [cryptoUUID(), account.id, 'win', payout_amount, account.available_balance, newAvail, related_id, 'game', new Date().toISOString()])
      payoutTx = { amount: payout_amount }
    }
    await run(db, 'DELETE FROM reservations WHERE id = ?', [reservation_id])
    await run(db, 'COMMIT')
    return { committed: true, payout: payoutTx }
  } catch (err) {
    await run(db, 'ROLLBACK')
    throw err
  } finally {
    if (!USE_INMEM) db.close()
  }
}

async function releaseReservation(reservation_id) {
  const { db } = openDb()
  try {
    await run(db, 'BEGIN TRANSACTION')
    const r = await get(db, 'SELECT * FROM reservations WHERE id = ?', [reservation_id])
    if (!r) { await run(db, 'ROLLBACK'); return { error: 'invalid_reservation_id' } }
    const account = await get(db, 'SELECT * FROM accounts WHERE id = ?', [r.account_id])
    const newAvail = account.available_balance + r.amount
    const newHold = account.hold_balance - r.amount
    await run(db, 'UPDATE accounts SET available_balance = ?, hold_balance = ? WHERE id = ?', [newAvail, newHold, account.id])
    await run(db, 'INSERT INTO ledger_transactions(id, account_id, type, amount, balance_before, balance_after, related_type, created_at) VALUES(?,?,?,?,?,?,?,?)', [cryptoUUID(), account.id, 'refund', r.amount, account.available_balance, newAvail, 'reservation', new Date().toISOString()])
    await run(db, 'DELETE FROM reservations WHERE id = ?', [reservation_id])
    await run(db, 'COMMIT')
    return { released: true, balance: newAvail }
  } catch (err) {
    await run(db, 'ROLLBACK')
    throw err
  } finally {
    if (!USE_INMEM) db.close()
  }
}

async function getAccounts(user_id) {
  const { db } = openDb()
  try {
    const rows = await all(db, 'SELECT currency, available_balance, hold_balance FROM accounts WHERE user_id = ?', [user_id])
    if (!USE_INMEM) db.close()
    return rows
  } catch (err) {
    if (!USE_INMEM) db.close()
    throw err
  }
}

module.exports = { init, reserveFunds, commitReservation, releaseReservation, getOrCreateAccount, getAccounts }
