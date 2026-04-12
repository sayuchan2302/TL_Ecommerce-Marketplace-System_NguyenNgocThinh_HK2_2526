import { Link } from 'react-router-dom';
import { Heart, ChevronRight } from 'lucide-react';
import { useWishlist } from '../../contexts/WishlistContext';
import ProductSection from '../../components/ProductSection/ProductSection';
import './Wishlist.css';

const Wishlist = () => {
  const { items } = useWishlist();

  const wishlistProducts = items.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    originalPrice: item.originalPrice,
    image: item.image,
    storeId: item.storeId,
    storeName: item.storeName,
    isOfficialStore: item.isOfficialStore,
  }));

  return (
    <div className="wishlist-page">
      <div className="wishlist-container">
        <div className="wishlist-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          <span>Yêu thích</span>
        </div>

        {items.length === 0 ? (
          <div className="wishlist-empty">
            <Heart size={80} strokeWidth={1} />
            <h2>Danh sách yêu thích trống</h2>
            <p>
              Hãy thêm những sản phẩm bạn yêu thích bằng cách nhấn vào biểu tượng{' '}
              <Heart size={16} fill="var(--co-blue)" color="var(--co-blue)" style={{ verticalAlign: 'middle' }} />{' '}
              trên sản phẩm.
            </p>
            <Link to="/" className="wishlist-shop-btn">Khám phá sản phẩm</Link>
          </div>
        ) : (
          <ProductSection
            title={`Sản phẩm yêu thích (${items.length})`}
            products={wishlistProducts}
            viewAllLink="/search?scope=products"
            showQuickView={false}
            useSlider={false}
            className="wishlist-product-section"
          />
        )}
      </div>
    </div>
  );
};

export default Wishlist;
