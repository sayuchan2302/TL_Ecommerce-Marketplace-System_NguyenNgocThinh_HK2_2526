import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clearPersistedAdminView, getPersistedAdminView, setPersistedAdminView, shareAdminViewUrl } from './adminListView';

type SortDirection = 'asc' | 'desc';

interface ExtraFilterConfig {
  key: string;
  defaultValue: string;
  aliases?: string[];
  validate?: (value: string) => boolean;
}

interface UseAdminViewStateOptions {
  storageKey: string;
  path: string;
  validStatusKeys: readonly string[];
  defaultStatus?: string;
  statusAliases?: string[];
  validSortKeys?: readonly string[];
  extraFilters?: readonly ExtraFilterConfig[];
}

const safePageFromQuery = (value: string | null) => {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
};

const normalizeDirection = (value: string | null): SortDirection => (value === 'desc' ? 'desc' : 'asc');

const pickStatusFromQuery = (
  params: URLSearchParams,
  statusParamNames: readonly string[],
  validStatusKeys: Set<string>,
  fallbackStatus: string,
) => {
  for (const name of statusParamNames) {
    const raw = params.get(name) || '';
    if (validStatusKeys.has(raw)) return raw;
  }
  return fallbackStatus;
};

const EMPTY_EXTRA_FILTERS: readonly ExtraFilterConfig[] = [];

export const useAdminViewState = ({
  storageKey,
  path,
  validStatusKeys,
  defaultStatus = 'all',
  statusAliases = [],
  validSortKeys,
  extraFilters = EMPTY_EXTRA_FILTERS,
}: UseAdminViewStateOptions) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const validStatusStr = validStatusKeys.join(',');
  const validStatusSet = useMemo(() => new Set(validStatusStr.split(',').filter(Boolean)), [validStatusStr]);

  const validSortStr = (validSortKeys || []).join(',');
  const validSortSet = useMemo(() => new Set(validSortStr ? validSortStr.split(',') : []), [validSortStr]);

  const statusParamNamesStr = ['status', ...(statusAliases || [])].join(',');
  const statusParamNames = useMemo(() => statusParamNamesStr.split(','), [statusParamNamesStr]);

  const derivedState = useMemo(() => {
    const persisted = getPersistedAdminView(storageKey);
    const fallbackStatus = validStatusSet.has(persisted) ? persisted : defaultStatus;
    const status = pickStatusFromQuery(searchParams, statusParamNames, validStatusSet, fallbackStatus);
    const search = searchParams.get('q') || '';
    const page = safePageFromQuery(searchParams.get('page'));
    const rawSort = searchParams.get('sort') || '';
    const sortKey = rawSort && (validSortSet.size === 0 || validSortSet.has(rawSort)) ? rawSort : null;
    const sortDirection = normalizeDirection(searchParams.get('dir'));
    const extras = extraFilters.reduce<Record<string, string>>((acc, config) => {
      const keys = [config.key, ...(config.aliases || [])];
      let candidate = '';

      for (const key of keys) {
        const value = searchParams.get(key);
        if (value !== null) {
          candidate = value;
          break;
        }
      }

      if (!candidate) {
        acc[config.key] = config.defaultValue;
        return acc;
      }

      acc[config.key] = config.validate && !config.validate(candidate) ? config.defaultValue : candidate;
      return acc;
    }, {});

    return {
      status,
      search,
      page,
      sortKey,
      sortDirection,
      extras,
    };
  }, [defaultStatus, extraFilters, searchParams, statusParamNames, storageKey, validSortSet, validStatusSet]);

  const { status, search, page, sortKey, sortDirection, extras } = derivedState;

  const buildParamsFromState = (state: {
    status: string;
    search: string;
    page: number;
    sortKey: string | null;
    sortDirection: SortDirection;
    extras: Record<string, string>;
  }) => {
    const params = new URLSearchParams();
    if (state.status !== defaultStatus) params.set('status', state.status);
    if (state.search.trim()) params.set('q', state.search.trim());
    if (state.page > 1) params.set('page', String(state.page));
    if (state.sortKey) {
      params.set('sort', state.sortKey);
      params.set('dir', state.sortDirection);
    }

    extraFilters.forEach((config) => {
      const value = state.extras[config.key];
      if (value && value !== config.defaultValue) params.set(config.key, value);
    });

    return params;
  };

  const commitQuery = (state: {
    status: string;
    search: string;
    page: number;
    sortKey: string | null;
    sortDirection: SortDirection;
    extras: Record<string, string>;
  }) => {
    const params = buildParamsFromState(state);
    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery === currentQuery) return;
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    setPersistedAdminView(storageKey, status);
  }, [status, storageKey]);

  const setStatus = (nextStatus: string) => {
    const normalized = validStatusSet.has(nextStatus) ? nextStatus : defaultStatus;
    commitQuery({ status: normalized, search, page: 1, sortKey, sortDirection, extras });
  };

  const setSearch = (value: string) => {
    commitQuery({ status, search: value, page: 1, sortKey, sortDirection, extras });
  };

  const setPage = (nextPage: number) => {
    const normalized = Number.isFinite(nextPage) ? Math.max(1, Math.floor(nextPage)) : 1;
    commitQuery({ status, search, page: normalized, sortKey, sortDirection, extras });
  };

  const setSort = (nextSortKey: string | null, nextDirection: SortDirection = 'asc') => {
    if (!nextSortKey) {
      commitQuery({ status, search, page: 1, sortKey: null, sortDirection: 'asc', extras });
      return;
    }

    if (validSortSet.size > 0 && !validSortSet.has(nextSortKey)) return;
    commitQuery({ status, search, page: 1, sortKey: nextSortKey, sortDirection: nextDirection, extras });
  };

  const toggleSort = (key: string) => {
    if (validSortSet.size > 0 && !validSortSet.has(key)) return;
    if (sortKey !== key) {
      setSort(key, 'asc');
      return;
    }
    setSort(key, sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const setExtra = (key: string, value: string) => {
    const config = extraFilters.find((item) => item.key === key);
    if (!config) return;
    const normalized = config.validate && !config.validate(value) ? config.defaultValue : value;
    commitQuery({ status, search, page: 1, sortKey, sortDirection, extras: { ...extras, [key]: normalized } });
  };

  const shareCurrentView = async () => {
    await shareAdminViewUrl(`${path}${window.location.search}`);
  };

  const resetCurrentView = () => {
    const nextExtras = extraFilters.reduce<Record<string, string>>((acc, config) => {
      acc[config.key] = config.defaultValue;
      return acc;
    }, {});
    commitQuery({ status: defaultStatus, search: '', page: 1, sortKey: null, sortDirection: 'asc', extras: nextExtras });
    clearPersistedAdminView(storageKey);
  };

  const hasViewContext =
    status !== defaultStatus ||
    Boolean(search.trim()) ||
    page > 1 ||
    Boolean(sortKey) ||
    extraFilters.some((config) => extras[config.key] !== config.defaultValue);

  return {
    status,
    setStatus,
    search,
    setSearch,
    page,
    setPage,
    sortKey,
    sortDirection,
    setSort,
    toggleSort,
    extras,
    setExtra,
    shareCurrentView,
    resetCurrentView,
    hasViewContext,
  };
};
