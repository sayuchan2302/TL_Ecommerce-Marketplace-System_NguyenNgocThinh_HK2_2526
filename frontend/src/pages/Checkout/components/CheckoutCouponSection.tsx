import { useEffect, useRef } from 'react';
import { AlertCircle, Check, Loader2, Tag, X } from 'lucide-react';
import type { CustomerWalletVoucher } from '../../../services/customerVoucherService';
import { CLIENT_TEXT } from '../../../utils/texts';
import type { CheckoutCoupon } from '../checkout.types';
import './CheckoutCouponSection.css';

const t = CLIENT_TEXT.checkout;

interface CheckoutCouponSectionProps {
  couponInput: string;
  appliedCoupon: CheckoutCoupon | null;
  couponError: string;
  isCouponLoading: boolean;
  isCouponsFetching: boolean;
  availableCoupons: CustomerWalletVoucher[];
  onCouponInputChange: (value: string) => void;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  onSelectCoupon: (coupon: CustomerWalletVoucher) => void;
}

const CheckoutCouponSection = ({
  couponInput,
  appliedCoupon,
  couponError,
  isCouponLoading,
  isCouponsFetching,
  availableCoupons,
  onCouponInputChange,
  onApplyCoupon,
  onRemoveCoupon,
  onSelectCoupon,
}: CheckoutCouponSectionProps) => {
  const couponScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = couponScrollRef.current;
    if (!element) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        event.preventDefault();
        element.scrollLeft += event.deltaY;
      }
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <>
      <div className="coupon-ticket-title">Kho mã giảm giá</div>
      <div className="coupon-ticket-scroll" ref={couponScrollRef}>
        {isCouponsFetching && (
          <div className="coupon-ticket">
            <div className="ticket-info">Đang tải voucher khả dụng...</div>
          </div>
        )}
        {!isCouponsFetching && availableCoupons.length === 0 && (
          <div className="coupon-ticket">
            <div className="ticket-info">Hiện chưa có voucher phù hợp cho giỏ hàng này.</div>
          </div>
        )}
        {!isCouponsFetching && availableCoupons.map((coupon) => {
          const isSelected = appliedCoupon?.customerVoucherId === coupon.customerVoucherId;
          return (
            <div
              key={coupon.customerVoucherId}
              className={`coupon-ticket ${isSelected ? 'coupon-selected' : ''}`}
              onClick={() => onSelectCoupon(coupon)}
            >
              <div className="ticket-info">
                <strong>{coupon.code}</strong> ({t.ticketRemaining.replace('{count}', String(coupon.remaining))})<br />
                <span className="ticket-desc">{coupon.description}</span>
                <div className="ticket-expiry">{t.ticketExpiry.replace('{date}', new Date(coupon.expiresAt).toLocaleDateString('vi-VN'))}</div>
              </div>
              <div className="ticket-action">
                <div className={`ticket-radio ${isSelected ? 'checked' : ''}`}>
                  {isSelected && <Check size={12} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="checkout-coupon-box">
        <div className="input-group-row">
          <input
            type="text"
            placeholder={t.enterCouponCode}
            className={`checkout-input coupon-input ${couponError ? 'input-error' : ''}`}
            value={couponInput}
            onChange={(event) => onCouponInputChange(event.target.value)}
            disabled={Boolean(appliedCoupon)}
          />
          {appliedCoupon ? (
            <button className="btn-remove-coupon" onClick={onRemoveCoupon} aria-label="Xóa mã giảm giá">
              <X size={16} aria-hidden="true" />
            </button>
          ) : (
            <button className="btn-dark-apply" onClick={onApplyCoupon} disabled={isCouponLoading} aria-label="Áp dụng mã giảm giá">
              {isCouponLoading ? <Loader2 size={16} className="spinner" /> : t.apply}
            </button>
          )}
        </div>
        {couponError && (
          <div className="coupon-error">
            <AlertCircle size={14} /> {couponError}
          </div>
        )}
        {appliedCoupon && (
          <div className="coupon-success">
            <Tag size={14} />
            <span>{t.couponApplied.replace('{code}', appliedCoupon.code).replace('{description}', appliedCoupon.description)}</span>
          </div>
        )}
      </div>
    </>
  );
};

export default CheckoutCouponSection;
