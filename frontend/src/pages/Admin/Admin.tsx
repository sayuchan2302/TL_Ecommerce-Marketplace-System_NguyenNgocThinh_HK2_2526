import './Admin.css';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ChevronRight,
  DollarSign,
  FolderTree,
  Package,
  ShieldAlert,
  Sparkles,
  Store,
  TicketPercent,
  TrendingUp,
  Users,
  WalletCards,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AdminLayout from './AdminLayout';
import { AdminStateBlock } from './AdminStateBlocks';
import {
  adminDashboardService,
  type AdminDashboardTopCategory,
} from '../../services/adminDashboardService';
import { getOptimizedImageUrl } from '../../utils/getOptimizedImageUrl';

const formatCurrency = (value: number) => `${(value || 0).toLocaleString('vi-VN')} ₫`;

const buildCategoryFallbackImage = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=E2E8F0&color=334155&size=160&font-size=0.45`;

const resolveCategoryImage = (name: string, image?: string | null) => {
  const normalized = (image || '').trim();
  if (!normalized) {
    return buildCategoryFallbackImage(name);
  }
  return getOptimizedImageUrl(normalized, { width: 160, format: 'webp' }) || normalized;
};

type RevenueRange = 'week' | 'month' | 'year';

type RevenueChartPoint = {
  ts: number;
  dateLabel: string;
  fullDate: string;
  gmv: number;
  commission: number;
};

const toSafeDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getWeekStart = (date: Date) => {
  const clone = new Date(date);
  const day = (clone.getDay() + 6) % 7;
  clone.setDate(clone.getDate() - day);
  clone.setHours(0, 0, 0, 0);
  return clone;
};

const ensureRenderableTrendPoints = (points: RevenueChartPoint[], range: RevenueRange): RevenueChartPoint[] => {
  if (points.length !== 1) return points;

  const current = points[0];
  const prevDate = new Date(current.ts);

  if (range === 'year') {
    prevDate.setFullYear(prevDate.getFullYear() - 1);
  } else if (range === 'month') {
    prevDate.setMonth(prevDate.getMonth() - 1);
  } else {
    prevDate.setDate(prevDate.getDate() - 7);
  }

  const prevPoint: RevenueChartPoint = {
    ts: prevDate.getTime(),
    dateLabel:
      range === 'year'
        ? String(prevDate.getFullYear())
        : `${String(prevDate.getMonth() + 1).padStart(2, '0')}/${prevDate.getFullYear()}`,
    fullDate:
      range === 'year'
        ? `Nam ${prevDate.getFullYear()}`
        : `Thang ${String(prevDate.getMonth() + 1).padStart(2, '0')}/${prevDate.getFullYear()}`,
    gmv: 0,
    commission: 0,
  };

  return [prevPoint, current].sort((a, b) => a.ts - b.ts);
};

const buildChartDataByRange = (
  trend: Array<{ date: string; gmv: number; commission: number }>,
  range: RevenueRange
): RevenueChartPoint[] => {
  if (!trend.length) return [];

  const buckets = new Map<string, {
    ts: number;
    gmv: number;
    commission: number;
    dateLabel: string;
    fullDate: string;
  }>();

  if (range === 'week') {
    trend.forEach((point) => {
      const date = toSafeDate(point.date);
      if (!date) return;
      const weekStart = getWeekStart(date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const key = weekStart.toISOString().slice(0, 10);
      const label = weekStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      const rangeLabel = `${weekStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${weekEnd.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
      const existing = buckets.get(key) || {
        ts: weekStart.getTime(),
        gmv: 0,
        commission: 0,
        dateLabel: label,
        fullDate: `Tuần ${rangeLabel}`,
      };
      existing.gmv += Number(point.gmv || 0);
      existing.commission += Number(point.commission || 0);
      buckets.set(key, existing);
    });
  }

  if (range === 'month') {
    trend.forEach((point) => {
      const date = toSafeDate(point.date);
      if (!date) return;
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const label = `${String(month).padStart(2, '0')}/${year}`;
      const existing = buckets.get(key) || {
        ts: new Date(year, month - 1, 1).getTime(),
        gmv: 0,
        commission: 0,
        dateLabel: label,
        fullDate: `Thang ${label}`,
      };
      existing.gmv += Number(point.gmv || 0);
      existing.commission += Number(point.commission || 0);
      buckets.set(key, existing);
    });
  }

  if (range === 'year') {
    trend.forEach((point) => {
      const date = toSafeDate(point.date);
      if (!date) return;
      const year = date.getFullYear();
      const key = String(year);
      const existing = buckets.get(key) || {
        ts: new Date(year, 0, 1).getTime(),
        gmv: 0,
        commission: 0,
        dateLabel: key,
        fullDate: `Nam ${key}`,
      };
      existing.gmv += Number(point.gmv || 0);
      existing.commission += Number(point.commission || 0);
      buckets.set(key, existing);
    });
  }

  const points = Array.from(buckets.values())
    .sort((a, b) => a.ts - b.ts)
    .map((bucket) => ({
      ts: bucket.ts,
      dateLabel: bucket.dateLabel,
      fullDate: bucket.fullDate,
      gmv: bucket.gmv,
      commission: bucket.commission,
    }));

  if (range === 'month' || range === 'year') {
    return ensureRenderableTrendPoints(points, range);
  }

  return points;
};

