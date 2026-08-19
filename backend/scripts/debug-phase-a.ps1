$ErrorActionPreference = "Stop"
$base = if ($env:DEBUG_API_BASE) { $env:DEBUG_API_BASE } else { "http://localhost:4000" }

Write-Host "Phase A debug probe -> $base" -ForegroundColor Cyan

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

Probe GET "/health" $null $null
Probe GET "/health/ready" $null $null
Probe GET "/api/v1/catalog" $null $null
Probe GET "/api/v1/catalog" $null $null
Probe GET "/api/v1/subscriptions/offers" $null $null
Probe GET "/api/v1/streaming/play/test-slug" $null $null

$login = Probe POST "/api/v1/auth/login" @{ email = "admin@b28.dev"; password = "Password123!" } $null
if ($login) {
  $token = ($login.Content | ConvertFrom-Json).data.accessToken
  Probe POST "/api/v1/subscriptions/subscribe" @{ plan = "MONTHLY" } @{ Authorization = "Bearer $token" }
}

Write-Host "Done."
