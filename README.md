Glass Rose — Sweepstakes Casino (MVP)

Overview
- Glass Rose is a sweepstakes-style (AMOE) casino MVP: web-first, provably-fair slots, in-app credits, Stripe + Coinbase Commerce, and tiered KYC.

Tech stack (MVP)
- Frontend: Next.js + TypeScript
- Backend: Node.js (Express/Nest) or FastAPI
- DB: PostgreSQL
- Payments: Stripe (card) + Coinbase Commerce (crypto)
- KYC: Persona/Jumio
- Infra: Terraform + Kubernetes or managed PaaS

Next steps
1. Obtain written legal opinion for AMOE in target markets.
2. Implement core services: auth, ledger, audit, payments proxy, KYC proxy.
3. Build frontend with design tokens (see `web/design-tokens.json`).

Repository layout (planned)
- infrastructure/
- services/api/
- services/payments/
- services/kyc-proxy/
- web/
- admin/
- docs/

Contact
- Add maintainers and contact information here.
