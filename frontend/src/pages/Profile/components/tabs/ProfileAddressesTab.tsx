import { MapPin, Pencil, Trash2 } from 'lucide-react';
import EmptyState from '../../../../components/EmptyState/EmptyState';
import type { ProfileTabContentProps } from '../ProfileTabContent.types';

const AddressesTab = ({
  addressesLoading,
  addressesError,
  savedAddresses,
  onAddAddress,
  onEditAddress,
  onRequestDeleteAddress,
}: Pick<ProfileTabContentProps,
  | 'addressesLoading'
  | 'addressesError'
  | 'savedAddresses'
  | 'onAddAddress'
  | 'onEditAddress'
  | 'onRequestDeleteAddress'
>) => (
  <div className="tab-pane">
    <div className="address-header">
      <h2 className="profile-content-title">Địa chỉ của tôi</h2>
      <button className="address-add-btn" onClick={onAddAddress}>
        <span>+</span> THÊM ĐỊA CHỈ MỚI
      </button>
    </div>

    <div className="address-book-content">
      {addressesLoading ? <p className="account-meta">Đang tải danh sách địa chỉ...</p> : null}
      {addressesError ? <p className="account-meta">{addressesError}</p> : null}

      {!addressesLoading && savedAddresses.length === 0 ? (
        <EmptyState
          icon={<MapPin size={80} strokeWidth={1} />}
          title="Sổ địa chỉ trống"
          description="Bạn chưa có địa chỉ nào được lưu. Thêm địa chỉ để quá trình đặt hàng nhanh chóng hơn."
        />
      ) : !addressesLoading ? (
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
              <div className="address-card-actions">
                <button className="address-card-edit" onClick={() => onEditAddress(addr)} aria-label="Chỉnh sửa địa chỉ">
                  <Pencil size={16} />
                </button>
                <button className="address-card-delete" onClick={() => onRequestDeleteAddress(addr.id)} aria-label="Xóa địa chỉ">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  </div>
);

export default AddressesTab;
