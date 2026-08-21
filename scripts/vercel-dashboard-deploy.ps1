# Deploy the admin dashboard as a separate Vercel project.
# First-time setup:
#   cd backend/dashboard
#   npx vercel link
# Set env in Vercel project settings:
#   NEXT_PUBLIC_API_URL=https://b28-streamer-omega.vercel.app/api/v1
#   AUTH_SECRET=<dashboard-secret>
#   AUTH_URL=<dashboard-url>

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dashboard = Join-Path $root "backend\dashboard"
Set-Location $dashboard

Write-Host "Deploying admin dashboard from $dashboard" -ForegroundColor Cyan
npx vercel --prod
Write-Host "Done. Open the dashboard URL and log in with admin@b28.dev / Password123!" -ForegroundColor Green
