import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ChevronRight, Check } from 'lucide-react';
import ProductSection from '../../components/ProductSection/ProductSection';
import { mensFashion } from '../Home/Home';
import { useCart } from '../../contexts/CartContext';
import './Cart.css';


const FREE_SHIPPING_THRESHOLD = 500000;

const Cart = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart } = useCart();
  const [selectedItems, setSelectedItems] = useState<string[]>(items.map(i => i.cartId));
  const [couponCode, setCouponCode] = useState('');

  // Sync selection when items change
  const validSelectedItems = selectedItems.filter(id => items.some(i => i.cartId === id));

  // Calculations
  const selectedItemsList = items.filter(item => validSelectedItems.includes(item.cartId));
  const subtotal = selectedItemsList.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalOriginalPrice = selectedItemsList.reduce((sum, item) => sum + (item.originalPrice ?? item.price) * item.quantity, 0);
  const discount = totalOriginalPrice - subtotal;
  
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : 30000;
  const total = subtotal + shippingFee;

  // Free shipping progress logic
  const remainingForFreeship = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeshipProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  // Handlers
  const handleQuantityChange = (cartId: string, delta: number) => {
    const item = items.find(i => i.cartId === cartId);
    if (item) updateQuantity(cartId, item.quantity + delta);
  };

  const handleRemoveItem = (cartId: string) => {
    removeFromCart(cartId);
    setSelectedItems(prev => prev.filter(id => id !== cartId));
  };

  const toggleSelectAll = () => {
    if (validSelectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.cartId));
    }
  };

  const toggleSelectItem = (cartId: string) => {
    if (validSelectedItems.includes(cartId)) {
      setSelectedItems(validSelectedItems.filter(id => id !== cartId));
    } else {
      setSelectedItems([...validSelectedItems, cartId]);
    }
  };

  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
  };

  if (items.length === 0) {
    return (
      <div className="cart-empty-state container">
        <h1 className="cart-page-title">Giỏ hàng của bạn</h1>
        <div className="empty-content">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--co-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="empty-cart-icon mb-6 mx-auto">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <p>Giỏ hàng của bạn đang trống.</p>
          <Link to="/" className="btn-continue-shopping">Tiếp tục mua sắm</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page container">
      {/* Breadcrumbs */}
      <nav className="cart-breadcrumbs">
        <Link to="/">Trang chủ</Link>
        <ChevronRight size={14} className="breadcrumb-separator" />
      <span className="current">Giỏ hàng ({items.length})</span>
      </nav>

      <h1 className="cart-page-title">Giỏ hàng của bạn</h1>

      <div className="cart-layout">
        {/* Left Column: Items */}
        <div className="cart-main">
          
          {/* Free Shipping Progress */}
          <div className="freeship-banner">
            <div className="freeship-header">
              {remainingForFreeship > 0 ? (
                <span>Mua thêm <span className="highlight-price">{formatPrice(remainingForFreeship)}</span> để được <strong>Miễn phí vận chuyển</strong></span>
              ) : (
                <span className="freeship-success"><Check size={16} className="inline-icon freeship-icon" /> Đơn hàng của bạn đã đủ điều kiện <strong>Miễn phí giao hàng</strong></span>
              )}
            </div>
            <div className="progress-bar-container">
              <div 
                className={`progress-bar-fill ${freeshipProgress === 100 ? 'success' : ''}`} 
                style={{ width: `${freeshipProgress}%` }}
              ></div>
            </div>
          </div>

          {/* Header Row */}
          <div className="cart-header-row">
            <div className="checkbox-select-all">
              <input 
                type="checkbox" 
                id="selectAll" 
                checked={validSelectedItems.length === items.length && items.length > 0}
                onChange={toggleSelectAll}
              />
              <label htmlFor="selectAll">Chọn tất cả ({items.length} sản phẩm)</label>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="cart-items-list">
            {items.map((item) => (
              <div className="cart-item-card" key={item.cartId}>
                <div className="item-checkbox">
                  <input 
                    type="checkbox" 
                    checked={validSelectedItems.includes(item.cartId)}
                    onChange={() => toggleSelectItem(item.cartId)}
                  />
                </div>
                
                <div className="item-image">
                  <Link to={`/product/${item.id}`}>
                    <img src={item.image} alt={item.name} />
                  </Link>
                </div>
                
                <div className="item-details">
                  <div className="item-info-top">
                    <Link to={`/product/${item.id}`} className="item-name">{item.name}</Link>
                    <button className="btn-remove-item" onClick={() => handleRemoveItem(item.cartId)} aria-label="Xóa sản phẩm">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="item-variant">
                    {item.color} / {item.size}
                  </div>
                  
                  <div className="item-price-controls">
                    <div className="item-price-col">
                      <span className="current-price">{formatPrice(item.price)}</span>
                      {item.originalPrice !== undefined && item.originalPrice > item.price && (
                        <span className="original-price">{formatPrice(item.originalPrice)}</span>
                      )}
                    </div>
                    
                    <div className="quantity-control form-input-like">
                      <button 
                        className="qty-btn" 
                        onClick={() => handleQuantityChange(item.cartId, -1)}
                        disabled={item.quantity <= 1}
                      >-</button>
                      <span className="qty-value">{item.quantity}</span>
                      <button 
                        className="qty-btn" 
                        onClick={() => handleQuantityChange(item.cartId, 1)}
                      >+</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="cart-sidebar">
          <div className="summary-card sticky">
            <h2 className="summary-title">Tóm tắt đơn hàng</h2>
            
            <div className="coupon-section">
              <div className="coupon-input-group">
                <input 
                  type="text" 
                  placeholder="Nhập mã giảm giá" 
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="coupon-input"
                />
                <button className="btn-apply-coupon" disabled={!couponCode.trim()}>Áp dụng</button>
              </div>
            </div>

            <div className="summary-details">
              <div className="summary-row">
                <span>Tạm tính</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              
              {discount > 0 && (
                <div className="summary-row text-success">
                  <span>Giảm giá</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              
              <div className="summary-row">
                <span>Phí giao hàng</span>
                <span>{shippingFee === 0 ? 'Miễn phí' : formatPrice(shippingFee)}</span>
              </div>
              
              <div className="summary-divider"></div>
              
              <div className="summary-row total-row">
                <span>Tổng cộng</span>
                <div className="total-price-col">
                  <span className="total-price">{formatPrice(total)}</span>
                  <span className="vat-note">(Đã bao gồm VAT nếu có)</span>
                </div>
              </div>
            </div>

            <button 
              className="btn-checkout" 
              disabled={validSelectedItems.length === 0}
              onClick={() => navigate('/checkout')}
            >
              TIẾN HÀNH THANH TOÁN
            </button>
            
            {/* Trust Badges */}
            <div className="cart-trust-badges">
              <div className="badge-item">
                <span className="badge-icon">🛡️</span>
                <span>Bảo mật thanh toán</span>
              </div>
              <div className="badge-item">
                <span className="badge-icon">🚚</span>
                <span>Đổi trả miễn phí 60 ngày</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-sell / Upsell Section */}
      <div className="cart-cross-sell" style={{ marginTop: '48px' }}>
        <ProductSection title="SẢN PHẨM BẠN CÓ THỂ THÍCH" products={mensFashion} />
      </div>
    </div>
  );
};

export default Cart;
