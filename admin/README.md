Admin UI

Quickstart
1. Start the admin Next.js app:

```powershell
cd admin
npm install
npm run dev
```

Notes
- Protect admin routes behind strong auth (SSH/VPN + SSO) in production.
- The admin UI calls the `services/api` admin endpoints for KYC review and reconciliation.
