import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  User,
  ShoppingBag,
  Ticket,
  MapPin,
  MessageSquare,
  ChevronRight,
  LogOut,
  X,
  Calendar,
  ChevronDown,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Bell,
  Package,
  Tag,
  Star,
  Info,
  Trash,
  CheckCheck
} from 'lucide-react';
import AddressModal from './AddressModal';
import EmptyState from '../../components/EmptyState/EmptyState';
import ReviewModal from '../../components/ReviewModal/ReviewModal';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import Skeleton from '../../components/Skeleton/Skeleton';
import { CLIENT_TEXT } from '../../utils/texts';
import { CLIENT_TOAST_MESSAGES } from '../../utils/clientMessages';
import { notificationService } from '../../services/notificationService';
import { addressService } from '../../services/addressService';
import type { Address } from '../../types';
import './Profile.css';

const t = CLIENT_TEXT.profile;
const tCommon = CLIENT_TEXT.common;

type TabId = 'account' | 'orders' | 'vouchers' | 'addresses' | 'reviews' | 'notifications';

interface PendingProduct {
  productId: string;
  productName: string;
  productImage: string;
  orderId: string;
  variant: string;
}

const PENDING_REVIEWS: PendingProduct[] = [
  {
    productId: '101',
    productName: 'Áo Polo Nam Excool',
    productImage: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=80&h=80&fit=crop',
    orderId: 'CM20260312',
    variant: 'Màu: Xanh navy | Size: XL',
  },
  {
    productId: '201',
    productName: 'Áo Thun Nam Cổ Tròn Cotton',
    productImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=80&h=80&fit=crop',
    orderId: 'CM20260301',
    variant: 'Màu: Trắng | Size: L',
  },
];

