import type { ProfilePageChangeHandler } from './ProfileTabContent.types';

type PageToken = number | 'dots';

const clampPage = (page: number, totalPages: number) => Math.min(Math.max(page, 1), totalPages);

const buildPageTokens = (currentPage: number, totalPages: number): PageToken[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const tokens: PageToken[] = [1];
  const left = Math.max(2, currentPage - 1);
  const right = Math.min(totalPages - 1, currentPage + 1);

  if (left > 2) {
    tokens.push('dots');
  }

  for (let page = left; page <= right; page += 1) {
    tokens.push(page);
  }

  if (right < totalPages - 1) {
    tokens.push('dots');
  }

  tokens.push(totalPages);
  return tokens;
};

interface ProfilePaginationProps {
  page: number;
  totalItems: number;
  totalPages: number;
  itemsPerPage: number;
  itemLabel: string;
  onPageChange: ProfilePageChangeHandler;
}

const ProfilePagination = ({
  page,
  totalItems,
  totalPages,
  itemsPerPage,
  itemLabel,
  onPageChange,
}: ProfilePaginationProps) => {
  if (totalItems <= itemsPerPage || totalPages <= 1) {
    return null;
  }

  const safePage = clampPage(page, totalPages);
  const pageTokens = buildPageTokens(safePage, totalPages);

  return (
    <nav className="profile-pagination" aria-label={`Phân trang ${itemLabel}`}>
      <button
        type="button"
        className={`profile-pagination-btn ${safePage === 1 ? 'disabled' : ''}`}
        onClick={() => onPageChange((current) => clampPage(current - 1, totalPages))}
        disabled={safePage === 1}
      >
        Trước
      </button>

      <div className="profile-pagination-numbers">
        {pageTokens.map((token, index) => token === 'dots' ? (
          <span key={`dots-${index}`} className="profile-page-dots" aria-hidden="true">
            ...
          </span>
        ) : (
          <button
            key={token}
            type="button"
            className={`profile-page-number ${safePage === token ? 'active' : ''}`}
            onClick={() => onPageChange(token)}
            aria-label={`Trang ${token}`}
            aria-current={safePage === token ? 'page' : undefined}
          >
            {token}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={`profile-pagination-btn ${safePage === totalPages ? 'disabled' : ''}`}
        onClick={() => onPageChange((current) => clampPage(current + 1, totalPages))}
        disabled={safePage === totalPages}
      >
        Sau
      </button>
    </nav>
  );
};

export default ProfilePagination;
