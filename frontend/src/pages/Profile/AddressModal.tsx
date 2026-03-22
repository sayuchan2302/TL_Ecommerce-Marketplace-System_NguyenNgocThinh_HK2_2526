import { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { addressService } from '../../services/addressService';

interface Province {
  code: number;
  name: string;
}

interface District {
  code: number;
  name: string;
}

interface Ward {
  code: number;
  name: string;
}

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export interface AddressData {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detail: string;
  isDefault: boolean;
}

const API_BASE = 'https://provinces.open-api.vn/api';

const AddressModal = ({ isOpen, onClose, onSave }: AddressModalProps) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [detail, setDetail] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Province / District / Ward states
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedWard, setSelectedWard] = useState('');

  const [selectedProvinceName, setSelectedProvinceName] = useState('');
  const [selectedDistrictName, setSelectedDistrictName] = useState('');
  const [selectedWardName, setSelectedWardName] = useState('');

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  // Fetch provinces on mount
  useEffect(() => {
    if (!isOpen) return;
    setLoadingProvinces(true);
    fetch(`${API_BASE}/?depth=1`)
      .then(res => res.json())
      .then((data: Province[]) => {
        setProvinces(data);
        setLoadingProvinces(false);
      })
      .catch(() => setLoadingProvinces(false));
  }, [isOpen]);

  // Fetch districts when province changes
  useEffect(() => {
    if (!selectedProvince) {
      setDistricts([]);
      setSelectedDistrict('');
      setSelectedDistrictName('');
      setWards([]);
      setSelectedWard('');
      setSelectedWardName('');
      return;
    }
    setLoadingDistricts(true);
    setDistricts([]);
    setSelectedDistrict('');
    setSelectedDistrictName('');
    setWards([]);
    setSelectedWard('');
    setSelectedWardName('');
    fetch(`${API_BASE}/p/${selectedProvince}?depth=2`)
      .then(res => res.json())
      .then((data: { districts: District[] }) => {
        setDistricts(data.districts || []);
        setLoadingDistricts(false);
      })
      .catch(() => setLoadingDistricts(false));
  }, [selectedProvince]);

  // Fetch wards when district changes
  useEffect(() => {
    if (!selectedDistrict) {
      setWards([]);
      setSelectedWard('');
      setSelectedWardName('');
      return;
    }
    setLoadingWards(true);
    setWards([]);
    setSelectedWard('');
    setSelectedWardName('');
    fetch(`${API_BASE}/d/${selectedDistrict}?depth=2`)
      .then(res => res.json())
      .then((data: { wards: Ward[] }) => {
        setWards(data.wards || []);
        setLoadingWards(false);
      })
      .catch(() => setLoadingWards(false));
  }, [selectedDistrict]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addressService.add({
      fullName: name,
      phone,
      province: selectedProvinceName,
      district: selectedDistrictName,
      ward: selectedWardName,
      detail,
      isDefault,
    });
    if (onSave) onSave();
    // Reset form
    setName('');
    setPhone('');
    setDetail('');
    setIsDefault(false);
    setSelectedProvince('');
    setSelectedDistrict('');
    setSelectedWard('');
    setSelectedProvinceName('');
    setSelectedDistrictName('');
    setSelectedWardName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal address-modal" onClick={(e) => e.stopPropagation()}>
        <button className="profile-modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <h2 className="profile-modal-title">Thêm địa chỉ mới</h2>

        <form className="profile-modal-form" onSubmit={handleSubmit}>
          {/* Name */}
          <div className="modal-input-group mt-10">
            <span className="modal-floating-label">Họ và tên người nhận</span>
            <input
              type="text"
              className="modal-input"
              style={{ paddingLeft: '16px' }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Phone */}
          <div className="modal-input-group mt-10">
            <span className="modal-floating-label">Số điện thoại</span>
            <input
              type="tel"
              className="modal-input"
              style={{ paddingLeft: '16px' }}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          {/* Province Select */}
          <div className="modal-input-group mt-10">
            <span className="modal-floating-label">Tỉnh / Thành phố</span>
            <select
              className="modal-input modal-select"
              value={selectedProvince}
              onChange={(e) => {
                const code = e.target.value;
                setSelectedProvince(code);
                const p = provinces.find(p => String(p.code) === code);
                setSelectedProvinceName(p ? p.name : '');
              }}
              required
            >
              <option value="">
                {loadingProvinces ? 'Đang tải...' : '-- Chọn Tỉnh / Thành phố --'}
              </option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="modal-select-arrow" size={16} />
          </div>

          {/* District Select */}
          <div className="modal-input-group mt-10">
            <span className="modal-floating-label">Quận / Huyện</span>
            <select
              className="modal-input modal-select"
              value={selectedDistrict}
              onChange={(e) => {
                const code = e.target.value;
                setSelectedDistrict(code);
                const d = districts.find(d => String(d.code) === code);
                setSelectedDistrictName(d ? d.name : '');
              }}
              disabled={!selectedProvince}
              required
            >
              <option value="">
                {loadingDistricts ? 'Đang tải...' : '-- Chọn Quận / Huyện --'}
              </option>
              {districts.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
            <ChevronDown className="modal-select-arrow" size={16} />
          </div>

          {/* Ward Select */}
          <div className="modal-input-group mt-10">
            <span className="modal-floating-label">Phường / Xã</span>
            <select
              className="modal-input modal-select"
              value={selectedWard}
              onChange={(e) => {
                const code = e.target.value;
                setSelectedWard(code);
                const w = wards.find(w => String(w.code) === code);
                setSelectedWardName(w ? w.name : '');
              }}
              disabled={!selectedDistrict}
              required
            >
              <option value="">
                {loadingWards ? 'Đang tải...' : '-- Chọn Phường / Xã --'}
              </option>
              {wards.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.name}
                </option>
              ))}
            </select>
            <ChevronDown className="modal-select-arrow" size={16} />
          </div>

          {/* Detail Address */}
          <div className="modal-input-group mt-10">
            <span className="modal-floating-label">Địa chỉ cụ thể</span>
            <input
              type="text"
              className="modal-input"
              style={{ paddingLeft: '16px' }}
              placeholder="Số nhà, tên đường..."
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              required
            />
          </div>

          {/* Default Address Checkbox */}
          <label className="address-default-check mt-10">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            <span className="address-check-custom"></span>
            Đặt làm địa chỉ mặc định
          </label>

          <button type="submit" className="modal-submit-btn mt-10">
            LƯU ĐỊA CHỈ
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddressModal;
