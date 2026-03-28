param(
    [string]$OutputRoot = (Join-Path $PSScriptRoot "release"),
    [string]$PackageDate = (Get-Date -Format "yyyyMMdd")
)

$ErrorActionPreference = "Stop"

function Write-Info($text) {
    Write-Host $text -ForegroundColor Cyan
}

function Write-Ok($text) {
    Write-Host $text -ForegroundColor Green
}

function Remove-IfExists($path) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path
    }
}

function Invoke-Robocopy($source, $destination, $excludeDirs = @(), $excludeFiles = @()) {
    if (-not (Test-Path $source)) {
        throw "Source path not found: $source"
    }

    New-Item -ItemType Directory -Force -Path $destination | Out-Null

    $arguments = @(
        $source,
        $destination,
        "/E",
        "/R:1",
        "/W:1",
        "/NFL",
        "/NDL",
        "/NJH",
        "/NJS",
        "/NP"
    )

    if ($excludeDirs.Count -gt 0) {
        $resolvedExcludeDirs = @()
        foreach ($dir in $excludeDirs) {
            if ([System.IO.Path]::IsPathRooted($dir)) {
                $resolvedExcludeDirs += $dir
            } else {
                $resolvedExcludeDirs += (Join-Path $source $dir)
            }
        }
        $arguments += "/XD"
        $arguments += $resolvedExcludeDirs
    }

    if ($excludeFiles.Count -gt 0) {
        $resolvedExcludeFiles = @()
        foreach ($file in $excludeFiles) {
            if ($file.Contains("*") -or $file.Contains("?")) {
                $resolvedExcludeFiles += $file
            } elseif ([System.IO.Path]::IsPathRooted($file)) {
                $resolvedExcludeFiles += $file
            } else {
                $resolvedExcludeFiles += (Join-Path $source $file)
            }
        }
        $arguments += "/XF"
        $arguments += $resolvedExcludeFiles
    }

    & robocopy @arguments | Out-Null
    $exitCode = $LASTEXITCODE
    if ($exitCode -ge 8) {
        throw "Robocopy failed with exit code $exitCode while copying $source"
    }
}

$packageName = "SmartLibrarySystem_Delivery_$PackageDate"
$stageDir = Join-Path $OutputRoot $packageName
$zipPath = Join-Path $OutputRoot ($packageName + ".zip")
$packagingRoot = Join-Path $PSScriptRoot "packaging"

Write-Info "Preparing delivery package under: $stageDir"
if (Test-Path $stageDir) {
    Remove-Item -Recurse -Force $stageDir
}
New-Item -ItemType Directory -Force -Path $stageDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $stageDir "docs") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $stageDir "database") | Out-Null

Write-Info "Copying package-level docs and scripts..."
Copy-Item (Join-Path $packagingRoot "README.md") (Join-Path $stageDir "README.md") -Force
Copy-Item (Join-Path $packagingRoot "docs\软件环境部署与操作说明.md") (Join-Path $stageDir "docs\软件环境部署与操作说明.md") -Force

$rootFiles = @(
    ".env.example",
    "docker-compose.yml",
    "project.config.json",
    "start.ps1",
    "start-all.bat",
    "start-backend-only.bat",
    "seed-backend-data.bat"
)

foreach ($file in $rootFiles) {
    Copy-Item (Join-Path $PSScriptRoot $file) (Join-Path $stageDir $file) -Force
}

Write-Info "Copying backend source..."
Invoke-Robocopy `
    -source (Join-Path $PSScriptRoot "backend-library") `
    -destination (Join-Path $stageDir "backend-library") `
    -excludeDirs @(".idea", "target") `
    -excludeFiles @(
        "build.log",
        "compile_errors.txt",
        "current_errors.txt",
        "startup.log",
        "test_output.txt",
        "project_code_context_backend.txt",
        "cp.txt"
    )

Write-Info "Copying frontend source..."
Invoke-Robocopy `
    -source (Join-Path $PSScriptRoot "front_library") `
    -destination (Join-Path $stageDir "front_library") `
    -excludeDirs @(".idea", ".next", "node_modules") `
    -excludeFiles @(
        "dev-home-baseline.err.log",
        "dev-home-baseline.log",
        "dev.log",
        "tsconfig.tsbuildinfo"
    )

Write-Info "Copying Android client source..."
Invoke-Robocopy `
    -source (Join-Path $PSScriptRoot "front-android") `
    -destination (Join-Path $stageDir "front-android") `
    -excludeDirs @(".expo", ".idea", "node_modules", "dist", "android\\.gradle", "android\\.kotlin", "android\\build", "android\\app\\build") `
    -excludeFiles @(
        ".env",
        "*.log",
        "*.apk",
        "*.jks",
        "*.keystore",
        "tsconfig.json.*",
        "android\\local.properties",
        "android\\app\\debug.keystore"
    )

$androidStageDir = Join-Path $stageDir "front-android"
$androidCleanupPaths = @(
    ".expo",
    "node_modules",
    "dist",
    ".env",
    "android\\.gradle",
    "android\\.kotlin",
    "android\\build",
    "android\\app\\build",
    "android\\local.properties",
    "android\\app\\debug.keystore"
)

foreach ($relativePath in $androidCleanupPaths) {
    Remove-IfExists (Join-Path $androidStageDir $relativePath)
}

Get-ChildItem -Path $androidStageDir -Recurse -File -Include *.log,*.apk,*.jks,*.keystore -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $androidStageDir -File -Filter "tsconfig.json.*" -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue

Write-Info "Copying WeChat miniapp source..."
Invoke-Robocopy `
    -source (Join-Path $PSScriptRoot "miniapp") `
    -destination (Join-Path $stageDir "miniapp") `
    -excludeDirs @() `
    -excludeFiles @(
        "project.private.config.json"
    )

Write-Info "Copying database scripts..."
$databaseFiles = @(
    "create.sql",
    "library_management_linux_init.sql",
    "migrate-legacy-schema.sql",
    "数据库结构.md"
)

foreach ($file in $databaseFiles) {
    Copy-Item (Join-Path $PSScriptRoot "backend-library\$file") (Join-Path $stageDir "database\$file") -Force
}

if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}

Write-Info "Compressing zip archive..."
Push-Location $OutputRoot
try {
    Compress-Archive -Path $packageName -DestinationPath $zipPath -Force
} finally {
    Pop-Location
}

$zipFile = Get-Item $zipPath
Write-Ok ("Delivery package created: {0}" -f $zipFile.FullName)
Write-Ok ("Archive size: {0:N2} MB" -f ($zipFile.Length / 1MB))
