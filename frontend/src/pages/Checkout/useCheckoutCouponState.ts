import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ToastType } from '../../contexts/ToastContext';
import { couponService } from '../../services/couponService';
import {
  customerVoucherService,
  type CustomerWalletVoucher,
} from '../../services/customerVoucherService';
import type { CheckoutCoupon } from './checkout.types';
import { normalizeCouponCode } from './checkout.types';

interface UseCheckoutCouponStateArgs {
  checkoutStoreKey: string;
  checkoutStoreIds: string[];
  storeSubtotals: Record<string, number>;
  subtotal: number;
  addToast: (message: string, type: ToastType) => void;
}

export const useCheckoutCouponState = ({
  checkoutStoreKey,
  checkoutStoreIds,
  storeSubtotals,
  subtotal,
  addToast,
}: UseCheckoutCouponStateArgs) => {
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CheckoutCoupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isCouponLoading, setIsCouponLoading] = useState(false);
  const [isCouponsFetching, setIsCouponsFetching] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<CustomerWalletVoucher[]>([]);

  useEffect(() => {
    let cancelled = false;
    setIsCouponsFetching(true);

    const storeIdsForCoupons = checkoutStoreKey
      ? checkoutStoreKey.split(',').filter(Boolean)
      : [];

    customerVoucherService.getAvailableWalletCoupons(storeIdsForCoupons)
      .then((coupons) => {
        if (!cancelled) {
          setAvailableCoupons(coupons);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableCoupons([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsCouponsFetching(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [checkoutStoreKey]);

  useEffect(() => {
    if (!appliedCoupon?.customerVoucherId) {
      return;
    }

    const stillAvailable = availableCoupons.some(
      (coupon) => coupon.customerVoucherId === appliedCoupon.customerVoucherId,
    );

    if (!stillAvailable) {
      setAppliedCoupon(null);
      setCouponError('Mã giảm giá đã không còn khả dụng cho giỏ hàng hiện tại');
    }
  }, [availableCoupons, appliedCoupon]);

  const applyWalletCoupon = useCallback((coupon: CustomerWalletVoucher) => {
    const applicableOrderValue = coupon.storeId && Number.isFinite(storeSubtotals[coupon.storeId])
      ? storeSubtotals[coupon.storeId]
      : subtotal;

    if (coupon.minOrderValue && applicableOrderValue < coupon.minOrderValue) {
      setCouponError(`Đơn tối thiểu ${coupon.minOrderValue.toLocaleString('vi-VN')}đ để dùng mã này`);
      return false;
    }

    const walletDiscount = couponService.calculateDiscount(coupon, applicableOrderValue);
    if (walletDiscount <= 0) {
      setCouponError('Mã giảm giá không hợp lệ cho đơn hiện tại');
      return false;
    }

    setAppliedCoupon(coupon);
    setCouponInput('');
    setCouponError('');
    addToast(`Áp dụng mã ${coupon.code} thành công!`, 'success');
    return true;
  }, [addToast, storeSubtotals, subtotal]);

  const applyCouponCode = useCallback(async (code: string) => {
    setIsCouponLoading(true);
    setCouponError('');

    try {
      const normalizedCode = normalizeCouponCode(code || '');
      const walletCandidates = availableCoupons.filter(
        (coupon) => normalizeCouponCode(coupon.code) === normalizedCode,
      );
      const walletCoupon = walletCandidates.length <= 1
        ? walletCandidates[0]
        : walletCandidates.find((coupon) => coupon.storeId && checkoutStoreIds.includes(coupon.storeId))
          || walletCandidates[0];

      if (walletCoupon && applyWalletCoupon(walletCoupon)) {
        return;
      }

      const result = await couponService.validate(code, subtotal, {
        storeIds: checkoutStoreIds,
        storeSubtotals,
        forceRefresh: true,
      });

      if (result.valid && result.coupon) {
        setAppliedCoupon({ ...result.coupon, customerVoucherId: undefined });
        setCouponInput('');
        addToast(`Áp dụng mã ${result.coupon.code} thành công!`, 'success');
        return;
      }

      setCouponError(result.error || 'Mã giảm giá không hợp lệ');
    } catch {
      setCouponError('Không tải được voucher, vui lòng thử lại');
    } finally {
      setIsCouponLoading(false);
    }
  }, [addToast, applyWalletCoupon, availableCoupons, checkoutStoreIds, storeSubtotals, subtotal]);

  const handleApplyCoupon = useCallback(async () => {
    if (!couponInput.trim()) {
      setCouponError('Vui lòng nhập mã giảm giá');
      return;
    }

    await applyCouponCode(couponInput);
  }, [applyCouponCode, couponInput]);

  const handleRemoveCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponError('');
    addToast('Đã xóa mã giảm giá', 'info');
  }, [addToast]);

  const handleSelectCoupon = useCallback((coupon: CustomerWalletVoucher) => {
    if (appliedCoupon?.customerVoucherId === coupon.customerVoucherId) {
      setAppliedCoupon(null);
      addToast('Đã bỏ chọn mã giảm giá', 'info');
      return;
    }

    applyWalletCoupon(coupon);
  }, [addToast, appliedCoupon?.customerVoucherId, applyWalletCoupon]);

  const appliedCouponOrderValue = useMemo(
    () => (appliedCoupon
      ? (appliedCoupon.storeId && Number.isFinite(storeSubtotals[appliedCoupon.storeId])
        ? storeSubtotals[appliedCoupon.storeId]
        : subtotal)
      : subtotal),
    [appliedCoupon, storeSubtotals, subtotal],
  );

  const discount = useMemo(
    () => (appliedCoupon
      ? couponService.calculateDiscount(appliedCoupon, appliedCouponOrderValue)
      : 0),
    [appliedCoupon, appliedCouponOrderValue],
  );

  const savings = discount;

  const setCouponInputValue = useCallback((value: string) => {
    setCouponInput(value.toUpperCase());
    setCouponError('');
  }, []);

  const consumeAppliedCoupon = useCallback(() => {
    if (!appliedCoupon) {
      return;
    }

    if (appliedCoupon.customerVoucherId) {
      setAvailableCoupons((current) =>
        current.filter((coupon) => coupon.customerVoucherId !== appliedCoupon.customerVoucherId),
      );
    } else if (appliedCoupon.code) {
      couponService.recordUsage(appliedCoupon.code);
    }

    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
  }, [appliedCoupon]);

  return {
    couponInput,
    appliedCoupon,
    couponError,
    isCouponLoading,
    isCouponsFetching,
    availableCoupons,
    discount,
    savings,
    setCouponInputValue,
    handleApplyCoupon,
    handleRemoveCoupon,
    handleSelectCoupon,
    consumeAppliedCoupon,
  };
};
