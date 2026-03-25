import './Admin.css';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, Pencil, Pause, Play, X, Tag, Trash2 } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { AdminStateBlock } from './AdminStateBlocks';
import AdminConfirmDialog from './AdminConfirmDialog';
import { useAdminListState } from './useAdminListState';
import { ADMIN_VIEW_KEYS } from './adminListView';
import { useAdminViewState } from './useAdminViewState';
import { useAdminToast } from './useAdminToast';
import { promotionStore, type Promotion, type PromotionStatus, type DiscountType } from '../../services/promotionStore';
import { promotionStatusClass, promotionStatusLabel } from './adminStatusMaps';

const emptyPromotion: Promotion = {
  id: '',
  name: '',
  code: '',
  description: '',
  discountType: 'percent',
  discountValue: 10,
  maxDiscount: 100000,
  minOrderValue: 500000,
  userLimit: 1,
  totalIssued: 1000,
  usedCount: 0,
  startDate: '',
  endDate: '',
  status: 'paused',
};

const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')} đ`;
const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
};

const deriveStatus = (promotion: Promotion): PromotionStatus => {
  if (promotion.status === 'paused') return 'paused';
  const endDate = new Date(promotion.endDate);
  if (Number.isNaN(endDate.getTime())) return 'paused';
  endDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return endDate < today ? 'expired' : 'running';
};

const validateForm = (form: Promotion, rows: Promotion[], editingId: string | null) => {
  if (!form.name.trim()) return 'Tên chiến dịch không được để trống.';
  if (!form.code.trim()) return 'Mã voucher không được để trống.';
  if (!/^[A-Z0-9-]{4,24}$/.test(form.code)) return 'Mã chỉ gồm chữ hoa, số và dấu gạch ngang.';
  if (rows.some((item) => item.code === form.code && item.id !== editingId)) return 'Mã voucher đã tồn tại.';
  if (form.discountValue <= 0) return 'Giá trị giảm phải lớn hơn 0.';
  if (form.discountType === 'percent' && form.discountValue > 100) return 'Phần trăm giảm không được vượt 100%.';
  if (form.maxDiscount <= 0) return 'Mức giảm tối đa phải lớn hơn 0.';
  if (form.minOrderValue <= 0) return 'Giá trị đơn tối thiểu phải lớn hơn 0.';
  if (!form.startDate || !form.endDate) return 'Hãy chọn đầy đủ lịch chiến dịch.';
  if (new Date(form.endDate) < new Date(form.startDate)) return 'Ngày kết thúc phải sau ngày bắt đầu.';
  return null;
};

const discountTypeLabel = (type: DiscountType) => (type === 'percent' ? 'Giảm %' : 'Giảm tiền');

