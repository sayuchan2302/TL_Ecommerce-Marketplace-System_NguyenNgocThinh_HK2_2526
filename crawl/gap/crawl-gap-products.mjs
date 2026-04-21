#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULTS = {
  categoriesPath: path.join(__dirname, 'default-categories.json'),
  outputDir: path.resolve(__dirname, '..', '..', 'backend', 'src', 'main', 'resources', 'seeder', 'gap'),
  targetCount: 1000,
  maxPerCategory: 120,
  delayMs: 1200,
  timeoutMs: 45_000,
  headless: true,
  maxStableRounds: 5,
};
const MAX_IMAGES_PER_PRODUCT = 4;

const HELP_TEXT = `
Gap product crawler (safe-mode) -> exports GAP importer-compatible CSV

Usage:
  node crawl/gap/crawl-gap-products.mjs [options]

Options:
  --target-count <n>       Total products to collect (default: 1000)
  --max-per-category <n>   Max product links collected per category URL (default: 120)
  --delay-ms <n>           Delay between requests in ms (default: 1200)
  --timeout-ms <n>         Navigation timeout in ms (default: 45000)
  --categories <path>      Path to category config JSON
  --output-dir <path>      Directory for output files (default: backend/src/main/resources/seeder/gap)
  --headless <true|false>  Run browser headless (default: true)
  --help                   Show this help

Outputs:
  <output-dir>/styles.csv
  <output-dir>/images.csv
  <output-dir>/products.raw.json
`;

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const [key, valueFromEq] = token.slice(2).split('=');
    if (valueFromEq !== undefined) {
      args[key] = valueFromEq;
      continue;
    }
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function parseBoolean(raw, fallback) {
  if (raw === undefined) return fallback;
  const normalized = String(raw).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return fallback;
}

function parseNumber(raw, fallback) {
  if (raw === undefined) return fallback;
  const value = Number.parseInt(String(raw), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function toAbsoluteUrl(input) {
  if (!input) return '';
  try {
    return new URL(input, 'https://www.gap.com').toString();
  } catch {
    return '';
  }
}

function extractPidFromUrl(productUrl) {
  try {
    const parsed = new URL(productUrl);
    const pid = parsed.searchParams.get('pid');
    if (pid && /^\d+$/.test(pid)) return pid;
  } catch {
    return '';
  }
  const match = String(productUrl).match(/[?&]pid=(\d+)/i);
  return match ? match[1] : '';
}

function normalizeSpace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeCase(value) {
  const normalized = normalizeSpace(value);
  return normalized ? normalized[0].toUpperCase() + normalized.slice(1) : '';
}

function parseDollarValues(text) {
  const matches = String(text || '').match(/\$\s*\d[\d,]*(?:\.\d{2})?/g) || [];
  return matches
    .map((item) => Number.parseFloat(item.replace(/[^0-9.]/g, '')))
    .filter((num) => Number.isFinite(num) && num > 0);
}

function slugContainsAny(value, needles) {
  const haystack = String(value || '').toLowerCase();
  return needles.some((needle) => haystack.includes(needle));
}

function inferMasterCategory(seed, breadcrumbs, productName) {
  if (seed.masterCategory) return seed.masterCategory;
  const joined = `${breadcrumbs.join(' ')} ${productName}`.toLowerCase();
  return slugContainsAny(joined, ['accessor', 'hat', 'belt', 'bag', 'wallet', 'sunglass', 'jewelry'])
    ? 'Accessories'
    : 'Apparel';
}

function inferSubCategory(seed, breadcrumbs, productName, masterCategory) {
  if (seed.subCategory) return seed.subCategory;
  const leaf = normalizeCase(breadcrumbs[breadcrumbs.length - 1] || '');
  if (leaf) {
    if (masterCategory === 'Accessories') return 'Fashion Accessories';
    if (slugContainsAny(leaf, ['jean', 'pant', 'short', 'skirt'])) return 'Bottomwear';
    if (slugContainsAny(leaf, ['dress'])) return 'Dress';
    return 'Topwear';
  }

  const name = productName.toLowerCase();
  if (slugContainsAny(name, ['jean', 'pant', 'short', 'skirt'])) return 'Bottomwear';
  if (slugContainsAny(name, ['dress'])) return 'Dress';
  if (masterCategory === 'Accessories') return 'Fashion Accessories';
  return 'Topwear';
}

function inferArticleType(seed, productName, subCategory, masterCategory) {
  if (seed.articleType) return seed.articleType;
  const name = productName.toLowerCase();
  if (slugContainsAny(name, ['jean'])) return 'Jeans';
  if (slugContainsAny(name, ['shirt', 'blouse'])) return 'Shirts';
  if (slugContainsAny(name, ['tee', 't-shirt'])) return 'Tshirts';
  if (slugContainsAny(name, ['sweater'])) return 'Sweaters';
  if (slugContainsAny(name, ['hoodie', 'sweatshirt'])) return 'Sweatshirts';
  if (slugContainsAny(name, ['jacket', 'coat'])) return 'Jackets';
  if (slugContainsAny(name, ['dress'])) return 'Dresses';
  if (slugContainsAny(name, ['short'])) return 'Shorts';
  if (slugContainsAny(name, ['pant', 'trouser'])) return 'Trousers';
  if (masterCategory === 'Accessories') return 'Accessories';
  if (subCategory === 'Bottomwear') return 'Trousers';
  if (subCategory === 'Dress') return 'Dresses';
  return 'Topwear';
}

function inferUsage(seed, breadcrumbs, productName) {
  if (seed.usage) return seed.usage;
  const joined = `${breadcrumbs.join(' ')} ${productName}`.toLowerCase();
  if (slugContainsAny(joined, ['active', 'sport', 'athletic', 'performance', 'workout'])) {
    return 'Sports';
  }
  if (slugContainsAny(joined, ['formal', 'suit', 'office'])) {
    return 'Formal';
  }
  return 'Casual';
}

function csvEscape(value) {
  const raw = String(value ?? '');
  if (!/[",\n\r]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

function serializeCsv(headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readCategoryConfig(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`Category config is empty: ${filePath}`);
  }
  return parsed
    .map((item) => ({
      url: toAbsoluteUrl(item.url),
      gender: normalizeCase(item.gender),
      masterCategory: normalizeCase(item.masterCategory),
      subCategory: normalizeCase(item.subCategory),
      articleType: normalizeCase(item.articleType),
      usage: normalizeCase(item.usage),
    }))
    .filter((item) => item.url);
}

async function tryDismissCookieBanner(page) {
  const candidates = [
    'button:has-text("Close")',
    'button[aria-label="Close"]',
    'button:has-text("Accept All")',
    'button:has-text("Accept all")',
  ];
  for (const selector of candidates) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 700 })) {
        await element.click({ timeout: 1500 });
        await page.waitForTimeout(300);
        return;
      }
    } catch {
      // no-op
    }
  }
}

