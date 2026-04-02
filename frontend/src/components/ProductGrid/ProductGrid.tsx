import { useState, useEffect, useMemo } from 'react';
import './ProductGrid.css';
import ProductCard from '../ProductCard/ProductCard';
import ProductCardSkeleton from '../ProductCardSkeleton/ProductCardSkeleton';
import { productService } from '../../services/productService';
import { CLIENT_TEXT } from '../../utils/texts';
import { CLIENT_DICTIONARY } from '../../utils/clientDictionary';
import type { Product } from '../../types';
import { useClientViewState } from '../../hooks/useClientViewState';

const t = CLIENT_TEXT.filter;
const tListing = CLIENT_TEXT.productListing;

type SortKey = 'newest' | 'bestseller' | 'price-asc' | 'price-desc' | 'discount';

interface ProductGridViewState {
  priceRanges: string[];
  colors: string[];
  sortKey: SortKey;
  setSort: (value: SortKey) => void;
}

interface ProductGridProps {
  customResults?: Product[];
  viewState?: ProductGridViewState;
}

const ProductGrid = ({ customResults, viewState }: ProductGridProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [catalog, setCatalog] = useState<Product[]>(() => customResults || productService.list());
  const internalView = useClientViewState({ validSortKeys: ['newest', 'bestseller', 'price-asc', 'price-desc', 'discount'] });
  const view = viewState ?? internalView;

  useEffect(() => {
    let isMounted = true;

    const timer = setTimeout(() => {
      void (async () => {
        const nextCatalog = customResults || await productService.listPublic();
        if (!isMounted) {
          return;
        }
        setCatalog(nextCatalog);
        setIsLoading(false);
      })();
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [customResults]);

  const filteredProducts = useMemo(() => {
    let results = customResults || catalog;

    if (view.priceRanges.length > 0) {
      results = results.filter((product) => {
        return view.priceRanges.some((range) => {
          if (range === 'under-200k') return product.price < 200000;
          if (range === 'from-200k-500k') return product.price >= 200000 && product.price <= 500000;
          if (range === 'over-500k') return product.price > 500000;
          return false;
        });
      });
    }

    if (view.colors.length > 0) {
      results = results.filter((product) => {
        return product.colors && product.colors.some((colorHex) => view.colors.some((selectedColor) => selectedColor.toLowerCase() === colorHex.toLowerCase()));
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
  }, [view.priceRanges, view.colors, view.sortKey, customResults, catalog]);

  const totalProducts = customResults
    ? filteredProducts.length
    : filteredProducts.length;
  const dictionary = CLIENT_DICTIONARY.listing;

  return (
    <div className="product-grid-container">
      <div className="plp-toolbar">
        <div className="toolbar-left">
          <span className="results-count">
            {dictionary.resultsLabel.replace('{start}', '1').replace('{end}', String(filteredProducts.length)).replace('{total}', String(totalProducts))}
          </span>
        </div>
        <div className="toolbar-right">
          <label htmlFor="sort-select" className="sort-label">{t.sort.label}:</label>
          <select
            id="sort-select"
            className="sort-select"
            value={view.sortKey}
            onChange={(e) => view.setSort(e.target.value as SortKey)}
          >
            <option value="newest">{t.sort.newest}</option>
            <option value="bestseller">{t.sort.bestseller}</option>
            <option value="price-asc">{t.sort.priceAsc}</option>
            <option value="price-desc">{t.sort.priceDesc}</option>
            <option value="discount">{t.sort.discount}</option>
          </select>
        </div>
      </div>

      <div className="plp-grid">
        {isLoading
          ? Array.from({ length: 8 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))
          : filteredProducts.length > 0
          ? filteredProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))
          : (
              <div className="no-products">
                <p>{dictionary.empty}</p>
              </div>
            )}
      </div>

      <div className="plp-pagination">
        <button className="pagination-btn disabled">{tListing.prevPage}</button>
        <div className="pagination-numbers">
          <button className="page-number active">1</button>
          <button className="page-number">2</button>
          <button className="page-number">3</button>
          <span className="page-dots">...</span>
          <button className="page-number">10</button>
        </div>
        <button className="pagination-btn">{tListing.nextPage}</button>
      </div>
    </div>
  );
};

export default ProductGrid;
