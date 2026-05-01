import './Vendor.css';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AlertTriangle,
  BadgeCheck,
  Camera,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Eye,
  ImagePlus,
  Link as LinkIcon,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import VendorLayout from './VendorLayout';
import { vendorPortalService, type VendorSettingsData } from '../../services/vendorPortalService';
import { storeService, type StoreProfile } from '../../services/storeService';
import { vendorProductService, type VendorProductPageResult } from '../../services/vendorProductService';
import { reviewService, type VendorReviewSummary } from '../../services/reviewService';
import { useToast } from '../../contexts/ToastContext';
import { getUiErrorMessage } from '../../utils/errorMessage';
import { AdminStateBlock } from '../Admin/AdminStateBlocks';
import { PLACEHOLDER_STORE_BANNER } from '../../constants/placeholders';

const STORE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const STOREFRONT_AUTOSAVE_DELAY_MS = 700;
const STOREFRONT_SECTION_IDS = {
  identity: 'storefront-identity-section',
  contact: 'storefront-contact-section',
  visibility: 'storefront-visibility-section',
} as const;

type StorefrontAutoSaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';
type StorefrontTone = 'success' | 'warning' | 'danger' | 'neutral';
type StorefrontSignalData = {
  productCount: number;
  liveProductCount: number;
  reviewCount: number;
  rating: number;
  responseRate: number;
};
type StorefrontChecklistItem = {
  key: string;
  label: string;
  ok: boolean;
  hint: string;
  actionLabel: string;
  sectionId?: (typeof STOREFRONT_SECTION_IDS)[keyof typeof STOREFRONT_SECTION_IDS];
  tone: StorefrontTone;
};

type StorefrontMetricCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone?: StorefrontTone | 'info';
};

const defaultSettings: VendorSettingsData = {
  storeInfo: { name: '', slug: '', description: '', logo: '', banner: '', contactEmail: '', phone: '', address: '' },
  bankInfo: { bankName: '', accountNumber: '', accountHolder: '', verified: false },
  notifications: { newOrder: true, orderStatusChange: true, lowStock: true, payoutComplete: true, promotions: false },
  shipping: { ghn: true, ghtk: true, express: false, warehouseAddress: '', warehouseContact: '', warehousePhone: '' },
};

const formatNumber = (value?: number | null) => Number(value || 0).toLocaleString('vi-VN');

const formatRating = (value?: number | null) => Number(value || 0).toFixed(1);

const formatPercentValue = (value?: number | null) => `${Math.round(Number(value || 0))}%`;

const toPillTone = (tone: StorefrontTone) => {
  if (tone === 'danger') return 'error';
  return tone;
};

