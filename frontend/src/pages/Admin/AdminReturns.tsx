import './Admin.css';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, X, Check, XCircle,
  Eye, Package
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import { AdminStateBlock } from './AdminStateBlocks';
import AdminConfirmDialog from './AdminConfirmDialog';
import { AdminPagination } from './AdminPagination';
import { ADMIN_VIEW_KEYS } from './adminListView';
import { useAdminViewState } from './useAdminViewState';
import { useAdminToast } from './useAdminToast';
import { ADMIN_DICTIONARY } from './adminDictionary';
import { returnService, type ReturnRequest, type ReturnStatus } from '../../services/returnService';

const statusConfig: Record<ReturnStatus, { label: string; pillClass: string }> = {
  PENDING:   { label: ADMIN_DICTIONARY.returns.status.pending,  pillClass: 'admin-pill pending'  },
  APPROVED:  { label: ADMIN_DICTIONARY.returns.status.approved, pillClass: 'admin-pill success'  },
  REJECTED:  { label: ADMIN_DICTIONARY.returns.status.rejected, pillClass: 'admin-pill danger'   },
  COMPLETED: { label: ADMIN_DICTIONARY.returns.status.completed, pillClass: 'admin-pill neutral'  },
};

const TABS: Array<{ key: 'all' | Lowercase<ReturnStatus>; label: string }> = [
  { key: 'all', label: ADMIN_DICTIONARY.returns.tabs.all },
  { key: 'pending', label: ADMIN_DICTIONARY.returns.tabs.pending },
  { key: 'approved', label: ADMIN_DICTIONARY.returns.tabs.approved },
  { key: 'completed', label: ADMIN_DICTIONARY.returns.tabs.completed },
  { key: 'rejected', label: ADMIN_DICTIONARY.returns.tabs.rejected },
];

type TabKey = typeof TABS[number]['key'];

