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
    # Join arguments into a single string so that PowerShell does not
    # mangle JVM-style -D flags (they look like PS parameter prefixes).
    $argString = $arguments -join ' '
    return Start-Process -FilePath $filePath `
        -ArgumentList $argString `
        -WorkingDirectory $workingDirectory `
        -PassThru `
        -WindowStyle Normal
}

function Wait-HttpReady($url, $timeoutSec, $requestTimeoutSec = 2) {
    $elapsed = 0
    while ($elapsed -lt $timeoutSec) {
        Start-Sleep -Seconds 3
        $elapsed += 3
        try {
            $response = Invoke-WebRequest -Uri $url -TimeoutSec $requestTimeoutSec -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                return $true
            }
        } catch {
        }
        Write-Host ("   waited {0}s..." -f $elapsed) -ForegroundColor Gray
    }
    return $false
}

function Get-RepoFrontendProcesses {
    $frontendDirPattern = "*$FrontendDir*"
    return Get-CimInstance Win32_Process |
        Where-Object {
            $_.CommandLine -and
            $_.CommandLine -like $frontendDirPattern -and
            (
                $_.CommandLine -like "*start-server.js*" -or
                $_.CommandLine -like "*next\\dist\\bin\\next* dev*"
            )
        } |
        Sort-Object ProcessId -Unique
}

function Stop-RepoFrontendProcesses {
    $frontendProcesses = Get-RepoFrontendProcesses
    if (-not $frontendProcesses) {
        return
    }

    Write-Color "Stopping existing frontend dev server for this repo..." "Yellow"
    foreach ($process in $frontendProcesses) {
        try {
            Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
            Write-Color ("   stopped frontend PID: {0}" -f $process.ProcessId) "Gray"
        } catch {
            Write-Color ("   failed to stop frontend PID {0}: {1}" -f $process.ProcessId, $_.Exception.Message) "Yellow"
        }
    }

    Start-Sleep -Seconds 2
}

function Get-ListeningProcesses($port) {
    return @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique)
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

    Stop-RepoFrontendProcesses

    $frontendPortOwners = Get-ListeningProcesses -port $FrontendPort
    if ($frontendPortOwners.Count -gt 0) {
        Write-Color ("Port {0} is already in use. Frontend was not started to avoid silently drifting to another port." -f $FrontendPort) "Red"
        foreach ($owner in (Get-CimInstance Win32_Process | Where-Object { $frontendPortOwners -contains $_.ProcessId })) {
            Write-Color ("   PID {0}: {1}" -f $owner.ProcessId, $owner.CommandLine) "Gray"
        }
        Write-Color "Stop the process above or run .\\start.ps1 -Stop, then retry." "Yellow"
        exit 1
    }

    Write-Color "Launching Next.js dev server in a new window..." "Cyan"
    $frontendProcess = Start-VisibleProcess `
        -filePath "npm.cmd" `
        -arguments @("run", "dev", "--", "--port", "$FrontendPort") `
        -workingDirectory $FrontendDir

    Write-Color ("   frontend PID: {0}" -f $frontendProcess.Id) "Gray"

    Write-Color "Waiting for frontend to serve the home page..." "Yellow"
    $frontendReady = Wait-HttpReady -url ("http://localhost:{0}" -f $FrontendPort) -timeoutSec 120 -requestTimeoutSec 15
    if ($frontendReady) {
        Write-Color "Frontend is ready." "Green"
        Write-Color ("Open http://localhost:{0}" -f $FrontendPort) "Cyan"
    } else {
        Write-Color "Frontend did not respond within 120 seconds. Check the spawned Next.js window for build errors." "Yellow"
        Write-Color ("If it moved to another port or failed to compile, rerun after stopping stale processes.") "Yellow"
    }
}
