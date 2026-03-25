/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import './CartAnimation.css';

type TriggerPayload = {
  imgSrc: string;
  imageRect?: DOMRect | null;
  fallbackPoint?: { x: number; y: number };
  target?: 'cart' | 'wishlist';
};

interface CartAnimationContextType {
  triggerAnimation: (payload: TriggerPayload) => void;
  cartIconRef: React.RefObject<HTMLButtonElement | null>;
  wishlistIconRef: React.RefObject<HTMLButtonElement | null>;
}

const CartAnimationContext = createContext<CartAnimationContextType | undefined>(undefined);

export const CartAnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cartIconRef = useRef<HTMLButtonElement>(null);
  const wishlistIconRef = useRef<HTMLButtonElement>(null);
  const [animations, setAnimations] = useState<{
    id: string;
    imgSrc: string;
    size: number;
    target: 'cart' | 'wishlist';
    keyframes: { x: number[]; y: number[]; scale: number[]; opacity: number[] };
  }[]>([]);

  const triggerAnimation = useCallback(({ imgSrc, imageRect, fallbackPoint, target = 'cart' }: TriggerPayload) => {
    const targetIcon = target === 'wishlist' ? wishlistIconRef.current : cartIconRef.current;
    if (!targetIcon) return;

    const startX = imageRect ? imageRect.left + imageRect.width / 2 : fallbackPoint?.x;
    const startY = imageRect ? imageRect.top + imageRect.height / 2 : fallbackPoint?.y;
    if (startX == null || startY == null) return;

    const endRect = targetIcon.getBoundingClientRect();
    const endX = endRect.left + endRect.width / 2;
    const endY = endRect.top + endRect.height / 2;

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2 - 60; // Giảm độ nảy (curve) xuống chỉ còn 60px thay vì 140px

    const size = Math.max(60, Math.min(120, imageRect?.width ?? 80));
    const offset = size / 2;
    
    // Adjust x,y so the center of the image flies along the path
    const targetStartX = startX - offset;
    const targetStartY = startY - offset;
    const targetMidX = midX - offset;
    const targetMidY = midY - offset;
    const targetEndX = endX - offset;
    const targetEndY = endY - offset;

    const newAnimationId = Math.random().toString(36).substring(7);

    setAnimations(prev => [...prev, {
      id: newAnimationId,
      imgSrc,
      size,
      target,
      keyframes: {
        x: [targetStartX, targetMidX, targetEndX],
        y: [targetStartY, targetMidY, targetEndY],
        scale: [1, 0.6, 0.35],
        opacity: [1, 0.9, 0],
      }
    }]);
  }, []);

  const bounceIcon = useCallback((target: 'cart' | 'wishlist') => {
    const el = target === 'wishlist' ? wishlistIconRef.current : cartIconRef.current;
    if (!el) return;
    el.classList.remove('icon-bounce');
    void el.offsetWidth;
    el.classList.add('icon-bounce');
    setTimeout(() => el.classList.remove('icon-bounce'), 320);
  }, []);

  return (
    <CartAnimationContext.Provider value={{ triggerAnimation, cartIconRef, wishlistIconRef }}>
      {children}
      {animations.map(anim => (
        <FlyingImage
          key={anim.id}
          imgSrc={anim.imgSrc}
          size={anim.size}
          keyframes={anim.keyframes}
          onDone={() => {
            setAnimations(prev => prev.filter(a => a.id !== anim.id));
            bounceIcon(anim.target);
          }}
        />
      ))}
    </CartAnimationContext.Provider>
  );
};

export const useCartAnimation = () => {
  const context = useContext(CartAnimationContext);
  if (!context) {
    throw new Error('useCartAnimation must be used within a CartAnimationProvider');
  }
  return context;
};

// --- Flying Image Component ---
const FlyingImage: React.FC<{
  imgSrc: string;
  size: number;
  keyframes: { x: number[]; y: number[]; scale: number[]; opacity: number[] };
  onDone: () => void;
}> = ({ imgSrc, size, keyframes, onDone }) => {
  return (
    <motion.img
      src={imgSrc}
      className="cart-flying-img"
      style={{ width: size, height: size }}
      initial={{ x: keyframes.x[0], y: keyframes.y[0], scale: 1, opacity: 1 }}
      animate={{
        x: keyframes.x,
        y: keyframes.y,
        scale: keyframes.scale,
        opacity: keyframes.opacity,
      }}
      transition={{ duration: 1.1, ease: [0.25, 0.1, 0.25, 1] }} // Sửa ease mượt hơn, chậm hơn (1.1s)
      onAnimationComplete={onDone}
      aria-hidden="true"
    />
  );
};
