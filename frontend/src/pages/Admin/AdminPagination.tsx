import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ADMIN_DICTIONARY } from './adminDictionary';

export interface AdminPaginationProps {
  page: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  total: number;
  onPageChange: (page: number) => void;
  onPrev: () => void;
  onNext: () => void;
  selectedNoun?: string;
}

export const AdminPagination = ({
  page,
  totalPages,
  startIndex,
  endIndex,
  total,
  onPageChange,
  onPrev,
  onNext,
  selectedNoun,
}: AdminPaginationProps) => {
  const c = ADMIN_DICTIONARY.common;

  if (total === 0) return null;

  const getVisiblePages = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1);

    if (page > 3) {
      pages.push('ellipsis');
    }

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }

    if (page < totalPages - 2) {
      pages.push('ellipsis');
    }

    if (!pages.includes(totalPages)) {
      pages.push(totalPages);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="table-footer">
      <span className="table-footer-meta">
        {c.showing(startIndex, endIndex, total, selectedNoun || '')}
      </span>
      <nav className="pagination" aria-label="Phân trang">
        <button
          type="button"
          className="page-btn"
          onClick={onPrev}
          disabled={page === 1}
          aria-label={c.previous}
        >
          <ChevronLeft size={16} />
        </button>

        {visiblePages.map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="page-ellipsis" aria-hidden="true">
              ...
            </span>
          ) : (
            <button
              type="button"
              key={p}
              className={`page-btn ${page === p ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
              aria-current={page === p ? 'page' : undefined}
              aria-label={`Trang ${p}`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          className="page-btn"
          onClick={onNext}
          disabled={page === totalPages}
          aria-label={c.next}
        >
          <ChevronRight size={16} />
        </button>
      </nav>
    </div>
  );
};

export default AdminPagination;
