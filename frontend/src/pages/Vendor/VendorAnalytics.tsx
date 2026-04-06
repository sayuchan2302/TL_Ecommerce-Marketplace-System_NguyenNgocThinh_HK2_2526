import './Vendor.css';
import { useEffect, useMemo, useState } from 'react';
import { Calendar, Download, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, DollarSign, Percent, ShoppingCart, Package } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import VendorLayout from './VendorLayout';
import { formatCurrency } from '../../services/commissionService';
import { vendorPortalService } from '../../services/vendorPortalService';
import { useToast } from '../../contexts/ToastContext';
import { getUiErrorMessage } from '../../utils/errorMessage';
import { AdminStateBlock } from '../Admin/AdminStateBlocks';

type Period = 'today' | 'week' | 'month';

interface AnalyticsData {
  periods: Record<
    Period,
    {
      revenue: number;
      payout: number;
      commission: number;
      orders: number;
      avgOrderValue: number;
      conversionRate: number;
      previousRevenue: number;
      previousPayout: number;
      previousCommission: number;
      previousOrders: number;
    }
  >;
  dailyData: Array<{ date: string; revenue: number; payout: number; commission: number; orders: number }>;
  topProducts: Array<{ id: string; name: string; sales: number; revenue: number; img: string }>;
  commissionRate: number;
}

const emptyAnalytics: AnalyticsData = {
  periods: {
    today: { revenue: 0, payout: 0, commission: 0, orders: 0, avgOrderValue: 0, conversionRate: 0, previousRevenue: 1, previousPayout: 1, previousCommission: 1, previousOrders: 1 },
    week: { revenue: 0, payout: 0, commission: 0, orders: 0, avgOrderValue: 0, conversionRate: 0, previousRevenue: 1, previousPayout: 1, previousCommission: 1, previousOrders: 1 },
    month: { revenue: 0, payout: 0, commission: 0, orders: 0, avgOrderValue: 0, conversionRate: 0, previousRevenue: 1, previousPayout: 1, previousCommission: 1, previousOrders: 1 },
  },
  dailyData: [],
  topProducts: [],
  commissionRate: 5,
};

const periodLabels: Record<Period, string> = {
  today: 'Hôm nay',
  week: '7 ngày',
  month: '30 ngày',
};

