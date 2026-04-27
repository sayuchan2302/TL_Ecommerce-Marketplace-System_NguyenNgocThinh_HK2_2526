import { memo, type ReactNode } from 'react';
import { Star, TicketPercent } from 'lucide-react';
import ProductCardGrid from '../../../components/ProductCardGrid/ProductCardGrid';
import type { Coupon } from '../../../services/couponService';
import type { Review } from '../../../services/reviewService';
import type { StoreProduct } from '../../../services/storeService';

export type PaginationToken = number | 'ellipsis-left' | 'ellipsis-right';

const formatCurrency = (value: number) => `${Math.max(0, Number(value || 0)).toLocaleString('vi-VN')}đ`;

const getProductLink = (product: StoreProduct) => product.slug || product.sku || String(product.id);

interface StorefrontProductGridProps {
  rows: StoreProduct[];
  storeName: string;
  emptyMessage?: string;
}

export interface BrowseTabContentProps {
  vouchers: Coupon[];
  isAuthenticated: boolean;
  claimedVoucherIds: Set<string>;
  claimingVoucherId: string | null;
  onClaimVoucher: (voucher: Coupon) => void;
  storeName: string;
  bannerUrl: string;
  topSellingProducts: StoreProduct[];
}

export interface ProductsTabContentProps {
  productTotal: number;
  productPage: number;
  productTotalPages: number;
  productPageItems: StoreProduct[];
  productPageLoading: boolean;
  paginationTokens: PaginationToken[];
  storeName: string;
  onPageChange: (nextPage: number) => void;
}

export interface CategoriesTabContentProps {
  categoryLoading: boolean;
  groupedByCategory: Array<{ name: string; rows: StoreProduct[] }>;
}

export interface ReviewsTabContentProps {
  reviews: Review[];
}

export interface StorefrontTabPanelProps {
  active: boolean;
  panelRef: (node: HTMLDivElement | null) => void;
  children: ReactNode;
}

const StorefrontProductGrid = memo(({
  rows,
  storeName,
  emptyMessage = 'Hiện chưa có sản phẩm công khai.',
}: StorefrontProductGridProps) => {
  if (rows.length === 0) {
    return <p className="storefront-empty">{emptyMessage}</p>;
  }

  return (
    <div className="storefront-product-grid-container">
      <ProductCardGrid
        items={rows}
        className="storefront-product-grid"
        getItemKey={(product) => `${product.id}-${product.sku}`}
        mapItemToCardProps={(product) => ({
          id: getProductLink(product),
          sku: product.sku,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          image: product.image,
          badge: product.badge,
          colors: product.colors,
          sizes: product.sizes,
          variants: product.variants,
          backendId: product.backendId,
          storeId: product.storeId,
          storeName: product.storeName || storeName,
          storeSlug: product.storeSlug,
          isOfficialStore: product.isOfficialStore,
        })}
      />
    </div>
  );
});
StorefrontProductGrid.displayName = 'StorefrontProductGrid';

