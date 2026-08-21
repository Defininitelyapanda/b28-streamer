# Configure Cloudflare R2 env vars on the linked Vercel project (backend service).
# Usage:
#   $env:R2_ACCOUNT_ID = "your-account-id"
#   $env:R2_ACCESS_KEY_ID = "your-access-key"
#   $env:R2_SECRET_ACCESS_KEY = "your-secret"
#   $env:R2_BUCKET_NAME = "b28-films"
#   powershell -ExecutionPolicy Bypass -File scripts/set-vercel-r2-env.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
. (Join-Path $root "scripts\vercel-env-helper.ps1")

$required = @("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME")
$missing = @($required | Where-Object { -not $env:$_ })

if ($missing.Count -gt 0) {
    Write-Host "Missing required env vars in this shell:" -ForegroundColor Red
    foreach ($name in $missing) { Write-Host "  - $name" -ForegroundColor Red }
    Write-Host ""
    Write-Host "Example:" -ForegroundColor Yellow
    Write-Host '  $env:R2_ACCOUNT_ID="..."; $env:R2_ACCESS_KEY_ID="..."; $env:R2_SECRET_ACCESS_KEY="..."; $env:R2_BUCKET_NAME="b28-films"; .\scripts\set-vercel-r2-env.ps1' -ForegroundColor White
    exit 1
}

Write-Host "Setting Cloudflare R2 environment variables..." -ForegroundColor Cyan
Set-VercelEnv "R2_ACCOUNT_ID" $env:R2_ACCOUNT_ID
Set-VercelEnv "R2_ACCESS_KEY_ID" $env:R2_ACCESS_KEY_ID
Set-VercelEnv "R2_SECRET_ACCESS_KEY" $env:R2_SECRET_ACCESS_KEY
Set-VercelEnv "R2_BUCKET_NAME" $env:R2_BUCKET_NAME

if ($env:R2_PUBLIC_DOMAIN) {
    Set-VercelEnv "R2_PUBLIC_DOMAIN" $env:R2_PUBLIC_DOMAIN
}

Write-Host ""
Write-Host "Done. Redeploy with: npm run vercel:deploy" -ForegroundColor Cyan
Write-Host "Verify: POST /api/v1/admin/catalog/upload-url (admin token) returns presigned URL, not R2_NOT_CONFIGURED." -ForegroundColor Cyan
