import { apiRequest } from './apiClient';
import { calculateCommission } from './commissionService';
import { storeService } from './storeService';

import type { FulfillmentStatus } from '../pages/Admin/orderWorkflow';

interface BackendPage<T> {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
}

interface BackendOrderItem {
  id?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  productName?: string;
  variantName?: string;
  productImage?: string;
}

interface BackendAddress {
  fullName?: string;
  phone?: string;
  addressLine?: string;
  ward?: string;
  district?: string;
  city?: string;
}

interface BackendUser {
  name?: string;
  email?: string;
  phone?: string;
}

interface BackendOrder {
  id: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  subtotal?: number;
  shippingFee?: number;
  discount?: number;
  total?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  note?: string;
  trackingNumber?: string;
  commissionFee?: number;
  vendorPayout?: number;
  items?: BackendOrderItem[];
  user?: BackendUser;
  shippingAddress?: BackendAddress;
}

interface BackendProduct {
  id: string;
  name?: string;
  basePrice?: number;
  salePrice?: number;
  images?: Array<{ url?: string }>;
  variants?: Array<{ stockQuantity?: number }>;
}

interface VendorStatsResponse {
  totalOrders?: number;
  pendingOrders?: number;
  processingOrders?: number;
  deliveredOrders?: number;
  totalRevenue?: number;
  totalPayout?: number;
}

export interface VendorDashboardData {
  stats: {
    todayOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    totalPayout: number;
    totalProducts: number;
    rating: number;
    commissionRate: number;
  };
  recentOrders: VendorOrderSummary[];
  topProducts: VendorTopProduct[];
}

export interface VendorOrderSummary {
  id: string;
  customer: string;
  email: string;
  total: number;
  status: FulfillmentStatus;
  date: string;
  items: number;
  commissionFee: number;
  vendorPayout: number;
  thumb?: string;
}

export interface VendorOrderDetailData {
  id: string;
  status: FulfillmentStatus;
  createdAt: string;
  updatedAt?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    ward: string;
    district: string;
    city: string;
  };
  items: Array<{
    id: string;
    name: string;
    sku: string;
    variant: string;
    price: number;
    quantity: number;
    image: string;
  }>;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  note: string;
  trackingNumber: string;
  commissionFee: number;
  vendorPayout: number;
  timeline: Array<{ status: string; date: string; note: string }>;
}

export interface VendorTopProduct {
  id: string;
  name: string;
  sales: number;
  stock: number;
  revenue: number;
  img: string;
}

export interface VendorSettingsData {
  storeInfo: {
    name: string;
    description: string;
    logo: string;
    contactEmail: string;
    phone: string;
    address: string;
  };
  bankInfo: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    verified: boolean;
  };
  notifications: {
    newOrder: boolean;
    orderStatusChange: boolean;
    lowStock: boolean;
    payoutComplete: boolean;
    promotions: boolean;
  };
  shipping: {
    ghn: boolean;
    ghtk: boolean;
    express: boolean;
    warehouseAddress: string;
    warehouseContact: string;
    warehousePhone: string;
  };
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&h=120&fit=crop';

const DEFAULT_SETTINGS: VendorSettingsData = {
  storeInfo: {
    name: 'Fashion House',
    description: 'Tinh chinh trai nghiem cua hang, logistics va thong tin lien he tai day.',
    logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop',
    contactEmail: 'contact@fashionhouse.vn',
    phone: '0901234567',
    address: '123 Nguyen Hue, Quan 1, TP.HCM',
  },
  bankInfo: {
    bankName: 'Vietcombank',
    accountNumber: '****6789',
    accountHolder: 'NGUYEN VAN A',
    verified: true,
  },
  notifications: {
    newOrder: true,
    orderStatusChange: true,
    lowStock: true,
    payoutComplete: true,
    promotions: false,
  },
  shipping: {
    ghn: true,
    ghtk: true,
    express: false,
    warehouseAddress: '123 Nguyen Hue, Quan 1, TP.HCM',
    warehouseContact: 'Nguyen Van A',
    warehousePhone: '0901234567',
  },
};

