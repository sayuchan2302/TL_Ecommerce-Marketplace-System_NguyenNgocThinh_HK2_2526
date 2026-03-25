import './Vendor.css';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link2, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import VendorLayout from './VendorLayout';
import {
  PanelDrawerFooter,
  PanelDrawerHeader,
  PanelDrawerSection,
  PanelFloatingBar,
  PanelSearchField,
  PanelStatsGrid,
  PanelTableFooter,
  PanelTabs,
  PanelViewSummary,
} from '../../components/Panel/PanelPrimitives';
import { AdminStateBlock, AdminToast } from '../Admin/AdminStateBlocks';
import AdminConfirmDialog from '../Admin/AdminConfirmDialog';

type VoucherStatus = 'running' | 'paused' | 'draft';
type DiscountType = 'percent' | 'fixed';

interface ShopVoucher {
  id: string;
  name: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number;
  usedCount: number;
  totalIssued: number;
  status: VoucherStatus;
  endDate: string;
  description: string;
}

type DeleteState = {
  ids: string[];
  selectedItems: string[];
  title: string;
  description: string;
  confirmLabel: string;
};

const INITIAL_VOUCHERS: ShopVoucher[] = [
  { id: 'sv-1', name: 'Flash sale áo thun', code: 'TEE15', discountType: 'percent', discountValue: 15, minOrderValue: 299000, usedCount: 182, totalIssued: 500, status: 'running', endDate: '2026-04-10', description: 'Ưu đãi đẩy sell-through cho nhóm áo thun bán nhanh.' },
  { id: 'sv-2', name: 'Voucher khách quay lại', code: 'RETURN50', discountType: 'fixed', discountValue: 50000, minOrderValue: 599000, usedCount: 64, totalIssued: 250, status: 'running', endDate: '2026-04-20', description: 'Giữ chân khách cũ với mức giảm cố định cho đơn giá trị cao.' },
  { id: 'sv-3', name: 'Bản nháp cuối tuần', code: 'WKND10', discountType: 'percent', discountValue: 10, minOrderValue: 399000, usedCount: 0, totalIssued: 600, status: 'draft', endDate: '2026-05-01', description: 'Campaign cuối tuần chờ chốt lịch chạy từ đội bán hàng.' },
  { id: 'sv-4', name: 'Đẩy hàng tồn thấp', code: 'LAST30K', discountType: 'fixed', discountValue: 30000, minOrderValue: 249000, usedCount: 18, totalIssued: 150, status: 'paused', endDate: '2026-04-05', description: 'Voucher xử lý tồn kho cho nhóm SKU sắp ngừng bán.' },
];

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'running', label: 'Đang chạy' },
  { key: 'paused', label: 'Tạm dừng' },
  { key: 'draft', label: 'Bản nháp' },
] as const;

const emptyVoucher = (): ShopVoucher => ({
  id: '',
  name: '',
  code: '',
  discountType: 'percent',
  discountValue: 10,
  minOrderValue: 0,
  usedCount: 0,
  totalIssued: 100,
  status: 'draft',
  endDate: '',
  description: '',
});

const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')} đ`;

