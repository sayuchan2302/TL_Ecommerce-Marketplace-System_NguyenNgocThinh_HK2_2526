import './AdminStores.css';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Ban, Check, Eye, Link2, RotateCcw, Search, Store, User, X } from 'lucide-react';
import AdminLayout from './AdminLayout';
import AdminConfirmDialog from './AdminConfirmDialog';
import { AdminStateBlock } from './AdminStateBlocks';
import {
  PanelDrawerFooter,
  PanelDrawerHeader,
  PanelDrawerSection,
  PanelStatsGrid,
  PanelTabs,
} from '../../components/Panel/PanelPrimitives';
import { useToast } from '../../contexts/ToastContext';
import { getUiErrorMessage } from '../../utils/errorMessage';
import { storeService, type StoreProfile } from '../../services/storeService';
import Drawer from '../../components/Drawer/Drawer';

interface ManagedStore extends StoreProfile {
  operatingStatus: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  productCount: number;
  liveProductCount: number;
  responseRate: number;
  warehouseAddress: string;
}

type StoreFilter = 'all' | 'pending' | 'active' | 'suspended' | 'rejected';
type ConfirmMode = 'approve' | 'suspend' | 'reactivate';
type ConfirmState = { mode: ConfirmMode; ids: string[]; selectedItems: string[] };

const TABS: Array<{ key: StoreFilter; label: string }> = [
  { key: 'all', label: 'T\u1ea5t c\u1ea3' },
  { key: 'pending', label: 'Ch\u1edd duy\u1ec7t' },
  { key: 'active', label: '\u0110ang ho\u1ea1t \u0111\u1ed9ng' },
  { key: 'suspended', label: 'T\u1ea1m kh\u00f3a' },
  { key: 'rejected', label: 'T\u1eeb ch\u1ed1i' },
];

const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')} \u20ab`;

const approvalLabel = (status: ManagedStore['approvalStatus']) => {
  if (status === 'APPROVED') return '\u0110\u00e3 duy\u1ec7t';
  if (status === 'REJECTED') return '\u0110\u00e3 t\u1eeb ch\u1ed1i';
  return 'Ch\u1edd duy\u1ec7t';
};

const approvalTone = (status: ManagedStore['approvalStatus']) => {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'error';
  return 'pending';
};

const operatingLabel = (status: ManagedStore['operatingStatus']) => {
  if (status === 'ACTIVE') return '\u0110ang ho\u1ea1t \u0111\u1ed9ng';
  if (status === 'SUSPENDED') return 'T\u1ea1m kh\u00f3a';
  return 'Ch\u01b0a k\u00edch ho\u1ea1t';
};

const operatingTone = (status: ManagedStore['operatingStatus']) => {
  if (status === 'ACTIVE') return 'success';
  if (status === 'SUSPENDED') return 'error';
  return 'neutral';
};

const mapStore = (store: StoreProfile): ManagedStore => ({
  ...store,
  operatingStatus:
    store.approvalStatus === 'APPROVED'
      ? store.status === 'SUSPENDED'
        ? 'SUSPENDED'
        : 'ACTIVE'
      : 'INACTIVE',
  productCount: Number(store.productCount ?? 0),
  liveProductCount: Number(store.liveProductCount ?? 0),
  responseRate: Number(store.responseRate ?? 0),
  warehouseAddress: store.warehouseAddress || store.address || 'Ch\u01b0a c\u1ea5u h\u00ecnh kho l\u1ea5y h\u00e0ng',
});


