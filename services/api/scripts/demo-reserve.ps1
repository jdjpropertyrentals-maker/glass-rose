param(
  [int]$Port = 4310
)

#$env:USE_INMEM_WALLET='1' # server must be started with in-memory adapter
$body = @{ user_id='11111111-1111-1111-1111-111111111111'; currency='CRED'; amount=10 } | ConvertTo-Json
$res = Invoke-RestMethod -Uri "http://localhost:$Port/v1/wallets/reserve" -Method Post -ContentType 'application/json' -Body $body
$res | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 reserve-out.txt
Write-Output (Get-Content .\reserve-out.txt -Raw)
