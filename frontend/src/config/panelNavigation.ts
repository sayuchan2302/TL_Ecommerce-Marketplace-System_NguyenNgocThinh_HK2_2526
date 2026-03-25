import type { PanelNavItem } from '../pages/Admin/AdminLayout';

export const adminPanelNav: PanelNavItem[] = [
  { label: 'Tổng quan', to: '/admin', exact: true },
  { label: 'Danh mục', to: '/admin/categories' },
  { label: 'Gian hàng', to: '/admin/stores' },
  { label: 'Khách hàng', to: '/admin/users' },
  { label: 'Đơn hàng', to: '/admin/orders' },
  { label: 'Hoàn đơn', to: '/admin/returns' },
  { label: 'Tài chính', to: '/admin/financials' },
  { label: 'Khuyến mãi', to: '/admin/promotions' },
  { label: 'Đánh giá', to: '/admin/reviews' },
  { label: 'Bot và AI (thử nghiệm)', to: '/admin/bot-ai' },
];

export const vendorPanelNav: PanelNavItem[] = [
  { label: 'Tổng quan', to: '/vendor/dashboard', exact: true },
  { label: 'Kho', to: '/vendor/products' },
  { label: 'Đơn hàng', to: '/vendor/orders' },
  { label: 'Gian hàng', to: '/vendor/storefront' },
  { label: 'Voucher shop', to: '/vendor/promotions' },
  { label: 'Đánh giá và phản hồi', to: '/vendor/reviews' },
  { label: 'Doanh thu thực nhận', to: '/vendor/analytics' },
  { label: 'Cài đặt vận hành', to: '/vendor/settings' },
];
