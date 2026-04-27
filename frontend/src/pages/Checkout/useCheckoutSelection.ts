import { useCallback, useMemo, useState } from 'react';
import type { CartItem, StoreGroup } from '../../contexts/CartContext';
import {
  getSelectedCartIdsForCheckout,
  setSelectedCartIdsForCheckout,
} from '../../services/checkoutSelectionStore';
import {
  DEFAULT_SHIPPING_FEE,
  FREE_SHIPPING_THRESHOLD,
  UUID_PATTERN,
} from './checkout.types';

export interface CheckoutStoreGroup extends Omit<StoreGroup, 'items' | 'subtotal' | 'shippingFee'> {
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
}

interface UseCheckoutSelectionArgs {
  items: CartItem[];
  groupedByStore: () => StoreGroup[];
  updateQuantity: (cartId: string, quantity: number) => void;
  removeFromCart: (cartId: string) => void;
  clearCart: () => void;
}

export const useCheckoutSelection = ({
  items,
  groupedByStore,
  updateQuantity,
  removeFromCart,
  clearCart,
}: UseCheckoutSelectionArgs) => {
  const [selectedCartIds, setSelectedCartIds] = useState<string[]>(() => getSelectedCartIdsForCheckout());
  const [hasExplicitSelection] = useState<boolean>(() => getSelectedCartIdsForCheckout().length > 0);

  const checkoutItems = useMemo(() => {
    const validSelectedIds = selectedCartIds.filter((cartId) => items.some((item) => item.cartId === cartId));
    if (validSelectedIds.length === 0) {
      return hasExplicitSelection ? [] : items;
    }

    const selectedSet = new Set(validSelectedIds);
    return items.filter((item) => selectedSet.has(item.cartId));
  }, [hasExplicitSelection, items, selectedCartIds]);

  const storeGroups = useMemo(() => {
    const selectedSet = new Set(checkoutItems.map((item) => item.cartId));
    return groupedByStore()
      .map((group) => {
        const groupItems = group.items.filter((item) => selectedSet.has(item.cartId));
        if (groupItems.length === 0) {
          return null;
        }

        const subtotal = groupItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        return {
          ...group,
          items: groupItems,
          subtotal,
          shippingFee: subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_FEE,
        } satisfies CheckoutStoreGroup;
      })
      .filter((group): group is CheckoutStoreGroup => Boolean(group));
  }, [checkoutItems, groupedByStore]);

  const checkoutStoreIds = useMemo(
    () => Array.from(new Set(
      storeGroups
        .map((group) => group.storeId)
        .filter((storeId) => UUID_PATTERN.test(storeId)),
    )).sort(),
    [storeGroups],
  );

  const checkoutStoreKey = useMemo(() => checkoutStoreIds.join(','), [checkoutStoreIds]);

  const storeSubtotals = useMemo(
    () => storeGroups.reduce<Record<string, number>>((acc, group) => {
      acc[group.storeId] = group.subtotal;
      return acc;
    }, {}),
    [storeGroups],
  );

  const subtotal = useMemo(
    () => checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [checkoutItems],
  );

  const shippingFee = useMemo(
    () => storeGroups.reduce((sum, group) => sum + group.shippingFee, 0),
    [storeGroups],
  );

  const clearCartByMarker = useCallback((cartIds: string[]) => {
    const selected = Array.from(new Set(cartIds.map((value) => value.trim()).filter(Boolean)));
    if (selected.length === 0) {
      return;
    }

    const selectedSet = new Set(selected);
    const removable = items.filter((item) => selectedSet.has(item.cartId));
    if (removable.length === 0) {
      return;
    }

    if (removable.length === items.length) {
      clearCart();
    } else {
      removable.forEach((item) => removeFromCart(item.cartId));
    }

    setSelectedCartIds((prev) => {
      const next = prev.filter((id) => !selectedSet.has(id));
      setSelectedCartIdsForCheckout(next);
      return next;
    });
  }, [clearCart, items, removeFromCart]);

  const handleQuantityChange = useCallback((cartId: string, delta: number) => {
    const item = checkoutItems.find((current) => current.cartId === cartId);
    if (!item) {
      return;
    }

    const nextQuantity = item.quantity + delta;
    if (nextQuantity > 0) {
      updateQuantity(cartId, nextQuantity);
    }
  }, [checkoutItems, updateQuantity]);

  const handleRemoveItem = useCallback((cartId: string) => {
    removeFromCart(cartId);
    setSelectedCartIds((prev) => {
      const next = prev.filter((id) => id !== cartId);
      setSelectedCartIdsForCheckout(next);
      return next;
    });
  }, [removeFromCart]);

  return {
    checkoutItems,
    storeGroups,
    checkoutStoreIds,
    checkoutStoreKey,
    storeSubtotals,
    subtotal,
    shippingFee,
    clearCartByMarker,
    handleQuantityChange,
    handleRemoveItem,
  };
};
