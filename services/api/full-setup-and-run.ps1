# Full setup + demo runner
# - Stops any running index.js instances under this repo
# - Starts the API in a new PowerShell window (logs to api-log.txt)
# - Runs reserve -> accounts -> commit -> accounts -> release -> accounts

$apiPath = "C:\Users\leesy\OneDrive\Pictures\Screenshots\GlassRose\services\api"

Write-Output "Switching to $apiPath"
Set-Location $apiPath

# Find and stop node processes running index.js in this folder
Write-Output "Looking for existing node processes running index.js in $apiPath..."
$procs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine -match 'node' -and $_.CommandLine -match 'index.js' -and $_.CommandLine -match [regex]::Escape($apiPath) }
if ($procs) {
  foreach ($p in $procs) {
    Write-Output "Stopping process ID $($p.ProcessId): $($p.CommandLine)"
    try { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue } catch { }
  }
  Start-Sleep -Seconds 1
} else {
  Write-Output "No running node/index.js processes found under $apiPath"
}

# Start server in a new window and log output
Write-Output "Starting API in new window on port 4310..."
Start-Process -FilePath powershell -ArgumentList "-NoExit","-Command","cd '$apiPath'; node index.js 2>&1 | Tee-Object -FilePath api-log.txt"

# Wait a moment for server to come up
Start-Sleep -Seconds 2

# Helper to extract the latest reservation_id from reserve-out.txt
function Get-LatestReservationId {
  $raw = Get-Content "$apiPath\reserve-out.txt" -Raw -ErrorAction SilentlyContinue
  if (-not $raw) { return $null }
  $matches = [regex]::Matches($raw, '"reservation_id"\s*:\s*"(.*?)"')
  if ($matches.Count -gt 0) { return $matches[$matches.Count - 1].Groups[1].Value }
  return $null
}

# Run reserve
Write-Output "Running reserve demo..."
powershell -File "$apiPath\scripts\demo-reserve.ps1"
Write-Output (Get-Content "$apiPath\reserve-out.txt" -Raw)

# Run accounts
Write-Output "Running accounts demo..."
powershell -File "$apiPath\scripts\demo-accounts.ps1"
Write-Output (Get-Content "$apiPath\accounts-out.txt" -Raw)

# Commit the most recent reservation (if any)
$resid = Get-LatestReservationId
if ($resid) {
  Write-Output "Committing reservation $resid..."
  try { Invoke-RestMethod -Method Post -Uri "http://localhost:4310/v1/wallets/commit" -ContentType "application/json" -Body (@{reservation_id=$resid} | ConvertTo-Json) } catch { Write-Output "Commit failed: $($_.Exception.Response.Content)" }
  Start-Sleep -Milliseconds 500
  powershell -File "$apiPath\scripts\demo-accounts.ps1"
  Write-Output (Get-Content "$apiPath\accounts-out.txt" -Raw)
} else {
  Write-Output "No reservation_id found; skipping commit."
}

# Release the same reservation (if still valid)
if ($resid) {
  Write-Output "Releasing reservation $resid..."
  try { Invoke-RestMethod -Method Post -Uri "http://localhost:4310/v1/wallets/release" -ContentType "application/json" -Body (@{reservation_id=$resid} | ConvertTo-Json) } catch { Write-Output "Release failed: $($_.Exception.Response.Content)" }
  Start-Sleep -Milliseconds 500
  powershell -File "$apiPath\scripts\demo-accounts.ps1"
  Write-Output (Get-Content "$apiPath\accounts-out.txt" -Raw)
} else {
  Write-Output "No reservation_id found; skipping release."
}

Write-Output "Full demo finished. Close the server window started earlier when done."
