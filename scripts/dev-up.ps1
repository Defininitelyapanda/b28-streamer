# B28 Oncodex — one-command local dev startup
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

function Ensure-EnvFile($target, $example) {
    if (-not (Test-Path $target) -and (Test-Path $example)) {
        Copy-Item $example $target
        Write-Host "Created $(Split-Path $target -Leaf) from example" -ForegroundColor Yellow
    }
}

Write-Host "B28 Oncodex - starting dev environment`n" -ForegroundColor Cyan

# 0. Free dev ports if a previous session is still running
& "$root\scripts\stop-dev.ps1"

# 1. Preflight
& "$root\scripts\doctor.ps1" -Strict
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nFix the issues above, then run: npm run start" -ForegroundColor Red
    exit 1
}

# 2. Install dependencies if missing
$needsInstall = -not (Test-Path "$root\frontend\node_modules") -or
                -not (Test-Path "$root\backend\node_modules") -or
                -not (Test-Path "$root\backend\dashboard\node_modules")
if ($needsInstall -or -not (Test-Path "$root\node_modules\concurrently")) {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

# 3. Bootstrap env files
Ensure-EnvFile "$root\backend\.env" "$root\backend\.env.example"
Ensure-EnvFile "$root\frontend\.env.local" "$root\frontend\.env.example"
Ensure-EnvFile "$root\backend\dashboard\.env.local" "$root\backend\dashboard\.env.example"

# 4. Docker + database
Write-Host "`nStarting database..." -ForegroundColor Cyan
& "$root\scripts\docker-up.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker startup failed. Is Docker Desktop running?" -ForegroundColor Red
    exit 1
}

Write-Host "Running migrations..." -ForegroundColor Cyan
npm run db:migrate
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Seeding database (idempotent)..." -ForegroundColor Cyan
npm run db:seed
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Generating Prisma client..." -ForegroundColor Cyan
npm run prisma:generate --prefix backend
if ($LASTEXITCODE -ne 0) { exit 1 }

# 5. Start all dev servers (foreground — logs stream here)
Write-Host "`nStarting frontend, API, and dashboard...`n" -ForegroundColor Cyan
npm run dev:all