async function collectProductLinksFromCategory(page, category, options) {
  const links = new Set();
  const maxWanted = options.maxPerCategory;
  let stableRounds = 0;

  await page.goto(category.url, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs });
  await tryDismissCookieBanner(page);
  await page.waitForTimeout(700);

  for (let round = 0; round < 50; round += 1) {
    const roundLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('[data-testid="plp_product-info"]'));
      const hrefs = anchors
        .map((anchor) => anchor.getAttribute('href') || '')
        .map((href) => {
          try {
            return new URL(href, location.origin).toString();
          } catch {
            return '';
          }
        })
        .filter((href) => /\/browse\/product\.do\?pid=\d+/i.test(href));
      return Array.from(new Set(hrefs));
    });

    const before = links.size;
    for (const href of roundLinks) {
      if (links.size >= maxWanted) break;
      links.add(href);
    }

    if (links.size >= maxWanted) break;

    if (links.size === before) {
      stableRounds += 1;
    } else {
      stableRounds = 0;
    }
    if (stableRounds >= options.maxStableRounds) break;

    let advanced = false;
    const loadMoreButtons = [
      'button:has-text("View More")',
      'button:has-text("Show More")',
      'button[aria-label*="Show more"]',
      'button[aria-label*="View more"]',
    ];
    for (const selector of loadMoreButtons) {
      const element = page.locator(selector).first();
      try {
        if (await element.isVisible({ timeout: 500 })) {
          await element.click({ timeout: 1200 });
          advanced = true;
          break;
        }
      } catch {
        // ignore and continue
      }
    }

    if (!advanced) {
      await page.mouse.wheel(0, 2500);
    }
    await page.waitForTimeout(options.delayMs);
  }

  return Array.from(links).slice(0, maxWanted);
}

