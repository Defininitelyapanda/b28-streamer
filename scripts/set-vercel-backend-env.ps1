# Configure required backend env vars on the linked Vercel project.
# Usage:
#   $env:DATABASE_URL = "postgresql://..."   # Neon pooled URL
#   $env:DATABASE_URL_UNPOOLED = "postgresql://..."   # Neon direct URL (recommended)
#   npm run vercel:env

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
. (Join-Path $root "scripts\vercel-env-helper.ps1")

Write-Host "Setting Vercel backend environment variables..." -ForegroundColor Cyan

$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$accessBytes = New-Object byte[] 32
$refreshBytes = New-Object byte[] 32
$rng.GetBytes($accessBytes)
$rng.GetBytes($refreshBytes)
$jwtAccess = [Convert]::ToBase64String($accessBytes)
$jwtRefresh = [Convert]::ToBase64String($refreshBytes)

Set-VercelEnv "JWT_ACCESS_SECRET" $jwtAccess
Set-VercelEnv "JWT_REFRESH_SECRET" $jwtRefresh
Set-VercelEnv "AUTH_AUTO_VERIFY" "true"
Set-VercelEnv "NODE_ENV" "production"

if ($env:DATABASE_URL -and $env:DATABASE_URL -notmatch '^\s*postgresql://\.\.\.') {
    Set-VercelEnv "DATABASE_URL" $env:DATABASE_URL
} elseif ($env:DATABASE_URL) {
    Write-Host ""
    Write-Host "DATABASE_URL looks like a placeholder. Set your real Neon URL first." -ForegroundColor Yellow
    Write-Host '  $env:DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"' -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "DATABASE_URL not set in this shell." -ForegroundColor Yellow
    Write-Host "Add a Postgres URL (Neon recommended), then re-run:" -ForegroundColor Yellow
    Write-Host '  $env:DATABASE_URL="postgresql://..."; npm run vercel:env' -ForegroundColor White
}

if ($env:DATABASE_URL_UNPOOLED -and $env:DATABASE_URL_UNPOOLED -notmatch '^\s*postgresql://\.\.\.') {
    Set-VercelEnv "DATABASE_URL_UNPOOLED" $env:DATABASE_URL_UNPOOLED
} else {
    Write-Host ""
    Write-Host "Tip: set DATABASE_URL_UNPOOLED (Neon direct URL) for reliable Prisma migrations." -ForegroundColor Yellow
}

Write-Host ""
Write-Host 'Done. Redeploy with: npm run vercel:deploy' -ForegroundColor Cyan
