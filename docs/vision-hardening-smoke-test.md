# Image Vision Hardening Smoke Test

Checklist nay dung sau khi deploy phan async sync, sync history, rate limit search image, va upload image hardening.

## 1. Environment

Backend va vision-engine can dung chung database va secret:

```env
JPA_DDL_AUTO=update
APP_VISION_ENABLED=true
APP_VISION_BASE_URL=http://localhost:8001
APP_VISION_INTERNAL_SECRET=vision-local-test-secret
APP_VISION_RATE_LIMIT_ENABLED=true
APP_VISION_RATE_LIMIT_PER_MINUTE=6
APP_VISION_RATE_LIMIT_PER_HOUR=30
APP_TRUST_PROXY_HEADERS=false
APP_UPLOAD_MAX_PRODUCT_IMAGE_PIXELS=20000000
```

```env
VISION_DATABASE_URL=postgresql://postgres:your_password@localhost:5432/marketplace_db
VISION_INTERNAL_SECRET=vision-local-test-secret
MARKETPLACE_BASE_URL=http://localhost:8080
```

Voi workflow lam mot minh, giu `JPA_DDL_AUTO=update` de Hibernate tu tao bang `vision_sync_runs` va `vision_sync_failures` khi backend start.

## 2. Start Services

```powershell
backend\mvnw.cmd -f backend/pom.xml spring-boot:run
```

```powershell
.\vision-engine\scripts\run-local.ps1
```

```powershell
npm.cmd run dev --prefix frontend
```

## 3. Admin Sync

Trigger sync tu Admin Image Vision UI hoac API:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:8080/api/admin/vision/sync-catalog `
  -Method Post `
  -Headers @{ Authorization = "Bearer <admin_jwt>" }
```

Expected:

- Backend tra `202 Accepted`.
- `syncSummary.status` la `syncing`.
- `syncSummary.jobId` co gia tri.
- Admin UI tu poll moi 3 giay den khi `success` hoac `error`.
- Refresh page van thay latest sync vi history da nam trong DB.

Kiem tra DB:

```sql
SELECT job_id, status, started_at, finished_at, duration_ms, images_processed, failed_images
FROM vision_sync_runs
ORDER BY started_at DESC
LIMIT 5;
```

```sql
SELECT product_id, reason, status, left(image_url, 120) AS image_url
FROM vision_sync_failures
WHERE run_id = (SELECT id FROM vision_sync_runs ORDER BY started_at DESC LIMIT 1)
ORDER BY created_at ASC
LIMIT 20;
```

## 4. Public Image Search Rate Limit

Dung mot anh san pham that:

```powershell
$img = "C:\path\to\real-product.jpg"
1..7 | ForEach-Object {
  curl.exe -s -o NUL -w "%{http_code}`n" `
    -F "file=@$img;type=image/jpeg" `
    "http://localhost:8080/api/public/marketplace/search/image?limit=5"
}
```

Expected:

- Trong default window, request thu 7 tra `429`.
- Neu vision-engine dang tat, cac request dau co the tra loi loi service, nhung request vuot limit van phai la `429`.
- Frontend hien thong bao than thien thay vi loi ky thuat.

## 5. Product Image Upload

Qua vendor/admin UI hoac API upload hien co:

- File text doi ten `.jpg` phai bi reject `400`.
- JPEG/PNG/GIF hop le phai upload duoc.
- WebP co RIFF/WEBP signature hop le van duoc accept.
- Anh vuot `APP_UPLOAD_MAX_PRODUCT_IMAGE_PIXELS` phai bi reject.

## 6. Regression Commands

```powershell
backend\mvnw.cmd -f backend/pom.xml test
```

```powershell
$env:PYTHONDONTWRITEBYTECODE='1'
vision-engine\.venv\Scripts\python.exe -m unittest discover -s vision-engine/tests -p "test_*.py"
```

```powershell
npm.cmd run build --prefix frontend
```
