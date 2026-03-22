import './Admin.css';
import { Star, MessageSquare, CheckCircle, EyeOff, Search, Filter, X, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AdminStateBlock, AdminTableSkeleton } from './AdminStateBlocks';
import { useAdminListState } from './useAdminListState';
import { useAdminViewState } from './useAdminViewState';
import { useAdminToast } from './useAdminToast';
import { ADMIN_DICTIONARY } from './adminDictionary';
import { adminReviewService, type Review, type ReviewStatus } from './adminReviewService';
import { ADMIN_VIEW_KEYS } from './adminListView';
import AdminConfirmDialog from './AdminConfirmDialog';

// ── Sub-components ──────────────────────────────────────────────────────────

const ReviewStatusBadge = ({ status, labels }: { status: ReviewStatus; labels: Record<ReviewStatus, string> }) => {
  const config: Record<ReviewStatus, { label: string; pillClass: string }> = {
    pending:  { label: labels.pending, pillClass: 'admin-pill pending'  },
    approved: { label: labels.approved, pillClass: 'admin-pill success'  },
    hidden:   { label: labels.hidden,   pillClass: 'admin-pill neutral'  },
  };
  const { label, pillClass } = config[status];
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

const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
};

// ── Main Component ──────────────────────────────────────────────────────────

