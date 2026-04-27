import type { ProfileTabContentProps } from '../ProfileTabContent.types';

const AccountTab = ({
  user,
  profileLoading,
  profileError,
  onOpenAccountModal,
  onOpenPasswordModal,
}: Pick<ProfileTabContentProps,
  | 'user'
  | 'profileLoading'
  | 'profileError'
  | 'onOpenAccountModal'
  | 'onOpenPasswordModal'
>) => (
  <div className="tab-pane">
    <div className="profile-content-header mb-6">
      <h2 className="profile-content-title">Thông tin tài khoản</h2>
    </div>
    {profileLoading ? <p className="account-meta">Đang tải hồ sơ tài khoản...</p> : null}
    {profileError ? <p className="account-meta">{profileError}</p> : null}

    <div className="account-info-form">
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

        <button className="profile-btn-outline mt-8" onClick={onOpenAccountModal}>
          CẬP NHẬT
        </button>
      </div>

      <div className="info-group mt-10">
        <div className="profile-content-header mb-6">
          <h3 className="profile-content-title" style={{ color: '#000000' }}>Thông tin đăng nhập</h3>
        </div>
        <div className="info-row">
          <span className="info-label text-gray-500">Email</span>
          <span className="info-value font-medium">{user.email}</span>
        </div>
        <div className="info-row">
          <span className="info-label text-gray-500">Mật khẩu</span>
          <span className="info-value font-medium">••••••••••••••••</span>
        </div>

        <button className="profile-btn-outline mt-8" onClick={onOpenPasswordModal}>
          CẬP NHẬT
        </button>
      </div>
    </div>
  </div>
);

export default AccountTab;
