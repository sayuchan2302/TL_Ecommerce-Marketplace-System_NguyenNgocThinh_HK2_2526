import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Store } from 'lucide-react';
import './Home.css';
import HeroSlider from '../../components/HeroSlider/HeroSlider';
import Categories from '../../components/Categories/Categories';
import ProductSection from '../../components/ProductSection/ProductSection';
import FlashSaleSection, { type FlashSaleItem } from '../../components/FlashSaleSection/FlashSaleSection';
import TrustBadges from '../../components/TrustBadges/TrustBadges';
import { mensFashion, womensFashion } from '../../mocks/products';
import Skeleton from '../../components/Skeleton/Skeleton';
import { marketplaceService, type MarketplaceStoreCard } from '../../services/marketplaceService';

interface HomeSectionProduct {
  id: number | string;
  sku?: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  badge?: string;
  colors?: string[];
  sizes?: string[];
  backendId?: string;
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  isOfficialStore?: boolean;
}

const fallbackFeaturedProducts: HomeSectionProduct[] = mensFashion.map((product) => ({ ...product }));
const fallbackTrendingProducts: HomeSectionProduct[] = womensFashion.map((product) => ({ ...product }));

const fallbackTopVendors: MarketplaceStoreCard[] = [
  {
    id: 'store-coolmate-mall',
    name: 'Coolmate Mall',
    storeCode: 'SHOP-CM-001',
    slug: 'coolmate-mall',
    logo: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=200&auto=format&fit=crop',
    rating: 4.9,
    totalOrders: 12450,
    liveProductCount: 380,
  },
  {
    id: 'store-thinh-fashion',
    name: 'Thịnh Fashion Shop',
    storeCode: 'SHOP-TF-028',
    slug: 'thinh-fashion',
    logo: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?q=80&w=200&auto=format&fit=crop',
    rating: 4.8,
    totalOrders: 8520,
    liveProductCount: 211,
  },
  {
    id: 'store-mina-boutique',
    name: 'Mina Boutique',
    storeCode: 'SHOP-MB-104',
    slug: 'mina-boutique',
    logo: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=200&auto=format&fit=crop',
    rating: 4.7,
    totalOrders: 6150,
    liveProductCount: 174,
  },
  {
    id: 'store-athleisure-pro',
    name: 'Athleisure Pro',
    storeCode: 'SHOP-AP-233',
    slug: 'athleisure-pro',
    logo: 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=200&auto=format&fit=crop',
    rating: 4.8,
    totalOrders: 7040,
    liveProductCount: 145,
  },
];

const Home = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [featuredStores, setFeaturedStores] = useState<MarketplaceStoreCard[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<HomeSectionProduct[]>(fallbackFeaturedProducts);
  const [trendingProducts, setTrendingProducts] = useState<HomeSectionProduct[]>(fallbackTrendingProducts);

  useEffect(() => {
    let mounted = true;

    const loadHomeData = async () => {
      try {
        const data = await marketplaceService.getHomeData();
        if (!mounted) {
          return;
        }

        setFeaturedStores(data.featuredStores);
        setFeaturedProducts(data.featuredProducts.length > 0 ? data.featuredProducts : fallbackFeaturedProducts);
        setTrendingProducts(data.trendingProducts.length > 0 ? data.trendingProducts : fallbackTrendingProducts);
      } catch {
        if (!mounted) {
          return;
        }

        setFeaturedStores([]);
        setFeaturedProducts(fallbackFeaturedProducts);
        setTrendingProducts(fallbackTrendingProducts);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadHomeData();
    return () => {
      mounted = false;
    };
  }, []);

  const flashSaleProducts = useMemo(() => {
    const uniqueById = new Map<string, HomeSectionProduct>();
    [...featuredProducts, ...trendingProducts].forEach((product) => {
      uniqueById.set(String(product.id), product);
    });

    const discountedProducts = [...uniqueById.values()].filter(
      (product) => typeof product.originalPrice === 'number' && product.originalPrice > product.price,
    );

    if (discountedProducts.length > 0) {
      return discountedProducts.slice(0, 12);
    }

    return featuredProducts.slice(0, 12);
  }, [featuredProducts, trendingProducts]);

  const flashSaleItems = useMemo<FlashSaleItem[]>(
    () =>
      flashSaleProducts.map((product, index) => {
        const totalStock = 80 + (index % 7) * 20;
        const soldRate = 0.35 + (index % 5) * 0.1;
        const soldCount = Math.min(totalStock - 2, Math.max(1, Math.round(totalStock * soldRate)));

        return {
          id: product.id,
          name: product.name,
          image: product.image,
          price: product.price,
          originalPrice: product.originalPrice,
          storeName: product.storeName || 'Nhà bán',
          soldCount,
          totalStock,
          badge: product.isOfficialStore ? 'MALL' : 'SALE',
        };
      }),
    [flashSaleProducts],
  );

  const topVendors = useMemo(() => {
    if (featuredStores.length > 0) {
      return featuredStores.slice(0, 4);
    }
    return fallbackTopVendors;
  }, [featuredStores]);

  return (
    <div className="home-page">
      <main className="main-content">
        {isLoading ? (
          <div className="home-loading">
            <div className="hero-skeleton">
              <Skeleton type="rectangular" height={500} />
            </div>
            <div className="categories-skeleton">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} type="circular" width={80} height={80} />
              ))}
            </div>
            <div className="product-section-skeleton">
              <Skeleton type="text" width={240} height={28} />
              <div className="product-grid-skeleton">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="product-card-skeleton">
                    <Skeleton type="rectangular" height={280} />
                    <Skeleton type="text" width="80%" />
                    <Skeleton type="text" width="40%" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <HeroSlider />

            <Categories featuredStores={featuredStores} showFeaturedStores={false} />

            <FlashSaleSection items={flashSaleItems} />

            <section className="top-vendor-section container">
              <div className="top-vendor-head">
                <div className="top-vendor-title-wrap">
                  <span className="top-vendor-eyebrow">
                    <Store size={14} />
                    Top Vendor
                  </span>
                  <h2>Nhà bán nổi bật trên sàn</h2>
                </div>
                <Link to="/search?scope=stores" className="top-vendor-view-all">
                  Xem tất cả
                </Link>
              </div>

              <div className="top-vendor-grid">
                {topVendors.map((store) => (
                  <Link key={store.id} to={`/store/${store.slug}`} className="top-vendor-card">
                    <img src={store.logo} alt={store.name} className="top-vendor-logo" />
                    <div className="top-vendor-meta">
                      <span className="top-vendor-code">{store.storeCode}</span>
                      <span className="top-vendor-name">{store.name}</span>
                      <div className="top-vendor-stats">
                        <span className="top-vendor-rating">
                          <Star size={12} fill="currentColor" />
                          {store.rating.toFixed(1)}
                        </span>
                        <span>{store.totalOrders.toLocaleString('vi-VN')} đơn</span>
                        <span>{store.liveProductCount.toLocaleString('vi-VN')} sản phẩm</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <ProductSection
              title="GỢI Ý HÔM NAY"
              products={trendingProducts}
              viewAllLink="/search?scope=products"
            />

            <TrustBadges />
          </>
        )}
      </main>
    </div>
  );
};

export default Home;
