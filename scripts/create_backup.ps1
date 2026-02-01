# Creates a zip backup of the Glass Rose project folder.
# Usage: Run from PowerShell:
#   .\scripts\create_backup.ps1

$projectRoot = Split-Path -Parent $PSScriptRoot
$timestamp = Get-Date -Format yyyyMMddHHmm
$dest = Join-Path $projectRoot "glass-rose-backup-$timestamp.zip"

Compress-Archive -Path (Join-Path $projectRoot '*') -DestinationPath $dest -Force

Write-Output "Backup created: $dest"
