/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface FilterState {
  priceRanges: string[];
  sizes: string[];
  colors: string[];
  genders: string[];
  fits: string[];
  materials: string[];
  sortBy: string;
}

interface FilterContextType {
  filters: FilterState;
  updatePriceRange: (range: string, checked: boolean) => void;
  updateSize: (size: string, checked: boolean) => void;
  updateColor: (color: string, checked: boolean) => void;
  updateGender: (gender: string, checked: boolean) => void;
  updateFit: (fit: string, checked: boolean) => void;
  updateMaterial: (material: string, checked: boolean) => void;
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
    genders: [],
    fits: [],
    materials: [],
    sortBy: 'newest',
  });

  const normalizeList = (values: string[]) => Array.from(new Set(values)).sort();

  const isSameFilterState = (a: FilterState, b: FilterState) => {
    const samePrices = a.priceRanges.length === b.priceRanges.length && a.priceRanges.every((v, idx) => v === b.priceRanges[idx]);
    const sameSizes = a.sizes.length === b.sizes.length && a.sizes.every((v, idx) => v === b.sizes[idx]);
    const sameColors = a.colors.length === b.colors.length && a.colors.every((v, idx) => v === b.colors[idx]);
    const sameGenders = a.genders.length === b.genders.length && a.genders.every((v, idx) => v === b.genders[idx]);
    const sameFits = a.fits.length === b.fits.length && a.fits.every((v, idx) => v === b.fits[idx]);
    const sameMaterials = a.materials.length === b.materials.length && a.materials.every((v, idx) => v === b.materials[idx]);
    return (
      samePrices
      && sameSizes
      && sameColors
      && sameGenders
      && sameFits
      && sameMaterials
      && a.sortBy === b.sortBy
    );
  };

  const setFiltersState = useCallback((next: FilterState) => {
    setFilters(prev => {
      const normalized: FilterState = {
        priceRanges: normalizeList(next.priceRanges),
        sizes: normalizeList(next.sizes),
        colors: normalizeList(next.colors),
        genders: normalizeList(next.genders),
        fits: normalizeList(next.fits),
        materials: normalizeList(next.materials),
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

  const updateGender = (gender: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      genders: checked
        ? [...prev.genders, gender]
        : prev.genders.filter(g => g !== gender),
    }));
  };

  const updateFit = (fit: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      fits: checked
        ? [...prev.fits, fit]
        : prev.fits.filter(item => item !== fit),
    }));
  };

  const updateMaterial = (material: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      materials: checked
        ? [...prev.materials, material]
        : prev.materials.filter(item => item !== material),
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
      genders: [],
      fits: [],
      materials: [],
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
        updateGender,
        updateFit,
        updateMaterial,
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
