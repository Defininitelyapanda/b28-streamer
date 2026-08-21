# End-to-end R2 upload + playback verification on production.
param(
  [string]$Base = "https://b28-streamer-omega.vercel.app",
  [string]$Slug = "r2-e2e-test"
)

$ErrorActionPreference = "Stop"

Write-Host "E2E R2 verify on $Base" -ForegroundColor Cyan

$adminLogin = Invoke-RestMethod -Method POST -Uri "$Base/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"admin@b28.dev","password":"Password123!"}'
$adminToken = $adminLogin.data.accessToken

$presign = Invoke-RestMethod -Method POST -Uri "$Base/api/v1/admin/catalog/upload-url" `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $adminToken" } `
  -Body (@{ slug = $Slug; contentType = "video/mp4" } | ConvertTo-Json)

Write-Host "Presigned upload key:" $presign.data.key

$sampleUrl = "https://www.w3schools.com/html/mov_bbb.mp4"
$tmp = Join-Path $env:TEMP "b28-r2-e2e-test.mp4"
Invoke-WebRequest -Uri $sampleUrl -OutFile $tmp -UseBasicParsing
$bytes = [System.IO.File]::ReadAllBytes($tmp)

Invoke-RestMethod -Method PUT -Uri $presign.data.url `
  -ContentType "video/mp4" `
  -Body $bytes | Out-Null
Write-Host "Uploaded sample MP4 to R2" -ForegroundColor Green

$catalogBody = @{
  slug         = $Slug
  title        = "R2 E2E Test Film"
  thumbnail    = "https://example.com/poster.jpg"
  date         = "2026-08-21"
  genre        = "Test"
  description  = "Cloudflare R2 end-to-end verification title"
  rating       = "8.5"
  sourceType   = "self_hosted"
  videoId      = $Slug
  type         = "film"
  seriesGroup  = "R2 E2E Test Film"
  accessTier   = "FREE"
  playbackFormat = "MP4"
  storageKey   = $presign.data.key
  published    = $true
} | ConvertTo-Json

Invoke-RestMethod -Method PUT -Uri "$Base/api/v1/admin/catalog" `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $adminToken" } `
  -Body $catalogBody | Out-Null
Write-Host "Catalog row upserted for slug: $Slug" -ForegroundColor Green

$filmmakerLogin = Invoke-RestMethod -Method POST -Uri "$Base/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"filmmaker@b28.dev","password":"Password123!"}'
$filmmakerToken = $filmmakerLogin.data.accessToken

$play = Invoke-RestMethod -Method GET -Uri "$Base/api/v1/streaming/play/$Slug" `
  -Headers @{ Authorization = "Bearer $filmmakerToken" }

if (-not $play.data.url) {
  throw "Playback response missing presigned url: $($play | ConvertTo-Json -Depth 5)"
}
if ($play.data.url -notmatch "r2\.cloudflarestorage\.com") {
  throw "Playback url is not R2 presigned: $($play.data.url)"
}

Write-Host "Playback presigned URL OK" -ForegroundColor Green
Write-Host "Watch: $Base/watch/$Slug" -ForegroundColor Green
Write-Host "URL host:" ([uri]$play.data.url).Host
