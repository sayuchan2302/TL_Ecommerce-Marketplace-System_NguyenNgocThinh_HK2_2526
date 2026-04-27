import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import EmptyState from '../../../../components/EmptyState/EmptyState';
import type { ProfileTabContentProps } from '../ProfileTabContent.types';

const orderFilterOptions = ['Tất cả', 'Chờ xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'];

const statusMap: Record<string, string> = {
  'Tất cả': 'all',
  'Chờ xác nhận': 'pending',
  'Đang giao': 'shipping',
  'Đã giao': 'delivered',
  'Đã hủy': 'cancelled',
};

const OrdersTab = ({
  orderFilter,
  onOrderFilterChange,
  orders,
  ordersLoading,
  ordersError,
  orderStatusLabelMap,
  onOpenOrderDetail,
  onRequestCancelOrder,
}: Pick<ProfileTabContentProps,
  | 'orderFilter'
  | 'onOrderFilterChange'
  | 'orders'
  | 'ordersLoading'
  | 'ordersError'
  | 'orderStatusLabelMap'
  | 'onOpenOrderDetail'
  | 'onRequestCancelOrder'
>) => {
  const filteredOrders = orderFilter === 'Tất cả'
    ? orders
    : orders.filter((order) => order.status === statusMap[orderFilter]);

  return (
    <div className="tab-pane">
      <div className="profile-content-header">
        <h2 className="profile-content-title">Lịch sử đơn hàng</h2>
      </div>

      <div className="order-filter-tabs">
        {orderFilterOptions.map((status) => (
          <button
            key={status}
            className={`order-filter-btn ${orderFilter === status ? 'active' : ''}`}
            onClick={() => onOrderFilterChange(status)}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="order-list">
        {ordersLoading ? (
          <div className="account-meta">Đang tải đơn hàng...</div>
        ) : ordersError ? (
          <div className="account-meta">{ordersError}</div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={<Package size={80} strokeWidth={1} />}
            title="Bạn chưa có đơn hàng nào"
            description="Hãy trải nghiệm các sản phẩm của Coolmate để bắt đầu hành trình mua sắm của bạn!"
            actionText="Mua sắm ngay"
            actionLink="/"
          />
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-card-header">
                <div className="order-card-meta">
                  <button className="order-id-link" onClick={() => onOpenOrderDetail(order)}>
                    Mã đơn: #{order.code || order.id}
                  </button>
                  <span className="order-date">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <span className={`order-status-badge status-${order.status}`}>
                  {orderStatusLabelMap[order.status] ?? order.status}
                </span>
              </div>
              <div className="order-card-items">
                {order.items.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="order-item">
                    <Link to={`/product/${encodeURIComponent(item.id)}`} className="order-item-img">
                      <img src={item.image} alt={item.name} />
                    </Link>
                    <div className="order-item-info">
                      <p className="order-item-name">{item.name}</p>
                      {item.color && <p className="order-item-variant">Màu: {item.color}</p>}
                      {item.size && <p className="order-item-variant">Size: {item.size}</p>}
                      <p className="order-item-qty">x{item.quantity}</p>
                    </div>
                    <span className="order-item-price">{item.price.toLocaleString('vi-VN')}đ</span>
                  </div>
                ))}
                {order.items.length > 2 && <p className="order-more-items">+{order.items.length - 2} sản phẩm khác</p>}
              </div>
              <div className="order-card-footer">
                <div className="order-total">
                  <span>Tổng cộng:</span>
                  <span className="order-total-price">{order.total.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="order-actions">
                  {order.status === 'pending' && (
                    <button className="order-action-btn order-btn-danger" onClick={() => onRequestCancelOrder(order.id)}>
                      Hủy đơn hàng
                    </button>
                  )}
                  <button className="order-action-btn order-btn-outline" onClick={() => onOpenOrderDetail(order)}>
                    Xem chi tiết
                  </button>
                  {order.status === 'delivered' && <button className="order-action-btn order-btn-primary">Đánh giá</button>}
                  {order.status === 'shipping' && <button className="order-action-btn order-btn-primary">Theo dõi đơn</button>}
                  {order.status === 'cancelled' && <button className="order-action-btn order-btn-outline">Mua lại</button>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrdersTab;
