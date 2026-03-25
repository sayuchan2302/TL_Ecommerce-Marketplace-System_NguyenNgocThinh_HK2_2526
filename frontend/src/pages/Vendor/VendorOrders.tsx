import './Vendor.css';
import { startTransition, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Filter, Link2, ShieldCheck, Truck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import VendorLayout from './VendorLayout';
import {
  PanelFloatingBar,
  PanelSearchField,
  PanelStatsGrid,
  PanelTableFooter,
  PanelTabs,
  PanelViewSummary,
} from '../../components/Panel/PanelPrimitives';
import {
  formatVendorOrderDate,
  getVendorOrderStatusLabel,
  getVendorOrderStatusTone,
} from './vendorOrderPresentation';
import { formatCurrency } from '../../services/commissionService';
import { vendorPortalService, type VendorOrderSummary } from '../../services/vendorPortalService';
import { useToast } from '../../contexts/ToastContext';
import { AdminStateBlock } from '../Admin/AdminStateBlocks';
import AdminConfirmDialog from '../Admin/AdminConfirmDialog';

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'processing', label: 'Đang xử lý' },
  { key: 'shipping', label: 'Đang giao' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy' },
] as const;

type PendingAction = {
  ids: string[];
  nextStatus: 'CONFIRMED' | 'SHIPPED';
  title: string;
  description: string;
  confirmLabel: string;
  selectedItems: string[];
};

