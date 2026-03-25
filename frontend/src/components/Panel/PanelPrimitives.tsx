import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';

export interface PanelStatItem {
  key: string;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: string;
  onClick?: () => void;
}

interface PanelStatsGridProps {
  items: PanelStatItem[];
  columns?: 3 | 4;
  accentClassName?: string;
}

export const PanelStatsGrid = ({ items, columns = 4, accentClassName = '' }: PanelStatsGridProps) => (
  <div className={`admin-stats grid-${columns}`}>
    {items.map((item) => {
      const className = ['admin-stat-card', item.tone, item.onClick ? 'vendor-stat-button' : '', accentClassName]
        .filter(Boolean)
        .join(' ');

      const content = (
        <>
          <div className="admin-stat-label">{item.label}</div>
          <div className="admin-stat-value">{item.value}</div>
          {item.sub ? <div className="admin-stat-sub">{item.sub}</div> : null}
        </>
      );

      if (!item.onClick) {
        return <div key={item.key} className={className}>{content}</div>;
      }

      return (
        <button key={item.key} type="button" className={className} onClick={item.onClick}>
          {content}
        </button>
      );
    })}
  </div>
);

export interface PanelTabItem {
  key: string;
  label: string;
  count?: ReactNode;
}

interface PanelTabsProps {
  items: PanelTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  accentClassName?: string;
}

export const PanelTabs = ({ items, activeKey, onChange, accentClassName = '' }: PanelTabsProps) => (
  <div className="admin-tabs">
    {items.map((item) => (
      <button
        key={item.key}
        className={`admin-tab ${activeKey === item.key ? `active ${accentClassName}`.trim() : ''}`}
        onClick={() => onChange(item.key)}
      >
        <span>{item.label}</span>
        {item.count !== undefined ? <span className="admin-tab-count">{item.count}</span> : null}
      </button>
    ))}
  </div>
);

interface PanelViewSummaryProps {
  chips: Array<{ key: string; label: ReactNode }>;
  clearLabel: string;
  onClear: () => void;
}

export const PanelViewSummary = ({ chips, clearLabel, onClear }: PanelViewSummaryProps) => {
  if (chips.length === 0) return null;

  return (
    <div className="admin-view-summary">
      {chips.map((chip) => (
        <span key={chip.key} className="summary-chip">{chip.label}</span>
      ))}
      <button className="summary-clear" onClick={onClear}>{clearLabel}</button>
    </div>
  );
};

interface PanelSectionHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

export const PanelSectionHeader = ({ title, description, action }: PanelSectionHeaderProps) => (
  <div className="admin-panel-head">
    <div>
      <h2>{title}</h2>
      {description ? <span className="admin-muted">{description}</span> : null}
    </div>
    {action}
  </div>
);

interface PanelTableFooterProps {
  meta: ReactNode;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  activePageClassName?: string;
  prevLabel?: ReactNode;
  nextLabel?: ReactNode;
}

export const PanelTableFooter = ({
  meta,
  page,
  totalPages,
  onPageChange,
  activePageClassName = '',
  prevLabel = 'Trước',
  nextLabel = 'Tiếp',
}: PanelTableFooterProps) => (
  <div className="table-footer">
    <span className="table-footer-meta">{meta}</span>
    <div className="pagination">
      <button className="page-btn" onClick={() => onPageChange(Math.max(page - 1, 1))} disabled={page === 1}>
        {prevLabel}
      </button>
      {Array.from({ length: totalPages }).map((_, index) => (
        <button
          key={index + 1}
          className={`page-btn ${page === index + 1 ? `active ${activePageClassName}`.trim() : ''}`}
          onClick={() => onPageChange(index + 1)}
        >
          {index + 1}
        </button>
      ))}
      <button
        className="page-btn"
        onClick={() => onPageChange(Math.min(page + 1, totalPages))}
        disabled={page === totalPages}
      >
        {nextLabel}
      </button>
    </div>
  </div>
);

interface PanelFloatingBarProps {
  show: boolean;
  children: ReactNode;
  className?: string;
}

export const PanelFloatingBar = ({ show, children, className = '' }: PanelFloatingBarProps) => (
  <AnimatePresence>
    {show ? (
      <motion.div
        className={['admin-floating-bar', className].filter(Boolean).join(' ')}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 22 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    ) : null}
  </AnimatePresence>
);

interface PanelSearchFieldProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

export const PanelSearchField = ({ placeholder, value, onChange }: PanelSearchFieldProps) => (
  <div className="admin-search">
    <Search size={16} />
    <input placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
  </div>
);

interface PanelDrawerSectionProps {
  title: ReactNode;
  children: ReactNode;
}

export const PanelDrawerSection = ({ title, children }: PanelDrawerSectionProps) => (
  <section className="drawer-section">
    <h4>{title}</h4>
    {children}
  </section>
);

interface PanelDrawerHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  onClose: () => void;
  closeLabel?: string;
}

export const PanelDrawerHeader = ({
  eyebrow,
  title,
  onClose,
  closeLabel = 'Đóng',
}: PanelDrawerHeaderProps) => (
  <div className="drawer-header">
    <div>
      {eyebrow ? <p className="drawer-eyebrow">{eyebrow}</p> : null}
      <h3>{title}</h3>
    </div>
    <button className="admin-icon-btn" onClick={onClose} aria-label={closeLabel}>
      <X size={16} />
    </button>
  </div>
);

interface PanelDrawerFooterProps {
  children: ReactNode;
}

export const PanelDrawerFooter = ({ children }: PanelDrawerFooterProps) => (
  <div className="drawer-footer">{children}</div>
);
