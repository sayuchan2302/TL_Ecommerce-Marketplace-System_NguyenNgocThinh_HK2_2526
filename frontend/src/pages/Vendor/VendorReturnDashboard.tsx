import './Vendor.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Eye, PackageCheck, ShieldCheck, XCircle } from 'lucide-react';
import VendorLayout from './VendorLayout';
import { AdminStateBlock } from '../Admin/AdminStateBlocks';
import {
  PanelDrawerFooter,
  PanelDrawerHeader,
  PanelDrawerSection,
  PanelSearchField,
  PanelStatsGrid,
  PanelTabs,
  PanelTableFooter,
} from '../../components/Panel/PanelPrimitives';
import Drawer from '../../components/Drawer/Drawer';
import { returnService, type ReturnRequest } from '../../services/returnService';
import { useToast } from '../../contexts/ToastContext';
import { getUiErrorMessage } from '../../utils/errorMessage';
import { toDisplayOrderCode, toDisplayReturnCode } from '../../utils/displayCode';

type VendorReturnTab = 'all' | 'needsAction' | 'inTransit' | 'toInspect' | 'disputed';

const PAGE_SIZE = 10;
const FETCH_SIZE = 100;

const TABS: Array<{ key: VendorReturnTab; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'needsAction', label: 'Cần xử lý' },
  { key: 'inTransit', label: 'Đang hoàn gửi' },
  { key: 'toInspect', label: 'Chờ kiểm hàng' },
  { key: 'disputed', label: 'Tranh chấp' },
];

const statusConfig: Record<ReturnRequest['status'], { label: string; className: string }> = {
  PENDING_VENDOR: { label: 'Chờ phản hồi', className: 'admin-pill pending' },
  ACCEPTED: { label: 'Đã chấp nhận', className: 'admin-pill neutral' },
  SHIPPING: { label: 'Đang hoàn gửi', className: 'admin-pill neutral' },
  RECEIVED: { label: 'Đã nhận hàng hoàn', className: 'admin-pill warning' },
  COMPLETED: { label: 'Đã hoàn tiền', className: 'admin-pill success' },
  REJECTED: { label: 'Từ chối', className: 'admin-pill error' },
  DISPUTED: { label: 'Tranh chấp', className: 'admin-pill error' },
  CANCELLED: { label: 'Đã hủy', className: 'admin-pill neutral' },
};

const reasonLabel: Record<string, string> = {
  SIZE: 'Sai kích cỡ',
  DEFECT: 'Lỗi sản phẩm',
  CHANGE: 'Nhu cầu đổi',
  OTHER: 'Lý do khác',
};

const resolutionLabel: Record<string, string> = {
  REFUND: 'Hoàn tiền',
  EXCHANGE: 'Đổi sản phẩm',
};

const formatVnd = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);

const getRefundAmount = (request: ReturnRequest) => {
  if (typeof request.refundAmount === 'number') return request.refundAmount;
  return request.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
};

