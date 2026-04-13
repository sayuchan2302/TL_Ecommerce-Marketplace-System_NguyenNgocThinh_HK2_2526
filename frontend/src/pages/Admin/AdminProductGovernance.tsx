import './Admin.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ban, CheckCircle2, Eye } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { AdminStateBlock } from './AdminStateBlocks';
import { PanelStatsGrid, PanelTableFooter, PanelTabs } from '../../components/Panel/PanelPrimitives';
import { useAdminToast } from './useAdminToast';
import ProductReviewModal from './ProductReviewModal';
import {
  listModerationProducts,
  toggleProductApproval,
  type AdminModerationProduct,
  type ProductApprovalStatus,
} from './adminProductModerationService';
import { getUiErrorMessage } from '../../utils/errorMessage';

type StatusFilter = ProductApprovalStatus | 'ALL';

const PAGE_SIZE = 12;

const STATUS_TABS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'APPROVED', label: 'Đang hiển thị' },
  { key: 'BANNED', label: 'Đã chặn' },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('vi-VN');
};

const statusLabel: Record<StatusFilter, string> = {
  ALL: 'Tất cả',
  APPROVED: 'Đang hiển thị',
  BANNED: 'Đã chặn',
};

const statusPillClass = (status: ProductApprovalStatus) =>
  status === 'BANNED' ? 'admin-pill danger' : 'admin-pill success';

