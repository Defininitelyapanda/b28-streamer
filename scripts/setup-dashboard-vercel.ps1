# Link and deploy the admin dashboard as a separate Vercel project.
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/setup-dashboard-vercel.ps1
# Optional env before run:
#   $env:DASHBOARD_AUTH_SECRET = "random-32-char-secret"
#   $env:PRODUCTION_API_URL = "https://b28-streamer-omega.vercel.app/api/v1"

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dashboard = Join-Path $root "backend\dashboard"
. (Join-Path $root "scripts\vercel-env-helper.ps1")

$productionApi = if ($env:PRODUCTION_API_URL) {
    $env:PRODUCTION_API_URL
} else {
    "https://b28-streamer-omega.vercel.app/api/v1"
}

function New-RandomSecret {
    -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
}

function Invoke-VercelDeploy {
    param([string]$WorkDir)
    Push-Location $WorkDir
    try {
        $vercel = Get-VercelCli
        $previousErrorAction = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        if ($vercel -eq "npx") {
            return (& npx --yes vercel deploy --prod --yes 2>&1 | Out-String)
        }
        return (& $vercel deploy --prod --yes 2>&1 | Out-String)
    } finally {
        Pop-Location
    }
}

Write-Host "Setting up admin dashboard Vercel project..." -ForegroundColor Cyan

if (-not (Test-Path (Join-Path $dashboard ".vercel\project.json"))) {
    Write-Host "Linking new Vercel project (backend/dashboard)..." -ForegroundColor Cyan
    Push-Location $dashboard
    try {
        $vercel = Get-VercelCli
        $ErrorActionPreference = "Continue"
        if ($vercel -eq "npx") {
            & npx --yes vercel link --yes 2>&1
        } else {
            & $vercel link --yes 2>&1
        }
    } finally {
        Pop-Location
    }
}

Write-Host "Deploying dashboard (first pass for URL)..." -ForegroundColor Cyan
$deployOut = Invoke-VercelDeploy -WorkDir $dashboard
Write-Host $deployOut

$dashboardUrl = $null
if ($deployOut -match "Aliased\s+https://[^\s]+\.vercel\.app") {
    $dashboardUrl = ($Matches[0] -replace '^Aliased\s+', '' -replace '/$', '')
} elseif ($deployOut -match "https://[^\s]+\.vercel\.app") {
    $dashboardUrl = ($Matches[0] -replace '/$', '')
}

if (-not $dashboardUrl) {
    Write-Host "Could not detect dashboard URL from deploy output. Set AUTH_URL manually in Vercel dashboard." -ForegroundColor Yellow
    $dashboardUrl = "https://YOUR-DASHBOARD.vercel.app"
}

$authSecret = if ($env:DASHBOARD_AUTH_SECRET) { $env:DASHBOARD_AUTH_SECRET } else { New-RandomSecret }

Write-Host "Setting dashboard environment variables..." -ForegroundColor Cyan
Push-Location $dashboard
try {
    Set-VercelEnv "NEXT_PUBLIC_API_URL" $productionApi
    Set-VercelEnv "AUTH_SECRET" $authSecret
    Set-VercelEnv "AUTH_URL" $dashboardUrl
} finally {
    Pop-Location
}

Write-Host "Updating main backend CORS_ORIGIN to include dashboard..." -ForegroundColor Cyan
$cors = "https://b28-streamer-omega.vercel.app,http://localhost:3000,http://localhost:3001,$dashboardUrl"
Push-Location $root
try {
    Set-VercelEnv "CORS_ORIGIN" $cors
} finally {
    Pop-Location
}

Write-Host "Redeploying dashboard with env vars..." -ForegroundColor Cyan
$deployOut2 = Invoke-VercelDeploy -WorkDir $dashboard
Write-Host $deployOut2

Write-Host ""
Write-Host "Dashboard setup complete." -ForegroundColor Green
Write-Host "  URL:      $dashboardUrl" -ForegroundColor Green
Write-Host "  Login:    admin@b28.dev / Password123!" -ForegroundColor Green
Write-Host "  API base: $productionApi" -ForegroundColor Green
Write-Host "Redeploy main site (npm run vercel:deploy) so CORS_ORIGIN takes effect." -ForegroundColor Yellow
