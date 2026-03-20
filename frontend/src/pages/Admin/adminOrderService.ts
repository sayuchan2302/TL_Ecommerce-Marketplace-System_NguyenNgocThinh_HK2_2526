import {
  canTransitionFulfillment,
  fulfillmentLabel,
  transitionReasonLabel,
  transitionReasonCatalog,
  validateTransitionReason,
  type FulfillmentStatus,
  type PaymentStatus,
  type TransitionReasonCode,
} from './orderWorkflow';
import { adminOrdersData, type AdminOrderData, type AdminOrderTimelineEntry } from './adminOrdersData';

type TransitionSource = 'orders_list' | 'order_detail';

interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  source: TransitionSource;
  orderCode: string;
  fromFulfillment: FulfillmentStatus;
  toFulfillment: FulfillmentStatus;
  fromPayment: PaymentStatus;
  toPayment: PaymentStatus;
  reasonCode?: TransitionReasonCode;
  reasonNote?: string;
}

export interface AdminOrderRecord extends AdminOrderData {
  version: number;
  updatedAt: string;
  auditLog: AuditEntry[];
}

interface TransitionInput {
  code: string;
  nextFulfillment: FulfillmentStatus;
  actor: string;
  source: TransitionSource;
  reasonCode?: TransitionReasonCode;
  reasonNote?: string;
}

interface TransitionResult {
  ok: boolean;
  error?: string;
  message?: string;
  order?: AdminOrderRecord;
}

interface BulkTransitionResult {
  updatedCodes: string[];
  skippedCodes: string[];
}

const formatTimelineTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const cloneTimeline = (timeline: AdminOrderTimelineEntry[]) => timeline.map((entry) => ({ ...entry }));

const cloneOrder = (order: AdminOrderRecord): AdminOrderRecord => ({
  ...order,
  customerInfo: { ...order.customerInfo },
  items: order.items.map((item) => ({ ...item })),
  pricing: { ...order.pricing },
  timeline: cloneTimeline(order.timeline),
  auditLog: order.auditLog.map((entry) => ({ ...entry })),
});

let orderRecords: AdminOrderRecord[] = adminOrdersData.map((order, index) => ({
  ...order,
  version: 1,
  updatedAt: order.date,
  auditLog: [
    {
      id: `seed-${index + 1}`,
      at: order.date,
      actor: 'system',
      source: 'order_detail',
      orderCode: order.code,
      fromFulfillment: order.fulfillment,
      toFulfillment: order.fulfillment,
      fromPayment: order.paymentStatus,
      toPayment: order.paymentStatus,
    },
  ],
}));

const listeners = new Set<() => void>();

const AUTO_CANCEL_PENDING_MS = 3 * 24 * 60 * 60 * 1000;
const AUTO_CANCEL_NOTE = 'Tự động hủy sau 3 ngày chờ xác nhận.';

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const applyTransitionOnRecord = (
  order: AdminOrderRecord,
  input: TransitionInput,
  nowIso: string,
): AdminOrderRecord => {
  const nextPaymentStatus =
    input.nextFulfillment === 'done' && order.paymentStatus === 'cod_uncollected' ? 'paid' : order.paymentStatus;
  const selectedReason = transitionReasonCatalog[input.nextFulfillment].find((item) => item.code === input.reasonCode);
  const timelineAdditions: AdminOrderTimelineEntry[] = [
    {
      time: formatTimelineTime(nowIso),
      text: `Admin cập nhật trạng thái sang ${fulfillmentLabel(input.nextFulfillment)}.`,
      tone: input.nextFulfillment === 'done' ? 'success' : input.nextFulfillment === 'canceled' ? 'error' : 'pending',
    },
  ];

  if (input.nextFulfillment === 'done' && order.paymentStatus === 'cod_uncollected') {
    timelineAdditions.push({
      time: formatTimelineTime(nowIso),
      text: 'Hệ thống ghi nhận COD đã thu thành công.',
      tone: 'success',
    });
  }

  if (selectedReason) {
    timelineAdditions.push({
      time: formatTimelineTime(nowIso),
      text: `Lý do cập nhật: ${transitionReasonLabel(selectedReason.code)}${(input.reasonNote || '').trim() ? ` - ${(input.reasonNote || '').trim()}` : ''}`,
      tone: 'neutral',
    });
  }

  const auditEntry: AuditEntry = {
    id: `${order.code}-${Date.now()}`,
    at: nowIso,
    actor: input.actor,
    source: input.source,
    orderCode: order.code,
    fromFulfillment: order.fulfillment,
    toFulfillment: input.nextFulfillment,
    fromPayment: order.paymentStatus,
    toPayment: nextPaymentStatus,
    reasonCode: input.reasonCode,
    reasonNote: (input.reasonNote || '').trim() || undefined,
  };

  return {
    ...order,
    fulfillment: input.nextFulfillment,
    paymentStatus: nextPaymentStatus,
    timeline: [...timelineAdditions, ...order.timeline],
    updatedAt: nowIso,
    version: order.version + 1,
    auditLog: [auditEntry, ...order.auditLog],
  };
};

