export const ADMIN_VIEW_KEYS = {
  orders: 'admin.orders.view',
  products: 'admin.products.view',
  promotions: 'admin.promotions.view',
  customers: 'admin.customers.view',
  categories: 'admin.categories.view',
  stores: 'admin.stores.view',
  productGovernance: 'admin.productGovernance.view',
  financials: 'admin.financials.view',
  reviews: 'admin.reviews.view',
  returns: 'admin.returns.view',
} as const;

export const getPersistedAdminView = (key: string) => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(key) || '';
};

export const setPersistedAdminView = (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, value);
};

export const clearPersistedAdminView = (key: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
};

export const shareAdminViewUrl = async (pathWithQuery: string) => {
  const url = `${window.location.origin}${pathWithQuery}`;
  await navigator.clipboard.writeText(url);
};
