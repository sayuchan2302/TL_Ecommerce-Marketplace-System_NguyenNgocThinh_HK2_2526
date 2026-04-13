import { apiRequest } from './apiClient';

export type AdminPromotionStatus = 'running' | 'paused' | 'draft';
export type AdminPromotionStatusFilter = AdminPromotionStatus | 'all';
export type AdminPromotionDiscountType = 'percent' | 'fixed';

interface BackendVoucher {
  id: string;
  storeId?: string;
  storeName?: string;
  name?: string;
  code?: string;
  description?: string | null;
  discountType?: 'PERCENT' | 'FIXED';
  discountValue?: number;
  minOrderValue?: number;
  totalIssued?: number;
  usedCount?: number;
  status?: 'RUNNING' | 'PAUSED' | 'DRAFT';
  startDate?: string;
  endDate?: string;
}

interface BackendVoucherCounts {
  all?: number;
  running?: number;
  paused?: number;
  draft?: number;
}

interface BackendVoucherListResponse {
  items?: BackendVoucher[];
  totalElements?: number;
  totalPages?: number;
  page?: number;
  pageSize?: number;
  totalUsage?: number;
  counts?: BackendVoucherCounts;
}

interface BackendVoucherRequest {
  storeId: string;
  name: string;
  code: string;
  description?: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  minOrderValue: number;
  totalIssued: number;
  startDate: string;
  endDate: string;
  status: 'RUNNING' | 'PAUSED' | 'DRAFT';
}

interface BackendMarketplaceCampaignRequest {
  name: string;
  code: string;
  description?: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  minOrderValue: number;
  totalIssued: number;
  startDate: string;
  endDate: string;
  status: 'RUNNING' | 'PAUSED' | 'DRAFT';
}

interface BackendMarketplaceCampaignFailure {
  storeId?: string;
  storeName?: string;
  reason?: string;
}

interface BackendMarketplaceCampaignResponse {
  code?: string;
  createdCount?: number;
  failedCount?: number;
  failures?: BackendMarketplaceCampaignFailure[];
}

export interface AdminPromotionRecord {
  id: string;
  storeId: string;
  storeName: string;
  name: string;
  code: string;
  description: string;
  discountType: AdminPromotionDiscountType;
  discountValue: number;
  minOrderValue: number;
  usedCount: number;
  totalIssued: number;
  status: AdminPromotionStatus;
  startDate: string;
  endDate: string;
}

export interface AdminPromotionUpsertInput {
  storeId: string;
  name: string;
  code: string;
  description?: string;
  discountType: AdminPromotionDiscountType;
  discountValue: number;
  minOrderValue: number;
  totalIssued: number;
  startDate: string;
  endDate: string;
  status: AdminPromotionStatus;
}

export interface AdminPromotionListResult {
  items: AdminPromotionRecord[];
  totalElements: number;
  totalPages: number;
  page: number;
  pageSize: number;
  totalUsage: number;
  counts: {
    all: number;
    running: number;
    paused: number;
    draft: number;
  };
}

export interface AdminMarketplaceCampaignResult {
  code: string;
  createdCount: number;
  failedCount: number;
  failures: Array<{
    storeId?: string;
    storeName?: string;
    reason: string;
  }>;
}

const normalizeCode = (value: string) => value.trim().replace(/\s+/g, '').toUpperCase();
const sanitizeDate = (value?: string) => (value ? value.slice(0, 10) : '');

const toStatus = (status?: string): AdminPromotionStatus => {
  switch ((status || '').toUpperCase()) {
    case 'RUNNING':
      return 'running';
    case 'PAUSED':
      return 'paused';
    default:
      return 'draft';
  }
};

const toApiStatus = (status: AdminPromotionStatus): 'RUNNING' | 'PAUSED' | 'DRAFT' => {
  switch (status) {
    case 'running':
      return 'RUNNING';
    case 'paused':
      return 'PAUSED';
    default:
      return 'DRAFT';
  }
};

const toDiscountType = (discountType?: string): AdminPromotionDiscountType =>
  (discountType || '').toUpperCase() === 'FIXED' ? 'fixed' : 'percent';

const toApiDiscountType = (
  discountType: AdminPromotionDiscountType,
): 'PERCENT' | 'FIXED' => (discountType === 'fixed' ? 'FIXED' : 'PERCENT');

const toRecord = (voucher: BackendVoucher): AdminPromotionRecord => ({
  id: voucher.id,
  storeId: voucher.storeId || '',
  storeName: (voucher.storeName || '').trim(),
  name: (voucher.name || '').trim(),
  code: normalizeCode(voucher.code || ''),
  description: (voucher.description || '').trim(),
  discountType: toDiscountType(voucher.discountType),
  discountValue: Number(voucher.discountValue || 0),
  minOrderValue: Number(voucher.minOrderValue || 0),
  usedCount: Number(voucher.usedCount || 0),
  totalIssued: Number(voucher.totalIssued || 0),
  status: toStatus(voucher.status),
  startDate: sanitizeDate(voucher.startDate),
  endDate: sanitizeDate(voucher.endDate),
});

