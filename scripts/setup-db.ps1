# Local PostgreSQL setup (when Docker is not used)
# Requires psql in PATH and POSTGRES_PASSWORD env var for superuser auth
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$sqlFile = Join-Path $root "backend\scripts\setup-db.sql"

Write-Host "Setting up local PostgreSQL database..." -ForegroundColor Cyan

if (-not (Test-Path $sqlFile)) {
    Write-Host "SQL file not found: $sqlFile" -ForegroundColor Red
    exit 1
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    Write-Host "psql not found. Install PostgreSQL or use Docker: npm run db:up:docker" -ForegroundColor Red
    exit 1
}

if (-not $env:POSTGRES_PASSWORD) {
    Write-Host 'Set superuser password first: $env:POSTGRES_PASSWORD = "your-postgres-password"' -ForegroundColor Yellow
}

$env:PGPASSWORD = $env:POSTGRES_PASSWORD
psql -U postgres -f $sqlFile
if ($LASTEXITCODE -ne 0) {
    Write-Host "Database setup failed." -ForegroundColor Red
    exit 1
}

# Ensure backend/.env points at local postgres (default 5432)
$envFile = Join-Path $root "backend\.env"
$envExample = Join-Path $root "backend\.env.example"
if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
    Copy-Item $envExample $envFile
}

Write-Host "Local database setup complete." -ForegroundColor Green