const MOCK_DAILY_DATA = [
  { date: '18/05', revenue: 2100000, orders: 5 },
  { date: '19/05', revenue: 3400000, orders: 8 },
  { date: '20/05', revenue: 2800000, orders: 6 },
  { date: '21/05', revenue: 4200000, orders: 9 },
  { date: '22/05', revenue: 3100000, orders: 7 },
  { date: '23/05', revenue: 2600000, orders: 5 },
  { date: '24/05', revenue: 3250000, orders: 8 },
];

const mapBackendStatus = (status?: string): FulfillmentStatus => {
  switch ((status || '').toUpperCase()) {
    case 'CONFIRMED':
    case 'PROCESSING':
      return 'packing';
    case 'SHIPPED':
      return 'shipping';
    case 'DELIVERED':
      return 'done';
    case 'CANCELLED':
      return 'canceled';
    default:
      return 'pending';
  }
};

const mapOrderSummary = (order: BackendOrder): VendorOrderSummary => {
  const total = Number(order.total || 0);
  const fallbackCommission = calculateCommission(total, 5);

  return {
    id: order.id,
    customer: order.user?.name || order.shippingAddress?.fullName || 'Khach hang',
    email: order.user?.email || '',
    total,
    status: mapBackendStatus(order.status),
    date: order.createdAt || new Date().toISOString(),
    items: order.items?.length || 0,
    commissionFee: Number(order.commissionFee ?? fallbackCommission.commission),
    vendorPayout: Number(order.vendorPayout ?? fallbackCommission.payout),
    thumb: order.items?.[0]?.productImage || FALLBACK_IMAGE,
  };
};

const mapOrderDetail = (order: BackendOrder): VendorOrderDetailData => ({
  id: order.id,
  status: mapBackendStatus(order.status),
  createdAt: order.createdAt || new Date().toISOString(),
  updatedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
  customer: {
    name: order.user?.name || order.shippingAddress?.fullName || 'Khach hang',
    email: order.user?.email || '',
    phone: order.user?.phone || order.shippingAddress?.phone || '',
  },
  shippingAddress: {
    fullName: order.shippingAddress?.fullName || order.user?.name || 'Khach hang',
    phone: order.shippingAddress?.phone || order.user?.phone || '',
    address: order.shippingAddress?.addressLine || '',
    ward: order.shippingAddress?.ward || '',
    district: order.shippingAddress?.district || '',
    city: order.shippingAddress?.city || '',
  },
  items: (order.items || []).map((item, index) => ({
    id: item.id || `${order.id}-${index}`,
    name: item.productName || 'San pham',
    sku: item.id || `ITEM-${index + 1}`,
    variant: item.variantName || 'Mac dinh',
    price: Number(item.unitPrice || item.totalPrice || 0),
    quantity: Number(item.quantity || 0),
    image: item.productImage || FALLBACK_IMAGE,
  })),
  subtotal: Number(order.subtotal || 0),
  shippingFee: Number(order.shippingFee || 0),
  discount: Number(order.discount || 0),
  total: Number(order.total || 0),
  paymentMethod: order.paymentMethod || 'COD',
  paymentStatus: (order.paymentStatus || 'UNPAID').toLowerCase(),
  note: order.note || '',
  trackingNumber: order.trackingNumber || '',
  commissionFee: Number(order.commissionFee ?? calculateCommission(Number(order.total || 0), 5).commission),
  vendorPayout: Number(order.vendorPayout ?? calculateCommission(Number(order.total || 0), 5).payout),
  timeline: [
    {
      status: mapBackendStatus(order.status),
      date: order.updatedAt || order.createdAt || new Date().toISOString(),
      note: order.note || 'Don hang da duoc dong bo tu he thong.',
    },
  ],
});

const mapTopProduct = (product: BackendProduct): VendorTopProduct => ({
  id: product.id,
  name: product.name || 'San pham',
  sales: 0,
  stock: (product.variants || []).reduce((sum, variant) => sum + Number(variant.stockQuantity || 0), 0),
  revenue: Number(product.salePrice || product.basePrice || 0),
  img: product.images?.[0]?.url || FALLBACK_IMAGE,
});

