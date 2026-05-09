import { useEffect } from 'react';

const BRAND_NAME = 'Phố Mặc';
const DEFAULT_PAGE_TITLE = 'Trang chủ';

const normalizeTitle = (title: string) => title.replace(/\s+/g, ' ').trim();

export const formatPageTitle = (title?: string | null) => {
  const normalizedTitle = normalizeTitle(title || '');
  return `${normalizedTitle || DEFAULT_PAGE_TITLE} | ${BRAND_NAME}`;
};

export const usePageTitle = (title?: string | null) => {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.title = formatPageTitle(title);
  }, [title]);
};
