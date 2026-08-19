$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) {
  Write-Error "Set DATABASE_URL before running backend tests."
}

Push-Location $PSScriptRoot\..
try {
  npm test
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  $env:REQUIRE_TEST_DB = "true"
  npm run test:e2e
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
