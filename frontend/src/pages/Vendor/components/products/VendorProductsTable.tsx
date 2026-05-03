import { motion } from 'framer-motion';
import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { AdminStateBlock, AdminTableSkeleton } from '../../../Admin/AdminStateBlocks';
import { PanelTableFooter } from '../../../../components/Panel/PanelPrimitives';
import { formatCurrency } from '../../../../services/commissionService';
import type { VendorProductRecord } from '../../../../services/vendorProductService';
import { getVendorProductStatusLabel, getVendorProductStatusTone } from '../../vendorProductsHelpers';
import VendorProductsRow from './VendorProductsRow';

interface VendorProductsTableProps {
  loading: boolean;
  loadError: string;
  hasViewContext: boolean;
  products: VendorProductRecord[];
  allSelected: boolean;
  working: boolean;
  startIndex: number;
  endIndex: number;
  totalElements: number;
  page: number;
  totalPages: number;
  onReload: () => void;
  onResetCurrentView: () => void;
  onOpenCreateProductDrawer: () => void;
  onToggleSelectAll: (checked: boolean) => void;
  isSelected: (id: string) => boolean;
  onToggleOne: (id: string, checked: boolean) => void;
  onOpenEditDrawer: (id: string) => void;
  onToggleVisibility: (id: string, visible: boolean) => void;
  onRequestDelete: (ids: string[]) => void;
  onPageChange: (page: number) => void;
}

const VendorProductsTable = ({
  loading,
  loadError,
  hasViewContext,
  products,
  allSelected,
  working,
  startIndex,
  endIndex,
  totalElements,
  page,
  totalPages,
  onReload,
  onResetCurrentView,
  onOpenCreateProductDrawer,
  onToggleSelectAll,
  isSelected,
  onToggleOne,
  onOpenEditDrawer,
  onToggleVisibility,
  onRequestDelete,
  onPageChange,
}: VendorProductsTableProps) => {
  if (loading) {
    return <AdminTableSkeleton columns={8} rows={6} />;
  }

  if (loadError) {
    return (
      <AdminStateBlock
        type="error"
        title="Không tải được dữ liệu sản phẩm"
        description={loadError}
        actionLabel="Tải lại"
        onAction={onReload}
      />
    );
  }

  if (products.length === 0) {
    return (
      <AdminStateBlock
        type={hasViewContext ? 'search-empty' : 'empty'}
        title={hasViewContext ? 'Không tìm thấy SKU phù hợp' : 'Chưa có sản phẩm nào'}
        description={hasViewContext ? 'Thử đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc.' : 'Khi shop tạo sản phẩm mới, danh sách sẽ xuất hiện tại đây.'}
        actionLabel={hasViewContext ? 'Đặt lại bộ lọc' : 'Thêm sản phẩm'}
        onAction={hasViewContext ? onResetCurrentView : onOpenCreateProductDrawer}
      />
    );
  }

  return (
    <>
      <div className="admin-table vendor-products-table" role="table" aria-label="Bảng sản phẩm của gian hàng">
        <div className="admin-table-row vendor-products admin-table-head" role="row">
          <div role="columnheader">
            <input type="checkbox" aria-label="Chọn tất cả sản phẩm" checked={allSelected} onChange={(event) => onToggleSelectAll(event.target.checked)} />
          </div>
          <div role="columnheader">STT</div>
          <div role="columnheader">Sản phẩm</div>
          <div role="columnheader">Danh mục</div>
          <div role="columnheader">Giá bán</div>
          <div role="columnheader">Tồn kho</div>
          <div role="columnheader">Đã bán</div>
          <div role="columnheader">Trạng thái</div>
          <div role="columnheader">Hành động</div>
        </div>

        {products.map((product, index) => (
          <VendorProductsRow
            key={product.id}
            product={product}
            index={index}
            rowNumber={startIndex + index}
            checked={isSelected(product.id)}
            working={working}
            onToggle={(checked) => onToggleOne(product.id, checked)}
            onOpenEdit={() => onOpenEditDrawer(product.id)}
            onToggleVisibility={() => onToggleVisibility(product.id, !product.visible)}
            onDelete={() => onRequestDelete([product.id])}
          />
        ))}
      </div>

      <div className="vendor-mobile-cards vendor-product-card-list" aria-label="Danh sách sản phẩm dạng thẻ">
        {products.map((product, index) => (
          <motion.article
            key={`product-card-${product.id}`}
            className={`vendor-mobile-card vendor-product-card ${product.status === 'draft' ? 'row-muted' : ''}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, delay: Math.min(index * 0.02, 0.1) }}
            onClick={() => onOpenEditDrawer(product.id)}
          >
            <div className="vendor-card-head">
              <label className="vendor-card-check" onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  aria-label={`Chọn ${product.name}`}
                  checked={isSelected(product.id)}
                  onChange={(event) => onToggleOne(product.id, event.target.checked)}
                />
                <span>#{startIndex + index}</span>
              </label>
              <span className={`admin-pill ${getVendorProductStatusTone(product.status)}`}>
                {getVendorProductStatusLabel(product.status)}
              </span>
            </div>

            <div className="vendor-card-product">
              <img src={product.image} alt={product.name} className="vendor-admin-thumb" loading="lazy" decoding="async" />
              <div className="vendor-admin-product-copy">
                <div className="admin-bold">{product.name}</div>
                <div className="admin-muted small">SKU: {product.sku}</div>
              </div>
            </div>

            <div className="vendor-card-meta-grid product">
              <div>
                <span>Danh mục</span>
                <strong>{product.category}</strong>
              </div>
              <div>
                <span>Giá bán</span>
                <strong>{formatCurrency(product.price)}</strong>
              </div>
              <div>
                <span>Tồn kho</span>
                <strong>{product.stock} sản phẩm</strong>
              </div>
              <div>
                <span>Đã bán</span>
                <strong>{product.sold}</strong>
              </div>
            </div>

            <div className="vendor-card-actions" onClick={(event) => event.stopPropagation()}>
              <button className="admin-icon-btn subtle" title="Chỉnh sửa sản phẩm" aria-label={`Chỉnh sửa ${product.name}`} onClick={() => onOpenEditDrawer(product.id)}>
                <Pencil size={16} />
              </button>
              <button
                className="admin-icon-btn subtle"
                title={product.visible ? 'Ẩn sản phẩm' : 'Hiển thị sản phẩm'}
                aria-label={product.visible ? `Ẩn ${product.name}` : `Hiển thị ${product.name}`}
                onClick={() => onToggleVisibility(product.id, !product.visible)}
                disabled={working}
              >
                {product.visible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button className="admin-icon-btn subtle danger-icon" title="Xóa sản phẩm" aria-label={`Xóa ${product.name}`} onClick={() => onRequestDelete([product.id])} disabled={working}>
                <Trash2 size={16} />
              </button>
            </div>
          </motion.article>
        ))}
      </div>

      <PanelTableFooter
        meta={`Hiển thị ${startIndex}-${endIndex} trên ${totalElements} sản phẩm`}
        page={page}
        totalPages={Math.max(totalPages, 1)}
        onPageChange={onPageChange}
        activePageClassName="vendor-active-page"
        nextLabel="Sau"
      />
    </>
  );
};

export default VendorProductsTable;