async function scrapeProductPage(page, productUrl, seedCategory, options) {
  await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs });
  await tryDismissCookieBanner(page);
  await page.waitForTimeout(options.delayMs);

  const snapshot = await page.evaluate(() => {
    const absolute = (input) => {
      if (!input) return '';
      try {
        return new URL(input, location.origin).toString();
      } catch {
        return '';
      }
    };
    const title =
      document.querySelector('[data-testid="product-title"]')?.textContent?.trim()
      || document.querySelector('h1')?.textContent?.trim()
      || '';

    const breadcrumb = Array.from(
      document.querySelectorAll('nav[aria-label="breadcrumb"] a'),
    ).map((item) => item.textContent?.trim() || '').filter(Boolean);

    const priceBlock =
      document.querySelector('[data-testid="pdp-title-price-wrapper"]')?.textContent
      || '';

    const colorValue =
      document.querySelector('[data-testid="pdp-color-value"]')?.textContent?.trim()
      || '';

    const colorOptions = Array.from(
      document.querySelectorAll('[data-testid="pdp-color-swatch-instock"], [data-testid="pdp-color-swatch-outofstock"]'),
    ).map((input) => ({
      label: input.getAttribute('aria-label') || '',
      checked: input.checked,
      disabled: input.disabled,
    }));

    const sizes = Array.from(
      document.querySelectorAll('[data-testid="pdp-dimension-instock"], [data-testid="pdp-dimension-outofstock"]'),
    ).map((input) => {
      const id = input.id || '';
      const parts = id.split('_');
      const sizeLabel = parts.length > 0 ? parts[parts.length - 1] : '';
      return {
        label: sizeLabel,
        inStock: !input.disabled && input.getAttribute('data-testid') === 'pdp-dimension-instock',
      };
    }).filter((item) => item.label);

    const images = Array.from(
      document.querySelectorAll('[data-testid="pdp-photo-brick-image"] img'),
    )
      .map((img) => absolute(img.getAttribute('src') || img.getAttribute('data-src') || img.currentSrc || ''))
      .filter(Boolean);

    const detailsText =
      document.querySelector('[data-testid="pdp-product-info-container"]')?.textContent?.trim()
      || '';

    return {
      title,
      breadcrumb,
      priceBlock,
      colorValue,
      colorOptions,
      sizes,
      images: Array.from(new Set(images)),
      detailsText,
      currentUrl: location.href,
    };
  });

  const pid = extractPidFromUrl(snapshot.currentUrl || productUrl);
  if (!pid) {
    return null;
  }

  const allPrices = parseDollarValues(snapshot.priceBlock);
  const originalPrice = allPrices[0] || 0;
  const salePrice = allPrices[1] || originalPrice;
  const selectedColor = normalizeCase(
    snapshot.colorValue
    || snapshot.colorOptions.find((option) => option.checked)?.label
    || snapshot.colorOptions[0]?.label
    || '',
  );

  const productName = normalizeSpace(snapshot.title);
  if (!productName) {
    return null;
  }

  const masterCategory = inferMasterCategory(seedCategory, snapshot.breadcrumb, productName);
  const subCategory = inferSubCategory(seedCategory, snapshot.breadcrumb, productName, masterCategory);
  const articleType = inferArticleType(seedCategory, productName, subCategory, masterCategory);
  const usage = inferUsage(seedCategory, snapshot.breadcrumb, productName);
  const gender = seedCategory.gender || normalizeCase(snapshot.breadcrumb[0] || 'Unisex') || 'Unisex';
  const year = new Date().getFullYear();

  return {
    id: pid,
    sourceUrl: snapshot.currentUrl || productUrl,
    sourceCategoryUrl: seedCategory.url,
    gender,
    masterCategory,
    subCategory,
    articleType,
    baseColour: selectedColor || 'Unknown',
    season: 'All',
    year,
    usage,
    productDisplayName: productName,
    basePrice: originalPrice,
    salePrice,
    breadcrumb: snapshot.breadcrumb,
    sizes: snapshot.sizes,
    images: snapshot.images,
    detailsText: normalizeSpace(snapshot.detailsText),
  };
}

function buildStylesRows(products) {
  return products.map((item) => ({
    id: item.id,
    gender: item.gender,
    masterCategory: item.masterCategory,
    subCategory: item.subCategory,
    articleType: item.articleType,
    baseColour: item.baseColour,
    season: item.season,
    year: item.year,
    usage: item.usage,
    productDisplayName: item.productDisplayName,
  }));
}

