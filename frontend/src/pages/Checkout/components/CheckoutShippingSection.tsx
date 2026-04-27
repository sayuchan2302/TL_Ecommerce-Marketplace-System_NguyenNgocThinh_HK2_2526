import { ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import type { UseAddressLocationReturn } from '../../../hooks/useAddressLocation';
import { CLIENT_TEXT } from '../../../utils/texts';
import type { CheckoutFormValues, FormErrors } from '../checkout.types';
import './CheckoutShippingSection.css';

const t = CLIENT_TEXT.checkout;

interface CheckoutShippingSectionProps {
  formValues: CheckoutFormValues;
  formErrors: FormErrors;
  saveAddressToBook: boolean;
  isAddressFromBook: boolean;
  addressLocation: UseAddressLocationReturn;
  onOpenAddressBook: () => void;
  onToggleSaveAddress: (checked: boolean) => void;
  onFieldChange: (field: keyof CheckoutFormValues, value: string) => void;
  onProvinceChange: (provinceCode: string) => void;
  onDistrictChange: (districtCode: string) => void;
  onWardChange: (wardCode: string) => void;
}

const CheckoutShippingSection = ({
  formValues,
  formErrors,
  saveAddressToBook,
  isAddressFromBook,
  addressLocation,
  onOpenAddressBook,
  onToggleSaveAddress,
  onFieldChange,
  onProvinceChange,
  onDistrictChange,
  onWardChange,
}: CheckoutShippingSectionProps) => (
  <section className="checkout-section">
    <div className="section-header-flex">
      <h2 className="checkout-section-title">{t.title}</h2>
      <button className="address-book-toggle-btn" onClick={onOpenAddressBook} aria-label={t.addressBook.title}>
        {t.addressBook.title} <ChevronRight size={16} />
      </button>
    </div>

    <div className="form-grid">
      <div className="form-group col-span-2">
        <label className="input-label">{t.form.name}</label>
        <div className="input-with-prefix">
          <select className="prefix-select" name="salutation" autoComplete="honorific-prefix">
            <option value="anh">{t.form.salutation.male}</option>
            <option value="chi">{t.form.salutation.female}</option>
          </select>
          <input
            type="text"
            className={`checkout-input ${formErrors.name ? 'input-error' : ''}`}
            placeholder={t.form.namePlaceholder}
            value={formValues.name}
            onChange={(event) => onFieldChange('name', event.target.value)}
            name="fullName"
            autoComplete="name"
          />
        </div>
        {formErrors.name && <span className="field-error">{formErrors.name}</span>}
      </div>

      <div className="form-group col-span-1">
        <label className="input-label">{t.form.phone}</label>
        <input
          type="tel"
          className={`checkout-input ${formErrors.phone ? 'input-error' : ''}`}
          placeholder={t.form.phonePlaceholder}
          value={formValues.phone}
          onChange={(event) => onFieldChange('phone', event.target.value)}
          name="phone"
          autoComplete="tel"
          inputMode="tel"
        />
        {formErrors.phone && <span className="field-error">{formErrors.phone}</span>}
      </div>

      <div className="form-group col-span-1">
        <label className="input-label">{t.form.email}</label>
        <input
          type="email"
          className="checkout-input"
          placeholder={t.form.emailPlaceholder}
          value={formValues.email}
          onChange={(event) => onFieldChange('email', event.target.value)}
          name="email"
          autoComplete="email"
          spellCheck={false}
        />
      </div>

      <div className="form-group col-span-2">
        <label className="input-label">{t.form.address}</label>
        <input
          type="text"
          className={`checkout-input ${formErrors.address ? 'input-error' : ''}`}
          value={formValues.address}
          onChange={(event) => onFieldChange('address', event.target.value)}
          name="streetAddress"
          autoComplete="street-address"
        />
        {formErrors.address && <span className="field-error">{formErrors.address}</span>}
      </div>

      <div className="form-group col-span-1">
        <div className="select-wrapper">
          <select
            className={`checkout-input checkout-select ${formErrors.city ? 'input-error' : ''}`}
            value={addressLocation.selectedProvinceCode}
            name="province"
            autoComplete="address-level1"
            onChange={(event) => onProvinceChange(event.target.value)}
          >
            <option value="">{addressLocation.loadingProvinces ? t.form.loading : t.form.province}</option>
            {addressLocation.provinces.map((province) => (
              <option key={province.code} value={province.code}>{province.name}</option>
            ))}
          </select>
          <ChevronDown size={16} className="select-arrow" />
        </div>
        {formErrors.city && <span className="field-error">{formErrors.city}</span>}
      </div>

      <div className="form-group col-span-1">
        <div className="select-wrapper">
          <select
            className={`checkout-input checkout-select ${formErrors.district ? 'input-error' : ''}`}
            value={addressLocation.selectedDistrictCode}
            disabled={!addressLocation.selectedProvinceCode}
            name="district"
            autoComplete="address-level2"
            onChange={(event) => onDistrictChange(event.target.value)}
          >
            <option value="">{addressLocation.loadingDistricts ? t.form.loading : t.form.district}</option>
            {addressLocation.districts.map((district) => (
              <option key={district.code} value={district.code}>{district.name}</option>
            ))}
          </select>
          <ChevronDown size={16} className="select-arrow" />
        </div>
        {formErrors.district && <span className="field-error">{formErrors.district}</span>}
      </div>

      <div className="form-group col-span-1">
        <div className="select-wrapper">
          <select
            className={`checkout-input checkout-select ${formErrors.ward ? 'input-error' : ''}`}
            value={addressLocation.selectedWardCode}
            disabled={!addressLocation.selectedDistrictCode}
            name="ward"
            autoComplete="address-level3"
            onChange={(event) => onWardChange(event.target.value)}
          >
            <option value="">{addressLocation.loadingWards ? t.form.loading : t.form.ward}</option>
            {addressLocation.wards.map((ward) => (
              <option key={ward.code} value={ward.code}>{ward.name}</option>
            ))}
          </select>
          <ChevronDown size={16} className="select-arrow" />
        </div>
        {formErrors.ward && <span className="field-error">{formErrors.ward}</span>}
      </div>

      <div className="form-group col-span-2">
        <label className="input-label">{t.form.note}</label>
        <input
          type="text"
          className="checkout-input"
          placeholder={t.form.notePlaceholder}
          value={formValues.note}
          onChange={(event) => onFieldChange('note', event.target.value)}
          name="note"
          autoComplete="off"
        />
      </div>
    </div>

    {!isAddressFromBook && (
      <label className="save-address-checkbox">
        <input
          type="checkbox"
          checked={saveAddressToBook}
          onChange={(event) => onToggleSaveAddress(event.target.checked)}
        />
        <MapPin size={16} />
        <span>Lưu vào sổ địa chỉ</span>
      </label>
    )}
  </section>
);

export default CheckoutShippingSection;