const toRequestPayload = (input: AdminPromotionUpsertInput): BackendVoucherRequest => ({
  storeId: input.storeId,
  name: input.name.trim(),
  code: normalizeCode(input.code),
  description: input.description?.trim() || undefined,
  discountType: toApiDiscountType(input.discountType),
  discountValue: Math.max(0.01, Number(input.discountValue || 0)),
  minOrderValue: Math.max(0, Number(input.minOrderValue || 0)),
  totalIssued: Math.max(1, Math.round(Number(input.totalIssued || 0))),
  startDate: sanitizeDate(input.startDate),
  endDate: sanitizeDate(input.endDate),
  status: toApiStatus(input.status),
});

const toMarketplaceCampaignPayload = (input: AdminPromotionUpsertInput): BackendMarketplaceCampaignRequest => ({
  name: input.name.trim(),
  code: normalizeCode(input.code),
  description: input.description?.trim() || undefined,
  discountType: toApiDiscountType(input.discountType),
  discountValue: Math.max(0.01, Number(input.discountValue || 0)),
  minOrderValue: Math.max(0, Number(input.minOrderValue || 0)),
  totalIssued: Math.max(1, Math.round(Number(input.totalIssued || 0))),
  startDate: sanitizeDate(input.startDate),
  endDate: sanitizeDate(input.endDate),
  status: toApiStatus(input.status),
});

export const adminPromotionService = {
  async list(params: {
    status?: AdminPromotionStatusFilter;
    keyword?: string;
    page?: number;
    size?: number;
  } = {}): Promise<AdminPromotionListResult> {
    const page = Math.max(1, Number(params.page || 1));
    const size = Math.max(1, Number(params.size || 50));

    const searchParams = new URLSearchParams();
    searchParams.set('page', String(page));
    searchParams.set('size', String(size));

    if (params.status && params.status !== 'all') {
      searchParams.set('status', toApiStatus(params.status));
    }

    const keyword = (params.keyword || '').trim();
    if (keyword) {
      searchParams.set('keyword', keyword);
    }

    const response = await apiRequest<BackendVoucherListResponse>(
      `/api/vouchers/admin?${searchParams.toString()}`,
      {},
      { auth: true },
    );

    const items = (response.items || []).map(toRecord);
    const totalPages = Math.max(Number(response.totalPages || 1), 1);

    return {
      items,
      totalElements: Number(response.totalElements || items.length),
      totalPages,
      page: Math.min(Math.max(Number(response.page || page), 1), totalPages),
      pageSize: Math.max(Number(response.pageSize || size), 1),
      totalUsage: Number(response.totalUsage || 0),
      counts: {
        all: Number(response.counts?.all || 0),
        running: Number(response.counts?.running || 0),
        paused: Number(response.counts?.paused || 0),
        draft: Number(response.counts?.draft || 0),
      },
    };
  },

  async create(input: AdminPromotionUpsertInput): Promise<AdminPromotionRecord> {
    const created = await apiRequest<BackendVoucher>(
      '/api/vouchers/admin',
      {
        method: 'POST',
        body: JSON.stringify(toRequestPayload(input)),
      },
      { auth: true },
    );
    return toRecord(created);
  },

  async createMarketplaceCampaign(input: AdminPromotionUpsertInput): Promise<AdminMarketplaceCampaignResult> {
    const response = await apiRequest<BackendMarketplaceCampaignResponse>(
      '/api/vouchers/admin/marketplace-campaign',
      {
        method: 'POST',
        body: JSON.stringify(toMarketplaceCampaignPayload(input)),
      },
      { auth: true },
    );

    return {
      code: normalizeCode(response.code || input.code || ''),
      createdCount: Math.max(0, Number(response.createdCount || 0)),
      failedCount: Math.max(0, Number(response.failedCount || 0)),
      failures: Array.isArray(response.failures)
        ? response.failures.map((failure) => ({
          storeId: failure.storeId || undefined,
          storeName: (failure.storeName || '').trim() || undefined,
          reason: (failure.reason || '').trim() || 'Unknown failure',
        }))
        : [],
    };
  },

  async update(id: string, input: AdminPromotionUpsertInput): Promise<AdminPromotionRecord> {
    const updated = await apiRequest<BackendVoucher>(
      `/api/vouchers/admin/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(toRequestPayload(input)),
      },
      { auth: true },
    );
    return toRecord(updated);
  },

  async updateStatus(id: string, status: AdminPromotionStatus): Promise<AdminPromotionRecord> {
    const updated = await apiRequest<BackendVoucher>(
      `/api/vouchers/admin/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: toApiStatus(status) }),
      },
      { auth: true },
    );
    return toRecord(updated);
  },

  async delete(id: string): Promise<void> {
    await apiRequest<void>(
      `/api/vouchers/admin/${id}`,
      {
        method: 'DELETE',
      },
      { auth: true },
    );
  },
};