function buildImagesRows(products) {
  return products.flatMap((item) => {
    const uniqueImages = Array.from(
      new Set((item.images || []).map((link) => normalizeSpace(link)).filter(Boolean)),
    ).slice(0, MAX_IMAGES_PER_PRODUCT);
    return uniqueImages.map((link, idx) => ({
      id: item.id,
      filename: `${item.id}.jpg`,
      sortOrder: idx,
      link,
    }));
  });
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help === 'true' || args.h === 'true') {
    process.stdout.write(HELP_TEXT);
    return;
  }

  const options = {
    categoriesPath: path.resolve(args.categories || DEFAULTS.categoriesPath),
    outputDir: path.resolve(args['output-dir'] || DEFAULTS.outputDir),
    targetCount: parseNumber(args['target-count'], DEFAULTS.targetCount),
    maxPerCategory: parseNumber(args['max-per-category'], DEFAULTS.maxPerCategory),
    delayMs: parseNumber(args['delay-ms'], DEFAULTS.delayMs),
    timeoutMs: parseNumber(args['timeout-ms'], DEFAULTS.timeoutMs),
    headless: parseBoolean(args.headless, DEFAULTS.headless),
    maxStableRounds: DEFAULTS.maxStableRounds,
  };

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    process.stderr.write(
      'Missing dependency: playwright\n'
      + 'Install with: npm install --save-dev playwright\n'
      + 'Then install browser: npx playwright install chromium\n',
    );
    process.exitCode = 1;
    return;
  }

  const categories = await readCategoryConfig(options.categoriesPath);
  await ensureDir(options.outputDir);

  const browser = await chromium.launch({ headless: options.headless });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GapCrawlerStudentProject/1.0',
  });
  const page = await context.newPage();

  try {
    const allProductLinks = [];
    for (let i = 0; i < categories.length; i += 1) {
      const category = categories[i];
      const needed = Math.max(0, options.targetCount - allProductLinks.length);
      if (needed <= 0) break;

      const perCategoryLimit = Math.min(options.maxPerCategory, needed);
      process.stdout.write(
        `[${i + 1}/${categories.length}] Collect links: ${category.url} (limit=${perCategoryLimit})\n`,
      );

      const links = await collectProductLinksFromCategory(page, category, {
        ...options,
        maxPerCategory: perCategoryLimit,
      });

      for (const link of links) {
        if (allProductLinks.length >= options.targetCount) break;
        allProductLinks.push({ url: link, seedCategory: category });
      }
      process.stdout.write(`  -> links collected: ${links.length}, total queued: ${allProductLinks.length}\n`);
    }

    const dedupedByPid = new Map();
    for (const item of allProductLinks) {
      const pid = extractPidFromUrl(item.url);
      if (!pid || dedupedByPid.has(pid)) continue;
      dedupedByPid.set(pid, item);
      if (dedupedByPid.size >= options.targetCount) break;
    }
    const queue = Array.from(dedupedByPid.values()).slice(0, options.targetCount);

    process.stdout.write(`Queued unique products: ${queue.length}\n`);

    const products = [];
    for (let i = 0; i < queue.length; i += 1) {
      const item = queue[i];
      process.stdout.write(`Scraping ${i + 1}/${queue.length}: ${item.url}\n`);
      try {
        const product = await scrapeProductPage(page, item.url, item.seedCategory, options);
        if (!product) {
          process.stdout.write('  -> skipped (missing key fields)\n');
          continue;
        }
        products.push(product);
      } catch (error) {
        process.stdout.write(`  -> failed: ${error instanceof Error ? error.message : String(error)}\n`);
      }
    }

    const stylesRows = buildStylesRows(products);
    const imagesRows = buildImagesRows(products);
    const stylesCsv = serializeCsv(
      [
        'id',
        'gender',
        'masterCategory',
        'subCategory',
        'articleType',
        'baseColour',
        'season',
        'year',
        'usage',
        'productDisplayName',
      ],
      stylesRows,
    );
    const imagesCsv = serializeCsv(
      ['id', 'filename', 'sortOrder', 'link'],
      imagesRows,
    );

    const stylesPath = path.join(options.outputDir, 'styles.csv');
    const imagesPath = path.join(options.outputDir, 'images.csv');
    const rawPath = path.join(options.outputDir, 'products.raw.json');

    await fs.writeFile(stylesPath, stylesCsv, 'utf8');
    await fs.writeFile(imagesPath, imagesCsv, 'utf8');
    await fs.writeFile(rawPath, JSON.stringify(products, null, 2), 'utf8');

    process.stdout.write('\nDone.\n');
    process.stdout.write(`  styles.csv rows: ${stylesRows.length}\n`);
    process.stdout.write(`  images.csv rows: ${imagesRows.length}\n`);
    process.stdout.write(`  output dir: ${options.outputDir}\n`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
