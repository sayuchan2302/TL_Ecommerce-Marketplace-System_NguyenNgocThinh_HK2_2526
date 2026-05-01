import { ArrowUpRight, WalletCards, X } from 'lucide-react';
import Drawer from '../../../../components/Drawer/Drawer';
import type { VendorWallet } from '../../../../services/walletService';
import { formatCurrency, toStoreRef } from './adminFinancialPresentation';

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
            <h4>Tổng quan ví điện tử</h4>
            <div className="financial-drawer-hero">
              <div className="financial-avatar">
                <WalletCards size={22} />
              </div>
              <div>
                <div className="admin-bold">Store: {toStoreRef(record)}</div>
                <div className="admin-muted">{record.storeName}</div>
              </div>
              <span
                className={`admin-pill ${
                  record.reservedBalance > 0 ? 'pending' : record.availableBalance > 0 ? 'success' : 'neutral'
                }`}
              >
                {record.reservedBalance > 0
                  ? 'Chờ duyệt rút'
                  : record.availableBalance > 0
                    ? 'Có thể rút'
                    : 'Trống'}
              </span>
            </div>
          </section>

          <section className="drawer-section">
            <h4>Bảng tóm tắt ví</h4>
            <div className="financial-signal-grid">
              <div className="financial-signal-card">
                <span className="admin-muted small">Khả dụng</span>
                <strong style={{ color: '#0d9488' }}>{formatCurrency(record.availableBalance)}</strong>
              </div>
              <div className="financial-signal-card">
                <span className="admin-muted small">Đóng băng</span>
                <strong style={{ color: '#d97706' }}>{formatCurrency(record.frozenBalance)}</strong>
              </div>
              <div className="financial-signal-card">
                <span className="admin-muted small">Chờ duyệt rút</span>
                <strong style={{ color: '#0f766e' }}>{formatCurrency(record.reservedBalance)}</strong>
              </div>
              <div className="financial-signal-card">
                <span className="admin-muted small">Tổng</span>
                <strong>{formatCurrency(record.totalBalance)}</strong>
              </div>
              <div className="financial-signal-card">
                <span className="admin-muted small">Cập nhật lúc</span>
                <strong>{new Date(record.lastUpdated).toLocaleString('vi-VN')}</strong>
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
