import { useCallback, useEffect, useState } from 'react';
import { X, MapPin, Home, Building2, Phone, Loader2 } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAddresses = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const rows = await addressService.listFromBackend();
      setAddresses(rows);
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : 'Không thể tải sổ địa chỉ. Vui lòng thử lại.';
      setLoadError(message);
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void loadAddresses();
  }, [isOpen, loadAddresses]);

  useEffect(() => {
    if (addresses.length === 0) {
      setSelectedId(null);
      return;
    }

    setSelectedId((prev) => {
      if (prev && addresses.some((address) => address.id === prev)) {
        return prev;
      }
      const defaultAddress = addresses.find((address) => address.isDefault);
      return defaultAddress?.id || addresses[0].id;
    });
  }, [addresses]);

  const handleSelect = () => {
    const selected = addresses.find((address) => address.id === selectedId);
    if (!selected) return;

    onSelectAddress(selected);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  const addressIcon = (address: Address) => {
    const label = (address.addressType || '').toLowerCase();
    if (label.includes('nhà') || label.includes('home')) return <Home size={16} />;
    if (label.includes('công ty') || label.includes('office') || label.includes('cơ quan')) return <Building2 size={16} />;
    return <MapPin size={16} />;
  };

  return (
    <div className="address-modal-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label="Chọn địa chỉ giao hàng">
      <div className="address-modal-container">
        <div className="address-modal-header">
          <div className="address-modal-title">
            <MapPin size={20} className="address-modal-title-icon" />
            <h2>Chọn từ sổ địa chỉ</h2>
          </div>
          <button className="address-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        <div className="address-modal-body">
          {isLoading ? (
            <div className="address-state address-state-loading">
              <Loader2 size={28} className="address-state-spinner" />
              <p>Đang tải sổ địa chỉ...</p>
            </div>
          ) : null}

          {!isLoading && loadError ? (
            <div className="address-state address-state-error">
              <p>{loadError}</p>
              <button className="address-retry-btn" onClick={() => void loadAddresses()}>
                Tải lại
              </button>
            </div>
          ) : null}

          {!isLoading && !loadError && addresses.length === 0 ? (
            <div className="address-state address-state-empty">
              <MapPin size={32} className="address-state-icon" />
              <p>Bạn chưa có địa chỉ nào trong sổ.</p>
            </div>
          ) : null}

          {!isLoading && !loadError && addresses.length > 0 ? (
            <div className="address-list">
              {addresses.map((address) => {
                const isSelected = selectedId === address.id;
                return (
                  <button
                    key={address.id}
                    className={`address-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedId(address.id)}
                    aria-pressed={isSelected}
                  >
                    <div className={`address-radio ${isSelected ? 'active' : ''}`}>
                      {isSelected && <span className="address-radio-dot" />}
                    </div>
                    <div className="address-content">
                      <div className="address-top-row">
                        <div className="address-name-row">
                          {addressIcon(address)}
                          <span className="address-name">{address.fullName}</span>
                        </div>
                        {address.isDefault && (
                          <span className="address-badge">Mặc định</span>
                        )}
                      </div>
                      <div className="address-contact">
                        <Phone size={13} />
                        <span>{address.phone}</span>
                      </div>
                      <div className="address-location">
                        <MapPin size={13} />
                        <span>{addressService.formatFullAddress(address)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="address-modal-footer">
          <button
            className="address-confirm-btn"
            onClick={handleSelect}
            disabled={!selectedId || isLoading || Boolean(loadError)}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressBookModal;
