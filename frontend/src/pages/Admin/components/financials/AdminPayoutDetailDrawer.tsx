import { CheckCircle2, X } from 'lucide-react';
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
            <h4>Thông tin yêu cầu</h4>
            <div className="financial-signal-grid">
              <div className="financial-signal-card">
                <span className="admin-muted small">Số tiền</span>
                <strong>{formatCurrency(payout.amount)}</strong>
              </div>
              <div className="financial-signal-card">
                <span className="admin-muted small">Trạng thái</span>
                <strong>{payout.status === 'PENDING' ? 'Chờ duyệt' : payout.status}</strong>
              </div>
              <div className="financial-signal-card">
                <span className="admin-muted small">Ngân hàng</span>
                <strong>{payout.bankName}</strong>
              </div>
              <div className="financial-signal-card">
                <span className="admin-muted small">STK</span>
                <strong>{payout.bankAccountNumber}</strong>
              </div>
              <div className="financial-signal-card">
                <span className="admin-muted small">Chủ TK</span>
                <strong>{payout.bankAccountName}</strong>
              </div>
              <div className="financial-signal-card">
                <span className="admin-muted small">Ngày yêu cầu</span>
                <strong>{new Date(payout.createdAt).toLocaleString('vi-VN')}</strong>
              </div>
            </div>
          </section>

          {payout.status === 'PENDING' && (
            <section className="drawer-section">
              <h4>Từ chối yêu cầu</h4>
              <textarea
                className="admin-textarea"
                rows={3}
                placeholder="Nhập lý do từ chối..."
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
