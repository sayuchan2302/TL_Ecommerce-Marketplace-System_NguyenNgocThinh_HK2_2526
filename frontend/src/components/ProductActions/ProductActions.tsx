import { useState } from 'react';
import { Minus, Plus, ShoppingCart, Check, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCartAnimation } from '../../context/CartAnimationContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCart } from '../../contexts/CartContext';
import './ProductActions.css';

interface ProductActionsProps {
  product: {
    id: number | string;
    name: string;
    price: number;
    originalPrice?: number;
    image: string;
  };
  selectedColor: string;
  selectedSize: string;
}

const ProductActions = ({ product, selectedColor, selectedSize }: ProductActionsProps) => {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addToCart } = useCart();
  const { triggerAnimation } = useCartAnimation();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const navigate = useNavigate();
  const isWished = isInWishlist(String(product.id));

  const handleAddToCart = (e: React.MouseEvent) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      color: selectedColor,
      size: selectedSize,
      quantity,
    });
    
    triggerAnimation(e, product.image);
    
    // Show success feedback
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      color: selectedColor,
      size: selectedSize,
      quantity,
    });
    triggerAnimation(e, product.image);
    navigate('/cart');
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isWished) {
      removeFromWishlist(String(product.id));
    } else {
      addToWishlist({
        id: String(product.id),
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.image,
      });
    }
  };

  return (
    <div className="product-actions-container">
      {/* Quantity Selector */}
      <div className="quantity-wrapper">
        <button 
          className="qty-btn" 
          onClick={() => setQuantity(q => Math.max(1, q - 1))}
          aria-label="Decrease quantity"
          disabled={quantity <= 1}
        >
          <Minus size={16} />
        </button>
        <input 
          type="number" 
          className="qty-input" 
          value={quantity} 
          readOnly 
        />
        <button 
          className="qty-btn" 
          onClick={() => setQuantity(q => Math.min(10, q + 1))}
          aria-label="Increase quantity"
          disabled={quantity >= 10}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        {/* Add to Cart Button */}
        <button
          className={`btn-add-cart ${added ? 'added' : ''}`}
          onClick={handleAddToCart}
          disabled={added}
        >
          {added ? (
            <><Check size={20} /> ĐÃ THÊM VÀO GIỎ</>
          ) : (
            <><ShoppingCart size={20} /> THÊM VÀO GIỎ</>
          )}
        </button>
        {/* Buy Now Button */}
        <button className="btn-buy-now" onClick={handleBuyNow}>
          MUA NGAY
        </button>
        {/* Wishlist Button */}
        <button 
          className={`btn-wishlist-action ${isWished ? 'wished' : ''}`}
          onClick={handleToggleWishlist}
          title={isWished ? "Xoá khỏi yêu thích" : "Thêm vào yêu thích"}
        >
          <Heart size={24} fill={isWished ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Trust Badges Minimal */}
      <ul className="action-trust-list">
        <li>Đổi trả cực dễ chỉ cần số điện thoại</li>
        <li>60 ngày đổi trả vì bất kỳ lý do gì</li>
        <li>Hotline 1900.27.27.37 hỗ trợ từ 8h30 - 22h mỗi ngày</li>
      </ul>
    </div>
  );
};

export default ProductActions;
