import { ArrowUpRight, ExternalLink, WalletCards, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Drawer from '../../../../components/Drawer/Drawer';
import type { VendorWallet } from '../../../../services/walletService';
import { formatCurrency } from './adminFinancialPresentation';

type Props = {
  record: VendorWallet | null;
  onClose: () => void;
  onOpenReleaseConfirm: (storeIds: string[]) => void;
};

const AdminWalletDetailDrawer = ({ record, onClose, onOpenReleaseConfirm }: Props) => (
  <Drawer open={Boolean(record)} onClose={onClose} className="financial-drawer" size="lg" ariaLabel="Chi tiết ví shop">
    {record ? (
      <>
        <div className="drawer-header">
          <div>
            <p className="drawer-eyebrow">Ví shop</p>
            <h3>{record.storeName}</h3>
          </div>
          <button className="admin-icon-btn" onClick={onClose} aria-label="Đóng chi tiết tài chính">
            <X size={16} />
          </button>
        </div>

        <div className="drawer-body">
          <section className="drawer-section">
            <h4>Thông tin gian hàng</h4>
            <div className="financial-drawer-hero">
              <div className="financial-avatar">
                <WalletCards size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="admin-bold">{record.storeName}</div>
                {record.storeSlug && (
                  <div className="admin-muted">@{record.storeSlug}</div>
                )}
              </div>
              <Link
                to={`/admin/stores?search=${record.storeId}`}
                className="admin-ghost-btn"
                style={{ gap: 4, padding: '6px 10px' }}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={14} />
                Xem gian hàng
              </Link>
            </div>
          </section>

          <section className="drawer-section">
            <h4>Trạng thái ví</h4>
            <div className="financial-drawer-hero">
              <span
                className={`admin-pill ${
                  record.reservedBalance > 0 ? 'pending' : record.availableBalance > 0 ? 'success' : 'neutral'
                }`}
                style={{ fontSize: 14, padding: '8px 14px' }}
              >
                {record.reservedBalance > 0
                  ? 'Chờ duyệt rút'
                  : record.availableBalance > 0
                    ? 'Có thể rút'
                    : 'Trống'}
              </span>
              {record.reservedBalance > 0 && (
                <div className="admin-muted" style={{ fontSize: 13 }}>
                  {formatCurrency(record.reservedBalance)} đang chờ duyệt rút
                </div>
              )}
            </div>
          </section>

          <section className="drawer-section">
            <h4>Số dư ví</h4>
            <div className="financial-signal-grid">
              <div className="financial-signal-card">
                <span className="admin-muted small">Khả dụng</span>
                <strong style={{ color: '#0d9488', fontSize: 18 }}>{formatCurrency(record.availableBalance)}</strong>
              </div>
              <div className="financial-signal-card">
                <span className="admin-muted small">Đóng băng</span>
                <strong style={{ color: '#d97706', fontSize: 18 }}>{formatCurrency(record.frozenBalance)}</strong>
              </div>
              <div className="financial-signal-card">
                <span className="admin-muted small">Chờ duyệt rút</span>
                <strong style={{ color: '#0f766e', fontSize: 18 }}>{formatCurrency(record.reservedBalance)}</strong>
              </div>
              <div className="financial-signal-card">
                <span className="admin-muted small">Tổng</span>
                <strong style={{ fontSize: 18 }}>{formatCurrency(record.totalBalance)}</strong>
              </div>
            </div>
          </section>

          <section className="drawer-section">
            <h4>Thông tin cập nhật</h4>
            <div className="financial-signal-grid" style={{ gridTemplateColumns: '1fr' }}>
              <div className="financial-signal-card">
                <span className="admin-muted small">Cập nhật lần cuối</span>
                <strong>{new Date(record.lastUpdated).toLocaleString('vi-VN', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</strong>
              </div>
            </div>
          </section>
        </div>

        <div className="drawer-footer">
          <button className="admin-ghost-btn" onClick={onClose}>Đóng</button>
          {record.reservedBalance > 0 && (
            <button className="admin-primary-btn" onClick={() => onOpenReleaseConfirm([record.storeId])}>
              <ArrowUpRight size={14} />
              Duyệt phiếu rút
            </button>
          )}
        </div>
      </>
    ) : null}
  </Drawer>
);

export default AdminWalletDetailDrawer;
