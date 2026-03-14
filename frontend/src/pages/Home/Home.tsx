import './Home.css';
import HeroSlider from '../../components/HeroSlider/HeroSlider';
import Categories from '../../components/Categories/Categories';
import CollectionsBanner from '../../components/CollectionsBanner/CollectionsBanner';
import ProductSection from '../../components/ProductSection/ProductSection';
import Testimonials from '../../components/Testimonials/Testimonials';
import TrustBadges from '../../components/TrustBadges/TrustBadges';
import Newsletter from '../../components/Newsletter/Newsletter';

// Mock Data — using Coolmate CDN for reliable images
export const mensFashion = [
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
    name: "Áo Thun Nam Excool Co Giãn 4 Chiều",
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
  }
];

const womensFashion = [
  {
    id: 201,
    name: "Váy Liền Nữ Cổ Khuy Thanh Lịch",
    price: 499000,
    originalPrice: 650000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/November2024/24CMCW.DK001.2_77.jpg",
    badge: "HOT",
    colors: ["#ffffff", "#000000", "#fbcfe8"]
  },
  {
    id: 202,
    name: "Áo Kiểu Nữ Croptop Năng Động",
    price: 259000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/November2024/24CMCW.DK002.4_59.jpg",
    colors: ["#ffffff", "#000000", "#fbcfe8"]
  },
  {
    id: 203,
    name: "Quần Ống Suông Nữ Hack Dáng",
    price: 389000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/November2024/24CMCW.DK003.1_24.jpg",
    colors: ["#374151", "#f3f4f6"]
  },
  {
    id: 204,
    name: "Áo Nỉ Hoodie Nữ Form Rộng",
    price: 399000,
    originalPrice: 450000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/November2024/24CMCW.AT005.1_30.jpg",
    colors: ["#d1d5db", "#000000"]
  },
  {
    id: 205,
    name: "Áo Khoác Blazer Nữ Tính",
    price: 699000,
    originalPrice: 899000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/November2024/24CMCW.AT012.1_50.jpg",
    colors: ["#000000", "#fcd34d"]
  },
  {
    id: 206,
    name: "Chân Váy Chữ A Tôn Dáng",
    price: 299000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/November2024/24CMCW.DK001.1_45.jpg",
    colors: ["#000000", "#ffffff"]
  },
  {
    id: 207,
    name: "Quần Shorts Nữ Đi Biển Xinh Xắn",
    price: 199000,
    originalPrice: 250000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/November2024/24CMCW.QT003.2_90.jpg",
    colors: ["#6b7280", "#000000"]
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

const Home = () => {
  return (
    <div className="home-page">
      <main className="main-content">
        <HeroSlider />
        <Categories />
        
        <ProductSection 
          title="THỜI TRANG NAM NỔI BẬT" 
          products={mensFashion} 
          viewAllLink="/mens-fashion" 
        />
        
        <CollectionsBanner />
        
        <ProductSection 
          title="THỜI TRANG NỮ THỊNH HÀNH" 
          products={womensFashion} 
          viewAllLink="/womens-fashion" 
        />
        
        <Testimonials />
        
        <Newsletter />
        <TrustBadges />
      </main>
    </div>
  );
};

export default Home;
