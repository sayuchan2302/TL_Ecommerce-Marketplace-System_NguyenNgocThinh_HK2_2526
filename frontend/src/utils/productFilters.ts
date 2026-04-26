import type { Product } from '../types';
import { resolveColorSwatch } from './colorSwatch';

export type ProductSortKey = 'newest' | 'bestseller' | 'price-asc' | 'price-desc' | 'discount';

export interface PriceRangeOption {
  id: string;
  label: string;
}

export interface ProductFilterState {
  priceRanges: string[];
  sizes: string[];
  colors: string[];
  genders: string[];
  fits: string[];
  materials: string[];
}

export interface ColorFacetOption {
  value: string;
  label: string;
  hex: string;
  count: number;
}

export interface ProductFilterFacets {
  sizes: string[];
  colors: ColorFacetOption[];
  genders: string[];
  fits: string[];
  materials: string[];
}

interface PriceRangeRule {
  min?: number;
  max?: number;
}

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const PRICE_RANGE_RULES: Record<string, PriceRangeRule> = {
  'under-200k': { max: 200000 },
  'from-200k-500k': { min: 200000, max: 500000 },
  'from-500k-1m': { min: 500000, max: 1000000 },
  'from-1m-2m': { min: 1000000, max: 2000000 },
  'over-2m': { min: 2000000 },
  // Legacy alias to preserve old URLs.
  'over-500k': { min: 500000 },
};

export const PRICE_RANGE_OPTIONS: PriceRangeOption[] = [
  { id: 'under-200k', label: 'Dưới 200.000đ' },
  { id: 'from-200k-500k', label: '200.000đ - 500.000đ' },
  { id: 'from-500k-1m', label: '500.000đ - 1.000.000đ' },
  { id: 'from-1m-2m', label: '1.000.000đ - 2.000.000đ' },
  { id: 'over-2m', label: 'Trên 2.000.000đ' },
];

const normalizeToken = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizeHex = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const prefixed = raw.startsWith('#') ? raw : `#${raw}`;
  if (!HEX_PATTERN.test(prefixed)) return '';

  if (prefixed.length === 4) {
    const [, r, g, b] = prefixed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return prefixed.toLowerCase();
};

const isMatchSet = (selected: string[], values: string[]) => {
  if (selected.length === 0) return true;
  const normalizedValues = new Set(values.map((value) => normalizeToken(value)));
  return selected.some((item) => normalizedValues.has(normalizeToken(item)));
};

const toColorFilterKey = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const lowered = raw.toLowerCase();
  if (lowered.startsWith('hex:') || lowered.startsWith('name:')) {
    return lowered;
  }
  const hex = normalizeHex(raw);
  if (hex) {
    return `hex:${hex}`;
  }
  return `name:${normalizeToken(raw)}`;
};

const collectProductColorKeys = (product: Product) => {
  const keys = new Set<string>();

  for (const color of product.colors || []) {
    const raw = String(color || '').trim();
    if (!raw) continue;
    const colorKey = toColorFilterKey(raw);
    if (colorKey) {
      keys.add(colorKey);
    }
  }

  for (const variant of product.variants || []) {
    const rawColor = String(variant.color || '').trim();
    const hex = normalizeHex(variant.colorHex || '');
    if (hex) {
      keys.add(`hex:${hex}`);
    }
    if (rawColor) {
      keys.add(`name:${normalizeToken(rawColor)}`);
      keys.add(`hex:${resolveColorSwatch(variant.colorHex || rawColor).toLowerCase()}`);
    }
  }

  return keys;
};

const collectProductSizes = (product: Product) => {
  const values = new Set<string>();
  for (const size of product.sizes || []) {
    const normalized = String(size || '').trim();
    if (normalized) {
      values.add(normalized);
    }
  }
  for (const variant of product.variants || []) {
    const normalized = String(variant.size || '').trim();
    if (normalized) {
      values.add(normalized);
    }
  }
  return Array.from(values);
};

const compareSize = (left: string, right: string) => (
  left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
);

export const getPriceRangeLabel = (id: string) => (
  PRICE_RANGE_OPTIONS.find((item) => item.id === id)?.label
  || (id === 'over-500k' ? 'Trên 500.000đ' : id)
);

export const isPriceInRange = (price: number, rangeId: string) => {
  const rule = PRICE_RANGE_RULES[rangeId];
  if (!rule) return false;
  if (typeof rule.min === 'number' && price < rule.min) return false;
  if (typeof rule.max === 'number' && price >= rule.max) return false;
  return true;
};

