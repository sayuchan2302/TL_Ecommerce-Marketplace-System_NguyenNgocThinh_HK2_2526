import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';

type PaginationEntry = number | 'ellipsis';

const getVisiblePageEntries = (page: number, totalPages: number): PaginationEntry[] => {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);

  if (safeTotalPages <= 7) {
    return Array.from({ length: safeTotalPages }, (_, index) => index + 1);
  }

  const pages: PaginationEntry[] = [1];
  let start = Math.max(2, safePage - 1);
  let end = Math.min(safeTotalPages - 1, safePage + 1);

  if (safePage <= 3) {
    start = 2;
    end = 4;
  } else if (safePage >= safeTotalPages - 2) {
    start = safeTotalPages - 3;
    end = safeTotalPages - 1;
  }

  if (start > 2) {
    pages.push('ellipsis');
  }

  for (let pageNum = start; pageNum <= end; pageNum++) {
    pages.push(pageNum);
  }

  if (end < safeTotalPages - 1) {
    pages.push('ellipsis');
  }

  pages.push(safeTotalPages);
  return pages;
};

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
}: PanelTableFooterProps) => {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const visiblePages = getVisiblePageEntries(safePage, safeTotalPages);

  return (
    <div className="table-footer">
      <span className="table-footer-meta">{meta}</span>
      <nav className="pagination" aria-label="Phân trang">
        <button
          type="button"
          className="page-btn"
          onClick={() => onPageChange(Math.max(safePage - 1, 1))}
          disabled={safePage === 1}
        >
          {prevLabel}
        </button>
        {visiblePages.map((entry, index) =>
          entry === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="page-ellipsis" aria-hidden="true">...</span>
          ) : (
            <button
              type="button"
              key={entry}
              className={`page-btn ${safePage === entry ? `active ${activePageClassName}`.trim() : ''}`}
              onClick={() => onPageChange(entry)}
              aria-current={safePage === entry ? 'page' : undefined}
              aria-label={`Trang ${entry}`}
            >
              {entry}
            </button>
          )
        )}
        <button
          type="button"
          className="page-btn"
          onClick={() => onPageChange(Math.min(safePage + 1, safeTotalPages))}
          disabled={safePage === safeTotalPages}
        >
          {nextLabel}
        </button>
      </nav>
    </div>
  );
};

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
  description?: ReactNode;
  className?: string;
}

export const PanelDrawerSection = ({ title, children, description, className = '' }: PanelDrawerSectionProps) => (
  <section className={['drawer-section', className].filter(Boolean).join(' ')}>
    <div className="drawer-section-head">
      <h4>{title}</h4>
      {description ? <p className="drawer-section-description">{description}</p> : null}
    </div>
    {children}
  </section>
);

interface PanelDrawerHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  titleId?: string;
  actions?: ReactNode;
}

export const PanelDrawerHeader = ({
  eyebrow,
  title,
  subtitle,
  onClose,
  closeLabel = 'Đóng',
  titleId,
  actions,
}: PanelDrawerHeaderProps) => (
  <div className="drawer-header">
    <div className="drawer-header-copy">
      {eyebrow ? <p className="drawer-eyebrow">{eyebrow}</p> : null}
      <h3 id={titleId}>{title}</h3>
      {subtitle ? <p className="drawer-subtitle">{subtitle}</p> : null}
    </div>
    <div className="drawer-header-actions">
      {actions}
      <button className="admin-icon-btn" onClick={onClose} aria-label={closeLabel}>
        <X size={16} />
      </button>
    </div>
  </div>
);

interface PanelDrawerFooterProps {
  children: ReactNode;
  align?: 'end' | 'between';
}

export const PanelDrawerFooter = ({ children, align = 'end' }: PanelDrawerFooterProps) => (
  <div className={`drawer-footer ${align === 'between' ? 'between' : ''}`.trim()}>{children}</div>
);

