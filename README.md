# 🛍️ Fashion Marketplace

> Full-stack fashion marketplace built with **Spring Boot**, **React**, **PostgreSQL**, and an optional **OpenCLIP image search engine**.

This project is prepared for a student thesis/demo flow and can be deployed as three services: backend API, frontend web app, and vision-engine.

---

## ✨ Highlights

- 🛒 Marketplace flow: browse products, cart, checkout, orders, reviews, stores, vouchers, flash sale.
- 🔐 Role-based system: customer, vendor, admin.
- 🖼️ Image search with OpenCLIP + pgvector.
- 🧠 Admin Image Vision dashboard with async catalog sync, sync history, health state, and metrics.
- 🛡️ Safer image uploads with file signature and image size validation.
- 🚦 Public image-search rate limit to reduce abuse.
- 💳 VNPay and MoMo sandbox-ready payment configuration.
- 🤖 Optional chatbot integration.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 3.2, Spring Security, Spring Data JPA, WebSocket |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Database | PostgreSQL 16+ |
| Image Search | FastAPI, OpenCLIP, pgvector |
| Docs/API | Swagger UI, Springdoc OpenAPI |

---

## 📁 Project Structure

```text
backend/        Spring Boot API and business logic
frontend/       React + Vite web client
vision-engine/  FastAPI OpenCLIP image-search service
crawl/          Product crawler utilities
docs/           Smoke-test and project notes
```

---

## ✅ Requirements

- Java 21
- Node.js 20+
- PostgreSQL 16+ with pgvector extension available
- Python 3.11+ for `vision-engine`
- Optional: Docker, if running the vision service by compose

---

## ⚙️ Environment Setup

Copy example env files:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
Copy-Item vision-engine/.env.local.example vision-engine/.env
```

Create local database:

```sql
CREATE DATABASE marketplace_db;
```

### 🔑 Backend `.env`

Keep these values stable after the first seed:

```env
DB_URL=jdbc:postgresql://localhost:5432/marketplace_db
DB_USERNAME=postgres
DB_PASSWORD=your_password
JPA_DDL_AUTO=update
JWT_SECRET=change_me_to_a_long_random_string_at_least_32_chars

APP_SEED_ENABLED=false
APP_SEED_GAP_ENABLED=false
APP_SEED_GAP_CLEAN_BEFORE_IMPORT=false

APP_VISION_ENABLED=true
APP_VISION_BASE_URL=http://localhost:8001
APP_VISION_INTERNAL_SECRET=vision-local-test-secret
APP_VISION_RATE_LIMIT_ENABLED=true
```

> ⚠️ Do not keep `JPA_DDL_AUTO=create-drop` after initial seeding, or product IDs and synced image embeddings will be reset.

### 🌐 Frontend `.env`

```env
VITE_API_URL=http://localhost:8080
```

### 🖼️ Vision Engine `.env`

```env
MARKETPLACE_BASE_URL=http://localhost:8080
VISION_DATABASE_URL=postgresql://postgres:your_password@localhost:5432/marketplace_db
VISION_INTERNAL_SECRET=vision-local-test-secret
```

> 🔐 `APP_VISION_INTERNAL_SECRET` and `VISION_INTERNAL_SECRET` must match.

---

## 🚀 Local Development

Install frontend dependencies:

```powershell
npm.cmd ci --prefix frontend
```

Install vision-engine dependencies once:

```powershell
.\vision-engine\scripts\install-local.ps1
```

Run backend:

```powershell
backend\mvnw.cmd -f backend/pom.xml spring-boot:run
```

Run frontend:

```powershell
npm.cmd run dev --prefix frontend
```

Run vision-engine:

```powershell
.\vision-engine\scripts\run-local.ps1
```

---

## 🌱 First Seed + Image Sync

Use this once for local demo data.

1. Temporarily set in `backend/.env`:

```env
JPA_DDL_AUTO=create-drop
APP_SEED_ENABLED=true
APP_SEED_GAP_ENABLED=true
APP_SEED_GAP_CLEAN_BEFORE_IMPORT=true
```

2. Start backend and wait until seeding finishes.
3. Start `vision-engine`.
4. Sync OpenCLIP catalog:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:8001/v1/admin/sync-catalog `
  -Method Post `
  -Headers @{ "X-Vision-Internal-Secret" = "vision-local-test-secret" }
```

