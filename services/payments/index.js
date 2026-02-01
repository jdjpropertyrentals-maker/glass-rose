/*
  Payments service (Express) - Stripe + Coinbase Commerce stubs
  - POST /v1/payments/deposit/stripe/create-session
  - POST /v1/payments/webhook/stripe
  - POST /v1/payments/deposit/coinbase/create
  - POST /v1/payments/webhook/coinbase

  Notes: install dependencies and set env from .env.example before running.
*/

const express = require('express')
const bodyParser = require('body-parser')
const Stripe = require('stripe')
const coinbase = require('coinbase-commerce-node')

require('dotenv').config()

const app = express()
app.use(bodyParser.json())

const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_xxx')
const Client = coinbase.Client
const Charge = coinbase.resources.Charge
Client.init(process.env.COINBASE_COMMERCE_API_KEY || '')

const PORT = process.env.PORT || 4000

// Create a Stripe Checkout Session (server-side)
app.post('/v1/payments/deposit/stripe/create-session', async (req, res) => {
  const { amount, currency, user_id } = req.body || {}
  if (!amount || !currency) return res.status(400).json({ error: 'amount and currency required' })

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{ price_data: { currency, product_data: { name: 'Glass Rose Credits' }, unit_amount: Math.round(amount * 100) }, quantity: 1 }],
      success_url: `${process.env.API_BASE_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.API_BASE_URL}/payments/cancel`
    })
    // Save session.id and map to user_id in your DB for reconciliation (not implemented here)
    res.json({ sessionId: session.id })
  } catch (err) {
    console.error('Stripe create session error', err)
    res.status(500).json({ error: 'stripe error' })
  }
})

// Stripe webhook handler (verify signature)
app.post('/v1/payments/webhook/stripe', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('Stripe webhook signature verification failed.', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Handle the event types you care about
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object
      // TODO: reconcile session with deposit record and credit ledger
      console.log('Checkout session completed for', session.id)
      break
    case 'payment_intent.succeeded':
      console.log('Payment intent succeeded')
      break
    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  res.json({ received: true })
})

// Create Coinbase Commerce charge
app.post('/v1/payments/deposit/coinbase/create', async (req, res) => {
  const { amount, currency, user_id } = req.body || {}
  if (!amount || !currency) return res.status(400).json({ error: 'amount and currency required' })

  try {
    const chargeData = {
      name: 'Glass Rose Credits',
      description: `Deposit for user ${user_id}`,
      local_price: { amount: amount.toString(), currency },
      pricing_type: 'fixed_price',
      metadata: { user_id }
    }
    const charge = await Charge.create(chargeData)
    // Save charge.id and map to user deposit record in DB
    res.json({ charge })
  } catch (err) {
    console.error('Coinbase create charge error', err)
    res.status(500).json({ error: 'coinbase error' })
  }
})

// Coinbase Commerce webhook
app.post('/v1/payments/webhook/coinbase', (req, res) => {
  // Coinbase recommends verifying HMAC signature using shared secret
  // const signature = req.headers['x-cc-webhook-signature']
  // verify signature with COINBASE_WEBHOOK_SHARED_SECRET
  const event = req.body
  console.log('Coinbase webhook event', event.type)
  // TODO: handle charge:confirmed / charge:failed etc. Reconcile deposit and credit ledger
  res.json({ received: true })
})

app.listen(PORT, () => {
  console.log(`Payments service running on http://localhost:${PORT}`)
})
