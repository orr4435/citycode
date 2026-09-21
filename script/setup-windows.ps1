# CityCode / opencode environment setup for Windows.
#
# Installs the base tooling used across this workspace: Git, Bun (the only thing
# actually required to run this repo - see CONTRIBUTING.md), Node.js (which brings
# npm), Python, and - if an NVIDIA GPU is detected - the CUDA Toolkit. Everything is
# installed via winget and every step is skipped if already present, so it's safe to
# re-run.
#
# Usage (from an elevated or regular PowerShell prompt):
#   irm https://raw.githubusercontent.com/<org>/<repo>/<branch>/script/setup-windows.ps1 | iex
# or, from a local clone:
#   .\script\setup-windows.ps1

$ErrorActionPreference = "Stop"

function Test-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Install-WithWinget($id, $displayName) {
    Write-Host "Installing $displayName..." -ForegroundColor Cyan
    winget install --id $id --silent --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "winget could not install $displayName (id: $id). Install it manually and re-run this script."
    }
}

if (-not (Test-Command "winget")) {
    throw "winget is required. Install 'App Installer' from the Microsoft Store, then re-run this script."
}

# --- Git -----------------------------------------------------------------
if (Test-Command "git") {
    Write-Host "Git already installed: $(git --version)" -ForegroundColor Green
} else {
    Install-WithWinget "Git.Git" "Git"
}

# --- Bun (the only requirement actually documented in CONTRIBUTING.md) ---
if (Test-Command "bun") {
    Write-Host "Bun already installed: $(bun --version)" -ForegroundColor Green
} else {
    Write-Host "Installing Bun..." -ForegroundColor Cyan
    irm bun.sh/install.ps1 | iex
}

# --- Node.js + npm ---------------------------------------------------------
if (Test-Command "npm") {
    Write-Host "npm already installed: $(npm --version)" -ForegroundColor Green
} else {
    Install-WithWinget "OpenJS.NodeJS.LTS" "Node.js (includes npm)"
}

# --- Python ------------------------------------------------------------
if (Test-Command "python") {
    Write-Host "Python already installed: $(python --version)" -ForegroundColor Green
} else {
    Install-WithWinget "Python.Python.3.12" "Python"
}

# --- CUDA Toolkit (only if an NVIDIA GPU is present) ------------------------
$hasNvidiaGpu = [bool](Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match "NVIDIA" })

if ($hasNvidiaGpu) {
    if (Test-Command "nvcc") {
        Write-Host "CUDA Toolkit already installed: $(nvcc --version | Select-String 'release')" -ForegroundColor Green
    } else {
        Install-WithWinget "Nvidia.CUDA" "NVIDIA CUDA Toolkit"
    }
} else {
    Write-Host "No NVIDIA GPU detected - skipping CUDA Toolkit." -ForegroundColor Yellow
}

# --- Project dependencies ---------------------------------------------------
$repoRoot = Split-Path -Parent $PSScriptRoot
if (Test-Path (Join-Path $repoRoot "package.json")) {
    Write-Host "Running 'bun install' in $repoRoot..." -ForegroundColor Cyan
    Push-Location $repoRoot
    try {
        & bun install
    } finally {
        Pop-Location
    }
}

Write-Host "`nSetup complete. Try:" -ForegroundColor Green
Write-Host "  bun run dev       # launch the terminal UI"
Write-Host "  bun run dev:web   # launch the web UI at http://localhost:3000"
