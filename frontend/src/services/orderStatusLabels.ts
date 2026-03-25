/**
 * orderStatusLabels.ts — Unified status labels & tones for all panels.
 *
 * Every UI that shows order statuses should import from here instead of
 * defining its own local getStatusLabel / getStatusTone helpers.
 */

import type { FulfillmentStatus } from '../pages/Admin/orderWorkflow';
import type { ClientOrderStatus } from './sharedOrderStore';

// ── Admin-facing labels ────────────────────────────────────────────────────

export const fulfillmentLabel = (status: FulfillmentStatus): string => {
  const map: Record<FulfillmentStatus, string> = {
    pending: 'Chờ xác nhận',
    packing: 'Đang đóng gói',
    shipping: 'Đang giao',
    done: 'Hoàn tất',
    canceled: 'Đã hủy',
  };
  return map[status] ?? status;
};

export const fulfillmentTone = (status: FulfillmentStatus): string => {
  const map: Record<FulfillmentStatus, string> = {
    pending: 'pending',
    packing: 'teal',
    shipping: 'teal',
    done: 'success',
    canceled: 'error',
  };
  return map[status] ?? 'neutral';
};

// ── Vendor-facing labels (slightly different wording) ──────────────────────

export const vendorFulfillmentLabel = (status: FulfillmentStatus): string => {
  const map: Record<FulfillmentStatus, string> = {
    pending: 'Chờ tiếp nhận',
    packing: 'Đang đóng gói',
    shipping: 'Đang giao',
    done: 'Hoàn tất',
    canceled: 'Đã hủy',
  };
  return map[status] ?? status;
};

// ── Client-facing labels ───────────────────────────────────────────────────

export const clientStatusLabel = (status: ClientOrderStatus): string => {
  const map: Record<ClientOrderStatus, string> = {
    pending: 'Chờ xác nhận',
    processing: 'Đang xử lý',
    shipping: 'Đang giao',
    delivered: 'Đã giao',
    cancelled: 'Đã hủy',
    refunded: 'Đã hoàn tiền',
  };
  return map[status] ?? status;
};
