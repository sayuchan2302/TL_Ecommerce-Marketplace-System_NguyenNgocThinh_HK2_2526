import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Heart, Eye } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useCartAnimation } from '../../context/CartAnimationContext';
import { useWishlist } from '../../contexts/WishlistContext';
import QuickViewModal from '../QuickViewModal/QuickViewModal';
import './ProductCard.css';

interface ProductCardProps {
  id: number;
  sku?: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  badge?: string;
  colors?: string[];
  sizes?: string[];
}

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

const ProductCard = ({ id, sku, name, price, originalPrice, image, badge, colors, sizes }: ProductCardProps) => {
  const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0;
  const { addToCart } = useCart();
  const { triggerAnimation } = useCartAnimation();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [addedSize, setAddedSize] = useState<string | null>(null);
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const isWished = isInWishlist(String(sku || id));

  const availableSizes = sizes ?? DEFAULT_SIZES;
  const selectedColorValue = colors?.[selectedColorIdx] ?? '';

  const handleSizeClick = (e: React.MouseEvent, size: string) => {
    e.preventDefault();
    e.stopPropagation();

    addToCart({
      id: sku || id,
      name,
      price,
      originalPrice,
      image,
      color: selectedColorValue || 'Mặc định',
      size,
    });

    setAddedSize(size);
    triggerAnimation({
      imgSrc: image,
      imageRect: imageRef.current?.getBoundingClientRect() || null,
      fallbackPoint: { x: e.clientX, y: e.clientY },
    });
    
    setTimeout(() => setAddedSize(null), 1500);
  };

  const handleColorClick = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedColorIdx(idx);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isWished) {
      removeFromWishlist(String(sku || id));
    } else {
      triggerAnimation({
        imgSrc: image,
        imageRect: imageRef.current?.getBoundingClientRect() || null,
        fallbackPoint: { x: e.clientX, y: e.clientY },
        target: 'wishlist',
      });
      addToWishlist({
        id: String(sku || id),
        name,
        price,
        originalPrice,
        image,
      });
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  return (
    <div className="product-card">
      <div className="product-image-container">
        {/* Wishlist Icon */}
        <button 
          className={`product-wishlist-btn ${isWished ? 'wished' : ''}`}
          onClick={handleToggleWishlist}
          title={isWished ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
          aria-label="Wishlist"
        >
          <Heart size={20} fill={isWished ? "currentColor" : "none"} strokeWidth={isWished ? 1 : 1.5} />
        </button>

        <Link to={`/product/${sku || id}`}>
          <img
            ref={imageRef}
            src={image}
            alt={name}
            className="product-image"
            loading="lazy"
            width={672}
            height={990}
          />
          {badge && <span className={`product-badge ${badge === 'SALE' ? 'badge-sale' : ''}`}>{badge}</span>}
          {!badge && discount > 0 && (
            <span className="product-badge badge-sale">-{discount}%</span>
          )}
        </Link>

        {/* Quick View Button */}
        <button 
          className="product-quick-view-btn"
          onClick={handleQuickView}
          title="Xem nhanh"
        >
          <Eye size={18} /> Xem nhanh
        </button>

        {/* Hover Quick-Add Panel */}
        <div className="quick-add-overlay">
          <div className="quick-add-panel">
            <p className="quick-add-label">
              Thêm nhanh vào giỏ hàng <Plus size={14} strokeWidth={2.5} />
            </p>
            <div className="quick-add-sizes">
              {availableSizes.map((size) => (
                <button
                  key={size}
                  className={`quick-size-btn ${addedSize === size ? 'added' : ''}`}
                  onClick={(e) => handleSizeClick(e, size)}
                  title={`Thêm size ${size}`}
                >
                  {addedSize === size ? '✓' : size}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="product-info">
        {/* Color swatches - clickable with ring on selected */}
        {colors && colors.length > 0 && (
          <div className="product-colors">
            {colors.map((color, idx) => (
              <button
                key={idx}
                className={`color-swatch-btn ${selectedColorIdx === idx ? 'selected' : ''}`}
                style={{ '--swatch-color': color } as React.CSSProperties}
                onClick={(e) => handleColorClick(e, idx)}
                aria-label={`Chọn màu ${idx + 1}`}
              >
                <span className="swatch-inner" style={{ backgroundColor: color }}></span>
              </button>
            ))}
          </div>
        )}
         <Link to={`/product/${sku || id}`} className="product-name-link">
          <h3 className="product-name">{name}</h3>
        </Link>
        <div className="product-prices">
          <span className="current-price">{price.toLocaleString('vi-VN')}đ</span>
          {originalPrice && <span className="original-price">{originalPrice.toLocaleString('vi-VN')}đ</span>}
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={{ id: Number(sku) || id, name, price, originalPrice, image, colors, sizes }}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </div>
  );
};

export default ProductCard;
