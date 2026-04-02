export interface Product {
  id: number;
  sku?: string;
  name: string;
  price: number;
  priceDecimal?: string;
  originalPrice?: number;
  originalPriceDecimal?: string;
  image: string;
  badge?: string;
  colors?: string[];
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  storeLogo?: string;
  isOfficialStore?: boolean;
}

interface BigDecimalMoney {
  amount: string;
  currency: 'VND';
}

interface MarketplaceStoreRecord {
  storeId: string;
  storeCode: string;
  storeName: string;
  storeSlug: string;
  storeLogo: string;
  rating: number;
  isOfficialStore: boolean;
}

interface MarketplaceProductRecord {
  id: number;
  productCode: string;
  tenantId: string;
  segment: 'men' | 'women';
  name: string;
  image: string;
  badge?: string;
  colors?: string[];
  pricing: {
    unitPrice: BigDecimalMoney;
    originalPrice?: BigDecimalMoney;
  };
  store: MarketplaceStoreRecord;
}

const parseMoney = (amount: string): number => Number.parseFloat(amount);

const marketplaceStores: MarketplaceStoreRecord[] = [
  {
    storeId: '13e7b68c-5eb8-4b41-9bd2-6dca09a94610',
    storeCode: 'SHOP-CM-001',
    storeName: 'Coolmate Mall',
    storeSlug: 'coolmate-mall',
    storeLogo: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=240&auto=format&fit=crop',
    rating: 4.9,
    isOfficialStore: true,
  },
  {
    storeId: '120fba48-20fc-43f6-81b8-367e8fb01f31',
    storeCode: 'SHOP-TF-028',
    storeName: 'Thịnh Fashion Shop',
    storeSlug: 'thinh-fashion',
    storeLogo: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?q=80&w=240&auto=format&fit=crop',
    rating: 4.8,
    isOfficialStore: false,
  },
  {
    storeId: '8ba6d920-4b50-4f34-bac2-3644f7672252',
    storeCode: 'SHOP-MB-104',
    storeName: 'Mina Boutique',
    storeSlug: 'mina-boutique',
    storeLogo: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=240&auto=format&fit=crop',
    rating: 4.7,
    isOfficialStore: false,
  },
  {
    storeId: '40d857ee-cf21-48f8-bf8f-3d5ccf42ca10',
    storeCode: 'SHOP-AP-233',
    storeName: 'Athleisure Pro',
    storeSlug: 'athleisure-pro',
    storeLogo: 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=240&auto=format&fit=crop',
    rating: 4.8,
    isOfficialStore: false,
  },
];