export const BrowseTabContent = memo(({
  vouchers,
  isAuthenticated,
  claimedVoucherIds,
  claimingVoucherId,
  onClaimVoucher,
  storeName,
  bannerUrl,
  topSellingProducts,
}: BrowseTabContentProps) => (
  <>
    <div className="storefront-panel">
      <h2>Voucher cửa hàng</h2>
      {vouchers.length === 0 ? (
        <p className="storefront-empty">Hiện chưa có voucher công khai cho gian hàng này.</p>
      ) : (
        <div className="storefront-voucher-list">
          {vouchers.slice(0, 10).map((voucher) => {
            const voucherId = String(voucher.id || '').trim();
            const isClaimed = voucherId ? claimedVoucherIds.has(voucherId) : false;
            const isClaiming = voucherId !== '' && claimingVoucherId === voucherId;
            const claimLabel = !isAuthenticated
              ? 'Đăng nhập để nhận'
              : isClaiming
                ? 'Đang nhận...'
                : isClaimed
                  ? 'Đã nhận'
                  : 'Nhận';

            return (
              <article key={voucher.id || voucher.code} className="storefront-voucher">
                <div className="storefront-voucher-cut storefront-voucher-cut-left" />
                <div className="storefront-voucher-cut storefront-voucher-cut-right" />
                <div className="storefront-voucher-content">
                  <div>
                    <p className="storefront-voucher-code">{voucher.code}</p>
                    <p className="storefront-voucher-text">
                      {voucher.type === 'percent'
                        ? `Giảm ${voucher.value}%`
                        : `Giảm ${formatCurrency(voucher.value)}`}
                    </p>
                    <p className="storefront-voucher-meta">
                      Đơn tối thiểu {formatCurrency(voucher.minOrderValue || 0)}
                    </p>
                  </div>
                  <TicketPercent size={18} />
                </div>
                <div className="storefront-voucher-actions">
                  <button
                    type="button"
                    className={`storefront-voucher-claim ${isClaimed ? 'is-claimed' : ''}`}
                    disabled={isClaiming || isClaimed || !voucherId}
                    onClick={() => onClaimVoucher(voucher)}
                  >
                    {claimLabel}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>

    <div className="storefront-panel storefront-campaign">
      <img
        src={bannerUrl}
        alt={storeName}
        className="storefront-campaign-image"
        loading="lazy"
      />
      <div className="storefront-campaign-overlay" />
      <div className="storefront-campaign-content">
        <p>Campaign</p>
        <h3>Ưu đãi nổi bật tại {storeName}</h3>
        <span>Mua sắm an tâm với chính sách bảo vệ từ sàn.</span>
      </div>
    </div>

    <div className="storefront-panel">
      <div className="storefront-panel-head">
        <h2>Sản phẩm được quan tâm</h2>
        <span>{topSellingProducts.length} sản phẩm</span>
      </div>
      <StorefrontProductGrid rows={topSellingProducts} storeName={storeName} />
    </div>
  </>
));
BrowseTabContent.displayName = 'BrowseTabContent';

export const ProductsTabContent = memo(({
  productTotal,
  productPage,
  productTotalPages,
  productPageItems,
  productPageLoading,
  paginationTokens,
  storeName,
  onPageChange,
}: ProductsTabContentProps) => (
  <div className="storefront-panel">
    <div className="storefront-panel-head">
      <h2>Tất cả sản phẩm</h2>
      <span>{productTotal} sản phẩm</span>
    </div>
    <StorefrontProductGrid rows={productPageItems} storeName={storeName} />
    <p className="storefront-page-summary">
      Trang {productPage}/{productTotalPages} - {productTotal} sản phẩm
      {productPageLoading ? ' - Đang tải...' : ''}
    </p>
    {productTotalPages > 1 ? (
      <div className="storefront-pagination">
        <button
          type="button"
          className="storefront-page-btn"
          onClick={() => onPageChange(Math.max(1, productPage - 1))}
          disabled={productPageLoading || productPage === 1}
        >
          Trước
        </button>
        <div className="storefront-page-list" aria-label="Pagination">
          {paginationTokens.map((token) => (
            typeof token === 'number' ? (
              <button
                key={token}
                type="button"
                className={`storefront-page-btn ${productPage === token ? 'is-active' : ''}`}
                onClick={() => onPageChange(token)}
                disabled={productPageLoading}
                aria-current={productPage === token ? 'page' : undefined}
              >
                {token}
              </button>
            ) : (
              <span key={token} className="storefront-page-ellipsis" aria-hidden="true">
                ...
              </span>
            )
          ))}
        </div>
        <button
          type="button"
          className="storefront-page-btn"
          onClick={() => onPageChange(Math.min(productTotalPages, productPage + 1))}
          disabled={productPageLoading || productPage === productTotalPages}
        >
          Sau
        </button>
      </div>
    ) : null}
  </div>
));
ProductsTabContent.displayName = 'ProductsTabContent';

export const CategoriesTabContent = memo(({
  categoryLoading,
  groupedByCategory,
}: CategoriesTabContentProps) => (
  <div className="storefront-panel">
    <div className="storefront-panel-head">
      <h2>Danh mục của cửa hàng</h2>
      <span>{groupedByCategory.length} danh mục</span>
    </div>
    {categoryLoading ? (
      <p className="storefront-empty">Đang tải danh mục...</p>
    ) : groupedByCategory.length === 0 ? (
      <p className="storefront-empty">Hiện chưa có danh mục có sản phẩm.</p>
    ) : (
      <div className="storefront-category-list">
        {groupedByCategory.map((group) => (
          <div key={group.name} className="storefront-category-item">
            <p className="storefront-category-name">{group.name}</p>
            <span className="storefront-category-count">{group.rows.length} sản phẩm</span>
          </div>
        ))}
      </div>
    )}
  </div>
));
CategoriesTabContent.displayName = 'CategoriesTabContent';

export const ReviewsTabContent = memo(({ reviews }: ReviewsTabContentProps) => (
  <div className="storefront-panel">
    <div className="storefront-panel-head">
      <h2>Đánh giá khách hàng</h2>
      <span>{reviews.length} đánh giá</span>
    </div>

    {reviews.length === 0 ? (
      <p className="storefront-empty">Cửa hàng chưa có đánh giá công khai.</p>
    ) : (
      <div className="storefront-review-list">
        {reviews.slice(0, 20).map((review) => (
          <article key={review.id} className="storefront-review-item">
            <div className="storefront-review-head">
              <p>{review.productName}</p>
              <span>{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
            </div>
            <div className="storefront-review-stars">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Star key={`${review.id}-${idx}`} size={14} fill={idx < review.rating ? 'currentColor' : 'none'} />
              ))}
            </div>
            <p className="storefront-review-content">{review.content}</p>
          </article>
        ))}
      </div>
    )}
  </div>
));
ReviewsTabContent.displayName = 'ReviewsTabContent';

export const StorefrontTabPanel = ({ active, panelRef, children }: StorefrontTabPanelProps) => (
  <div
    ref={panelRef}
    className={`storefront-tab-panel ${active ? 'is-active' : ''}`}
    aria-hidden={!active}
  >
    {children}
  </div>
);
