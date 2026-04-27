# Vision Engine

`vision-engine` is the OpenCLIP + `pgvector` retrieval service for marketplace image search.

## Responsibilities

- Export-free runtime search over `backend_product_id`
- Batch sync public product images from Spring Boot
- Store embeddings in Postgres schema `vision`
- Return ranked product candidates only

## Runtime prerequisites

1. Spring Boot backend is running on `http://localhost:8080`
2. Postgres is running and already contains the marketplace catalog
3. The Postgres server has the `pgvector` extension installed and the DB user can run:
   - `CREATE EXTENSION IF NOT EXISTS vector;`
4. Backend and `vision-engine` share the same internal secret
5. Local runtime should use **Python 3.11** for `torch` / `open_clip_torch`

## Environment

Copy:

```powershell
# Docker-oriented env
Copy-Item vision-engine/.env.example vision-engine/.env
```

Then adjust at least:

- `MARKETPLACE_BASE_URL`
- `VISION_DATABASE_URL`
- `VISION_INTERNAL_SECRET`

Optional relevance tuning:

- `IMAGE_SEARCH_MIN_CONFIDENCE_SCORE`
- `IMAGE_SEARCH_RELATIVE_SCORE_FLOOR`
- `IMAGE_SEARCH_ABSOLUTE_SCORE_FLOOR`

For local Windows development without Docker, use:

```powershell
Copy-Item vision-engine/.env.local.example vision-engine/.env
```

## Start with Docker

From repo root:

```powershell
docker compose -f docker-compose.vision.yml up --build
```

This compose file runs only `vision-engine`. It expects backend and Postgres to already be available on the host.

## Start locally on Windows

Install dependencies into a local virtual environment:

```powershell
./vision-engine/scripts/install-local.ps1
```

If your machine has multiple Python versions, the script defaults to `py -3.11`.
You can override that if needed.

Run the service:

```powershell
./vision-engine/scripts/run-local.ps1
```

Run with auto-reload during development:

```powershell
./vision-engine/scripts/run-local.ps1 -Reload
```

## Sync catalog

```powershell
Invoke-RestMethod `
  -Uri http://localhost:8001/v1/admin/sync-catalog `
  -Method Post `
  -Headers @{ "X-Vision-Internal-Secret" = "change-me-vision-secret" }
```

## Metrics

Use the internal metrics endpoint to inspect request quality and volume:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:8001/v1/metrics `
  -Headers @{ "X-Vision-Internal-Secret" = "change-me-vision-secret" }
```

## Smoke test

The smoke script:

- checks backend and `vision-engine` health
- triggers catalog sync
- fetches one real catalog image row
- downloads that image
- calls the public image-search endpoint
- verifies the top result against the expected `backend_product_id`

Run:

```powershell
./vision-engine/scripts/smoke-image-search.ps1 -VisionSecret "change-me-vision-secret"
```

## Benchmark

The benchmark script validates three behaviors through the public API:

- exact catalog image returns the expected product at top-1
- center-cropped image still keeps the expected product in top-k
- no-match synthetic image returns zero products

Run:

```powershell
./vision-engine/scripts/benchmark-image-search.ps1 -VisionSecret "change-me-vision-secret"
```
