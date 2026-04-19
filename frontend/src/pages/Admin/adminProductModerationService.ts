import { apiRequest } from '../../services/apiClient';
import { getOptimizedImageUrl } from '../../utils/getOptimizedImageUrl';

export type ProductApprovalStatus = 'APPROVED' | 'BANNED';

export interface AdminModerationProduct {
  id: string;
  productCode: string;
  name: string;
  thumbnail: string;
  storeId?: string;
  storeName?: string;
  categoryId?: string;
  categoryName?: string;
  price: number;
  sales: number;
  stock: number;
  productStatus: string;
  approvalStatus: ProductApprovalStatus;
  description?: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ProductModerationFilters {
  page: number;
  size: number;
  sort?: string;
  storeId?: string;
  categoryId?: string;
  status?: ProductApprovalStatus | 'ALL';
  minPrice?: number;
  maxPrice?: number;
  searchKeyword?: string;
}

const toQueryString = (filters: ProductModerationFilters): string => {
  const params = new URLSearchParams();
  params.set('page', String(Math.max(0, filters.page)));
  params.set('size', String(Math.max(1, filters.size)));

  if (filters.sort) params.set('sort', filters.sort);
  if (filters.storeId) params.set('storeId', filters.storeId);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.status && filters.status !== 'ALL') params.set('status', filters.status);
  if (typeof filters.minPrice === 'number' && Number.isFinite(filters.minPrice)) {
    params.set('minPrice', String(Math.max(0, filters.minPrice)));
  }
  if (typeof filters.maxPrice === 'number' && Number.isFinite(filters.maxPrice)) {
    params.set('maxPrice', String(Math.max(0, filters.maxPrice)));
  }
  if (filters.searchKeyword && filters.searchKeyword.trim()) {
    params.set('searchKeyword', filters.searchKeyword.trim());
  }

  return params.toString();
};

const mapProduct = (item: Partial<AdminModerationProduct>): AdminModerationProduct => {
  const normalizedApprovalStatus = String(item.approvalStatus || '').toUpperCase();
  const thumbnail = item.thumbnail || '';
  return {
    id: String(item.id || ''),
    productCode: item.productCode || '',
    name: item.name || 'Unnamed product',
    thumbnail: getOptimizedImageUrl(thumbnail, { width: 220, format: 'webp', quality: 74 }) || thumbnail,
    storeId: item.storeId,
    storeName: item.storeName || 'Unknown store',
    categoryId: item.categoryId,
    categoryName: item.categoryName || 'Uncategorized',
    price: Number(item.price || 0),
    sales: Number(item.sales || 0),
    stock: Number(item.stock || 0),
    productStatus: item.productStatus || 'DRAFT',
    approvalStatus: normalizedApprovalStatus === 'BANNED' ? 'BANNED' : 'APPROVED',
    description: item.description || '',
    images: Array.isArray(item.images)
      ? item.images
        .map((image) => getOptimizedImageUrl(image, { width: 900, format: 'webp', quality: 76 }) || image)
        .filter(Boolean)
      : [],
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
};

export const listModerationProducts = async (
  filters: ProductModerationFilters,
): Promise<PageResponse<AdminModerationProduct>> => {
  const query = toQueryString(filters);
  const response = await apiRequest<PageResponse<Partial<AdminModerationProduct>>>(
    `/api/admin/products?${query}`,
    {},
    { auth: true },
  );

  return {
    content: (response.content || []).map(mapProduct),
    totalElements: Number(response.totalElements || 0),
    totalPages: Number(response.totalPages || 0),
    number: Number(response.number || 0),
    size: Number(response.size || filters.size),
  };
};

export const toggleProductApproval = async (
  productId: string,
  targetStatus?: 'APPROVED' | 'BANNED',
  reason?: string,
): Promise<AdminModerationProduct> => {
  const params = new URLSearchParams();
  if (targetStatus) params.set('targetStatus', targetStatus);
  if (reason && reason.trim()) params.set('reason', reason.trim());
  const query = params.size > 0 ? `?${params.toString()}` : '';
  const response = await apiRequest<Partial<AdminModerationProduct>>(
    `/api/admin/products/${productId}/status${query}`,
    { method: 'PATCH' },
    { auth: true },
  );
  return mapProduct(response);
};
