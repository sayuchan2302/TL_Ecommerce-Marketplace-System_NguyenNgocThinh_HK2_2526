import { useState, useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { addressService } from '../../services/addressService';
import type { Address } from '../../types';
import './AddressBookModal.css';

interface AddressBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (address: Address) => void;
}

const AddressBookModal = ({ isOpen, onClose, onSelectAddress }: AddressBookModalProps) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const addrs = addressService.getAll();
      setAddresses(addrs);
      const defaultAddr = addrs.find(a => a.isDefault);
      setSelectedId(defaultAddr?.id || null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = () => {
    const selected = addresses.find(a => a.id === selectedId);
    if (selected) {
      onSelectAddress(selected);
      onClose();
    }
  };

  return (
    <div className="address-modal-overlay">
      <div className="address-modal-container">
        <div className="address-modal-header">
          <h2>Chọn từ sổ địa chỉ</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="address-modal-body">
          {addresses.length === 0 ? (
            <div className="empty-address-msg">Bạn chưa có địa chỉ nào trong sổ.</div>
          ) : (
            <div className="address-list">
              {addresses.map(addr => (
                <div 
                  key={addr.id} 
                  className={`address-item ${selectedId === addr.id ? 'selected' : ''}`}
                  onClick={() => setSelectedId(addr.id)}
                >
                  <div className="address-item-header">
                    <span className="address-name">{addr.fullName}</span>
                    {addr.isDefault && <span className="address-badge">Mặc định</span>}
                  </div>
                  <div className="address-phone">{addr.phone}</div>
                  <div className="address-full">
                    {addressService.formatFullAddress(addr)}
                  </div>
                  {selectedId === addr.id && (
                    <div className="address-check-icon">
                      <CheckCircle2 fill="var(--co-blue)" color="white" size={24} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="address-modal-footer">
          <button 
            className="address-confirm-btn" 
            onClick={handleSelect}
            disabled={!selectedId}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressBookModal;