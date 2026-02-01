// Simple runnable test for Stripe webhook signature verification.
// Run: `node services/payments/tests/run-webhook-signature-test.js`
const crypto = require('crypto')
const Stripe = require('stripe')
const stripe = Stripe('sk_test_dummy')

const payloadObj = { id: 'evt_test', type: 'payment_intent.succeeded', data: { object: { id: 'pi_123' } } }
const payload = JSON.stringify(payloadObj)
const timestamp = Math.floor(Date.now() / 1000)
const webhookSecret = 'whsec_test_secret'

// Stripe signs payload as: `${timestamp}.${payload}` HMAC-SHA256 using the webhook secret
const signedPayload = `${timestamp}.${payload}`
const signature = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex')
const sigHeader = `t=${timestamp},v1=${signature}`

try {
  const event = stripe.webhooks.constructEvent(payload, sigHeader, webhookSecret)
  console.log('✅ Webhook signature verified. Event id:', event.id)
  process.exit(0)
} catch (err) {
  console.error('❌ Signature verification failed:', err.message)
  process.exit(2)
}
