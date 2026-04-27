import { useEffect, useRef } from 'react';
import { ApiError, apiRequest, hasBackendJwt } from '../../services/apiClient';
import {
  clearPendingVnpayCheckout,
  getPendingVnpayCheckout,
} from '../../services/vnpayCheckoutStore';
import { PENDING_VNPAY_RECONCILE_TTL_MS } from './checkout.types';

interface UsePendingVnpayReconcileArgs {
  clearCartByMarker: (cartIds: string[]) => void;
}

export const usePendingVnpayReconcile = ({ clearCartByMarker }: UsePendingVnpayReconcileArgs) => {
  const hasReconciledPendingRef = useRef(false);

  useEffect(() => {
    if (hasReconciledPendingRef.current) {
      return;
    }
    hasReconciledPendingRef.current = true;

    let cancelled = false;
    const pending = getPendingVnpayCheckout();
    if (!pending || !hasBackendJwt()) {
      return () => {
        cancelled = true;
      };
    }
    if (!pending.orderCode || pending.cartIds.length === 0) {
      clearPendingVnpayCheckout();
      return () => {
        cancelled = true;
      };
    }
    if (Date.now() - pending.createdAt > PENDING_VNPAY_RECONCILE_TTL_MS) {
      clearPendingVnpayCheckout();
      return () => {
        cancelled = true;
      };
    }

    const reconcile = async () => {
      try {
        const order = await apiRequest<{ paymentStatus?: string }>(
          `/api/orders/code/${encodeURIComponent(pending.orderCode)}`,
          {},
          { auth: true },
        );
        if (cancelled) {
          return;
        }
        if ((order.paymentStatus || '').toUpperCase() === 'PAID') {
          clearCartByMarker(pending.cartIds);
          clearPendingVnpayCheckout();
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.status === 404) {
          clearPendingVnpayCheckout();
        }
      }
    };

    void reconcile();
    return () => {
      cancelled = true;
    };
  }, [clearCartByMarker]);
};
