Admin API service

Quickstart
1. Install deps and run:

```powershell
cd services/api
npm install
npm run dev
```

Admin endpoints (stubs)
- POST /v1/admin/kyc/:id/review  - { action: 'approve'|'reject', notes }
- POST /v1/admin/reconcile-deposit - { deposit_id }
- POST /v1/admin/process-withdrawal - { withdrawal_id, action }

Notes
- Protect these endpoints with strong admin auth and RBAC.
- Implement audit logging for every action.
