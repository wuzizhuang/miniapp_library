param(
    [switch]$Wait,
    [int]$Port = 8089
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

function Test-Command($name) {
    return (Get-Command $name -ErrorAction SilentlyContinue) -ne $null
}

if (-not (Test-Command "java")) {
    Write-Host "Java not found. Please install JDK 17+ first." -ForegroundColor Red
    exit 1
}

$mvnw = Join-Path $PSScriptRoot "mvnw.cmd"
if (-not (Test-Path $mvnw)) {
    Write-Host "Cannot find mvnw.cmd in $PSScriptRoot" -ForegroundColor Red
    exit 1
}

if (Test-Command "Get-NetTCPConnection") {
    $occupied = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($occupied) {
        $ownerPid = $occupied[0].OwningProcess
        Write-Warn "Port $Port is already in use by PID $ownerPid."
        Write-Warn "Please stop that process first, then retry."
        exit 1
    }
} else {
    Write-Warn "Get-NetTCPConnection is unavailable; skipping port pre-check."
}

Write-Info "Starting backend on http://localhost:$Port"
Write-Info "Command: .\\mvnw.cmd -Dmaven.test.skip=true spring-boot:run"

# Join into a single argument string so PowerShell does not
# mangle JVM-style -D flags (they look like PS parameter prefixes).
$argString = @("-Dmaven.test.skip=true", "spring-boot:run") -join ' '
$process = Start-Process -FilePath $mvnw `
    -ArgumentList $argString `
    -WorkingDirectory $PSScriptRoot `
    -PassThru `
    -WindowStyle Normal

Write-Ok "Backend process started. PID: $($process.Id)"

if ($Wait) {
    Write-Info "Waiting for backend process. Press Ctrl+C to stop waiting."
    Wait-Process -Id $process.Id
}
