import { useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

type SortDirection = 'asc' | 'desc';
type SortKey = 'newest' | 'bestseller' | 'price-asc' | 'price-desc' | 'discount';
type FilterQueryState = {
  query: string;
  category: string;
  priceRanges: string[];
  sizes: string[];
  colors: string[];
  genders: string[];
  fits: string[];
  materials: string[];
  sortKey: SortKey;
  sortDirection: SortDirection;
};

interface UseClientViewStateOptions {
  defaultSort?: SortKey;
  validSortKeys?: readonly string[];
  defaultCategory?: string;
}

export const useClientViewState = ({
  defaultSort = 'newest',
  validSortKeys,
  defaultCategory = 'all',
}: UseClientViewStateOptions) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const lastCommittedQueryRef = useRef<string | null>(null);

  const validSortSet = useMemo(() => new Set(validSortKeys || []), [validSortKeys]);

  const state = useMemo(() => {
    const query = searchParams.get('q') || '';
    const category = searchParams.get('cat') || defaultCategory;
    const priceRanges = (searchParams.get('price') || '').split(',').filter(Boolean);
    const sizes = (searchParams.get('size') || '').split(',').filter(Boolean);
    const colors = (searchParams.get('color') || '').split(',').filter(Boolean);
    const genders = (searchParams.get('gender') || '').split(',').filter(Boolean);
    const fits = (searchParams.get('fit') || '').split(',').filter(Boolean);
    const materials = (searchParams.get('material') || '').split(',').filter(Boolean);
    const rawSort = (searchParams.get('sort') || defaultSort) as SortKey;
    const sortKey = validSortSet.size === 0 || validSortSet.has(rawSort) ? rawSort : defaultSort;
    const sortDirection: SortDirection = searchParams.get('dir') === 'desc' ? 'desc' : 'asc';
    return {
      query,
      category,
      priceRanges,
      sizes,
      colors,
      genders,
      fits,
      materials,
      sortKey,
      sortDirection,
    };
  }, [searchParams, defaultCategory, defaultSort, validSortSet]);

  const buildParams = (state: FilterQueryState) => {
    const params = new URLSearchParams();
    if (state.query.trim()) params.set('q', state.query.trim());
    if (state.category && state.category !== defaultCategory) params.set('cat', state.category);
    if (state.priceRanges.length) params.set('price', state.priceRanges.join(','));
    if (state.sizes.length) params.set('size', state.sizes.join(','));
    if (state.colors.length) params.set('color', state.colors.join(','));
    if (state.genders.length) params.set('gender', state.genders.join(','));
    if (state.fits.length) params.set('fit', state.fits.join(','));
    if (state.materials.length) params.set('material', state.materials.join(','));
    if (state.sortKey && state.sortKey !== defaultSort) {
      params.set('sort', state.sortKey);
      params.set('dir', state.sortDirection);
    }
    return params;
  };

  const commit = (state: FilterQueryState) => {
    const params = buildParams(state);
    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery === currentQuery) return;
    if (lastCommittedQueryRef.current !== null && lastCommittedQueryRef.current === nextQuery) return;
    lastCommittedQueryRef.current = nextQuery;
    setSearchParams(params, { replace: true });
  };

  const setCategory = (value: string) => {
    commit({ ...state, category: value });
  };

  const setQueryValue = (value: string) => {
    commit({ ...state, query: value });
  };

  const toggleListValue = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const togglePrice = (value: string) => {
    const next = toggleListValue(state.priceRanges, value);
    commit({ ...state, priceRanges: next });
  };

  const toggleSize = (value: string) => {
    const next = toggleListValue(state.sizes, value);
    commit({ ...state, sizes: next });
  };

  const toggleColor = (value: string) => {
    const next = toggleListValue(state.colors, value);
    commit({ ...state, colors: next });
  };

  const toggleGender = (value: string) => {
    const next = toggleListValue(state.genders, value);
    commit({ ...state, genders: next });
  };

  const toggleFit = (value: string) => {
    const next = toggleListValue(state.fits, value);
    commit({ ...state, fits: next });
  };

  const toggleMaterial = (value: string) => {
    const next = toggleListValue(state.materials, value);
    commit({ ...state, materials: next });
  };

  const setSort = (value: SortKey, direction: SortDirection = 'asc') => {
    if (validSortSet.size > 0 && !validSortSet.has(value)) return;
    commit({ ...state, sortKey: value, sortDirection: direction });
  };

  const reset = () => {
    commit({
      query: '',
      category: defaultCategory,
      priceRanges: [],
      sizes: [],
      colors: [],
      genders: [],
      fits: [],
      materials: [],
      sortKey: defaultSort,
      sortDirection: 'asc',
    });
  };

  return {
    query: state.query,
    category: state.category,
    priceRanges: state.priceRanges,
    sizes: state.sizes,
    colors: state.colors,
    genders: state.genders,
    fits: state.fits,
    materials: state.materials,
    sortKey: state.sortKey,
    sortDirection: state.sortDirection,
    setQuery: setQueryValue,
    setCategory,
    togglePrice,
    toggleSize,
    toggleColor,
    toggleGender,
    toggleFit,
    toggleMaterial,
    setSort,
    reset,
  };
};
