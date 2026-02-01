/*
  Game server stub with provably-fair slot spin endpoint.
  - GET /v1/games
  - POST /v1/games/:id/spin
  - GET /v1/games/:id/server-seed-hash  (returns current precommitted hash)

  NOTE: This is a simple in-memory stub. Persist seeds and nonces in production.
*/

const express = require('express')
const bodyParser = require('body-parser')
const { generateServerSeed, serverSeedHash, spinResult } = require('./provablyFair')

const app = express()
app.use(bodyParser.json())

const PORT = process.env.PORT || 4200

// In-memory stores (for stub/demo only)
const games = [{ id: 'slots-basic', name: 'Crystal Rose Slots', rtp: 96.5 }]
const serverSeeds = {} // gameId -> { seed, hash, nonceCounter }

function ensureSeed(gameId) {
  if (!serverSeeds[gameId]) {
    const seed = generateServerSeed()
    serverSeeds[gameId] = { seed, hash: serverSeedHash(seed), nonceCounter: 0 }
  }
  return serverSeeds[gameId]
}

app.get('/v1/games', (req, res) => {
  res.json({ games })
})

app.get('/v1/games/:id/server-seed-hash', (req, res) => {
  const gameId = req.params.id
  const entry = ensureSeed(gameId)
  res.json({ server_seed_hash: entry.hash })
})

app.post('/v1/games/:id/spin', async (req, res) => {
  const gameId = req.params.id
  const { user_id, stake, client_seed } = req.body || {}
  if (!user_id || !stake || !client_seed) return res.status(400).json({ error: 'user_id, stake and client_seed required' })

  // Reserve stake via API wallet endpoint
  try {
    const reserveResp = await fetch('http://localhost:4300/v1/wallets/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, amount: Number(stake), currency: 'CRED' })
    })
    if (!reserveResp.ok) {
      const err = await reserveResp.json().catch(()=>({ error: 'reserve_failed' }))
      return res.status(402).json({ error: 'reserve_failed', detail: err })
    }
    var reserveData = await reserveResp.json()
  } catch (err) {
    console.error('Reserve error', err)
    return res.status(500).json({ error: 'reserve_error' })
  }

  const entry = ensureSeed(gameId)
  const nonce = ++entry.nonceCounter
  const result = spinResult(entry.seed, client_seed, nonce)
  const payout = Number((result.multiplier * stake).toFixed(8))

  // For provably-fair: reveal server seed used
  const serverReveal = entry.seed
  // Rotate seed and precommit next hash
  const newSeed = generateServerSeed()
  entry.seed = newSeed
  entry.hash = serverSeedHash(newSeed)
  entry.nonceCounter = 0

  // Commit reservation and apply payout via API
  try {
    const commitResp = await fetch('http://localhost:4300/v1/wallets/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservation_id: reserveData.reservation_id, payout_amount: payout, related_id: null })
    })
    if (!commitResp.ok) {
      const err = await commitResp.json().catch(()=>({ error: 'commit_failed' }))
      // attempt to release reservation
      await fetch('http://localhost:4300/v1/wallets/release', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ reservation_id: reserveData.reservation_id }) })
      return res.status(500).json({ error: 'commit_failed', detail: err })
    }
    var commitData = await commitResp.json()
  } catch (err) {
    console.error('Commit error', err)
    // attempt to release reservation
    await fetch('http://localhost:4300/v1/wallets/release', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ reservation_id: reserveData.reservation_id }) })
    return res.status(500).json({ error: 'commit_error' })
  }

  res.json({
    game_id: gameId,
    user_id,
    stake,
    symbols: result.symbols,
    multiplier: result.multiplier,
    payout,
    server_seed_reveal: serverReveal,
    server_seed_hash_next: entry.hash,
    nonce,
    wallet: commitData
  })
})

app.listen(PORT, () => {
  console.log(`Game server running on http://localhost:${PORT}`)
})
