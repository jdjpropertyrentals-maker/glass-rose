# Automate full demo: start server in a new window, run reserve/accounts/commit/release
# Run this from any folder; it will open a new PowerShell window running the server.
$apiPath = "C:\Users\leesy\OneDrive\Pictures\Screenshots\GlassRose\services\api"

# Start server in a new PowerShell window (leave it open)
Start-Process -FilePath powershell -ArgumentList "-NoExit","-Command","cd '$apiPath'; .\start-api.ps1"

Write-Output "Waiting 2 seconds for server to start..."
Start-Sleep -Seconds 2

# Run reserve
Write-Output "Running reserve demo..."
powershell -File "$apiPath\scripts\demo-reserve.ps1"
Get-Content "$apiPath\reserve-out.txt" -Raw | Write-Output

# Run accounts
Write-Output "Running accounts demo..."
powershell -File "$apiPath\scripts\demo-accounts.ps1"
Get-Content "$apiPath\accounts-out.txt" -Raw | Write-Output

# Commit reservation: extract the most recent reservation_id if file contains multiple entries
$raw = Get-Content "$apiPath\reserve-out.txt" -Raw -ErrorAction SilentlyContinue
$resid = $null
if ($raw) {
  $matches = [regex]::Matches($raw, '"reservation_id"\s*:\s*"(.*?)"')
  if ($matches.Count -gt 0) { $resid = $matches[$matches.Count - 1].Groups[1].Value }
}

if ($resid) {
  Write-Output "Committing reservation $resid..."
  try { Invoke-RestMethod -Method Post -Uri "http://localhost:4310/v1/wallets/commit" -ContentType "application/json" -Body (@{reservation_id=$resid} | ConvertTo-Json) } catch { Write-Output $_.Exception.Response.Content }
  powershell -File "$apiPath\scripts\demo-accounts.ps1"
  Get-Content "$apiPath\accounts-out.txt" -Raw | Write-Output
} else {
  Write-Output "No reservation_id found in reserve-out.txt; skipping commit."
}

# Release reservation: reuse the same extracted id
if ($resid) {
  Write-Output "Releasing reservation $resid..."
  try { Invoke-RestMethod -Method Post -Uri "http://localhost:4310/v1/wallets/release" -ContentType "application/json" -Body (@{reservation_id=$resid} | ConvertTo-Json) } catch { Write-Output $_.Exception.Response.Content }
  powershell -File "$apiPath\scripts\demo-accounts.ps1"
  Get-Content "$apiPath\accounts-out.txt" -Raw | Write-Output
} else {
  Write-Output "No reservation_id found in reserve-out.txt; skipping release."
}

Write-Output "Demo complete. Close the server window started earlier when finished."
