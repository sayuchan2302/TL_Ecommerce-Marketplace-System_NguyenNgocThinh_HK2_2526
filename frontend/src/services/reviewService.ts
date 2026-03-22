import { adminReviewService, type Review as AdminReview, type ReviewStatus } from '../pages/Admin/adminReviewService';

export interface Review {
  id: string;
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
  productId: string;
  productName?: string;
  productImage?: string;
  orderId: string;
  rating: number;
  title?: string;
  content: string;
  images?: string[];
}

const mapAdminToClient = (item: AdminReview): Review => ({
  id: item.id,
  productId: item.productId,
  productName: item.productName,
  productImage: item.productImage,
  orderId: item.orderId || '',
  rating: item.rating,
  title: undefined,
  content: item.content,
  images: undefined,
  createdAt: item.date,
  updatedAt: item.date,
  helpful: 0,
  shopReply: item.reply ? { content: item.reply, createdAt: item.date } : undefined,
  status: item.status,
  version: item.version,
});

export const reviewService = {
  getReviews(): Review[] {
    return adminReviewService.getAll().map(mapAdminToClient);
  },

  getReviewsByOrder(orderId: string): Review[] {
    return this.getReviews().filter((r) => r.orderId === orderId && r.status === 'approved');
  },

  getReviewsByProduct(productId: string): Review[] {
    return this.getReviews().filter((r) => r.productId === productId && r.status === 'approved');
  },

  getAverageRating(productId: string): number {
    const reviews = this.getReviewsByProduct(productId);
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  },

  submitReview(submission: ReviewSubmission): Review {
    const newReview: AdminReview = {
      id: `rev_${Date.now()}`,
      productId: submission.productId,
      productName: submission.productName || 'Sản phẩm',
      productImage: submission.productImage || '',
      customerName: 'Khách hàng',
      customerEmail: '',
      orderId: submission.orderId,
      rating: submission.rating,
      content: submission.content,
      date: new Date().toISOString(),
      status: 'pending',
      reply: '',
      version: 1,
    };

    adminReviewService.addReview(newReview);

    return mapAdminToClient(newReview);
  },

  hasReviewed(productId: string, orderId: string): boolean {
    return this.getReviews().some((r) => r.productId === productId && r.orderId === orderId);
  },
};
