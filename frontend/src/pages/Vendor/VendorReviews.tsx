import './Vendor.css';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Link2, MessageSquare, Star } from 'lucide-react';
import VendorLayout from './VendorLayout';
import { PanelFloatingBar, PanelStatsGrid, PanelTabs, PanelViewSummary } from '../../components/Panel/PanelPrimitives';
import {
  PanelDrawerFooter,
  PanelDrawerHeader,
  PanelDrawerSection,
  PanelSearchField,
} from '../../components/Panel/PanelPrimitives';
import { adminReviewService } from '../Admin/adminReviewService';
import { reviewService, type Review } from '../../services/reviewService';
import { useToast } from '../../contexts/ToastContext';
import { AdminStateBlock } from '../Admin/AdminStateBlocks';
import AdminConfirmDialog from '../Admin/AdminConfirmDialog';

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'need_reply', label: 'Cần phản hồi' },
  { key: 'negative', label: 'Đánh giá tiêu cực' },
] as const;

const RatingStars = ({ rating }: { rating: number }) => (
  <div className="vendor-rating-stars">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={14}
        style={{
          color: star <= rating ? '#facc15' : '#d1d5db',
          fill: star <= rating ? '#facc15' : 'none',
        }}
      />
    ))}
  </div>
);

const VendorReviews = () => {
  const { addToast } = useToast();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'need_reply' | 'negative'>('all');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeReview, setActiveReview] = useState<Review | null>(null);
  const [confirmReplyIds, setConfirmReplyIds] = useState<string[] | null>(null);

  const reviews = useMemo(() => {
    void version;
    const rows = reviewService.getReviews();
    return rows.filter((review) => {
      const keyword = query.trim().toLowerCase();
      const matchesSearch =
        !keyword || `${review.productName} ${review.content} ${review.orderId}`.toLowerCase().includes(keyword);
      const matchesTab =
        activeTab === 'all'
          ? true
          : activeTab === 'need_reply'
            ? !review.shopReply
            : review.rating <= 3;
      return matchesSearch && matchesTab;
    });
  }, [activeTab, query, version]);

  const stats = useMemo(() => {
    void version;
    const rows = reviewService.getReviews();
    return {
      total: rows.length,
      needReply: rows.filter((review) => !review.shopReply).length,
      negative: rows.filter((review) => review.rating <= 3).length,
      average: rows.length
        ? (rows.reduce((sum, review) => sum + review.rating, 0) / rows.length).toFixed(1)
        : '0.0',
    };
  }, [version]);

  const resetCurrentView = () => {
    setQuery('');
    setActiveTab('all');
    setSelected(new Set());
  };

  const shareCurrentView = async () => {
    await navigator.clipboard.writeText(window.location.href);
    addToast('Đã sao chép bộ lọc hiện tại của đánh giá shop', 'success');
  };

  const submitReply = (id: string) => {
    const content = (replyDrafts[id] || '').trim();
    if (!content) {
      addToast('Hãy nhập nội dung phản hồi trước khi gửi', 'info');
      return;
    }

    const updated = adminReviewService.addReply(id, content);
    if (updated) {
      setReplyDrafts((current) => ({ ...current, [id]: '' }));
      setVersion((current) => current + 1);
      setConfirmReplyIds(null);
      setSelected(new Set());
      addToast('Đã lưu phản hồi cho đánh giá này', 'success');
    }
  };

  const selectedNeedReply = Array.from(selected).filter((id) => {
    const current = reviews.find((review) => review.id === id);
    return current && !current.shopReply && (replyDrafts[id] || '').trim();
  });

  const statItems = [
    {
      key: 'all',
      label: 'Tổng đánh giá',
      value: stats.total,
      sub: `Điểm trung bình: ${stats.average}`,
      onClick: () => setActiveTab('all'),
    },
    {
      key: 'need_reply',
      label: 'Cần phản hồi',
      value: stats.needReply,
      sub: 'Đánh giá chưa có phản hồi từ shop',
      tone: 'warning',
      onClick: () => setActiveTab('need_reply'),
    },
    {
      key: 'negative',
      label: 'Đánh giá ≤ 3 sao',
      value: stats.negative,
      sub: 'Tín hiệu cần chăm sóc ưu tiên',
      tone: 'info',
      onClick: () => setActiveTab('negative'),
    },
    {
      key: 'reply_rate',
      label: 'Tỷ lệ phản hồi',
      value: stats.total ? `${Math.round(((stats.total - stats.needReply) / stats.total) * 100)}%` : '0%',
      sub: 'Tỷ lệ đánh giá đã được shop chăm sóc',
      tone: 'success',
      onClick: () => setActiveTab('all'),
    },
  ] as const;

  const tabItems = TABS.map((tab) => ({ key: tab.key, label: tab.label }));
  const summaryChips = [
    ...(activeTab !== 'all'
      ? [{ key: 'status', label: `Trạng thái: ${TABS.find((tab) => tab.key === activeTab)?.label || 'Tất cả'}` }]
      : []),
    ...(query.trim() ? [{ key: 'query', label: `Từ khóa: ${query.trim()}` }] : []),
  ];

  return (
    <VendorLayout
      title="Đánh giá, phản hồi và uy tín shop"
      breadcrumbs={[{ label: 'Đánh giá và phản hồi' }, { label: 'Uy tín gian hàng' }]}
      actions={
        <>
          <PanelSearchField
            placeholder="Tìm theo sản phẩm, nội dung hoặc mã đơn"
            value={query}
            onChange={setQuery}
          />
          <button className="admin-ghost-btn" onClick={() => void shareCurrentView()}>
            <Link2 size={16} />
            Chia sẻ bộ lọc
          </button>
          <button className="admin-ghost-btn" onClick={resetCurrentView}>Đặt lại</button>
        </>
      }
    >
      <PanelStatsGrid items={[...statItems]} accentClassName="vendor-stat-button" />

      <PanelTabs
        items={tabItems}
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'all' | 'need_reply' | 'negative')}
        accentClassName="vendor-active-tab"
      />

      {activeTab !== 'all' || query.trim() ? (
        <PanelViewSummary chips={summaryChips} clearLabel="Xóa bộ lọc" onClear={resetCurrentView} />
      ) : null}

      <section className="admin-panels single">
        <div className="admin-panel">
          {reviews.length === 0 ? (
            <AdminStateBlock
              type={query.trim() ? 'search-empty' : 'empty'}
              title={query.trim() ? 'Không có đánh giá phù hợp' : 'Chưa có đánh giá cần xử lý'}
              description={
                query.trim()
                  ? 'Thử đổi từ khóa hoặc tab để xem lại hàng đợi phản hồi của shop.'
                  : 'Khi khách để lại đánh giá, seller panel sẽ hiển thị tại đây.'
              }
              actionLabel={query.trim() ? 'Đặt lại bộ lọc' : undefined}
              onAction={query.trim() ? resetCurrentView : undefined}
            />
          ) : (
            <div className="admin-table" role="table" aria-label="Bảng đánh giá của shop">
              <div className="admin-table-row vendor-reviews admin-table-head" role="row">
                <div role="columnheader">
                  <input
                    type="checkbox"
                    checked={selected.size === reviews.length && reviews.length > 0}
                    onChange={(event) => setSelected(event.target.checked ? new Set(reviews.map((item) => item.id)) : new Set())}
                  />
                </div>
                <div role="columnheader">Sản phẩm</div>
                <div role="columnheader">Đánh giá</div>
                <div role="columnheader">Nội dung</div>
                <div role="columnheader">Trạng thái</div>
                <div role="columnheader">Phản hồi</div>
                <div role="columnheader">Hành động</div>
              </div>

              {reviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  className="admin-table-row vendor-reviews"
                  role="row"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.025, 0.14) }}
                  whileHover={{ y: -1 }}
                  onClick={() => setActiveReview(review)}
                  style={{ cursor: 'pointer' }}
                >
                  <div role="cell" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(review.id)}
                      onChange={(event) => {
                        const next = new Set(selected);
                        if (event.target.checked) next.add(review.id);
                        else next.delete(review.id);
                        setSelected(next);
                      }}
                    />
                  </div>
                  <div role="cell" className="vendor-admin-product-cell">
                    <img src={review.productImage} alt={review.productName} className="vendor-admin-thumb" />
                    <div className="vendor-admin-product-copy">
                      <div className="admin-bold">{review.productName}</div>
                      <div className="admin-muted small">Đơn #{review.orderId}</div>
                    </div>
                  </div>
                  <div role="cell">
                    <RatingStars rating={review.rating} />
                    <div className="admin-muted small">{review.createdAt}</div>
                  </div>
                  <div role="cell" className="vendor-review-content">{review.content}</div>
                  <div role="cell">
                    <span className={`admin-pill ${review.rating <= 3 ? 'pending' : 'success'}`}>
                      {review.rating <= 3 ? 'Cần chăm sóc' : 'Ổn định'}
                    </span>
                  </div>
                  <div role="cell">
                    {review.shopReply ? (
                      <div className="vendor-reply-badge">
                        <span className="admin-bold">Đã phản hồi</span>
                        <span className="admin-muted small">{review.shopReply.createdAt}</span>
                      </div>
                    ) : (
                      <span className="badge amber">Chưa phản hồi</span>
                    )}
                  </div>
                  <div role="cell" className="admin-actions" onClick={(event) => event.stopPropagation()}>
                    <button
                      className="admin-icon-btn subtle"
                      onClick={() => setActiveReview(review)}
                      aria-label="Xem chi tiết đánh giá"
                      title="Xem chi tiết đánh giá"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <PanelFloatingBar show={selected.size > 0} className="vendor-floating-bar">
        <div className="admin-floating-content">
          <span>Đã chọn {selected.size} đánh giá</span>
          <div className="admin-actions">
            <button className="admin-ghost-btn" onClick={() => setSelected(new Set())}>Bỏ chọn</button>
            {selectedNeedReply.length > 0 ? (
              <button className="admin-ghost-btn" onClick={() => setConfirmReplyIds(selectedNeedReply)}>
                Gửi phản hồi đã chọn
              </button>
            ) : null}
          </div>
        </div>
      </PanelFloatingBar>

      <AdminConfirmDialog
        open={Boolean(confirmReplyIds?.length)}
        title="Gửi phản hồi cho các đánh giá đã chọn"
        description="Các đánh giá này sẽ nhận phản hồi từ shop ngay sau khi xác nhận."
        selectedItems={confirmReplyIds || []}
        selectedNoun="đánh giá"
        confirmLabel="Gửi phản hồi"
        onCancel={() => setConfirmReplyIds(null)}
        onConfirm={() => confirmReplyIds?.forEach((id) => submitReply(id))}
      />

      {activeReview ? (
        <>
          <div className="drawer-overlay" onClick={() => setActiveReview(null)} />
          <div className="drawer">
            <PanelDrawerHeader
              eyebrow="Chi tiết đánh giá"
              title={activeReview.productName}
              onClose={() => setActiveReview(null)}
              closeLabel="Đóng chi tiết đánh giá"
            />
            <div className="drawer-body">
              <PanelDrawerSection title="Thông tin đánh giá">
                <div className="admin-card-list">
                  <div className="admin-card-row">
                    <span className="admin-bold">Đơn hàng</span>
                    <span className="admin-muted">#{activeReview.orderId}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Số sao</span>
                    <span><RatingStars rating={activeReview.rating} /></span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Nội dung</span>
                    <span className="admin-muted">{activeReview.content}</span>
                  </div>
                </div>
              </PanelDrawerSection>
              <PanelDrawerSection title="Phản hồi của shop">
                {activeReview.shopReply ? (
                  <div className="vendor-review-reply-box">
                    <strong>Đã phản hồi:</strong> {activeReview.shopReply.content}
                  </div>
                ) : (
                  <div className="form-grid">
                    <label className="form-field full">
                      <span>Nội dung phản hồi</span>
                      <textarea
                        rows={4}
                        value={replyDrafts[activeReview.id] || ''}
                        onChange={(event) =>
                          setReplyDrafts((current) => ({ ...current, [activeReview.id]: event.target.value }))
                        }
                        placeholder="Giải thích, xin lỗi hoặc hướng dẫn khách hàng..."
                      />
                    </label>
                  </div>
                )}
              </PanelDrawerSection>
            </div>
            <PanelDrawerFooter>
              <button className="admin-ghost-btn" onClick={() => setActiveReview(null)}>Đóng</button>
              {!activeReview.shopReply ? (
                <button className="admin-primary-btn vendor-admin-primary" onClick={() => submitReply(activeReview.id)}>
                  <MessageSquare size={15} />
                  Gửi phản hồi
                </button>
              ) : null}
            </PanelDrawerFooter>
          </div>
        </>
      ) : null}
    </VendorLayout>
  );
};

export default VendorReviews;
