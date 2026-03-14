import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  ShoppingBag, 
  Ticket, 
  MapPin, 
  MessageSquare, 
  ChevronRight,
  LogOut,
  Edit2
} from 'lucide-react';
import './Profile.css';

// Type definition for tabs
type TabId = 'account' | 'orders' | 'vouchers' | 'addresses' | 'reviews';

const Profile = () => {
  const [activeTab, setActiveTab] = useState<TabId>('account');

  // Placeholder user data
  const user = {
    name: "John Doe",
    email: "john.doe@example.com",
    tier: "Thành viên Vàng",
    avatar: "J"
  };

  const tabs = [
    { id: 'account', label: 'Thông tin cá khoản', icon: User },
    { id: 'orders', label: 'Lịch sử đơn hàng', icon: ShoppingBag },
    { id: 'vouchers', label: 'Ví voucher', icon: Ticket },
    { id: 'addresses', label: 'Sổ địa chỉ', icon: MapPin },
    { id: 'reviews', label: 'Đánh giá & phản hồi', icon: MessageSquare },
  ];

  const handleLogout = () => {
    // Implement logout logic here later
    alert("Đăng xuất thành công");
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <div className="tab-pane">
            <div className="profile-content-header">
              <h2 className="profile-content-title">Hồ sơ của tôi</h2>
              <p className="text-gray-500 mt-2">Quản lý thông tin hồ sơ để bảo mật tài khoản</p>
            </div>
            
            <div className="tab-placeholder">
              <User className="tab-placeholder-icon" />
              <h3 className="tab-placeholder-title">Thông tin tài khoản</h3>
              <p className="tab-placeholder-desc text-gray-500">
                Hiển thị thông tin cá nhân (Tên, Email, SĐT, Ngày sinh) và form chỉnh sửa tại đây.
              </p>
              <button className="profile-btn-primary">
                <Edit2 size={16} className="mr-2" />
                Chỉnh sửa hồ sơ
              </button>
            </div>
          </div>
        );
      case 'orders':
        return (
          <div className="tab-pane">
            <div className="profile-content-header">
              <h2 className="profile-content-title">Lịch sử đơn hàng</h2>
            </div>
            <div className="tab-placeholder">
              <ShoppingBag className="tab-placeholder-icon" />
              <h3 className="tab-placeholder-title">Chưa có đơn hàng nào</h3>
              <p className="tab-placeholder-desc text-gray-500">
                Bạn chưa có đơn đặt hàng nào. Hãy mua sắm để Coolmate phục vụ bạn nhé!
              </p>
              <Link to="/" className="profile-btn-primary">Tiếp tục mua sắm</Link>
            </div>
          </div>
        );
      case 'vouchers':
        return (
          <div className="tab-pane">
            <div className="profile-content-header">
              <h2 className="profile-content-title">Ví voucher của tôi</h2>
            </div>
            <div className="tab-placeholder">
              <Ticket className="tab-placeholder-icon" />
              <h3 className="tab-placeholder-title">Không có voucher khả dụng</h3>
              <p className="tab-placeholder-desc text-gray-500">
                Bạn chưa có mã giảm giá nào. Hãy lấy mã trong các chương trình khuyến mãi.
              </p>
              <button className="profile-btn-outline">Săn mã ngay</button>
            </div>
          </div>
        );
      case 'addresses':
        return (
          <div className="tab-pane">
            <div className="profile-content-header flex justify-between items-center">
              <h2 className="profile-content-title">Địa chỉ của tôi</h2>
              <button className="profile-btn-primary">+ Thêm địa chỉ mới</button>
            </div>
            <div className="tab-placeholder">
              <MapPin className="tab-placeholder-icon" />
              <h3 className="tab-placeholder-title">Chưa có địa chỉ</h3>
              <p className="tab-placeholder-desc text-gray-500">
                Bạn chưa lưu địa chỉ nhận hàng nào. Việc lưu địa chỉ sẽ giúp thanh toán nhanh hơn.
              </p>
            </div>
          </div>
        );
      case 'reviews':
        return (
          <div className="tab-pane">
            <div className="profile-content-header">
              <h2 className="profile-content-title">Đánh giá & Phản hồi</h2>
            </div>
            <div className="tab-placeholder">
              <MessageSquare className="tab-placeholder-icon" />
              <h3 className="tab-placeholder-title">Chưa có sản phẩm để đánh giá</h3>
              <p className="tab-placeholder-desc text-gray-500">
                Bạn không có sản phẩm nào chờ đánh giá.
              </p>
            </div>
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
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} className="breadcrumb-separator" />
          <span className="current">Tài khoản của tôi</span>
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
                <div className="profile-tier">
                  <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                  {user.tier}
                </div>
              </div>
            </div>

            <ul className="profile-nav-list">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <li key={tab.id} className="profile-nav-item">
                    <button 
                      className={`profile-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab.id as TabId)}
                    >
                      <Icon className="profile-nav-icon" />
                      {tab.label}
                    </button>
                  </li>
                );
              })}
              
              <li className="profile-nav-item mt-4 pt-4 border-t border-gray-200">
                <button className="profile-nav-btn text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                  <LogOut className="profile-nav-icon" />
                  Đăng xuất
                </button>
              </li>
            </ul>
          </aside>

          {/* Main Content */}
          <main className="profile-content">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Profile;
