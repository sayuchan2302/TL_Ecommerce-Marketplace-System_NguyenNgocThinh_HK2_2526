/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface FilterState {
  priceRanges: string[];
  sizes: string[];
  colors: string[];
  sortBy: string;
}

interface FilterContextType {
  filters: FilterState;
  updatePriceRange: (range: string, checked: boolean) => void;
  updateSize: (size: string, checked: boolean) => void;
  updateColor: (color: string, checked: boolean) => void;
  updateSortBy: (sort: string) => void;
  resetFilters: () => void;
  setFiltersState: (next: FilterState) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const [filters, setFilters] = useState<FilterState>({
    priceRanges: [],
    sizes: [],
    colors: [],
    sortBy: 'newest',
  });

  const normalizeList = (values: string[]) => Array.from(new Set(values)).sort();

  const isSameFilterState = (a: FilterState, b: FilterState) => {
    const samePrices = a.priceRanges.length === b.priceRanges.length && a.priceRanges.every((v, idx) => v === b.priceRanges[idx]);
    const sameSizes = a.sizes.length === b.sizes.length && a.sizes.every((v, idx) => v === b.sizes[idx]);
    const sameColors = a.colors.length === b.colors.length && a.colors.every((v, idx) => v === b.colors[idx]);
    return samePrices && sameSizes && sameColors && a.sortBy === b.sortBy;
  };

  const setFiltersState = useCallback((next: FilterState) => {
    setFilters(prev => {
      const normalized: FilterState = {
        priceRanges: normalizeList(next.priceRanges),
        sizes: normalizeList(next.sizes),
        colors: normalizeList(next.colors),
        sortBy: next.sortBy || 'newest',
      };

      if (isSameFilterState(prev, normalized)) return prev;
      return normalized;
    });
  }, []);

  const updatePriceRange = (range: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      priceRanges: checked
        ? [...prev.priceRanges, range]
        : prev.priceRanges.filter(p => p !== range),
    }));
  };

  const updateSize = (size: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      sizes: checked
        ? [...prev.sizes, size]
        : prev.sizes.filter(s => s !== size),
    }));
  };

  const updateColor = (color: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      colors: checked
        ? [...prev.colors, color]
        : prev.colors.filter(c => c !== color),
    }));
  };

  const updateSortBy = (sort: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: sort,
    }));
  };

  const resetFilters = () => {
    setFilters({
      priceRanges: [],
      sizes: [],
      colors: [],
      sortBy: 'newest',
    });
  };

  return (
    <FilterContext.Provider
      value={{
        filters,
        updatePriceRange,
        updateSize,
        updateColor,
        updateSortBy,
        resetFilters,
        setFiltersState,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within FilterProvider');
  }
  return context;
};