const enforceAutoCancelPendingOrders = () => {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  let hasChanged = false;

  orderRecords = orderRecords.map((order) => {
    if (order.fulfillment !== 'pending') return order;

    const placedAt = new Date(order.date).getTime();
    if (Number.isNaN(placedAt)) return order;
    if (now - placedAt < AUTO_CANCEL_PENDING_MS) return order;
    if (!canTransitionFulfillment(order.fulfillment, 'canceled', order.paymentStatus)) return order;

    hasChanged = true;
    return applyTransitionOnRecord(
      order,
      {
        code: order.code,
        nextFulfillment: 'canceled',
        actor: 'system',
        source: 'orders_list',
        reasonCode: 'payment_timeout',
        reasonNote: AUTO_CANCEL_NOTE,
      },
      nowIso,
    );
  });

  if (hasChanged) {
    emitChange();
  }
};

export const listAdminOrders = () => {
  enforceAutoCancelPendingOrders();
  return orderRecords.map(cloneOrder);
};

export const getAdminOrderByCode = (code: string) => {
  enforceAutoCancelPendingOrders();
  const found = orderRecords.find((item) => item.code === code);
  return found ? cloneOrder(found) : null;
};

export const subscribeAdminOrders = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const transitionAdminOrder = (input: TransitionInput): TransitionResult => {
  enforceAutoCancelPendingOrders();
  const index = orderRecords.findIndex((item) => item.code === input.code);
  if (index < 0) return { ok: false, error: 'Không tìm thấy đơn hàng.' };

  const current = orderRecords[index];
  if (current.fulfillment === input.nextFulfillment) {
    return { ok: false, error: 'Đơn hàng đang ở trạng thái này.' };
  }

  if (!canTransitionFulfillment(current.fulfillment, input.nextFulfillment, current.paymentStatus)) {
    return { ok: false, error: 'Không thể chuyển trạng thái theo luồng hiện tại.' };
  }

  const reasonValidation = validateTransitionReason(input.nextFulfillment, input.reasonCode, input.reasonNote);
  if (!reasonValidation.ok) {
    return { ok: false, error: reasonValidation.error };
  }

  const nowIso = new Date().toISOString();
  const next = applyTransitionOnRecord(current, input, nowIso);
  orderRecords = [
    ...orderRecords.slice(0, index),
    next,
    ...orderRecords.slice(index + 1),
  ];
  emitChange();

  return {
    ok: true,
    order: cloneOrder(next),
    message: `Đã chuyển sang ${fulfillmentLabel(input.nextFulfillment)}.`,
  };
};

export const bulkTransitionToPacking = (codes: string[], actor: string): BulkTransitionResult => {
  enforceAutoCancelPendingOrders();
  const uniqueCodes = Array.from(new Set(codes));
  if (uniqueCodes.length === 0) return { updatedCodes: [], skippedCodes: [] };

  const codeSet = new Set(uniqueCodes);
  const updatedCodes: string[] = [];
  const skippedCodes: string[] = [];
  const nowIso = new Date().toISOString();

  orderRecords = orderRecords.map((order) => {
    if (!codeSet.has(order.code)) return order;

    if (!canTransitionFulfillment(order.fulfillment, 'packing', order.paymentStatus)) {
      skippedCodes.push(order.code);
      return order;
    }

    updatedCodes.push(order.code);
    return applyTransitionOnRecord(
      order,
      {
        code: order.code,
        nextFulfillment: 'packing',
        actor,
        source: 'orders_list',
      },
      nowIso,
    );
  });

  if (updatedCodes.length > 0) {
    emitChange();
  }

  return { updatedCodes, skippedCodes };
};
