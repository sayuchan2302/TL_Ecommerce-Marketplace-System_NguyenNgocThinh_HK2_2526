import { apiRequest, hasBackendJwt } from './apiClient';

export type ReviewStatus = 'pending' | 'approved' | 'hidden';

export interface Review {
  id: string;
  storeId: string;
  productId: string;
  productName: string;
  productImage: string;
  orderId: string;
  rating: number;
  title?: string;
  content: string;
  images?: string[];
  createdAt: string;
  updatedAt?: string;
  helpful: number;
  shopReply?: {
    content: string;
    createdAt: string;
  };
  status: ReviewStatus;
  version: number;
}

export interface ReviewSubmission {
  storeId?: string;
  productId: string;
  productName?: string;
  productImage?: string;
  orderId: string;
  rating: number;
  title?: string;
  content: string;
  images?: string[];
}

interface BackendReviewResponse {
  id: string;
  storeId?: string;
  productId?: string;
  productName?: string;
  productImage?: string;
  rating?: number;
  content?: string;
  images?: string[];
  date?: string;
  status?: string;
  reply?: string | null;
  replyAt?: string | null;
  orderId?: string;
  version?: number;
}

interface BackendPage<T> {
  content?: T[];
}

const STORAGE_KEY = 'fashionstore_reviews_v1';

const parseStoredReviews = (): Review[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persistReviews = (reviews: Review[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
};

const sortByNewest = (rows: Review[]) =>
  [...rows].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

const isApproved = (review: Review) => review.status === 'approved';

const normalizeStatus = (status?: string): ReviewStatus => {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'APPROVED') return 'approved';
  if (normalized === 'HIDDEN' || normalized === 'REJECTED') return 'hidden';
  return 'pending';
};

const mapBackendReview = (row: BackendReviewResponse): Review => {
  const createdAt = row.date || new Date().toISOString();
  return {
    id: String(row.id),
    storeId: row.storeId || '',
    productId: row.productId || '',
    productName: row.productName || 'Sản phẩm',
    productImage: row.productImage || '',
    orderId: row.orderId || '',
    rating: Number(row.rating || 0),
    title: undefined,
    content: row.content || '',
    images: row.images || [],
    createdAt,
    updatedAt: createdAt,
    helpful: 0,
    shopReply: row.reply
      ? {
          content: row.reply,
          createdAt: row.replyAt || createdAt,
        }
      : undefined,
    status: normalizeStatus(row.status),
    version: Number(row.version || 0),
  };
};

const buildSubmissionRecord = (submission: ReviewSubmission): Review => ({
  id: `rev_${Date.now()}_${Math.round(Math.random() * 1000)}`,
  storeId: submission.storeId || 'store_001',
  productId: submission.productId,
  productName: submission.productName || 'San pham',
  productImage: submission.productImage || '',
  orderId: submission.orderId,
  rating: submission.rating,
  title: submission.title,
  content: submission.content,
  images: submission.images,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  helpful: 0,
  shopReply: undefined,
  status: 'pending',
  version: 1,
});

export const reviewService = {
  async getReviews(): Promise<Review[]> {
    return sortByNewest(parseStoredReviews());
  },

  async getReviewsByStore(storeId: string): Promise<Review[]> {
    if (hasBackendJwt()) {
      const rows = await this.getVendorReviews({ size: 1000 });
      return rows.filter((review) => review.storeId === storeId);
    }
    const all = await this.getReviews();
    return all.filter((review) => review.storeId === storeId);
  },

  async getVendorReviews(params: { status?: ReviewStatus | 'all'; page?: number; size?: number } = {}): Promise<Review[]> {
    const query = new URLSearchParams();
    query.set('page', String(Math.max(0, (params.page ?? 1) - 1)));
    query.set('size', String(Math.max(1, params.size ?? 1000)));
    if (params.status && params.status !== 'all') {
      query.set('status', params.status.toUpperCase());
    }

    const response = await apiRequest<BackendPage<BackendReviewResponse>>(
      `/api/reviews/my-store?${query.toString()}`,
      {},
      { auth: true },
    );

    return (response.content || []).map(mapBackendReview);
  },

  async replyAsVendor(id: string, reply: string): Promise<Review> {
    const response = await apiRequest<BackendReviewResponse>(
      `/api/reviews/my-store/${id}/reply`,
      {
        method: 'POST',
        body: JSON.stringify({ reply }),
      },
      { auth: true },
    );
    return mapBackendReview(response);
  },

  async getReviewsByOrder(orderId: string): Promise<Review[]> {
    const all = await this.getReviews();
    return all.filter((review) => review.orderId === orderId && isApproved(review));
  },

  async getReviewsByProduct(productId: string): Promise<Review[]> {
    const all = await this.getReviews();
    return all.filter((review) => review.productId === productId && isApproved(review));
  },

  async getAverageRating(productId: string): Promise<number> {
    const reviews = await this.getReviewsByProduct(productId);
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  },

  async submitReview(submission: ReviewSubmission): Promise<Review> {
    const rows = parseStoredReviews();
    const next = buildSubmissionRecord(submission);
    persistReviews([next, ...rows]);
    return next;
  },

  async hasReviewed(productId: string, orderId: string): Promise<boolean> {
    const all = await this.getReviews();
    return all.some((review) => review.productId === productId && review.orderId === orderId);
  },

  canVendorReply(): boolean {
    return hasBackendJwt();
  },
};
