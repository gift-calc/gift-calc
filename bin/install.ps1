# gift-calc Windows Installation Script
# This script installs gift-calc from source on Windows

param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/gift-calc/gift-calc"
$InstallDir = "$env:LOCALAPPDATA\gift-calc"
$BinDir = "$env:LOCALAPPDATA\Microsoft\WindowsApps"

# Colors for output
$Colors = @{
    Info = "Cyan"
    Success = "Green" 
    Warning = "Yellow"
    Error = "Red"
}

function Write-Info($Message) {
    Write-Host "ℹ $Message" -ForegroundColor $Colors.Info
}

function Write-Success($Message) {
    Write-Host "✓ $Message" -ForegroundColor $Colors.Success
}

function Write-Warning($Message) {
    Write-Host "⚠ $Message" -ForegroundColor $Colors.Warning
}

function Write-Error($Message) {
    Write-Host "✗ $Message" -ForegroundColor $Colors.Error
}

function Test-Command($CommandName) {
    return Get-Command $CommandName -ErrorAction SilentlyContinue
}

function Test-NodeVersion($RequiredVersion) {
    try {
        $nodeVersion = & node --version
        $version = $nodeVersion -replace "v", ""
        $versionParts = $version.Split(".")
        $requiredParts = $RequiredVersion.Split(".")
        
        $major = [int]$versionParts[0]
        $requiredMajor = [int]$requiredParts[0]
        
        return $major -ge $requiredMajor
    }
    catch {
        return $false
    }
}

function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    if (!(Test-Command "node")) {
        Write-Error "Node.js is required but not installed."
        Write-Info "Please install Node.js (>= 18.0.0) from https://nodejs.org/"
        exit 1
    }
    
    if (!(Test-NodeVersion "18.0.0")) {
        $currentVersion = & node --version
        Write-Error "Node.js >= 18.0.0 is required. Current version: $currentVersion"
        exit 1
    }
    
    if (!(Test-Command "git")) {
        Write-Error "Git is required but not installed."
        Write-Info "Please install Git from https://git-scm.com/"
        exit 1
    }
    
    Write-Success "Prerequisites check passed"
}

function New-InstallDirectories {
    Write-Info "Creating installation directories..."
    
    if (!(Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }
    
    if (!(Test-Path $BinDir)) {
        New-Item -ItemType Directory -Path $BinDir -Force | Out-Null
    }
    
    Write-Success "Directories created"
}

function Install-Source {
    Write-Info "Installing gift-calc from source..."
    
    if (Test-Path "$InstallDir\.git") {
        Write-Info "Updating existing installation..."
        Set-Location $InstallDir
        & git pull origin main
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to update repository"
            exit 1
        }
    }
    else {
        if (Test-Path $InstallDir) {
            if ($Force) {
                Write-Warning "Removing existing installation directory..."
                Remove-Item $InstallDir -Recurse -Force
            }
            else {
                Write-Error "Installation directory exists. Use -Force to overwrite."
                exit 1
            }
        }
        
        Write-Info "Cloning repository..."
        & git clone $RepoUrl $InstallDir
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to clone repository"
            exit 1
        }
    }
    
    Write-Success "Source code installed"
}

function New-ExecutableWrappers {
    Write-Info "Creating executable wrappers..."
    
    # Create gift-calc.cmd
    $giftCalcCmd = @"
@echo off
node "$InstallDir\index.js" %*
"@
    
    $giftCalcCmd | Out-File -FilePath "$BinDir\gift-calc.cmd" -Encoding ASCII
    
    # Create gcalc.cmd (alias)
    $gcalcCmd = @"
@echo off
node "$InstallDir\index.js" %*
"@
    
    $gcalcCmd | Out-File -FilePath "$BinDir\gcalc.cmd" -Encoding ASCII
    
    Write-Success "Executable wrappers created"
}

function Test-PathConfiguration {
    Write-Info "Checking PATH configuration..."
    
    $currentPath = $env:PATH
    if ($currentPath -notlike "*$BinDir*") {
        Write-Warning "$BinDir is not in your PATH"
        Write-Info "The installation uses $BinDir which should be in PATH by default on Windows 10/11"
        Write-Info "If commands don't work, you may need to restart your terminal or add the directory to PATH manually"
    }
    else {
        Write-Success "PATH is configured correctly"
    }
}

function Test-Installation {
    Write-Info "Verifying installation..."
    
    $giftCalcExists = Test-Path "$BinDir\gift-calc.cmd"
    $gcalcExists = Test-Path "$BinDir\gcalc.cmd"
    
    if ($giftCalcExists -and $gcalcExists) {
        Write-Success "gift-calc installed successfully!"
        Write-Info ""
        Write-Info "Usage:"
        Write-Info "  gift-calc --help       # Show help"
        Write-Info "  gcalc -b 100          # Quick calculation" 
        Write-Info "  gift-calc init-config # Setup configuration"
        Write-Info ""
        
        # Test if commands work
        try {
            $null = & "$BinDir\gift-calc.cmd" --help 2>$null
            Write-Success "Commands are ready to use"
        }
        catch {
            Write-Warning "Commands will be available after restarting your terminal"
        }
    }
    else {
        Write-Error "Installation failed - executables not found"
        exit 1
    }
}

function Main {
    Write-Host ""
    Write-Info "gift-calc Windows Installation Script"
    Write-Info "====================================="
    Write-Host ""
    
    Test-Prerequisites
    New-InstallDirectories
    Install-Source
    New-ExecutableWrappers
    Test-PathConfiguration
    Test-Installation
    
    Write-Host ""
    Write-Success "Installation complete!"
    Write-Info "Note: If commands don't work immediately, try restarting your terminal."
    Write-Host ""
}

# Run main function
Main