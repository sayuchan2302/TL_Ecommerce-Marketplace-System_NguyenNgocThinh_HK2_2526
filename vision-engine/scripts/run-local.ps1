param(
  [string]$BindHost = "0.0.0.0",
  [int]$Port = 8001,
  [switch]$Reload,
  [string]$PythonExecutable = "python"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$visionDir = Split-Path -Parent $scriptDir
$venvPython = Join-Path $visionDir ".venv/Scripts/python.exe"
$python = if (Test-Path $venvPython) { $venvPython } else { $PythonExecutable }

$envPath = Join-Path $visionDir ".env"
if (-not (Test-Path $envPath)) {
  throw "Missing $envPath. Copy vision-engine/.env.local.example or vision-engine/.env.example to vision-engine/.env first."
}

$args = @("-m", "uvicorn", "app.main:app", "--host", $BindHost, "--port", "$Port")
if ($Reload) {
  $args += "--reload"
}

Push-Location $visionDir
try {
  & $python @args
} finally {
  Pop-Location
}
