# services/api — Local Dev (in-memory wallet demo)

Quick demo to run the API locally using an in-memory JS wallet (no SQLite, no Docker).

1. Open PowerShell and change to the API folder:

```powershell
cd "C:\repos\glass-rose\services\api"
```

2. Start the API (in-memory wallet):

```powershell
$env:USE_INMEM_WALLET='1'
$env:PORT='4310'
node index.js 2>&1 | Tee-Object -FilePath api-log.txt
```

3. In a new PowerShell window run the demos (while server is running):

Reserve:
```powershell
powershell -File .\scripts\demo-reserve.ps1
```

Accounts:
```powershell
powershell -File .\scripts\demo-accounts.ps1
```

4. Outputs are written to `reserve-out.txt` and `accounts-out.txt` in the same folder. If you run into file-locks, start the server without piping logs, or move the repo out of OneDrive.
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
