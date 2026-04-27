# GAP Product Crawler

Safe-mode crawler for public `gap.com` product data, designed to generate CSV files compatible with the backend GAP importer.

## Overview

Script: `crawl/crawl-gap-products.mjs`

This crawler:
- Collects product links from configured GAP category URLs.
- Scrapes product details, variants, and gallery images from PDP pages.
- Exports importer-ready files:
  - `styles.csv`
  - `images.csv`
  - `products.raw.json`

## Scope and Compliance

- Intended for internal/demo/educational use.
- Crawls only public pages (no login flow).
- Does not attempt to bypass anti-bot or captcha protections.
- Uses throttling (`--delay-ms`) to reduce request pressure.

## Requirements

- Node.js 18+ (recommended).
- Playwright Chromium runtime.

Install dependencies:

```bash
npm install --save-dev playwright
npx playwright install chromium
```

## Quick Start

Run with project defaults:

```bash
node crawl/crawl-gap-products.mjs
```

Run with explicit production-like settings:

```bash
node crawl/crawl-gap-products.mjs \
  --target-count 1000 \
  --max-colors 4 \
  --max-sizes 6 \
  --max-per-category 120 \
  --output-dir backend/src/main/resources/product
```

## CLI Options

| Option | Description | Default |
|---|---|---|
| `--target-count <n>` | Total unique products to collect | `1000` |
| `--max-colors <n>` | Max colors captured per product (capped at 4) | `4` |
| `--max-sizes <n>` | Max sizes captured per product (capped at 6) | `6` |
| `--max-per-category <n>` | Max product links collected from each category URL | `120` |
| `--delay-ms <n>` | Delay between crawling actions (ms) | `1200` |
| `--timeout-ms <n>` | Navigation timeout (ms) | `45000` |
| `--categories <path>` | Path to category config JSON | `crawl/default-categories.json` |
| `--output-dir <path>` | Output directory for generated files | `backend/src/main/resources/product` |
| `--headless <true\|false>` | Run browser in headless mode | `true` |
| `--help` | Show command help | - |

## Output Files

Default output directory:

`backend/src/main/resources/product`

Generated files:
- `styles.csv`
- `images.csv`
- `products.raw.json`

### `styles.csv` fields

- `id`: Product ID (`pid` query parameter from GAP URL).
- `gender`, `masterCategory`, `subCategory`, `articleType`, `usage`: from category seed config, with fallback inference.
- `baseColour`: selected product color on PDP.
- `colorOptions`: distinct color labels (pipe-separated).
- `colorHexOptions`: `ColorName=#hex` pairs (pipe-separated).
- `sizeOptions`: normalized size list (pipe-separated).
- `season`: fixed value `All`.
- `year`: current year.
- `productDisplayName`: PDP title.
- `productDetails`, `sizeFitDetails`, `fabricDetails`, `careDetails`: normalized text extracted from PDP info sections.

### `images.csv` fields

- `id`: Product ID (`pid`).
- `filename`: `${id}.jpg` (legacy-compatible importer format).
- `sortOrder`: image index (`0..5`).
- `link`: absolute image URL.

## Category Configuration

Default config file: `crawl/default-categories.json`

Each entry supports:
- `url`
- `gender`
- `masterCategory`
- `subCategory`
- `articleType`
- `usage`

You can provide a custom config with `--categories <path>`.

## Backend Import Integration

The backend reads crawler outputs via environment properties:

- `APP_SEED_GAP_STYLES_PATH`
- `APP_SEED_GAP_IMAGES_PATH`

Example values:

```env
APP_SEED_GAP_STYLES_PATH=backend/src/main/resources/product/styles.csv
APP_SEED_GAP_IMAGES_PATH=backend/src/main/resources/product/images.csv
```

Then restart backend to run the GAP import flow.

## Troubleshooting

### `Missing dependency: playwright`

Install Playwright and Chromium:

```bash
npm install --save-dev playwright
npx playwright install chromium
```

### Empty or low output volume

- Increase `--max-per-category`.
- Increase `--target-count`.
- Adjust `--delay-ms` if navigation is unstable.
- Verify category URLs in `default-categories.json` are still valid.

### Slow crawl performance

- This is expected in safe mode.
- Keep throttling in place to avoid unstable scraping behavior.

## Notes

- GAP page structure can change over time; selector updates may be required.
- `products.raw.json` is the diagnostic source of truth for debugging extraction quality.
