/**
 * orderService.ts — Client-facing order operations.
 * Now reads/writes through sharedOrderStore (unified with AdminOrders).
 */
import { sharedOrderStore, fulfillmentToClientStatus, clientStatusToFulfillment, type SharedOrder, type ClientOrderStatus } from './sharedOrderStore';
import type { Order, OrderStatus, OrderItem, OrderStatusStep } from '../types';

interface OrderInput {
  id: string;
  createdAt?: string;
  status: OrderStatus;
  total: number;
  items: {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    image: string;
    quantity: number;
    color?: string;
    size?: string;
  }[];
  addressSummary: string;
  paymentMethod: string;
}

const toClientOrder = (o: SharedOrder): Order => ({
  id: o.id,
  createdAt: o.createdAt,
  status: fulfillmentToClientStatus(o.fulfillment, o.paymentStatus) as OrderStatus,
  total: o.total,
  items: o.items.map((item): OrderItem => ({
    id: item.id,
    name: item.name,
    price: item.price,
    originalPrice: item.originalPrice,
    image: item.image,
    quantity: item.quantity,
    color: item.color,
    size: item.size,
  })),
  addressSummary: `${o.customerName}, ${o.customerPhone}, ${o.address}`,
  paymentMethod: o.paymentMethod,
  statusSteps: o.timeline.map((t): OrderStatusStep => ({
    label: t.text,
    timestamp: t.time,
  })),
  cancelReason: o.cancelReason,
  cancelledAt: o.cancelledAt,
  tracking: o.tracking,
});

export const orderService = {
  list(): Order[] {
    return sharedOrderStore.getAll().map(toClientOrder);
  },

  getById(id: string): Order | null {
    const order = sharedOrderStore.getById(id);
    return order ? toClientOrder(order) : null;
  },

  add(order: OrderInput) {
    const now = new Date().toISOString();
    const shared: SharedOrder = {
      id: order.id,
      createdAt: order.createdAt || now,
      customerName: order.addressSummary.split(',')[0]?.trim() || 'Khách hàng',
      customerEmail: '',
      customerPhone: order.addressSummary.split(',')[1]?.trim() || '',
      customerAvatar: `https://ui-avatars.com/api/?name=KH&background=3B82F6&color=fff`,
      address: order.addressSummary.split(',').slice(2).join(',').trim() || order.addressSummary,
      shipMethod: 'GHN - Giao tiêu chuẩn',
      tracking: '',
      note: '',
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentMethod === 'COD' ? 'cod_uncollected' : 'paid',
      fulfillment: clientStatusToFulfillment(order.status as ClientOrderStatus),
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice,
        image: item.image,
        quantity: item.quantity,
        color: item.color,
        size: item.size,
      })),
      subtotal: order.items.reduce((s, i) => s + i.price * i.quantity, 0),
      shippingFee: 0,
      discount: 0,
      total: order.total,
      timeline: [
        { time: new Date().toLocaleString('vi-VN'), text: 'Đặt hàng thành công.', tone: 'success' },
      ],
    };
    sharedOrderStore.add(shared);
  },

  cancel(id: string, reason: string): boolean {
    return sharedOrderStore.cancel(id, reason);
  },

  canCancel(order: Order): boolean {
    const shared = sharedOrderStore.getById(order.id);
    if (!shared) return false;
    return sharedOrderStore.canCancel(shared);
  },
};