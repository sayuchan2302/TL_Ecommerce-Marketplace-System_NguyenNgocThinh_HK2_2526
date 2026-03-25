import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Star, ShoppingBag, MessageCircle, BadgeCheck, Heart, Share2 } from 'lucide-react';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import { storeService, type StoreProfile, type StoreProduct } from '../../services/storeService';
import './StoreProfile.css';

const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
};

const containerTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] as const },
};

const StoreProfile = () => {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<StoreProfile | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    
    const fetchData = async () => {
      setLoading(true);
      const storeData = await storeService.getStoreBySlug(slug);
      setStore(storeData);
      setLoading(false);
      
      if (storeData) {
        setProductsLoading(true);
        const productsData = await storeService.getStoreProducts(storeData.id);
        setProducts(productsData.products);
        setProductsLoading(false);
      }
    };
    
    fetchData();
  }, [slug]);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  if (loading) {
    return (
      <div className="store-profile-page">
        <div className="store-profile-loading">
          <div className="loading-spinner"></div>
          <span>Đang tải thông tin cửa hàng...</span>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="store-profile-page">
        <div className="store-profile-not-found">
          <h2>Cửa hàng không tồn tại</h2>
          <p>Cửa hàng bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.</p>
          <Link to="/" className="back-home-btn">
            <ChevronLeft size={18} />
            Quay về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="store-profile-page"
      {...pageTransition}
    >
      {/* Store Banner */}
      <div className="store-banner">
        <img 
          src={store.banner || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop'} 
          alt={store.name}
          className="store-banner-img"
        />
        <div className="store-banner-overlay"></div>
      </div>

      <div className="store-profile-container">
        {/* Back Link */}
        <Link to="/" className="store-back-link">
          <ChevronLeft size={18} />
          <span>Quay lại</span>
        </Link>

        {/* Store Info Card */}
        <motion.div 
          className="store-info-card"
          {...containerTransition}
        >
          <div className="store-info-main">
            <div className="store-logo-wrapper">
              {store.logo ? (
                <img src={store.logo} alt={store.name} className="store-logo" />
              ) : (
                <div className="store-logo-placeholder">
                  {store.name.charAt(0)}
                </div>
              )}
              {store.isOfficial && (
                <div className="store-logo-badge">
                  <BadgeCheck size={16} />
                </div>
              )}
            </div>

            <div className="store-details">
              <div className="store-name-row">
                <h1 className="store-name">{store.name}</h1>
                {store.isOfficial && (
                  <span className="store-official-label">
                    <BadgeCheck size={16} />
                    Cửa hàng chính hãng
                  </span>
                )}
              </div>
              
              {store.description && (
                <p className="store-description">{store.description}</p>
              )}

              <div className="store-stats">
                <div className="store-stat">
                  <Star size={16} className="stat-icon star" />
                  <span className="stat-value">{store.rating.toFixed(1)}</span>
                  <span className="stat-label">đánh giá</span>
                </div>
                <div className="store-stat">
                  <ShoppingBag size={16} className="stat-icon" />
                  <span className="stat-value">{store.totalOrders.toLocaleString('vi-VN')}</span>
                  <span className="stat-label">đơn hàng</span>
                </div>
                <div className="store-stat">
                  <MessageCircle size={16} className="stat-icon" />
                  <span className="stat-value">{store.totalSales > 1000000 
                    ? `${(store.totalSales / 1000000).toFixed(0)}M` 
                    : store.totalSales.toLocaleString('vi-VN')}</span>
                  <span className="stat-label">doanh số</span>
                </div>
              </div>
            </div>
          </div>

          <div className="store-actions">
            <motion.button 
              className={`store-action-btn follow-btn ${isFollowing ? 'following' : ''}`}
              onClick={handleFollow}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Heart size={18} fill={isFollowing ? 'currentColor' : 'none'} />
              {isFollowing ? 'Đã theo dõi' : 'Theo dõi'}
            </motion.button>
            <button className="store-action-btn share-btn">
              <Share2 size={18} />
              Chia sẻ
            </button>
          </div>
        </motion.div>

        {/* Products Section */}
        <motion.div 
          className="store-products-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="store-products-header">
            <h2 className="store-products-title">
              Sản phẩm của {store.name}
            </h2>
            <span className="store-products-count">
              {products.length} sản phẩm
            </span>
          </div>

          {productsLoading ? (
            <div className="store-products-loading">
              <div className="loading-spinner"></div>
            </div>
          ) : products.length > 0 ? (
            <ProductGrid customResults={products} />
          ) : (
            <div className="store-no-products">
              <p>Cửa hàng chưa có sản phẩm nào.</p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default StoreProfile;