const Admin = () => {
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof adminDashboardService.get>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revenueRange, setRevenueRange] = useState<RevenueRange>('week');

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await adminDashboardService.get();
      setDashboard(data);
    } catch (error: unknown) {
      const message = error instanceof Error && error.message.trim()
        ? error.message
        : 'Không thể tải dữ liệu dashboard.';
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const chartData = useMemo(
    () => buildChartDataByRange(dashboard?.trend || [], revenueRange),
    [dashboard?.trend, revenueRange]
  );

  const revenueRangeMeta = useMemo(() => {
    if (revenueRange === 'week') {
      return {
        description: 'GMV va hoa hong theo ngay',
        summary: 'Che do tuan',
      };
    }
    if (revenueRange === 'month') {
      return {
        description: 'GMV va hoa hong theo thang',
        summary: 'Che do thang',
      };
    }
    return {
      description: 'GMV va hoa hong theo nam',
      summary: 'Che do nam',
    };
  }, [revenueRange]);

  const stats = useMemo(() => {
    const metrics = dashboard?.metrics;
    return [
      {
        label: 'GMV đã giao thành công',
        value: formatCurrency(Number(metrics?.gmvDelivered || 0)),
        change: 'Live',
        icon: <DollarSign size={18} />,
        to: '/admin/financials',
      },
      {
        label: 'Commission đã ghi nhận',
        value: formatCurrency(Number(metrics?.commissionDelivered || 0)),
        change: 'Live',
        icon: <WalletCards size={18} />,
        to: '/admin/financials',
      },
      {
        label: 'Đơn hàng toàn sàn',
        value: String(metrics?.totalOrders || 0),
        change: 'Live',
        icon: <Package size={18} />,
        to: '/admin/orders',
      },
      {
        label: 'Tổng gian hàng',
        value: String(metrics?.totalStores || 0),
        change: 'Live',
        icon: <Store size={18} />,
        to: '/admin/stores',
      },
      {
        label: 'Tổng khách hàng',
        value: String(metrics?.totalCustomers || 0),
        change: 'Live',
        icon: <Users size={18} />,
        to: '/admin/users',
      },
      {
        label: 'Chiến dịch đang chạy',
        value: String(metrics?.runningCampaigns || 0),
        change: 'Live',
        icon: <TicketPercent size={18} />,
        to: '/admin/promotions',
      },
    ];
  }, [dashboard?.metrics]);

  const governanceFeed = useMemo(() => {
    const quick = dashboard?.quickViews;
    return [
      {
        id: 'gov-1',
        tone: (quick?.parentOrdersNeedAttention || 0) > 0 ? 'danger' : 'info',
        text: `${quick?.parentOrdersNeedAttention || 0} đơn hàng cha cần theo dõi SLA`,
        cta: 'Mở đơn hàng cha',
        to: '/admin/orders',
        icon: <ShieldAlert size={16} />,
      },
      {
        id: 'gov-2',
        tone: (quick?.pendingStoreApprovals || 0) > 0 ? 'warning' : 'info',
        text: `${quick?.pendingStoreApprovals || 0} gian hàng mới đang chờ duyệt`,
        cta: 'Duyệt gian hàng',
        to: '/admin/stores',
        icon: <Store size={16} />,
      },
      {
        id: 'gov-3',
        tone: (quick?.pendingReturns || 0) > 0 ? 'warning' : 'info',
        text: `${quick?.pendingReturns || 0} yêu cầu đổi trả cần điều phối`,
        cta: 'Xem đổi trả',
        to: '/admin/returns',
        icon: <WalletCards size={16} />,
      },
    ];
  }, [dashboard?.quickViews]);

  const topCategories: AdminDashboardTopCategory[] = dashboard?.topCategories || [];
  const topSignalBase = Math.max(...topCategories.map((item) => item.productCount), 1);

  type DashboardTooltipEntry = {
    name: string;
    value: number;
    color: string;
    payload: {
      fullDate: string;
    };
  };

  const DashboardTrendTooltip = ({ active, payload }: { active?: boolean; payload?: DashboardTooltipEntry[] }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="admin-chart-tooltip">
        <div className="admin-chart-tooltip-date">{payload[0].payload.fullDate}</div>
        {payload.map((entry) => (
          <div key={entry.name} className="admin-chart-tooltip-row">
            <span className="admin-chart-tooltip-dot" style={{ backgroundColor: entry.color }} />
            <span className="admin-chart-tooltip-label">{entry.name}</span>
            <span className="admin-chart-tooltip-value">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading && !dashboard) {
    return (
      <AdminLayout title="Dashboard">
        <div className="admin-loading" style={{ padding: '3rem', textAlign: 'center' }}>
          Đang tải dashboard quản trị...
        </div>
      </AdminLayout>
    );
  }

  if (loadError && !dashboard) {
    return (
      <AdminLayout title="Dashboard">
        <AdminStateBlock
          type="error"
          title="Không thể tải dashboard"
          description={loadError}
          actionLabel="Thử lại"
          onAction={loadDashboard}
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <section className="admin-stats grid-6">
        {stats.map((item) => (
          <motion.div
            className="admin-stat-card compact"
            key={item.label}
            whileHover={{ y: -2 }}
          >
            <div className="admin-stat-header">
              <div className="admin-stat-icon">{item.icon}</div>
              <div className="admin-stat-change up">
                <ArrowUpRight size={14} />
                <span>{item.change}</span>
              </div>
            </div>
            <p className="admin-stat-label">{item.label}</p>
            <Link to={item.to} className="admin-stat-link" title={`Xem ${item.label}`}>
              <span className="admin-stat-value">{item.value}</span>
              <ChevronRight size={14} />
            </Link>
          </motion.div>
        ))}
      </section>

      <motion.section className="admin-panel">
        <div className="admin-panel-head">
          <h2>Biểu đồ doanh thu</h2>
          <div className="admin-chart-range-controls" role="tablist" aria-label="Revenue range">
            <button
              type="button"
              role="tab"
              aria-selected={revenueRange === 'week'}
              className={`admin-chart-range-btn ${revenueRange === 'week' ? 'active' : ''}`}
              onClick={() => setRevenueRange('week')}
            >
              Tuần
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={revenueRange === 'month'}
              className={`admin-chart-range-btn ${revenueRange === 'month' ? 'active' : ''}`}
              onClick={() => setRevenueRange('month')}
            >
              Tháng
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={revenueRange === 'year'}
              className={`admin-chart-range-btn ${revenueRange === 'year' ? 'active' : ''}`}
              onClick={() => setRevenueRange('year')}
            >
              Năm
            </button>
          </div>
        </div>
        <span className="admin-muted">{revenueRangeMeta.description}</span>
        <div className="area-chart-wrap">
          {chartData.length === 0 ? (
            <div className="admin-chart-empty">
              <TrendingUp size={36} className="admin-chart-empty-icon" />
              <p>Chưa có dữ liệu doanh thu</p>
              <span className="admin-muted">Dữ liệu sẽ hiển thị khi hệ thống ghi nhận đơn hàng.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminGmvGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="adminCommissionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
                  tickFormatter={(value: number) => `${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip content={<DashboardTrendTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  formatter={(value: string) => <span className="admin-chart-legend-label">{value}</span>}
                />
                <Area
                  type="monotone"
                  dataKey="gmv"
                  name="GMV"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#adminGmvGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="commission"
                  name="Hoa hồng"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#adminCommissionGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div className="chart-axes chart-axes-bottom">
            <span>{revenueRangeMeta.summary}</span>
            <span>{chartData.length} mốc thời gian</span>
          </div>
        </div>
      </motion.section>

      <div className="admin-action-bar">
        <motion.section className="admin-panel">
          <div className="admin-panel-head">
            <h2>Hành động của quản trị viên</h2>
          </div>
          <div className="action-bar-tiles">
            <Link to="/admin/stores" className="action-bar-tile"><Zap size={20} /> Duyệt vendor</Link>
            <Link to="/admin/promotions" className="action-bar-tile"><TicketPercent size={20} /> Tạo mega sale</Link>
            <Link to="/admin/categories" className="action-bar-tile"><FolderTree size={20} /> Quản lý danh mục</Link>
            <Link to="/admin/bot-ai" className="action-bar-tile"><Sparkles size={20} /> Bot, FAQ và AI</Link>
          </div>
        </motion.section>

        <motion.section className="admin-panel">
          <div className="admin-panel-head">
            <h2>Nguồn cấp dữ liệu quản trị</h2>
          </div>
          <div className="action-bar-feed">
            {governanceFeed.map((item) => (
              <Link key={item.id} to={item.to} className={`action-bar-feed-item ${item.tone}`}>
                <span className="feed-icon">{item.icon}</span>
                <div className="feed-content">
                  <p>{item.text}</p>
                  <span>{item.cta}</span>
                </div>
                <ChevronRight size={18} />
              </Link>
            ))}
          </div>
        </motion.section>
      </div>

      <motion.section className="admin-panel">
        <div className="admin-panel-head">
          <h2>Danh mục dẫn đầu hệ thống</h2>
          <Link to="/admin/categories">Mở danh mục</Link>
        </div>
        {topCategories.length === 0 ? (
          <AdminStateBlock
            type="empty"
            title="Chưa có dữ liệu danh mục nổi bật"
            description="Khi danh mục có đủ dữ liệu sản phẩm hoạt động, bảng xếp hạng sẽ hiển thị tại đây."
          />
        ) : (
          <div className="top-products">
            {topCategories.map((item, idx) => (
              <motion.div key={item.categoryId} className="top-product" whileHover={{ y: -2 }}>
                <div className="top-rank">Top {idx + 1}</div>
                <img
                  className="top-category-image"
                  src={resolveCategoryImage(item.name, item.image)}
                  alt={item.name}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = buildCategoryFallbackImage(item.name);
                  }}
                />
                <div className="top-product-meta">
                  <p className="admin-bold">{item.name}</p>
                  <p className="admin-muted">{item.signal}</p>
                  <div className="top-product-bar">
                    <span style={{ width: `${Math.round((item.productCount / topSignalBase) * 100)}%` }} />
                  </div>
                  <p className="admin-muted stock-note">{item.productCount} sản phẩm active</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>
    </AdminLayout>
  );
};

export default Admin;
