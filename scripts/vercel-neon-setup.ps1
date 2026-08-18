# Provision Neon Postgres on Vercel (after accepting marketplace terms once).
# 1. Open: https://vercel.com/sassukers-projects/~/integrations/accept-terms/neon?source=cli
# 2. Accept terms, then run this script.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host "Installing Neon Postgres integration..." -ForegroundColor Cyan
npx vercel integration add neon --non-interactive -e production -e preview -m region=iad1 -m auth=false --plan free_v3

Write-Host ""
Write-Host "If successful, redeploy: npx vercel --prod" -ForegroundColor Cyan
Write-Host "Then seed production DB once from your machine:" -ForegroundColor Cyan
Write-Host '  vercel env pull .vercel/.env.production.local --environment=production' -ForegroundColor White
Write-Host '  cd backend && npx prisma migrate deploy && npm run prisma:seed' -ForegroundColor White
