import { apiRequest } from './apiClient';
import type { Product } from '../types';

export interface MarketplaceStoreCard {
  id: string;
  storeCode: string;
  name: string;
  slug: string;
  logo?: string;
  rating: number;
  totalOrders: number;
  liveProductCount: number;
}

export interface MarketplaceHomeData {
  featuredStores: MarketplaceStoreCard[];
  featuredProducts: Product[];
  trendingProducts: Product[];
}

interface MarketplaceProductCardPayload {
  id: string;
  productCode: string;
  name: string;
  image?: string;
  price?: number;
  priceAmount?: string;
  originalPrice?: number;
  originalPriceAmount?: string;
  badge?: string;
  colors?: string[];
  stock?: number;
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  storeLogo?: string;
  officialStore?: boolean;
}

interface MarketplaceStoreCardPayload {
  id: string;
  storeCode?: string;
  name: string;
  slug: string;
  logo?: string;
  rating?: number;
  totalOrders?: number;
  liveProductCount?: number;
}

interface MarketplaceHomePayload {
  featuredStores?: MarketplaceStoreCardPayload[];
  featuredProducts?: MarketplaceProductCardPayload[];
  trendingProducts?: MarketplaceProductCardPayload[];
}

interface BackendPage<T> {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
}

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const mapProductCard = (row: MarketplaceProductCardPayload): Product => {
  const price = toNumber(row.priceAmount ?? row.price, 0);
  const originalPrice = toNumber(row.originalPriceAmount ?? row.originalPrice, 0);
  const resolvedOriginalPrice = originalPrice > price ? originalPrice : undefined;

  return {
    id: row.id || row.productCode,
    sku: row.productCode || row.id,
    name: row.name || 'Sản phẩm',
    category: 'Marketplace',
    price,
    originalPrice: resolvedOriginalPrice,
    image: row.image || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=672&h=990&fit=crop',
    badge: row.badge,
    colors: row.colors || [],
    stock: Number.isFinite(row.stock) ? Number(row.stock) : 0,
    status: 'ACTIVE',
    statusType: Number(row.stock || 0) <= 0 ? 'out' : Number(row.stock || 0) < 10 ? 'low' : 'active',
    storeId: row.storeId,
    storeName: row.storeName,
    storeSlug: row.storeSlug,
    storeLogo: row.storeLogo,
    isOfficialStore: Boolean(row.officialStore),
    backendId: row.id,
  };
};

const mapStoreCard = (row: MarketplaceStoreCardPayload): MarketplaceStoreCard => ({
  id: row.id,
  storeCode: row.storeCode || `SHOP-${row.id.slice(0, 8).toUpperCase()}`,
  name: row.name,
  slug: row.slug,
  logo: row.logo,
  rating: toNumber(row.rating, 0),
  totalOrders: Math.max(0, Math.round(toNumber(row.totalOrders, 0))),
  liveProductCount: Math.max(0, Math.round(toNumber(row.liveProductCount, 0))),
});

export const marketplaceService = {
  async getHomeData(): Promise<MarketplaceHomeData> {
    const payload = await apiRequest<MarketplaceHomePayload>('/api/public/marketplace/home');
    return {
      featuredStores: (payload.featuredStores || []).map(mapStoreCard),
      featuredProducts: (payload.featuredProducts || []).map(mapProductCard),
      trendingProducts: (payload.trendingProducts || []).map(mapProductCard),
    };
  },

  async searchProducts(query: string, page = 0, size = 20) {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('page', String(Math.max(page, 0)));
    params.set('size', String(Math.max(size, 1)));

    const payload = await apiRequest<BackendPage<MarketplaceProductCardPayload>>(
      `/api/public/marketplace/search/products?${params.toString()}`,
    );

    const rows = (payload.content || []).map(mapProductCard);
    return {
      items: rows,
      total: Number(payload.totalElements || rows.length),
      page: Number(payload.number || 0),
      size: Number(payload.size || size),
      totalPages: Number(payload.totalPages || 1),
    };
  },

  async searchStores(query: string, page = 0, size = 20) {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('page', String(Math.max(page, 0)));
    params.set('size', String(Math.max(size, 1)));

    const payload = await apiRequest<BackendPage<MarketplaceStoreCardPayload>>(
      `/api/public/marketplace/search/stores?${params.toString()}`,
    );

    const rows = (payload.content || []).map(mapStoreCard);
    return {
      items: rows,
      total: Number(payload.totalElements || rows.length),
      page: Number(payload.number || 0),
      size: Number(payload.size || size),
      totalPages: Number(payload.totalPages || 1),
    };
  },
};
