KYC proxy (Persona / Jumio)

Quickstart
1. Copy `.env.example` to `.env` and fill provider credentials.
2. Install and run:

```powershell
cd services/kyc-proxy
npm install
npm run dev
```

Endpoints
- POST /v1/kyc/start  - body: { user_id, type } -> returns provider token or redirect URL
- POST /v1/kyc/webhook - provider sends verification events here (verify signature before trusting)

Notes
- Use provider SDKs or server-side APIs to create verification sessions and webhooks.
- Persist provider_reference_id and verification status in `kyc_verifications` table.
- Only allow withdrawals after `kyc_verifications.status` is `approved` and AML checks pass.