export const filterProducts = (source: Product[], filter: ProductFilterState) => {
  const selectedColorKeys = new Set(filter.colors.map((value) => toColorFilterKey(value)).filter(Boolean));

  return source.filter((product) => {
    if (filter.priceRanges.length > 0 && !filter.priceRanges.some((rangeId) => isPriceInRange(product.price, rangeId))) {
      return false;
    }

    if (filter.sizes.length > 0) {
      const productSizes = collectProductSizes(product);
      if (!isMatchSet(filter.sizes, productSizes)) {
        return false;
      }
    }

    if (selectedColorKeys.size > 0) {
      const productColorKeys = collectProductColorKeys(product);
      let matched = false;
      for (const colorKey of selectedColorKeys) {
        if (productColorKeys.has(colorKey)) {
          matched = true;
          break;
        }
      }
      if (!matched) {
        return false;
      }
    }

    if (filter.genders.length > 0) {
      if (!isMatchSet(filter.genders, [product.gender || ''])) {
        return false;
      }
    }

    if (filter.fits.length > 0) {
      if (!isMatchSet(filter.fits, [product.fit || ''])) {
        return false;
      }
    }

    if (filter.materials.length > 0) {
      if (!isMatchSet(filter.materials, [product.material || ''])) {
        return false;
      }
    }

    return true;
  });
};

export const sortProducts = (source: Product[], sortKey: ProductSortKey) => {
  const rows = [...source];
  switch (sortKey) {
    case 'price-asc':
      rows.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      rows.sort((a, b) => b.price - a.price);
      break;
    case 'discount':
      rows.sort((a, b) => {
        const discountA = a.originalPrice ? ((a.originalPrice - a.price) / a.originalPrice) * 100 : 0;
        const discountB = b.originalPrice ? ((b.originalPrice - b.price) / b.originalPrice) * 100 : 0;
        return discountB - discountA;
      });
      break;
    case 'newest':
    case 'bestseller':
    default:
      break;
  }
  return rows;
};

export const collectFilterFacets = (products: Product[]): ProductFilterFacets => {
  const sizeSet = new Set<string>();
  const genderMap = new Map<string, string>();
  const fitMap = new Map<string, string>();
  const materialMap = new Map<string, string>();
  const colorMap = new Map<string, ColorFacetOption>();

  for (const product of products) {
    for (const size of collectProductSizes(product)) {
      sizeSet.add(size);
    }

    const gender = String(product.gender || '').trim();
    if (gender) {
      genderMap.set(normalizeToken(gender), gender);
    }

    const fit = String(product.fit || '').trim();
    if (fit) {
      fitMap.set(normalizeToken(fit), fit);
    }

    const material = String(product.material || '').trim();
    if (material) {
      materialMap.set(normalizeToken(material), material);
    }

    for (const color of product.colors || []) {
      const label = String(color || '').trim();
      if (!label) continue;
      const hex = resolveColorSwatch(label).toLowerCase();
      const key = toColorFilterKey(label);
      if (!key) continue;
      const existing = colorMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        colorMap.set(key, {
          value: key,
          label,
          hex,
          count: 1,
        });
      }
    }

    for (const variant of product.variants || []) {
      const label = String(variant.color || '').trim();
      if (!label) continue;
      const swatch = resolveColorSwatch(variant.colorHex || label).toLowerCase();
      const key = variant.colorHex ? `hex:${normalizeHex(variant.colorHex) || swatch}` : `name:${normalizeToken(label)}`;
      if (!key) continue;
      const existing = colorMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        colorMap.set(key, {
          value: key,
          label,
          hex: swatch,
          count: 1,
        });
      }
    }
  }

  const orderedGenders = ['male', 'female', 'unisex'];
  const sortedGenders = Array.from(genderMap.values()).sort((left, right) => {
    const leftIdx = orderedGenders.indexOf(normalizeToken(left));
    const rightIdx = orderedGenders.indexOf(normalizeToken(right));
    if (leftIdx === -1 && rightIdx === -1) return left.localeCompare(right, undefined, { sensitivity: 'base' });
    if (leftIdx === -1) return 1;
    if (rightIdx === -1) return -1;
    return leftIdx - rightIdx;
  });

  return {
    sizes: Array.from(sizeSet).sort(compareSize),
    colors: Array.from(colorMap.values()).sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.label.localeCompare(right.label, undefined, { sensitivity: 'base' });
    }),
    genders: sortedGenders,
    fits: Array.from(fitMap.values()).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' })),
    materials: Array.from(materialMap.values()).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' })),
  };
};

export const formatGenderLabel = (gender: string) => {
  const normalized = normalizeToken(gender);
  if (normalized === 'male') return 'Nam';
  if (normalized === 'female') return 'Nữ';
  if (normalized === 'unisex') return 'Unisex';
  return gender;
};
