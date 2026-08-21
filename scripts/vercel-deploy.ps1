# Deploy to Vercel production (uses linked .vercel/project.json).
# Run `npm run vercel:login` first if you see "Not authorized".

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

if (-not (Test-Path (Join-Path $root ".vercel\project.json"))) {
    Write-Host "Project not linked. Run: npm run vercel:link" -ForegroundColor Red
    exit 1
}

$vercel = Join-Path $root "node_modules\.bin\vercel.cmd"
if (-not (Test-Path $vercel)) {
    Write-Host "Vercel CLI not installed. Run: npm install" -ForegroundColor Red
    exit 1
}

$previousErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$whoami = & $vercel whoami 2>&1
$ErrorActionPreference = $previousErrorAction

if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in to Vercel. Run: npm run vercel:login" -ForegroundColor Red
    exit 1
}

Write-Host "Deploying as $whoami ..." -ForegroundColor Cyan
& $vercel deploy --prod --yes
exit $LASTEXITCODE
