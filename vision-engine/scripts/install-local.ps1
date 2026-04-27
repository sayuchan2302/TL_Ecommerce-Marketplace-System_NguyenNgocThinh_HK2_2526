param(
  [string]$PythonExecutable = "py",
  [string]$PythonVersion = "3.11",
  [switch]$RecreateVenv
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$visionDir = Split-Path -Parent $scriptDir
$venvDir = Join-Path $visionDir ".venv"

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message" -ForegroundColor Cyan
}

if ($RecreateVenv -and (Test-Path $venvDir)) {
  Write-Step "Removing existing virtual environment"
  Remove-Item $venvDir -Recurse -Force
}

if (-not (Test-Path $venvDir)) {
  Write-Step "Creating virtual environment"
  if ([string]::IsNullOrWhiteSpace($PythonVersion)) {
    & $PythonExecutable -m venv $venvDir
  } else {
    & $PythonExecutable "-$PythonVersion" -m venv $venvDir
  }
}

$venvPython = Join-Path $venvDir "Scripts/python.exe"
if (-not (Test-Path $venvPython)) {
  throw "Python executable not found in virtual environment: $venvPython"
}

Push-Location $visionDir
try {
  Write-Step "Upgrading pip"
  & $venvPython -m pip install --upgrade pip

  Write-Step "Installing vision-engine requirements"
  & $venvPython -m pip install -r requirements.txt
} finally {
  Pop-Location
}

Write-Host "Local environment is ready: $venvPython" -ForegroundColor Green