const Profile = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabId>('account');

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    // Update URL query param
    if (tab === 'account') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', tab);
    }
    setSearchParams(searchParams);
  };

  // Sync activeTab with URL query param
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabId | null;
    if (tabParam && ['account', 'orders', 'vouchers', 'addresses', 'reviews', 'notifications'].includes(tabParam)) {
      if (tabParam !== activeTab) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveTab(tabParam);
      }
    }
  }, [searchParams, activeTab]);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [height, setHeight] = useState('163');
  const [weight, setWeight] = useState('57');
  
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);

  useEffect(() => {
    if (activeTab === 'addresses') {
      setSavedAddresses(addressService.getAll());
    }
  }, [activeTab]);

  const refreshAddresses = () => {
    setSavedAddresses(addressService.getAll());
  };

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewProduct, setReviewProduct] = useState<PendingProduct | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'pending' | 'completed'>('pending');

  const handleOpenReviewModal = (product: PendingProduct) => {
    setReviewProduct(product);
    setIsReviewModalOpen(true);
  };

  const handleCloseReviewModal = () => {
    setIsReviewModalOpen(false);
    setReviewProduct(null);
  };

  // Placeholder user data
  const user = {
    name: "Ngọc Thịnh Nguyễn",
    phone: "0382253049",
    gender: "Nam",
    dob: "23/02/2004",
    height: "163 cm",
    weight: "57 kg",
    email: "thinh23022004@gmail.com",
    avatar: "N"
  };

  const tabs = [
    { id: 'account', label: t.tabs.account, icon: User },
    { id: 'orders', label: t.tabs.orders, icon: ShoppingBag },
    { id: 'vouchers', label: t.tabs.vouchers, icon: Ticket },
    { id: 'addresses', label: t.tabs.addresses, icon: MapPin },
    { id: 'reviews', label: t.tabs.reviews, icon: MessageSquare },
    { id: 'notifications', label: 'Thông báo', icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    logout();
    addToast(CLIENT_TOAST_MESSAGES.auth.logoutSuccess, "info");
    navigate('/');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <div className="tab-pane">
            <div className="profile-content-header mb-6">
              <h2 className="profile-content-title">Thông tin tài khoản</h2>
            </div>

            <div className="account-info-form">
              {/* Personal Info */}
              <div className="info-group">
                <div className="info-row">
                  <span className="info-label text-gray-500">Họ và tên</span>
                  <span className="info-value font-medium">{user.name}</span>
                </div>
                <div className="info-row">
                  <span className="info-label text-gray-500">Số điện thoại</span>
                  <span className="info-value font-medium">{user.phone}</span>
                </div>
                <div className="info-row">
                  <span className="info-label text-gray-500">Giới tính</span>
                  <span className="info-value font-medium">{user.gender}</span>
                </div>
                <div className="info-row">
                  <span className="info-label text-gray-500">Ngày sinh</span>
                  <span className="info-value font-medium">{user.dob}</span>
                </div>
                <div className="info-row">
                  <span className="info-label text-gray-500">Chiều cao</span>
                  <span className="info-value font-medium">{user.height}</span>
                </div>
                <div className="info-row">
                  <span className="info-label text-gray-500">Cân nặng</span>
                  <span className="info-value font-medium">{user.weight}</span>
                </div>

                <button 
                  className="profile-btn-outline mt-8"
                  onClick={() => setIsAccountModalOpen(true)}
                >
                  CẬP NHẬT
                </button>
              </div>

              {/* Login Info */}
              <div className="info-group mt-10">
                <div className="profile-content-header mb-6">
                  <h3 className="profile-content-title">Thông tin đăng nhập</h3>
                </div>
                <div className="info-row">
                  <span className="info-label text-gray-500">Email</span>
                  <span className="info-value font-medium">{user.email}</span>
                </div>
                <div className="info-row">
                  <span className="info-label text-gray-500">Mật khẩu</span>
                  <span className="info-value font-medium">••••••••••••••</span>
                </div>

                <button 
                  className="profile-btn-outline mt-8"
                  onClick={() => setIsPasswordModalOpen(true)}
                >
                  CẬP NHẬT
                </button>
              </div>
            </div>
          </div>
        );
      case 'orders':
        return (
          <div className="tab-pane">
            <div className="profile-content-header">
              <h2 className="profile-content-title">Lịch sử đơn hàng</h2>
            </div>

            {/* Order Status Filter Tabs */}
            <div className="order-filter-tabs">
              {['Tất cả', 'Chờ xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'].map((status) => (
                <button key={status} className={`order-filter-btn ${status === 'Tất cả' ? 'active' : ''}`}>
                  {status}
                </button>
              ))}
            </div>

            {/* Order Cards */}
            <div className="order-list">
              {/* Note: In a real app, this would check if orders array is empty */}
              {/* For demo, we are showing mock orders. To see empty state, imagine orders = [] */}
              {/* 
              <EmptyState 
                icon={<Package size={80} strokeWidth={1} />}
                title="Bạn chưa có đơn hàng nào"
                description="Hãy trải nghiệm các sản phẩm của Coolmate để bắt đầu hành trình mua sắm của bạn!"
                actionText="Mua sắm ngay"
                actionLink="/"
              />
              */}
              {/* Order 1 - Delivered */}
              <div className="order-card">
                <div className="order-card-header">
                  <div className="order-card-meta">
                    <Link to="/profile/orders/CM20260301" className="order-id">Mã đơn: #CM20260301</Link>
                    <span className="order-date">01/03/2026</span>
                  </div>
                  <span className="order-status-badge status-delivered">Đã giao</span>
                </div>
                <div className="order-card-items">
                  <div className="order-item">
                    <div className="order-item-img">
                      <img src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=80&h=80&fit=crop" alt="Áo Thun" />
                    </div>
                    <div className="order-item-info">
                      <p className="order-item-name">Áo Thun Nam Cổ Tròn Cotton</p>
                      <p className="order-item-variant">Màu: Trắng | Size: L</p>
                      <p className="order-item-qty">x2</p>
                    </div>
                    <span className="order-item-price">299.000đ</span>
                  </div>
                  <div className="order-item">
                    <div className="order-item-img">
                      <img src="https://images.unsplash.com/photo-1542272604-787c3835535d?w=80&h=80&fit=crop" alt="Quần" />
                    </div>
                    <div className="order-item-info">
                      <p className="order-item-name">Quần Jeans Nam Slim Fit</p>
                      <p className="order-item-variant">Màu: Xanh đậm | Size: 32</p>
                      <p className="order-item-qty">x1</p>
                    </div>
                    <span className="order-item-price">459.000đ</span>
                  </div>
                </div>
                <div className="order-card-footer">
                  <div className="order-total">
                    <span>Tổng cộng:</span>
                    <span className="order-total-price">1.057.000đ</span>
                  </div>
                    <div className="order-actions">
                      <Link to="/profile/orders/CM20260301" className="order-action-btn order-btn-outline">Xem chi tiết</Link>
                      <button className="order-action-btn order-btn-primary">Đánh giá</button>
                    </div>
                </div>
              </div>

              {/* Order 2 - Shipping */}
              <div className="order-card">
                <div className="order-card-header">
                  <Link to="/profile/orders/CM20260312" className="order-card-header-link">
                    <div className="order-card-meta">
                      <span className="order-id">Mã đơn: #CM20260312</span>
                      <span className="order-date">12/03/2026</span>
                    </div>
                  </Link>
                  <span className="order-status-badge status-shipping">Đang giao</span>
                </div>
                <div className="order-card-items">
                  <div className="order-item">
                    <div className="order-item-img">
                      <img src="https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=80&h=80&fit=crop" alt="Áo Polo" />
                    </div>
                    <div className="order-item-info">
                      <p className="order-item-name">Áo Polo Nam Excool</p>
                      <p className="order-item-variant">Màu: Xanh navy | Size: XL</p>
                      <p className="order-item-qty">x1</p>
                    </div>
                    <span className="order-item-price">389.000đ</span>
                  </div>
                </div>
                <div className="order-card-footer">
                  <div className="order-total">
                    <span>Tổng cộng:</span>
                    <span className="order-total-price">389.000đ</span>
                  </div>
                    <div className="order-actions">
                      <Link to="/profile/orders/CM20260312" className="order-action-btn order-btn-outline">Xem chi tiết</Link>
                      <button className="order-action-btn order-btn-primary">Theo dõi đơn</button>
                    </div>
                </div>
              </div>

              {/* Order 3 - Cancelled */}
              <div className="order-card">
                <div className="order-card-header">
                  <Link to="/profile/orders/CM20260220" className="order-card-header-link">
                    <div className="order-card-meta">
                      <span className="order-id">Mã đơn: #CM20260220</span>
                      <span className="order-date">20/02/2026</span>
                    </div>
                  </Link>
                  <span className="order-status-badge status-cancelled">Đã hủy</span>
                </div>
                <div className="order-card-items">
                  <div className="order-item">
                    <div className="order-item-img">
                      <img src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=80&h=80&fit=crop" alt="Hoodie" />
                    </div>
                    <div className="order-item-info">
                      <p className="order-item-name">Áo Hoodie Oversize Unisex</p>
                      <p className="order-item-variant">Màu: Đen | Size: M</p>
                      <p className="order-item-qty">x1</p>
                    </div>
                    <span className="order-item-price">549.000đ</span>
                  </div>
                </div>
                <div className="order-card-footer">
                  <div className="order-total">
                    <span>Tổng cộng:</span>
                    <span className="order-total-price">549.000đ</span>
                  </div>
                    <div className="order-actions">
                      <Link to="/profile/orders/CM20260220" className="order-action-btn order-btn-outline">Xem chi tiết</Link>
                      <button className="order-action-btn order-btn-outline">Mua lại</button>
                    </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'vouchers':
        return (
          <div className="tab-pane">
            <div className="profile-content-header">
              <h2 className="profile-content-title">Ví voucher của tôi</h2>
            </div>
            <div className="voucher-list">
              {/* Note: In a real app, this would check if vouchers array is empty */}
              {/* For demo, we are showing mock vouchers. If empty: */}
              {/*
              <EmptyState 
                icon={<Ticket size={80} strokeWidth={1} />}
                title="Ví voucher trống"
                description="Săn ngay những mã giảm giá hấp dẫn để mua sắm tiết kiệm hơn tại Coolmate."
                actionText="Săn Voucher"
                actionLink="/"
              />
              */}
              {/* Voucher 1 */}
              <div className="voucher-card">
                <div className="voucher-stripe"></div>
                <div className="voucher-body">
                  <div className="voucher-top">
                    <span className="voucher-code">WELCOMEJ7BMF6</span>
                    <span className="voucher-remain">(Còn 1)</span>
                  </div>
                  <p className="voucher-desc">Giảm 15% tối đa 50K cho đơn bất kỳ (Không áp dụng cho danh mục SALE)</p>
                  <div className="voucher-bottom">
                    <span className="voucher-expiry">HSD: 12/04/2026</span>
                    <button className="voucher-condition-btn">Điều kiện</button>
                  </div>
                </div>
              </div>

              {/* Voucher 2 */}
              <div className="voucher-card">
                <div className="voucher-stripe"></div>
                <div className="voucher-body">
                  <div className="voucher-top">
                    <span className="voucher-code">FREESHIP50K</span>
                    <span className="voucher-remain">(Còn 2)</span>
                  </div>
                  <p className="voucher-desc">Miễn phí vận chuyển cho đơn hàng từ 300K</p>
                  <div className="voucher-bottom">
                    <span className="voucher-expiry">HSD: 30/06/2026</span>
                    <button className="voucher-condition-btn">Điều kiện</button>
                  </div>
                </div>
              </div>

              {/* Voucher 3 */}
              <div className="voucher-card">
                <div className="voucher-stripe"></div>
                <div className="voucher-body">
                  <div className="voucher-top">
                    <span className="voucher-code">SUMMER2026</span>
                    <span className="voucher-remain">(Còn 1)</span>
                  </div>
                  <p className="voucher-desc">Giảm 20% tối đa 100K cho đơn từ 500K – BST Hè 2026</p>
                  <div className="voucher-bottom">
                    <span className="voucher-expiry">HSD: 31/08/2026</span>
                    <button className="voucher-condition-btn">Điều kiện</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'addresses':
        return (
          <div className="tab-pane">
            <div className="address-header">
              <h2 className="profile-content-title">Địa chỉ của tôi</h2>
              <button className="address-add-btn" onClick={() => setIsAddressModalOpen(true)}>
                <span>+</span> THÊM ĐỊA CHỈ MỚI
              </button>
            </div>
            
            <div className="address-book-content">
              <h3 className="address-book-subtitle">Sổ địa chỉ</h3>
              
              {savedAddresses.length === 0 ? (
                <EmptyState 
                  icon={<MapPin size={80} strokeWidth={1} />}
                  title="Sổ địa chỉ trống"
                  description="Bạn chưa có địa chỉ nào được lưu. Thêm địa chỉ để quá trình đặt hàng nhanh chóng hơn."
                />
              ) : (
                <div className="address-list">
                  {savedAddresses.map((addr) => (
                    <div key={addr.id} className="address-card">
                      <div className="address-card-info">
                        <div className="address-card-top">
                          <span className="address-card-name">{addr.fullName}</span>
                          <span className="address-card-divider">|</span>
                          <span className="address-card-phone">{addr.phone}</span>
                          {addr.isDefault && <span className="address-default-badge">Mặc định</span>}
                        </div>
                        <p className="address-card-detail">{addr.detail}</p>
                        <p className="address-card-region">{addr.ward}, {addr.district}, {addr.province}</p>
                      </div>
                      <button 
                        className="address-card-delete" 
                        onClick={() => {
                          addressService.remove(addr.id);
                          refreshAddresses();
                          addToast('Đã xóa địa chỉ', 'success');
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      case 'reviews':
        return (
          <div className="tab-pane">
            <div className="profile-content-header">
              <h2 className="profile-content-title">Đánh giá & Phản hồi</h2>
            </div>

            {/* Review Filter Tabs */}
            <div className="order-filter-tabs">
              <button 
                className={`order-filter-btn ${reviewFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setReviewFilter('pending')}
              >
                Chờ đánh giá ({PENDING_REVIEWS.length})
              </button>
              <button 
                className={`order-filter-btn ${reviewFilter === 'completed' ? 'active' : ''}`}
                onClick={() => setReviewFilter('completed')}
              >
                Đã đánh giá
              </button>
            </div>

            {reviewFilter === 'pending' && (
              <div className="review-section">
                <h3 className="review-section-title">Sản phẩm chờ đánh giá</h3>
                {PENDING_REVIEWS.length > 0 ? (
                  <div className="review-pending-list">
                    {PENDING_REVIEWS.map((product) => (
                      <div key={product.productId} className="review-pending-card">
                        <div className="review-pending-product">
                          <div className="review-product-img">
                            <img src={product.productImage} alt={product.productName} />
                          </div>
                          <div className="review-product-info">
                            <p className="review-product-name">{product.productName}</p>
                            <p className="review-product-variant">{product.variant}</p>
                            <p className="review-product-order">Đơn hàng: #{product.orderId}</p>
                          </div>
                        </div>
                        <button 
                          className="review-write-btn"
                          onClick={() => handleOpenReviewModal(product)}
                        >
                          Viết đánh giá
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="review-empty">
                    <p>Không có sản phẩm nào chờ đánh giá</p>
                  </div>
                )}
              </div>
            )}

            {reviewFilter === 'completed' && (
              <div className="review-section">
                <h3 className="review-section-title">Đánh giá của bạn</h3>
                <div className="review-completed-list">
                  <div className="review-completed-card">
                    <div className="review-completed-header">
                      <div className="review-pending-product">
                        <div className="review-product-img">
                          <img src="https://images.unsplash.com/photo-1542272604-787c3835535d?w=80&h=80&fit=crop" alt="Quần Jeans" />
                        </div>
                        <div className="review-product-info">
                          <p className="review-product-name">Quần Jeans Nam Slim Fit</p>
                          <p className="review-product-variant">Màu: Xanh đậm | Size: 32</p>
                        </div>
                      </div>
                      <span className="review-date">01/03/2026</span>
                    </div>
                    <div className="review-stars">
                      {'★★★★★'.split('').map((star, i) => (
                        <span key={i} className={`review-star ${i < 5 ? 'filled' : ''}`}>{star}</span>
                      ))}
                    </div>
                    <p className="review-text">
                      Vải jeans mềm, co giãn tốt, mặc rất thoải mái. Form slim fit vừa vặn, không quá ôm. Sẽ mua thêm màu khác!
                    </p>
                    <div className="review-reply">
                      <div className="review-reply-header">
                        <span className="review-reply-badge">Phản hồi từ shop</span>
                      </div>
                      <p className="review-reply-text">
                        Cảm ơn bạn đã tin tưởng và mua hàng tại Coolmate! Rất vui khi biết bạn hài lòng với sản phẩm. Chúc bạn một ngày tốt lành!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'notifications':
      return (
        <div className="tab-pane">
          <div className="profile-content-header">
            <h2 className="profile-content-title">Thông báo</h2>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read-btn"
                onClick={() => {
                  markAllAsRead();
                  addToast(CLIENT_TOAST_MESSAGES.notifications.markedAllRead, 'success');
                }}
              >
                <CheckCheck size={16} />
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="notifications-empty">
              <Bell size={64} strokeWidth={1} />
              <p>Không có thông báo nào</p>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`notification-card ${!notif.read ? 'unread' : ''}`}
                  onClick={() => {
                    if (!notif.read) {
                      markAsRead(notif.id);
                    }
                    if (notif.link) {
                      navigate(notif.link);
                    }
                  }}
                >
                  <div className={`notification-icon notification-icon-${notif.type}`}>
                    {notif.type === 'order' && <Package size={20} />}
                    {notif.type === 'promotion' && <Tag size={20} />}
                    {notif.type === 'review' && <Star size={20} />}
                    {notif.type === 'system' && <Info size={20} />}
                  </div>
                  <div className="notification-content">
                    <p className="notification-title">{notif.title}</p>
                    <p className="notification-message">{notif.message}</p>
                    <span className="notification-time">
                      {notificationService.formatTimeAgo(notif.createdAt)}
                    </span>
                  </div>
                  <button 
                    className="notification-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif.id);
                      addToast(CLIENT_TOAST_MESSAGES.notifications.deleted, 'info');
                    }}
                  >
                    <Trash size={16} />
                  </button>
                  {!notif.read && <span className="notification-dot" />}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    default:
      return null;
    }
  };

  return (
    <div className="profile-page">
      <div className="container">
        {/* Breadcrumbs */}
        <nav className="profile-breadcrumbs">
          <Link to="/">{tCommon.breadcrumb.home}</Link>
          <ChevronRight size={14} className="breadcrumb-separator" />
          <span className="current">{t.title}</span>
        </nav>

        <div className="profile-layout">
          {/* Sidebar */}
          <aside className="profile-sidebar">
            <div className="profile-user-info">
              <div className="profile-avatar">
                {/* Default to Initial if no image */}
                {user.avatar}
              </div>
              <div>
                <div className="profile-name">{user.name}</div>
              </div>
            </div>

            <ul className="profile-nav-list">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const hasBadge = tab.badge && tab.badge > 0;
                return (
                  <li key={tab.id} className="profile-nav-item">
                    <button
                      className={`profile-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                      onClick={() => handleTabChange(tab.id as TabId)}
                    >
                      <Icon className="profile-nav-icon" />
                      {tab.label}
                      {hasBadge && <span className="notif-tab-badge">{tab.badge}</span>}
                    </button>
                  </li>
                );
              })}

              <li className="profile-nav-item mt-4 pt-4 border-t border-gray-200">
                <button className="profile-nav-btn text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                  <LogOut className="profile-nav-icon" />
                  {t.logout}
                </button>
              </li>
            </ul>
          </aside>

          {/* Main Content */}
          <main className="profile-content">
            {isLoading ? (
              <div className="profile-loading">
                <Skeleton type="text" width="40%" height={32} />
                <div className="profile-loading-rows">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="profile-loading-row">
                      <Skeleton type="text" width="30%" />
                      <Skeleton type="text" width="50%" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              renderContent() || <div className="p-8 text-center text-red-500">Error rendering tab: {activeTab}</div>
            )}
          </main>
        </div>
      </div>

      {/* Account Update Modal */}
      {isAccountModalOpen && (
        <div className="profile-modal-overlay" onClick={() => setIsAccountModalOpen(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <button className="profile-modal-close" onClick={() => setIsAccountModalOpen(false)}>
              <X size={20} />
            </button>
            <h2 className="profile-modal-title">Chỉnh sửa thông tin tài khoản</h2>
            
            <form className="profile-modal-form" onSubmit={(e) => { e.preventDefault(); setIsAccountModalOpen(false); }}>
              {/* Name Input */}
              <div className="modal-input-group mt-10">
                <span className="modal-floating-label">Họ và tên</span>
                <User className="modal-input-icon" size={18} />
                <input type="text" className="modal-input" defaultValue={user.name} />
              </div>
              
              {/* DOB Inputs */}
              <div className="modal-flex-row mt-10 gap-4">
                <div className="modal-input-group">
                  <span className="modal-floating-label">Ngày</span>
                  <Calendar className="modal-input-icon" size={18} />
                  <input type="text" className="modal-input select-arrow-pad" defaultValue="23" />
                  <ChevronDown className="modal-select-arrow" size={16} />
                </div>
                <div className="modal-input-group">
                  <span className="modal-floating-label">Tháng</span>
                  <Calendar className="modal-input-icon" size={18} />
                  <input type="text" className="modal-input select-arrow-pad" defaultValue="2" />
                  <ChevronDown className="modal-select-arrow" size={16} />
                </div>
                <div className="modal-input-group">
                  <span className="modal-floating-label">Năm</span>
                  <Calendar className="modal-input-icon" size={18} />
                  <input type="text" className="modal-input select-arrow-pad" defaultValue="2004" />
                  <ChevronDown className="modal-select-arrow" size={16} />
                </div>
              </div>
              
              {/* Gender Radio */}
              <div className="modal-flex-row mt-10 mb-2 gap-6 items-center">
                <label className="modal-radio-label">
                  <input type="radio" name="gender" value="Nam" defaultChecked />
                  <span className="radio-custom"></span>
                  Nam
                </label>
                <label className="modal-radio-label">
                  <input type="radio" name="gender" value="Nữ" />
                  <span className="radio-custom"></span>
                  Nữ
                </label>
                <label className="modal-radio-label">
                  <input type="radio" name="gender" value="Khác" />
                  <span className="radio-custom"></span>
                  Không tiết lộ
                </label>
              </div>
              
              {/* Phone Input */}
              <div className="modal-input-group mt-10">
                <span className="modal-floating-label">Số điện thoại</span>
                <div className="modal-input-icon">
                  <img src="https://flagcdn.com/w20/vn.png" alt="VN Flag" className="w-5 h-auto rounded-sm" />
                </div>
                <input type="text" className="modal-input" defaultValue={user.phone} />
              </div>
              
              {/* Height Slider */}
              <div className="modal-slider-group mt-10">
                <span className="modal-slider-label">Chiều cao</span>
                <input 
                  type="range" 
                  min="100" 
                  max="190" 
                  value={height} 
                  onChange={(e) => setHeight(e.target.value)}
                  className="modal-slider mx-4" 
                  style={{ '--val': `${((Number(height) - 100) / (190 - 100)) * 100}%` } as React.CSSProperties}
                />
                <span className="modal-slider-val text-co-black font-bold">{height}cm</span>
              </div>
              
              {/* Weight Slider */}
              <div className="modal-slider-group mt-10 mb-8">
                <span className="modal-slider-label">Cân nặng</span>
                <input 
                  type="range" 
                  min="30" 
                  max="90" 
                  value={weight} 
                  onChange={(e) => setWeight(e.target.value)}
                  className="modal-slider mx-4" 
                  style={{ '--val': `${((Number(weight) - 30) / (90 - 30)) * 100}%` } as React.CSSProperties}
                />
                <span className="modal-slider-val text-co-black font-bold">{weight}kg</span>
              </div>
              
              <button type="submit" className="modal-submit-btn">
                CẬP NHẬT THÔNG TIN <span className="ml-2">→</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Password Update Modal */}
      {isPasswordModalOpen && (
        <div className="profile-modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="profile-modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <button className="profile-modal-close" onClick={() => setIsPasswordModalOpen(false)}>
              <X size={20} />
            </button>
            <h2 className="profile-modal-title leading-tight whitespace-pre-line">
              {"Chỉnh sửa thông tin\ntài khoản"}
            </h2>
            
            <form className="profile-modal-form mt-8" onSubmit={(e) => { e.preventDefault(); setIsPasswordModalOpen(false); }}>
              {/* Old Password */}
              <div className="modal-input-group mt-10">
                <span className="modal-floating-label">Mật khẩu cũ</span>
                <Lock className="modal-input-icon text-gray-400" size={18} />
                <input 
                  type={showOldPassword ? "text" : "password"} 
                  className="modal-input pr-10" 
                  defaultValue="password123" 
                />
                <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="profile-modal-icon-btn">
                  {showOldPassword ? <EyeOff className="text-black" size={18} /> : <Eye className="text-black" size={18} />}
                </button>
              </div>

              {/* New Password */}
              <div className="modal-input-group mt-10">
                <span className="modal-floating-label hidden-if-empty">Mật khẩu mới</span>
                <Lock className="modal-input-icon text-gray-300" size={18} />
                <input 
                  type={showNewPassword ? "text" : "password"} 
                  className="modal-input pr-10 text-gray-400" 
                  placeholder="Mật khẩu mới" 
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="profile-modal-icon-btn">
                  {showNewPassword ? <EyeOff className="text-black" size={18} /> : <Eye className="text-black" size={18} />}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="modal-input-group mt-10 mb-10">
                <span className="modal-floating-label hidden-if-empty">Nhập lại mật khẩu</span>
                <Lock className="modal-input-icon text-gray-300" size={18} />
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  className="modal-input pr-10 text-gray-400" 
                  placeholder="Nhập lại mật khẩu" 
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="profile-modal-icon-btn">
                  {showConfirmPassword ? <EyeOff className="text-black" size={18} /> : <Eye className="text-black" size={18} />}
                </button>
              </div>

              <button type="submit" className="modal-submit-btn">
                CẬP NHẬT MẬT KHẨU
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Address Modal */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={refreshAddresses}
      />

      {/* Review Modal */}
      {reviewProduct && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={handleCloseReviewModal}
          product={reviewProduct}
        />
      )}
    </div>
  );
};

export default Profile;
