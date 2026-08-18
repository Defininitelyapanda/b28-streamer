# Stop B28 dev servers listening on ports 3000, 3001, 4000
$ErrorActionPreference = "Continue"

$ports = @(3000, 3001, 4000)
$stopped = 0

Write-Host "Stopping B28 dev servers..." -ForegroundColor Cyan

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $processId = $conn.OwningProcess
        if (-not $processId) { continue }
        $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
        $name = if ($proc) { $proc.ProcessName } else { "unknown" }
        try {
            Stop-Process -Id $processId -Force -ErrorAction Stop
            Write-Host "  Stopped port $port (PID $processId, $name)" -ForegroundColor Yellow
            $stopped++
        } catch {
            Write-Host "  Could not stop port $port (PID $processId) - run: taskkill /PID $processId /F" -ForegroundColor Red
        }
    }
}

if ($stopped -eq 0) {
    Write-Host "  No dev servers were running on ports 3000, 3001, or 4000." -ForegroundColor Gray
} else {
    Start-Sleep -Seconds 1
    Write-Host "  Done. Stopped $stopped process(es)." -ForegroundColor Green
}
