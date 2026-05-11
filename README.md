# Fashion Marketplace

Full-stack fashion marketplace with a Spring Boot backend, React frontend, PostgreSQL database, and optional OpenCLIP image search service.

## Stack

- Backend: Java 21, Spring Boot, Spring Security, Spring Data JPA, WebSocket
- Frontend: React 19, TypeScript, Vite, Tailwind CSS
- Database: PostgreSQL 16+
- Image search: FastAPI, OpenCLIP, pgvector

## Project Layout

```text
backend/        Spring Boot API
frontend/       React + Vite app
vision-engine/  OpenCLIP image search service
crawl/          Product crawler utilities
```

## Setup

Requirements:

- Java 21
- Node.js 20+
- PostgreSQL 16+

Install frontend dependencies:

```bash
npm ci --prefix frontend
```

Create the database:

```sql
CREATE DATABASE marketplace_db;
```

Copy env files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp vision-engine/.env.local.example vision-engine/.env
```

Stable backend config after initial setup:

```env
DB_URL=jdbc:postgresql://localhost:5432/marketplace_db
DB_USERNAME=postgres
DB_PASSWORD=your_password
JPA_DDL_AUTO=update
JWT_SECRET=your_long_random_secret

APP_SEED_ENABLED=false
APP_SEED_GAP_ENABLED=false
APP_SEED_GAP_CLEAN_BEFORE_IMPORT=false
APP_VISION_INTERNAL_SECRET=vision-local-test-secret
```

Frontend config:

```env
VITE_API_URL=http://localhost:8080
```

Vision config must use the same database and secret:

```env
VISION_DATABASE_URL=postgresql://postgres:your_password@localhost:5432/marketplace_db
VISION_INTERNAL_SECRET=vision-local-test-secret
MARKETPLACE_BASE_URL=http://localhost:8080
```

## First Seed And Image Sync

Do this once for local development.

1. Temporarily set in `backend/.env`:

```env
JPA_DDL_AUTO=create-drop
APP_SEED_ENABLED=true
APP_SEED_GAP_ENABLED=true
APP_SEED_GAP_CLEAN_BEFORE_IMPORT=true
```

2. Start backend and wait until seed + GAP import finish.
3. Start `vision-engine`.
4. Sync OpenCLIP catalog:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:8001/v1/admin/sync-catalog `
  -Method Post `
  -Headers @{ "X-Vision-Internal-Secret" = "vision-local-test-secret" }
```

5. Change `backend/.env` back to stable mode:

```env
JPA_DDL_AUTO=update
APP_SEED_ENABLED=false
APP_SEED_GAP_ENABLED=false
APP_SEED_GAP_CLEAN_BEFORE_IMPORT=false
```

After this, backend restarts keep product IDs stable. OpenCLIP only needs another sync when product/image data changes.

## Run

Backend:

```bash
backend\mvnw.cmd -f backend/pom.xml spring-boot:run
```

Frontend:

```bash
npm run dev --prefix frontend
```

Vision engine:

```powershell
./vision-engine/scripts/install-local.ps1
./vision-engine/scripts/run-local.ps1
```

## URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8080 |
| Swagger | http://localhost:8080/swagger-ui.html |
| Vision engine | http://localhost:8001 |

## Checks

```bash
npm run lint --prefix frontend
npm run build --prefix frontend
npm run smoke --prefix frontend
```

Backend compile:

```bash
backend\mvnw.cmd -f backend/pom.xml -DskipTests compile
```

Vision test:

```powershell
$env:PYTHONDONTWRITEBYTECODE='1'
vision-engine/.venv/Scripts/python.exe vision-engine/tests/test_catalog_sync.py
```

## Notes

- Do not keep `create-drop` enabled after OpenCLIP sync unless you want to reset products and sync again.
- If image search returns empty results after product changes, run the OpenCLIP sync command again.
- Image Vision smoke checklist: `docs/vision-hardening-smoke-test.md`.
- Full API docs are available in Swagger while backend is running.