const AdminReviews = () => {
  const { toast, pushToast } = useAdminToast();
const c = ADMIN_DICTIONARY.common;
const t = ADMIN_DICTIONARY.reviews;

  // ── Data ─────────────────────────────────────────────────────────────────
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setAllReviews(adminReviewService.getAll());
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // ── View state (tabs, search, page) ──────────────────────────────────────
  const view = useAdminViewState({
    storageKey: ADMIN_VIEW_KEYS.reviews,
    path: '/admin/reviews',
    validStatusKeys: ['all', 'pending', 'approved', 'hidden'],
    defaultStatus: 'all',
  });

  // ── Filter by tab status ──────────────────────────────────────────────────
  const filteredByStatus = useMemo(() => {
    if (view.status === 'all') return allReviews;
    return allReviews.filter((r) => r.status === view.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allReviews, view.status]);

  // ── List state (search + pagination) ─────────────────────────────────────
  const {
    search,
    setSearch,
    filteredItems: rows,
    pagedItems,
    page,
    setPage,
    totalPages,
    startIndex,
    endIndex,
    next,
    prev,
  } = useAdminListState<Review>({
    items: filteredByStatus,
    pageSize: 8,
    searchValue: view.search,
    onSearchChange: view.setSearch,
    pageValue: view.page,
    onPageChange: view.setPage,
    getSearchText: (r) => `${r.productName} ${r.customerName} ${r.content}`,
    filterPredicate: () => true,
    loadingDeps: [view.status],
  });

  // ── Selection ─────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set());
  };
  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id); else next.delete(id);
    setSelected(next);
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => adminReviewService.getStats(), [allReviews]);

  // ── Tab counts ────────────────────────────────────────────────────────────
  const tabCounts = useMemo(() => ({
    all:      allReviews.length,
    pending:  allReviews.filter((r) => r.status === 'pending').length,
    approved: allReviews.filter((r) => r.status === 'approved').length,
    hidden:   allReviews.filter((r) => r.status === 'hidden').length,
  }), [allReviews]);

  // ── Drawer ────────────────────────────────────────────────────────────────
  const [drawerReview, setDrawerReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');

  const openDrawer = (review: Review) => {
    setDrawerReview(review);
    setReplyText(review.reply || '');
  };
  const closeDrawer = () => {
    setDrawerReview(null);
    setReplyText('');
  };

  // ── Confirm dialog for delete ─────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; names: string[] } | null>(null);
  const requestDelete = (review: Review) => {
    setDeleteTarget({ ids: [review.id], names: [review.productName] });
  };
  const requestBulkDelete = () => {
    const targets = rows.filter((r) => selected.has(r.id));
    setDeleteTarget({ ids: targets.map((r) => r.id), names: targets.map((r) => r.productName) });
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const applyStatusUpdate = (id: string, status: ReviewStatus) => {
    const updated = adminReviewService.updateStatus(id, status);
    if (updated) setAllReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  };

    const handleApprove = useCallback((id: string) => {
      if (applyStatusUpdate(id, 'approved')) pushToast((ADMIN_DICTIONARY.reviews as any).approveSuccess);
    }, [pushToast]);

    const handleHide = useCallback((id: string) => {
      if (applyStatusUpdate(id, 'hidden')) pushToast((ADMIN_DICTIONARY.reviews as any).hideSuccess);
    }, [pushToast]);

  const handleReply = useCallback((id: string) => {
    if (!replyText.trim()) {
      pushToast((ADMIN_DICTIONARY.reviews as any).replyRequired);
      return;
    }
    const updated = adminReviewService.addReply(id, replyText.trim());
    if (updated) {
      setAllReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setDrawerReview(updated);
      setReplyText('');
      pushToast((ADMIN_DICTIONARY.reviews as any).replySuccess);
    }
  }, [replyText, pushToast]);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    let count = 0;
    deleteTarget.ids.forEach((id) => {
      if (adminReviewService.delete(id)) {
        setAllReviews((prev) => prev.filter((r) => r.id !== id));
        count++;
      }
    });
    pushToast((ADMIN_DICTIONARY.reviews as any).deleteSuccess);
    setSelected(new Set());
    setDeleteTarget(null);
    if (drawerReview && deleteTarget.ids.includes(drawerReview.id)) closeDrawer();
  };

  // ── Bulk actions ──────────────────────────────────────────────────────────
  const handleBulkApprove = useCallback(() => {
    let count = 0;
    Array.from(selected).forEach((id) => {
      if (applyStatusUpdate(id, 'approved')) count++;
    });
    if (count > 0) {
      setSelected(new Set());
      pushToast((ADMIN_DICTIONARY.reviews as any).bulkApproved(count));
    } else {
      pushToast((ADMIN_DICTIONARY.reviews as any).noEligibleBulkApprove);
    }
  }, [selected, pushToast]);

  const handleBulkHide = useCallback(() => {
    let count = 0;
    Array.from(selected).forEach((id) => {
      if (applyStatusUpdate(id, 'hidden')) count++;
    });
    if (count > 0) {
      setSelected(new Set());
      pushToast((ADMIN_DICTIONARY.reviews as any).bulkHidden(count));
    } else {
      pushToast((ADMIN_DICTIONARY.reviews as any).noEligibleBulkHide);
    }
  }, [selected, pushToast]);

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetCurrentView = () => {
    view.setStatus('all');
    view.setSearch('');
    view.setPage(1);
    setSelected(new Set());
  };

  const changeTab = (tab: string) => {
    setSelected(new Set());
    view.setStatus(tab);
  };

  // ── Tabs config ───────────────────────────────────────────────────────────
  const tabs = [
    { key: 'all',      label: t.tabs.all      },
    { key: 'pending',  label: t.tabs.pending   },
    { key: 'approved', label: t.tabs.approved  },
    { key: 'hidden',   label: t.tabs.hidden    },
  ] as const;

  const hasViewContext = view.status !== 'all' || view.search.trim();
  const activeTabLabel = tabs.find((tb) => tb.key === view.status)?.label ?? t.tabs.all;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout
      title={t.title}
      actions={
        <>
          <div className="admin-search">
            <Search size={16} />
            <input
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="admin-ghost-btn">
            <Filter size={16} />
            {c.filter}
          </button>
          <button className="admin-ghost-btn" onClick={resetCurrentView}>
            {c.clearFilters}
          </button>
        </>
      }
    >
      {/* ── Stat Cards ─────────────────────────────────────── */}
      <div className="admin-stats grid-4">
          <div className="admin-stat-card">
            <div className="admin-stat-label">{t.stats.total}</div>
            <div className="admin-stat-value">{stats.total}</div>
            <div className="admin-stat-sub">{t.statsSub.total}</div>
          </div>
          <div className={`admin-stat-card ${tabCounts.pending > 0 ? 'warning' : ''}`}
            onClick={() => changeTab('pending')} style={{ cursor: 'pointer' }}>
            <div className="admin-stat-label">{t.stats.pending}</div>
            <div className="admin-stat-value">{stats.pending}</div>
            <div className="admin-stat-sub">{t.statsSub.pending}</div>
          </div>
          <div className="admin-stat-card success"
            onClick={() => changeTab('approved')} style={{ cursor: 'pointer' }}>
            <div className="admin-stat-label">{t.stats.approved}</div>
            <div className="admin-stat-value">{stats.approved}</div>
            <div className="admin-stat-sub">{t.statsSub.approved}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">{t.stats.averageRating}</div>
            <div className="admin-stat-value" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {stats.averageRating.toFixed(1)}
              <Star size={18} style={{ color: '#facc15', fill: '#facc15' }} />
            </div>
            <div className="admin-stat-sub">{t.statsSub.average}</div>
          </div>
        </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`admin-tab ${view.status === tab.key ? 'active' : ''}`}
            onClick={() => changeTab(tab.key)}
          >
            <span>{tab.label}</span>
            <span className="admin-tab-count">{tabCounts[tab.key]}</span>
          </button>
        ))}
      </div>

      {/* View summary chips */}
      {hasViewContext && (
        <div className="admin-view-summary">
          <span className="summary-chip">{c.statusLabel}: {activeTabLabel}</span>
          {search.trim() && <span className="summary-chip">{c.keyword}: {search.trim()}</span>}
          <button className="summary-clear" onClick={resetCurrentView}>{c.clearFilters}</button>
        </div>
      )}

      {/* Main panel */}
      <section className="admin-panels single">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>{t.panelTitle}</h2>
            <Link to="/admin">{t.overview}</Link>
          </div>

          {isLoading ? (
            <AdminTableSkeleton columns={7} rows={6} />
          ) : rows.length === 0 ? (
            <AdminStateBlock
              type={search.trim() ? 'search-empty' : 'empty'}
              title={search.trim() ? t.empty.searchTitle : t.empty.defaultTitle}
              description={search.trim() ? t.empty.searchDescription : t.empty.defaultDescription}
               actionLabel={ADMIN_DICTIONARY.actions.resetFilters}
              onAction={resetCurrentView}
            />
          ) : (
            <>
              <div className="admin-table" role="table" aria-label={t.tableAria}>
                {/* Header row */}
                <div className="admin-table-row admin-table-head reviews" role="row">
                  <div role="columnheader">
                    <input
                      type="checkbox"
                      aria-label={c.aria.selectAll}
                      checked={selected.size === rows.length && rows.length > 0}
                      onChange={(e) => toggleAll(e.target.checked)}
                    />
                  </div>
                  <div role="columnheader">{t.columns.product}</div>
                  <div role="columnheader">{t.columns.rating}</div>
                  <div role="columnheader">{t.columns.customer}</div>
                  <div role="columnheader">{t.columns.date}</div>
                  <div role="columnheader">{t.columns.status}</div>
                  <div role="columnheader" style={{ textAlign: 'right', paddingRight: '12px' }}>{t.columns.actions}</div>
                </div>

                {/* Data rows */}
                {pagedItems.map((review, idx) => (
                  <motion.div
                    key={review.id}
                    className="admin-table-row reviews"
                    role="row"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(idx * 0.025, 0.16) }}
                    whileHover={{ y: -1 }}
                    onClick={() => openDrawer(review)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div role="cell" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={c.aria.selectItem(review.id)}
                        checked={selected.has(review.id)}
                        onChange={(e) => toggleOne(review.id, e.target.checked)}
                      />
                    </div>
                    <div role="cell">
                      <div className="admin-customer">
                        <img src={review.productImage} alt={review.productName} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="admin-bold">{review.productName}</span>
                          <span className="admin-muted small">#{review.id}</span>
                        </div>
                      </div>
                    </div>
                    <div role="cell"><RatingStars rating={review.rating} /></div>
                    <div role="cell" className="customer-info-cell">
                      <div className="customer-avatar initials">{getInitials(review.customerName)}</div>
                      <div className="customer-text">
                        <p className="admin-bold customer-name">{review.customerName}</p>
                        <p className="admin-muted customer-email">{review.customerEmail}</p>
                      </div>
                    </div>
                    <div role="cell" className="order-date admin-muted">{formatDate(review.date)}</div>
                     <div role="cell"><ReviewStatusBadge status={review.status} labels={t.statuses} /></div>
                    <div role="cell" className="admin-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="admin-icon-btn subtle"
                         title={ADMIN_DICTIONARY.actionTitles.viewDetail}
                        onClick={() => openDrawer(review)}
                      >
                        <Eye size={16} />
                      </button>
                      {review.status === 'pending' && (
                        <button
                          className="admin-icon-btn subtle"
                          onClick={() => handleApprove(review.id)}
                           title={ADMIN_DICTIONARY.actionTitles.approve}
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      {review.status !== 'hidden' && (
                        <button
                          className="admin-icon-btn subtle"
                          onClick={() => handleHide(review.id)}
                           title={ADMIN_DICTIONARY.actionTitles.hide}
                        >
                          <EyeOff size={16} />
                        </button>
                      )}
                      <button
                        className="admin-icon-btn subtle danger-icon"
                        onClick={() => requestDelete(review)}
                         title={ADMIN_DICTIONARY.actionTitles.delete}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {!isLoading && rows.length > 0 && (
                <div className="table-footer">
                  <span className="table-footer-meta">
                    {c.showing(startIndex, endIndex, rows.length, t.selectedNoun)}
                  </span>
                  <div className="pagination">
                    <button className="page-btn" onClick={prev} disabled={page === 1}>{c.previous}</button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i + 1}
                        className={`page-btn ${page === i + 1 ? 'active' : ''}`}
                        onClick={() => setPage(i + 1)}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button className="page-btn" onClick={next} disabled={page === totalPages}>{c.next}</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Floating bulk action bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            className="admin-floating-bar"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 22 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="admin-floating-content">
              <span>{c.selected(selected.size, t.selectedNoun)}</span>
              <div className="admin-actions">
                <button className="admin-ghost-btn" onClick={handleBulkApprove}>
                  <CheckCircle size={15} />
                  {t.floatingActions.approve}
                </button>
                <button className="admin-ghost-btn" onClick={handleBulkHide}>
                  <EyeOff size={15} />
                  {t.floatingActions.hide}
                </button>
                <button className="admin-ghost-btn danger" onClick={requestBulkDelete}>
                  <Trash2 size={15} />
                  {t.floatingActions.delete}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Drawer */}
      <AnimatePresence>
        {drawerReview && (
          <>
            <motion.div
              className="drawer-overlay"
              onClick={closeDrawer}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              className="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <div className="drawer-header">
                <div>
                  <p className="drawer-eyebrow">{t.drawer.title}</p>
                  <h3>{drawerReview.productName}</h3>
                </div>
                 <button className="admin-icon-btn" onClick={closeDrawer} aria-label={ADMIN_DICTIONARY.actionTitles.close}>
                  <X size={16} />
                </button>
              </div>

              <div className="drawer-body">
                {/* Product Info */}
                <section className="drawer-section">
                  <p className="admin-label" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                    {t.drawer.productInfo}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img
                      src={drawerReview.productImage}
                      alt={drawerReview.productName}
                      style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', border: '1px solid #e2e8f0' }}
                    />
                    <div>
                      <p className="admin-bold" style={{ margin: 0 }}>{drawerReview.productName}</p>
                       <p className="admin-muted small" style={{ margin: 0 }}>{t.drawer.productIdLabel}: {drawerReview.productId}</p>
                       {drawerReview.orderId && (
                         <p className="admin-muted small" style={{ margin: 0 }}>{t.drawer.orderIdLabel}: #{drawerReview.orderId}</p>
                       )}
                    </div>
                  </div>
                </section>

                {/* Customer Info */}
                <section className="drawer-section">
                  <p className="admin-label" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                    {t.drawer.customerInfo}
                  </p>
                  <div className="admin-card-list">
                    <div className="admin-card-row">
                      <span className="admin-bold">{drawerReview.customerName}</span>
                      <RatingStars rating={drawerReview.rating} size={16} />
                    </div>
                    <div className="admin-card-row">
                      <span className="admin-muted small">{formatDate(drawerReview.date)}</span>
                         <ReviewStatusBadge status={drawerReview.status} labels={t.statuses} />
                    </div>
                  </div>
                </section>

                {/* Review Content */}
                <section className="drawer-section">
                  <p className="admin-label" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                    {t.drawer.reviewContent}
                  </p>
                  <div className="admin-note">{drawerReview.content}</div>
                </section>

                {/* Reply */}
                <section className="drawer-section">
                  <p className="admin-label" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                    {t.drawer.reply}
                  </p>
                  {drawerReview.reply ? (
                    <div className="admin-note" style={{ background: '#eff6ff', color: '#1e40af' }}>
                      {drawerReview.reply}
                    </div>
                  ) : (
                    <p className="admin-muted small" style={{ fontStyle: 'italic' }}>{t.drawer.noReply}</p>
                  )}
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={t.drawer.replyPlaceholder}
                    className="admin-select"
                    style={{ width: '100%', marginTop: 10, resize: 'vertical' }}
                    rows={4}
                  />
                </section>

                {/* In-drawer action buttons */}
                <section className="drawer-section">
                  <div className="admin-actions" style={{ flexWrap: 'wrap' }}>
                    {drawerReview.status === 'pending' && (
                      <button
                        className="admin-primary-btn"
                        onClick={() => { handleApprove(drawerReview.id); closeDrawer(); }}
                      >
                        <CheckCircle size={15} />
                        {t.floatingActions.approve}
                      </button>
                    )}
                    {drawerReview.status !== 'hidden' && (
                      <button
                        className="admin-ghost-btn"
                        onClick={() => { handleHide(drawerReview.id); closeDrawer(); }}
                      >
                        <EyeOff size={15} />
                        {t.floatingActions.hide}
                      </button>
                    )}
                    {drawerReview.status === 'hidden' && (
                      <button
                        className="admin-primary-btn"
                        onClick={() => { handleApprove(drawerReview.id); closeDrawer(); }}
                      >
                        <CheckCircle size={15} />
                        {t.floatingActions.approve}
                      </button>
                    )}
                    <button
                      className="admin-ghost-btn danger"
                      style={{ marginLeft: 'auto' }}
                      onClick={() => { requestDelete(drawerReview); }}
                    >
                      <Trash2 size={15} />
                      {t.floatingActions.delete}
                    </button>
                  </div>
                </section>
              </div>

              <div className="drawer-footer">
                <button className="admin-ghost-btn" onClick={closeDrawer}>{t.drawer.close}</button>
                <button
                  className="admin-primary-btn"
                  disabled={!replyText.trim()}
                  onClick={() => handleReply(drawerReview.id)}
                >
                  <MessageSquare size={15} />
                  {t.drawer.sendReply}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirm Dialog */}
      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
         title={t.confirmDelete.title}
         description={t.confirmDelete.description}
         selectedItems={deleteTarget?.names}
         selectedNoun={t.selectedNoun}
         confirmLabel={t.confirmDelete.confirmLabel}
         danger
         onCancel={() => setDeleteTarget(null)}
         onConfirm={confirmDelete}
      />

      {/* Toast */}
      {toast && <div className="toast success">{toast}</div>}
    </AdminLayout>
  );
};

export default AdminReviews;
