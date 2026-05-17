import { Banknote, Building2, CheckCircle2, Clock, User, X } from 'lucide-react';
import Drawer from '../../../../components/Drawer/Drawer';
import type { PayoutRequest } from '../../../../services/walletService';
import { formatCurrency } from './adminFinancialPresentation';

type Props = {
  payout: PayoutRequest | null;
  rejectNote: string;
  onRejectNoteChange: (note: string) => void;
  onClose: () => void;
  onReject: (payout: PayoutRequest) => void | Promise<void>;
  onApprove: (payout: PayoutRequest) => void | Promise<void>;
};

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Chờ duyệt', className: 'pending' },
    APPROVED: { label: 'Đã duyệt', className: 'success' },
    REJECTED: { label: 'Đã từ chối', className: 'danger' },
    COMPLETED: { label: 'Hoàn thành', className: 'success' },
  };
  return statusMap[status] || { label: status, className: 'neutral' };
};

const AdminPayoutDetailDrawer = ({
  payout,
  rejectNote,
  onRejectNoteChange,
  onClose,
  onReject,
  onApprove,
}: Props) => (
  <Drawer
    open={Boolean(payout)}
    onClose={onClose}
    className="financial-drawer"
    size="lg"
    ariaLabel="Chi tiết yêu cầu rút tiền"
  >
    {payout ? (
      <>
        <div className="drawer-header">
          <div>
            <p className="drawer-eyebrow">Chi tiết yêu cầu rút tiền</p>
            <h3>{payout.storeName}</h3>
          </div>
          <button className="admin-icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="drawer-body">
          <section className="drawer-section">
            <h4>Số tiền & Trạng thái</h4>
            <div className="financial-drawer-hero">
              <div className="financial-avatar" style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' }}>
                <Banknote size={22} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div className="admin-bold" style={{ fontSize: 24, color: '#0d9488' }}>
                  {formatCurrency(payout.amount)}
                </div>
                <div className="admin-muted">
                  Yêu cầu ngày {new Date(payout.createdAt).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <span className={`admin-pill ${getStatusBadge(payout.status).className}`} style={{ fontSize: 14, padding: '8px 14px' }}>
                {getStatusBadge(payout.status).label}
              </span>
            </div>
          </section>

          <section className="drawer-section">
            <h4>Thông tin ngân hàng</h4>
            <div className="financial-signal-grid">
              <div className="financial-signal-card">
                <span className="admin-muted small"><Building2 size={14} /> Ngân hàng</span>
                <strong>{payout.bankName}</strong>
              </div>
              <div className="financial-signal-card">
                <span className="admin-muted small"><Banknote size={14} /> Số tài khoản</span>
                <strong style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{payout.bankAccountNumber}</strong>
              </div>
              <div className="financial-signal-card">
                <span className="admin-muted small"><User size={14} /> Chủ tài khoản</span>
                <strong>{payout.bankAccountName}</strong>
              </div>
            </div>
          </section>

          {payout.status !== 'PENDING' && (
            <section className="drawer-section">
              <h4>Thông tin xử lý</h4>
              <div className="financial-signal-grid">
                {payout.processedBy && (
                  <div className="financial-signal-card">
                    <span className="admin-muted small"><User size={14} /> Người xử lý</span>
                    <strong>{payout.processedBy}</strong>
                  </div>
                )}
                {payout.processedAt && (
                  <div className="financial-signal-card">
                    <span className="admin-muted small"><Clock size={14} /> Thời gian xử lý</span>
                    <strong>{new Date(payout.processedAt).toLocaleString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</strong>
                  </div>
                )}
                {payout.adminNote && (
                  <div className="financial-signal-card" style={{ gridColumn: '1 / -1' }}>
                    <span className="admin-muted small">Ghi chú</span>
                    <strong>{payout.adminNote}</strong>
                  </div>
                )}
              </div>
            </section>
          )}

          {payout.status === 'PENDING' && (
            <section className="drawer-section">
              <h4>Lý do từ chối (nếu có)</h4>
              <textarea
                className="admin-textarea"
                rows={3}
                placeholder="Nhập lý do từ chối yêu cầu rút tiền..."
                value={rejectNote}
                onChange={(event) => onRejectNoteChange(event.target.value)}
              />
            </section>
          )}
        </div>

        <div className="drawer-footer">
          <button className="admin-ghost-btn" onClick={onClose}>Đóng</button>
          {payout.status === 'PENDING' && (
            <>
              <button className="admin-ghost-btn danger" onClick={() => void onReject(payout)}>
                <X size={14} /> Từ chối
              </button>
              <button className="admin-primary-btn" onClick={() => void onApprove(payout)}>
                <CheckCircle2 size={14} /> Duyệt rút tiền
              </button>
            </>
          )}
        </div>
      </>
    ) : null}
  </Drawer>
);

export default AdminPayoutDetailDrawer;
