# Configure YouTube sync + cron env vars on the linked Vercel project.
# Usage:
#   $env:YOUTUBE_API_KEY = "your-youtube-api-key"
#   $env:YOUTUBE_CHANNEL_ID = "your-channel-id"
#   $env:CRON_SECRET = "your-random-cron-secret"
#   powershell -ExecutionPolicy Bypass -File scripts/set-vercel-youtube-env.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
. (Join-Path $root "scripts\vercel-env-helper.ps1")

$required = @("YOUTUBE_API_KEY", "YOUTUBE_CHANNEL_ID", "CRON_SECRET")
$missing = @($required | Where-Object { -not (Get-Item -Path "env:$_" -ErrorAction SilentlyContinue).Value })

if ($missing.Count -gt 0) {
    Write-Host "Missing required env vars in this shell:" -ForegroundColor Red
    foreach ($name in $missing) { Write-Host "  - $name" -ForegroundColor Red }
    Write-Host ""
    Write-Host "Example:" -ForegroundColor Yellow
    Write-Host '  $env:YOUTUBE_API_KEY="..."; $env:YOUTUBE_CHANNEL_ID="UC..."; $env:CRON_SECRET="..."; .\scripts\set-vercel-youtube-env.ps1' -ForegroundColor White
    exit 1
}

Write-Host "Setting YouTube sync environment variables..." -ForegroundColor Cyan
Set-VercelEnv "YOUTUBE_API_KEY" $env:YOUTUBE_API_KEY
Set-VercelEnv "YOUTUBE_CHANNEL_ID" $env:YOUTUBE_CHANNEL_ID
Set-VercelEnv "CRON_SECRET" $env:CRON_SECRET

Write-Host ""
Write-Host "Done. Redeploy with: npm run vercel:deploy" -ForegroundColor Cyan
Write-Host "Verify: GET /api/sync with Authorization: Bearer CRON_SECRET" -ForegroundColor Cyan