const StorefrontMetricCard = ({ icon: Icon, label, value, detail, tone = 'neutral' }: StorefrontMetricCardProps) => (
  <article className={`storefront-metric-card ${tone}`}>
    <span className="storefront-metric-icon">
      <Icon size={18} />
    </span>
    <div>
      <span className="storefront-metric-label">{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  </article>
);

const buildStorefrontSignalData = (
  store: StoreProfile,
  productPage: VendorProductPageResult | null,
  reviewSummary: VendorReviewSummary | null,
): StorefrontSignalData => {
  const reviewCount = Number(reviewSummary?.total ?? 0);
  const needReply = Number(reviewSummary?.needReply ?? 0);
  const repliedReviews = Math.max(0, reviewCount - needReply);

  return {
    productCount: Number(productPage?.statusCounts.all ?? productPage?.totalElements ?? store.productCount ?? 0),
    liveProductCount: Number(productPage?.statusCounts.active ?? store.liveProductCount ?? 0),
    reviewCount,
    rating: Number(reviewSummary?.average ?? store.rating ?? 0),
    responseRate: reviewSummary
      ? reviewCount
        ? Math.round((repliedReviews * 100) / reviewCount)
        : 0
      : Number(store.responseRate ?? 0),
  };
};

const resolveStorefrontStatus = (store: StoreProfile | null): { label: string; detail: string; tone: StorefrontTone } => {
  if (!store) {
    return { label: 'Không xác định', detail: 'Không lấy được trạng thái gian hàng công khai.', tone: 'neutral' };
  }

  if (store.approvalStatus !== 'APPROVED') {
    if (store.approvalStatus === 'REJECTED') {
      return {
        label: 'Bị từ chối',
        detail: store.rejectionReason || 'Hồ sơ gian hàng cần cập nhật trước khi gửi duyệt lại.',
        tone: 'danger',
      };
    }
    return { label: 'Chờ duyệt', detail: 'Store sẽ hiển thị công khai sau khi được admin phê duyệt.', tone: 'warning' };
  }

  if (store.status === 'ACTIVE') {
    return { label: 'Đang hoạt động', detail: 'Gian hàng công khai đang hiển thị cho người mua.', tone: 'success' };
  }

  if (store.status === 'SUSPENDED') {
    return { label: 'Tạm khóa', detail: 'Gian hàng công khai tạm ẩn do vi phạm hoặc hồi kiểm duyệt.', tone: 'danger' };
  }

  return { label: 'Tạm offline', detail: 'Gian hàng công khai đang ở trạng thái không hoạt động.', tone: 'neutral' };
};

const VendorStorefront = () => {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<VendorSettingsData>(defaultSettings);
  const [storeMeta, setStoreMeta] = useState<StoreProfile | null>(null);
  const [signalData, setSignalData] = useState<StorefrontSignalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [uploadingAsset, setUploadingAsset] = useState<'logo' | 'banner' | null>(null);
  const [assetPreviews, setAssetPreviews] = useState<{ logo: string; banner: string }>({ logo: '', banner: '' });
  const [autoSaveState, setAutoSaveState] = useState<StorefrontAutoSaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlsRef = useRef<{ logo: string | null; banner: string | null }>({ logo: null, banner: null });
  const autosaveTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const latestSettingsRef = useRef(settings);
  const syncedSettingsSnapshotRef = useRef('');
  const hydratedRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const queuedSaveRef = useRef(false);

  const updateStoreInfoField = useCallback((field: keyof VendorSettingsData['storeInfo'], value: string) => {
    setSettings((current) => ({
      ...current,
      storeInfo: {
        ...current.storeInfo,
        [field]: value,
      },
    }));
  }, []);

  const serializeSettings = useCallback((payload: VendorSettingsData) => JSON.stringify(payload), []);

  useEffect(() => {
    latestSettingsRef.current = settings;
  }, [settings]);

  const setAssetPreview = useCallback((field: 'logo' | 'banner', nextUrl: string) => {
    const previousUrl = previewUrlsRef.current[field];
    if (previousUrl && previousUrl.startsWith('blob:') && previousUrl !== nextUrl) {
      URL.revokeObjectURL(previousUrl);
    }
    previewUrlsRef.current[field] = nextUrl || null;
    setAssetPreviews((current) => (
      current[field] === nextUrl
        ? current
        : {
            ...current,
            [field]: nextUrl,
          }
    ));
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        setLoadError('');
        const [nextSettings, nextStore, productPage, reviewSummary] = await Promise.all([
          vendorPortalService.getSettings(),
          storeService.getMyStore(),
          vendorProductService.getProducts({ page: 1, size: 1 }).catch(() => null),
          reviewService.getVendorReviewSummary().catch(() => null),
        ]);
        if (!active) return;
        const nextSignals = buildStorefrontSignalData(nextStore, productPage, reviewSummary);
        hydratedRef.current = false;
        syncedSettingsSnapshotRef.current = serializeSettings(nextSettings);
        latestSettingsRef.current = nextSettings;
        setSettings(nextSettings);
        setStoreMeta(nextStore);
        setSignalData(nextSignals);
        setAutoSaveState('idle');
        setLastSavedAt(null);
        hydratedRef.current = true;
      } catch (err: unknown) {
        if (!active) return;
        const message = getUiErrorMessage(err, 'Không tải được gian hàng công khai');
        setLoadError(message);
        addToast(message, 'error');
        setAutoSaveState('error');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [addToast, reloadKey, serializeSettings]);

  useEffect(() => () => {
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    (['logo', 'banner'] as const).forEach((field) => {
      const previewUrl = previewUrlsRef.current[field];
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    });
  }, []);

  const completion = useMemo(() => {
    const fields = [
      settings.storeInfo.name,
      settings.storeInfo.description,
      settings.storeInfo.logo,
      settings.storeInfo.banner,
      settings.storeInfo.contactEmail,
      settings.storeInfo.phone,
      settings.storeInfo.address,
    ];
    const filled = fields.filter((field) => field.trim()).length;
    return Math.round((filled / fields.length) * 100);
  }, [settings]);

  const persistSettings = useCallback(async () => {
    if (!hydratedRef.current) {
      return;
    }

    const payload = latestSettingsRef.current;
    const payloadSnapshot = serializeSettings(payload);
    if (!payloadSnapshot || payloadSnapshot === syncedSettingsSnapshotRef.current) {
      return;
    }

    if (saveInFlightRef.current) {
      queuedSaveRef.current = true;
      return;
    }

    saveInFlightRef.current = true;
    setAutoSaveState('saving');

    try {
      const nextSettings = await vendorPortalService.updateSettings(payload);
      const nextStore = await storeService.getMyStore();
      const latestSnapshot = serializeSettings(latestSettingsRef.current);

      syncedSettingsSnapshotRef.current = payloadSnapshot;
      setStoreMeta(nextStore);
      setLastSavedAt(Date.now());
      setAutoSaveState('saved');

      if (latestSnapshot === payloadSnapshot) {
        const normalizedSnapshot = serializeSettings(nextSettings);
        latestSettingsRef.current = nextSettings;
        syncedSettingsSnapshotRef.current = normalizedSnapshot;
        setSettings(nextSettings);
      } else {
        queuedSaveRef.current = true;
      }
    } catch (err: unknown) {
      setAutoSaveState('error');
      addToast(getUiErrorMessage(err, 'Tự động lưu gian hàng thất bại'), 'error');
    } finally {
      saveInFlightRef.current = false;
      if (queuedSaveRef.current) {
        queuedSaveRef.current = false;
        void persistSettings();
      }
    }
  }, [addToast, serializeSettings]);

  const flushPendingAutosave = useCallback(() => {
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    void persistSettings();
  }, [persistSettings]);

  const openImagePicker = (field: 'logo' | 'banner') => {
    if (uploadingAsset) {
      return;
    }
    if (field === 'logo') {
      logoInputRef.current?.click();
      return;
    }
    bannerInputRef.current?.click();
  };

  const handleImageSelected = async (field: 'logo' | 'banner', event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    if (file.size > STORE_IMAGE_MAX_BYTES) {
      addToast('Ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.', 'error');
      return;
    }

    try {
      setAssetPreview(field, URL.createObjectURL(file));
      setUploadingAsset(field);
      const imageUrl = await storeService.uploadStoreImage(file);
      updateStoreInfoField(field, imageUrl);
      setAssetPreview(field, '');
      addToast(field === 'logo' ? 'Đã tải logo gian hàng.' : 'Đã tải banner gian hàng.', 'success');
    } catch (err: unknown) {
      setAssetPreview(field, '');
      addToast(getUiErrorMessage(err, 'Không thể tải ảnh gian hàng lên'), 'error');
    } finally {
      setUploadingAsset(null);
    }
  };

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    const currentSnapshot = serializeSettings(settings);
    if (currentSnapshot === syncedSettingsSnapshotRef.current) {
      return;
    }

    if (!saveInFlightRef.current) {
      setAutoSaveState('pending');
    }

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      void persistSettings();
    }, STOREFRONT_AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [persistSettings, serializeSettings, settings]);

  const storefrontStatus = resolveStorefrontStatus(storeMeta);
  const storefrontPath = settings.storeInfo.slug ? `/store/${settings.storeInfo.slug}` : '/store/:slug';

  const storefrontChecklist = useMemo<StorefrontChecklistItem[]>(() => {
    const hasValue = (value: string) => value.trim().length > 0;
    const hasBrandIdentity = hasValue(settings.storeInfo.name) && hasValue(settings.storeInfo.description);
    const hasVisualAssets = hasValue(settings.storeInfo.logo) && hasValue(settings.storeInfo.banner);
    const hasContactInfo =
      hasValue(settings.storeInfo.contactEmail) &&
      hasValue(settings.storeInfo.phone) &&
      hasValue(settings.storeInfo.address);
    const hasSlug = hasValue(settings.storeInfo.slug);
    const isApproved = storeMeta?.approvalStatus === 'APPROVED';
    const isActive = storeMeta?.status === 'ACTIVE';

    return [
      {
        key: 'identity',
        label: 'Tên và mô tả gian hàng',
        ok: hasBrandIdentity,
        hint: hasBrandIdentity
          ? 'Đã có thông tin nhận diện thương hiệu cơ bản.'
          : 'Thiếu tên hoặc mô tả, khách hàng sẽ khó nhận diện gian hàng.',
        actionLabel: hasBrandIdentity ? 'Xem nhận diện' : 'Bổ sung nhận diện',
        sectionId: STOREFRONT_SECTION_IDS.identity,
        tone: hasBrandIdentity ? 'success' : 'warning',
      },
      {
        key: 'assets',
        label: 'Logo và banner',
        ok: hasVisualAssets,
        hint: hasVisualAssets
          ? 'Đã có đủ hình ảnh để hiển thị trên gian hàng công khai.'
          : 'Cần bổ sung logo hoặc banner để gian hàng công khai hiển thị đầy đủ.',
        actionLabel: hasVisualAssets ? 'Xem hình ảnh' : 'Tải logo/banner',
        sectionId: STOREFRONT_SECTION_IDS.identity,
        tone: hasVisualAssets ? 'success' : 'warning',
      },
      {
        key: 'contact',
        label: 'Thông tin liên hệ công khai',
        ok: hasContactInfo,
        hint: hasContactInfo
          ? 'Email, số điện thoại và địa chỉ đã đầy đủ.'
          : 'Thiếu email, số điện thoại hoặc địa chỉ công khai.',
        actionLabel: hasContactInfo ? 'Xem liên hệ' : 'Bổ sung liên hệ',
        sectionId: STOREFRONT_SECTION_IDS.contact,
        tone: hasContactInfo ? 'success' : 'warning',
      },
      {
        key: 'slug',
        label: 'Đường dẫn gian hàng',
        ok: hasSlug,
        hint: hasSlug ? `Gian hàng đang dùng đường dẫn ${storefrontPath}.` : 'Chưa có slug để tạo đường dẫn gian hàng.',
        actionLabel: hasSlug ? 'Xem đường dẫn' : 'Kiểm tra đường dẫn',
        sectionId: STOREFRONT_SECTION_IDS.visibility,
        tone: hasSlug ? 'success' : 'warning',
      },
      {
        key: 'approval',
        label: 'Phê duyệt từ admin',
        ok: isApproved,
        hint: isApproved
          ? 'Store đã được admin phê duyệt.'
          : storeMeta?.approvalStatus === 'REJECTED'
            ? storeMeta.rejectionReason
              ? `Store bị từ chối: ${storeMeta.rejectionReason}`
              : 'Store bị từ chối và cần cập nhật hồ sơ.'
            : 'Store đang chờ admin phê duyệt.',
        actionLabel: isApproved
          ? 'Đã duyệt'
          : storeMeta?.approvalStatus === 'REJECTED'
            ? 'Xem lý do'
            : 'Chờ admin duyệt',
        sectionId: STOREFRONT_SECTION_IDS.visibility,
        tone: isApproved ? 'success' : storeMeta?.approvalStatus === 'REJECTED' ? 'danger' : 'warning',
      },
      {
        key: 'active',
        label: 'Trạng thái vận hành',
        ok: isActive,
        hint: isActive
          ? 'Store đang hoạt động, khách mua có thể truy cập gian hàng.'
          : storeMeta?.status === 'SUSPENDED'
            ? 'Store đang tạm khóa và tạm thời không hiển thị.'
            : 'Store chưa ở trạng thái hoạt động nên chưa công khai trên marketplace.',
        actionLabel: isActive ? 'Đang hoạt động' : storeMeta?.status === 'SUSPENDED' ? 'Tạm khóa' : 'Tạm offline',
        sectionId: STOREFRONT_SECTION_IDS.visibility,
        tone: isActive ? 'success' : storeMeta?.status === 'SUSPENDED' ? 'danger' : 'neutral',
      },
    ];
  }, [settings, storeMeta, storefrontPath]);

  const passedChecks = storefrontChecklist.filter((item) => item.ok).length;
  const isStorefrontReady = passedChecks === storefrontChecklist.length;
  const readinessPercent = Math.round((passedChecks / storefrontChecklist.length) * 100);
  const productCount = signalData?.productCount ?? storeMeta?.productCount ?? 0;
  const liveProductCount = signalData?.liveProductCount ?? storeMeta?.liveProductCount ?? 0;
  const reviewCount = signalData?.reviewCount ?? 0;
  const storefrontRating = signalData?.rating ?? storeMeta?.rating ?? 0;
  const storefrontResponseRate = signalData?.responseRate ?? storeMeta?.responseRate ?? 0;
  const approvalTone: StorefrontTone =
    storeMeta?.approvalStatus === 'APPROVED' ? 'success' : storeMeta?.approvalStatus === 'REJECTED' ? 'danger' : 'warning';
  const operationTone: StorefrontTone =
    storeMeta?.status === 'ACTIVE' ? 'success' : storeMeta?.status === 'SUSPENDED' ? 'danger' : 'neutral';
  const storefrontUrl = settings.storeInfo.slug ? `/store/${settings.storeInfo.slug}` : '';
  const readinessColor =
    storefrontStatus.tone === 'danger'
      ? '#ef4444'
      : storefrontStatus.tone === 'warning'
        ? '#f59e0b'
        : storefrontStatus.tone === 'neutral'
          ? '#64748b'
          : 'var(--co-vendor-primary)';
  const profileDetail =
    completion >= 100 ? 'Đủ dữ liệu public cơ bản' : 'Còn thiếu thông tin người mua sẽ nhìn thấy';
  const publicConditionDetail =
    isStorefrontReady ? 'Đủ điều kiện hiển thị theo logic hiện tại' : 'Còn mục cần xử lý trước khi công khai';
  const bannerPreview = assetPreviews.banner || settings.storeInfo.banner;
  const logoPreview = assetPreviews.logo || settings.storeInfo.logo;
  const autoSaveIndicator = useMemo(() => {
    switch (autoSaveState) {
      case 'pending':
        return { className: 'storefront-sync-status pending', label: 'Sẽ tự động lưu...' };
      case 'saving':
        return { className: 'storefront-sync-status saving', label: 'Đang tự động lưu...' };
      case 'saved':
        return {
          className: 'storefront-sync-status saved',
          label: lastSavedAt ? `Đã tự động lưu ${new Date(lastSavedAt).toLocaleTimeString('vi-VN')}` : 'Đã tự động lưu',
        };
      case 'error':
        return { className: 'storefront-sync-status error', label: 'Tự động lưu thất bại' };
      default:
        return { className: 'storefront-sync-status idle', label: 'Tự động lưu đang bật' };
    }
  }, [autoSaveState, lastSavedAt]);

  const scrollToStorefrontSection = useCallback((sectionId?: string) => {
    if (!sectionId) return;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <VendorLayout
      title="Gian hàng công khai và bộ mặt thương hiệu"
      breadcrumbs={['Kênh Người Bán', 'Gian hàng']}
      actions={!loading ? <span className={autoSaveIndicator.className}>{autoSaveIndicator.label}</span> : undefined}
    >
      {loading ? (
        <AdminStateBlock
          type="empty"
          title="Đang tải gian hàng công khai"
          description="Hồ sơ gian hàng của shop đang được đồng bộ."
        />
      ) : loadError ? (
        <AdminStateBlock
          type="error"
          title="Không tải được gian hàng công khai"
          description={loadError}
          actionLabel="Thử lại"
          onAction={() => setReloadKey((key) => key + 1)}
        />
      ) : (
        <>
          <input
            ref={bannerInputRef}
            type="file"
            hidden
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            onChange={(event) => void handleImageSelected('banner', event)}
          />
          <input
            ref={logoInputRef}
            type="file"
            hidden
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            onChange={(event) => void handleImageSelected('logo', event)}
          />

          <section className={`admin-panel storefront-control-bar ${storefrontStatus.tone}`}>
            <div className="storefront-control-main">
              <span className={`storefront-control-kicker ${storefrontStatus.tone}`}>
                <span className="storefront-status-dot" />
                {storefrontStatus.tone === 'success' ? 'Storefront đang công khai' : 'Storefront cần theo dõi'}
              </span>
              <h2>{storefrontStatus.label}</h2>
              <p>{storefrontStatus.detail}</p>
              <div className="storefront-control-actions">
                {storefrontUrl ? (
                  <RouterLink className="vendor-primary-btn compact storefront-open-link" to={storefrontUrl} target="_blank" rel="noreferrer">
                    <Eye size={15} />
                    Xem storefront
                    <ExternalLink size={13} />
                  </RouterLink>
                ) : (
                  <span className="storefront-open-link is-disabled">
                    <LinkIcon size={15} />
                    Chưa có đường dẫn
                  </span>
                )}
                <button
                  type="button"
                  className="vendor-ghost-btn compact storefront-jump-btn"
                  onClick={() => scrollToStorefrontSection(STOREFRONT_SECTION_IDS.identity)}
                >
                  Cập nhật hồ sơ
                </button>
              </div>
            </div>
            <div className="storefront-control-progress">
              <div
                className={`storefront-progress-ring ${storefrontStatus.tone}`}
                style={{ background: `conic-gradient(${readinessColor} ${readinessPercent}%, #e2e8f0 0)` }}
              >
                <span>{readinessPercent}%</span>
              </div>
              <div>
                <strong>{passedChecks}/{storefrontChecklist.length} điều kiện</strong>
                <span>{autoSaveIndicator.label}</span>
              </div>
            </div>
          </section>

          <div className="storefront-metric-grid">
            <StorefrontMetricCard
              icon={Eye}
              label="Hồ sơ công khai"
              value={`${completion}%`}
              detail={profileDetail}
              tone={completion >= 100 ? 'success' : 'warning'}
            />
            <StorefrontMetricCard
              icon={CheckCircle2}
              label="Điều kiện công khai"
              value={`${passedChecks}/${storefrontChecklist.length}`}
              detail={publicConditionDetail}
              tone={isStorefrontReady ? 'success' : 'warning'}
            />
            <StorefrontMetricCard
              icon={PackageCheck}
              label="Sản phẩm đang hiển thị"
              value={`${formatNumber(liveProductCount)}/${formatNumber(productCount)}`}
              detail="Tỷ lệ sản phẩm có thể bán trên storefront"
              tone={liveProductCount > 0 ? 'success' : 'neutral'}
            />
            <StorefrontMetricCard
              icon={storeMeta?.isOfficial ? BadgeCheck : Star}
              label="Tín hiệu tin cậy"
              value={storeMeta?.isOfficial ? 'Chính hãng' : `${formatRating(storefrontRating)}/5`}
              detail={
                storeMeta?.isOfficial
                  ? `Đánh giá ${formatRating(storefrontRating)}/5`
                  : reviewCount
                    ? `${formatNumber(reviewCount)} review - phản hồi ${formatPercentValue(storefrontResponseRate)}`
                    : 'Chưa có review thực tế'
              }
              tone={storeMeta?.isOfficial ? 'success' : 'info'}
            />
          </div>

          <div className="admin-panels storefront-grid">
            <div className="admin-left storefront-workspace">
              <section id={STOREFRONT_SECTION_IDS.identity} className="admin-panel storefront-section-panel">
                <div className="admin-panel-head storefront-panel-head">
                  <div>
                    <h2>Nhận diện</h2>
                    <p className="admin-muted small">Tên, mô tả, logo và banner là phần người mua nhìn thấy đầu tiên.</p>
                  </div>
                  <span className={`admin-pill ${completion >= 100 ? 'success' : 'warning'}`}>{completion}% hoàn thiện</span>
                </div>
                <div className="form-grid">
                  <label className="form-field full">
                    <span>Tên gian hàng</span>
                    <input
                      value={settings.storeInfo.name}
                      onChange={(e) => updateStoreInfoField('name', e.target.value)}
                      onBlur={flushPendingAutosave}
                      placeholder="Nhập tên hiển thị trên storefront"
                    />
                  </label>
                  <label className="form-field full">
                    <span>Mô tả gian hàng</span>
                    <textarea
                      rows={5}
                      value={settings.storeInfo.description}
                      onChange={(e) => updateStoreInfoField('description', e.target.value)}
                      onBlur={flushPendingAutosave}
                      placeholder="Tóm tắt phong cách, sản phẩm chủ lực và cam kết của shop"
                    />
                  </label>
                </div>
                <div className="storefront-asset-grid">
                  <button
                    type="button"
                    className={`storefront-asset-tile ${logoPreview ? 'has-asset' : ''}`}
                    onClick={() => openImagePicker('logo')}
                    disabled={uploadingAsset !== null}
                  >
                    <span className="storefront-asset-thumb logo">
                      {logoPreview ? <img src={logoPreview} alt="Logo gian hàng" /> : <ImagePlus size={24} />}
                    </span>
                    <span className="storefront-asset-copy">
                      <strong>Logo gian hàng</strong>
                      <small>{uploadingAsset === 'logo' ? 'Đang tải logo...' : logoPreview ? 'Đổi logo' : 'Tải logo'}</small>
                    </span>
                    <Camera size={17} />
                  </button>
                  <button
                    type="button"
                    className={`storefront-asset-tile ${bannerPreview ? 'has-asset' : ''}`}
                    onClick={() => openImagePicker('banner')}
                    disabled={uploadingAsset !== null}
                  >
                    <span className="storefront-asset-thumb banner">
                      {bannerPreview ? <img src={bannerPreview} alt="Banner gian hàng" /> : <ImagePlus size={24} />}
                    </span>
                    <span className="storefront-asset-copy">
                      <strong>Banner storefront</strong>
                      <small>{uploadingAsset === 'banner' ? 'Đang tải banner...' : bannerPreview ? 'Đổi banner' : 'Tải banner'}</small>
                    </span>
                    <Camera size={17} />
                  </button>
                </div>
              </section>

              <section id={STOREFRONT_SECTION_IDS.contact} className="admin-panel storefront-section-panel">
                <div className="admin-panel-head storefront-panel-head">
                  <div>
                    <h2>Liên hệ công khai</h2>
                    <p className="admin-muted small">Thông tin này giúp người mua xác thực shop và liên hệ khi cần.</p>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Email liên hệ</span>
                    <input
                      value={settings.storeInfo.contactEmail}
                      onChange={(e) => updateStoreInfoField('contactEmail', e.target.value)}
                      onBlur={flushPendingAutosave}
                      placeholder="support@shop.vn"
                    />
                  </label>
                  <label className="form-field">
                    <span>Số điện thoại</span>
                    <input
                      value={settings.storeInfo.phone}
                      onChange={(e) => updateStoreInfoField('phone', e.target.value)}
                      onBlur={flushPendingAutosave}
                      placeholder="0900 000 000"
                    />
                  </label>
                  <label className="form-field full">
                    <span>Địa chỉ hiển thị công khai</span>
                    <input
                      value={settings.storeInfo.address}
                      onChange={(e) => updateStoreInfoField('address', e.target.value)}
                      onBlur={flushPendingAutosave}
                      placeholder="Kho hàng hoặc địa chỉ đại diện"
                    />
                  </label>
                </div>
              </section>

              <section id={STOREFRONT_SECTION_IDS.visibility} className="admin-panel storefront-section-panel">
                <div className="admin-panel-head storefront-panel-head">
                  <div>
                    <h2>Đường dẫn và hiển thị</h2>
                    <p className="admin-muted small">Theo dõi trạng thái phê duyệt và vận hành của gian hàng.</p>
                  </div>
                </div>
                <div className="storefront-url-card">
                  <div>
                    <span className="storefront-field-label">Đường dẫn storefront</span>
                    <code>{storefrontPath}</code>
                  </div>
                  {storefrontUrl ? (
                    <RouterLink className="vendor-ghost-btn compact" to={storefrontUrl} target="_blank" rel="noreferrer">
                      Mở
                      <ExternalLink size={13} />
                    </RouterLink>
                  ) : null}
                </div>
                <div className="storefront-status-grid">
                  <div className={`storefront-status-card ${approvalTone}`}>
                    <ShieldCheck size={18} />
                    <div>
                      <span>Phê duyệt hồ sơ</span>
                      <strong>{storeMeta?.approvalStatus === 'APPROVED' ? 'Đã duyệt' : storeMeta?.approvalStatus === 'REJECTED' ? 'Bị từ chối' : 'Chờ duyệt'}</strong>
                      {storeMeta?.approvalStatus === 'REJECTED' && storeMeta.rejectionReason ? <p>{storeMeta.rejectionReason}</p> : null}
                    </div>
                  </div>
                  <div className={`storefront-status-card ${operationTone}`}>
                    <Store size={18} />
                    <div>
                      <span>Trạng thái vận hành</span>
                      <strong>{storefrontStatus.label}</strong>
                      <p>{storefrontStatus.detail}</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <aside className="admin-right storefront-side-stack">
              <section className="admin-panel storefront-section-panel storefront-preview-panel">
                <div className="admin-panel-head storefront-panel-head">
                  <div>
                    <h2>Xem trước storefront</h2>
                    <p className="admin-muted small storefront-preview-subtitle">Preview cập nhật theo dữ liệu đang chỉnh sửa.</p>
                  </div>
                  <div className="storefront-preview-actions">
                    <button type="button" className="vendor-ghost-btn compact" onClick={() => openImagePicker('banner')} disabled={uploadingAsset !== null}>
                      <Camera size={14} />
                      Banner
                    </button>
                    <button type="button" className="vendor-ghost-btn compact" onClick={() => openImagePicker('logo')} disabled={uploadingAsset !== null}>
                      <Camera size={14} />
                      Logo
                    </button>
                  </div>
                </div>
                <div className="vendor-store-preview">
                  <div className={`vendor-store-preview-banner ${uploadingAsset === 'banner' ? 'is-uploading' : ''}`}>
                    <button
                      type="button"
                      className="vendor-store-preview-banner-button"
                      onClick={() => openImagePicker('banner')}
                      disabled={uploadingAsset !== null}
                      aria-label={bannerPreview ? 'Thay banner gian hàng' : 'Tải banner gian hàng'}
                      style={{
                        backgroundImage: `linear-gradient(rgba(15,23,42,.18), rgba(15,23,42,.34)), url(${
                          bannerPreview || PLACEHOLDER_STORE_BANNER
                        })`,
                      }}
                    >
                      <span className="vendor-store-preview-banner-overlay">
                        {uploadingAsset === 'banner' ? (
                          <>
                            <Upload size={18} />
                            <span>Đang tải banner...</span>
                          </>
                        ) : (
                          <>
                            <Camera size={18} />
                            <span>{bannerPreview ? 'Đổi banner' : 'Tải banner'}</span>
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                  <div className="vendor-store-preview-body">
                    <div className="vendor-store-preview-head">
                      <div className={`vendor-store-preview-logo ${uploadingAsset === 'logo' ? 'is-uploading' : ''}`}>
                        <button
                          type="button"
                          className="vendor-store-preview-logo-button"
                          onClick={() => openImagePicker('logo')}
                          disabled={uploadingAsset !== null}
                          aria-label={logoPreview ? 'Thay logo gian hàng' : 'Tải logo gian hàng'}
                        >
                          {logoPreview ? (
                            <img src={logoPreview} alt={settings.storeInfo.name || 'Logo gian hàng'} />
                          ) : (
                            <div className="vendor-store-preview-logo-empty">
                              <ImagePlus size={26} />
                            </div>
                          )}
                          <span className="vendor-store-preview-logo-overlay">
                            {uploadingAsset === 'logo' ? (
                              <>
                                <Upload size={16} />
                                <span>Đang tải...</span>
                              </>
                            ) : (
                              <>
                                <Camera size={16} />
                                <span>{logoPreview ? 'Đổi logo' : 'Tải logo'}</span>
                              </>
                            )}
                          </span>
                        </button>
                      </div>
                      <div className="vendor-store-preview-copy">
                        <div className="vendor-store-preview-title">
                          <h3>{settings.storeInfo.name || 'Chưa cập nhật tên gian hàng'}</h3>
                          {storeMeta?.isOfficial ? (
                            <span className="admin-pill teal">
                              <ShieldCheck size={13} /> Chính hãng
                            </span>
                          ) : null}
                          <span className={`admin-pill ${toPillTone(storefrontStatus.tone)}`}>{storefrontStatus.label}</span>
                        </div>
                        <p>{storefrontPath}</p>
                      </div>
                    </div>
                    <p className="vendor-store-preview-description">
                      {settings.storeInfo.description || 'Chưa cập nhật mô tả gian hàng.'}
                    </p>
                    <div className="vendor-store-preview-meta">
                      <span>
                        <Mail size={14} />
                        {settings.storeInfo.contactEmail || 'Chưa cập nhật email'}
                      </span>
                      <span>
                        <Phone size={14} />
                        {settings.storeInfo.phone || 'Chưa cập nhật số điện thoại'}
                      </span>
                      <span>
                        <MapPin size={14} />
                        {settings.storeInfo.address || 'Chưa cập nhật địa chỉ'}
                      </span>
                    </div>
                    <div className="vendor-store-preview-metrics">
                      <span>
                        <strong>{formatRating(storefrontRating)}/5</strong>
                        <small>Đánh giá</small>
                      </span>
                      <span>
                        <strong>{formatNumber(liveProductCount)}</strong>
                        <small>Sản phẩm live</small>
                      </span>
                      <span>
                        <strong>{formatPercentValue(storefrontResponseRate)}</strong>
                        <small>Phản hồi</small>
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="admin-panel storefront-section-panel">
                <div className="admin-panel-head storefront-panel-head">
                  <div>
                    <h2>Checklist vận hành</h2>
                    <p className="admin-muted small">Bấm vào hành động để nhảy tới phần cần xử lý.</p>
                  </div>
                </div>
                {storeMeta?.approvalStatus === 'REJECTED' ? (
                  <p className="storefront-business-alert">
                    Store đang ở trạng thái <strong>Từ chối</strong>.
                    {storeMeta.rejectionReason ? ` Lý do: ${storeMeta.rejectionReason}` : ' Vui lòng cập nhật hồ sơ để gửi duyệt lại.'}
                  </p>
                ) : null}
                <div className="storefront-action-list">
                  {storefrontChecklist.map((item) => (
                    <div key={item.key} className={`storefront-action-item ${item.ok ? 'success' : item.tone}`}>
                      <span className="storefront-action-icon">
                        {item.ok ? (
                          <CheckCircle2 size={18} />
                        ) : item.tone === 'danger' ? (
                          <AlertTriangle size={18} />
                        ) : (
                          <CircleDashed size={18} />
                        )}
                      </span>
                      <div className="storefront-action-copy">
                        <strong>{item.label}</strong>
                        <p>{item.hint}</p>
                      </div>
                      <button type="button" className="storefront-action-link" onClick={() => scrollToStorefrontSection(item.sectionId)}>
                        {item.actionLabel}
                      </button>
                    </div>
                  ))}
                </div>
                <p className={`storefront-readiness ${isStorefrontReady ? 'success' : 'warning'}`}>
                  {isStorefrontReady
                    ? 'Gian hàng đã đủ điều kiện công khai theo logic vận hành hiện tại.'
                    : `Gian hàng mới đạt ${passedChecks}/${storefrontChecklist.length} điều kiện. Hoàn tất các mục còn thiếu trước khi đưa lên công khai.`}
                </p>
              </section>
            </aside>
          </div>

          <section className="admin-panel storefront-section-panel storefront-signals-panel">
            <div className="admin-panel-head storefront-panel-head">
              <div>
                <h2>Tín hiệu vận hành</h2>
                <p className="admin-muted small">Các chỉ số này ảnh hưởng trực tiếp tới độ tin cậy của storefront.</p>
              </div>
            </div>
            <div className="storefront-signals-grid">
              <div className="storefront-signal-card">
                <Star size={18} />
                <span>Đánh giá</span>
                <strong>{formatRating(storefrontRating)}/5</strong>
                <p>Điểm trung bình từ {formatNumber(reviewCount)} review.</p>
              </div>
              <div className="storefront-signal-card">
                <Mail size={18} />
                <span>Tỷ lệ phản hồi</span>
                <strong>{formatPercentValue(storefrontResponseRate)}</strong>
                <p>Dựa trên review đã được shop phản hồi.</p>
              </div>
              <div className="storefront-signal-card">
                <ShoppingBag size={18} />
                <span>Đơn hàng</span>
                <strong>{formatNumber(storeMeta?.totalOrders)}</strong>
                <p>Tín hiệu social proof cho người mua.</p>
              </div>
              <div className="storefront-signal-card">
                <PackageCheck size={18} />
                <span>Sản phẩm live</span>
                <strong>{formatNumber(liveProductCount)}/{formatNumber(productCount)}</strong>
                <p>Tỷ lệ hàng đang có thể hiển thị.</p>
              </div>
              <div className={`storefront-signal-card ${storefrontStatus.tone}`}>
                <Store size={18} />
                <span>Hiển thị</span>
                <strong>{storefrontStatus.label}</strong>
                <p>{storefrontStatus.detail}</p>
              </div>
            </div>
          </section>
        </>
      )}
    </VendorLayout>
  );
};

export default VendorStorefront;