const VendorPromotions = () => {
  const [vouchers, setVouchers] = useState<ShopVoucher[]>(INITIAL_VOUCHERS);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | VoucherStatus>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [voucherForm, setVoucherForm] = useState<ShopVoucher>(emptyVoucher());
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);
  const [toast, setToast] = useState('');
  const perPage = 6;
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      vouchers.filter((voucher) => {
        const matchesStatus = activeTab === 'all' || voucher.status === activeTab;
        const keyword = search.trim().toLowerCase();
        const matchesSearch = !keyword || `${voucher.name} ${voucher.code} ${voucher.description}`.toLowerCase().includes(keyword);
        return matchesStatus && matchesSearch;
      }),
    [activeTab, search, vouchers],
  );

  const paged = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page]);

  const totalPages = Math.max(Math.ceil(filtered.length / perPage), 1);

  const stats = useMemo(() => ({
    running: vouchers.filter((voucher) => voucher.status === 'running').length,
    paused: vouchers.filter((voucher) => voucher.status === 'paused').length,
    draft: vouchers.filter((voucher) => voucher.status === 'draft').length,
    totalUsage: vouchers.reduce((sum, voucher) => sum + voucher.usedCount, 0),
  }), [vouchers]);

  const pushToast = (message: string) => {
    setToast(message);
    window.clearTimeout((pushToast as typeof pushToast & { timer?: number }).timer);
    (pushToast as typeof pushToast & { timer?: number }).timer = window.setTimeout(() => setToast(''), 2600);
  };

  const resetCurrentView = () => {
    setSearch('');
    setActiveTab('all');
    setSelected(new Set());
    setPage(1);
  };

  const shareCurrentView = async () => {
    await navigator.clipboard.writeText(window.location.href);
    pushToast('Đã sao chép bộ lọc hiện tại của voucher shop');
  };

  const toggleVoucher = (ids: string[], nextStatus?: VoucherStatus) => {
    setVouchers((current) =>
      current.map((voucher) => {
        if (!ids.includes(voucher.id)) return voucher;
        if (nextStatus) return { ...voucher, status: nextStatus };
        return { ...voucher, status: voucher.status === 'running' ? 'paused' : 'running' };
      }),
    );
    setSelected(new Set());
    pushToast('Đã cập nhật trạng thái voucher shop');
  };

  const openCreate = () => {
    setVoucherForm(emptyVoucher());
    setDrawerOpen(true);
  };

  const openEdit = (id: string) => {
    const current = vouchers.find((voucher) => voucher.id === id);
    if (!current) return;
    setVoucherForm(current);
    setDrawerOpen(true);
  };

  const saveVoucher = () => {
    if (!voucherForm.name.trim() || !voucherForm.code.trim()) {
      pushToast('Tên voucher và mã giảm giá là bắt buộc');
      return;
    }
    if (voucherForm.id) {
      setVouchers((current) => current.map((voucher) => (voucher.id === voucherForm.id ? voucherForm : voucher)));
      pushToast('Đã cập nhật voucher shop');
    } else {
      setVouchers((current) => [{ ...voucherForm, id: `sv-${Date.now()}` }, ...current]);
      pushToast('Đã tạo voucher shop mới');
    }
    setDrawerOpen(false);
  };

  const requestDelete = (ids: string[]) => {
    const items = vouchers.filter((voucher) => ids.includes(voucher.id));
    setDeleteState({
      ids,
      selectedItems: items.map((item) => item.name),
      title: ids.length > 1 ? 'Xóa các voucher đã chọn' : 'Xóa voucher shop',
      description: 'Voucher sẽ bị gỡ khỏi seller panel và không còn được áp dụng cho sản phẩm của shop.',
      confirmLabel: 'Xóa voucher',
    });
  };

  const confirmDelete = () => {
    if (!deleteState) return;
    const ids = new Set(deleteState.ids);
    setVouchers((current) => current.filter((voucher) => !ids.has(voucher.id)));
    setSelected(new Set());
    setDeleteState(null);
    pushToast('Đã xóa voucher shop');
  };

  const statItems = [
    {
      key: 'all',
      label: 'Tổng voucher',
      value: vouchers.length,
      sub: `Lượt sử dụng: ${stats.totalUsage}`,
      onClick: () => setActiveTab('all'),
    },
    {
      key: 'running',
      label: 'Đang chạy',
      value: stats.running,
      sub: 'Voucher đang tác động doanh thu',
      tone: 'success',
      onClick: () => setActiveTab('running'),
    },
    {
      key: 'paused',
      label: 'Tạm dừng',
      value: stats.paused,
      sub: 'Chờ kích hoạt lại khi cần',
      tone: 'warning',
      onClick: () => setActiveTab('paused'),
    },
    {
      key: 'draft',
      label: 'Bản nháp',
      value: stats.draft,
      sub: 'Chờ chốt lịch chạy',
      tone: 'info',
      onClick: () => setActiveTab('draft'),
    },
  ] as const;

  const tabItems = TABS.map((tab) => ({ key: tab.key, label: tab.label }));
  const summaryChips = [
    ...(activeTab !== 'all'
      ? [{ key: 'status', label: `Trạng thái: ${TABS.find((tab) => tab.key === activeTab)?.label || 'Tất cả'}` }]
      : []),
    ...(search.trim() ? [{ key: 'query', label: `Từ khóa: ${search.trim()}` }] : []),
  ];

  return (
    <VendorLayout
      title="Voucher shop và doanh thu ưu đãi"
      breadcrumbs={[{ label: 'Voucher shop' }, { label: 'Khuyến mãi riêng' }]}
      actions={(
        <>
          <PanelSearchField
            placeholder="Tìm tên voucher hoặc mã giảm giá"
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
          <button className="admin-ghost-btn" onClick={() => void shareCurrentView()}>
            <Link2 size={16} />
            Chia sẻ bộ lọc
          </button>
          <button className="admin-ghost-btn" onClick={resetCurrentView}>Đặt lại</button>
          <button className="admin-primary-btn vendor-admin-primary" onClick={openCreate}>
            <Plus size={16} />
            Tạo voucher
          </button>
        </>
      )}
    >
      <PanelStatsGrid items={[...statItems]} accentClassName="vendor-stat-button" />

      <PanelTabs
        items={tabItems}
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'all' | VoucherStatus)}
        accentClassName="vendor-active-tab"
      />

      {(activeTab !== 'all' || Boolean(search.trim())) && (
        <PanelViewSummary chips={summaryChips} clearLabel="Xóa bộ lọc" onClear={resetCurrentView} />
      )}

      <section className="admin-panels single">
        <div className="admin-panel">
          {filtered.length === 0 ? (
            <AdminStateBlock
              type={search.trim() ? 'search-empty' : 'empty'}
              title={search.trim() ? 'Không có voucher phù hợp' : 'Chưa có voucher shop'}
              description={search.trim() ? 'Thử đổi từ khóa hoặc chuyển tab khác để xem danh sách ưu đãi.' : 'Khi shop tạo voucher riêng, danh sách sẽ xuất hiện tại đây.'}
              actionLabel={search.trim() ? 'Đặt lại bộ lọc' : 'Tạo voucher'}
              onAction={search.trim() ? resetCurrentView : openCreate}
            />
          ) : (
            <>
              <div className="admin-table" role="table" aria-label="Bảng voucher shop">
                <div className="admin-table-row vendor-promotions admin-table-head" role="row">
                  <div role="columnheader">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((item) => item.id)) : new Set())}
                    />
                  </div>
                  <div role="columnheader">Voucher</div>
                  <div role="columnheader">Loại giảm</div>
                  <div role="columnheader">Giá trị</div>
                  <div role="columnheader">Điều kiện</div>
                  <div role="columnheader">Đã dùng</div>
                  <div role="columnheader">Hết hạn</div>
                  <div role="columnheader">Trạng thái</div>
                  <div role="columnheader">Hành động</div>
                </div>

                {paged.map((voucher, index) => {
                  const usedPercent = voucher.totalIssued > 0 ? Math.min(100, Math.round((voucher.usedCount / voucher.totalIssued) * 100)) : 0;
                  return (
                    <motion.div
                      key={voucher.id}
                      className="admin-table-row vendor-promotions"
                      role="row"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.16) }}
                      whileHover={{ y: -1 }}
                      onClick={() => openEdit(voucher.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div role="cell" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(voucher.id)}
                          onChange={(e) => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(voucher.id);
                            else next.delete(voucher.id);
                            setSelected(next);
                          }}
                        />
                      </div>
                      <div role="cell">
                        <p className="admin-bold promo-name">{voucher.name}</p>
                        <p className="admin-muted promo-code">{voucher.code}</p>
                      </div>
                      <div role="cell">{voucher.discountType === 'percent' ? 'Phần trăm' : 'Giảm tiền'}</div>
                      <div role="cell" className="admin-bold">
                        {voucher.discountType === 'percent' ? `${voucher.discountValue}%` : formatCurrency(voucher.discountValue)}
                      </div>
                      <div role="cell">Đơn từ {formatCurrency(voucher.minOrderValue)}</div>
                      <div role="cell">
                        <p className="admin-bold">{voucher.usedCount}/{voucher.totalIssued}</p>
                        <div className="promo-progress-track"><span style={{ width: `${usedPercent}%` }} /></div>
                      </div>
                      <div role="cell" className="admin-muted">{voucher.endDate}</div>
                      <div role="cell">
                        <span className={`admin-pill ${voucher.status === 'running' ? 'success' : voucher.status === 'paused' ? 'pending' : 'neutral'}`}>
                          {voucher.status === 'running' ? 'Đang chạy' : voucher.status === 'paused' ? 'Tạm dừng' : 'Bản nháp'}
                        </span>
                      </div>
                      <div role="cell" className="admin-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="admin-icon-btn subtle" onClick={() => openEdit(voucher.id)} title="Chỉnh sửa voucher">
                          <Pencil size={16} />
                        </button>
                        <button className="admin-icon-btn subtle" onClick={() => toggleVoucher([voucher.id])} title="Đổi trạng thái">
                          {voucher.status === 'running' ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <button className="admin-icon-btn subtle danger-icon" onClick={() => requestDelete([voucher.id])} title="Xóa voucher">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <PanelTableFooter
                meta={`Hiển thị ${(page - 1) * perPage + 1}-${Math.min(page * perPage, filtered.length)} trên ${filtered.length} voucher`}
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                activePageClassName="vendor-active-page"
                nextLabel="Sau"
              />
            </>
          )}
        </div>
      </section>

      <PanelFloatingBar show={selected.size > 0} className="vendor-floating-bar">
        <div className="admin-floating-content">
          <span>Đã chọn {selected.size} voucher</span>
          <div className="admin-actions">
            <button className="admin-ghost-btn" onClick={() => toggleVoucher(Array.from(selected), 'paused')}>Tạm dừng</button>
            <button className="admin-ghost-btn" onClick={() => toggleVoucher(Array.from(selected), 'running')}>Kích hoạt</button>
            <button className="admin-ghost-btn danger" onClick={() => requestDelete(Array.from(selected))}>Xóa đã chọn</button>
          </div>
        </div>
      </PanelFloatingBar>

      <AdminConfirmDialog
        open={Boolean(deleteState)}
        title={deleteState?.title || 'Xóa voucher'}
        description={deleteState?.description || ''}
        selectedItems={deleteState?.selectedItems}
        selectedNoun="voucher"
        confirmLabel={deleteState?.confirmLabel || 'Xóa'}
        danger
        onCancel={() => setDeleteState(null)}
        onConfirm={confirmDelete}
      />

      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="drawer">
            <PanelDrawerHeader
              eyebrow="Voucher shop"
              title={voucherForm.id ? 'Cập nhật voucher' : 'Tạo voucher mới'}
              onClose={() => setDrawerOpen(false)}
              closeLabel="Đóng biểu mẫu voucher"
            />
            <div className="drawer-body">
              <PanelDrawerSection title="Nhận diện ưu đãi">
                <div className="form-grid">
                  <label className="form-field">
                    <span>Tên voucher</span>
                    <input value={voucherForm.name} onChange={(e) => setVoucherForm((current) => ({ ...current, name: e.target.value }))} />
                  </label>
                  <label className="form-field">
                    <span>Mã giảm giá</span>
                    <input value={voucherForm.code} onChange={(e) => setVoucherForm((current) => ({ ...current, code: e.target.value.toUpperCase().replace(/\s+/g, '') }))} />
                  </label>
                  <label className="form-field full">
                    <span>Mô tả ngắn</span>
                    <textarea rows={3} value={voucherForm.description} onChange={(e) => setVoucherForm((current) => ({ ...current, description: e.target.value }))} />
                  </label>
                </div>
              </PanelDrawerSection>
              <PanelDrawerSection title="Cấu hình khuyến mãi">
                <div className="form-grid">
                  <label className="form-field">
                    <span>Loại giảm</span>
                    <select value={voucherForm.discountType} onChange={(e) => setVoucherForm((current) => ({ ...current, discountType: e.target.value as DiscountType }))}>
                      <option value="percent">Giảm theo phần trăm</option>
                      <option value="fixed">Giảm số tiền cố định</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Giá trị giảm</span>
                    <input type="number" value={voucherForm.discountValue} onChange={(e) => setVoucherForm((current) => ({ ...current, discountValue: Number(e.target.value || 0) }))} />
                  </label>
                  <label className="form-field">
                    <span>Đơn tối thiểu</span>
                    <input type="number" value={voucherForm.minOrderValue} onChange={(e) => setVoucherForm((current) => ({ ...current, minOrderValue: Number(e.target.value || 0) }))} />
                  </label>
                  <label className="form-field">
                    <span>Tổng phát hành</span>
                    <input type="number" value={voucherForm.totalIssued} onChange={(e) => setVoucherForm((current) => ({ ...current, totalIssued: Number(e.target.value || 0) }))} />
                  </label>
                  <label className="form-field">
                    <span>Hạn dùng</span>
                    <input type="date" value={voucherForm.endDate} onChange={(e) => setVoucherForm((current) => ({ ...current, endDate: e.target.value }))} />
                  </label>
                  <label className="form-field">
                    <span>Trạng thái</span>
                    <select value={voucherForm.status} onChange={(e) => setVoucherForm((current) => ({ ...current, status: e.target.value as VoucherStatus }))}>
                      <option value="running">Đang chạy</option>
                      <option value="paused">Tạm dừng</option>
                      <option value="draft">Bản nháp</option>
                    </select>
                  </label>
                </div>
              </PanelDrawerSection>
            </div>
            <PanelDrawerFooter>
              <button className="admin-ghost-btn" onClick={() => setDrawerOpen(false)}>Hủy</button>
              <button className="admin-primary-btn vendor-admin-primary" onClick={saveVoucher}>Lưu voucher</button>
            </PanelDrawerFooter>
          </div>
        </>
      )}

      <AdminToast toast={toast} />
    </VendorLayout>
  );
};

export default VendorPromotions;
