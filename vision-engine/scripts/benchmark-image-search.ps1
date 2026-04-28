param(
  [string]$BackendBaseUrl = "http://localhost:8080",
  [string]$VisionBaseUrl = "http://localhost:8001",
  [Parameter(Mandatory = $true)]
  [string]$VisionSecret,
  [int]$Limit = 10,
  [int]$CropPassTopK = 5,
  [int]$ExactSamples = 5,
  [int]$CropSamples = 5,
  [int]$NoMatchSamples = 5,
  [int]$CategorySamples = 3,
  [double]$MinTop1Acc = 0.0,
  [double]$MinTop5Recall = 0.0,
  [double]$MaxEmptyRate = 1.0,
  [double]$MaxLowConfidenceRate = 1.0,
  [double]$MaxP95LatencyMs = [double]::PositiveInfinity,
  [switch]$FailOnGate,
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

function Get-MimeType {
  param([string]$Path)

  $extension = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
  switch ($extension) {
    ".png" { return "image/png" }
    ".webp" { return "image/webp" }
    ".gif" { return "image/gif" }
    default { return "image/jpeg" }
  }
}

function Build-SearchUrl {
  param(
    [string]$CategorySlug,
    [string]$StoreSlug
  )

  $query = [System.Collections.Generic.List[string]]::new()
  $query.Add("limit=$Limit")

  if (-not [string]::IsNullOrWhiteSpace($CategorySlug)) {
    $query.Add("category=$([System.Uri]::EscapeDataString($CategorySlug))")
  }

  if (-not [string]::IsNullOrWhiteSpace($StoreSlug)) {
    $query.Add("store=$([System.Uri]::EscapeDataString($StoreSlug))")
  }

  return "$BackendBaseUrl/api/public/marketplace/search/image?" + ($query -join "&")
}

function Invoke-PublicImageSearchRequest {
  param(
    [string]$ImagePath,
    [string]$CategorySlug = "",
    [string]$StoreSlug = ""
  )

  $mimeType = Get-MimeType -Path $ImagePath
  $responsePath = [System.IO.Path]::GetTempFileName()
  $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $statusCode = & curl.exe -sS -o $responsePath -w "%{http_code}" -X POST `
      -F "file=@$ImagePath;type=$mimeType" `
      (Build-SearchUrl -CategorySlug $CategorySlug -StoreSlug $StoreSlug)
    $body = if (Test-Path $responsePath) { Get-Content -Path $responsePath -Raw } else { "" }
  } finally {
    $stopwatch.Stop()
    if (Test-Path $responsePath) {
      Remove-Item $responsePath -Force
    }
  }

  return [pscustomobject]@{
    statusCode = [int]$statusCode
    body = $body
    latencyMs = [double]$stopwatch.Elapsed.TotalMilliseconds
  }
}

function Invoke-PublicImageSearch {
  param(
    [string]$ImagePath,
    [string]$CategorySlug = "",
    [string]$StoreSlug = ""
  )

  $request = Invoke-PublicImageSearchRequest -ImagePath $ImagePath -CategorySlug $CategorySlug -StoreSlug $StoreSlug
  if ($request.statusCode -lt 200 -or $request.statusCode -ge 300) {
    throw "Public image search failed for $ImagePath with status $($request.statusCode). Body: $($request.body)"
  }
  if ([string]::IsNullOrWhiteSpace($request.body)) {
    throw "Public image search returned an empty response for $ImagePath."
  }

  return [pscustomobject]@{
    response = ($request.body | ConvertFrom-Json)
    latencyMs = $request.latencyMs
  }
}

