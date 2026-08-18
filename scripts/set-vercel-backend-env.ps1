# Configure required backend env vars on the linked Vercel project.
# Usage:
#   $env:DATABASE_URL = "postgresql://..."   # Neon/Vercel Postgres connection string
#   powershell -ExecutionPolicy Bypass -File scripts/set-vercel-backend-env.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

function Set-VercelEnv($name, $value, [string[]]$targets = @("production", "preview")) {
    foreach ($target in $targets) {
        $value | npx vercel env add $name $target --yes 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  $name for $target already exists or failed (continuing)" -ForegroundColor Yellow
        } else {
            Write-Host "  Set $name for $target" -ForegroundColor Green
        }
    }
}

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

if ($env:DATABASE_URL) {
    Set-VercelEnv "DATABASE_URL" $env:DATABASE_URL
} else {
    Write-Host ""
    Write-Host "DATABASE_URL not set in this shell." -ForegroundColor Yellow
    Write-Host "Add a Postgres URL (Neon recommended), then re-run:" -ForegroundColor Yellow
    Write-Host '  $env:DATABASE_URL="postgresql://..."; npm run vercel:env' -ForegroundColor White
}

Write-Host ""
Write-Host "Done. Redeploy with: npx vercel --prod" -ForegroundColor Cyan
