[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Email,

    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string]$Role = "ADMIN",

    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string]$AccountStatus = "APPROVED",

    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string]$DbService = "postgres",

    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string]$DbName = "pv_fusion_local",

    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string]$DbUser = "pvfusion"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$allowedRoles = @("USER", "ADMIN")
$allowedAccountStatuses = @("PENDING", "APPROVED", "INACTIVE")

if ([string]::IsNullOrWhiteSpace($Email)) {
    throw "Email is required."
}

if ($Role -notin $allowedRoles) {
    throw "Unsupported Role '$Role'. Allowed values: $($allowedRoles -join ', ')."
}

if ($AccountStatus -notin $allowedAccountStatuses) {
    throw "Unsupported AccountStatus '$AccountStatus'. Allowed values: $($allowedAccountStatuses -join ', ')."
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$composeFile = Join-Path $repoRoot "docker-compose.yml"

if (-not (Test-Path $composeFile)) {
    throw "docker-compose.yml not found at repo root: $repoRoot"
}

function Invoke-Compose {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $output = & docker compose @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        $message = if ($output) { ($output | Out-String).Trim() } else { "docker compose command failed." }
        throw $message
    }

    return $output
}

function Invoke-Psql {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Sql,

        [Parameter()]
        [switch]$RawOutput
    )

    $arguments = @(
        "exec", "-T", $DbService,
        "psql", "-U", $DbUser, "-d", $DbName,
        "-v", "ON_ERROR_STOP=1",
        "-v", "user_email=$Email",
        "-v", "target_role=$Role",
        "-v", "target_status=$AccountStatus"
    )

    $result = $Sql | & docker compose @arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        $message = if ($result) { ($result | Out-String).Trim() } else { "psql command failed." }
        throw $message
    }

    if ($RawOutput) {
        return ($result | Out-String).Trim()
    }
    return $result
}

Push-Location $repoRoot
try {
    Write-Host "Repo root: $repoRoot"
    Write-Host "Checking docker compose service status for '$DbService'..."

    $runningServices = Invoke-Compose -Arguments @("ps", "--services", "--filter", "status=running")
    if ($DbService -notin $runningServices) {
        throw "PostgreSQL service '$DbService' is not running. Start Docker Compose first."
    }

    $countSql = "SELECT COUNT(*) FROM users WHERE email = :'user_email';"
    $userCountText = Invoke-Psql -Sql $countSql -RawOutput
    $userCount = (($userCountText -split "`r?`n") | Where-Object { $_ -match '^\d+$' } | Select-Object -Last 1)

    if (-not $userCount -or [int]$userCount -lt 1) {
        throw "User not found for email '$Email'. Run this after the first Google OAuth login creates the users row."
    }

    $selectSql = @"
SELECT id, email, role, account_status
FROM users
WHERE email = :'user_email';
"@

    Write-Host ""
    Write-Host "[Before]"
    Invoke-Psql -Sql $selectSql | Out-Host

    $updateSql = @"
DO $$
DECLARE
    has_updated_at BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'users'
          AND column_name = 'updated_at'
    ) INTO has_updated_at;

    IF has_updated_at THEN
        EXECUTE format(
            'UPDATE users SET role = %L, account_status = %L, updated_at = NOW() WHERE email = %L',
            :'target_role',
            :'target_status',
            :'user_email'
        );
    ELSE
        EXECUTE format(
            'UPDATE users SET role = %L, account_status = %L WHERE email = %L',
            :'target_role',
            :'target_status',
            :'user_email'
        );
    END IF;
END $$;
"@

    Invoke-Psql -Sql $updateSql | Out-Null

    Write-Host ""
    Write-Host "[After]"
    Invoke-Psql -Sql $selectSql | Out-Host

    Write-Host ""
    Write-Host "local admin bootstrap completed"
}
finally {
    Pop-Location
}
