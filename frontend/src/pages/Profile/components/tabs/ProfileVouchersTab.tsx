import { Tag } from 'lucide-react';
import EmptyState from '../../../../components/EmptyState/EmptyState';
import type { ProfileTabContentProps } from '../ProfileTabContent.types';

const VouchersTab = ({
  vouchers,
  pagedVouchers,
  voucherPage,
  totalVoucherPages,
  vouchersPerPage,
  onVoucherPageChange,
  getVoucherMeta,
  isMarketplaceVoucher,
}: Pick<ProfileTabContentProps,
  | 'vouchers'
  | 'pagedVouchers'
  | 'voucherPage'
  | 'totalVoucherPages'
  | 'vouchersPerPage'
  | 'onVoucherPageChange'
  | 'getVoucherMeta'
  | 'isMarketplaceVoucher'
>) => (
  <div className="tab-pane">
    <div className="profile-content-header">
      <h2 className="profile-content-title">Ví voucher của tôi</h2>
    </div>
    <div className={`voucher-list ${vouchers.length === 0 ? 'voucher-list-empty' : ''}`}>
      {vouchers.length === 0 ? (
        <EmptyState
          icon={<Tag size={80} strokeWidth={1} />}
          title="Ví voucher trống"
          description="Săn ngay những mã giảm giá hấp dẫn để mua sắm tiết kiệm hơn tại Coolmate."
          actionText="Săn Voucher"
          actionLink="/"
        />
      ) : (
        pagedVouchers.map((voucher, index) => {
          const voucherMeta = getVoucherMeta(voucher);
          const isMarketplaceOwner = isMarketplaceVoucher(voucher);
          const ownerLabel = isMarketplaceOwner ? 'Toàn sàn' : (voucher.storeName || 'Nhà bán hàng');

          return (
            <div
              key={voucher.customerVoucherId || `${voucher.code}-${voucher.storeId ?? 'global'}-${voucher.expiresAt ?? 'na'}-${(voucherPage - 1) * vouchersPerPage + index}`}
              className="voucher-card"
            >
              <span className={`voucher-owner-badge ${isMarketplaceOwner ? 'marketplace' : 'vendor'}`}>
                {ownerLabel}
              </span>
              <div className="voucher-stripe"></div>
              <div className="voucher-body">
                <div className="voucher-top">
                  <span className="voucher-code">{voucher.code}</span>
                  <span className={`voucher-remain voucher-remain-${voucherMeta.tone}`}>{voucherMeta.text}</span>
                </div>
                <p className="voucher-desc">{voucher.description}</p>
                <div className="voucher-bottom">
                  <span className="voucher-expiry">HSD: {new Date(voucher.expiresAt).toLocaleDateString('vi-VN')}</span>
                  <button className="voucher-condition-btn">Điều kiện</button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
    {vouchers.length > vouchersPerPage ? (
      <div className="voucher-pagination">
        <span className="voucher-pagination-meta">
          Hiển thị {(voucherPage - 1) * vouchersPerPage + 1}-{Math.min(voucherPage * vouchersPerPage, vouchers.length)} trên {vouchers.length} voucher
        </span>
        <div className="voucher-pagination-actions">
          <button
            type="button"
            className="voucher-page-btn"
            onClick={() => onVoucherPageChange((current) => Math.max(1, current - 1))}
            disabled={voucherPage === 1}
          >
            Trước
          </button>
          <span className="voucher-page-indicator">{voucherPage}/{totalVoucherPages}</span>
          <button
            type="button"
            className="voucher-page-btn"
            onClick={() => onVoucherPageChange((current) => Math.min(totalVoucherPages, current + 1))}
            disabled={voucherPage === totalVoucherPages}
          >
            Sau
          </button>
        </div>
      </div>
    ) : null}
  </div>
);

export default VouchersTab;
