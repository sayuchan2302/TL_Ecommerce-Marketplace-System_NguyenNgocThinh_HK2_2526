import { AlertCircle, LoaderCircle, RotateCcw, TrendingUp } from 'lucide-react';
import { memo, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../../../../services/commissionService';
import type {
  VendorAnalyticsData,
  VendorAnalyticsPeriod,
} from '../../../../services/vendorPortalService';
import {
  buildVendorAnalyticsChartData,
  getVendorAnalyticsChartMeta,
  vendorAnalyticsPeriodLabels,
} from '../../vendorAnalyticsShared';

type AnalyticsTooltipEntry = {
  name: string;
  value: number;
  color: string;
  payload: {
    fullDate: string;
    orders: number;
  };
};

interface VendorAnalyticsSectionProps {
  activePeriod: VendorAnalyticsPeriod;
  analytics: VendorAnalyticsData;
  loading: boolean;
  error: string;
  onPeriodChange: (period: VendorAnalyticsPeriod) => void;
  onRetry: () => void;
}

const VENDOR_CHART_COLORS = {
  revenue: '#16a34a',
  payout: '#f97316',
  neutral: '#94a3b8',
};

const VENDOR_CHART_ANIMATION = {
  duration: 520,
  easing: 'ease-out' as const,
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: AnalyticsTooltipEntry[] }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="analytics-tooltip">
      <div className="analytics-tooltip-date">{payload[0].payload.fullDate}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="analytics-tooltip-row">
          <span className="analytics-tooltip-dot" style={{ backgroundColor: entry.color }} />
          <span className="analytics-tooltip-label">{entry.name}:</span>
          <span className="analytics-tooltip-value">{formatCurrency(entry.value)}</span>
        </div>
      ))}
      <div className="analytics-tooltip-row">
        <span className="analytics-tooltip-dot" style={{ backgroundColor: VENDOR_CHART_COLORS.neutral }} />
        <span className="analytics-tooltip-label">Đơn hàng:</span>
        <span className="analytics-tooltip-value">{payload[0].payload.orders}</span>
      </div>
    </div>
  );
};

const VendorAnalyticsSection = ({
  activePeriod,
  analytics,
  loading,
  error,
  onPeriodChange,
  onRetry,
}: VendorAnalyticsSectionProps) => {
  const chartData = useMemo(
    () => buildVendorAnalyticsChartData(analytics.dailyData, activePeriod),
    [analytics.dailyData, activePeriod],
  );
  const chartMeta = useMemo(
    () => getVendorAnalyticsChartMeta(activePeriod),
    [activePeriod],
  );

  return (
    <div className="analytics-panel vendor-dashboard-analytics-panel">
      <div className="analytics-panel-head analytics-panel-head-wrap">
        <div>
          <h2>Biểu đồ doanh thu</h2>
          <span className="analytics-muted">{chartMeta.description}</span>
        </div>
        <div className="admin-chart-range-controls vendor-chart-range-controls" role="tablist" aria-label="Khoảng thời gian thống kê">
          {(['week', 'month', 'year'] as VendorAnalyticsPeriod[]).map((period) => (
            <button
              key={period}
              type="button"
              role="tab"
              className={`admin-chart-range-btn vendor-chart-range-btn ${activePeriod === period ? 'active' : ''}`}
              aria-selected={activePeriod === period}
              onClick={() => onPeriodChange(period)}
            >
              {vendorAnalyticsPeriodLabels[period]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="analytics-state-block">
          <LoaderCircle size={28} className="analytics-empty-icon analytics-spin" />
          <p>Đang tải biểu đồ doanh thu</p>
          <span className="analytics-muted">Dữ liệu đối soát đang được đồng bộ cho dashboard.</span>
        </div>
      ) : error ? (
        <div className="analytics-state-block">
          <AlertCircle size={28} className="analytics-empty-icon" />
          <p>Không tải được biểu đồ doanh thu</p>
          <span className="analytics-muted">{error}</span>
          <button type="button" className="vendor-primary-btn analytics-inline-btn" onClick={onRetry}>
            <RotateCcw size={14} />
            Thử lại
          </button>
        </div>
      ) : chartData.length === 0 ? (
        <div className="analytics-empty-chart">
          <TrendingUp size={40} className="analytics-empty-icon" />
          <p>Chưa có dữ liệu doanh thu</p>
          <span className="analytics-muted">{chartMeta.emptyLabel}</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="vendorRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={VENDOR_CHART_COLORS.revenue} stopOpacity={0.3} />
                <stop offset="95%" stopColor={VENDOR_CHART_COLORS.revenue} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="vendorPayoutGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={VENDOR_CHART_COLORS.payout} stopOpacity={0.3} />
                <stop offset="95%" stopColor={VENDOR_CHART_COLORS.payout} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="dateLabel"
              axisLine={false}
              tickLine={false}
              minTickGap={24}
              tickMargin={8}
              tick={{ fontSize: 12, fill: '#94a3b8' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              tickFormatter={(value: number) => `${(value / 1000000).toFixed(1)}M`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              formatter={(value: string) => (
                <span className="analytics-legend-label">{value}</span>
              )}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Doanh thu gộp"
              stroke={VENDOR_CHART_COLORS.revenue}
              strokeWidth={2}
              fill="url(#vendorRevenueGradient)"
              animationDuration={VENDOR_CHART_ANIMATION.duration}
              animationEasing={VENDOR_CHART_ANIMATION.easing}
              isAnimationActive
            />
            <Area
              type="monotone"
              dataKey="payout"
              name="Thực nhận"
              stroke={VENDOR_CHART_COLORS.payout}
              strokeWidth={2}
              fill="url(#vendorPayoutGradient)"
              animationBegin={80}
              animationDuration={VENDOR_CHART_ANIMATION.duration}
              animationEasing={VENDOR_CHART_ANIMATION.easing}
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default memo(VendorAnalyticsSection);
