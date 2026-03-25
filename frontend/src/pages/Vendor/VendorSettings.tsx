import './Vendor.css';
import { useEffect, useState } from 'react';
import { Bell, CreditCard, MapPin, Save, Store, Truck } from 'lucide-react';
import VendorLayout from './VendorLayout';
import { PanelSectionHeader, PanelStatsGrid, PanelTabs } from '../../components/Panel/PanelPrimitives';
import { vendorPortalService, type VendorSettingsData } from '../../services/vendorPortalService';
import { useToast } from '../../contexts/ToastContext';
import { AdminStateBlock } from '../Admin/AdminStateBlocks';

type SettingsTab = 'store' | 'bank' | 'notifications' | 'shipping';

const defaultSettings: VendorSettingsData = {
  storeInfo: { name: '', description: '', logo: '', contactEmail: '', phone: '', address: '' },
  bankInfo: { bankName: '', accountNumber: '', accountHolder: '', verified: false },
  notifications: { newOrder: true, orderStatusChange: true, lowStock: true, payoutComplete: true, promotions: false },
  shipping: { ghn: true, ghtk: true, express: false, warehouseAddress: '', warehouseContact: '', warehousePhone: '' },
};

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'store', label: 'Gian hàng' },
  { id: 'bank', label: 'Tài khoản nhận tiền' },
  { id: 'notifications', label: 'Thông báo' },
  { id: 'shipping', label: 'Vận chuyển' },
];

