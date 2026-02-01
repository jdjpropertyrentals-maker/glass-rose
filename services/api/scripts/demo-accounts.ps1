param(
  [int]$Port = 4310
)

#$env:USE_INMEM_WALLET='1' # server must be started with in-memory adapter
$r = Invoke-WebRequest -Uri "http://localhost:$Port/v1/accounts/11111111-1111-1111-1111-111111111111" -ErrorAction SilentlyContinue
$r.StatusCode | Out-String | Out-File -Encoding utf8 accounts-status.txt
$r.Content | Out-File -Encoding utf8 accounts-out.txt
Write-Output (Get-Content .\accounts-out.txt -Raw)