const StoreApprovals = () => {
  const { addToast } = useToast();
  const [stores, setStores] = useState<ManagedStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<StoreFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailStore, setDetailStore] = useState<ManagedStore | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    let active = true;

    const fetchStores = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const adminStores = await storeService.getAdminStores();
        if (!active) return;
        setStores(adminStores.map(mapStore));
      } catch (error: unknown) {
        if (!active) return;
        setStores([]);
        const message = getUiErrorMessage(error, 'Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c danh s\u00e1ch gian h\u00e0ng t\u1eeb backend.');
        setLoadError(message);
        addToast(message, 'error');
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchStores();
    return () => {
      active = false;
    };
  }, [addToast, reloadKey]);

  const filteredStores = useMemo(() => {
    let next = stores;
    if (activeTab !== 'all') {
      next = next.filter((store) => {
        if (activeTab === 'pending') return store.approvalStatus === 'PENDING';
        if (activeTab === 'active') return store.approvalStatus === 'APPROVED' && store.operatingStatus === 'ACTIVE';
        if (activeTab === 'suspended') return store.approvalStatus === 'APPROVED' && store.operatingStatus === 'SUSPENDED';
        return store.approvalStatus === 'REJECTED';
      });
    }
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      next = next.filter((store) =>
        `${store.name} ${store.slug} ${store.applicantName || ''} ${store.applicantEmail || ''} ${store.contactEmail || ''} ${store.phone || ''}`
          .toLowerCase()
          .includes(query),
      );
    }
    return next;
  }, [activeTab, search, stores]);

  const counts = useMemo(() => ({
    all: stores.length,
    pending: stores.filter((store) => store.approvalStatus === 'PENDING').length,
    active: stores.filter((store) => store.approvalStatus === 'APPROVED' && store.operatingStatus === 'ACTIVE').length,
    suspended: stores.filter((store) => store.approvalStatus === 'APPROVED' && store.operatingStatus === 'SUSPENDED').length,
    rejected: stores.filter((store) => store.approvalStatus === 'REJECTED').length,
  }), [stores]);

  const totalPages = Math.max(Math.ceil(filteredStores.length / pageSize), 1);
  const safePage = Math.min(page, totalPages);
  const pagedStores = useMemo(() => filteredStores.slice((safePage - 1) * pageSize, safePage * pageSize), [filteredStores, safePage]);

  const resetCurrentView = () => { setSearch(''); setActiveTab('all'); setSelected(new Set()); setPage(1); };

  const shareCurrentView = async () => {
    try { await navigator.clipboard.writeText(window.location.href); addToast('\u0110\u00e3 sao ch\u00e9p b\u1ed9 l\u1ecdc hi\u1ec7n t\u1ea1i c\u1ee7a gian h\u00e0ng', 'success'); }
    catch { addToast('Kh\u00f4ng th\u1ec3 sao ch\u00e9p li\u00ean k\u1ebft b\u1ed9 l\u1ecdc', 'error'); }
  };

  const openConfirm = (mode: ConfirmMode, ids: string[]) => {
    const items = stores.filter((store) => ids.includes(store.id));
    if (items.length === 0) return;
    setConfirmState({ mode, ids: items.map((item) => item.id), selectedItems: items.map((item) => item.name) });
  };

  const approveStores = async () => {
    if (!confirmState) return;
    setActionLoading(true);
    try {
      const items = stores.filter((store) => confirmState.ids.includes(store.id));
      for (const store of items) {
        const response = await storeService.approveStore(store.id);
        setStores((prev) => prev.map((item) => item.id === response.storeId ? { ...item, approvalStatus: 'APPROVED', status: 'ACTIVE', operatingStatus: 'ACTIVE', rejectionReason: undefined } : item));
        if (detailStore?.id === response.storeId) setDetailStore((current) => current ? { ...current, approvalStatus: 'APPROVED', status: 'ACTIVE', operatingStatus: 'ACTIVE', rejectionReason: undefined } : null);
      }
      setSelected(new Set()); setConfirmState(null);
      addToast('\u0110\u00e3 ph\u00ea duy\u1ec7t gian h\u00e0ng \u0111\u00e3 ch\u1ecdn', 'success');
    } catch (error: unknown) { addToast(getUiErrorMessage(error, 'Ph\u00ea duy\u1ec7t gian h\u00e0ng th\u1ea5t b\u1ea1i'), 'error'); }
    finally { setActionLoading(false); }
  };

  const rejectStore = async () => {
    if (!detailStore) return;
    if (!rejectReason.trim()) { addToast('Vui l\u00f2ng nh\u1eadp l\u00fd do t\u1eeb ch\u1ed1i h\u1ed3 s\u01a1 gian h\u00e0ng', 'error'); return; }
    setActionLoading(true);
    try {
      await storeService.rejectStore(detailStore.id, rejectReason.trim());
      setStores((prev) => prev.map((store) => store.id === detailStore.id ? { ...store, approvalStatus: 'REJECTED', rejectionReason: rejectReason.trim(), status: 'INACTIVE', operatingStatus: 'INACTIVE', liveProductCount: 0 } : store));
      setDetailStore((current) => current ? { ...current, approvalStatus: 'REJECTED', rejectionReason: rejectReason.trim(), status: 'INACTIVE', operatingStatus: 'INACTIVE', liveProductCount: 0 } : null);
      setSelected((prev) => { const next = new Set(prev); next.delete(detailStore.id); return next; });
      addToast('\u0110\u00e3 t\u1eeb ch\u1ed1i h\u1ed3 s\u01a1 gian h\u00e0ng', 'info');
    } catch (error: unknown) { addToast(getUiErrorMessage(error, 'T\u1eeb ch\u1ed1i h\u1ed3 s\u01a1 gian h\u00e0ng th\u1ea5t b\u1ea1i'), 'error'); }
    finally { setActionLoading(false); }
  };

  const applyStoreOperatingChange = async () => {
    if (!confirmState) return;
    setActionLoading(true);
    try {
      const nextStatus = confirmState.mode === 'suspend' ? 'SUSPENDED' : 'ACTIVE';
      for (const storeId of confirmState.ids) {
        if (confirmState.mode === 'suspend') await storeService.suspendStore(storeId);
        else await storeService.reactivateStore(storeId);
      }
      setStores((prev) => prev.map((store) => confirmState.ids.includes(store.id) ? { ...store, operatingStatus: nextStatus, status: nextStatus } : store));
      if (detailStore && confirmState.ids.includes(detailStore.id)) setDetailStore((current) => current ? { ...current, operatingStatus: nextStatus, status: nextStatus } : null);
      addToast(confirmState.mode === 'suspend' ? '\u0110\u00e3 t\u1ea1m kh\u00f3a gian h\u00e0ng \u0111\u00e3 ch\u1ecdn' : '\u0110\u00e3 m\u1edf l\u1ea1i gian h\u00e0ng \u0111\u00e3 ch\u1ecdn', confirmState.mode === 'suspend' ? 'info' : 'success');
      setSelected(new Set()); setConfirmState(null);
    } catch (error: unknown) { addToast(getUiErrorMessage(error, 'Kh\u00f4ng th\u1ec3 c\u1eadp nh\u1eadt tr\u1ea1ng th\u00e1i gian h\u00e0ng'), 'error'); }
    finally { setActionLoading(false); }
  };

  return (
    <AdminLayout
      title="Gian h\u00e0ng"
      breadcrumbs={['Gian h\u00e0ng', 'Qu\u1ea3n l\u00fd gian h\u00e0ng']}
      actions={<><div className="admin-search"><Search size={16} /><input placeholder="T\u00ecm theo t\u00ean gian h\u00e0ng, slug, ch\u1ee7 s\u1edf h\u1eefu ho\u1eb7c email li\u00ean h\u1ec7" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div><button className="admin-ghost-btn" onClick={() => void shareCurrentView()}><Link2 size={16} />Chia s\u1ebb b\u1ed9 l\u1ecdc</button></>}
    >
      <PanelStatsGrid items={[
        { key: 'all', label: 'T\u1ed5ng gian h\u00e0ng', value: counts.all, sub: 'To\u00e0n b\u1ed9 h\u1ed3 s\u01a1 gian h\u00e0ng tr\u00ean s\u00e0n' },
        { key: 'pending', label: 'Ch\u1edd duy\u1ec7t', value: counts.pending, sub: 'H\u1ed3 s\u01a1 m\u1edbi c\u1ea7n ph\u00ea duy\u1ec7t', tone: counts.pending > 0 ? 'warning' : '', onClick: () => setActiveTab('pending') },
        { key: 'active', label: '\u0110ang ho\u1ea1t \u0111\u1ed9ng', value: counts.active, sub: 'Gian h\u00e0ng \u0111ang b\u00e1n tr\u00ean s\u00e0n', tone: 'success', onClick: () => setActiveTab('active') },
        { key: 'suspended', label: 'T\u1ea1m kh\u00f3a', value: counts.suspended, sub: 'Gian h\u00e0ng b\u1ecb ch\u1eb7n v\u1eadn h\u00e0nh t\u1ea1m th\u1eddi', tone: counts.suspended > 0 ? 'danger' : '', onClick: () => setActiveTab('suspended') },
      ]} />
      <PanelTabs items={TABS.map((tab) => ({ key: tab.key, label: tab.label, count: counts[tab.key] }))} activeKey={activeTab} onChange={(key) => { setActiveTab(key as StoreFilter); setSelected(new Set()); setPage(1); }} />
      <section className="admin-panels single"><div className="admin-panel"><div className="admin-panel-head">
        <h2>Danh s\u00e1ch gian h\u00e0ng</h2>
        {selected.size > 0 && (() => {
          const ss = stores.filter((s) => selected.has(s.id));
          const hp = ss.some((s) => s.approvalStatus === 'PENDING');
          const ha = ss.some((s) => s.approvalStatus === 'APPROVED' && s.operatingStatus === 'ACTIVE');
          const hs = ss.some((s) => s.approvalStatus === 'APPROVED' && s.operatingStatus === 'SUSPENDED');
          return (<div className="admin-actions"><span className="admin-muted">\u0110\u00e3 ch\u1ecdn {selected.size} gian h\u00e0ng</span>
            {hp && <button className="admin-ghost-btn" onClick={() => openConfirm('approve', Array.from(selected))}>Duy\u1ec7t \u0111\u00e3 ch\u1ecdn</button>}
            {ha && <button className="admin-ghost-btn danger" onClick={() => openConfirm('suspend', Array.from(selected))}>T\u1ea1m kh\u00f3a \u0111\u00e3 ch\u1ecdn</button>}
            {hs && <button className="admin-ghost-btn" onClick={() => openConfirm('reactivate', Array.from(selected))}>M\u1edf l\u1ea1i \u0111\u00e3 ch\u1ecdn</button>}
            <button className="admin-ghost-btn" onClick={() => setSelected(new Set())}>B\u1ecf ch\u1ecdn</button></div>);
        })()}
      </div>
      {!loading && loadError ? (<AdminStateBlock type="error" title="Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c danh s\u00e1ch gian h\u00e0ng" description={loadError} actionLabel="Th\u1eed l\u1ea1i" onAction={() => setReloadKey((value) => value + 1)} />) : null}
      {!loading && !loadError && filteredStores.length === 0 ? (<AdminStateBlock type={search.trim() ? 'search-empty' : 'empty'} title={search.trim() ? 'Kh\u00f4ng t\u00ecm th\u1ea5y gian h\u00e0ng ph\u00f9 h\u1ee3p' : 'Ch\u01b0a c\u00f3 h\u1ed3 s\u01a1 gian h\u00e0ng'} description={search.trim() ? 'Th\u1eed \u0111\u1ed5i t\u1eeb kh\u00f3a ho\u1eb7c \u0111\u1eb7t l\u1ea1i b\u1ed9 l\u1ecdc \u0111\u1ec3 xem l\u1ea1i danh s\u00e1ch gian h\u00e0ng.' : 'Danh s\u00e1ch gian h\u00e0ng s\u1ebd hi\u1ec3n th\u1ecb t\u1ea1i \u0111\u00e2y \u0111\u1ec3 qu\u1ea3n tr\u1ecb vi\u00ean theo d\u00f5i v\u00e0 x\u1eed l\u00fd.'} actionLabel="\u0110\u1eb7t l\u1ea1i b\u1ed9 l\u1ecdc" onAction={resetCurrentView} />) : null}
      {!loading && !loadError && filteredStores.length > 0 ? (<><div className="admin-table" role="table" aria-label="B\u1ea3ng gian h\u00e0ng"><div className="admin-table-row stores admin-table-head" role="row">
        <div role="columnheader"><input type="checkbox" checked={selected.size === filteredStores.length && filteredStores.length > 0} onChange={(event) => setSelected(event.target.checked ? new Set(filteredStores.map((i) => i.id)) : new Set())} /></div>
        <div role="columnheader">Gian h\u00e0ng</div><div role="columnheader">Ch\u1ee7 s\u1edf h\u1eefu</div><div role="columnheader">Quy m\u00f4 v\u1eadn h\u00e0nh</div><div role="columnheader">Tr\u1ea1ng th\u00e1i</div><div role="columnheader">Ng\u00e0y t\u1ea1o</div><div role="columnheader">H\u00e0nh \u0111\u1ed9ng</div>
      </div>{pagedStores.map((store) => (<motion.div key={store.id} className="admin-table-row stores" role="row" whileHover={{ y: -1 }} onClick={() => { setDetailStore(store); setRejectReason(store.rejectionReason || ''); }} style={{ cursor: 'pointer' }}>
        <div role="cell" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.has(store.id)} onChange={(e) => { const n = new Set(selected); if (e.target.checked) n.add(store.id); else n.delete(store.id); setSelected(n); }} /></div>
        <div role="cell" className="store-cell"><div className="store-avatar">{store.logo ? <img src={store.logo} alt={store.name} /> : <Store size={18} />}</div><div className="store-copy"><div className="admin-bold">{store.name}</div><div className="admin-muted small">{store.slug}</div></div></div>
        <div role="cell"><div className="admin-bold">{store.applicantName || 'Ch\u01b0a \u0111\u0103ng k\u00fd ch\u1ee7 s\u1edf h\u1eefu'}</div><div className="admin-muted small">{store.applicantEmail || store.contactEmail || 'Ch\u01b0a c\u00f3 email'}</div></div>
        <div role="cell" className="store-ops-cell"><div className="admin-bold">{store.productCount.toLocaleString('vi-VN')} SKU</div><div className="admin-muted small">{store.liveProductCount.toLocaleString('vi-VN')} \u0110ang b\u00e1n \u00b7 {store.totalOrders.toLocaleString('vi-VN')} \u0111\u01a1n</div></div>
        <div role="cell"><div className="store-status-stack"><span className={`admin-pill ${approvalTone(store.approvalStatus)}`}>{approvalLabel(store.approvalStatus)}</span><span className={`admin-pill ${operatingTone(store.operatingStatus)}`}>{operatingLabel(store.operatingStatus)}</span></div></div>
        <div role="cell">{new Date(store.createdAt).toLocaleDateString('vi-VN')}</div>
        <div role="cell" className="admin-actions" onClick={(e) => e.stopPropagation()}>
          <button className="admin-icon-btn subtle" title="Xem h\u1ed3 s\u01a1 gian h\u00e0ng" aria-label="Xem h\u1ed3 s\u01a1 gian h\u00e0ng" onClick={() => { setDetailStore(store); setRejectReason(store.rejectionReason || ''); }}><Eye size={16} /></button>
          {store.approvalStatus === 'PENDING' ? <button className="admin-icon-btn subtle" title="Duy\u1ec7t gian h\u00e0ng" aria-label="Duy\u1ec7t gian h\u00e0ng" onClick={() => openConfirm('approve', [store.id])}><Check size={16} /></button> : null}
          {store.approvalStatus === 'APPROVED' && store.operatingStatus === 'ACTIVE' ? <button className="admin-icon-btn subtle danger-icon" title="T\u1ea1m kh\u00f3a gian h\u00e0ng" aria-label="T\u1ea1m kh\u00f3a gian h\u00e0ng" onClick={() => openConfirm('suspend', [store.id])}><Ban size={16} /></button> : null}
          {store.approvalStatus === 'APPROVED' && store.operatingStatus === 'SUSPENDED' ? <button className="admin-icon-btn subtle" title="M\u1edf l\u1ea1i gian h\u00e0ng" aria-label="M\u1edf l\u1ea1i gian h\u00e0ng" onClick={() => openConfirm('reactivate', [store.id])}><RotateCcw size={16} /></button> : null}
        </div></motion.div>))}</div>
        <div className="table-footer"><span className="table-footer-meta">Hi\u1ec3n th\u1ecb {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredStores.length)} tr\u00ean {filteredStores.length} gian h\u00e0ng</span>
        <div className="pagination"><button className="page-btn" disabled={safePage === 1} onClick={() => setPage((c) => Math.max(c - 1, 1))}>Tr\u01b0\u1edbc</button>{Array.from({ length: totalPages }).map((_, i) => (<button key={i + 1} className={`page-btn ${safePage === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>))}<button className="page-btn" disabled={safePage === totalPages} onClick={() => setPage((c) => Math.min(c + 1, totalPages))}>Sau</button></div></div></>) : null}</div></section>
      <AdminConfirmDialog open={Boolean(confirmState)} title={confirmState?.mode === 'approve' ? 'Ph\u00ea duy\u1ec7t gian h\u00e0ng' : confirmState?.mode === 'suspend' ? 'T\u1ea1m kh\u00f3a gian h\u00e0ng' : 'M\u1edf l\u1ea1i gian h\u00e0ng'} description={confirmState?.mode === 'approve' ? 'Ch\u1ee7 s\u1edf h\u1eefu s\u1ebd \u0111\u01b0\u1ee3c k\u00edch ho\u1ea1t quy\u1ec1n ng\u01b0\u1eddi b\u00e1n v\u00e0 gian h\u00e0ng chuy\u1ec3n sang tr\u1ea1ng th\u00e1i ho\u1ea1t \u0111\u1ed9ng.' : confirmState?.mode === 'suspend' ? 'Gian h\u00e0ng s\u1ebd b\u1ecb ch\u1eb7n v\u1eadn h\u00e0nh t\u1ea1m th\u1eddi tr\u00ean s\u00e0n cho \u0111\u1ebfn khi m\u1edf l\u1ea1i.' : 'Gian h\u00e0ng s\u1ebd \u0111\u01b0\u1ee3c m\u1edf l\u1ea1i ho\u1ea1t \u0111\u1ed9ng v\u00e0 ti\u1ebfp t\u1ee5c hi\u1ec3n th\u1ecb tr\u00ean s\u00e0n.'} selectedItems={confirmState?.selectedItems} selectedNoun="gian h\u00e0ng" confirmLabel={actionLoading ? '\u0110ang x\u1eed l\u00fd...' : confirmState?.mode === 'approve' ? 'Duy\u1ec7t gian h\u00e0ng' : confirmState?.mode === 'suspend' ? 'T\u1ea1m kh\u00f3a gian h\u00e0ng' : 'M\u1edf l\u1ea1i gian h\u00e0ng'} danger={confirmState?.mode === 'suspend'} onCancel={() => setConfirmState(null)} onConfirm={() => { if (!confirmState) return; if (confirmState.mode === 'approve') { void approveStores(); return; } void applyStoreOperatingChange(); }} />
      <Drawer open={Boolean(detailStore)} onClose={() => { setDetailStore(null); setRejectReason(''); }} className="store-drawer">{detailStore ? (<><PanelDrawerHeader eyebrow="H\u1ed3 s\u01a1 gian h\u00e0ng" title={detailStore.name} onClose={() => { setDetailStore(null); setRejectReason(''); }} closeLabel="\u0110\u00f3ng h\u1ed3 s\u01a1 gian h\u00e0ng" />
        <div className="drawer-body"><PanelDrawerSection title="T\u1ed5ng quan gian h\u00e0ng"><div className="store-drawer-hero"><div className="store-avatar large">{detailStore.logo ? <img src={detailStore.logo} alt={detailStore.name} /> : <Store size={22} />}</div><div><div className="admin-bold">{detailStore.name}</div><div className="admin-muted">{detailStore.slug}</div></div><div className="store-hero-pills"><span className={`admin-pill ${approvalTone(detailStore.approvalStatus)}`}>{approvalLabel(detailStore.approvalStatus)}</span><span className={`admin-pill ${operatingTone(detailStore.operatingStatus)}`}>{operatingLabel(detailStore.operatingStatus)}</span></div></div></PanelDrawerSection>
          <PanelDrawerSection title="H\u1ed3 s\u01a1 v\u00e0 ch\u1ee7 s\u1edf h\u1eefu"><div className="admin-card-list"><div className="admin-card-row"><span className="admin-bold"><User size={14} style={{ verticalAlign: -2, marginRight: 6 }} /> Ch\u1ee7 s\u1edf h\u1eefu</span><span className="admin-muted">{detailStore.applicantName || 'Ch\u01b0a \u0111\u0103ng k\u00fd ch\u1ee7 s\u1edf h\u1eefu'}</span></div><div className="admin-card-row"><span className="admin-bold">Email li\u00ean h\u1ec7</span><span className="admin-muted">{detailStore.applicantEmail || detailStore.contactEmail || 'Ch\u01b0a c\u00f3 email'}</span></div><div className="admin-card-row"><span className="admin-bold">S\u1ed1 \u0111i\u1ec7n tho\u1ea1i</span><span className="admin-muted">{detailStore.phone || 'Ch\u01b0a c\u1eadp nh\u1eadt'}</span></div><div className="admin-card-row"><span className="admin-bold">Kho l\u1ea5y h\u00e0ng</span><span className="admin-muted">{detailStore.warehouseAddress}</span></div><div className="admin-card-row"><span className="admin-bold">T\u1ef7 l\u1ec7 hoa h\u1ed3ng</span><span className="admin-muted">{detailStore.commissionRate || 5}%</span></div></div></PanelDrawerSection>
          <PanelDrawerSection title="T\u00edn hi\u1ec7u kinh doanh"><div className="store-signal-grid"><div className="store-signal-card"><span className="admin-muted small">S\u1ea3n ph\u1ea9m</span><strong>{`${detailStore.liveProductCount.toLocaleString('vi-VN')}/${detailStore.productCount.toLocaleString('vi-VN')}`}</strong><span className="admin-muted small">\u0111ang hi\u1ec3n th\u1ecb / t\u1ed5ng SKU</span></div><div className="store-signal-card"><span className="admin-muted small">\u0110\u01a1n h\u00e0ng</span><strong>{detailStore.totalOrders.toLocaleString('vi-VN')}</strong><span className="admin-muted small">\u0111\u01a1n \u0111\u00e3 ghi nh\u1eadn</span></div><div className="store-signal-card"><span className="admin-muted small">GMV</span><strong>{formatCurrency(detailStore.totalSales)}</strong><span className="admin-muted small">doanh s\u1ed1 to\u00e0n gian h\u00e0ng</span></div><div className="store-signal-card"><span className="admin-muted small">\u0110\u00e1nh gi\u00e1</span><strong>{detailStore.rating.toFixed(1)}</strong><span className="admin-muted small">trung b\u00ecnh kh\u00e1ch h\u00e0ng</span></div><div className="store-signal-card"><span className="admin-muted small">Ph\u1ea3n h\u1ed3i</span><strong>{`${detailStore.responseRate.toLocaleString('vi-VN')}%`}</strong><span className="admin-muted small">t\u1ef7 l\u1ec7 ph\u1ea3n h\u1ed3i c\u1ee7a shop</span></div><div className="store-signal-card"><span className="admin-muted small">Ng\u00e0y t\u1ea1o</span><strong>{new Date(detailStore.createdAt).toLocaleDateString('vi-VN')}</strong><span className="admin-muted small">m\u1ed1c kh\u1edfi t\u1ea1o h\u1ed3 s\u01a1</span></div></div></PanelDrawerSection>
          <PanelDrawerSection title="M\u00f4 t\u1ea3 gian h\u00e0ng"><p className="admin-muted store-description">{detailStore.description || 'Ch\u01b0a c\u00f3 m\u00f4 t\u1ea3 gian h\u00e0ng.'}</p></PanelDrawerSection>
          <PanelDrawerSection title="Ghi ch\u00fa ki\u1ec3m duy\u1ec7t">{detailStore.approvalStatus === 'PENDING' || detailStore.approvalStatus === 'REJECTED' ? (<textarea className="admin-textarea store-reject-note" rows={4} placeholder="Nh\u1eadp ghi ch\u00fa ho\u1eb7c l\u00fd do t\u1eeb ch\u1ed1i h\u1ed3 s\u01a1 gian h\u00e0ng" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />) : (<div className="admin-card-list"><div className="admin-card-row"><span className="admin-bold">Ghi ch\u00fa hi\u1ec7n t\u1ea1i</span><span className="admin-muted">{detailStore.rejectionReason || 'Ch\u01b0a c\u00f3 ghi ch\u00fa ki\u1ec3m duy\u1ec7t. Gian h\u00e0ng \u0111ang ho\u1ea1t \u0111\u1ed9ng b\u00ecnh th\u01b0\u1eddng.'}</span></div></div>)}</PanelDrawerSection></div>
          <PanelDrawerFooter><button className="admin-ghost-btn" onClick={() => { setDetailStore(null); setRejectReason(''); }}>\u0110\u00f3ng</button>{detailStore.approvalStatus === 'PENDING' ? <button className="admin-ghost-btn danger" disabled={actionLoading} onClick={() => void rejectStore()}><X size={14} />T\u1eeb ch\u1ed1i h\u1ed3 s\u01a1</button> : null}{detailStore.approvalStatus === 'PENDING' ? <button className="admin-primary-btn" disabled={actionLoading} onClick={() => openConfirm('approve', [detailStore.id])}><Check size={14} />Duy\u1ec7t gian h\u00e0ng</button> : null}{detailStore.approvalStatus === 'APPROVED' && detailStore.operatingStatus === 'ACTIVE' ? <button className="admin-ghost-btn danger" onClick={() => openConfirm('suspend', [detailStore.id])}><Ban size={14} />T\u1ea1m kh\u00f3a gian h\u00e0ng</button> : null}{detailStore.approvalStatus === 'APPROVED' && detailStore.operatingStatus === 'SUSPENDED' ? <button className="admin-primary-btn" onClick={() => openConfirm('reactivate', [detailStore.id])}><RotateCcw size={14} />M\u1edf l\u1ea1i gian h\u00e0ng</button> : null}</PanelDrawerFooter></>) : null}</Drawer>
    </AdminLayout>
  );
};

export default StoreApprovals;
