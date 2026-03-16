import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useToast } from './ToastContext';

// ─── Types ────────────────────────────────────────────────────────────────────
export type CartItem = {
  cartId: string;     // unique key = `${productId}-${color}-${size}`
  id: number | string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  color: string;
  size: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'cartId' | 'quantity'> & { quantity?: number }) => void;
  removeFromCart: (cartId: string) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'coolmate_cart_v1';

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

  // Persist to localStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = (
    newItem: Omit<CartItem, 'cartId' | 'quantity'> & { quantity?: number }
  ) => {
    const cartId = `${newItem.id}-${newItem.color}-${newItem.size}`;
    const qty = newItem.quantity ?? 1;

    const existing = items.find(i => i.cartId === cartId);
    if (existing) {
      setItems(prev => prev.map(i =>
        i.cartId === cartId
          ? { ...i, quantity: Math.min(i.quantity + qty, 10) }
          : i
      ));
      addToast(`Đã cập nhật số lượng của ${newItem.name} trong giỏ hàng`, 'info');
    } else {
      setItems(prev => [...prev, { ...newItem, cartId, quantity: qty }]);
      addToast(`Đã thêm ${newItem.name} vào giỏ hàng`, 'success');
    }
  };

  const removeFromCart = (cartId: string) => {
    const existing = items.find(i => i.cartId === cartId);
    if (existing) {
      setItems(prev => prev.filter(i => i.cartId !== cartId));
      addToast('Đã xoá sản phẩm khỏi giỏ', 'info');
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

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice }}
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
