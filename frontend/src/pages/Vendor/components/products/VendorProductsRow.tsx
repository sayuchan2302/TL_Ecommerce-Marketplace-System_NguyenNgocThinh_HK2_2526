import { motion } from 'framer-motion';
import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../../../services/commissionService';
import type { VendorProductRecord } from '../../../../services/vendorProductService';
import { getVendorProductStatusLabel, getVendorProductStatusTone } from '../../vendorProductsHelpers';

interface VendorProductsRowProps {
  product: VendorProductRecord;
  index: number;
  rowNumber: number;
  checked: boolean;
  working: boolean;
  onToggle: (checked: boolean) => void;
  onOpenEdit: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}

const VendorProductsRow = ({
  product,
  index,
  rowNumber,
  checked,
  working,
  onToggle,
  onOpenEdit,
  onToggleVisibility,
  onDelete,
}: VendorProductsRowProps) => (
  <motion.div
    className={`admin-table-row vendor-products ${product.status === 'draft' ? 'row-muted' : ''}`}
    role="row"
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2, delay: Math.min(index * 0.025, 0.14) }}
    whileHover={{ y: -1 }}
    onClick={onOpenEdit}
    style={{ cursor: 'pointer' }}
  >
    <div role="cell" onClick={(event) => event.stopPropagation()}>
      <input type="checkbox" aria-label={`Chọn ${product.name}`} checked={checked} onChange={(event) => onToggle(event.target.checked)} />
    </div>
    <div role="cell" className="admin-mono">{rowNumber}</div>
    <div role="cell" className="vendor-admin-product-cell">
      <img src={product.image} alt={product.name} className="vendor-admin-thumb" />
      <div className="vendor-admin-product-copy">
        <div className="admin-bold">{product.name}</div>
        <div className="admin-muted small">SKU: {product.sku}</div>
      </div>
    </div>
    <div role="cell" className="vendor-admin-category">
      <span className="badge vendor-admin-category-badge vendor-admin-truncate">
        {product.category}
      </span>
    </div>
    <div role="cell" className="admin-bold">{formatCurrency(product.price)}</div>
    <div role="cell">
      <span className={`badge ${product.stock === 0 ? 'red' : product.stock < 10 ? 'amber' : 'green'}`}>
        {product.stock} sản phẩm
      </span>
    </div>
    <div role="cell" className="admin-muted">{product.sold} đã bán</div>
    <div role="cell">
      <span className={`admin-pill ${getVendorProductStatusTone(product.status)}`}>{getVendorProductStatusLabel(product.status)}</span>
    </div>
    <div role="cell" className="admin-actions" onClick={(event) => event.stopPropagation()}>
      <button className="admin-icon-btn subtle" title="Chỉnh sửa sản phẩm" onClick={onOpenEdit}>
        <Pencil size={16} />
      </button>
      <button className="admin-icon-btn subtle" title={product.visible ? 'Ẩn sản phẩm' : 'Hiển thị sản phẩm'} onClick={onToggleVisibility} disabled={working}>
        {product.visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
      <button className="admin-icon-btn subtle danger-icon" title="Xóa sản phẩm" onClick={onDelete} disabled={working}>
        <Trash2 size={16} />
      </button>
    </div>
  </motion.div>
);

export default VendorProductsRow;
