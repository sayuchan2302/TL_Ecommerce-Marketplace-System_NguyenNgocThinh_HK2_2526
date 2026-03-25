import { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { addressService } from '../../services/addressService';
import type { Address } from '../../types';
import './AddressBookModal.css';

interface AddressBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (address: Address) => void;
}

const AddressBookModalContent = ({ onClose, onSelectAddress }: Omit<AddressBookModalProps, 'isOpen'>) => {
  const addresses = addressService.getAll();
  const defaultAddressId = addresses.find((address) => address.isDefault)?.id || null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultAddressId);

  const handleSelect = () => {
    const selected = addresses.find((address) => address.id === selectedId);
    if (!selected) return;

    onSelectAddress(selected);
    onClose();
  };

  return (
    <div className="address-modal-overlay">
      <div className="address-modal-container">
        <div className="address-modal-header">
          <h2>Chọn từ sổ địa chỉ</h2>
          <button className="close-btn" onClick={onClose} aria-label="Đóng">
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        <div className="address-modal-body">
          {addresses.length === 0 ? (
            <div className="empty-address-msg">Bạn chưa có địa chỉ nào trong sổ.</div>
          ) : (
            <div className="address-list">
              {addresses.map((address) => (
                <button
                  key={address.id}
                  className={`address-item ${selectedId === address.id ? 'selected' : ''}`}
                  onClick={() => setSelectedId(address.id)}
                  aria-pressed={selectedId === address.id}
                >
                  <div className="address-item-header">
                    <span className="address-name">{address.fullName}</span>
                    {address.isDefault && <span className="address-badge">Mặc định</span>}
                  </div>
                  <div className="address-phone">{address.phone}</div>
                  <div className="address-full">
                    {addressService.formatFullAddress(address)}
                  </div>
                  {selectedId === address.id && (
                    <div className="address-check-icon">
                      <CheckCircle2 fill="var(--co-blue)" color="white" size={24} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="address-modal-footer">
          <button className="address-confirm-btn" onClick={handleSelect} disabled={!selectedId}>
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

const AddressBookModal = ({ isOpen, onClose, onSelectAddress }: AddressBookModalProps) => {
  if (!isOpen) return null;

  return (
    <AddressBookModalContent
      key={`address-book-${isOpen ? 'open' : 'closed'}`}
      onClose={onClose}
      onSelectAddress={onSelectAddress}
    />
  );
};

export default AddressBookModal;
