import { useMemo, useState } from 'react';
import { useAdminPagination } from './useAdminPagination';

type SortDirection = 'asc' | 'desc';

interface UseAdminListStateOptions<T> {
  items: T[];
  pageSize?: number;
  initialSearch?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  getSearchText: (item: T) => string;
  filterPredicate?: (item: T) => boolean;
  sorters?: Record<string, (a: T, b: T) => number>;
  initialSortKey?: string | null;
  initialSortDirection?: SortDirection;
  sortKeyValue?: string | null;
  sortDirectionValue?: SortDirection;
  onSortChange?: (nextSortKey: string | null, nextDirection: SortDirection) => void;
  pageValue?: number;
  onPageChange?: (nextPage: number) => void;
  loadingDelayMs?: number;
  loadingDeps?: readonly unknown[];
}

export const useAdminListState = <T,>({
  items,
  pageSize = 10,
  initialSearch = '',
  searchValue,
  onSearchChange,
  getSearchText,
  filterPredicate,
  sorters,
  initialSortKey = null,
  initialSortDirection = 'asc',
  sortKeyValue,
  sortDirectionValue,
  onSortChange,
  pageValue,
  onPageChange,
}: UseAdminListStateOptions<T>) => {
  const [internalSearch, setInternalSearch] = useState(initialSearch);
  const [internalSortKey, setInternalSortKey] = useState<string | null>(initialSortKey);
  const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>(initialSortDirection);
  const isSearchControlled = typeof searchValue === 'string';
  const isSortControlled = typeof sortKeyValue !== 'undefined' || typeof sortDirectionValue !== 'undefined';

  const search = isSearchControlled ? (searchValue || '') : internalSearch;
  const sortKey = typeof sortKeyValue !== 'undefined' ? sortKeyValue : internalSortKey;
  const sortDirection = sortDirectionValue || internalSortDirection;

  const setSearch = (value: string) => {
    if (isSearchControlled) {
      onSearchChange?.(value);
      return;
    }
    setInternalSearch(value);
  };

  const applySortState = (nextSortKey: string | null, nextDirection: SortDirection) => {
    if (isSortControlled) {
      onSortChange?.(nextSortKey, nextDirection);
      return;
    }
    setInternalSortKey(nextSortKey);
    setInternalSortDirection(nextDirection);
  };

  const setSortKey = (nextSortKey: string | null) => {
    applySortState(nextSortKey, sortDirection);
  };

  const setSortDirection = (nextDirection: SortDirection) => {
    applySortState(sortKey, nextDirection);
  };

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    let next = items.filter((item) => {
      if (filterPredicate && !filterPredicate(item)) return false;
      if (!keyword) return true;
      return getSearchText(item).toLowerCase().includes(keyword);
    });

    if (sortKey && sorters && sorters[sortKey]) {
      const sorter = sorters[sortKey];
      next = [...next].sort((a, b) => {
        const result = sorter(a, b);
        return sortDirection === 'asc' ? result : -result;
      });
    }

    return next;
  }, [items, filterPredicate, getSearchText, search, sortKey, sorters, sortDirection]);

  const pagination = useAdminPagination(filteredItems, pageSize, {
    pageValue,
    onPageChange,
  });

  const toggleSort = (key: string) => {
    if (!sorters || !sorters[key]) return;
    if (sortKey !== key) {
      applySortState(key, 'asc');
      return;
    }
    applySortState(key, sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const clearFilters = () => {
    setSearch('');
    applySortState(initialSortKey, initialSortDirection);
  };

  return {
    search,
    setSearch,
    sortKey,
    sortDirection,
    setSortKey,
    setSortDirection,
    toggleSort,
    isLoading: false,
    filteredItems,
    ...pagination,
    clearFilters,
  };
};
