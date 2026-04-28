param(
  [string]$BackendBaseUrl = "http://localhost:8080",
  [string]$VisionBaseUrl = "http://localhost:8001",
  [Parameter(Mandatory = $true)]
  [string]$VisionSecret,
  [int]$Limit = 10,
  [string]$TempImagePath = "",
  [switch]$KeepDownloadedImage
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($TempImagePath)) {
  $TempImagePath = Join-Path $env:TEMP "vision-smoke-query.jpg"
}

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-StatusOk {
  param(
    [string]$Name,
    [string]$Url
  )

  try {
    $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 20
  } catch {
    throw "$Name check failed at $Url. $($_.Exception.Message)"
  }

  return $response
}

Write-Step "Checking backend health"
$backendHealth = Assert-StatusOk -Name "Backend" -Url "$BackendBaseUrl/actuator/health"

Write-Step "Checking vision-engine health"
$visionHealth = Assert-StatusOk -Name "Vision health" -Url "$VisionBaseUrl/health"

Write-Step "Checking vision-engine readiness"
$visionReady = Assert-StatusOk -Name "Vision readiness" -Url "$VisionBaseUrl/ready"
if (-not $visionReady.ready) {
  throw "Vision engine is not ready."
}

$headers = @{
  "X-Vision-Internal-Secret" = $VisionSecret
}

Write-Step "Triggering catalog sync"
$syncResponse = Invoke-RestMethod -Uri "$VisionBaseUrl/v1/admin/sync-catalog" -Method Post -Headers $headers -TimeoutSec 3600
if (($syncResponse.synced_rows -as [int]) -lt 0) {
  throw "Sync response is invalid."
}

Write-Step "Loading a sample catalog row from backend"
$catalogResponse = Invoke-RestMethod -Uri "$BackendBaseUrl/api/internal/vision/catalog?page=0&size=1" -Method Get -Headers $headers -TimeoutSec 30
if (-not $catalogResponse.items -or $catalogResponse.items.Count -eq 0) {
  throw "Catalog export returned no public image rows."
}

$sample = $catalogResponse.items[0]
if ([string]::IsNullOrWhiteSpace($sample.image_url)) {
  throw "Sample catalog row does not contain image_url."
}

Write-Step "Downloading sample image"
Invoke-WebRequest -Uri $sample.image_url -OutFile $TempImagePath -TimeoutSec 60

Write-Step "Calling public image search API"
$searchRaw = & curl.exe -sS -X POST `
  -F "file=@$TempImagePath;type=image/jpeg" `
  -F "limit=$Limit" `
  "$BackendBaseUrl/api/public/marketplace/search/image?limit=$Limit"

if ([string]::IsNullOrWhiteSpace($searchRaw)) {
  throw "Public image search returned an empty response."
}

$searchResponse = $searchRaw | ConvertFrom-Json

if (-not $searchResponse.items -or $searchResponse.items.Count -eq 0) {
  throw "Public image search returned no items."
}

$topItem = $searchResponse.items[0]
$expectedProductId = [string]$sample.backend_product_id
$actualProductId = [string]$topItem.id
$isExactTop1 = $expectedProductId -eq $actualProductId

Write-Step "Smoke summary"
[pscustomobject]@{
  BackendStatus       = $backendHealth.status
  VisionStatus        = $visionHealth.status
  VisionReady         = $visionReady.ready
  ImagesProcessed     = $syncResponse.images_processed
  SyncedRows          = $syncResponse.synced_rows
  EmbeddingsInserted  = $syncResponse.embeddings_inserted
  EmbeddingsUpdated   = $syncResponse.embeddings_updated
  SkippedUnchanged    = $syncResponse.skipped_unchanged
  FailedRows          = $syncResponse.failed_rows
  FailedImages        = $syncResponse.failed_images
  FailedReasonCounts  = ($syncResponse.failed_image_reason_counts | ConvertTo-Json -Compress)
  DeactivatedRows     = $syncResponse.deactivated_rows
  InactiveStaleRows   = $syncResponse.inactive_stale_rows
  IndexVersion        = $syncResponse.index_version
  ExpectedProductId   = $expectedProductId
  Top1ProductId       = $actualProductId
  ExactCatalogTop1    = $isExactTop1
  TotalCandidates     = $searchResponse.totalCandidates
  ReturnedItems       = $searchResponse.items.Count
  DownloadedImagePath = $TempImagePath
} | Format-List

if (-not $KeepDownloadedImage -and (Test-Path $TempImagePath)) {
  Remove-Item $TempImagePath -Force
}
