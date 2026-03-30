param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$Stop
)

$ErrorActionPreference = "Stop"

$BackendDir = Join-Path $PSScriptRoot "backend-library"
$FrontendDir = Join-Path $PSScriptRoot "front_library"
$BackendPort = 8089
$FrontendPort = 3000

function Write-Color($text, $color) {
    Write-Host $text -ForegroundColor $color
}

function Test-Command($cmd) {
    return (Get-Command $cmd -ErrorAction SilentlyContinue) -ne $null
}

function Start-VisibleProcess($filePath, $arguments, $workingDirectory) {
    return Start-Process -FilePath $filePath `
        -ArgumentList $arguments `
        -WorkingDirectory $workingDirectory `
        -PassThru `
        -WindowStyle Normal
}

function Wait-HttpReady($url, $timeoutSec) {
    $elapsed = 0
    while ($elapsed -lt $timeoutSec) {
        Start-Sleep -Seconds 3
        $elapsed += 3
        try {
            $response = Invoke-WebRequest -Uri $url -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                return $true
            }
        } catch {
        }
        Write-Host ("   waited {0}s..." -f $elapsed) -ForegroundColor Gray
    }
    return $false
}

function Stop-LibraryProcesses {
    Get-Process -Name "java" -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
}

if ($Stop) {
    Write-Color "Stopping backend and frontend processes..." "Yellow"
    Stop-LibraryProcesses
    Write-Color "All matching java/node processes were stopped." "Green"
    exit 0
}

Write-Color "==========================================" "Cyan"
Write-Color "  Library Management System Launcher" "Cyan"
Write-Color "==========================================" "Cyan"
Write-Host ""

if (-not (Test-Command "java")) {
    Write-Color "Java was not found. Install JDK 17+ first." "Red"
    exit 1
}

if (-not $BackendOnly -and -not (Test-Command "npm")) {
    Write-Color "npm was not found. Install Node.js 18+ first." "Red"
    exit 1
}

if (-not (Test-Path (Join-Path $BackendDir "mvnw.cmd"))) {
    Write-Color "backend-library\\mvnw.cmd was not found." "Red"
    exit 1
}

if (-not $FrontendOnly) {
    Write-Color "Starting backend..." "Green"
    Write-Color ("   dir: {0}" -f $BackendDir) "Gray"
    Write-Color ("   url: http://localhost:{0}" -f $BackendPort) "Gray"

    $backendProcess = Start-VisibleProcess `
        -filePath (Join-Path $BackendDir "mvnw.cmd") `
        -arguments @("-Dmaven.test.skip=true", "spring-boot:run") `
        -workingDirectory $BackendDir

    Write-Color ("   backend PID: {0}" -f $backendProcess.Id) "Gray"
    Write-Host ""

    if ($BackendOnly) {
        Write-Color "Backend started. Press Ctrl+C in the spawned window to stop it." "Green"
        exit 0
    }

    Write-Color "Waiting for backend health check..." "Yellow"
    $backendReady = Wait-HttpReady -url ("http://localhost:{0}/actuator/health" -f $BackendPort) -timeoutSec 60
    if ($backendReady) {
        Write-Color "Backend is ready." "Green"
    } else {
        Write-Color "Backend did not report ready within 60 seconds. Frontend will still start." "Yellow"
    }
    Write-Host ""
}

if (-not $BackendOnly) {
    Write-Color "Starting frontend..." "Green"
    Write-Color ("   dir: {0}" -f $FrontendDir) "Gray"
    Write-Color ("   url: http://localhost:{0}" -f $FrontendPort) "Gray"

    if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
        Write-Color "Installing frontend dependencies with npm install..." "Yellow"
        Push-Location $FrontendDir
        try {
            npm install
        } finally {
            Pop-Location
        }
    }

    Write-Color "Launching Next.js dev server in a new window..." "Cyan"
    $frontendProcess = Start-VisibleProcess `
        -filePath "npm.cmd" `
        -arguments @("run", "dev") `
        -workingDirectory $FrontendDir

    Write-Color ("   frontend PID: {0}" -f $frontendProcess.Id) "Gray"
    Write-Color ("Open http://localhost:{0}" -f $FrontendPort) "Cyan"
}