const marketplaceProducts: MarketplaceProductRecord[] = [
  {
    id: 101,
    productCode: 'PRD-MEN-101',
    tenantId: marketplaceStores[0].storeId,
    segment: 'men',
    name: 'Áo Polo Nam Cotton Khử Mùi',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=672&h=990&q=80',
    badge: 'NEW',
    colors: ['#000000', '#ffffff', '#1e3a8a'],
    pricing: {
      unitPrice: { amount: '359000.00', currency: 'VND' },
      originalPrice: { amount: '450000.00', currency: 'VND' },
    },
    store: marketplaceStores[0],
  },
  {
    id: 102,
    productCode: 'PRD-MEN-102',
    tenantId: marketplaceStores[1].storeId,
    segment: 'men',
    name: 'Quần Jeans Nam Dáng Straight Tôn Dáng',
    image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=672&h=990&q=80',
    colors: ['#1e3a8a', '#6b7280'],
    pricing: {
      unitPrice: { amount: '599000.00', currency: 'VND' },
    },
    store: marketplaceStores[1],
  },
  {
    id: 103,
    productCode: 'PRD-MEN-103',
    tenantId: marketplaceStores[2].storeId,
    segment: 'men',
    name: 'Áo Sơ Mi Nam Vải Modal Thoáng Mát',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=672&h=990&q=80',
    badge: 'BEST SELLER',
    pricing: {
      unitPrice: { amount: '459000.00', currency: 'VND' },
      originalPrice: { amount: '550000.00', currency: 'VND' },
    },
    store: marketplaceStores[2],
  },
  {
    id: 104,
    productCode: 'PRD-MEN-104',
    tenantId: marketplaceStores[3].storeId,
    segment: 'men',
    name: 'Áo Thun Nam Excool Co Giãn 4 Chiều',
    image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=672&h=990&q=80',
    colors: ['#000000', '#f3f4f6'],
    pricing: {
      unitPrice: { amount: '129000.00', currency: 'VND' },
    },
    store: marketplaceStores[3],
  },
  {
    id: 105,
    productCode: 'PRD-MEN-105',
    tenantId: marketplaceStores[1].storeId,
    segment: 'men',
    name: 'Quần Shorts Nam Thể Thao Co Giãn',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=672&h=990&q=80',
    colors: ['#000000', '#111827', '#4b5563'],
    pricing: {
      unitPrice: { amount: '249000.00', currency: 'VND' },
      originalPrice: { amount: '299000.00', currency: 'VND' },
    },
    store: marketplaceStores[1],
  },
  {
    id: 106,
    productCode: 'PRD-MEN-106',
    tenantId: marketplaceStores[0].storeId,
    segment: 'men',
    name: 'Áo Khoác Gió Nam Chống Nước Nhẹ',
    image: 'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=672&h=990&q=80',
    colors: ['#000000', '#1e3a8a'],
    pricing: {
      unitPrice: { amount: '499000.00', currency: 'VND' },
      originalPrice: { amount: '599000.00', currency: 'VND' },
    },
    store: marketplaceStores[0],
  },
  {
    id: 107,
    productCode: 'PRD-MEN-107',
    tenantId: marketplaceStores[2].storeId,
    segment: 'men',
    name: 'Tất Cổ Thấp Khử Mùi Hôi (Pack 3)',
    image: 'https://images.unsplash.com/photo-1524503033411-c4c2b460ccb6?auto=format&fit=crop&w=672&h=990&q=80',
    badge: 'SALE',
    pricing: {
      unitPrice: { amount: '99000.00', currency: 'VND' },
      originalPrice: { amount: '150000.00', currency: 'VND' },
    },
    store: marketplaceStores[2],
  },
  {
    id: 108,
    productCode: 'PRD-MEN-108',
    tenantId: marketplaceStores[3].storeId,
    segment: 'men',
    name: 'Bộ Đồ Mặc Nhà Nam Cotton Thoáng',
    image: 'https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=672&h=990&q=80',
    colors: ['#000000', '#4b5563'],
    pricing: {
      unitPrice: { amount: '399000.00', currency: 'VND' },
    },
    store: marketplaceStores[3],
  },
  {
    id: 201,
    productCode: 'PRD-WOM-201',
    tenantId: marketplaceStores[2].storeId,
    segment: 'women',
    name: 'Váy Liền Nữ Cổ Khuy Thanh Lịch',
    image: 'https://images.unsplash.com/photo-1524504543470-0f085452bb3f?auto=format&fit=crop&w=672&h=990&q=80',
    badge: 'HOT',
    colors: ['#ffffff', '#000000', '#fbcfe8'],
    pricing: {
      unitPrice: { amount: '499000.00', currency: 'VND' },
      originalPrice: { amount: '650000.00', currency: 'VND' },
    },
    store: marketplaceStores[2],
  },
  {
    id: 202,
    productCode: 'PRD-WOM-202',
    tenantId: marketplaceStores[1].storeId,
    segment: 'women',
    name: 'Áo Kiểu Nữ Croptop Năng Động',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=672&h=990&q=80',
    colors: ['#ffffff', '#000000', '#fbcfe8'],
    pricing: {
      unitPrice: { amount: '259000.00', currency: 'VND' },
    },
    store: marketplaceStores[1],
  },
  {
    id: 203,
    productCode: 'PRD-WOM-203',
    tenantId: marketplaceStores[3].storeId,
    segment: 'women',
    name: 'Quần Ống Suông Nữ Hack Dáng',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=672&h=990&q=80',
    colors: ['#374151', '#f3f4f6'],
    pricing: {
      unitPrice: { amount: '389000.00', currency: 'VND' },
    },
    store: marketplaceStores[3],
  },
  {
    id: 204,
    productCode: 'PRD-WOM-204',
    tenantId: marketplaceStores[0].storeId,
    segment: 'women',
    name: 'Áo Nỉ Hoodie Nữ Form Rộng',
    image: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=672&h=990&q=80',
    colors: ['#d1d5db', '#000000'],
    pricing: {
      unitPrice: { amount: '399000.00', currency: 'VND' },
      originalPrice: { amount: '450000.00', currency: 'VND' },
    },
    store: marketplaceStores[0],
  },
  {
    id: 205,
    productCode: 'PRD-WOM-205',
    tenantId: marketplaceStores[1].storeId,
    segment: 'women',
    name: 'Áo Khoác Blazer Nữ Tính',
    image: 'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=672&h=990&q=80',
    colors: ['#000000', '#fcd34d'],
    pricing: {
      unitPrice: { amount: '699000.00', currency: 'VND' },
      originalPrice: { amount: '899000.00', currency: 'VND' },
    },
    store: marketplaceStores[1],
  },
  {
    id: 206,
    productCode: 'PRD-WOM-206',
    tenantId: marketplaceStores[2].storeId,
    segment: 'women',
    name: 'Chân Váy Chữ A Tôn Dáng',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=672&h=990&q=80',
    colors: ['#000000', '#ffffff'],
    pricing: {
      unitPrice: { amount: '299000.00', currency: 'VND' },
    },
    store: marketplaceStores[2],
  },
  {
    id: 207,
    productCode: 'PRD-WOM-207',
    tenantId: marketplaceStores[3].storeId,
    segment: 'women',
    name: 'Quần Shorts Nữ Đi Biển Xinh Xắn',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=672&h=990&q=80',
    colors: ['#6b7280', '#000000'],
    pricing: {
      unitPrice: { amount: '199000.00', currency: 'VND' },
      originalPrice: { amount: '250000.00', currency: 'VND' },
    },
    store: marketplaceStores[3],
  },
  {
    id: 208,
    productCode: 'PRD-WOM-208',
    tenantId: marketplaceStores[0].storeId,
    segment: 'women',
    name: 'Áo Dây Cami Lụa Mát Mẻ',
    image: 'https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=672&h=990&q=80',
    badge: 'NEW',
    colors: ['#ffffff', '#fbcfe8'],
    pricing: {
      unitPrice: { amount: '159000.00', currency: 'VND' },
    },
    store: marketplaceStores[0],
  },
];

