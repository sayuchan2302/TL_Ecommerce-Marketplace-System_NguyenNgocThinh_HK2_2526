import './Admin.css';
import { Eye, EyeOff, Star, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from './AdminLayout';
import { AdminStateBlock } from './AdminStateBlocks';
import { useAdminListState } from './useAdminListState';
import { useAdminToast } from './useAdminToast';
import { useAdminViewState } from './useAdminViewState';
import {
  PanelDrawerFooter,
  PanelDrawerHeader,
  PanelDrawerSection,
  PanelTableFooter,
  PanelTabs,
} from '../../components/Panel/PanelPrimitives';
import { ADMIN_VIEW_KEYS } from './adminListView';
import { adminReviewService, type Review, type ReviewStatus } from './adminReviewService';
import AdminConfirmDialog from './AdminConfirmDialog';
import Drawer from '../../components/Drawer/Drawer';
import { toDisplayOrderCode } from '../../utils/displayCode';

const normalizeStatus = (status?: string | null): ReviewStatus => {
  const normalized = status?.toLowerCase();
  return normalized === 'hidden' ? 'hidden' : 'visible';
};

const ReviewStatusBadge = ({ status }: { status?: ReviewStatus | string | null }) => {
  const config: Record<ReviewStatus, { label: string; pillClass: string }> = {
    visible: { label: 'Đang hiển thị', pillClass: 'admin-pill success' },
    hidden: { label: 'Đã ẩn', pillClass: 'admin-pill neutral' },
  };
  const { label, pillClass } = config[normalizeStatus(status)];
  return <span className={pillClass}>{label}</span>;
};

const RatingStars = ({ rating, size = 14 }: { rating: number; size?: number }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={size}
        style={{ color: star <= rating ? '#facc15' : '#d1d5db', fill: star <= rating ? '#facc15' : 'none' }}
      />
    ))}
  </div>
);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatDateTime = (iso?: string | null) => {
  if (!iso) return 'Chưa có dữ liệu';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString('vi-VN', {
    hour12: false,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getInitials = (name: string) => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'NA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const AdminReviews = () => {
  const { toast, pushToast } = useAdminToast();
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerReview, setDrawerReview] = useState<Review | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; names: string[] } | null>(null);

  useEffect(() => {
    let active = true;

    const fetchReviews = async () => {
      setIsLoading(true);
      try {
        const res = await adminReviewService.getAll({ size: 1000 });
        if (active) setAllReviews(res.content);
      } catch {
        if (active) pushToast('Không tải được đánh giá.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void fetchReviews();
    return () => {
      active = false;
    };
  }, [pushToast]);

  const view = useAdminViewState({
    storageKey: ADMIN_VIEW_KEYS.reviews,
    path: '/admin/reviews',
    validStatusKeys: ['all', 'visible', 'hidden'],
    defaultStatus: 'visible',
  });

  const filteredByStatus = useMemo(() => {
    if (view.status === 'all') return allReviews;
    return allReviews.filter((item) => normalizeStatus(item.status) === view.status);
  }, [allReviews, view.status]);

  const {
    search,
    filteredItems,
    pagedItems,
    page,
    setPage,
    totalPages,
    startIndex,
    endIndex,
  } = useAdminListState<Review>({
    items: filteredByStatus,
    pageSize: 8,
    searchValue: view.search,
    onSearchChange: view.setSearch,
    pageValue: view.page,
    onPageChange: view.setPage,
    getSearchText: (row) => `${row.productName} ${row.customerName} ${row.content} ${row.orderCode || ''}`,
    filterPredicate: () => true,
    loadingDeps: [view.status],
  });

  const stats = useMemo(() => {
    const total = allReviews.length;
    const visible = allReviews.filter((item) => normalizeStatus(item.status) === 'visible').length;
    const hidden = allReviews.filter((item) => normalizeStatus(item.status) === 'hidden').length;
    const averageRating = total ? allReviews.reduce((sum, row) => sum + row.rating, 0) / total : 0;
    return { total, visible, hidden, averageRating };
  }, [allReviews]);

  const tabCounts = useMemo(
    () => ({
      all: allReviews.length,
      visible: allReviews.filter((item) => normalizeStatus(item.status) === 'visible').length,
      hidden: allReviews.filter((item) => normalizeStatus(item.status) === 'hidden').length,
    }),
    [allReviews],
  );

  const handleHide = useCallback(
    async (id: string) => {
      try {
        const updated = await adminReviewService.hide(id);
        setAllReviews((prev) => prev.map((item) => (item.id === id ? updated : item)));
        pushToast('Đã ẩn đánh giá.');
      } catch {
        pushToast('Không thể ẩn đánh giá.');
      }
    },
    [pushToast],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await Promise.all(deleteTarget.ids.map((id) => adminReviewService.delete(id)));
      setAllReviews((prev) => prev.filter((item) => !deleteTarget.ids.includes(item.id)));
      pushToast('Đã xóa đánh giá.');
      if (drawerReview && deleteTarget.ids.includes(drawerReview.id)) {
        setDrawerReview(null);
      }
    } catch {
      pushToast('Lỗi khi xóa đánh giá.');
    } finally {
      setSelected(new Set());
      setDeleteTarget(null);
    }
  }, [deleteTarget, drawerReview, pushToast]);

  const resetCurrentView = () => {
    view.resetCurrentView();
    setSelected(new Set());
  };

  return (
    <AdminLayout title="Đánh giá" breadcrumbs={['Đánh giá', 'Quản lý']}>
      <div className="admin-stats grid-4">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Tổng đánh giá</div>
          <div className="admin-stat-value">{stats.total}</div>
          <div className="admin-stat-sub">Tất cả phản hồi từ khách hàng</div>
        </div>
        <div className="admin-stat-card success" onClick={() => view.setStatus('visible')} style={{ cursor: 'pointer' }}>
          <div className="admin-stat-label">Đang hiển thị</div>
          <div className="admin-stat-value">{stats.visible}</div>
          <div className="admin-stat-sub">Đang xuất hiện trên trang sản phẩm</div>
        </div>
        <div
          className={`admin-stat-card ${stats.hidden > 0 ? 'warning' : ''}`}
          onClick={() => view.setStatus('hidden')}
          style={{ cursor: 'pointer' }}
        >
          <div className="admin-stat-label">Đã ẩn</div>
          <div className="admin-stat-value">{stats.hidden}</div>
          <div className="admin-stat-sub">Đã bị ẩn khỏi storefront</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Đánh giá trung bình</div>
          <div className="admin-stat-value" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {stats.averageRating.toFixed(1)}
            <Star size={18} style={{ color: '#facc15', fill: '#facc15' }} />
          </div>
          <div className="admin-stat-sub">Mức độ hài lòng khách hàng</div>
        </div>
      </div>

      <PanelTabs
        items={[
          { key: 'all', label: 'Tất cả', count: tabCounts.all },
          { key: 'visible', label: 'Đang hiển thị', count: tabCounts.visible },
          { key: 'hidden', label: 'Đã ẩn', count: tabCounts.hidden },
        ]}
        activeKey={view.status}
        onChange={(key) => view.setStatus(key)}
      />

      <section className="admin-panels single">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Danh sách đánh giá</h2>
          </div>

          {isLoading ? (
            <AdminStateBlock type="empty" title="Đang tải dữ liệu" description="Hệ thống đang đồng bộ với backend..." />
          ) : filteredItems.length === 0 ? (
            <AdminStateBlock
              type={search.trim() ? 'search-empty' : 'empty'}
              title={search.trim() ? 'Không tìm thấy đánh giá phù hợp' : 'Chưa có đánh giá nào'}
              description={
                search.trim()
                  ? 'Thử đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc.'
                  : 'Đánh giá mới sẽ hiển thị tại đây để admin theo dõi và xử lý ẩn/xóa khi cần.'
              }
              actionLabel="Đặt lại"
              onAction={resetCurrentView}
            />
          ) : (
            <>
              <div className="admin-table" role="table" aria-label="Bảng đánh giá">
                <div className="admin-table-row admin-table-head reviews" role="row">
                  <div role="columnheader">
                    <input
                      type="checkbox"
                      checked={selected.size === filteredItems.length && filteredItems.length > 0}
                      onChange={(event) =>
                        setSelected(event.target.checked ? new Set(filteredItems.map((item) => item.id)) : new Set())
                      }
                    />
                  </div>
                  <div role="columnheader">STT</div>
                  <div role="columnheader">Sản phẩm</div>
                  <div role="columnheader">Khách hàng</div>
                  <div role="columnheader">Đánh giá</div>
                  <div role="columnheader">Ngày</div>
                  <div role="columnheader">Trạng thái</div>
                  <div role="columnheader" style={{ textAlign: 'right', paddingRight: '12px' }}>
                    Hành động
                  </div>
                </div>

                {pagedItems.map((review, index) => (
                  <motion.div
                    key={review.id}
                    className="admin-table-row reviews"
                    role="row"
                    whileHover={{ y: -1 }}
                    onClick={() => setDrawerReview(review)}
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
                    <div role="cell" className="admin-mono">
                      {startIndex + index}
                    </div>
                    <div role="cell">
                      <div className="admin-customer">
                        <img src={review.productImage} alt={review.productName} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="admin-bold">{review.productName}</span>
                        </div>
                      </div>
                    </div>
                    <div role="cell" className="customer-info-cell">
                      <div className="customer-avatar initials">{getInitials(review.customerName)}</div>
                      <div className="customer-text">
                        <p className="admin-bold customer-name">{review.customerName}</p>
                        <p className="admin-muted customer-email">{review.customerEmail}</p>
                      </div>
                    </div>
                    <div role="cell">
                      <RatingStars rating={review.rating} />
                    </div>
                    <div role="cell" className="order-date admin-muted">
                      {formatDate(review.date)}
                    </div>
                    <div role="cell">
                      <ReviewStatusBadge status={review.status} />
                    </div>
                    <div role="cell" className="admin-actions" onClick={(event) => event.stopPropagation()}>
                      <button className="admin-icon-btn subtle" title="Xem chi tiết" onClick={() => setDrawerReview(review)}>
                        <Eye size={16} />
                      </button>
                      {normalizeStatus(review.status) !== 'hidden' && (
                        <button className="admin-icon-btn subtle" onClick={() => void handleHide(review.id)} title="Ẩn">
                          <EyeOff size={16} />
                        </button>
                      )}
                      <button
                        className="admin-icon-btn subtle danger-icon"
                        onClick={() => setDeleteTarget({ ids: [review.id], names: [review.productName] })}
                        title="Xóa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              <PanelTableFooter
                meta={`Hiển thị ${startIndex}-${endIndex} của ${filteredItems.length} đánh giá`}
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                prevLabel="Trước"
                nextLabel="Tiếp"
              />
            </>
          )}
        </div>
      </section>

      <Drawer
        open={Boolean(drawerReview)}
        onClose={() => setDrawerReview(null)}
        size="lg"
        ariaLabel="Chi tiết đánh giá"
      >
        {drawerReview ? (
          <>
            <PanelDrawerHeader
              eyebrow="Chi tiết đánh giá"
              title={drawerReview.productName}
              onClose={() => setDrawerReview(null)}
              closeLabel="Đóng chi tiết đánh giá"
            />
            <div className="drawer-body">
              <PanelDrawerSection title="Tổng quan đánh giá">
                <div className="review-drawer-product">
                  <img
                    src={drawerReview.productImage}
                    alt={drawerReview.productName}
                    className="review-drawer-product-image"
                  />
                  <div className="review-drawer-product-copy">
                    <p className="review-drawer-product-name">{drawerReview.productName}</p>
                    <p className="review-drawer-product-sub">Đơn hàng: #{toDisplayOrderCode(drawerReview.orderCode)}</p>
                    <div className="review-drawer-pill-row">
                      <ReviewStatusBadge status={drawerReview.status} />
                      <span className={`admin-pill ${drawerReview.rating <= 3 ? 'pending' : 'success'}`}>
                        {drawerReview.rating <= 3 ? 'Cần chăm sóc' : 'Ổn định'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="review-drawer-meta-grid">
                  <div className="review-drawer-meta-card">
                    <span className="review-drawer-meta-label">Khách hàng</span>
                    <span className="review-drawer-meta-value review-drawer-stacked">
                      <strong>{drawerReview.customerName}</strong>
                      <small>{drawerReview.customerEmail || 'Không có email'}</small>
                    </span>
                  </div>
                  <div className="review-drawer-meta-card">
                    <span className="review-drawer-meta-label">Điểm đánh giá</span>
                    <span className="review-drawer-meta-value">
                      <RatingStars rating={drawerReview.rating} size={14} /> <strong>{drawerReview.rating}/5</strong>
                    </span>
                  </div>
                  <div className="review-drawer-meta-card">
                    <span className="review-drawer-meta-label">Thời gian đánh giá</span>
                    <span className="review-drawer-meta-value">{formatDateTime(drawerReview.date)}</span>
                  </div>
                  <div className="review-drawer-meta-card">
                    <span className="review-drawer-meta-label">Mã sản phẩm</span>
                    <span className="review-drawer-meta-value review-drawer-code">{drawerReview.productId || 'Chưa có'}</span>
                  </div>
                </div>
              </PanelDrawerSection>

              <PanelDrawerSection title="Nội dung khách hàng">
                <p className="review-drawer-content">{drawerReview.content || 'Khách hàng chưa để lại nội dung.'}</p>
              </PanelDrawerSection>

              <PanelDrawerSection title="Ảnh đính kèm">
                {drawerReview.images && drawerReview.images.length > 0 ? (
                  <div className="review-drawer-media-grid">
                    {drawerReview.images.map((image, index) => (
                      <a
                        key={`${drawerReview.id}-${index}`}
                        href={image}
                        target="_blank"
                        rel="noreferrer"
                        className="review-drawer-media-item"
                      >
                        <img src={image} alt={`Review media ${index + 1}`} />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="review-drawer-empty">Đánh giá này chưa có ảnh đính kèm.</p>
                )}
              </PanelDrawerSection>

              <PanelDrawerSection title="Phản hồi từ người bán">
                {drawerReview.reply ? (
                  <div className="review-drawer-reply-box">
                    <p className="review-drawer-reply-title">Đã phản hồi</p>
                    <p>{drawerReview.reply}</p>
                    <span className="review-drawer-reply-time">{formatDateTime(drawerReview.replyAt)}</span>
                  </div>
                ) : (
                  <p className="review-drawer-empty">Shop chưa phản hồi đánh giá này.</p>
                )}
              </PanelDrawerSection>
            </div>
            <PanelDrawerFooter>
              <button className="admin-ghost-btn" onClick={() => setDrawerReview(null)}>
                Đóng
              </button>
              {normalizeStatus(drawerReview.status) !== 'hidden' && (
                <button
                  className="admin-ghost-btn"
                  onClick={() => {
                    void handleHide(drawerReview.id);
                    setDrawerReview(null);
                  }}
                >
                  <EyeOff size={15} />
                  Ẩn
                </button>
              )}
              <button
                className="admin-ghost-btn danger"
                style={{ marginLeft: 'auto' }}
                onClick={() => setDeleteTarget({ ids: [drawerReview.id], names: [drawerReview.productName] })}
              >
                <Trash2 size={15} />
                Xóa
              </button>
            </PanelDrawerFooter>
          </>
        ) : null}
      </Drawer>

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa đánh giá"
        description="Bạn có chắc chắn muốn xóa đánh giá này khỏi hệ thống? Hành động này không thể hoàn tác."
        selectedItems={deleteTarget?.names}
        selectedNoun="review"
        confirmLabel="Xóa đánh giá"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />

      {toast && <div className="toast success">{toast}</div>}
    </AdminLayout>
  );
};

export default AdminReviews;
