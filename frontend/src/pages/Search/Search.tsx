import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, ChevronRight, Clock, Trash2, X, Search as SearchIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FilterSidebar from '../../components/FilterSidebar/FilterSidebar';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import EmptySearchState from '../../components/EmptySearchState/EmptySearchState';
import { searchService } from '../../services/searchService';
import { CLIENT_TEXT } from '../../utils/texts';
import { useClientViewState } from '../../hooks/useClientViewState';
import { marketplaceService, type MarketplaceStoreCard } from '../../services/marketplaceService';
import type { Product } from '../../types';
import {
  collectFilterFacets,
  filterProducts,
  type ProductFilterState,
} from '../../utils/productFilters';
import './Search.css';

const t = CLIENT_TEXT.search;
type SearchScope = 'products' | 'stores';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const scope: SearchScope = searchParams.get('scope') === 'stores' ? 'stores' : 'products';
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [storeResults, setStoreResults] = useState<MarketplaceStoreCard[]>([]);
  const view = useClientViewState({ validSortKeys: ['newest', 'bestseller', 'price-asc', 'price-desc', 'discount'] });
  const history = searchService.getRecentSearches();

  useEffect(() => {
    let cancelled = false;

    const fetchResults = async () => {
      if (!query.trim()) {
        setProductResults([]);
        setStoreResults([]);
        return;
      }

      setIsSearching(true);
      try {
        if (scope === 'stores') {
          const response = await marketplaceService.searchStores(query, 0, 60);
          if (!cancelled) {
            setStoreResults(response.items);
            setProductResults([]);
          }
        } else {
          const response = await marketplaceService.searchProducts(query, 0, 120);
          if (!cancelled) {
            setProductResults(response.items);
            setStoreResults([]);
          }
        }
      } catch {
        if (!cancelled) {
          setProductResults([]);
          setStoreResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    };

    void fetchResults();
    return () => {
      cancelled = true;
    };
  }, [query, scope]);

  const filteredResults = useMemo(() => {
    if (!query || scope !== 'products') return [];
    const filterState: ProductFilterState = {
      priceRanges: view.priceRanges,
      sizes: view.sizes,
      colors: view.colors,
      genders: view.genders,
      fits: view.fits,
      materials: view.materials,
    };
    return filterProducts(productResults, filterState);
  }, [
    query,
    scope,
    productResults,
    view.priceRanges,
    view.sizes,
    view.colors,
    view.genders,
    view.fits,
    view.materials,
  ]);

  const facets = useMemo(() => collectFilterFacets(productResults), [productResults]);
  const activeFilterCount = (
    view.priceRanges.length
    + view.sizes.length
    + view.colors.length
    + view.genders.length
    + view.fits.length
    + view.materials.length
  );

  const clearHistory = () => {
    searchService.clearHistory();
    window.location.reload();
  };

  const removeHistoryItem = (keyword: string) => {
    searchService.removeFromHistory(keyword);
    window.location.reload();
  };

  const handleKeywordClick = (keyword: string) => {
    searchService.addToHistory(keyword);
    const params = new URLSearchParams();
    params.set('q', keyword);
    params.set('scope', scope);
    setSearchParams(params);
  };

  const handleScopeChange = (nextScope: SearchScope) => {
    const params = new URLSearchParams(searchParams);
    params.set('scope', nextScope);
    if (query.trim()) params.set('q', query.trim());
    setSearchParams(params);
  };

  const hasNoResults = scope === 'stores'
    ? storeResults.length === 0
    : filteredResults.length === 0;

  return (
    <div className="search-page">
      <div className="breadcrumb-wrapper">
        <div className="container">
          <nav className="breadcrumbs">
            <Link to="/" className="breadcrumb-link">{CLIENT_TEXT.common.breadcrumb.home}</Link>
            <ChevronRight size={14} className="breadcrumb-separator" />
            <span className="breadcrumb-current">{CLIENT_TEXT.common.actions.search}</span>
          </nav>
        </div>
      </div>

      <div className="search-page-container container">
        <AnimatePresence mode="wait">
          {!query ? (
            <motion.div
              key="landing"
              className="search-landing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {history.length > 0 && (
                <div className="search-history-section">
                  <div className="search-section-header">
                    <h3 className="search-section-title">
                      <Clock size={16} aria-hidden="true" /> {t.dropdown.recentSearches}
                    </h3>
                    <button className="search-clear-btn" onClick={clearHistory} aria-label={t.dropdown.clearAll}>
                      {t.dropdown.clearAll}
                    </button>
                  </div>
                  <div className="search-history-list">
                    {history.slice(0, 5).map((item) => (
                      <motion.div
                        key={item}
                        className="search-history-item"
                        onClick={() => handleKeywordClick(item)}
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.15 }}
                      >
                        <span className="search-history-text">{item}</span>
                        <button
                          className="search-history-del"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeHistoryItem(item);
                          }}
                          aria-label={`Xóa "${item}" khỏi lịch sử`}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="search-popular">
                <h3 className="search-section-title">
                  <SearchIcon size={16} /> {t.dropdown.popularKeywords}
                </h3>
                <div className="search-keywords">
                  {searchService.getPopularKeywords().map((keyword, index) => (
                    <motion.button
                      key={keyword}
                      className="search-keyword-chip"
                      onClick={() => handleKeywordClick(keyword)}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {keyword}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              className="search-results-section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="plp-header">
                <h1 className="plp-title">{t.page.resultsFor(query)}</h1>
                <span className="plp-count">
                  {scope === 'stores'
                    ? `(${storeResults.length} cửa hàng)`
                    : `(${t.page.productCount(filteredResults.length)})`}
                </span>
              </div>

              <div className="search-scope-switch">
                <button
                  className={scope === 'products' ? 'active' : ''}
                  onClick={() => handleScopeChange('products')}
                >
                  Sản phẩm
                </button>
                <button
                  className={scope === 'stores' ? 'active' : ''}
                  onClick={() => handleScopeChange('stores')}
                >
                  Cửa hàng
                </button>
              </div>

              {isSearching ? (
                <div className="search-loading-state">Đang tìm kiếm...</div>
              ) : hasNoResults ? (
                scope === 'products'
                  ? <EmptySearchState query={query} />
                  : <div className="store-empty-state"><p>Không tìm thấy cửa hàng phù hợp cho "{query}".</p></div>
              ) : scope === 'stores' ? (
                <div className="store-results-grid">
                  {storeResults.map((store) => (
                    <Link key={store.id} to={`/store/${store.slug}`} className="store-result-card">
                      <img src={store.logo} alt={store.name} className="store-result-logo" />
                      <div className="store-result-meta">
                        <div className="store-result-code">{store.storeCode}</div>
                        <div className="store-result-name">{store.name}</div>
                        <div className="store-result-sub">
                          <span>★ {store.rating.toFixed(1)}</span>
                          <span>{store.totalOrders} đơn</span>
                          <span>{store.liveProductCount} sản phẩm</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="plp-layout">
                  <motion.button
                    className="mobile-filter-btn"
                    onClick={() => setIsMobileFilterOpen(true)}
                    whileTap={{ scale: 0.98 }}
                  >
                    <SlidersHorizontal size={18} aria-hidden="true" />
                    {CLIENT_TEXT.filter.title}
                    {activeFilterCount > 0 && (
                      <span className="mobile-filter-badge">{activeFilterCount}</span>
                    )}
                  </motion.button>

                  <aside className={`plp-sidebar ${isMobileFilterOpen ? 'is-open' : ''}`}>
                    <div className="mobile-filter-header">
                      <h3>{CLIENT_TEXT.filter.title}</h3>
                      <button
                        className="close-filter-btn"
                        onClick={() => setIsMobileFilterOpen(false)}
                        aria-label="Đóng bộ lọc"
                      >
                        <X size={24} aria-hidden="true" />
                      </button>
                    </div>
                    <div className="sidebar-content">
                      <FilterSidebar
                        selectedPriceRanges={view.priceRanges}
                        selectedSizes={view.sizes}
                        selectedColors={view.colors}
                        selectedGenders={view.genders}
                        selectedFits={view.fits}
                        selectedMaterials={view.materials}
                        sizeOptions={facets.sizes}
                        colorOptions={facets.colors}
                        genderOptions={facets.genders}
                        fitOptions={facets.fits}
                        materialOptions={facets.materials}
                        onTogglePrice={(range) => view.togglePrice(range)}
                        onToggleSize={(size) => view.toggleSize(size)}
                        onToggleColor={(color) => view.toggleColor(color)}
                        onToggleGender={(gender) => view.toggleGender(gender)}
                        onToggleFit={(fit) => view.toggleFit(fit)}
                        onToggleMaterial={(material) => view.toggleMaterial(material)}
                      />
                    </div>
                  </aside>

                  {isMobileFilterOpen && (
                    <motion.div
                      className="filter-overlay"
                      onClick={() => setIsMobileFilterOpen(false)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}

                  <main className="plp-main">
                    <ProductGrid
                      customResults={productResults}
                      itemsPerPage={12}
                      scrollToTopOnPageChange
                      viewState={{
                        priceRanges: view.priceRanges,
                        sizes: view.sizes,
                        colors: view.colors,
                        genders: view.genders,
                        fits: view.fits,
                        materials: view.materials,
                        sortKey: view.sortKey,
                        setSort: (value) => view.setSort(value),
                      }}
                    />
                  </main>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Search;