const AdminPromotions = () => {
  const view = useAdminViewState({
    storageKey: ADMIN_VIEW_KEYS.promotions,
    path: '/admin/promotions',
    validStatusKeys: ['all', 'running', 'paused', 'expired'],
    defaultStatus: 'all',
  });
  const [rows, setRows] = useState<Promotion[]>(() => promotionStore.getAll());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Promotion>(emptyPromotion);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const { toast, pushToast } = useAdminToast();

  const {
    search,
    isLoading,
    filteredItems,
    pagedItems,
    page,
    totalPages,
    startIndex,
    endIndex,
    next,
    prev,
    setPage,
  } = useAdminListState<Promotion>({
    items: rows,
    pageSize: 7,
    searchValue: view.search,
    onSearchChange: view.setSearch,
    pageValue: view.page,
    onPageChange: view.setPage,
    getSearchText: (item) => `${item.name} ${item.code} ${item.description}`,
    filterPredicate: (item) => view.status === 'all' || deriveStatus(item) === view.status,
    loadingDeps: [view.status],
  });

  const stats = useMemo(() => {
    const running = rows.filter((item) => deriveStatus(item) === 'running').length;
    const paused = rows.filter((item) => deriveStatus(item) === 'paused').length;
    const expired = rows.filter((item) => deriveStatus(item) === 'expired').length;
    const totalIssued = rows.reduce((sum, item) => sum + item.totalIssued, 0);
    const totalUsed = rows.reduce((sum, item) => sum + item.usedCount, 0);
    return {
      running,
      paused,
      expired,
      usageRate: totalIssued > 0 ? Math.round((totalUsed / totalIssued) * 100) : 0,
    };
  }, [rows]);

  const resetView = () => {
    view.resetCurrentView();
    setSelected(new Set());
    pushToast('Đã đặt lại bộ lọc chiến dịch.');
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyPromotion);
    setIsDrawerOpen(true);
  };

  const openEdit = (promotion: Promotion) => {
    setEditingId(promotion.id);
    setForm({ ...promotion, status: promotion.status === 'expired' ? 'running' : promotion.status });
    setIsDrawerOpen(true);
  };

  const savePromotion = () => {
    const error = validateForm(form, rows, editingId);
    if (error) {
      pushToast(error);
      return;
    }
    if (editingId) {
      const updated = { ...form, id: editingId };
      setRows((prev) => prev.map((item) => (item.id === editingId ? updated : item)));
      promotionStore.update(updated);
      pushToast('Đã cập nhật chiến dịch toàn sàn.');
    } else {
      const created = { ...form, id: `pr-${Date.now()}` };
      setRows((prev) => [created, ...prev]);
      promotionStore.add(created);
      pushToast('Đã tạo chiến dịch toàn sàn.');
    }
    setIsDrawerOpen(false);
  };

  const togglePause = (promotion: Promotion) => {
    const nextStatus: PromotionStatus = promotion.status === 'paused' ? 'running' : 'paused';
    const updated = { ...promotion, status: nextStatus };
    setRows((prev) => prev.map((item) => (item.id === promotion.id ? updated : item)));
    promotionStore.update(updated);
  };

  const deleteSelected = () => {
    if (!deleteIds?.length) return;
    const idSet = new Set(deleteIds);
    setRows((prev) => prev.filter((item) => !idSet.has(item.id)));
    deleteIds.forEach((id) => promotionStore.remove(id));
    setSelected(new Set());
    setDeleteIds(null);
    pushToast('Đã xóa chiến dịch khỏi hệ thống.');
  };

  return (
    <AdminLayout
      title="Khuyến mãi"
      breadcrumbs={['Khuyến mãi', 'Chiến dịch điều hành']}
      actions={
        <>
          <div className="admin-search">
            <Search size={16} />
            <input
              placeholder="Tìm chiến dịch, mã voucher hoặc mô tả"
              aria-label="Tìm chiến dịch, mã voucher hoặc mô tả"
              value={search}
              onChange={(e) => view.setSearch(e.target.value)}
            />
          </div>
          <button className="admin-ghost-btn" onClick={() => pushToast('Bộ lọc campaign scope sẽ bổ sung sau.')}>
            <Tag size={16} /> Phạm vi chiến dịch
          </button>
          <button className="admin-ghost-btn" onClick={resetView}>Đặt lại</button>
          <button className="admin-primary-btn" onClick={openCreate}>
            <Plus size={16} /> Tạo chiến dịch
          </button>
        </>
      }
    >
      <div className="admin-stats grid-4">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Tổng chiến dịch</div>
          <div className="admin-stat-value">{rows.length}</div>
          <div className="admin-stat-sub">Tỷ lệ sử dụng toàn sàn: {stats.usageRate}%</div>
        </div>
        <div className="admin-stat-card success" onClick={() => view.setStatus('running')} style={{ cursor: 'pointer' }}>
          <div className="admin-stat-label">Đang chạy</div>
          <div className="admin-stat-value">{stats.running}</div>
          <div className="admin-stat-sub">Chiến dịch đang hoạt động</div>
        </div>
        <div className="admin-stat-card warning" onClick={() => view.setStatus('paused')} style={{ cursor: 'pointer' }}>
          <div className="admin-stat-label">Tạm dừng</div>
          <div className="admin-stat-value">{stats.paused}</div>
          <div className="admin-stat-sub">Chờ kích hoạt hoặc xem lại</div>
        </div>
        <div className="admin-stat-card danger" onClick={() => view.setStatus('expired')} style={{ cursor: 'pointer' }}>
          <div className="admin-stat-label">Hết hạn</div>
          <div className="admin-stat-value">{stats.expired}</div>
          <div className="admin-stat-sub">Cần gia hạn hoặc dọn dẹp</div>
        </div>
      </div>

      <div className="admin-tabs">
        {['all', 'running', 'paused', 'expired'].map((status) => (
          <button key={status} className={`admin-tab ${view.status === status ? 'active' : ''}`} onClick={() => view.setStatus(status)}>
            <span>{status === 'all' ? 'Tất cả' : status === 'running' ? 'Đang chạy' : status === 'paused' ? 'Tạm dừng' : 'Hết hạn'}</span>
          </button>
        ))}
      </div>

      <section className="admin-panels single">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Kho voucher</h2>
            <span className="admin-muted">{filteredItems.length} chiến dịch hiển thị</span>
          </div>
          {isLoading ? null : filteredItems.length === 0 ? (
            <AdminStateBlock
              type={search.trim() ? 'search-empty' : 'empty'}
              title={search.trim() ? 'Không tìm thấy chiến dịch phù hợp' : 'Chưa có chiến dịch toàn sàn'}
              description={search.trim() ? 'Thử đổi từ khóa hoặc đặt lại bộ lọc.' : 'Chiến dịch mega sale và voucher toàn sàn sẽ hiển thị tại đây.'}
              actionLabel="Đặt lại"
              onAction={resetView}
            />
          ) : (
            <div className="admin-table" role="table" aria-label="Bảng chiến dịch toàn sàn">
              <div className="admin-table-row admin-table-head promotions" role="row">
                <div role="columnheader"><input type="checkbox" checked={selected.size === filteredItems.length && filteredItems.length > 0} onChange={(e) => setSelected(e.target.checked ? new Set(filteredItems.map((item) => item.id)) : new Set())} /></div>
                <div role="columnheader">Chiến dịch</div>
                <div role="columnheader">Loại giảm giá</div>
                <div role="columnheader">Giá trị</div>
                <div role="columnheader">Điều kiện</div>
                <div role="columnheader">Đã sử dụng</div>
                <div role="columnheader">Lịch trình</div>
                <div role="columnheader">Trạng thái</div>
                <div role="columnheader">Hành động</div>
              </div>
              {pagedItems.map((promo) => {
                const usedPercent = promo.totalIssued > 0 ? Math.min(100, Math.round((promo.usedCount / promo.totalIssued) * 100)) : 0;
                const currentStatus = deriveStatus(promo);
                return (
                  <motion.div
                    key={promo.id}
                    className="admin-table-row promotions"
                    role="row"
                    whileHover={{ y: -1 }}
                    onClick={() => openEdit(promo)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div role="cell" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(promo.id)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(promo.id);
                          else next.delete(promo.id);
                          setSelected(next);
                        }}
                      />
                    </div>
                    <div role="cell">
                      <p className="admin-bold promo-name">{promo.name}</p>
                      <p className="admin-muted promo-code">{promo.code}</p>
                    </div>
                    <div role="cell">{discountTypeLabel(promo.discountType)}</div>
                    <div role="cell">
                      <p className="admin-bold">{promo.discountType === 'percent' ? `${promo.discountValue}%` : formatCurrency(promo.discountValue)}</p>
                      <p className="admin-muted small">Giảm max {formatCurrency(promo.maxDiscount)}</p>
                    </div>
                    <div role="cell">Đơn từ {formatCurrency(promo.minOrderValue)}</div>
                    <div role="cell">
                      <p className="admin-bold">{promo.usedCount}/{promo.totalIssued}</p>
                      <div className="promo-progress-track"><span style={{ width: `${usedPercent}%` }} /></div>
                    </div>
                    <div role="cell" className="admin-muted">{formatDate(promo.startDate)} - {formatDate(promo.endDate)}</div>
                    <div role="cell"><span className={`admin-pill ${promotionStatusClass(currentStatus)}`}>{promotionStatusLabel(currentStatus)}</span></div>
                    <div role="cell" className="admin-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="admin-icon-btn subtle" onClick={() => openEdit(promo)}><Pencil size={16} /></button>
                      <button className="admin-icon-btn subtle" onClick={() => togglePause(promo)}>{promo.status === 'paused' ? <Play size={16} /> : <Pause size={16} />}</button>
                      <button className="admin-icon-btn subtle danger-icon" onClick={() => setDeleteIds([promo.id])}><Trash2 size={16} /></button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
          {!isLoading && filteredItems.length > 0 && (
            <div className="table-footer">
              <span className="table-footer-meta">Hiển thị {startIndex}-{endIndex} của {filteredItems.length} chiến dịch</span>
              <div className="pagination">
                <button className="page-btn" onClick={prev} disabled={page === 1}>Trước</button>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button key={idx + 1} className={`page-btn ${page === idx + 1 ? 'active' : ''}`} onClick={() => setPage(idx + 1)}>
                    {idx + 1}
                  </button>
                ))}
                <button className="page-btn" onClick={next} disabled={page === totalPages}>Tiếp</button>
              </div>
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div className="admin-floating-bar" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 22 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
            <div className="admin-floating-content">
              <span>{selected.size} chiến dịch đã chọn</span>
              <div className="admin-actions">
                <button className="admin-ghost-btn" onClick={() => {
                  const idSet = new Set(selected);
                  const nextRows = rows.map((item) => (idSet.has(item.id) ? { ...item, status: 'paused' as PromotionStatus } : item));
                  setRows(nextRows);
                  nextRows.filter((item) => idSet.has(item.id)).forEach((item) => promotionStore.update(item));
                  setSelected(new Set());
                  pushToast('Đã tạm dừng chiến dịch đã chọn.');
                }}>Tạm dừng</button>
                <button className="admin-ghost-btn danger" onClick={() => setDeleteIds(Array.from(selected))}>Xóa</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AdminConfirmDialog
        open={Boolean(deleteIds?.length)}
        title="Xóa chiến dịch"
        description="Bạn chắc chắn muốn xóa chiến dịch đã chọn? Hành động này không thể hoàn tác."
        selectedNoun="chiến dịch"
        confirmLabel="Xóa chiến dịch"
        danger
        onCancel={() => setDeleteIds(null)}
        onConfirm={deleteSelected}
      />

      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
            <motion.div className="drawer promo-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.25, ease: 'easeOut' }}>
              <div className="drawer-header">
                <div>
                  <p className="drawer-eyebrow">Chiến dịch nền tảng</p>
                  <h3>{editingId ? 'Cập nhật chiến dịch toàn sàn' : 'Tạo chiến dịch toàn sàn'}</h3>
                </div>
                <button className="admin-icon-btn" onClick={() => setIsDrawerOpen(false)} aria-label="Đóng"><X size={16} /></button>
              </div>
              <div className="drawer-body">
                <section className="drawer-section">
                  <h4>Thông tin</h4>
                  <div className="form-grid">
                    <label className="form-field">
                      <span>Tên chiến dịch</span>
                      <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                    </label>
                    <label className="form-field">
                      <span>Mã voucher</span>
                      <input value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase().replace(/\s+/g, '') }))} />
                    </label>
                    <label className="form-field full">
                      <span>Mô tả chiến dịch</span>
                      <textarea rows={3} value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
                    </label>
                  </div>
                </section>
                <section className="drawer-section">
                  <h4>Giảm giá</h4>
                  <div className="form-grid">
                    <label className="form-field">
                      <span>Loại giảm giá</span>
                      <select value={form.discountType} onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value as DiscountType }))}>
                        <option value="percent">Giảm %</option>
                        <option value="fixed">Giảm tiền</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span>Giá trị giảm</span>
                      <input type="number" value={form.discountValue} onChange={(e) => setForm((prev) => ({ ...prev, discountValue: Number(e.target.value) || 0 }))} />
                    </label>
                    <label className="form-field">
                      <span>Giảm tối đa</span>
                      <input type="number" value={form.maxDiscount} onChange={(e) => setForm((prev) => ({ ...prev, maxDiscount: Number(e.target.value) || 0 }))} />
                    </label>
                    <label className="form-field">
                      <span>Đơn tối thiểu</span>
                      <input type="number" value={form.minOrderValue} onChange={(e) => setForm((prev) => ({ ...prev, minOrderValue: Number(e.target.value) || 0 }))} />
                    </label>
                    <label className="form-field">
                      <span>Giới hạn người dùng</span>
                      <input type="number" value={form.userLimit} onChange={(e) => setForm((prev) => ({ ...prev, userLimit: Number(e.target.value) || 1 }))} />
                    </label>
                    <label className="form-field">
                      <span>Tổng số lượng phát hành</span>
                      <input type="number" value={form.totalIssued} onChange={(e) => setForm((prev) => ({ ...prev, totalIssued: Number(e.target.value) || 0 }))} />
                    </label>
                    <label className="form-field">
                      <span>Ngày bắt đầu</span>
                      <input type="date" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} />
                    </label>
                    <label className="form-field">
                      <span>Ngày kết thúc</span>
                      <input type="date" value={form.endDate} onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))} />
                    </label>
                    <label className="form-field">
                      <span>Trạng thái</span>
                      <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as PromotionStatus }))}>
                        <option value="running">Đang chạy</option>
                        <option value="paused">Tạm dừng</option>
                      </select>
                    </label>
                  </div>
                </section>
              </div>
              <div className="drawer-footer">
                <button className="admin-ghost-btn" onClick={() => setIsDrawerOpen(false)}>Hủy</button>
                <button className="admin-primary-btn" onClick={savePromotion}>Lưu chiến dịch</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {toast && <div className="toast success">{toast}</div>}
    </AdminLayout>
  );
};

export default AdminPromotions;
