# Verify all B28 dev servers are responding
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$checks = @(
    @{ Url = "http://localhost:3000"; Name = "Streaming frontend"; Required = $true },
    @{ Url = "http://localhost:3001"; Name = "Admin dashboard"; Required = $true },
    @{ Url = "http://localhost:4000/health"; Name = "API health"; Required = $true },
    @{ Url = "http://localhost:4000/health/ready"; Name = "API ready (DB+Redis)"; Required = $true },
    @{ Url = "http://localhost:4000/api/docs"; Name = "API Swagger docs"; Required = $true },
    @{ Url = "http://localhost:4000/api/v1/catalog"; Name = "Public catalog API"; Required = $true }
)

Write-Host "`nB28 Dev Verification" -ForegroundColor Cyan
Write-Host "====================`n"
Write-Host "Tip: run this via  npm run verify  (do not paste output lines into PowerShell)`n" -ForegroundColor DarkGray

$passed = 0
$failed = 0

foreach ($check in $checks) {
    try {
        $resp = Invoke-WebRequest -Uri $check.Url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
            Write-Host "OK   $($check.Name) ($($check.Url)) -> $($resp.StatusCode)" -ForegroundColor Green
            $passed++
        } else {
            Write-Host "FAIL $($check.Name) ($($check.Url)) -> $($resp.StatusCode)" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "FAIL $($check.Name) ($($check.Url)) -> not reachable" -ForegroundColor Red
        Write-Host "       Run: npm run start" -ForegroundColor Yellow
        $failed++
    }
}

Write-Host ""
if ($failed -eq 0) {
    Write-Host "All $passed checks passed. Dev environment is healthy." -ForegroundColor Green
    Write-Host ""
    Write-Host "  Streaming:   http://localhost:3000" -ForegroundColor White
    Write-Host "  Admin:       http://localhost:3001/login" -ForegroundColor White
    Write-Host "  API/Swagger: http://localhost:4000/api/docs" -ForegroundColor White
    Write-Host ""
    exit 0
} else {
    Write-Host "$failed check(s) failed, $passed passed." -ForegroundColor Red
    $apiOnly = ($passed -ge 4 -and $failed -le 2)
    if ($apiOnly) {
        Write-Host ""
        Write-Host "Only the API (:4000) is running. Frontend and dashboard need to be started too." -ForegroundColor Yellow
        Write-Host "Run:  npm run start" -ForegroundColor Yellow
        Write-Host "  (starts all three apps - do not run the API alone)" -ForegroundColor DarkGray
    } else {
        Write-Host "Start servers with: npm run start" -ForegroundColor Yellow
    }
    exit 1
}
