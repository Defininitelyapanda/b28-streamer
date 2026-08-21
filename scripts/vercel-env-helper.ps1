# Shared helpers for setting Vercel env vars from PowerShell.
# PowerShell treats native stderr (e.g. npm "will be installed" warnings) as errors
# when $ErrorActionPreference is Stop — these helpers avoid that.

function Get-VercelCli {
    $local = Join-Path (Get-Location) "node_modules\.bin\vercel.cmd"
    if (Test-Path $local) { return $local }
    return "npx"
}

function Invoke-VercelEnvAdd {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Value,
        [Parameter(Mandatory = $true)][string]$Target
    )

    $vercel = Get-VercelCli
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    try {
        if ($vercel -eq "npx") {
            $Value | & npx --yes vercel env add $Name $Target --yes 2>&1 | Out-Null
        } else {
            $Value | & $vercel env add $Name $Target --yes 2>&1 | Out-Null
        }
        return $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorAction
    }
}

function Set-VercelEnv {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Value,
        [string[]]$Targets = @("production", "preview")
    )

    foreach ($target in $Targets) {
        $exitCode = Invoke-VercelEnvAdd -Name $Name -Value $Value -Target $target
        if ($exitCode -ne 0) {
            Write-Host "  $Name for $target already exists or failed (continuing)" -ForegroundColor Yellow
        } else {
            Write-Host "  Set $Name for $target" -ForegroundColor Green
        }
    }
}
