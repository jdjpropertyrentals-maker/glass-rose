Payments service (Stripe + Coinbase Commerce)

Quickstart
1. Copy `.env.example` to `.env` and fill in test keys for `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `COINBASE_COMMERCE_API_KEY`.
2. Install deps and run:

```powershell
cd services/payments
npm install
npm run dev
```

Endpoints
- POST /v1/payments/deposit/stripe/create-session  - { amount, currency, user_id }
- POST /v1/payments/webhook/stripe  - Stripe webhook endpoint (verify signature)
- POST /v1/payments/deposit/coinbase/create  - { amount, currency, user_id }
- POST /v1/payments/webhook/coinbase  - Coinbase Commerce webhook

Notes
- Always verify webhook signatures and persist provider ids for reconciliation.
- Do not store card data; use Stripe Checkout/Elements to keep PCI scope low.
- Map provider events to `deposits` table and create `ledger_transactions` on final settlement.
