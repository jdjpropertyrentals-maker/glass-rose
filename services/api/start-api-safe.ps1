# Safe start: free port 4310 if occupied, then start server in a new window and log to api-log.txt
$port = 4310
$apiPath = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Kill process listening on the port (if any)
$lines = netstat -ano | Select-String ":$port\s+.*LISTENING" -SimpleMatch
if ($lines) {
  $pid = ($lines -split '\s+')[-1]
  Write-Output "Killing process $pid using port $port..."
  try { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue; Start-Sleep -Seconds 1 } catch {}
}

# Export demo env vars (matches .env defaults)
$env:USE_INMEM_WALLET='1'
$env:PORT="$port"
$env:NODE_ENV='development'
$env:LOG_LEVEL='info'
$env:DATABASE_URL=''
$env:ADMIN_SECRET='dev-admin-secret'

# Start server in a new PowerShell window so you can close it independently
Start-Process -FilePath powershell -ArgumentList "-NoExit","-Command","cd '$apiPath'; node index.js 2>&1 | Tee-Object -FilePath api-log.txt"
Write-Output "Started API in new window on port $port; logs -> $apiPath\\api-log.txt"
