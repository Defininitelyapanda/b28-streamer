$ErrorActionPreference = "Stop"
$base = if ($env:DEBUG_API_BASE) { $env:DEBUG_API_BASE } else { "http://localhost:4000" }

Write-Host "Phase B debug probe -> $base" -ForegroundColor Cyan

function Probe($method, $path, $body, $headers) {
  $uri = "$base$path"
  try {
    $params = @{ Uri = $uri; Method = $method; UseBasicParsing = $true }
    if ($body) { $params.ContentType = "application/json"; $params.Body = ($body | ConvertTo-Json -Compress) }
    if ($headers) { $params.Headers = $headers }
    $r = Invoke-WebRequest @params
    Write-Host "OK  $method $path -> $($r.StatusCode)" -ForegroundColor Green
    return $r
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "ERR $method $path -> $code" -ForegroundColor Yellow
    return $null
  }
}

Write-Host "`n--- Phase A checks ---" -ForegroundColor Cyan
Probe GET "/health" $null $null
Probe GET "/health/ready" $null $null
Probe GET "/api/v1/catalog" $null $null
Probe GET "/api/v1/subscriptions/offers" $null $null

$login = Probe POST "/api/v1/auth/login" @{ email = "filmmaker@b28.dev"; password = "Password123!" } $null

Write-Host "`n--- Phase B checks ---" -ForegroundColor Cyan
Probe GET "/api/v1/catalog?page=1&limit=5" $null $null

$catalog = Probe GET "/api/v1/catalog" $null $null
if ($catalog) {
  $json = $catalog.Content | ConvertFrom-Json
  $slug = $json.data.videos[0].id
  if ($slug) {
    Probe GET "/api/v1/streaming/play/$slug" $null $null
  }
}

if ($login) {
  $token = ($login.Content | ConvertFrom-Json).data.accessToken
  Probe POST "/api/v1/subscriptions/subscribe" @{ plan = "MONTHLY" } @{ Authorization = "Bearer $token" }
}

if ($env:CRON_SECRET) {
  Probe GET "/api/sync" $null @{ Authorization = "Bearer $env:CRON_SECRET" }
} else {
  Write-Host "SKIP /api/sync (set CRON_SECRET to test cron proxy)" -ForegroundColor DarkYellow
}

Write-Host "`nFrontend spot-checks (manual):" -ForegroundColor Cyan
Write-Host "  - /browse shows DB catalog (not seed fallback when API is down)"
Write-Host "  - /watch/[free-slug] plays logged out via /streaming/play"
Write-Host "Done."
