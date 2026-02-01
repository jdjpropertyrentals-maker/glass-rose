Quick run (Windows PowerShell)

1) Start the API safely (will free port 4310 if needed and open a new window):

```powershell
cd "C:\Users\leesy\OneDrive\Pictures\Screenshots\GlassRose\services\api"
.\start-api-safe.ps1
```

2) In a separate PowerShell window run the automated demo (reserve → accounts → commit → accounts → release → accounts):

```powershell
powershell -File "C:\Users\leesy\OneDrive\Pictures\Screenshots\GlassRose\services\api\run-all-demos.ps1"
```

3) Manual quick checks (if you prefer):

```powershell
# create a reservation
cd "C:\Users\leesy\OneDrive\Pictures\Screenshots\GlassRose\services\api"
.\scripts\demo-reserve.ps1
Get-Content .\reserve-out.txt -Raw

# view accounts
.\scripts\demo-accounts.ps1
Get-Content .\accounts-out.txt -Raw
```

Notes:
- The in-memory wallet (`USE_INMEM_WALLET=1`) is used by default; data is lost when the server stops.
- To persist locally, switch to SQLite or set `DATABASE_URL` to a Postgres instance (not covered here).
- If you get an EADDRINUSE error, run `start-api-safe.ps1` again (it will stop any process using port 4310).
 
SQLite persistence (one-line)

```powershell
cd "C:\Users\leesy\OneDrive\Pictures\Screenshots\GlassRose\services\api"
.\start-api-sqlite.ps1
```

Then run the demo scripts as before.
