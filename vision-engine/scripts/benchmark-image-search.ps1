param(
  [string]$BackendBaseUrl = "http://localhost:8080",
  [string]$VisionBaseUrl = "http://localhost:8001",
  [Parameter(Mandatory = $true)]
  [string]$VisionSecret,
  [int]$Limit = 10,
  [int]$CropPassTopK = 5,
  [switch]$SkipSync
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-JsonGet {
  param(
    [string]$Url,
    [hashtable]$Headers = @{}
  )

  return Invoke-RestMethod -Uri $Url -Method Get -Headers $Headers -TimeoutSec 30
}

function Invoke-PublicImageSearch {
  param(
    [string]$ImagePath
  )

  $responseRaw = & curl.exe -sS -X POST `
    -F "file=@$ImagePath;type=image/jpeg" `
    -F "limit=$Limit" `
    "$BackendBaseUrl/api/public/marketplace/search/image?limit=$Limit"

  if ([string]::IsNullOrWhiteSpace($responseRaw)) {
    throw "Public image search returned an empty response for $ImagePath."
  }

  return $responseRaw | ConvertFrom-Json
}

function New-CenterCropImage {
  param(
    [string]$SourcePath,
    [string]$TargetPath
  )

  Add-Type -AssemblyName System.Drawing
  $image = [System.Drawing.Image]::FromFile($SourcePath)
  try {
    $cropSize = [Math]::Min($image.Width, $image.Height)
    $cropSize = [Math]::Max([int]($cropSize * 0.7), 1)
    $originX = [Math]::Max([int](($image.Width - $cropSize) / 2), 0)
    $originY = [Math]::Max([int](($image.Height - $cropSize) / 2), 0)

    $bitmap = New-Object System.Drawing.Bitmap 256,256
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.DrawImage(
        $image,
        (New-Object System.Drawing.Rectangle 0,0,256,256),
        (New-Object System.Drawing.Rectangle $originX,$originY,$cropSize,$cropSize),
        [System.Drawing.GraphicsUnit]::Pixel
      )
      $bitmap.Save($TargetPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    } finally {
      $graphics.Dispose()
      $bitmap.Dispose()
    }
  } finally {
    $image.Dispose()
  }
}

function New-SyntheticImage {
  param([string]$TargetPath)

  Add-Type -AssemblyName System.Drawing
  $bitmap = New-Object System.Drawing.Bitmap 32,32
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  try {
    $graphics.Clear([System.Drawing.Color]::FromArgb(47,91,234))
    $graphics.FillRectangle($whiteBrush, 8, 8, 16, 16)
    $bitmap.Save($TargetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $whiteBrush.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

Write-Step "Checking backend health"
$backendHealth = Invoke-JsonGet -Url "$BackendBaseUrl/actuator/health"

Write-Step "Checking vision-engine readiness"
$visionReady = Invoke-JsonGet -Url "$VisionBaseUrl/ready"
if (-not $visionReady.ready) {
  throw "Vision engine is not ready."
}

$headers = @{
  "X-Vision-Internal-Secret" = $VisionSecret
}

if (-not $SkipSync) {
  Write-Step "Triggering catalog sync"
  $syncResponse = Invoke-RestMethod -Uri "$VisionBaseUrl/v1/admin/sync-catalog" -Method Post -Headers $headers -TimeoutSec 3600
}

Write-Step "Loading a sample catalog row from backend"
$catalogResponse = Invoke-JsonGet -Url "$BackendBaseUrl/api/internal/vision/catalog?page=0&size=1" -Headers $headers
if (-not $catalogResponse.items -or $catalogResponse.items.Count -eq 0) {
  throw "Catalog export returned no public image rows."
}

$sample = $catalogResponse.items[0]
$expectedProductId = [string]$sample.backend_product_id

$workDir = Join-Path $env:TEMP ("vision-benchmark-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $workDir | Out-Null

$exactImagePath = Join-Path $workDir "exact.jpg"
$cropImagePath = Join-Path $workDir "crop.jpg"
$syntheticImagePath = Join-Path $workDir "synthetic.png"

try {
  Write-Step "Preparing benchmark images"
  Invoke-WebRequest -Uri $sample.image_url -OutFile $exactImagePath -TimeoutSec 60
  New-CenterCropImage -SourcePath $exactImagePath -TargetPath $cropImagePath
  New-SyntheticImage -TargetPath $syntheticImagePath

  Write-Step "Running exact-match benchmark"
  $exactResponse = Invoke-PublicImageSearch -ImagePath $exactImagePath

  Write-Step "Running crop benchmark"
  $cropResponse = Invoke-PublicImageSearch -ImagePath $cropImagePath

  Write-Step "Running no-match benchmark"
  $syntheticResponse = Invoke-PublicImageSearch -ImagePath $syntheticImagePath

  $exactTop1 = if ($exactResponse.items.Count -gt 0) { [string]$exactResponse.items[0].id } else { "" }
  $cropIds = @($cropResponse.items | ForEach-Object { [string]$_.id })
  $cropRank = $cropIds.IndexOf($expectedProductId)
  $cropRankDisplay = if ($cropRank -ge 0) { $cropRank + 1 } else { $null }
  $syntheticReturned = @($syntheticResponse.items).Count

  $summary = [pscustomobject]@{
    BackendStatus = $backendHealth.status
    VisionReady = $visionReady.ready
    SyncIndexVersion = if ($syncResponse) { $syncResponse.index_version } else { $null }
    ExpectedProductId = $expectedProductId
    ExactTop1ProductId = $exactTop1
    ExactTop1Pass = ($exactTop1 -eq $expectedProductId)
    ExactReturnedItems = @($exactResponse.items).Count
    CropReturnedItems = @($cropResponse.items).Count
    CropMatchedRank = $cropRankDisplay
    CropPassTopK = ($cropRank -ge 0 -and $cropRank -lt $CropPassTopK)
    SyntheticReturnedItems = $syntheticReturned
    SyntheticEmptyPass = ($syntheticReturned -eq 0)
    OverallPass = (
      ($exactTop1 -eq $expectedProductId) -and
      ($cropRank -ge 0 -and $cropRank -lt $CropPassTopK) -and
      ($syntheticReturned -eq 0)
    )
  }

  Write-Step "Benchmark summary"
  $summary | Format-List
} finally {
  if (Test-Path $workDir) {
    Remove-Item $workDir -Recurse -Force
  }
}
