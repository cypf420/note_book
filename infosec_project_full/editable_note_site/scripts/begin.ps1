[CmdletBinding()]
param(
    [switch]$DryRun
)
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$siteHost = if ($env:SITE_HOST) { $env:SITE_HOST } else { "127.0.0.1" }
$sitePort = if ($env:SITE_PORT) { $env:SITE_PORT } else { "8000" }
$autoOpen = if ($env:AUTO_OPEN_BROWSER) { $env:AUTO_OPEN_BROWSER } else { "1" }
$envName = if ($env:ENV_NAME) { $env:ENV_NAME } else { "note_book" }
$pythonVersion = if ($env:PYTHON_VERSION) { $env:PYTHON_VERSION } else { "3.13" }

function Write-Step($text) {
    Write-Host $text
}

function Test-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Invoke-Checked($filePath, $arguments) {
    $argText = if ($arguments.Count) { $arguments -join " " } else { "" }
    Write-Host "> $filePath $argText"
    & $filePath @arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $filePath $argText"
    }
}

function Get-PythonRuntime() {
    if (Test-Command "conda") {
        Write-Step "[1/5] Conda detected. Checking environment $envName ..."
        & conda run -n $envName python --version *> $null
        if ($LASTEXITCODE -ne 0) {
            Write-Step "[2/5] Environment $envName not found. Creating Python $pythonVersion environment..."
            Invoke-Checked "conda" @("create", "-n", $envName, "python=$pythonVersion", "-y")
        } else {
            Write-Step "[2/5] Environment $envName is ready."
        }
        return @{
            Mode = "conda"
            Exec = "conda"
            Prefix = @("run", "-n", $envName)
        }
    }

    Write-Step "[1/5] Conda not found. Trying system Python ..."
    if (Test-Command "py") {
        return @{
            Mode = "python"
            Exec = "py"
            Prefix = @("-3")
        }
    }
    if (Test-Command "python") {
        return @{
            Mode = "python"
            Exec = "python"
            Prefix = @()
        }
    }
    throw "No usable Python or Conda installation was found. Please install Miniconda, Anaconda, or Python 3.10+."
}

function Test-Dependencies($runtime) {
    if ($runtime.Mode -eq "conda") {
        cmd /c "conda run -n $envName python -c ""import requests, bs4, markdownify"" >nul 2>nul"
        return $LASTEXITCODE -eq 0
    }
    if ($runtime.Exec -eq "py") {
        cmd /c "py -3 -c ""import requests, bs4, markdownify"" >nul 2>nul"
        return $LASTEXITCODE -eq 0
    }
    cmd /c "python -c ""import requests, bs4, markdownify"" >nul 2>nul"
    return $LASTEXITCODE -eq 0
}

function Install-Dependencies($runtime) {
    Write-Step "[4/5] Missing dependencies detected. Installing..."
    if ($runtime.Mode -eq "conda") {
        Invoke-Checked $runtime.Exec (@() + $runtime.Prefix + @("python", "-m", "pip", "install", "-r", "requirements.txt"))
        return
    }
    Invoke-Checked $runtime.Exec (@() + $runtime.Prefix + @("-m", "pip", "install", "-r", "requirements.txt"))
}

function Start-Site($runtime) {
    Write-Step "[5/5] Starting the site..."
    Write-Host ""
    $env:HOST = $siteHost
    $env:PORT = $sitePort
    $env:AUTO_OPEN_BROWSER = $autoOpen
    if ($runtime.Mode -eq "conda") {
        & $runtime.Exec @($runtime.Prefix + @("python", "scripts/server.py"))
    } else {
        & $runtime.Exec @($runtime.Prefix + @("scripts/server.py"))
    }
    return $LASTEXITCODE
}

Write-Host "========================================"
Write-Host "  YCY Local Notes Workspace - One Click Start"
Write-Host "========================================"
Write-Host ""
Write-Host "Project directory: $root"
Write-Host "This script will check Python or Conda, install dependencies, and start the site."
Write-Host "Default URL: http://$siteHost`:$sitePort"
Write-Host "If the port is busy, use the final URL printed by the server window."
Write-Host ""

try {
    $runtime = Get-PythonRuntime
    Write-Step "[3/5] Checking dependencies ..."
    if (-not (Test-Dependencies $runtime)) {
        Install-Dependencies $runtime
    } else {
        Write-Step "[4/5] Dependencies are ready."
    }
    if ($DryRun) {
        Write-Step "[5/5] Dry run complete: environment and dependencies are ready."
        exit 0
    }
    $exitCode = Start-Site $runtime
    Write-Host ""
    Write-Host "Server stopped."
    exit $exitCode
} catch {
    Write-Host ""
    Write-Host "[ERROR] $($_.Exception.Message)"
    Write-Host ""
    pause
    exit 1
}
