import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, ChevronRight, Clock, Trash2, X, Search as SearchIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FilterSidebar from '../../components/FilterSidebar/FilterSidebar';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import EmptySearchState from '../../components/EmptySearchState/EmptySearchState';
import { searchService } from '../../services/searchService';
import { CLIENT_TEXT } from '../../utils/texts';
import { useClientViewState } from '../../hooks/useClientViewState';
import './Search.css';

const t = CLIENT_TEXT.search;

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const view = useClientViewState({ validSortKeys: ['newest', 'bestseller', 'price-asc', 'price-desc', 'discount'] });

  const history = searchService.getRecentSearches();

  const searchResults = useMemo(() => {
    if (!query) return [];
    return searchService.search(query, 100);
  }, [query]);

  const filteredResults = useMemo(() => {
    if (!query) return [];
    let results = [...searchResults];

    if (view.priceRanges.length > 0) {
      results = results.filter(product => {
        return view.priceRanges.some(range => {
          if (range === 'under-200k') return product.price < 200000;
          if (range === 'from-200k-500k') return product.price >= 200000 && product.price <= 500000;
          if (range === 'over-500k') return product.price > 500000;
          return false;
        });
      });
    }

    if (view.colors.length > 0) {
      const colorMap: Record<string, string> = {
        'Đen': '#000000',
        'Trắng': '#ffffff',
        'Xám': '#9ca3af',
        'Xanh Navy': '#1e3a8a',
        'Đỏ': '#ef4444',
        'Be': '#f5f5dc'
      };
      results = results.filter(product => {
        return product.colors && product.colors.some(colorHex =>
          view.colors.some(selectedColor =>
            (colorMap[selectedColor] || '').toLowerCase() === colorHex.toLowerCase()
          )
        );
      });
    }

    switch (view.sortKey) {
      case 'price-asc':
        results = [...results].sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        results = [...results].sort((a, b) => b.price - a.price);
        break;
      case 'discount':
        results = [...results].sort((a, b) => {
          const discountA = a.originalPrice ? ((a.originalPrice - a.price) / a.originalPrice) * 100 : 0;
          const discountB = b.originalPrice ? ((b.originalPrice - b.price) / b.originalPrice) * 100 : 0;
          return discountB - discountA;
        });
        break;
      case 'newest':
      case 'bestseller':
      default:
        break;
    }

    return results;
  }, [query, searchResults, view.priceRanges, view.colors, view.sortKey]);

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
    setSearchParams({ q: keyword });
  };

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
                      <Clock size={16} /> {t.dropdown.recentSearches}
                    </h3>
                    <button className="search-clear-btn" onClick={clearHistory}>
                      {t.dropdown.clearAll}
                    </button>
                  </div>
                  <div className="search-history-list">
                    {history.slice(0, 5).map(item => (
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
                          onClick={(e) => {
                            e.stopPropagation();
                            removeHistoryItem(item);
                          }}
                        >
                          <Trash2 size={14} />
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
                  {searchService.getPopularKeywords().map((kw, i) => (
                    <motion.button
                      key={kw}
                      className="search-keyword-chip"
                      onClick={() => handleKeywordClick(kw)}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05, duration: 0.2 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {kw}
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
              {filteredResults.length === 0 && searchResults.length === 0 ? (
                <EmptySearchState query={query} />
              ) : (
                <>
                  <div className="plp-header">
                    <h1 className="plp-title">
                      {t.page.resultsFor(query)}
                    </h1>
                    <span className="plp-count">
                      ({t.page.productCount(filteredResults.length || searchResults.length)})
                    </span>
                  </div>

                  <div className="plp-layout">
                    <motion.button
                      className="mobile-filter-btn"
                      onClick={() => setIsMobileFilterOpen(true)}
                      whileTap={{ scale: 0.98 }}
                    >
                      <SlidersHorizontal size={18} />
                      {CLIENT_TEXT.filter.title}
                    </motion.button>

                    <aside className={`plp-sidebar ${isMobileFilterOpen ? 'is-open' : ''}`}>
                      <div className="mobile-filter-header">
                        <h3>{CLIENT_TEXT.filter.title}</h3>
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
                          onTogglePrice={(id, _checked) => view.togglePrice(id)}
                          onToggleSize={(size, _checked) => view.toggleSize(size)}
                          onToggleColor={(color, _checked) => view.toggleColor(color)}
                          onReset={() => view.reset()}
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
                        customResults={filteredResults.length > 0 ? filteredResults : searchResults}
                        viewState={{
                          priceRanges: view.priceRanges,
                          colors: view.colors,
                          sortKey: view.sortKey,
                          setSort: (value) => view.setSort(value),
                        }}
                      />
                    </main>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Search;