const toHomeProduct = (record: MarketplaceProductRecord): Product => ({
  id: record.id,
  sku: record.productCode,
  name: record.name,
  price: parseMoney(record.pricing.unitPrice.amount),
  priceDecimal: record.pricing.unitPrice.amount,
  originalPrice: record.pricing.originalPrice ? parseMoney(record.pricing.originalPrice.amount) : undefined,
  originalPriceDecimal: record.pricing.originalPrice?.amount,
  image: record.image,
  badge: record.badge,
  colors: record.colors,
  storeId: record.store.storeId,
  storeName: record.store.storeName,
  storeSlug: record.store.storeSlug,
  storeLogo: record.store.storeLogo,
  isOfficialStore: record.store.isOfficialStore,
});

export const mensFashion: Product[] = marketplaceProducts
  .filter((record) => record.segment === 'men')
  .map(toHomeProduct);

export const womensFashion: Product[] = marketplaceProducts
  .filter((record) => record.segment === 'women')
  .map(toHomeProduct);

export const productDetailRelated: Product[] = [
  {
    id: 102,
    name: "Áo Thun Nam Thể Thao",
    price: 159000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/February2025/11025595_24_copy_11.jpg",
    colors: ['#000000', '#FFFFFF', '#000080']
  },
  {
    id: 103,
    name: "Quần Short Nam Màu Đen",
    price: 199000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/February2025/11025595_17_copy.jpg",
    colors: ['#000000']
  },
  {
    id: 104,
    name: "Ví Da Nam Cao Cấp",
    price: 349000,
    originalPrice: 450000,
    badge: "SALE",
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/February2025/11025595_21.jpg",
    colors: ['#8B4513', '#000000']
  },
  {
    id: 105,
    name: "Mũ Lưỡi Trai Logo",
    price: 99000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/February2025/11025595_31_copy_91.jpg",
    colors: ['#000080', '#000000', '#FF0000']
  }
];

export interface ReturnItem {
  id: string;
  name: string;
  variant: string;
  price: number;
  image: string;
  selected: boolean;
}

export const returnItems: ReturnItem[] = [
  {
    id: 'i1',
    name: 'Áo Polo Nam Cotton Khử Mùi',
    variant: 'Màu: Đen | Size: L',
    price: 359000,
    image: 'https://media.coolmate.me/cdn-cgi/image/width=320,height=470,quality=85/uploads/February2025/11025595_24_copy_11.jpg',
    selected: true,
  },
  {
    id: 'i2',
    name: 'Quần Jeans Slim Fit',
    variant: 'Màu: Xanh đậm | Size: 32',
    price: 459000,
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=320&h=430&fit=crop',
    selected: false,
  },
];

export interface TrackingStep {
  label: string;
  time: string;
  description?: string;
  status: 'done' | 'current' | 'upcoming';
}

export interface MockOrder {
  id: string;
  phone: string;
  customer: string;
  address: string;
  eta: string;
  status: 'delivered' | 'shipping' | 'processing' | 'pending' | 'cancelled';
  steps: TrackingStep[];
}

export const mockOrders: MockOrder[] = [
  {
    id: 'CM20260301',
    phone: '0382253049',
    customer: 'Ngọc Thịnh Nguyễn',
    address: 'JJJV+Q7F, Quốc lộ 37, Hùng Sơn, Đại Từ, Thái Nguyên',
    eta: 'Dự kiến giao: 14/03/2026',
    status: 'shipping',
    steps: [
      { label: 'Tiếp nhận', time: '10/03/2026 10:12', status: 'done' },
      { label: 'Đang chuẩn bị hàng', time: '10/03/2026 16:00', status: 'done' },
      { label: 'Đang giao', time: '11/03/2026 08:10', description: 'Đang vận chuyển tới bưu cục đích', status: 'current' },
      { label: 'Giao thành công', time: '--', status: 'upcoming' },
    ],
  },
  {
    id: 'CM20260228',
    phone: '0912345678',
    customer: 'Anh Minh',
    address: '12 Nguyễn Trãi, Hà Nội',
    eta: 'Đã giao: 02/03/2026',
    status: 'delivered',
    steps: [
      { label: 'Tiếp nhận', time: '28/02/2026 09:12', status: 'done' },
      { label: 'Đang chuẩn bị hàng', time: '28/02/2026 13:00', status: 'done' },
      { label: 'Đang giao', time: '01/03/2026 08:15', status: 'done' },
      { label: 'Giao thành công', time: '02/03/2026 11:25', status: 'done' },
    ],
  },
];
