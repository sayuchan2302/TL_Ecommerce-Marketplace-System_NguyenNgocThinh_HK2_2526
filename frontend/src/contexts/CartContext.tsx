/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useToast } from './ToastContext';
import { authService } from '../services/authService';
import { productService } from '../services/productService';

// ─── Types ────────────────────────────────────────────────────────────────────
export type CartItem = {
  cartId: string;     // unique key = `${productId}-${color}-${size}`
  id: number | string;
  backendProductId?: string;
  backendVariantId?: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  color: string;
  size: string;
  quantity: number;
  // Multi-vendor fields (optional for backward compatibility)
  storeId?: string;
  storeName?: string;
  isOfficialStore?: boolean;
}

export type StoreGroup = {
  storeId: string;
  storeName: string;
  isOfficialStore: boolean;
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
}

interface CartContextValue {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'cartId' | 'quantity'> & { quantity?: number }) => void;
  removeFromCart: (cartId: string) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  groupedByStore: () => StoreGroup[];
}

// ─── Context ──────────────────────────────────────────────────────────────────
const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'coolmate_cart_v1';
const FREE_SHIPPING_THRESHOLD = 500000;
const DEFAULT_SHIPPING_FEE = 30000;

const buildLoginRedirectTarget = () => {
  if (typeof window === 'undefined') return '/login';
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `/login?reason=${encodeURIComponent('auth-required')}&redirect=${encodeURIComponent(current)}`;
};

// ─── Grouping Logic ────────────────────────────────────────────────────────────
const groupByStore = (items: CartItem[]): StoreGroup[] => {
  const groups = items.reduce((acc, item) => {
    const storeId = item.storeId || 'default-store';
    const storeName = item.storeName || 'Cửa hàng';
    
    if (!acc[storeId]) {
      acc[storeId] = {
        storeId,
        storeName,
        isOfficialStore: item.isOfficialStore || false,
        items: [],
        subtotal: 0,
        shippingFee: DEFAULT_SHIPPING_FEE,
      };
    }
    acc[storeId].items.push(item);
    acc[storeId].subtotal += item.price * item.quantity;
    return acc;
  }, {} as Record<string, StoreGroup>);

  // Calculate shipping fee for each store
  Object.values(groups).forEach(group => {
    group.shippingFee = group.subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_FEE;
  });

  return Object.values(groups);
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const { addToast } = useToast();

  const ensureAuthenticated = () => {
    const session = authService.getSession() || authService.getAdminSession();
    const token = session?.token;
    const isValid = Boolean(
      token
      && authService.isBackendJwtToken(token)
      && !authService.isJwtExpired(token),
    );

    if (isValid) return true;

    addToast('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.', 'info');
    if (typeof window !== 'undefined') {
      window.location.href = buildLoginRedirectTarget();
    }
    return false;
  };

  // Persist to localStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Backfill missing vendor info for legacy cart items added before store metadata existed.
  useEffect(() => {
    let cancelled = false;

    const needsHydration = items.filter((item) => (
      (!item.storeName || item.storeName.trim() === '' || item.storeName === 'Cửa hàng')
      && Boolean(item.backendProductId || item.id)
    ));
    if (needsHydration.length === 0) {
      return () => {
        cancelled = true;
      };
    }

    const hydrate = async () => {
      const resolvedByKey = new Map<string, { storeId?: string; storeName?: string; isOfficialStore?: boolean }>();

      await Promise.all(needsHydration.map(async (item) => {
        const key = String(item.backendProductId || item.id);
        if (resolvedByKey.has(key)) return;
        try {
          const product = await productService.getByIdentifier(key);
          if (!product) return;
          resolvedByKey.set(key, {
            storeId: product.storeId,
            storeName: product.storeName,
            isOfficialStore: product.isOfficialStore,
          });
        } catch {
          // Ignore hydration error and keep current cart row untouched.
        }
      }));

      if (cancelled || resolvedByKey.size === 0) return;

      setItems((prev) => {
        let changed = false;
        const next = prev.map((item) => {
          const key = String(item.backendProductId || item.id);
          const resolved = resolvedByKey.get(key);
          if (!resolved) return item;

          const nextStoreId = item.storeId || resolved.storeId;
          const nextStoreName = (item.storeName && item.storeName !== 'Cửa hàng')
            ? item.storeName
            : (resolved.storeName || item.storeName);
          const nextOfficial = item.isOfficialStore ?? resolved.isOfficialStore;

          if (
            nextStoreId === item.storeId
            && nextStoreName === item.storeName
            && nextOfficial === item.isOfficialStore
          ) {
            return item;
          }

          changed = true;
          return {
            ...item,
            storeId: nextStoreId,
            storeName: nextStoreName,
            isOfficialStore: nextOfficial,
          };
        });

        return changed ? next : prev;
      });
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [items]);

  const addToCart = (
    newItem: Omit<CartItem, 'cartId' | 'quantity'> & { quantity?: number }
  ) => {
    if (!ensureAuthenticated()) {
      return;
    }

    const cartId = `${newItem.id}-${newItem.color}-${newItem.size}`;
    const qty = newItem.quantity ?? 1;

    const existing = items.find(i => i.cartId === cartId);
    if (existing) {
      setItems(prev => prev.map(i =>
        i.cartId === cartId
          ? { ...i, quantity: Math.min(i.quantity + qty, 10) }
          : i
      ));
    } else {
      setItems(prev => [...prev, { ...newItem, cartId, quantity: qty }]);
    }
  };

  const removeFromCart = (cartId: string) => {
    const existing = items.find(i => i.cartId === cartId);
    if (existing) {
      setItems(prev => prev.filter(i => i.cartId !== cartId));
      addToast('Đã xoá sản phẩm khỏi giỏ', 'remove');
    }
  };

  const updateQuantity = (cartId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartId);
    } else {
      setItems(prev =>
        prev.map(i => (i.cartId === cartId ? { ...i, quantity } : i))
      );
    }
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const groupedByStore = () => groupByStore(items);

  return (
    <CartContext.Provider
      value={{ 
        items, 
        addToCart, 
        removeFromCart, 
        updateQuantity, 
        clearCart, 
        totalItems, 
        totalPrice,
        groupedByStore,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
};
