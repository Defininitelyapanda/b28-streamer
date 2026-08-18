# B28 Oncodex preflight checks
param(
    [switch]$Strict
)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$issues = 0
$warnings = 0

function Write-Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow; $script:warnings++ }
function Write-Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red; $script:issues++ }

Write-Host "`nB28 Oncodex Doctor" -ForegroundColor Cyan
Write-Host "================`n"

# Node.js
try {
    $nodeVersion = (node -v) -replace "^v", ""
    $nodeMajor = [int]($nodeVersion.Split(".")[0])
    if ($nodeMajor -ge 18) {
        Write-Ok "Node.js $nodeVersion"
    } else {
        Write-Fail "Node.js $nodeVersion - need 18+"
    }
} catch {
    Write-Fail "Node.js not found - install from https://nodejs.org"
}

# npm
try {
    Write-Ok "npm $(npm -v)"
} catch {
    Write-Fail "npm not found"
}

# Ports
$ports = @(3000, 3001, 4000)
foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        $name = if ($proc) { $proc.ProcessName } else { "unknown" }
        Write-Fail "Port $port in use by PID $($conn.OwningProcess) ($name) - run: taskkill /PID $($conn.OwningProcess) /F"
    } else {
        Write-Ok "Port $port is free"
    }
}

# Dependencies
$depPaths = @(
    @{ Path = Join-Path $root "node_modules"; Label = "root node_modules" },
    @{ Path = Join-Path $root "frontend\node_modules"; Label = "frontend node_modules" },
    @{ Path = Join-Path $root "backend\node_modules"; Label = "backend node_modules" },
    @{ Path = Join-Path $root "backend\dashboard\node_modules"; Label = "dashboard node_modules" }
)
foreach ($dep in $depPaths) {
    if (Test-Path $dep.Path) {
        Write-Ok $($dep.Label)
    } else {
        Write-Warn "$($dep.Label) missing - run: npm install (from repo root)"
    }
}

# Env files
$envFiles = @(
    @{ Path = Join-Path $root "backend\.env"; Example = Join-Path $root "backend\.env.example"; Label = "backend/.env" },
    @{ Path = Join-Path $root "frontend\.env.local"; Example = Join-Path $root "frontend\.env.example"; Label = "frontend/.env.local" },
    @{ Path = Join-Path $root "backend\dashboard\.env.local"; Example = Join-Path $root "backend\dashboard\.env.example"; Label = "dashboard/.env.local" }
)
foreach ($envItem in $envFiles) {
    if (Test-Path $envItem.Path) {
        Write-Ok $envItem.Label
    } elseif (Test-Path $envItem.Example) {
        Write-Warn "$($envItem.Label) missing - will be created by npm run start"
    } else {
        Write-Warn "$($envItem.Label) missing (no .env.example found)"
    }
}

# Docker
try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Docker is running"
        $pg = docker ps --filter "name=b28-postgres" --format "{{.Status}}" 2>$null
        if ($pg -match "Up") {
            Write-Ok "b28-postgres container is up"
        } else {
            Write-Warn "b28-postgres not running - npm run start will start Docker"
        }
        $redis = docker ps --filter "name=b28-redis" --format "{{.Status}}" 2>$null
        if ($redis -match "Up") {
            Write-Ok "b28-redis container is up"
        } else {
            Write-Warn "b28-redis not running - API health check may fail"
        }
    } else {
        Write-Warn "Docker not running - start Docker Desktop, then npm run start"
    }
} catch {
    Write-Warn "Docker not installed or not in PATH"
}

# API port config
$backendEnv = Join-Path $root "backend\.env"
if (Test-Path $backendEnv) {
    $envContent = Get-Content $backendEnv -Raw
    if ($envContent -match "API_PORT=4000") {
        Write-Ok "backend/.env API_PORT=4000"
    } elseif ($envContent -match "API_PORT=(\d+)") {
        Write-Warn "backend/.env API_PORT is not 4000 - frontend expects http://localhost:4000"
    } else {
        Write-Warn "backend/.env missing API_PORT - defaults to 4000"
    }
    if ($envContent -match "DATABASE_URL=.*5434") {
        Write-Ok "backend/.env DATABASE_URL uses Docker port 5434"
    } elseif ($envContent -match "DATABASE_URL=.*5432") {
        Write-Warn "backend/.env uses port 5432 - Docker Postgres is on 5434"
    }
}

# Prisma client
$prismaClient = Join-Path $root "backend\node_modules\.prisma\client\index.js"
if (Test-Path $prismaClient) {
    Write-Ok "Prisma client generated"
} else {
    Write-Warn "Prisma client missing - npm run start will run prisma generate"
}

Write-Host ""
if ($issues -gt 0) {
    Write-Host "Doctor found $issues blocking issue(s) and $warnings warning(s)." -ForegroundColor Red
    if ($Strict) { exit 1 }
    exit 1
}

if ($warnings -gt 0) {
    Write-Host "Doctor passed with $warnings warning(s)." -ForegroundColor Yellow
} else {
    Write-Host "All checks passed." -ForegroundColor Green
}
exit 0
