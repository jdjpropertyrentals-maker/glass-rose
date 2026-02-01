/*
  Persona integration helpers (stub)
  - Replace with real Persona SDK usage and API keys
  - See https://withpersona.com/docs
*/

const axios = require('axios')

const PERSONA_API_BASE = 'https://api.withpersona.com' // adjust if needed
const PERSONA_API_KEY = process.env.PERSONA_API_KEY || ''

async function createVerificationSession(user) {
  // Example request body - adapt to Persona's API
  const payload = {
    inquiry: {
      // fields for verification
    },
    metadata: { user_id: user.id }
  }
  const resp = await axios.post(`${PERSONA_API_BASE}/v1/verifications`, payload, {
    headers: { Authorization: `Bearer ${PERSONA_API_KEY}` }
  })
  // Return client token or redirect URL to present to user
  return resp.data
}

function verifyPersonaWebhookSignature(req) {
  // Persona may send signatures; verify according to their docs.
  // This is a placeholder: implement HMAC or other verification per provider.
  return true
}

module.exports = { createVerificationSession, verifyPersonaWebhookSignature }
