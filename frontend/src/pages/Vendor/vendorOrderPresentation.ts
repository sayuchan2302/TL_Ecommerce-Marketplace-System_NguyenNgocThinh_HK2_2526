import type { FulfillmentStatus } from '../Admin/orderWorkflow';

type VendorStatusTone = 'pending' | 'teal' | 'success' | 'error' | 'neutral';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận',
  packing: 'Đang đóng gói',
  shipping: 'Đang giao',
  done: 'Hoàn tất',
  canceled: 'Đã hủy',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  delivered: 'Đã giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const STATUS_TONES: Record<string, VendorStatusTone> = {
  pending: 'pending',
  packing: 'teal',
  shipping: 'teal',
  done: 'success',
  canceled: 'error',
  confirmed: 'teal',
  processing: 'teal',
  delivered: 'success',
  completed: 'success',
  cancelled: 'error',
};

export const getVendorOrderStatusLabel = (status: FulfillmentStatus | string) => STATUS_LABELS[status] || status;

export const getVendorOrderStatusTone = (status: FulfillmentStatus | string): VendorStatusTone =>
  STATUS_TONES[status] || 'neutral';

export const formatVendorOrderDate = (dateStr: string, withTime = false) => {
  const date = new Date(dateStr);

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};