const VendorOrders = () => {
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('status') || 'all';
  const [orders, setOrders] = useState<VendorOrderSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const perPage = 8;

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const next = await vendorPortalService.getOrders();
        if (!active) return;
        startTransition(() => setOrders(next));
      } catch (err: unknown) {
        if (!active) return;
        addToast((err as Error)?.message || 'Không tải được danh sách đơn hàng con', 'error');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [addToast]);

  const filteredOrders = useMemo(() => {
    let next = orders;

    if (activeTab !== 'all') {
      if (activeTab === 'processing') {
        next = next.filter((order) => order.status === 'packing');
      } else if (activeTab === 'completed') {
        next = next.filter((order) => order.status === 'done');
      } else {
        next = next.filter((order) => order.status === activeTab);
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      next = next.filter((order) =>
        order.id.toLowerCase().includes(query) ||
        order.customer.toLowerCase().includes(query) ||
        order.email.toLowerCase().includes(query),
      );
    }

    return next;
  }, [activeTab, orders, searchQuery]);

  const tabCounts = useMemo(() => ({
    all: orders.length,
    pending: orders.filter((order) => order.status === 'pending').length,
    processing: orders.filter((order) => order.status === 'packing').length,
    shipping: orders.filter((order) => order.status === 'shipping').length,
    completed: orders.filter((order) => order.status === 'done').length,
    cancelled: orders.filter((order) => order.status === 'canceled').length,
  }), [orders]);

  const totalPages = Math.max(Math.ceil(filteredOrders.length / perPage), 1);
  const safePage = Math.min(page, totalPages);
  const startIndex = filteredOrders.length === 0 ? 0 : (safePage - 1) * perPage + 1;
  const endIndex = Math.min(safePage * perPage, filteredOrders.length);

  const paginatedOrders = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return filteredOrders.slice(start, start + perPage);
  }, [filteredOrders, safePage]);

  const hasViewContext = activeTab !== 'all' || Boolean(searchQuery.trim());

  const handleTabChange = (key: string) => {
    setSearchParams({ status: key });
    setPage(1);
    setSelected(new Set());
  };

  const resetCurrentView = () => {
    setSearchQuery('');
    setSearchParams({ status: 'all' });
    setPage(1);
    setSelected(new Set());
  };

  const shareCurrentView = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('status', activeTab);
    if (searchQuery.trim()) url.searchParams.set('q', searchQuery.trim());
    await navigator.clipboard.writeText(url.toString());
    addToast('Đã sao chép bộ lọc hiện tại của đơn hàng shop', 'success');
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(filteredOrders.map((order) => order.id)));
      return;
    }
    setSelected(new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  const askStatusUpdate = (ids: string[], nextStatus: 'CONFIRMED' | 'SHIPPED') => {
    const selectedOrders = orders.filter((order) => ids.includes(order.id));
    if (selectedOrders.length === 0) return;

    setPendingAction({
      ids,
      nextStatus,
      title: nextStatus === 'CONFIRMED' ? 'Xác nhận đơn hàng con' : 'Bàn giao đơn cho vận chuyển',
      description:
        nextStatus === 'CONFIRMED'
          ? 'Các đơn hàng con đã chọn sẽ chuyển sang trạng thái đã xác nhận để đội shop bắt đầu xử lý.'
          : 'Các đơn hàng con đã chọn sẽ chuyển sang trạng thái đang giao để đồng bộ fulfillment.',
      confirmLabel: nextStatus === 'CONFIRMED' ? 'Xác nhận đơn' : 'Bàn giao vận chuyển',
      selectedItems: selectedOrders.map((order) => order.id),
    });
  };

  const performStatusUpdate = async (orderId: string, status: 'CONFIRMED' | 'SHIPPED') => {
    setUpdatingId(orderId);
    await vendorPortalService.updateOrderStatus(orderId, status);
    setOrders((current) =>
      current.map((order) => {
        if (order.id !== orderId) return order;
        if (status === 'CONFIRMED') return { ...order, status: 'packing' };
        return { ...order, status: 'shipping' };
      }),
    );
    setUpdatingId(null);
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) return;

    const ids = pendingAction.ids;
    try {
      setUpdatingId(ids[0] ?? 'bulk');
      await Promise.all(ids.map((id) => performStatusUpdate(id, pendingAction.nextStatus)));
      setSelected(new Set());
      addToast('Đã cập nhật trạng thái đơn hàng con', 'success');
    } catch (err: unknown) {
      addToast((err as Error)?.message || 'Không thể cập nhật trạng thái đơn hàng con', 'error');
    } finally {
      setUpdatingId(null);
      setPendingAction(null);
    }
  };

  const actionablePendingIds = Array.from(selected).filter((id) => orders.find((order) => order.id === id)?.status === 'pending');
  const actionablePackingIds = Array.from(selected).filter((id) => orders.find((order) => order.id === id)?.status === 'packing');

  const statItems = [
    {
      key: 'all',
      label: 'Tổng đơn hàng con',
      value: tabCounts.all,
      sub: 'Toàn bộ fulfillment của shop',
      onClick: () => handleTabChange('all'),
    },
    {
      key: 'pending',
      label: 'Chờ xác nhận',
      value: tabCounts.pending,
      sub: 'Cần shop kiểm tra ngay',
      tone: 'warning',
      onClick: () => handleTabChange('pending'),
    },
    {
      key: 'shipping',
      label: 'Đang giao',
      value: tabCounts.shipping,
      sub: 'Đang bàn giao cho đối tác vận chuyển',
      tone: 'info',
      onClick: () => handleTabChange('shipping'),
    },
    {
      key: 'completed',
      label: 'Hoàn thành',
      value: tabCounts.completed,
      sub: 'Đơn đã kết toán cho shop',
      tone: 'success',
      onClick: () => handleTabChange('completed'),
    },
  ] as const;

  const tabItems = TABS.map((tab) => ({
    key: tab.key,
    label: tab.label,
    count: tabCounts[tab.key],
  }));

  const summaryChips = [
    ...(activeTab !== 'all'
      ? [{ key: 'status', label: `Trạng thái: ${TABS.find((tab) => tab.key === activeTab)?.label || 'Tất cả'}` }]
      : []),
    ...(searchQuery.trim() ? [{ key: 'query', label: `Từ khóa: ${searchQuery.trim()}` }] : []),
  ];

  return (
    <VendorLayout
      title="Đơn hàng shop"
      breadcrumbs={[{ label: 'Đơn hàng shop' }, { label: 'Xử lý đơn hàng con' }]}
      actions={(
        <>
          <PanelSearchField
            placeholder="Tìm theo mã đơn, tên khách hoặc email"
            value={searchQuery}
            onChange={(value) => {
              setSearchQuery(value);
              setPage(1);
            }}
          />
          <button className="admin-ghost-btn" onClick={() => void shareCurrentView()}>
            <Link2 size={16} />
            Chia sẻ bộ lọc
          </button>
          <button className="admin-ghost-btn" onClick={resetCurrentView}>
            <Filter size={16} />
            Đặt lại
          </button>
        </>
      )}
    >
      <PanelStatsGrid items={[...statItems]} accentClassName="vendor-stat-button" />

      <PanelTabs items={tabItems} activeKey={activeTab} onChange={handleTabChange} accentClassName="vendor-active-tab" />

      {hasViewContext && <PanelViewSummary chips={summaryChips} clearLabel="Xóa bộ lọc" onClear={resetCurrentView} />}

      <section className="admin-panels single">
        <div className="admin-panel">
          {loading ? (
            <AdminStateBlock
              type="empty"
              title="Đang tải đơn hàng con"
              description="Dữ liệu fulfillment của shop đang được đồng bộ từ marketplace."
            />
          ) : filteredOrders.length === 0 ? (
            <AdminStateBlock
              type={searchQuery.trim() ? 'search-empty' : 'empty'}
              title={searchQuery.trim() ? 'Không tìm thấy đơn hàng phù hợp' : 'Chưa có đơn hàng con phù hợp'}
              description={
                searchQuery.trim()
                  ? 'Thử đổi từ khóa hoặc quay về toàn bộ đơn hàng để tiếp tục xử lý fulfillment.'
                  : 'Khi shop phát sinh sub-order mới, danh sách xử lý sẽ xuất hiện tại đây.'
              }
              actionLabel={searchQuery.trim() ? 'Đặt lại bộ lọc' : undefined}
              onAction={searchQuery.trim() ? resetCurrentView : undefined}
            />
          ) : (
            <>
              <div className="admin-table" role="table" aria-label="Bảng đơn hàng con của shop">
                <div className="admin-table-row vendor-orders admin-table-head" role="row">
                  <div role="columnheader">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả đơn hàng"
                      checked={selected.size === filteredOrders.length && filteredOrders.length > 0}
                      onChange={(event) => toggleSelectAll(event.target.checked)}
                    />
                  </div>
                  <div role="columnheader">Đơn hàng</div>
                  <div role="columnheader">Khách hàng</div>
                  <div role="columnheader">Tổng tiền</div>
                  <div role="columnheader">Phí sàn</div>
                  <div role="columnheader">Thực nhận</div>
                  <div role="columnheader">Trạng thái</div>
                  <div role="columnheader">Vận hành</div>
                  <div role="columnheader">Hành động</div>
                </div>

                {paginatedOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    className="admin-table-row vendor-orders"
                    role="row"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.025, 0.14) }}
                    whileHover={{ y: -1 }}
                  >
                    <div role="cell">
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${order.id}`}
                        checked={selected.has(order.id)}
                        onChange={(event) => toggleOne(order.id, event.target.checked)}
                      />
                    </div>
                    <div role="cell">
                      <div className="admin-bold">{order.id}</div>
                      <div className="admin-muted small">{formatVendorOrderDate(order.date)}</div>
                    </div>
                    <div role="cell">
                      <div className="admin-bold">{order.customer}</div>
                      <div className="admin-muted small">{order.items} sản phẩm • {order.email}</div>
                    </div>
                    <div role="cell" className="admin-bold">{formatCurrency(order.total)}</div>
                    <div role="cell"><span className="badge amber">-{formatCurrency(order.commissionFee)}</span></div>
                    <div role="cell"><span className="badge green">{formatCurrency(order.vendorPayout)}</span></div>
                    <div role="cell">
                      <span className={`admin-pill ${getVendorOrderStatusTone(order.status)}`}>
                        {getVendorOrderStatusLabel(order.status)}
                      </span>
                    </div>
                    <div role="cell" className="vendor-order-ops">
                      {order.status === 'shipping' ? <Truck size={14} /> : <ShieldCheck size={14} />}
                      <span>{order.status === 'shipping' ? 'Đang giao cho đối tác vận chuyển' : 'Chờ shop xử lý'}</span>
                    </div>
                    <div role="cell" className="admin-actions">
                      {order.status === 'pending' && (
                        <button
                          className="admin-primary-btn vendor-admin-primary vendor-inline-btn"
                          onClick={() => askStatusUpdate([order.id], 'CONFIRMED')}
                          disabled={updatingId === order.id || updatingId === 'bulk'}
                        >
                          Xác nhận
                        </button>
                      )}
                      {order.status === 'packing' && (
                        <button
                          className="admin-primary-btn vendor-admin-primary vendor-inline-btn"
                          onClick={() => askStatusUpdate([order.id], 'SHIPPED')}
                          disabled={updatingId === order.id || updatingId === 'bulk'}
                        >
                          Bàn giao
                        </button>
                      )}
                      <Link to={`/vendor/orders/${order.id}`} className="admin-ghost-btn vendor-inline-link">
                        Chi tiết
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>

              <PanelTableFooter
                meta={`Hiển thị ${startIndex}-${endIndex} trên ${filteredOrders.length} đơn hàng con`}
                page={safePage}
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
          <span>Đã chọn {selected.size} đơn hàng con</span>
          <div className="admin-actions">
            {actionablePendingIds.length > 0 && (
              <button className="admin-ghost-btn" onClick={() => askStatusUpdate(actionablePendingIds, 'CONFIRMED')}>
                Xác nhận đã chọn
              </button>
            )}
            {actionablePackingIds.length > 0 && (
              <button className="admin-ghost-btn" onClick={() => askStatusUpdate(actionablePackingIds, 'SHIPPED')}>
                Bàn giao đã chọn
              </button>
            )}
            <button className="admin-ghost-btn" onClick={() => setSelected(new Set())}>Bỏ chọn</button>
          </div>
        </div>
      </PanelFloatingBar>

      <AdminConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.title || 'Cập nhật trạng thái'}
        description={pendingAction?.description || ''}
        selectedItems={pendingAction?.selectedItems}
        selectedNoun="đơn hàng"
        confirmLabel={pendingAction?.confirmLabel || 'Xác nhận'}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void confirmPendingAction()}
      />
    </VendorLayout>
  );
};

export default VendorOrders;
