import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import ProductGallery from '../../components/ProductGallery/ProductGallery';
import ProductInfo from '../../components/ProductInfo/ProductInfo';
import ProductActions from '../../components/ProductActions/ProductActions';
import ProductDescription from '../../components/ProductDescription/ProductDescription';
import ProductSection from '../../components/ProductSection/ProductSection';
import ProductDetailSkeleton from '../../components/ProductDetailSkeleton/ProductDetailSkeleton';
import './ProductDetail.css';

const mockProduct = {
  id: 101,
  name: "Áo Polo Nam Cotton Khử Mùi",
  category: "Thời Trang Nam",
  categorySlug: "men",
  images: [
    "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/February2025/11025595_24_copy_11.jpg",
    "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/February2025/11025595_31_copy_91.jpg",
    "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/February2025/11025595_21.jpg",
    "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/February2025/11025595_17_copy.jpg"
  ],
  price: 299000,
  originalPrice: 399000,
  rating: 4.9,
  sold: 12500,
  colors: [
    { name: 'Đen', hex: '#000000' },
    { name: 'Xanh Navy', hex: '#000080' },
    { name: 'Xám', hex: '#808080' },
    { name: 'Trắng', hex: '#FFFFFF' }
  ],
  sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL']
};

const relatedProducts = [
  {
    id: 102,
    name: "Áo Thun Nam Thể Thao",
    price: 159000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/February2025/11025595_24_copy_11.jpg",
    colors: ['#000000', '#FFFFFF', '#000080']
  },
  {
    id: 103,
    name: "Quần Short Nam Màu Đen",
    price: 199000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/February2025/11025595_17_copy.jpg",
    colors: ['#000000']
  },
  {
    id: 104,
    name: "Ví Da Nam Cao Cấp",
    price: 349000,
    originalPrice: 450000,
    badge: "SALE",
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/February2025/11025595_21.jpg",
    colors: ['#8B4513', '#000000']
  },
  {
    id: 105,
    name: "Mũ Lưỡi Trai Logo",
    price: 99000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/February2025/11025595_31_copy_91.jpg",
    colors: ['#000080', '#000000', '#FF0000']
  }
];

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const product = { ...mockProduct, id: id ? parseInt(id) : mockProduct.id };

  // Selected variant state lifted up here so ProductActions can use it
  const [selectedColor, setSelectedColor] = useState(product.colors[0]?.name ?? '');
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] ?? '');
  const [isLoading, setIsLoading] = useState(true);

  // Simulate API fetch delay
  useEffect(() => {
    // Scroll to top when PDP mounts or ID changes
    window.scrollTo(0, 0);
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [id]);

  if (isLoading) {
    return (
      <div className="pdp-page">
        <div className="container pdp-container">
          <ProductDetailSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="pdp-page">
      {/* Breadcrumbs */}
      <div className="breadcrumb-wrapper">
        <div className="container">
          <nav className="breadcrumbs">
            <Link to="/" className="breadcrumb-link">Trang Chủ</Link>
            <ChevronRight size={14} className="breadcrumb-separator" />
            <Link to={`/category/${product.categorySlug}`} className="breadcrumb-link">{product.category}</Link>
            <ChevronRight size={14} className="breadcrumb-separator" />
            <span className="breadcrumb-current">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container pdp-container">
        
        {/* Above the Fold: 2 Columns */}
        <div className="pdp-top-section">
          {/* Left Column: Gallery */}
          <div className="pdp-gallery-col">
            <ProductGallery images={product.images} />
          </div>
          
          {/* Right Column: Info & Actions */}
          <div className="pdp-info-col">
            <ProductInfo
              product={product}
              onVariantChange={(color, size) => {
                setSelectedColor(color);
                setSelectedSize(size);
              }}
            />
            <ProductActions
              product={{
                id: product.id,
                name: product.name,
                price: product.price,
                originalPrice: product.originalPrice,
                image: product.images[0],
              }}
              selectedColor={selectedColor}
              selectedSize={selectedSize}
            />
            <div className="pd-size-help">
              <p className="pd-size-text">Phân vân size? Xem bảng size hoặc nhờ CSKH tư vấn.</p>
              <div className="pd-size-links">
                <Link to="/size-guide" className="pd-size-link">Bảng size</Link>
                <Link to="/contact" className="pd-size-link">Nhờ tư vấn</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Below the Fold: Description Tabs & Related Products */}
        <div className="pdp-bottom-section">
           <ProductDescription />
           
           <div className="related-products-section">
             <ProductSection title="Sản Phẩm Bạn Có Thể Thích" products={relatedProducts} />
           </div>
        </div>

      </div>
    </div>
  );
};

export default ProductDetail;
