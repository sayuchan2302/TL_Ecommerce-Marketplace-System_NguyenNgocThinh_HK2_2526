/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';
import { useToast } from './ToastContext';

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (id: string) => void;
  isInWishlist: (id: string) => boolean;
  totalItems: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const { addToast } = useToast();

  const addToWishlist = (item: WishlistItem) => {
    const existing = items.find(i => i.id === item.id);
    if (!existing) {
      setItems(prev => [...prev, item]);
      addToast('Đã thêm vào danh sách yêu thích', 'add');
    }
  };

  const removeFromWishlist = (id: string) => {
    const existing = items.find(i => i.id === id);
    if (existing) {
      setItems(prev => prev.filter(item => item.id !== id));
      addToast('Đã xoá khỏi danh sách yêu thích', 'remove');
    }
  };

  const isInWishlist = (id: string) => items.some(i => i.id === id);

  return (
    <WishlistContext.Provider value={{ items, addToWishlist, removeFromWishlist, isInWishlist, totalItems: items.length }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
};
