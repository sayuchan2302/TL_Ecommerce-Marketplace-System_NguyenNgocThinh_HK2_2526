import './ProductGrid.css';
import ProductCard from '../ProductCard/ProductCard';

// Temporary mock data mapping
const mockProducts = [
  {
    id: 101,
    name: "Áo Polo Nam Cotton Khử Mùi",
    price: 359000,
    originalPrice: 450000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/February2025/11025595_24_copy_11.jpg",
    badge: "MỚI",
    colors: ["#000000", "#ffffff", "#1e3a8a"]
  },
  {
    id: 102,
    name: "Quần Jeans Nam Dáng Straight Tôn Dáng",
    price: 599000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/February2025/11025595_31_copy_91.jpg",
    colors: ["#1e3a8a", "#6b7280"]
  },
  {
    id: 103,
    name: "Áo Sơ Mi Nam Vải Modal Thoáng Mát",
    price: 459000,
    originalPrice: 550000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/February2025/11025595_21.jpg",
    badge: "BEST SELLER"
  },
  {
    id: 104,
    name: "Quần Lót Nam Trunk Kháng Khuẩn",
    price: 129000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/February2025/11025595_17_copy.jpg",
    colors: ["#000000", "#f3f4f6"]
  },
  {
    id: 105,
    name: "Quần Shorts Nam Thể Thao Co Giãn",
    price: 249000,
    originalPrice: 299000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/November2024/24CMCW.AT012.2_72.jpg",
    colors: ["#000000", "#111827", "#4b5563"]
  },
  {
    id: 106,
    name: "Áo Khoác Gió Nam Chống Nước Nhẹ",
    price: 499000,
    originalPrice: 599000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/November2024/24CMCW.QT003.1_65.jpg",
    colors: ["#000000", "#1e3a8a"]
  },
  {
    id: 107,
    name: "Tất Cổ Thấp Khử Mùi Hôi (Pack 3)",
    price: 99000,
    originalPrice: 150000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/November2024/24CMCW.AT005.8_59.jpg",
    badge: "SALE"
  },
  {
    id: 108,
    name: "Bộ Đồ Mặc Nhà Nam Cotton Thoáng",
    price: 399000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/November2024/24CMCW.AT012.3_79.jpg",
    colors: ["#000000", "#4b5563"]
  },
  {
    id: 201,
    name: "Váy Liền Nữ Cổ Khuy Thanh Lịch",
    price: 499000,
    originalPrice: 650000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/November2024/24CMCW.DK001.2_77.jpg",
    badge: "HOT"
  },
  {
    id: 202,
    name: "Áo Kiểu Nữ Croptop Năng Động",
    price: 259000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/November2024/24CMCW.DK002.4_59.jpg",
    colors: ["#ffffff", "#000000", "#fbcfe8"]
  },
  {
    id: 204,
    name: "Áo Nỉ Hoodie Nữ Form Rộng",
    price: 399000,
    originalPrice: 450000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/November2024/24CMCW.AT005.1_30.jpg",
  },
  {
    id: 208,
    name: "Áo Dây Cami Lụa Mát Mẻ",
    price: 159000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/November2024/24CMCW.AT005.5_88.jpg",
    badge: "MỚI",
    colors: ["#ffffff", "#fbcfe8"]
  }
];

const ProductGrid = () => {
  return (
    <div className="product-grid-container">
      {/* Toolbar: Sort & Views */}
      <div className="plp-toolbar">
        <div className="toolbar-left">
          <span className="results-count">Hiển thị 1 - 12 của 120 sản phẩm</span>
        </div>
        <div className="toolbar-right">
          <label htmlFor="sort-select" className="sort-label">Sắp xếp theo:</label>
          <select id="sort-select" className="sort-select">
            <option value="newest">Mới nhất</option>
            <option value="bestseller">Bán chạy nhất</option>
            <option value="price-asc">Giá: Thấp đến cao</option>
            <option value="price-desc">Giá: Cao đến thấp</option>
            <option value="discount">Giảm giá nhiều nhất</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="plp-grid">
        {mockProducts.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>

      {/* Pagination */}
      <div className="plp-pagination">
        <button className="pagination-btn disabled">Trang trước</button>
        <div className="pagination-numbers">
          <button className="page-number active">1</button>
          <button className="page-number">2</button>
          <button className="page-number">3</button>
          <span className="page-dots">...</span>
          <button className="page-number">10</button>
        </div>
        <button className="pagination-btn">Trang sau</button>
      </div>
    </div>
  );
};

export default ProductGrid;