function New-CenterCropImage {
  param(
    [string]$SourcePath,
    [string]$TargetPath,
    [double]$CropRatio = 0.7
  )

  Add-Type -AssemblyName System.Drawing
  $image = [System.Drawing.Image]::FromFile($SourcePath)
  try {
    $baseSize = [Math]::Min($image.Width, $image.Height)
    $cropSize = [Math]::Max([int]($baseSize * $CropRatio), 1)
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
  param(
    [string]$TargetPath,
    [int]$Seed
  )

  Add-Type -AssemblyName System.Drawing
  $random = [System.Random]::new($Seed)
  $bitmap = New-Object System.Drawing.Bitmap 96,96
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $background = [System.Drawing.Color]::FromArgb($random.Next(30, 220), $random.Next(30, 220), $random.Next(30, 220))
    $graphics.Clear($background)
    for ($i = 0; $i -lt 12; $i++) {
      $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(
        $random.Next(255),
        $random.Next(255),
        $random.Next(255)
      ))
      try {
        $x = $random.Next(0, 72)
        $y = $random.Next(0, 72)
        $w = $random.Next(8, 30)
        $h = $random.Next(8, 30)
        $graphics.FillEllipse($brush, $x, $y, $w, $h)
      } finally {
        $brush.Dispose()
      }
    }
    $bitmap.Save($TargetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

function Get-P95 {
  param([double[]]$Values)

  if (-not $Values -or $Values.Length -eq 0) {
    return 0.0
  }
  $sorted = $Values | Sort-Object
  $rank = [Math]::Ceiling(0.95 * $sorted.Length) - 1
  $index = [Math]::Max(0, [Math]::Min($rank, $sorted.Length - 1))
  return [double]$sorted[$index]
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

Write-Step "Loading benchmark samples from internal catalog"
$catalogSize = [Math]::Max([Math]::Max($ExactSamples, $CropSamples), $CategorySamples)
$catalogResponse = Invoke-JsonGet -Url "$BackendBaseUrl/api/internal/vision/catalog?page=0&size=$catalogSize" -Headers $headers
if (-not $catalogResponse.items -or $catalogResponse.items.Count -eq 0) {
  throw "Catalog export returned no public image rows."
}

$samples = @($catalogResponse.items)
$exactTotalTarget = [Math]::Min($ExactSamples, $samples.Count)
$cropTotalTarget = [Math]::Min($CropSamples, $samples.Count)
$categoryRows = @($samples | Where-Object { -not [string]::IsNullOrWhiteSpace($_.category_slug) } | Select-Object -First $CategorySamples)
$categoryTotalTarget = $categoryRows.Count

if ($exactTotalTarget -le 0 -or $cropTotalTarget -le 0) {
  throw "Not enough catalog rows to run exact/crop benchmark."
}

$metricsBefore = Invoke-JsonGet -Url "$VisionBaseUrl/v1/metrics" -Headers $headers

$workDir = Join-Path $env:TEMP ("vision-benchmark-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $workDir | Out-Null

$latencies = New-Object System.Collections.Generic.List[double]
$exactPass = 0
$exactTotal = 0
$cropPass = 0
$cropTotal = 0
$categoryPass = 0
$categoryTotal = 0
$syntheticEmptyPass = 0
$syntheticTotal = [Math]::Max($NoMatchSamples, 0)
$allEmptyCount = 0
$totalQueries = 0
$corruptedStatusCode = 0
$oversizedStatusCode = 0

try {
  Write-Step "Running exact-image benchmark"
  for ($i = 0; $i -lt $exactTotalTarget; $i++) {
    $sample = $samples[$i]
    $expectedProductId = [string]$sample.backend_product_id
    $exactImagePath = Join-Path $workDir ("exact-" + $i + ".jpg")
    Invoke-WebRequest -Uri $sample.image_url -OutFile $exactImagePath -TimeoutSec 60

    $result = Invoke-PublicImageSearch -ImagePath $exactImagePath
    $latencies.Add($result.latencyMs)
    $totalQueries += 1
    $exactTotal += 1

    $items = @($result.response.items)
    if ($items.Count -eq 0) {
      $allEmptyCount += 1
      continue
    }

    if ([string]$items[0].id -eq $expectedProductId) {
      $exactPass += 1
    }
  }

  Write-Step "Running crop benchmark"
  for ($i = 0; $i -lt $cropTotalTarget; $i++) {
    $sample = $samples[$i]
    $expectedProductId = [string]$sample.backend_product_id
    $baseImagePath = Join-Path $workDir ("crop-base-" + $i + ".jpg")
    $cropImagePath = Join-Path $workDir ("crop-" + $i + ".jpg")
    Invoke-WebRequest -Uri $sample.image_url -OutFile $baseImagePath -TimeoutSec 60

    $ratio = 0.55 + (0.1 * ($i % 3))
    New-CenterCropImage -SourcePath $baseImagePath -TargetPath $cropImagePath -CropRatio $ratio

    $result = Invoke-PublicImageSearch -ImagePath $cropImagePath
    $latencies.Add($result.latencyMs)
    $totalQueries += 1
    $cropTotal += 1

    $items = @($result.response.items)
    if ($items.Count -eq 0) {
      $allEmptyCount += 1
      continue
    }

    $topKIds = @($items | Select-Object -First $CropPassTopK | ForEach-Object { [string]$_.id })
    if ($topKIds -contains $expectedProductId) {
      $cropPass += 1
    }
  }

  if ($categoryTotalTarget -gt 0) {
    Write-Step "Running category-filter benchmark"
    for ($i = 0; $i -lt $categoryTotalTarget; $i++) {
      $sample = $categoryRows[$i]
      $expectedProductId = [string]$sample.backend_product_id
      $expectedCategorySlug = [string]$sample.category_slug
      $categoryImagePath = Join-Path $workDir ("category-" + $i + ".jpg")
      Invoke-WebRequest -Uri $sample.image_url -OutFile $categoryImagePath -TimeoutSec 60

      $result = Invoke-PublicImageSearch -ImagePath $categoryImagePath -CategorySlug $expectedCategorySlug
      $latencies.Add($result.latencyMs)
      $totalQueries += 1
      $categoryTotal += 1

      $items = @($result.response.items)
      if ($items.Count -eq 0) {
        $allEmptyCount += 1
        continue
      }

      $allMatchCategory = (@($items | Where-Object { [string]$_.categorySlug -ne $expectedCategorySlug }).Count -eq 0)
      $returnedIds = @($items | ForEach-Object { [string]$_.id })
      if ($allMatchCategory -and ($returnedIds -contains $expectedProductId)) {
        $categoryPass += 1
      }
    }
  }

  Write-Step "Running no-match benchmark"
  for ($i = 0; $i -lt $syntheticTotal; $i++) {
    $syntheticPath = Join-Path $workDir ("synthetic-" + $i + ".png")
    New-SyntheticImage -TargetPath $syntheticPath -Seed (241 + $i)

    $result = Invoke-PublicImageSearch -ImagePath $syntheticPath
    $latencies.Add($result.latencyMs)
    $totalQueries += 1

    $items = @($result.response.items)
    if ($items.Count -eq 0) {
      $syntheticEmptyPass += 1
      $allEmptyCount += 1
    }
  }

  Write-Step "Running corrupted-image benchmark"
  $corruptedPath = Join-Path $workDir "corrupted-query.jpg"
  Set-Content -Path $corruptedPath -Value "not a real image" -Encoding utf8
  $corruptedResponse = Invoke-PublicImageSearchRequest -ImagePath $corruptedPath
  $corruptedStatusCode = $corruptedResponse.statusCode

  Write-Step "Running oversized-image benchmark"
  $oversizedPath = Join-Path $workDir "oversized-query.jpg"
  [System.IO.File]::WriteAllBytes($oversizedPath, (New-Object byte[] (6 * 1024 * 1024)))
  $oversizedResponse = Invoke-PublicImageSearchRequest -ImagePath $oversizedPath
  $oversizedStatusCode = $oversizedResponse.statusCode

  $metricsAfter = Invoke-JsonGet -Url "$VisionBaseUrl/v1/metrics" -Headers $headers
  $indexInfo = Invoke-JsonGet -Url "$VisionBaseUrl/v1/index/info"

  $deltaAccepted = [Math]::Max(0, [int]$metricsAfter.accepted_requests - [int]$metricsBefore.accepted_requests)
  $deltaLowConfidence = [Math]::Max(0, [int]$metricsAfter.low_confidence_requests - [int]$metricsBefore.low_confidence_requests)
  $deltaEmpty = [Math]::Max(0, [int]$metricsAfter.empty_requests - [int]$metricsBefore.empty_requests)

  $total = [Math]::Max(1, $totalQueries)
  $exactDenominator = [Math]::Max(1, $exactTotal)
  $cropDenominator = [Math]::Max(1, $cropTotal)
  $categoryDenominator = [Math]::Max(1, $categoryTotal)
  $syntheticDenominator = [Math]::Max(1, $syntheticTotal)
  $corruptedErrorPass = ($corruptedStatusCode -eq 400)
  $oversizedErrorPass = ($oversizedStatusCode -eq 413)
  $categoryFilterPassRate = if ($categoryTotal -gt 0) {
    [Math]::Round(($categoryPass / $categoryDenominator), 4)
  } else {
    1.0
  }

  $summary = [pscustomobject]@{
    backend_status = $backendHealth.status
    vision_ready = [bool]$visionReady.ready
    index_version = [string]$indexInfo.index_version
    request_count = $totalQueries
    top1_acc = [Math]::Round(($exactPass / $exactDenominator), 4)
    top5_recall = [Math]::Round(($cropPass / $cropDenominator), 4)
    category_filter_pass_rate = $categoryFilterPassRate
    synthetic_empty_rate = [Math]::Round(($syntheticEmptyPass / $syntheticDenominator), 4)
    empty_rate = [Math]::Round(($allEmptyCount / $total), 4)
    low_confidence_rate = [Math]::Round(($deltaLowConfidence / $total), 4)
    p95_latency = [Math]::Round((Get-P95 -Values $latencies.ToArray()), 2)
    accepted = $deltaAccepted
    low_confidence = $deltaLowConfidence
    empty = $deltaEmpty
    corrupted_status_code = $corruptedStatusCode
    corrupted_error_pass = $corruptedErrorPass
    oversized_status_code = $oversizedStatusCode
    oversized_error_pass = $oversizedErrorPass
  }

  $gatePass = (
    $summary.top1_acc -ge $MinTop1Acc -and
    $summary.top5_recall -ge $MinTop5Recall -and
    $summary.empty_rate -le $MaxEmptyRate -and
    $summary.low_confidence_rate -le $MaxLowConfidenceRate -and
    $summary.p95_latency -le $MaxP95LatencyMs -and
    $summary.category_filter_pass_rate -ge 1.0 -and
    $summary.corrupted_error_pass -and
    $summary.oversized_error_pass
  )
  $summary | Add-Member -NotePropertyName "gate_pass" -NotePropertyValue $gatePass

  Write-Step "Benchmark summary"
  $summary | Format-List

  if ($FailOnGate -and -not $gatePass) {
    throw "Benchmark quality gate failed."
  }
} finally {
  if (Test-Path $workDir) {
    Remove-Item $workDir -Recurse -Force
  }
}