const AdminReturns = () => {
  const t = ADMIN_DICTIONARY.returns;
  const c = ADMIN_DICTIONARY.common;

  const view = useAdminViewState({
    storageKey: ADMIN_VIEW_KEYS.returns ?? 'admin_returns_view',
    path: '/admin/returns',
    validStatusKeys: ['all', 'pending', 'approved', 'completed', 'rejected'],
    defaultStatus: 'all',
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allReturns, setAllReturns] = useState<ReturnRequest[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [drawerItem, setDrawerItem] = useState<ReturnRequest | null>(null);
  const [drawerNote, setDrawerNote] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { toast, pushToast } = useAdminToast();

  const statusFilter: ReturnStatus | null =
    view.status === 'pending' ? 'PENDING'
      : view.status === 'approved' ? 'APPROVED'
        : view.status === 'completed' ? 'COMPLETED'
          : view.status === 'rejected' ? 'REJECTED'
            : null;

  const loadReturns = async (pageIndex = 0) => {
    try {
      setIsLoading(true);
      const res = await returnService.listAdmin({
        status: statusFilter || undefined,
        page: pageIndex,
        size: 20,
      });
      setAllReturns(res.content);
      setTotalPages(res.totalPages || 1);
      setPage(res.number || 0);
    } catch {
      pushToast(ADMIN_DICTIONARY.messages.loadFailed);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReturns(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filteredItems = useMemo(() => {
    const searchText = (view.search || '').toLowerCase();
    return allReturns.filter((item) =>
      item.id.toLowerCase().includes(searchText) ||
      item.orderId.toLowerCase().includes(searchText) ||
      (item.customerName || '').toLowerCase().includes(searchText)
    );
  }, [allReturns, view.search]);

  const pagedItems = filteredItems;

  const tabCounts: Record<TabKey, number> = {
    all: allReturns.length,
    pending: allReturns.filter((r) => r.status === 'PENDING').length,
    approved: allReturns.filter((r) => r.status === 'APPROVED').length,
    completed: allReturns.filter((r) => r.status === 'COMPLETED').length,
    rejected: allReturns.filter((r) => r.status === 'REJECTED').length,
  };

  const changeTab = (key: TabKey) => {
    setSelected(new Set());
    view.setStatus(key);
  };

  const toggleAll = (checked: boolean) => {
    if (checked) setSelected(new Set(filteredItems.map(r => r.id)));
    else setSelected(new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id); else next.delete(id);
    setSelected(next);
  };

  const applyStatus = async (id: string, status: ReturnStatus) => {
    try {
      const updated = await returnService.updateStatus(id, status, drawerNote.trim() || undefined);
      setAllReturns((prev) => prev.map((r) => (r.id === id ? updated : r)));
      if (drawerItem?.id === id) setDrawerItem(updated);
      pushToast(ADMIN_DICTIONARY.messages.returns.statusUpdated(statusConfig[status].label));
    } catch {
      pushToast(ADMIN_DICTIONARY.messages.actionFailed);
    }
  };

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

  const resetCurrentView = () => {
    setSelected(new Set());
    view.resetCurrentView();
    setDrawerItem(null);
    setDrawerNote('');
    void loadReturns(page);
  };

  const shareCurrentView = async () => {
    try {
      await view.shareCurrentView();
      pushToast(ADMIN_DICTIONARY.messages.viewCopied);
    } catch {
      pushToast(ADMIN_DICTIONARY.messages.copyFailed);
    }
  };

  return (
    <AdminLayout
      title={t.title}
      actions={
        <>
          <div className="admin-search">
            <Search size={16} />
            <input
              placeholder={t.searchPlaceholder}
              value={view.search}
              onChange={(e) => view.setSearch(e.target.value)}
            />
          </div>
          <button className="admin-secondary-btn" onClick={shareCurrentView}><LinkIcon /> {c.share}</button>
          <button className="admin-secondary-btn" onClick={resetCurrentView}><RefreshIcon /> {c.reset}</button>
        </>
      }
    >
      <div className="admin-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`admin-tab ${view.status === tab.key ? 'active' : ''}`}
            onClick={() => changeTab(tab.key)}
          >
            <span>{tab.label}</span>
            <span className="admin-pill neutral">{tabCounts[tab.key]}</span>
          </button>
        ))}
      </div>

      {isLoading && <p className="admin-muted">{c.loading}</p>}

      {!isLoading && pagedItems.length === 0 && (
        <AdminStateBlock
          icon={Package}
          title={t.empty.title}
          description={t.empty.description}
          actionLabel={c.reset}
          onAction={resetCurrentView}
        />
      )}

      {!isLoading && pagedItems.length > 0 && (
        <>
          <div className="admin-table">
            <div className="admin-table-head">
              <div className="admin-table-cell checkbox">
                <input
                  type="checkbox"
                  checked={selected.size === pagedItems.length}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </div>
              <div className="admin-table-cell grow">{t.columns.request}</div>
              <div className="admin-table-cell">{t.columns.customer}</div>
              <div className="admin-table-cell">{t.columns.reason}</div>
              <div className="admin-table-cell">{t.columns.status}</div>
              <div className="admin-table-cell right">{t.columns.actions}</div>
            </div>

            {pagedItems.map(item => (
              <div key={item.id} className="admin-table-row">
                <div className="admin-table-cell checkbox">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={(e) => toggleOne(item.id, e.target.checked)}
                  />
                </div>
                <div className="admin-table-cell grow">
                  <div className="admin-cell-title">{item.id}</div>
                  <div className="admin-muted">{formatDate(item.createdAt)} • {item.orderId}</div>
                </div>
                <div className="admin-table-cell">
                  <div className="admin-cell-title">{item.customerName}</div>
                  <div className="admin-muted">{item.customerPhone}</div>
                </div>
                <div className="admin-table-cell admin-muted">{item.reason}</div>
                <div className="admin-table-cell">
                  <span className={statusConfig[item.status].pillClass}>{statusConfig[item.status].label}</span>
                </div>
                <div className="admin-table-cell right">
                  <button className="admin-icon-btn" onClick={() => setDrawerItem(item)} title={c.view}>
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <AdminPagination
            page={page + 1}
            totalPages={totalPages}
            onPageChange={(next) => void loadReturns(next - 1)}
          />
        </>
      )}

      <AnimatePresence>
        {drawerItem && (
          <motion.div
            className="drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawerItem(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {drawerItem && (
          <motion.div
            className="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          >
            <div className="drawer-header">
              <div>
                <p className="drawer-eyebrow">{drawerItem.orderId}</p>
                <h3>{drawerItem.customerName}</h3>
                <p className="admin-muted">{drawerItem.customerPhone}</p>
              </div>
              <button className="admin-icon-btn" onClick={() => setDrawerItem(null)}><X size={18} /></button>
            </div>
            <div className="drawer-body">
              <section className="drawer-section">
                <h4>{t.details.items}</h4>
                <div className="admin-return-items">
                  {drawerItem.items.map((item) => (
                    <div key={item.orderItemId} className="admin-return-item">
                      {item.imageUrl && <img src={item.imageUrl} alt={item.productName} />}
                      <div>
                        <p className="admin-cell-title">{item.productName}</p>
                        <p className="admin-muted">{item.variantName}</p>
                        <p className="admin-muted">x{item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="drawer-section">
                <h4>{t.details.reason}</h4>
                <p>{drawerItem.reason}</p>
                {drawerItem.note && <p className="admin-muted">{drawerItem.note}</p>}
              </section>

              <section className="drawer-section">
                <h4>{t.details.adminNote}</h4>
                <textarea
                  value={drawerNote}
                  onChange={(e) => setDrawerNote(e.target.value)}
                  className="content-form-textarea"
                  rows={4}
                />
              </section>

              <div className="drawer-actions">
                {drawerItem.status === 'PENDING' && (
                  <>
                    <button className="admin-secondary-btn" onClick={() => applyStatus(drawerItem.id, 'REJECTED')}>
                      <XCircle size={16} /> {t.actions.reject}
                    </button>
                    <button className="admin-primary-btn" onClick={() => applyStatus(drawerItem.id, 'APPROVED')}>
                      <Check size={16} /> {t.actions.approve}
                    </button>
                  </>
                )}
                {drawerItem.status === 'APPROVED' && (
                  <button className="admin-primary-btn" onClick={() => applyStatus(drawerItem.id, 'COMPLETED')}>
                    <Check size={16} /> {t.actions.complete}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

const LinkIcon = () => <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M10.59 13.41a1 1 0 0 0 1.41 0l3.3-3.29a1 1 0 0 0-1.42-1.42l-3.3 3.3a1 1 0 0 0 0 1.41Zm-5.3-2.12A5 5 0 0 1 9 7h2a1 1 0 0 0 0-2H9a7 7 0 0 0-6.24 9.93a1 1 0 0 0 1.8-.86A5 5 0 0 1 5.29 11.29Zm14 3.54A5 5 0 0 1 15 17h-2a1 1 0 0 0 0 2h2a7 7 0 0 0 6.24-9.93a1 1 0 1 0-1.8.86a5 5 0 0 1-.15 4.9Z"/></svg>;
const RefreshIcon = () => <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M13 3a9 9 0 1 0 8.95 8.07a1 1 0 1 0-1.99-.14A7 7 0 1 1 13 5h1.59l-1.3 1.29a1 1 0 1 0 1.42 1.42l3-3a1 1 0 0 0 0-1.42l-3-3a1 1 0 1 0-1.42 1.42L14.59 3Z"/></svg>;

export default AdminReturns;
