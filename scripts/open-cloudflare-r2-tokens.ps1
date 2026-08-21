# Open Cloudflare R2 API token creation page and print setup steps.
$accountId = if ($env:R2_ACCOUNT_ID) { $env:R2_ACCOUNT_ID } else { "81da89bfbadf28e9b94fd4be5479cee8" }
$bucket = if ($env:R2_BUCKET_NAME) { $env:R2_BUCKET_NAME } else { "b28streamer" }

$url = "https://dash.cloudflare.com/$accountId/r2/overview"
Write-Host "Opening Cloudflare R2 dashboard..." -ForegroundColor Cyan
Start-Process $url

Write-Host @"

Create an R2 API token:
  1. R2 Overview -> Manage R2 API Tokens -> Create API token
  2. Permission: Object Read & Write
  3. Scope: bucket '$bucket' only
  4. Copy Access Key ID and Secret Access Key (secret shown once)

Then set env and verify locally:
  `$env:R2_ACCOUNT_ID = "$accountId"
  `$env:R2_BUCKET_NAME = "$bucket"
  `$env:R2_ACCESS_KEY_ID = "<access-key>"
  `$env:R2_SECRET_ACCESS_KEY = "<secret>"
  npm run verify:r2

Push to Vercel and redeploy:
  npm run vercel:r2
  npm run vercel:deploy

"@ -ForegroundColor White
