import './AdminFinancials.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from './AdminLayout';
import AdminConfirmDialog from './AdminConfirmDialog';
import { PanelStatsGrid, PanelTabs } from '../../components/Panel/PanelPrimitives';
import { useToast } from '../../contexts/ToastContext';
import { walletService, type VendorWallet, type PayoutRequest } from '../../services/walletService';
import { adminDashboardService } from '../../services/adminDashboardService';
import AdminFinancialWalletsPanel from './components/financials/AdminFinancialWalletsPanel';
import AdminFinancialPendingPayoutsPanel from './components/financials/AdminFinancialPendingPayoutsPanel';
import AdminWalletDetailDrawer from './components/financials/AdminWalletDetailDrawer';
import AdminPayoutDetailDrawer from './components/financials/AdminPayoutDetailDrawer';
import { PAGE_SIZE, formatCurrency } from './components/financials/adminFinancialPresentation';
import type { AdminTab, ConfirmState, FinancialSnapshot } from './components/financials/adminFinancialTypes';

const AdminFinancials = () => {
  const { addToast } = useToast();
  const [wallets, setWallets] = useState<VendorWallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailRecord, setDetailRecord] = useState<VendorWallet | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<AdminTab>('wallets');
  const [financialSnapshot, setFinancialSnapshot] = useState<FinancialSnapshot>({
    gmv: 0,
    commission: 0,
    review: 0,
    pendingPayoutTotal: 0,
    pendingPayoutCount: 0,
  });
  const [pendingPayouts, setPendingPayouts] = useState<PayoutRequest[]>([]);
  const [payoutPage, setPayoutPage] = useState(1);
  const [payoutTotalPages, setPayoutTotalPages] = useState(1);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [isApplyingPayout, setIsApplyingPayout] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [walletPage, dashboard, payoutSummary] = await Promise.all([
        walletService.getAdminWallets(search.trim(), page, PAGE_SIZE),
        adminDashboardService.get(),
        walletService.getPayoutSummary(),
      ]);

      setWallets(walletPage.content || []);
      setTotalPages(Math.max(Number(walletPage.totalPages || 1), 1));
      setFinancialSnapshot({
        gmv: Number(dashboard.metrics.gmvDelivered || 0),
        commission: Number(dashboard.metrics.commissionDelivered || 0),
        review: Number(dashboard.quickViews.parentOrdersNeedAttention || 0),
        pendingPayoutTotal: Number(payoutSummary.pendingTotal || 0),
        pendingPayoutCount: Number(payoutSummary.pendingCount || 0),
      });
    } catch {
      setWallets([]);
      setTotalPages(1);
      setFinancialSnapshot({
        gmv: 0,
        commission: 0,
        review: 0,
        pendingPayoutTotal: 0,
        pendingPayoutCount: 0,
      });
      addToast('Lỗi khi tải dữ liệu đối soát.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast, page, search]);

  const fetchPendingPayouts = useCallback(async () => {
    try {
      const result = await walletService.getPendingPayouts(payoutPage, PAGE_SIZE);
      setPendingPayouts(result.content || []);
      setPayoutTotalPages(Math.max(Number(result.totalPages || 1), 1));
    } catch {
      setPendingPayouts([]);
    }
  }, [payoutPage]);

  const fetchAllPendingPayouts = useCallback(async () => {
    const allPending: PayoutRequest[] = [];
    let currentPage = 1;
    let total = 1;

    do {
      const result = await walletService.getPendingPayouts(currentPage, PAGE_SIZE);
      allPending.push(...(result.content || []));
      total = Math.max(Number(result.totalPages || 1), 1);
      currentPage += 1;
    } while (currentPage <= total);

    return allPending;
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'payouts') {
      void fetchPendingPayouts();
    }
  }, [activeTab, fetchPendingPayouts]);

  const records = useMemo(() => wallets, [wallets]);

  const totals = useMemo(
    () => ({
      gmv: financialSnapshot.gmv,
      commission: financialSnapshot.commission,
      payout: records.reduce((sum, record) => sum + record.availableBalance, 0),
      review: financialSnapshot.review,
      pendingPayoutTotal: financialSnapshot.pendingPayoutTotal,
      pendingPayoutCount: financialSnapshot.pendingPayoutCount,
    }),
    [financialSnapshot, records],
  );

  const resetCurrentView = () => {
    setSearch('');
    setActiveTab('wallets');
    setSelected(new Set());
    setPage(1);
  };

  const openReleaseConfirm = (storeIds: string[]) => {
    const items = records.filter((record) => storeIds.includes(record.storeId) && record.reservedBalance > 0);
    if (items.length === 0) {
      addToast('Không có shop nào có phiếu rút tiền đang chờ duyệt.', 'info');
      return;
    }

    setConfirmState({
      storeIds: items.map((item) => item.storeId),
      storeNames: items.map((item) => item.storeName),
    });
  };

  const applyPayout = async () => {
    if (!confirmState || isApplyingPayout) return;

    const storeIds = new Set(confirmState.storeIds);

    try {
      setIsApplyingPayout(true);
      const allPending = await fetchAllPendingPayouts();
      const targetRequests = allPending.filter(
        (request) => request.status === 'PENDING' && storeIds.has(request.storeId),
      );

      if (targetRequests.length === 0) {
        addToast('Không tìm thấy phiếu rút tiền chờ duyệt cho các shop đã chọn.', 'info');
        setSelected(new Set());
        setConfirmState(null);
        return;
      }

      const approvalResults = await Promise.allSettled(
        targetRequests.map((request) => walletService.approvePayoutRequest(request.id)),
      );

      const approvedCount = approvalResults.filter((result) => result.status === 'fulfilled').length;
      const failedCount = approvalResults.length - approvedCount;

      if (approvedCount > 0) {
        addToast(`Đã duyệt ${approvedCount} phiếu rút tiền.`, 'success');
      }
      if (failedCount > 0) {
        addToast(`Có ${failedCount} yêu cầu duyệt thất bại. Vui lòng thử lại.`, 'error');
      }

      setSelected(new Set());
      setConfirmState(null);
      await Promise.all([fetchData(), fetchPendingPayouts()]);
    } catch {
      addToast('Lỗi trong quá trình duyệt phiếu rút tiền.', 'error');
    } finally {
      setIsApplyingPayout(false);
    }
  };

  const handleApprovePayout = async (payout: PayoutRequest) => {
    try {
      await walletService.approvePayoutRequest(payout.id);
      addToast(`Đã duyệt yêu cầu rút tiền cho ${payout.storeName}.`, 'success');
      await fetchPendingPayouts();
      await fetchData();
    } catch {
      addToast('Không thể duyệt yêu cầu rút tiền.', 'error');
    }
  };

  const handleRejectPayout = async (payout: PayoutRequest) => {
    if (!rejectNote.trim()) {
      addToast('Vui lòng nhập lý do từ chối.', 'error');
      return;
    }

    try {
      await walletService.rejectPayout(payout.id, rejectNote.trim());
      addToast(`Đã từ chối yêu cầu rút tiền cho ${payout.storeName}.`, 'info');
      setSelectedPayout(null);
      setRejectNote('');
      await fetchPendingPayouts();
      await fetchData();
    } catch {
      addToast('Không thể từ chối yêu cầu rút tiền.', 'error');
    }
  };

  return (
    <AdminLayout title="Tài chính sàn" breadcrumbs={['Tài chính sàn', 'Duyệt phiếu rút tiền']}>
      <PanelStatsGrid
        items={[
          {
            key: 'gmv',
            label: 'GMV toàn sàn',
            value: formatCurrency(totals.gmv),
            sub: 'Tổng giá trị đơn hàng từ bảng vận hành hiện tại',
          },
          {
            key: 'commission',
            label: 'Commission thực thu',
            value: formatCurrency(totals.commission),
            sub: 'Tổng phí sàn từ các đơn đã hoàn tất',
            tone: 'info',
          },
          {
            key: 'payout',
            label: 'Số dư khả dụng',
            value: formatCurrency(totals.payout),
            sub: 'Tổng số tiền shop có thể tạo phiếu rút',
            tone: 'success',
          },
          {
            key: 'pending',
            label: 'Phiếu rút chờ duyệt',
            value: totals.pendingPayoutCount,
            sub: formatCurrency(totals.pendingPayoutTotal),
            tone: totals.pendingPayoutCount > 0 ? 'warning' : '',
          },
        ]}
      />

      <PanelTabs
        items={[
          { key: 'wallets', label: 'Ví store', count: records.length },
          { key: 'payouts', label: 'Chờ duyệt rút tiền', count: totals.pendingPayoutCount },
        ]}
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key as AdminTab);
          setSelected(new Set());
          setPage(1);
        }}
      />

      <section className="admin-panels single">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>{activeTab === 'wallets' ? 'Ví shop và số dư rút tiền' : 'Danh sách phiếu rút tiền chờ duyệt'}</h2>
          </div>

          {activeTab === 'wallets' ? (
            <AdminFinancialWalletsPanel
              isLoading={isLoading}
              records={records}
              search={search}
              selected={selected}
              page={page}
              totalPages={totalPages}
              onSelectionChange={setSelected}
              onPageChange={setPage}
              onResetCurrentView={resetCurrentView}
              onOpenDetail={setDetailRecord}
              onOpenReleaseConfirm={openReleaseConfirm}
            />
          ) : (
            <AdminFinancialPendingPayoutsPanel
              payouts={pendingPayouts}
              payoutPage={payoutPage}
              payoutTotalPages={payoutTotalPages}
              onPageChange={setPayoutPage}
              onOpenDetail={setSelectedPayout}
              onApprove={handleApprovePayout}
              onPrepareReject={(payout) => {
                setSelectedPayout(payout);
                setRejectNote('');
              }}
            />
          )}
        </div>
      </section>

      <AdminConfirmDialog
        open={Boolean(confirmState)}
        title="Xác nhận duyệt phiếu rút tiền"
        description="Các phiếu rút tiền đang chờ của shop sẽ được chuyển sang trạng thái đã duyệt và số dư reserved sẽ bị trừ."
        selectedItems={confirmState?.storeNames}
        selectedNoun="bản ghi tài chính"
        confirmLabel={isApplyingPayout ? 'Đang duyệt...' : 'Xác nhận duyệt phiếu'}
        confirmDisabled={isApplyingPayout}
        cancelDisabled={isApplyingPayout}
        onCancel={() => {
          if (isApplyingPayout) return;
          setConfirmState(null);
        }}
        onConfirm={() => void applyPayout()}
      />

      <AdminWalletDetailDrawer
        record={detailRecord}
        onClose={() => setDetailRecord(null)}
        onOpenReleaseConfirm={openReleaseConfirm}
      />

      <AdminPayoutDetailDrawer
        payout={selectedPayout}
        rejectNote={rejectNote}
        onRejectNoteChange={setRejectNote}
        onClose={() => {
          setSelectedPayout(null);
          setRejectNote('');
        }}
        onReject={handleRejectPayout}
        onApprove={handleApprovePayout}
      />
    </AdminLayout>
  );
};

export default AdminFinancials;
