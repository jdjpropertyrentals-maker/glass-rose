/*
  KYC proxy service (Persona/Jumio) - minimal stubs
  - POST /v1/kyc/start -> returns provider token / client payload
  - POST /v1/kyc/webhook -> provider -> update verification status
*/

const express = require('express')
const bodyParser = require('body-parser')
const axios = require('axios')
require('dotenv').config()

const app = express()
app.use(bodyParser.json())

const PORT = process.env.PORT || 4100

// Start KYC flow - respond with provider client token or redirect URL
app.post('/v1/kyc/start', async (req, res) => {
  const { user_id, type } = req.body || {}
  if (!user_id) return res.status(400).json({ error: 'user_id required' })

  // Example: Persona - create a verification session and return client_token
  // Replace with real SDK/API calls and save provider reference in DB
  try {
    // PSEUDO-CODE: call Persona to create verification
    // const resp = await axios.post('https://api.withpersona.com/v1/verifications', {...})
    // return resp.data.client_token
    res.json({ provider: 'persona', client_token: 'persona_client_token_stub' })
  } catch (err) {
    console.error('KYC start error', err)
    res.status(500).json({ error: 'kyc provider error' })
  }
})

// KYC provider webhook
app.post('/v1/kyc/webhook', (req, res) => {
  // Providers will POST verification status updates here
  const event = req.body
  console.log('KYC webhook event:', event.type || 'unknown', event)
  // TODO: verify signature, lookup user_id via provider reference, update kyc_verifications table
  res.json({ received: true })
})

app.listen(PORT, () => {
  console.log(`KYC proxy running on http://localhost:${PORT}`)
})