const matchesTab = (tab: VendorReturnTab, request: ReturnRequest) => {
  if (tab === 'all') return true;
  if (tab === 'needsAction') return request.status === 'PENDING_VENDOR' || request.status === 'RECEIVED';
  if (tab === 'inTransit') return request.status === 'SHIPPING';
  if (tab === 'toInspect') return request.status === 'RECEIVED';
  if (tab === 'disputed') return request.status === 'DISPUTED';
  return true;
};

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const VendorReturnDashboard = () => {
  const { addToast } = useToast();
  const [allReturns, setAllReturns] = useState<ReturnRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<VendorReturnTab>('needsAction');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [detailItem, setDetailItem] = useState<ReturnRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchAllReturns = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const firstPage = await returnService.listVendor({ page: 0, size: FETCH_SIZE });
      const records = [...(firstPage.content || [])];
      const totalPages = Math.max(Number(firstPage.totalPages || 1), 1);

      for (let currentPage = 1; currentPage < totalPages; currentPage += 1) {
        const nextPage = await returnService.listVendor({ page: currentPage, size: FETCH_SIZE });
        records.push(...(nextPage.content || []));
      }

      setAllReturns(records);
    } catch (error: unknown) {
      setAllReturns([]);
      setLoadError(getUiErrorMessage(error, 'Không tải được danh sách hoàn trả của gian hàng.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAllReturns();
  }, [fetchAllReturns]);

  const tabCounts = useMemo(
    () => ({
      all: allReturns.length,
      needsAction: allReturns.filter((item) => item.status === 'PENDING_VENDOR' || item.status === 'RECEIVED').length,
      inTransit: allReturns.filter((item) => item.status === 'SHIPPING').length,
      toInspect: allReturns.filter((item) => item.status === 'RECEIVED').length,
      disputed: allReturns.filter((item) => item.status === 'DISPUTED').length,
    }),
    [allReturns],
  );

  const filteredItems = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return allReturns.filter((item) => {
      if (!matchesTab(activeTab, item)) return false;
      if (!keyword) return true;

      const searchable = [
        item.id,
        item.code || '',
        item.orderCode || '',
        item.customerName || '',
        item.customerEmail || '',
        item.storeName || '',
        reasonLabel[item.reason] || item.reason,
      ].join(' ').toLowerCase();

      return searchable.includes(keyword);
    });
  }, [activeTab, allReturns, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery]);

  const totalPages = Math.max(Math.ceil(filteredItems.length / PAGE_SIZE), 1);
  const safePage = Math.min(page, totalPages);
  const startIndex = filteredItems.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(filteredItems.length, safePage * PAGE_SIZE);
  const pagedItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const applyRowUpdate = (updated: ReturnRequest) => {
    setAllReturns((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setDetailItem((current) => (current?.id === updated.id ? updated : current));
  };

  const handleAccept = async (request: ReturnRequest) => {
    try {
      setActionLoading(true);
      const updated = await returnService.acceptByVendor(request.id);
      applyRowUpdate(updated);
      addToast(`Đã chấp nhận yêu cầu ${toDisplayReturnCode(updated.code)}.`, 'success');
    } catch (error: unknown) {
      addToast(getUiErrorMessage(error, 'Không thể chấp nhận yêu cầu hoàn trả.'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (request: ReturnRequest, reason: string) => {
    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      addToast('Vui lòng nhập lý do từ chối.', 'error');
      return;
    }

    try {
      setActionLoading(true);
      const updated = await returnService.rejectByVendor(request.id, normalizedReason);
      applyRowUpdate(updated);
      setRejectReason('');
      addToast(`Đã từ chối yêu cầu ${toDisplayReturnCode(updated.code)}.`, 'success');
    } catch (error: unknown) {
      addToast(getUiErrorMessage(error, 'Không thể từ chối yêu cầu hoàn trả.'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReceived = async (request: ReturnRequest) => {
    try {
      setActionLoading(true);
      const updated = await returnService.markReceivedByVendor(request.id);
      applyRowUpdate(updated);
      addToast(`Đã xác nhận nhận hàng hoàn ${toDisplayReturnCode(updated.code)}.`, 'success');
    } catch (error: unknown) {
      addToast(getUiErrorMessage(error, 'Không thể xác nhận nhận hàng hoàn.'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmRefund = async (request: ReturnRequest) => {
    try {
      setActionLoading(true);
      const updated = await returnService.confirmRefundByVendor(request.id);
      applyRowUpdate(updated);
      addToast(`Đã xác nhận hoàn tiền cho ${toDisplayReturnCode(updated.code)}.`, 'success');
    } catch (error: unknown) {
      addToast(getUiErrorMessage(error, 'Không thể hoàn tất hoàn tiền.'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <VendorLayout title="Hoàn trả" breadcrumbs={['Kênh Người Bán', 'Hoàn trả']}>
      <PanelStatsGrid
        items={[
          {
            key: 'needs-action',
            label: 'Cần xử lý',
            value: tabCounts.needsAction,
            sub: 'Yêu cầu cần vendor ra quyết định',
            tone: tabCounts.needsAction > 0 ? 'warning' : '',
            onClick: () => setActiveTab('needsAction'),
          },
          {
            key: 'in-transit',
            label: 'Đang hoàn gửi',
            value: tabCounts.inTransit,
            sub: 'Khách đã gửi hàng',
            tone: 'info',
            onClick: () => setActiveTab('inTransit'),
          },
          {
            key: 'to-inspect',
            label: 'Chờ kiểm hàng',
            value: tabCounts.toInspect,
            sub: 'Đã nhận hàng, chờ hoàn tiền',
            tone: tabCounts.toInspect > 0 ? 'warning' : 'info',
            onClick: () => setActiveTab('toInspect'),
          },
          {
            key: 'disputed',
            label: 'Tranh chấp',
            value: tabCounts.disputed,
            sub: 'Đã chuyển admin trọng tài',
            tone: tabCounts.disputed > 0 ? 'danger' : '',
            onClick: () => setActiveTab('disputed'),
          },
        ]}
      />

      <PanelTabs
        items={TABS.map((tab) => ({
          key: tab.key,
          label: tab.label,
          count: tabCounts[tab.key],
        }))}
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as VendorReturnTab)}
        accentClassName="vendor-active-tab"
      />

      <section className="admin-panels single">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Danh sách yêu cầu hoàn trả</h2>
            <div className="admin-actions">
              <PanelSearchField
                placeholder="Tìm theo mã hoàn trả, mã đơn, khách hàng..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
          </div>

          {isLoading ? (
            <AdminStateBlock
              type="empty"
              title="Đang tải yêu cầu hoàn trả"
              description="Hệ thống đang đồng bộ dữ liệu hoàn trả của gian hàng."
            />
          ) : loadError ? (
            <AdminStateBlock
              type="error"
              title="Không tải được danh sách hoàn trả"
              description={loadError}
              actionLabel="Thử lại"
              onAction={() => void fetchAllReturns()}
            />
          ) : filteredItems.length === 0 ? (
            <AdminStateBlock
              type={searchQuery.trim() ? 'search-empty' : 'empty'}
              title={searchQuery.trim() ? 'Không có yêu cầu phù hợp' : 'Chưa có yêu cầu hoàn trả'}
              description={
                searchQuery.trim()
                  ? 'Thử đổi từ khóa hoặc tab để xem dữ liệu khác.'
                  : 'Khi khách gửi yêu cầu đổi trả, dữ liệu sẽ hiển thị ở đây.'
              }
            />
          ) : (
            <>
              <div className="admin-table vendor-table" role="table" aria-label="Bảng hoàn trả vendor">
                <div className="admin-table-row admin-table-head vendor-returns" role="row">
                  <div role="columnheader">Mã hoàn trả</div>
                  <div role="columnheader">Mã đơn</div>
                  <div role="columnheader">Khách hàng</div>
                  <div role="columnheader">Lý do</div>
                  <div role="columnheader">Trạng thái</div>
                  <div role="columnheader">Giá trị</div>
                  <div role="columnheader">Hành động</div>
                </div>

                {pagedItems.map((item) => (
                  <motion.div key={item.id} className="admin-table-row vendor-returns" role="row" whileHover={{ y: -1 }}>
                    <div role="cell" className="returns-code-cell">
                      <strong className="returns-ellipsis">{toDisplayReturnCode(item.code)}</strong>
                      <small className="admin-muted returns-ellipsis">{formatDate(item.createdAt)}</small>
                    </div>
                    <div role="cell" className="returns-customer-cell">
                      <strong className="returns-ellipsis">#{toDisplayOrderCode(item.orderCode)}</strong>
                      <small className="admin-muted returns-ellipsis">{item.items.length} sản phẩm</small>
                    </div>
                    <div role="cell" className="returns-customer-cell">
                      <strong className="returns-ellipsis">{item.customerName || 'Khách hàng'}</strong>
                      <small className="admin-muted returns-ellipsis">{item.customerEmail || 'Chưa có email'}</small>
                    </div>
                    <div role="cell" className="returns-product-cell">
                      <span className="returns-ellipsis">{reasonLabel[item.reason] || item.reason}</span>
                      <small className="admin-muted returns-ellipsis">
                        {resolutionLabel[item.resolution] || item.resolution}
                      </small>
                    </div>
                    <div role="cell">
                      <span className={statusConfig[item.status].className}>{statusConfig[item.status].label}</span>
                    </div>
                    <div role="cell" className="returns-amount">
                      {formatVnd(getRefundAmount(item))}
                    </div>
                    <div role="cell" className="admin-actions vendor-return-actions">
                      {item.status === 'PENDING_VENDOR' && (
                        <>
                          <button
                            className="admin-icon-btn subtle"
                            title="Chấp nhận"
                            onClick={() => void handleAccept(item)}
                            disabled={actionLoading}
                          >
                            <ShieldCheck size={16} />
                          </button>
                          <button
                            className="admin-icon-btn subtle danger-icon"
                            title="Từ chối"
                            onClick={() => setDetailItem(item)}
                            disabled={actionLoading}
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                      {item.status === 'SHIPPING' && (
                        <button
                          className="admin-icon-btn subtle"
                          title="Xác nhận đã nhận hàng hoàn"
                          onClick={() => void handleMarkReceived(item)}
                          disabled={actionLoading}
                        >
                          <PackageCheck size={16} />
                        </button>
                      )}
                      {item.status === 'RECEIVED' && (
                        <button
                          className="admin-icon-btn subtle"
                          title="Xác nhận hoàn tiền"
                          onClick={() => void handleConfirmRefund(item)}
                          disabled={actionLoading}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      <button className="admin-icon-btn subtle" title="Xem chi tiết" onClick={() => setDetailItem(item)}>
                        <Eye size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              <PanelTableFooter
                page={safePage}
                totalPages={totalPages}
                onPageChange={setPage}
                meta={`Hiển thị ${startIndex}-${endIndex} / ${filteredItems.length} yêu cầu`}
              />
            </>
          )}
        </div>
      </section>

      <Drawer
        open={Boolean(detailItem)}
        onClose={() => {
          setDetailItem(null);
          setRejectReason('');
        }}
        className="returns-drawer"
      >
        {detailItem ? (
          <>
            <PanelDrawerHeader
              eyebrow="Chi tiết hoàn trả"
              title={toDisplayReturnCode(detailItem.code)}
              onClose={() => {
                setDetailItem(null);
                setRejectReason('');
              }}
              closeLabel="Đóng chi tiết"
            />

            <div className="drawer-body">
              <PanelDrawerSection title="Thông tin tổng quan">
                <div className="returns-meta-grid">
                  <article className="returns-meta-card">
                    <span className="returns-meta-label">Mã đơn</span>
                    <strong>#{toDisplayOrderCode(detailItem.orderCode)}</strong>
                  </article>
                  <article className="returns-meta-card">
                    <span className="returns-meta-label">Khách hàng</span>
                    <strong>{detailItem.customerName}</strong>
                    <small className="admin-muted">{detailItem.customerEmail || 'Chưa có email'}</small>
                  </article>
                  <article className="returns-meta-card">
                    <span className="returns-meta-label">Trạng thái</span>
                    <strong>{statusConfig[detailItem.status].label}</strong>
                    <small className="admin-muted">{formatDate(detailItem.updatedAt)}</small>
                  </article>
                  <article className="returns-meta-card">
                    <span className="returns-meta-label">Giá trị</span>
                    <strong>{formatVnd(getRefundAmount(detailItem))}</strong>
                    <small className="admin-muted">Hình thức: {detailItem.resolution}</small>
                  </article>
                </div>
              </PanelDrawerSection>

              <PanelDrawerSection title="Lý do yêu cầu">
                <div className="returns-reason-box">
                  <p className="returns-note-text">{reasonLabel[detailItem.reason] || detailItem.reason}</p>
                  <p className="returns-note-text">{detailItem.note?.trim() || 'Không có ghi chú thêm từ khách.'}</p>
                  {detailItem.disputeReason ? (
                    <p className="returns-note-text">Lý do tranh chấp: {detailItem.disputeReason}</p>
                  ) : null}
                </div>
              </PanelDrawerSection>

              <PanelDrawerSection title={`Sản phẩm hoàn trả (${detailItem.items.length})`}>
                <div className="returns-items-list">
                  {detailItem.items.map((item) => (
                    <article key={item.orderItemId} className="returns-item-card">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName} className="returns-item-image" />
                      ) : (
                        <div className="returns-item-image placeholder">SP</div>
                      )}
                      <div className="returns-item-content">
                        <strong className="returns-item-name">{item.productName}</strong>
                        <small className="admin-muted">{item.variantName || 'Biến thể mặc định'}</small>
                        <div className="returns-item-meta">
                          <span>x{item.quantity}</span>
                          <span>{formatVnd(item.unitPrice)}</span>
                          <span className="admin-bold">{formatVnd(item.unitPrice * item.quantity)}</span>
                        </div>
                        {item.evidenceUrl ? (
                          <a className="admin-link" href={item.evidenceUrl} target="_blank" rel="noreferrer">
                            Xem file evidence
                          </a>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </PanelDrawerSection>

              {detailItem.status === 'PENDING_VENDOR' ? (
                <PanelDrawerSection title="Lý do từ chối (nếu từ chối)">
                  <div className="returns-note-input-wrap">
                    <textarea
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      rows={4}
                      placeholder="Nhập lý do từ chối để gửi khách hàng..."
                      className="returns-note-input"
                    />
                  </div>
                </PanelDrawerSection>
              ) : null}
            </div>

            <PanelDrawerFooter>
              <button
                className="admin-ghost-btn"
                onClick={() => {
                  setDetailItem(null);
                  setRejectReason('');
                }}
              >
                Đóng
              </button>

              {detailItem.status === 'PENDING_VENDOR' && (
                <>
                  <button
                    className="admin-ghost-btn danger"
                    disabled={actionLoading}
                    onClick={() => void handleReject(detailItem, rejectReason)}
                  >
                    <XCircle size={14} />
                    Từ chối
                  </button>
                  <button
                    className="admin-primary-btn vendor-admin-primary"
                    disabled={actionLoading}
                    onClick={() => void handleAccept(detailItem)}
                  >
                    <ShieldCheck size={14} />
                    Chấp nhận
                  </button>
                </>
              )}

              {detailItem.status === 'SHIPPING' && (
                <button
                  className="admin-primary-btn vendor-admin-primary"
                  disabled={actionLoading}
                  onClick={() => void handleMarkReceived(detailItem)}
                >
                  <PackageCheck size={14} />
                  Đã nhận hàng hoàn
                </button>
              )}

              {detailItem.status === 'RECEIVED' && (
                <button
                  className="admin-primary-btn vendor-admin-primary"
                  disabled={actionLoading}
                  onClick={() => void handleConfirmRefund(detailItem)}
                >
                  <CheckCircle2 size={14} />
                  Confirm & Refund
                </button>
              )}
            </PanelDrawerFooter>
          </>
        ) : null}
      </Drawer>
    </VendorLayout>
  );
};

export default VendorReturnDashboard;