const getRecentOrdersFallback = (): VendorOrderSummary[] => [
  {
    id: 'ORD-V-001',
    customer: 'Nguyen Van A',
    email: 'nguyenvana@email.com',
    total: 1250000,
    status: 'pending',
    date: '2024-05-20T10:30:00Z',
    items: 2,
    commissionFee: 62500,
    vendorPayout: 1187500,
    thumb: FALLBACK_IMAGE,
  },
  {
    id: 'ORD-V-002',
    customer: 'Tran Thu B',
    email: 'tranthub@email.com',
    total: 780000,
    status: 'packing',
    date: '2024-05-20T09:15:00Z',
    items: 1,
    commissionFee: 39000,
    vendorPayout: 741000,
    thumb: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=100&h=120&fit=crop',
  },
  {
    id: 'ORD-V-003',
    customer: 'Le Huu C',
    email: 'lehuuc@email.com',
    total: 2150000,
    status: 'shipping',
    date: '2024-05-19T16:45:00Z',
    items: 3,
    commissionFee: 107500,
    vendorPayout: 2042500,
    thumb: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=100&h=120&fit=crop',
  },
];

export const vendorPortalService = {
  async getDashboardData(): Promise<VendorDashboardData> {
    try {
      const [stats, store, orders, products] = await Promise.all([
        apiRequest<VendorStatsResponse>('/api/orders/my-store/stats', {}, { auth: true }),
        storeService.getMyStore(),
        apiRequest<BackendPage<BackendOrder>>('/api/orders/my-store?page=0&size=5', {}, { auth: true }),
        apiRequest<BackendPage<BackendProduct>>('/api/products/my-store?page=0&size=5', {}, { auth: true }),
      ]);

      return {
        stats: {
          todayOrders: (orders.content || []).length,
          pendingOrders: Number(stats.pendingOrders || 0),
          totalRevenue: Number(stats.totalRevenue || 0),
          totalPayout: Number(stats.totalPayout || 0),
          totalProducts: Number(products.totalElements || products.content?.length || 0),
          rating: store.rating,
          commissionRate: store.commissionRate ?? 5,
        },
        recentOrders: (orders.content || []).map(mapOrderSummary),
        topProducts: (products.content || []).slice(0, 3).map(mapTopProduct),
      };
    } catch {
      const store = await storeService.getMyStore().catch(() => null);
      return {
        stats: {
          todayOrders: 12,
          pendingOrders: 4,
          totalRevenue: Number(store?.totalSales || 15800000),
          totalPayout: calculateCommission(Number(store?.totalSales || 15800000), store?.commissionRate ?? 5).payout,
          totalProducts: 48,
          rating: store?.rating || 4.8,
          commissionRate: store?.commissionRate ?? 5,
        },
        recentOrders: getRecentOrdersFallback(),
        topProducts: [
          { id: '1', name: 'Ao Thun Nam Cotton', sales: 124, stock: 45, revenue: 8100000, img: FALLBACK_IMAGE },
          { id: '2', name: 'Quan Jean Slim Fit', sales: 98, stock: 22, revenue: 6840000, img: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=100&h=120&fit=crop' },
          { id: '3', name: 'Ao Polo Premium', sales: 76, stock: 38, revenue: 4800000, img: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=100&h=120&fit=crop' },
        ],
      };
    }
  },

  async getOrders(status?: string): Promise<VendorOrderSummary[]> {
    try {
      const query = status && status !== 'all' ? `?page=0&size=100&status=${encodeURIComponent(status)}` : '?page=0&size=100';
      const page = await apiRequest<BackendPage<BackendOrder>>(`/api/orders/my-store${query}`, {}, { auth: true });
      return (page.content || []).map(mapOrderSummary);
    } catch {
      return getRecentOrdersFallback();
    }
  },

  async getOrderDetail(id: string): Promise<VendorOrderDetailData> {
    try {
      const order = await apiRequest<BackendOrder>(`/api/orders/my-store/${id}`, {}, { auth: true });
      return mapOrderDetail(order);
    } catch {
      return {
        id,
        status: 'pending',
        createdAt: '2024-05-20T10:30:00Z',
        updatedAt: '2024-05-20T10:30:00Z',
        customer: { name: 'Nguyen Van A', email: 'nguyenvana@email.com', phone: '0901234567' },
        shippingAddress: {
          fullName: 'Nguyen Van A',
          phone: '0901234567',
          address: '123 Nguyen Hue',
          ward: 'Phuong Ben Nghe',
          district: 'Quan 1',
          city: 'TP. Ho Chi Minh',
        },
        items: [
          { id: '1', name: 'Ao Thun Nam Cotton Premium', sku: 'ATN-001-WHT-L', variant: 'Trang / L', price: 350000, quantity: 2, image: FALLBACK_IMAGE },
          { id: '2', name: 'Quan Jean Slim Fit', sku: 'QJN-002-BLU-32', variant: 'Xanh dam / 32', price: 550000, quantity: 1, image: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=100&h=120&fit=crop' },
        ],
        subtotal: 1250000,
        shippingFee: 0,
        discount: 0,
        total: 1250000,
        paymentMethod: 'COD',
        paymentStatus: 'pending',
        note: 'Giao hang gio hanh chinh',
        trackingNumber: '',
        commissionFee: 62500,
        vendorPayout: 1187500,
        timeline: [{ status: 'pending', date: '2024-05-20T10:30:00Z', note: 'Don hang duoc tao' }],
      };
    }
  },

  async updateOrderStatus(id: string, status: 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED') {
    try {
      await apiRequest(`/api/orders/my-store/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }, { auth: true });
    } catch {
      // Keep demo flows usable when the frontend is still running on mock auth.
    }
  },

  async getSettings(): Promise<VendorSettingsData> {
    try {
      const store = await storeService.getMyStore();
      return {
        ...DEFAULT_SETTINGS,
        storeInfo: {
          name: store.name,
          description: store.description || DEFAULT_SETTINGS.storeInfo.description,
          logo: store.logo || DEFAULT_SETTINGS.storeInfo.logo,
          contactEmail: store.contactEmail || DEFAULT_SETTINGS.storeInfo.contactEmail,
          phone: store.phone || DEFAULT_SETTINGS.storeInfo.phone,
          address: store.address || DEFAULT_SETTINGS.storeInfo.address,
        },
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  async updateSettings(payload: VendorSettingsData['storeInfo']) {
    return storeService.updateMyStore({
      name: payload.name,
      description: payload.description,
      logo: payload.logo,
      contactEmail: payload.contactEmail,
      phone: payload.phone,
      address: payload.address,
    });
  },

  async getAnalytics() {
    const dashboard = await this.getDashboardData();
    const orders = await this.getOrders().catch(() => []);
    const revenue = dashboard.stats.totalRevenue;
    const orderCount = Math.max(orders.length, dashboard.stats.todayOrders, 1);
    const avgOrderValue = Math.round(revenue / orderCount);

    return {
      periods: {
        today: {
          revenue: Math.round(revenue * 0.18),
          orders: dashboard.stats.todayOrders,
          avgOrderValue,
          conversionRate: 3.2,
          previousRevenue: Math.round(revenue * 0.16),
          previousOrders: Math.max(dashboard.stats.todayOrders - 2, 1),
        },
        week: {
          revenue,
          orders: orderCount,
          avgOrderValue,
          conversionRate: 3.8,
          previousRevenue: Math.round(revenue * 0.86),
          previousOrders: Math.max(orderCount - 4, 1),
        },
        month: {
          revenue: Math.round(revenue * 3.6),
          orders: Math.max(orderCount * 4, orderCount),
          avgOrderValue,
          conversionRate: 4.1,
          previousRevenue: Math.round(revenue * 3.2),
          previousOrders: Math.max(orderCount * 4 - 14, 1),
        },
      },
      dailyData: MOCK_DAILY_DATA,
      topProducts: dashboard.topProducts.map((product) => ({
        ...product,
        sales: product.sales || Math.max(Math.round(product.stock * 0.7), 1),
        revenue: product.revenue || revenue / Math.max(dashboard.topProducts.length, 1),
      })),
      commissionRate: dashboard.stats.commissionRate,
    };
  },
};