const AdminProductGovernance = () => {
  const { toast, pushToast } = useAdminToast(2200);

  const [rows, setRows] = useState<AdminModerationProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [tabCounts, setTabCounts] = useState<Record<StatusFilter, number>>({
    ALL: 0,
    APPROVED: 0,
    BANNED: 0,
  });

  const [reviewingProduct, setReviewingProduct] = useState<AdminModerationProduct | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const baseFilterParams = useMemo(
    () => ({
      sort: 'createdAt,desc',
    }),
    [],
  );

  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const response = await listModerationProducts({
        ...baseFilterParams,
        page,
        size: PAGE_SIZE,
        status: statusFilter,
      });

      setRows(response.content);
      setTotalPages(Math.max(response.totalPages, 1));
      setSelected((prev) => {
        if (prev.size === 0) return prev;
        const idsOnPage = new Set(response.content.map((item) => item.id));
        const next = new Set<string>();
        prev.forEach((id) => {
          if (idsOnPage.has(id)) next.add(id);
        });
        return next;
      });
    } catch (error: unknown) {
      setRows([]);
      setTotalPages(1);
      setLoadError(getUiErrorMessage(error, 'Không tải được danh sách sản phẩm vendor.'));
    } finally {
      setIsLoading(false);
    }
  }, [baseFilterParams, page, statusFilter]);

  const loadStatusCounts = useCallback(async () => {
    try {
      const [allRes, approvedRes, bannedRes] = await Promise.all([
        listModerationProducts({ ...baseFilterParams, page: 0, size: 1, status: 'ALL' }),
        listModerationProducts({ ...baseFilterParams, page: 0, size: 1, status: 'APPROVED' }),
        listModerationProducts({ ...baseFilterParams, page: 0, size: 1, status: 'BANNED' }),
      ]);

      setTabCounts({
        ALL: allRes.totalElements,
        APPROVED: approvedRes.totalElements,
        BANNED: bannedRes.totalElements,
      });
    } catch {
      setTabCounts((prev) => prev);
    }
  }, [baseFilterParams]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    void loadStatusCounts();
  }, [loadStatusCounts]);

  const refreshData = async (message?: string) => {
    await Promise.all([loadProducts(), loadStatusCounts()]);
    if (message) pushToast(message);
  };

  const handleUnblock = async (product: AdminModerationProduct) => {
    try {
      setActionLoading(true);
      if (product.approvalStatus !== 'APPROVED') {
        await toggleProductApproval(product.id, 'APPROVED');
      }
      await refreshData(`Đã gỡ chặn ${product.productCode}.`);
      setReviewingProduct(null);
    } catch (error: unknown) {
      pushToast(getUiErrorMessage(error, 'Không thể gỡ chặn sản phẩm.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlock = async (product: AdminModerationProduct, reason: string) => {
    try {
      setActionLoading(true);
      if (product.approvalStatus !== 'BANNED') {
        await toggleProductApproval(product.id, 'BANNED', reason);
      }
      await refreshData(`Đã chặn ${product.productCode}.`);
      setReviewingProduct(null);
    } catch (error: unknown) {
      pushToast(getUiErrorMessage(error, 'Không thể chặn sản phẩm.'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout title="Quản lý sản phẩm" breadcrumbs={['Gian hàng', 'Quản lý sản phẩm']}>
      <PanelStatsGrid
        items={[
          {
            key: 'all',
            label: 'Tổng sản phẩm',
            value: tabCounts.ALL,
            sub: 'Toàn bộ sản phẩm theo bộ lọc hiện tại',
            onClick: () => {
              setStatusFilter('ALL');
              setPage(0);
            },
          },
          {
            key: 'approved',
            label: 'Đang hiển thị',
            value: tabCounts.APPROVED,
            sub: 'Được phép hiển thị trên sàn',
            tone: 'success',
            onClick: () => {
              setStatusFilter('APPROVED');
              setPage(0);
            },
          },
          {
            key: 'banned',
            label: 'Đã chặn',
            value: tabCounts.BANNED,
            sub: 'Vi phạm chính sách, đang bị ẩn',
            tone: tabCounts.BANNED > 0 ? 'danger' : '',
            onClick: () => {
              setStatusFilter('BANNED');
              setPage(0);
            },
          },
        ]}
      />

      <PanelTabs
        items={STATUS_TABS.map((tab) => ({
          key: tab.key,
          label: tab.label,
          count: tabCounts[tab.key],
        }))}
        activeKey={statusFilter}
        onChange={(key) => {
          setStatusFilter(key as StatusFilter);
          setSelected(new Set());
          setPage(0);
        }}
      />

      <section className="admin-panels single">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Danh sách sản phẩm vendor</h2>
          </div>

          {isLoading ? (
            <AdminStateBlock
              type="empty"
              title="Đang tải dữ liệu sản phẩm"
              description="Hệ thống đang đồng bộ dữ liệu sản phẩm từ các gian hàng."
            />
          ) : loadError ? (
            <AdminStateBlock
              type="error"
              title="Không tải được danh sách sản phẩm"
              description={loadError}
              actionLabel="Thử lại"
              onAction={() => {
                void refreshData();
              }}
            />
          ) : rows.length === 0 ? (
            <AdminStateBlock
              type="empty"
              title="Không có sản phẩm trong trạng thái này"
              description="Hiện chưa có sản phẩm phù hợp với tiêu chí bạn đang chọn."
            />
          ) : (
            <>
                <div className="admin-table moderation-table" role="table" aria-label="Danh sách sản phẩm vendor">
                <div className="admin-table-row admin-table-head moderation-row" role="row">
                  <div role="columnheader">
                    <input
                      type="checkbox"
                      checked={selected.size === rows.length && rows.length > 0}
                      onChange={(event) => {
                        setSelected(event.target.checked ? new Set(rows.map((item) => item.id)) : new Set());
                      }}
                      aria-label="Chọn tất cả"
                    />
                  </div>
                  <div role="columnheader">STT</div>
                  <div role="columnheader">Sản phẩm</div>
                  <div role="columnheader">Gian hàng</div>
                  <div role="columnheader" className="moderation-col-category">Danh mục</div>
                  <div role="columnheader">Giá</div>
                  <div role="columnheader">Trạng thái</div>
                  <div role="columnheader" className="moderation-col-actions">Hành động</div>
                </div>

                {rows.map((product, index) => (
                  <motion.div key={product.id} className="admin-table-row moderation-row" role="row" whileHover={{ y: -1 }}>
                    <div role="cell">
                      <input
                        type="checkbox"
                        checked={selected.has(product.id)}
                        onChange={(event) => {
                          const next = new Set(selected);
                          if (event.target.checked) next.add(product.id);
                          else next.delete(product.id);
                          setSelected(next);
                        }}
                        aria-label={`Chọn ${product.productCode}`}
                      />
                    </div>
                    <div role="cell" className="admin-mono">
                      {page * PAGE_SIZE + index + 1}
                    </div>
                    <div role="cell" className="moderation-product-cell">
                      <img src={product.thumbnail || ''} alt={product.name} className="moderation-thumb" />
                      <div className="moderation-product-copy">
                        <p className="admin-bold moderation-truncate">{product.name}</p>
                      </div>
                    </div>

                    <div role="cell" className="moderation-store-cell">
                      {product.storeId ? (
                        <>
                          <Link to="/admin/stores" className="moderation-store-link">
                            {product.storeName || 'Không rõ gian hàng'}
                          </Link>
                          <p className="admin-muted small">{formatDate(product.createdAt)}</p>
                        </>
                      ) : (
                        <span className="admin-muted">Không rõ</span>
                      )}
                    </div>

                    <div role="cell" className="moderation-col-category">
                      <span className="badge moderation-truncate">{product.categoryName || 'N/A'}</span>
                    </div>

                    <div role="cell" className="admin-bold">{formatCurrency(product.price)}</div>

                    <div role="cell">
                      <span className={statusPillClass(product.approvalStatus)}>{statusLabel[product.approvalStatus]}</span>
                    </div>

                    <div role="cell" className="admin-actions moderation-actions">
                      <button
                        className="admin-icon-btn subtle"
                        title="Xem chi tiết"
                        onClick={() => setReviewingProduct(product)}
                        disabled={actionLoading}
                      >
                        <Eye size={16} />
                      </button>
                      {product.approvalStatus === 'BANNED' ? (
                        <button
                          className="admin-icon-btn subtle moderation-icon-approve"
                          title="Gỡ chặn"
                          onClick={() => {
                            void handleUnblock(product);
                          }}
                          disabled={actionLoading}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      ) : (
                        <button
                          className="admin-icon-btn subtle danger-icon moderation-icon-ban"
                          title="Chặn sản phẩm"
                          onClick={() => setReviewingProduct(product)}
                          disabled={actionLoading}
                        >
                          <Ban size={16} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              <PanelTableFooter
                meta={`Trang ${page + 1}/${totalPages} · ${rows.length} sản phẩm/trang`}
                page={page + 1}
                totalPages={totalPages}
                onPageChange={(next) => setPage(next - 1)}
                prevLabel="Trước"
                nextLabel="Sau"
              />
            </>
          )}
        </div>
      </section>

      <ProductReviewModal
        key={reviewingProduct?.id || 'no-product'}
        open={Boolean(reviewingProduct)}
        product={reviewingProduct}
        onClose={() => setReviewingProduct(null)}
        onBlock={handleBlock}
        onUnblock={handleUnblock}
        loading={actionLoading}
      />

      {toast ? <div className="toast success">{toast}</div> : null}
    </AdminLayout>
  );
};

export default AdminProductGovernance;