const VendorSettings = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('store');
  const [settings, setSettings] = useState<VendorSettingsData>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const next = await vendorPortalService.getSettings();
        if (!active) return;
        setSettings(next);
      } catch (err: unknown) {
        if (!active) return;
        addToast((err as Error)?.message || 'Không tải được cấu hình vận hành shop', 'error');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [addToast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await vendorPortalService.updateSettings(settings.storeInfo);
      setSettings((current) => ({
        ...current,
        storeInfo: {
          ...current.storeInfo,
          name: updated.name,
          description: updated.description || '',
          logo: updated.logo || '',
          contactEmail: updated.contactEmail || '',
          phone: updated.phone || '',
          address: updated.address || '',
        },
      }));
      addToast('Đã lưu cấu hình shop', 'success');
    } catch (err: unknown) {
      addToast((err as Error)?.message || 'Lưu cấu hình thất bại', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleNotification = (key: keyof VendorSettingsData['notifications']) => {
    setSettings((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        [key]: !current.notifications[key],
      },
    }));
  };

  const statItems = [
    {
      key: 'store',
      label: 'Gian hàng',
      value: settings.storeInfo.name || 'Chưa đặt tên',
      sub: 'Tên hiển thị trên storefront',
    },
    {
      key: 'bank',
      label: 'Đối soát',
      value: settings.bankInfo.verified ? 'Đã xác minh' : 'Chưa xác minh',
      sub: 'Tài khoản nhận tiền của shop',
      tone: 'success',
    },
    {
      key: 'notifications',
      label: 'Thông báo',
      value: `${Object.values(settings.notifications).filter(Boolean).length}/5`,
      sub: 'Kênh cảnh báo đang bật',
      tone: 'info',
    },
    {
      key: 'shipping',
      label: 'Đơn vị vận chuyển',
      value: [settings.shipping.ghn, settings.shipping.ghtk, settings.shipping.express].filter(Boolean).length,
      sub: 'Đơn vị hiện sẵn sàng xử lý',
      tone: 'warning',
    },
  ] as const;

  const tabItems = TABS.map((tab) => ({ key: tab.id, label: tab.label }));

  return (
    <VendorLayout
      title="Cài đặt vận hành và gian hàng"
      breadcrumbs={[{ label: 'Bảng điều khiển', to: '/vendor/dashboard' }, { label: 'Cài đặt vận hành' }]}
      actions={(
        <button className="admin-primary-btn vendor-admin-primary" onClick={handleSave} disabled={isSaving}>
          <Save size={16} />
          {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
      )}
    >
      {loading ? (
        <AdminStateBlock
          type="empty"
          title="Đang tải cấu hình shop"
          description="Gian hàng, đối soát và vận hành giao nhận đang được đồng bộ."
        />
      ) : (
        <>
          <PanelStatsGrid items={[...statItems]} />

          <PanelTabs
            items={tabItems}
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as SettingsTab)}
            accentClassName="vendor-active-tab"
          />

          <section className="admin-panels single">
            {activeTab === 'store' && (
              <div className="admin-panel">
                <PanelSectionHeader
                  title={<><Store size={16} /> Hồ sơ gian hàng công khai</>}
                  description="Thông tin hiển thị trên storefront và các điểm “Bán bởi”."
                />
                <div className="form-grid">
                  <label className="form-field">
                    <span>Tên gian hàng</span>
                    <input value={settings.storeInfo.name} onChange={(e) => setSettings((current) => ({ ...current, storeInfo: { ...current.storeInfo, name: e.target.value } }))} />
                  </label>
                  <label className="form-field">
                    <span>Số điện thoại liên hệ</span>
                    <input value={settings.storeInfo.phone} onChange={(e) => setSettings((current) => ({ ...current, storeInfo: { ...current.storeInfo, phone: e.target.value } }))} />
                  </label>
                  <label className="form-field full">
                    <span>Email hỗ trợ</span>
                    <input value={settings.storeInfo.contactEmail} onChange={(e) => setSettings((current) => ({ ...current, storeInfo: { ...current.storeInfo, contactEmail: e.target.value } }))} />
                  </label>
                  <label className="form-field full">
                    <span>Địa chỉ hiển thị công khai</span>
                    <input value={settings.storeInfo.address} onChange={(e) => setSettings((current) => ({ ...current, storeInfo: { ...current.storeInfo, address: e.target.value } }))} />
                  </label>
                  <label className="form-field full">
                    <span>Mô tả gian hàng</span>
                    <textarea rows={5} value={settings.storeInfo.description} onChange={(e) => setSettings((current) => ({ ...current, storeInfo: { ...current.storeInfo, description: e.target.value } }))} />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'bank' && (
              <div className="admin-panel">
                <PanelSectionHeader
                  title={<><CreditCard size={16} /> Tài khoản nhận tiền</>}
                  description="Dùng cho payout sau khi trừ phí sàn và đối soát đơn hàng."
                />
                <div className="admin-card-list">
                  <div className="admin-card-row">
                    <span className="admin-bold">Ngân hàng</span>
                    <span className="admin-muted">{settings.bankInfo.bankName}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Số tài khoản</span>
                    <span className="admin-muted">{settings.bankInfo.accountNumber}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Chủ tài khoản</span>
                    <span className="admin-muted">{settings.bankInfo.accountHolder}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Trạng thái</span>
                    <span className="admin-muted">{settings.bankInfo.verified ? 'Đã xác minh' : 'Chưa xác minh'}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="admin-panel">
                <PanelSectionHeader
                  title={<><Bell size={16} /> Thông báo vận hành</>}
                  description="Chọn tín hiệu mà shop muốn được cảnh báo."
                />
                <div className="admin-card-list">
                  {[
                    ['newOrder', 'Đơn hàng mới', 'Nhận thông báo khi shop phát sinh đơn hàng mới cần tiếp nhận'],
                    ['orderStatusChange', 'Thay đổi vận hành', 'Nhận thông báo khi trạng thái vận hành thay đổi'],
                    ['lowStock', 'Cảnh báo tồn kho', 'Nhận thông báo khi SKU sắp hết hàng'],
                    ['payoutComplete', 'Đối soát hoàn tất', 'Nhận thông báo khi hệ thống chuyển payout'],
                    ['promotions', 'Khuyến mãi và sự kiện sàn', 'Nhận cập nhật các đợt sale và campaign từ sàn'],
                  ].map(([key, label, description]) => (
                    <div className="admin-card-row vendor-card-toggle" key={key}>
                      <div>
                        <div className="admin-bold">{label}</div>
                        <div className="admin-muted">{description}</div>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={settings.notifications[key as keyof VendorSettingsData['notifications']]}
                          onChange={() => toggleNotification(key as keyof VendorSettingsData['notifications'])}
                        />
                        <span className="switch-slider" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="admin-panel">
                <PanelSectionHeader
                  title={<><Truck size={16} /> Vận chuyển và kho lấy hàng</>}
                  description="Đơn vị giao nhận sẵn sàng và thông tin kho của shop."
                />
                <div className="admin-card-list">
                  <div className="admin-card-row">
                    <span className="admin-bold">Đơn vị hoạt động</span>
                    <span className="admin-muted">
                      {[settings.shipping.ghn && 'GHN', settings.shipping.ghtk && 'GHTK', settings.shipping.express && 'Express'].filter(Boolean).join(', ') || 'Chưa cấu hình'}
                    </span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold"><MapPin size={14} style={{ verticalAlign: -2, marginRight: 6 }} /> Địa chỉ kho</span>
                    <span className="admin-muted">{settings.shipping.warehouseAddress}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Người phụ trách kho</span>
                    <span className="admin-muted">{settings.shipping.warehouseContact}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Điện thoại kho</span>
                    <span className="admin-muted">{settings.shipping.warehousePhone}</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </VendorLayout>
  );
};

export default VendorSettings;
