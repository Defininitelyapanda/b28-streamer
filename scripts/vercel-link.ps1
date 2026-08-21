# Link this repo to the Vercel project (one-time, or after clone).

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$vercel = Join-Path $root "node_modules\.bin\vercel.cmd"
if (-not (Test-Path $vercel)) {
    Write-Host "Vercel CLI not installed. Run: npm install" -ForegroundColor Red
    exit 1
}

$previousErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& $vercel link --project b28-streamer --yes 2>&1
exit $LASTEXITCODE
