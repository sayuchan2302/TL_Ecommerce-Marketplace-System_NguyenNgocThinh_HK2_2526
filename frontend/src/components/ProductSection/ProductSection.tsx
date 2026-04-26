import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './ProductSection.css';
import ProductCard from '../ProductCard/ProductCard';

interface ProductSectionItem {
  id: number | string;
  sku?: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  badge?: string;
  colors?: string[];
  sizes?: string[];
  variants?: Array<{
    color: string;
    size: string;
    backendId?: string;
  }>;
  backendId?: string;
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  isOfficialStore?: boolean;
}

interface ProductSectionProps {
  title: string;
  products: ProductSectionItem[];
  eyebrow?: ReactNode;
  viewAllLink?: string;
  staticCards?: boolean;
  showQuickView?: boolean;
  useSlider?: boolean;
  maxItems?: number;
  onQuickAdd?: (item: {
    id: number | string;
    backendId?: string;
    name: string;
    price: number;
    originalPrice?: number;
    image: string;
    storeId?: string;
    storeName?: string;
    isOfficialStore?: boolean;
  }) => void;
  className?: string;
  subHeader?: ReactNode;
}

const ProductSection = ({
  title,
  products,
  eyebrow,
  viewAllLink = '/search?scope=products',
  staticCards = false,
  showQuickView = false,
  useSlider = true,
  maxItems,
  onQuickAdd,
  className = '',
  subHeader,
}: ProductSectionProps) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const visibleProducts = typeof maxItems === 'number' ? products.slice(0, Math.max(0, maxItems)) : products;

  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <section className={`product-section container ${staticCards ? 'product-section-compact' : ''} ${className}`}>
      <div className="section-header">
        <div className="section-header-main">
          {eyebrow ? <span className="section-eyebrow">{eyebrow}</span> : null}
          <h2 className="section-title">{title}</h2>
        </div>
        <Link to={viewAllLink} className="view-all-link">{'Xem t\u1ea5t c\u1ea3'}</Link>
      </div>
      {subHeader ? <div className="section-subheader">{subHeader}</div> : null}

      {useSlider ? (
        <div className="slider-container">
          <button className="slider-nav prev-btn" onClick={scrollLeft} aria-label={'Tr\u01b0\u1edbc'}>
            <ChevronLeft size={24} />
          </button>

          <div className="product-grid slider-view" ref={sliderRef}>
            {visibleProducts.map((product) => (
              <div key={product.id} className="slider-item">
                <ProductCard {...product} staticMode={staticCards} showQuickView={showQuickView} onQuickAdd={onQuickAdd} />
              </div>
            ))}
          </div>

          <button className="slider-nav next-btn" onClick={scrollRight} aria-label="Sau">
            <ChevronRight size={24} />
          </button>
        </div>
      ) : (
        <div className="product-grid product-grid-static">
          {visibleProducts.map((product) => (
            <div key={product.id} className="grid-item">
              <ProductCard {...product} staticMode={staticCards} showQuickView={showQuickView} onQuickAdd={onQuickAdd} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ProductSection;
