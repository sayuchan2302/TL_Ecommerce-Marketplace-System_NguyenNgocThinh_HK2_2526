import type { Product, ProductVariant, ProductStatusType } from '../types';
import { listAdminProducts, type AdminProductRecord } from '../pages/Admin/adminProductService';

const colorHexMatch = (selected: string, productColor: string): boolean => {
  const normalize = (c: string) => c.toLowerCase().trim();
  return normalize(selected).includes(normalize(productColor)) || 
         normalize(productColor).includes(normalize(selected));
};

export interface ProductFilter {
  query?: string;
  priceRanges?: string[];
  sizes?: string[];
  colors?: string[];
  sortBy?: 'newest' | 'bestseller' | 'price-asc' | 'price-desc' | 'discount';
  categoryId?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 'men', name: 'Thời Trang Nam', slug: 'men' },
  { id: 'women', name: 'Thời Trang Nữ', slug: 'women' },
  { id: 'sale', name: 'Sản Phẩm Khuyến Mãi', slug: 'sale' },
  { id: 'new', name: 'Sản Phẩm Mới', slug: 'new' },
  { id: 'accessories', name: 'Phụ Kiện', slug: 'accessories' },
];

const mapStatusType = (statusType: string): ProductStatusType => {
  if (statusType === 'low') return 'low';
  if (statusType === 'out') return 'out';
  return 'active';
};

const mapAdminProductToClient = (record: AdminProductRecord, index: number): Product => {
  const variants: ProductVariant[] = record.variantMatrix.map((row) => ({
    id: row.id,
    size: row.size,
    color: row.color,
    sku: row.sku,
    price: Number(row.price) || record.price,
    stock: Number.parseInt((row.stock || '').replace(/\D/g, ''), 10) || 0,
  }));

  return {
    id: Number(record.sku.replace(/\D/g, '')) || index + 1,
    sku: record.sku,
    name: record.name,
    category: record.category,
    price: record.price,
    originalPrice: record.price,
    image: record.thumb,
    badge: record.statusType === 'low' ? 'LOW' : undefined,
    colors: Array.from(new Set(record.variantMatrix.map((v) => v.color))).map((color) => color),
    stock: record.stock,
    status: record.status,
    statusType: mapStatusType(record.statusType),
    variants,
  };
};

const listFromAdmin = (): Product[] => listAdminProducts().map(mapAdminProductToClient);

export const productService = {
  list(): Product[] {
    return listFromAdmin();
  },

  getById(id: number | string): Product | null {
    const products = this.list();
    return products.find((p) => p.sku === id || p.id === Number(id)) || null;
  },

  filter(filter: ProductFilter): Product[] {
    let results = [...this.list()];

    if (filter.query?.trim()) {
      const normalizedQuery = filter.query.toLowerCase().normalize('NFC').trim();
      const words = normalizedQuery.split(/\s+/).filter(w => w.length >= 2);
      
      if (words.length > 0) {
        results = results.filter(product => {
          const searchableText = [
            product.name,
            product.name.toLowerCase(),
            product.badge || '',
          ].join(' ').normalize('NFC');
          
          return words.every(word => searchableText.includes(word));
        });
      }
    }

    if (filter.categoryId !== undefined) {
      results = results.filter((p) => (p.category || '').toLowerCase().includes(filter.categoryId!.toLowerCase()));
    }

    if (filter.priceRanges?.length) {
      results = results.filter(product => {
        return filter.priceRanges!.some(range => {
          if (range === 'under-200k') return product.price < 200000;
          if (range === 'from-200k-500k') return product.price >= 200000 && product.price <= 500000;
          if (range === 'over-500k') return product.price > 500000;
          return false;
        });
      });
    }

    if (filter.colors?.length) {
      results = results.filter(product => {
        return product.colors && product.colors.length > 0 && 
          filter.colors!.some(selectedColor => {
            return product.colors!.some(productColor => 
              colorHexMatch(selectedColor, productColor)
            );
          });
      });
    }

    switch (filter.sortBy) {
      case 'bestseller':
        break;
      case 'price-asc':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'discount': {
        results.sort((a, b) => {
          const discountA = a.originalPrice ? ((a.originalPrice - a.price) / a.originalPrice) * 100 : 0;
          const discountB = b.originalPrice ? ((b.originalPrice - b.price) / b.originalPrice) * 100 : 0;
          return discountB - discountA;
        });
        break;
      }
      case 'newest':
      default:
        break;
    }

    return results;
  },

  getRelated(productId: number, limit = 4): Product[] {
    const products = this.list();
    return products.filter((p) => p.id !== productId).slice(0, limit);
  },

  getByCategory(categoryId: string): Product[] {
    return this.filter({ categoryId });
  },

  getOnSale(): Product[] {
    return this.list().filter(p => p.originalPrice !== undefined);
  },

  getNewArrivals(): Product[] {
    return this.list().filter(p => p.badge === 'NEW');
  },

  getCategoryName(categoryId: string): string {
    const category = PRODUCT_CATEGORIES.find((c) => c.id === categoryId || c.slug === categoryId);
    return category?.name || 'Tất Cả Sản Phẩm';
  },

  search(query: string, limit?: number): Product[] {
    if (!query.trim()) return [];
    const normalizedQuery = query.toLowerCase().normalize('NFC').trim();
    const words = normalizedQuery.split(/\s+/).filter(w => w.length >= 2);
    
    let results = this.list();
    
    if (words.length > 0) {
      results = results.filter(product => {
        const searchableText = [
          product.name,
          product.name.toLowerCase(),
          product.badge || '',
        ].join(' ').normalize('NFC');
        
        return words.every(word => searchableText.includes(word));
      });
    }
    
    if (limit !== undefined && limit > 0) {
      results = results.slice(0, limit);
    }
    
    return results;
  },

  getTotalCount(filter?: ProductFilter): number {
    return this.filter(filter || {}).length;
  },
};
