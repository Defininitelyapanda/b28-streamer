# Start Docker Postgres + Redis for B28 Oncodex
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "Starting Docker services (Postgres :5434, Redis :6379)..." -ForegroundColor Cyan

try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Docker is not running. Start Docker Desktop and try again." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Docker not found. Install Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor Red
    exit 1
}

Push-Location $root
try {
    docker compose up -d
    if ($LASTEXITCODE -ne 0) {
        docker-compose up -d
    }
} finally {
    Pop-Location
}

Write-Host "Waiting for Postgres to be ready..."
$deadline = (Get-Date).AddSeconds(60)
$ready = $false
while ((Get-Date) -lt $deadline) {
    $health = docker inspect --format='{{.State.Health.Status}}' b28-postgres 2>$null
    if ($health -eq "healthy") {
        $ready = $true
        break
    }
    $status = docker ps --filter "name=b28-postgres" --format "{{.Status}}" 2>$null
    if ($status -match "Up" -and -not $health) {
        # Container up but no healthcheck yet — try pg_isready
        $pg = docker exec b28-postgres pg_isready -U b28 -d b28_oncodex 2>$null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            break
        }
    }
    Start-Sleep -Seconds 2
}

if (-not $ready) {
    Write-Host "Postgres did not become ready in time. Check: docker logs b28-postgres" -ForegroundColor Red
    exit 1
}

Write-Host "Postgres is ready on localhost:5434" -ForegroundColor Green

# Ensure backend/.env uses port 5434
$envFile = Join-Path $root "backend\.env"
$envExample = Join-Path $root "backend\.env.example"
if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
    Copy-Item $envExample $envFile
}
if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    if ($content -match "localhost:5432") {
        $content = $content -replace "localhost:5432", "localhost:5434"
        Set-Content -Path $envFile -Value $content -NoNewline
        Write-Host "Updated backend/.env to use port 5434" -ForegroundColor Yellow
    }
}

Write-Host "Docker services are up." -ForegroundColor Green