const VendorAnalytics = () => {
  const { addToast } = useToast();
  const [activePeriod, setActivePeriod] = useState<Period>('week');
  const [analytics, setAnalytics] = useState<AnalyticsData>(emptyAnalytics);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        setLoadError('');
        const next = await vendorPortalService.getAnalytics({ commissionRate: analytics.commissionRate });
        if (!active) return;
        setAnalytics(next);
      } catch (err: unknown) {
        if (!active) return;
        const message = getUiErrorMessage(err, 'Không tải được thống kê của shop');
        setLoadError(message);
        setAnalytics(emptyAnalytics);
        addToast(message, 'error');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [activePeriod, addToast, reloadKey]);

  const periodData = analytics.periods[activePeriod];
  const commission = { commission: periodData.commission, payout: periodData.payout };
  const prevCommission = { commission: periodData.previousCommission, payout: periodData.previousPayout };
  const revenueChange = periodData.previousRevenue > 0
    ? ((periodData.revenue - periodData.previousRevenue) / periodData.previousRevenue) * 100
    : 0;
  const ordersChange = periodData.previousOrders > 0
    ? ((periodData.orders - periodData.previousOrders) / periodData.previousOrders) * 100
    : 0;
  const payoutChange = prevCommission.payout > 0
    ? ((commission.payout - prevCommission.payout) / prevCommission.payout) * 100
    : 0;
  const commissionChange = prevCommission.commission > 0
    ? ((commission.commission - prevCommission.commission) / prevCommission.commission) * 100
    : 0;

  const chartData = useMemo(() =>
    analytics.dailyData.map((d) => ({
      date: d.date,
      dateLabel: new Date(d.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      revenue: d.revenue,
      payout: d.payout,
      commission: d.commission,
      orders: d.orders,
    })),
    [analytics.dailyData]
  );

  const topRevenue = Math.max(...analytics.topProducts.map((item) => item.revenue), 1);

  const TrendIndicator = ({ value, label }: { value: number; label: string }) => {
    const isPositive = value >= 0;
    return (
      <div className={`trend-indicator ${isPositive ? 'positive' : 'negative'}`}>
        {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        <span>{Math.abs(value).toFixed(1)}% {label}</span>
      </div>
    );
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }> }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="analytics-tooltip">
        <div className="analytics-tooltip-date">{payload[0].payload.dateLabel}</div>
        {payload.map((entry) => (
          <div key={entry.name} className="analytics-tooltip-row">
            <span className="analytics-tooltip-dot" style={{ backgroundColor: entry.color }} />
            <span className="analytics-tooltip-label">{entry.name}:</span>
            <span className="analytics-tooltip-value">{formatCurrency(entry.value)}</span>
          </div>
        ))}
        <div className="analytics-tooltip-row">
          <span className="analytics-tooltip-dot" style={{ backgroundColor: '#94a3b8' }} />
          <span className="analytics-tooltip-label">Đơn hàng:</span>
          <span className="analytics-tooltip-value">{payload[0].payload.orders}</span>
        </div>
      </div>
    );
  };

  return (
    <VendorLayout
      title="Doanh thu & Hiệu suất"
      breadcrumbs={['Kênh Người Bán', 'Dashboard']}
      actions={(
        <>
          <div className="segmented-control">
            {(['today', 'week', 'month'] as Period[]).map((period) => (
              <button
                key={period}
                className={`segmented-btn ${activePeriod === period ? 'active' : ''}`}
                onClick={() => setActivePeriod(period)}
              >
                {periodLabels[period]}
              </button>
            ))}
          </div>
          <button className="admin-ghost-btn">
            <Download size={16} />
            Xuất báo cáo
          </button>
        </>
      )}
    >
      {loading ? (
        <div className="analytics-skeleton-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="analytics-skeleton-card">
              <div className="analytics-skeleton-line analytics-skeleton-label" />
              <div className="analytics-skeleton-line analytics-skeleton-value" />
              <div className="analytics-skeleton-line analytics-skeleton-sub" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <AdminStateBlock
          type="error"
          title="Không tải được thống kê"
          description={loadError}
          actionLabel="Thử lại"
          onAction={() => setReloadKey((key) => key + 1)}
        />
      ) : (
        <>
          {/* ─── Stat Cards ─────────────────────────────────────────────── */}
          <div className="admin-stats grid-4">
            <div className="admin-stat-card">
              <div className="admin-stat-label">Doanh thu gộp</div>
              <div className="admin-stat-value">{formatCurrency(periodData.revenue)}</div>
              <div className="admin-stat-sub">
                <TrendIndicator value={revenueChange} label="so với kỳ trước" />
              </div>
            </div>

            <div className="admin-stat-card warning">
              <div className="admin-stat-label">Phí hoa hồng</div>
              <div className="admin-stat-value">{formatCurrency(commission.commission)}</div>
              <div className="admin-stat-sub">Tỷ lệ sàn {analytics.commissionRate}%</div>
            </div>

            <div className="admin-stat-card success">
              <div className="admin-stat-label">Thực nhận</div>
              <div className="admin-stat-value">{formatCurrency(commission.payout)}</div>
              <div className="admin-stat-sub">
                <TrendIndicator value={payoutChange} label="so với kỳ trước" />
              </div>
            </div>

            <div className="admin-stat-card info">
              <div className="admin-stat-label">Đơn hàng</div>
              <div className="admin-stat-value">{periodData.orders}</div>
              <div className="admin-stat-sub">
                <TrendIndicator value={ordersChange} label="so với kỳ trước" />
              </div>
            </div>
          </div>

          {/* ─── Main Row: Chart + Financial Summary ────────────────────── */}
          <div className="analytics-main-row">
            <div className="analytics-chart-section">
              <div className="analytics-panel">
                <div className="analytics-panel-head">
                  <h2>Biểu đồ doanh thu</h2>
                  <span className="analytics-muted">{periodLabels[activePeriod]}</span>
                </div>
                {chartData.length === 0 ? (
                  <div className="analytics-empty-chart">
                    <TrendingUp size={40} className="analytics-empty-icon" />
                    <p>Chưa có dữ liệu doanh thu</p>
                    <span className="analytics-muted">Dữ liệu sẽ xuất hiện khi có đơn hàng</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="payoutGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="dateLabel"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        tickFormatter={(v: number) => `${(v / 1000000).toFixed(1)}M`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        formatter={(value: string) => (
                          <span style={{ fontSize: 13, color: '#64748b' }}>{value}</span>
                        )}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Doanh thu gộp"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#revenueGradient)"
                      />
                      <Area
                        type="monotone"
                        dataKey="payout"
                        name="Thực nhận"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#payoutGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="analytics-summary-section">
              <div className="analytics-panel financial-summary">
                <div className="analytics-panel-head">
                  <h2>Tổng kết tài chính</h2>
                </div>
                <div className="financial-summary-content">
                  <div className="financial-summary-row">
                    <span className="financial-label">Doanh thu gộp</span>
                    <span className="financial-value">{formatCurrency(periodData.revenue)}</span>
                  </div>
                  <div className="financial-summary-row deduction">
                    <span className="financial-label">
                      Phí hoa hồng ({analytics.commissionRate}%)
                    </span>
                    <span className="financial-value negative">
                      -{formatCurrency(commission.commission)}
                    </span>
                  </div>
                  <div className="financial-divider" />
                  <div className="financial-summary-row total">
                    <span className="financial-label">Thực nhận</span>
                    <span className="financial-value primary">
                      {formatCurrency(commission.payout)}
                    </span>
                  </div>
                  <div className="financial-metrics">
                    <div className="financial-metric">
                      <span className="financial-metric-label">Giá trị TB/đơn</span>
                      <span className="financial-metric-value">{formatCurrency(periodData.avgOrderValue)}</span>
                    </div>
                    <div className="financial-metric">
                      <span className="financial-metric-label">Tỷ lệ chuyển đổi</span>
                      <span className="financial-metric-value">{periodData.conversionRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Bottom Row: Top Products ───────────────────────────────── */}
          <div className="analytics-bottom-row">
            <div className="analytics-panel">
              <div className="analytics-panel-head">
                <h2>Sản phẩm bán chạy</h2>
                <span className="analytics-muted">
                  {analytics.topProducts.length > 0 ? `${analytics.topProducts.length} sản phẩm` : 'Chưa có dữ liệu'}
                </span>
              </div>
              {analytics.topProducts.length === 0 ? (
                <div className="analytics-empty-products">
                  <Package size={32} className="analytics-empty-icon" />
                  <p>Chưa có sản phẩm nổi bật</p>
                  <span className="analytics-muted">Top sản phẩm sẽ xuất hiện khi có doanh thu</span>
                </div>
              ) : (
                <div className="top-products-grid">
                  {analytics.topProducts.map((product, index) => {
                    const payout = product.revenue * (1 - analytics.commissionRate / 100);
                    const pct = (product.revenue / topRevenue) * 100;
                    return (
                      <div key={product.id} className="top-product-card">
                        <div className="top-product-rank">#{index + 1}</div>
                        <div className="top-product-info">
                          <span className="top-product-name">{product.name}</span>
                          <div className="top-product-stats">
                            <span className="top-product-stat">
                              <ShoppingCart size={12} /> {product.sales} đã bán
                            </span>
                            <span className="top-product-stat revenue">
                              {formatCurrency(product.revenue)}
                            </span>
                          </div>
                          <div className="top-product-bar">
                            <div className="top-product-bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className="top-product-payout">
                          <span className="top-product-payout-label">Thực nhận</span>
                          <span className="top-product-payout-value">{formatCurrency(payout)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </VendorLayout>
  );
};

export default VendorAnalytics;