5. Return backend to stable mode:

```env
JPA_DDL_AUTO=update
APP_SEED_ENABLED=false
APP_SEED_GAP_ENABLED=false
APP_SEED_GAP_CLEAN_BEFORE_IMPORT=false
```

After this, only sync again when product or image data changes.

---

## 🧪 Verification

Backend tests:

```powershell
backend\mvnw.cmd -f backend/pom.xml test
```

Frontend build:

```powershell
npm.cmd run build --prefix frontend
```

Vision-engine tests:

```powershell
$env:PYTHONDONTWRITEBYTECODE='1'
vision-engine\.venv\Scripts\python.exe -m unittest discover -s vision-engine/tests -p "test_*.py"
```

Frontend smoke regression:

```powershell
npm.cmd run smoke --prefix frontend
```

---

## 🏭 Production Deployment Checklist

### 1. Prepare

- ✅ Run backend tests, frontend build, and vision-engine tests.
- ✅ Set strong secrets for `JWT_SECRET`, `APP_VISION_INTERNAL_SECRET`, and `VISION_INTERNAL_SECRET`.
- ✅ Keep `APP_SEED_ENABLED=false` and `APP_SEED_GAP_ENABLED=false`.
- ✅ Keep `JPA_DDL_AUTO=update` for this solo/student deployment flow.
- ✅ Configure payment return URLs for the real deployed frontend domain.
- ✅ Point `VITE_API_URL` to the deployed backend URL.
- ✅ Use persistent storage for `APP_UPLOAD_BASE_DIR`.

### 2. Build

Backend package:

```powershell
backend\mvnw.cmd -f backend/pom.xml clean package
```

Run packaged backend:

```powershell
java -jar backend\target\marketplace-1.0.0.jar
```

Frontend production build:

```powershell
npm.cmd run build --prefix frontend
```

Deploy the generated static files from:

```text
frontend/dist/
```

Vision-engine Docker option:

```powershell
docker compose -f docker-compose.vision.yml up -d --build
```

### 3. Deploy Services

Recommended service order:

1. PostgreSQL database
2. Backend API
3. Vision-engine
4. Frontend static site
5. Admin image catalog sync

### 4. Smoke Test

Replace `localhost` with real deployed domains when testing production.

- Backend health: `http://localhost:8080/actuator/health`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- Vision health: `http://localhost:8001/health`
- Vision readiness: `http://localhost:8001/ready`
- Frontend: `http://localhost:5173`
- Admin Image Vision checklist: `docs/vision-hardening-smoke-test.md`

### 5. Rollback Notes

- Keep a database backup before production deployment.
- Keep previous backend jar or container image.
- If image search fails, disable it temporarily with `APP_VISION_ENABLED=false`; marketplace browsing still works.
- If seeded data is already synced, never switch production back to `create-drop`.

---

## 🔗 Useful URLs

| Service | Local URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| Backend Health | http://localhost:8080/actuator/health |
| Vision Engine | http://localhost:8001 |
| Vision Health | http://localhost:8001/health |

---

## 📌 Project Notes

- Image search requires `vision-engine`, OpenCLIP model files, and pgvector-backed embeddings.
- Public image search is rate-limited by user ID or IP address.
- Product image upload rejects fake image files and oversized images.
- Admin catalog sync is async and persists history in PostgreSQL.
- Full API details are available in Swagger while backend is running.

---

## 🎓 Thesis Demo Flow

1. Login as admin and verify dashboard.
2. Run Image Vision catalog sync.
3. Search products by uploaded image.
4. Browse product details and add to cart.
5. Checkout with sandbox payment configuration.
6. Show vendor/admin management screens and sync history.
