param(
    [int]$Users = 30,
    [int]$Books = 80,
    [switch]$ResetFirst,
    [bool]$AutoStartBackend = $true,
    [int]$StartupTimeoutSec = 120,
    [string]$BaseUrl = "http://localhost:8089/api",
    [string]$Username = "admin",
    [string]$Password = "admin123"
)

$ErrorActionPreference = "Stop"

function Write-Info($text) {
    Write-Host $text -ForegroundColor Cyan
}

function Write-Ok($text) {
    Write-Host $text -ForegroundColor Green
}

function Write-Warn($text) {
    Write-Host $text -ForegroundColor Yellow
}

function Get-HealthUrl($apiBaseUrl) {
    if ($apiBaseUrl.EndsWith("/api")) {
        return $apiBaseUrl.Substring(0, $apiBaseUrl.Length - 4) + "/actuator/health"
    }
    return $apiBaseUrl.TrimEnd("/") + "/actuator/health"
}

function Wait-BackendReady($healthUrl, $timeoutSec) {
    $elapsed = 0
    while ($elapsed -lt $timeoutSec) {
        try {
            $health = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 3
            if ($health.status -eq "UP") {
                return $true
            }
        }
        catch {
            $statusCode = $null
            if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
                $statusCode = [int]$_.Exception.Response.StatusCode
            }

            # Some environments protect actuator endpoints.
            if ($statusCode -eq 401 -or $statusCode -eq 403) {
                return $true
            }
        }

        Start-Sleep -Seconds 2
        $elapsed += 2
    }
    return $false
}

try {
    $healthUrl = Get-HealthUrl $BaseUrl

    Write-Info "Checking backend health..."
    $backendReady = Wait-BackendReady $healthUrl 6
    if (-not $backendReady -and $AutoStartBackend) {
        $startScript = Join-Path $PSScriptRoot "start-backend.ps1"
        if (-not (Test-Path $startScript)) {
            throw "Backend is down and start-backend.ps1 is missing."
        }

        Write-Warn "Backend is not ready, starting backend first..."
        & powershell -ExecutionPolicy Bypass -File $startScript
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to start backend."
        }

        Write-Info "Waiting for backend to become healthy (timeout=${StartupTimeoutSec}s)..."
        $backendReady = Wait-BackendReady $healthUrl $StartupTimeoutSec
    }

    if (-not $backendReady) {
        throw "Backend is not reachable at $healthUrl"
    }

    Write-Info "Logging in as $Username..."
    $loginBody = @{
        username = $Username
        password = $Password
    } | ConvertTo-Json

    $loginResp = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    if (-not $loginResp.token) {
        throw "Login failed: token is empty."
    }

    $headers = @{
        Authorization = "Bearer $($loginResp.token)"
    }

    if ($ResetFirst) {
        Write-Warn "Resetting existing test data..."
        $resetResp = Invoke-RestMethod -Uri "$BaseUrl/dev/reset-test-data" -Method Post -Headers $headers
        Write-Ok "Reset done: $($resetResp.message)"
    }

    Write-Info "Seeding backend data (users=$Users, books=$Books)..."
    $seedUrl = "$BaseUrl/dev/seed?users=$Users&books=$Books"
    $seedResp = Invoke-RestMethod -Uri $seedUrl -Method Post -Headers $headers

    Write-Ok "Seed completed."
    if ($seedResp -is [string]) {
        Write-Host $seedResp
    } else {
        $seedResp | ConvertTo-Json -Depth 4
    }
}
catch {
    Write-Host "Seed failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
