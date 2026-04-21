# GAP Crawl Script (Student / Internal Demo)

Script: `crawl/gap/crawl-gap-products.mjs`

Muc tieu:
- Crawl du lieu product public tu `gap.com`
- Export ra format CSV tuong thich voi importer hien tai:
  - `styles.csv`
  - `images.csv`

Luu y:
- Chi dung cho hoc tap noi bo.
- Khong bypass captcha / anti-bot / login.
- Crawl cham (co delay) de giam tai.

## 1) Cai dependency

```bash
npm install --save-dev playwright
npx playwright install chromium
```

## 2) Chay crawl

```bash
node crawl/gap/crawl-gap-products.mjs --target-count 1000 --headless true
```

## 3) Output

Mac dinh output:
- `backend/src/main/resources/seeder/gap/styles.csv`
- `backend/src/main/resources/seeder/gap/images.csv`
- `backend/src/main/resources/seeder/gap/products.raw.json`

Ban co the doi output:

```bash
node crawl/gap/crawl-gap-products.mjs --output-dir backend/src/main/resources/seeder/gap
```

## 4) Tuy chon

```bash
node crawl/gap/crawl-gap-products.mjs \
  --target-count 300 \
  --max-per-category 60 \
  --delay-ms 1500 \
  --timeout-ms 60000 \
  --categories crawl/gap/default-categories.json
```

## 5) Mapping du lieu

`styles.csv`:
- `id`: lay tu query param `pid` cua URL product
- `gender`, `masterCategory`, `subCategory`, `articleType`, `usage`: tu config category + suy luan tu breadcrumb/name
- `baseColour`: mau dang duoc chon tren PDP
- `season`: mac dinh `All`
- `year`: nam hien tai
- `productDisplayName`: title PDP

`images.csv`:
- `id`: product id (`pid`)
- `filename`: `${id}.jpg` (giu format importer cu)
- `sortOrder`: thu tu anh (0..3)
- `link`: URL anh trong gallery PDP
- toi da `4` anh / product

## 6) Import vao backend

Cap nhat `application.yml`:
- `app.seed.gap.styles-path`
- `app.seed.gap.images-path`

Vi du:
- `app.seed.gap.styles-path: backend/src/main/resources/seeder/gap/styles.csv`
- `app.seed.gap.images-path: backend/src/main/resources/seeder/gap/images.csv`
