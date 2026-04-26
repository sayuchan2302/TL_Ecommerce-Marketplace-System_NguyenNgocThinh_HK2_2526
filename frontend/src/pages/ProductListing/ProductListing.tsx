import { useEffect, useMemo, useState } from 'react';
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
import {
  collectFilterFacets,
  formatGenderLabel,
  getPriceRangeLabel,
} from '../../utils/productFilters';

const ProductListing = () => {
  const { id } = useParams<{ id: string }>();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const { setFiltersState } = useFilter();
  const view = useClientViewState({
    validSortKeys: ['newest', 'bestseller', 'price-asc', 'price-desc', 'discount'],
    defaultCategory: id || 'all',
  });

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

  useEffect(() => {
    setFiltersState({
      priceRanges: view.priceRanges,
      sizes: view.sizes,
      colors: view.colors,
      genders: view.genders,
      fits: view.fits,
      materials: view.materials,
      sortBy: view.sortKey,
    });
  }, [
    view.priceRanges,
    view.sizes,
    view.colors,
    view.genders,
    view.fits,
    view.materials,
    view.sortKey,
    setFiltersState,
  ]);

  const facets = useMemo(() => collectFilterFacets(categoryProducts), [categoryProducts]);
  const colorLabelByValue = useMemo(
    () => new Map(facets.colors.map((color) => [color.value, color.label])),
    [facets.colors],
  );

  const activeChips = [
    ...view.priceRanges.map((range) => ({
      key: `price-${range}`,
      label: getPriceRangeLabel(range),
      onRemove: () => view.togglePrice(range),
    })),
    ...view.sizes.map((size) => ({
      key: `size-${size}`,
      label: dictionary.chips.size.replace('{value}', size),
      onRemove: () => view.toggleSize(size),
    })),
    ...view.colors.map((color) => ({
      key: `color-${color}`,
      label: colorLabelByValue.get(color) || color,
      onRemove: () => view.toggleColor(color),
    })),
    ...view.genders.map((gender) => ({
      key: `gender-${gender}`,
      label: `Giới tính: ${formatGenderLabel(gender)}`,
      onRemove: () => view.toggleGender(gender),
    })),
    ...view.fits.map((fit) => ({
      key: `fit-${fit}`,
      label: `Dáng: ${fit}`,
      onRemove: () => view.toggleFit(fit),
    })),
    ...view.materials.map((material) => ({
      key: `material-${material}`,
      label: `Chất liệu: ${material}`,
      onRemove: () => view.toggleMaterial(material),
    })),
  ];

  return (
    <div className="plp-page">
      <div className="breadcrumb-wrapper">
        <div className="container">
          <nav className="breadcrumbs">
            <Link to="/" className="breadcrumb-link">{dictionary.breadcrumbs.home}</Link>
            <ChevronRight size={14} className="breadcrumb-separator" />
            <span className="breadcrumb-current">{currentCategoryName || dictionary.breadcrumbs.all}</span>
          </nav>
        </div>
      </div>

      <div className="container plp-container">
        <div className="plp-header">
          <h1 className="plp-title">{currentCategoryName || dictionary.header.title}</h1>
          <span className="plp-count">{dictionary.header.countSuffix}</span>
        </div>

        {activeChips.length > 0 && (
          <div className="active-filters-bar">
            <span className="active-filters-label">{dictionary.activeFilters}</span>
            <div className="active-chips">
              {activeChips.map((chip) => (
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
            <div
              className="filter-overlay"
              onClick={() => setIsMobileFilterOpen(false)}
            />
          )}

          <main className="plp-main">
            <ProductGrid
              customResults={categoryProducts}
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
      </div>
    </div>
  );
};

export default ProductListing;
