import { Link } from 'react-router-dom';
import { MessageSquare, Star } from 'lucide-react';
import EmptyState from '../../../../components/EmptyState/EmptyState';
import type { ProfileTabContentProps } from '../ProfileTabContent.types';

const ReviewsTab = ({
  reviewFilter,
  onReviewFilterChange,
  pendingReviews,
  completedReviews,
  reviewsLoading,
  reviewsError,
  getOrderDisplayCode,
  onOpenReviewModal,
}: Pick<ProfileTabContentProps,
  | 'reviewFilter'
  | 'onReviewFilterChange'
  | 'pendingReviews'
  | 'completedReviews'
  | 'reviewsLoading'
  | 'reviewsError'
  | 'getOrderDisplayCode'
  | 'onOpenReviewModal'
>) => (
  <div className="tab-pane">
    <div className="profile-content-header">
      <h2 className="profile-content-title">Đánh giá & Phản hồi</h2>
    </div>

    <div className="order-filter-tabs">
      <button className={`order-filter-btn ${reviewFilter === 'pending' ? 'active' : ''}`} onClick={() => onReviewFilterChange('pending')}>
        Chờ đánh giá ({pendingReviews.length})
      </button>
      <button className={`order-filter-btn ${reviewFilter === 'completed' ? 'active' : ''}`} onClick={() => onReviewFilterChange('completed')}>
        Đã đánh giá ({completedReviews.length})
      </button>
    </div>

    {reviewsLoading ? (
      <div className="review-empty">
        <p>Đang tải danh sách đánh giá...</p>
      </div>
    ) : null}

    {!reviewsLoading && reviewsError ? (
      <div className="review-empty-state">
        <EmptyState icon={<MessageSquare size={80} strokeWidth={1} />} title="Không thể tải đánh giá" description={reviewsError} />
      </div>
    ) : null}

    {reviewFilter === 'pending' && (
      <div className="review-section">
        {!reviewsLoading && !reviewsError && pendingReviews.length > 0 ? (
          <div className="review-pending-list">
            {pendingReviews.map((product) => (
              <div key={product.productId} className="review-pending-card">
                <div className="review-pending-product">
                  <Link to={`/product/${encodeURIComponent(product.productId)}`} className="review-product-img">
                    <img src={product.productImage} alt={product.productName} />
                  </Link>
                  <div className="review-product-info">
                    <p className="review-product-name">{product.productName}</p>
                    <p className="review-product-variant">{product.variant}</p>
                    <p className="review-product-order">Đơn hàng: #{getOrderDisplayCode(product.orderId, product.orderCode)}</p>
                  </div>
                </div>
                <button className="review-write-btn" onClick={() => onOpenReviewModal(product)}>
                  Viết đánh giá
                </button>
              </div>
            ))}
          </div>
        ) : !reviewsLoading && !reviewsError ? (
          <div className="review-empty-state">
            <MessageSquare className="review-empty-icon" size={26} strokeWidth={1.8} />
            <p>Không có sản phẩm nào chờ đánh giá</p>
          </div>
        ) : null}
      </div>
    )}

    {reviewFilter === 'completed' && (
      <div className="review-section">
        {!reviewsLoading && !reviewsError && completedReviews.length > 0 ? (
          <div className="review-completed-list">
            {completedReviews.map((review) => (
              <div key={review.id} className="review-completed-card">
                <div className="review-completed-header">
                  <div className="review-pending-product">
                    <Link to={`/product/${encodeURIComponent(review.productId)}`} className="review-product-img">
                      <img
                        src={review.productImage || 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=80&h=80&fit=crop'}
                        alt={review.productName}
                      />
                    </Link>
                    <div className="review-product-info">
                      <p className="review-product-name">{review.productName}</p>
                      <p className="review-product-variant">Đơn hàng: #{getOrderDisplayCode(review.orderId, review.orderCode)}</p>
                    </div>
                  </div>
                  <span className="review-date">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <div className="review-stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={`review-star ${i < review.rating ? 'filled' : ''}`}>★</span>
                  ))}
                </div>
                <p className="review-text">{review.content}</p>
                {review.shopReply ? (
                  <div className="review-reply">
                    <div className="review-reply-header">
                      <span className="review-reply-badge">Phản hồi từ shop</span>
                    </div>
                    <p className="review-reply-text">{review.shopReply.content}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : !reviewsLoading && !reviewsError ? (
          <div className="review-empty-state">
            <Star className="review-empty-icon" size={26} strokeWidth={1.8} />
            <p>Bạn chưa có đánh giá nào</p>
          </div>
        ) : null}
      </div>
    )}
  </div>
);

export default ReviewsTab;
