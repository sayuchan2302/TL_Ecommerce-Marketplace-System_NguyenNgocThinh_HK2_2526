import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import FilterSidebar from '../../components/FilterSidebar/FilterSidebar';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import { useFilter } from '../../contexts/FilterContext';
import { marketplaceService } from '../../services/marketplaceService';
import type { Product } from '../../types';
import './ProductListing.css';
import { useClientViewState } from '../../hooks/useClientViewState';
import { CLIENT_TEXT } from '../../utils/texts';
import { CLIENT_DICTIONARY } from '../../utils/clientDictionary';

const PRICE_LABEL: Record<string, string> = {
  'under-200k': 'Dưới 200k',
  'from-200k-500k': '200k – 500k',
  'over-500k': 'Trên 500k',
};

const ProductListing = () => {
  const { id } = useParams<{ id: string }>();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const { setFiltersState } = useFilter();
  const view = useClientViewState({
    validSortKeys: ['newest', 'bestseller', 'price-asc', 'price-desc', 'discount'],
    defaultCategory: id || 'all',
  });

  // Mapper for category names in breadcrumbs/titles
  const categoryNames: Record<string, string> = {
    sale: CLIENT_TEXT.productListing.title,
    new: CLIENT_TEXT.productListing.title,
    men: 'Thời Trang Nam',
    women: 'Thời Trang Nữ',
    accessories: 'Phụ Kiện',
  };

  const dictionary = CLIENT_DICTIONARY.listing;
  const currentCategoryName = id && categoryNames[id] ? categoryNames[id] : dictionary.header.title;

  useEffect(() => {
    let cancelled = false;

    const loadCategoryProducts = async () => {
      setCategoryProducts([]);
      try {
        const resolvedCategory = (id || '').trim();
        const response = await marketplaceService.searchProducts(
          '',
          0,
          160,
          resolvedCategory && resolvedCategory !== 'all' && resolvedCategory !== 'sale' && resolvedCategory !== 'new'
            ? resolvedCategory
            : undefined,
        );

        const items = (response.items || []).filter((item) => {
          if (resolvedCategory === 'sale') {
            return typeof item.originalPrice === 'number' && item.originalPrice > item.price;
          }
          return true;
        });

        if (!cancelled) {
          setCategoryProducts(items);
        }
      } catch {
        if (!cancelled) {
          setCategoryProducts([]);
        }
      }
    };

    void loadCategoryProducts();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Sync filters <-> URL query params for deep linking
  useEffect(() => {
    setFiltersState({
      priceRanges: view.priceRanges,
      sizes: view.sizes,
      colors: view.colors,
      sortBy: view.sortKey,
    });
  }, [view.priceRanges, view.sizes, view.colors, view.sortKey, setFiltersState]);

  // Build active chips list
  const activeChips = [
    ...view.priceRanges.map((r) => ({
      key: `price-${r}`,
      label: PRICE_LABEL[r] || r,
      onRemove: () => view.togglePrice(r),
    })),
    ...view.sizes.map((s) => ({
      key: `size-${s}`,
      label: dictionary.chips.size.replace('{value}', s),
      onRemove: () => view.toggleSize(s),
    })),
    ...view.colors.map((c) => ({
      key: `color-${c}`,
      label: c,
      onRemove: () => view.toggleColor(c),
    })),
  ];

  return (
    <div className="plp-page">
      {/* Breadcrumbs */}
      <div className="breadcrumb-wrapper">
        <div className="container">
          <nav className="breadcrumbs">
            <Link to="/" className="breadcrumb-link">{dictionary.breadcrumbs.home}</Link>
            <ChevronRight size={14} className="breadcrumb-separator" />
            <span className="breadcrumb-current">{currentCategoryName || dictionary.breadcrumbs.all}</span>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container plp-container">
        {/* Page Title & Count */}
         <div className="plp-header">
           <h1 className="plp-title">{currentCategoryName || dictionary.header.title}</h1>
           <span className="plp-count">{dictionary.header.countSuffix}</span>
          </div>

        {/* Active Filter Chips */}
        {activeChips.length > 0 && (
          <div className="active-filters-bar">
             <span className="active-filters-label">{dictionary.activeFilters}</span>
            <div className="active-chips">
              {activeChips.map(chip => (
                <button key={chip.key} className="filter-chip" onClick={chip.onRemove}>
                  {chip.label}
                  <X size={13} />
                </button>
              ))}
            </div>
            <button className="clear-all-filters" onClick={() => view.reset()}>
               {dictionary.filters.clearAll}
              </button>
           </div>
          )}

        <div className="plp-layout">
          {/* Mobile Filter Toggle Button */}
          <button
            className="mobile-filter-btn"
            onClick={() => setIsMobileFilterOpen(true)}
          >
            <SlidersHorizontal size={18} />
            {dictionary.filters.label}
            {activeChips.length > 0 && (
              <span className="mobile-filter-badge">{activeChips.length}</span>
            )}
          </button>

          {/* Left Column: Filter Sidebar */}
          <aside className={`plp-sidebar ${isMobileFilterOpen ? 'is-open' : ''}`}>
            <div className="mobile-filter-header">
              <h3>{dictionary.filters.label}</h3>
              <button
                className="close-filter-btn"
                onClick={() => setIsMobileFilterOpen(false)}
              >
                <X size={24} />
              </button>
            </div>
            <div className="sidebar-content">
              <FilterSidebar
                selectedPriceRanges={view.priceRanges}
                selectedSizes={view.sizes}
                selectedColors={view.colors}
                onTogglePrice={(id) => view.togglePrice(id)}
                onToggleSize={(size) => view.toggleSize(size)}
                onToggleColor={(color) => view.toggleColor(color)}
                onReset={() => view.reset()}
              />
            </div>
          </aside>

          {/* Overlay when sidebar is open on mobile */}
          {isMobileFilterOpen && (
            <div
              className="filter-overlay"
              onClick={() => setIsMobileFilterOpen(false)}
            ></div>
          )}

          {/* Right Column: Main Content */}
          <main className="plp-main">
            <ProductGrid
              customResults={categoryProducts}
              viewState={{
                priceRanges: view.priceRanges,
                colors: view.colors,
                sortKey: view.sortKey,
                setSort: (value) => view.setSort(value),
              }}
            />
          </main>
        </div>
      </div>
    </div>
  );
};

export default ProductListing;
