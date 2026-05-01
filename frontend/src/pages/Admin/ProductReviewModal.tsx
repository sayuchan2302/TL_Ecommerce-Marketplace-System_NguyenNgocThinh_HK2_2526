import { useState } from 'react';
import { Ban, CheckCircle2, X } from 'lucide-react';
import Drawer from '../../components/Drawer/Drawer';
import type { AdminModerationProduct } from './adminProductModerationService';

interface ProductReviewModalProps {
  open: boolean;
  product: AdminModerationProduct | null;
  onClose: () => void;
  onBlock: (product: AdminModerationProduct, reason: string) => Promise<void> | void;
  onUnblock: (product: AdminModerationProduct) => Promise<void> | void;
  loading?: boolean;
}

const ProductReviewModal = ({ open, product, onClose, onBlock, onUnblock, loading = false }: ProductReviewModalProps) => {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  if (!open || !product) return null;

  const isBlocked = product.approvalStatus === 'BANNED';
  const previewImages = product.images && product.images.length > 0
    ? product.images
    : (product.thumbnail ? [product.thumbnail] : []);
  const createdAt = product.createdAt ? new Date(product.createdAt).toLocaleString('vi-VN') : 'N/A';
  const updatedAt = product.updatedAt ? new Date(product.updatedAt).toLocaleString('vi-VN') : 'N/A';
  const price = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(product.price) ? product.price : 0);

  const handleBlock = async () => {
    const normalized = reason.trim();
    if (!normalized) {
      setReasonError('Vui lòng nhập lý do chặn sản phẩm.');
      return;
    }
    setReasonError('');
    await onBlock(product, normalized);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      className="moderation-review-drawer"
      size="xl"
      ariaLabel="Rà soát sản phẩm"
    >
      <div className="drawer-header">
        <div>
          <p className="drawer-eyebrow">Quản trị sản phẩm</p>
          <h3>{product.productCode}</h3>
        </div>
        <button className="admin-icon-btn" onClick={onClose} aria-label="Đóng">
          <X size={16} />
        </button>
      </div>

      <div className="drawer-body">
        <section className="drawer-section">
          <h4>Tổng quan sản phẩm</h4>
          <div className="moderation-review-header">
            <img src={product.thumbnail || previewImages[0] || ''} alt={product.name} />
            <div>
              <p className="admin-bold">{product.name}</p>
              <p className="admin-muted small">
                Trạng thái quản lý: {isBlocked ? 'Đã chặn' : 'Đang hiển thị'}
              </p>
            </div>
          </div>
        </section>

        <section className="drawer-section">
          <h4>Thông tin vendor cung cấp</h4>
          <div className="moderation-readonly-grid">
            <div className="moderation-readonly-item">
              <span className="admin-muted small">Mã sản phẩm</span>
              <strong>{product.productCode}</strong>
            </div>
            <div className="moderation-readonly-item">
              <span className="admin-muted small">Gian hàng</span>
              <strong>{product.storeName || 'N/A'}</strong>
            </div>
            <div className="moderation-readonly-item">
              <span className="admin-muted small">Danh mục</span>
              <strong>{product.categoryName || 'N/A'}</strong>
            </div>
            <div className="moderation-readonly-item">
              <span className="admin-muted small">Trạng thái sản phẩm</span>
              <strong>{product.productStatus || 'N/A'}</strong>
            </div>
            <div className="moderation-readonly-item">
              <span className="admin-muted small">Giá bán</span>
              <strong>{price}</strong>
            </div>
            <div className="moderation-readonly-item">
              <span className="admin-muted small">Tồn kho</span>
              <strong>{product.stock.toLocaleString('vi-VN')}</strong>
            </div>
            <div className="moderation-readonly-item">
              <span className="admin-muted small">Đã bán</span>
              <strong>{product.sales.toLocaleString('vi-VN')}</strong>
            </div>
            <div className="moderation-readonly-item">
              <span className="admin-muted small">Ngày tạo</span>
              <strong>{createdAt}</strong>
            </div>
            <div className="moderation-readonly-item moderation-readonly-item-wide">
              <span className="admin-muted small">Cập nhật gần nhất</span>
              <strong>{updatedAt}</strong>
            </div>
          </div>
        </section>

        <section className="drawer-section moderation-review-grid">
          <div className="moderation-review-panel">
            <h4>Mô tả từ vendor</h4>
            <p className="moderation-review-description">
              {product.description?.trim() || 'Vendor chưa cập nhật mô tả sản phẩm.'}
            </p>
          </div>
          <div className="moderation-review-panel">
            <h4>Hình ảnh sản phẩm</h4>
            {previewImages.length === 0 ? (
              <p className="admin-muted small">Chưa có ảnh để rà soát.</p>
            ) : (
              <div className="moderation-review-images">
                {previewImages.map((image, index) => (
                  <img key={`${product.id}-${index}`} src={image} alt={`${product.name}-${index + 1}`} />
                ))}
              </div>
            )}
          </div>
        </section>

        {!isBlocked ? (
          <section className="drawer-section">
            <h4>Lý do chặn</h4>
            <textarea
              className="moderation-reject-reason"
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Nhập lý do vi phạm để gửi thông báo cho vendor..."
            />
            {reasonError ? <p className="moderation-error-text">{reasonError}</p> : null}
          </section>
        ) : null}
      </div>

      <div className="drawer-footer moderation-review-actions">
        <button className="admin-ghost-btn" onClick={onClose} disabled={loading}>
          Đóng
        </button>
        {isBlocked ? (
          <button
            className="admin-ghost-btn moderation-btn-approve"
            onClick={() => {
              void onUnblock(product);
            }}
            disabled={loading}
          >
            <CheckCircle2 size={15} />
            Gỡ chặn
          </button>
        ) : (
          <button
            className="admin-ghost-btn moderation-btn-ban"
            onClick={() => {
              void handleBlock();
            }}
            disabled={loading}
          >
            <Ban size={15} />
            Chặn sản phẩm
          </button>
        )}
      </div>
    </Drawer>
  );
};

export default ProductReviewModal;
