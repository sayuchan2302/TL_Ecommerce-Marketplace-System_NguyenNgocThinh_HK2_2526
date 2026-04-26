import './FilterSidebar.css';
import { Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFilter } from '../../contexts/FilterContext';
import { CLIENT_DICTIONARY } from '../../utils/clientDictionary';
import {
  PRICE_RANGE_OPTIONS,
  formatGenderLabel,
  type ColorFacetOption,
} from '../../utils/productFilters';

interface FilterSidebarProps {
  selectedPriceRanges?: string[];
  selectedSizes?: string[];
  selectedColors?: string[];
  selectedGenders?: string[];
  selectedFits?: string[];
  selectedMaterials?: string[];
  sizeOptions?: string[];
  colorOptions?: ColorFacetOption[];
  genderOptions?: string[];
  fitOptions?: string[];
  materialOptions?: string[];
  onTogglePrice?: (id: string, checked: boolean) => void;
  onToggleSize?: (size: string, checked: boolean) => void;
  onToggleColor?: (color: string, checked: boolean) => void;
  onToggleGender?: (gender: string, checked: boolean) => void;
  onToggleFit?: (fit: string, checked: boolean) => void;
  onToggleMaterial?: (material: string, checked: boolean) => void;
}

const FALLBACK_SIZE_OPTIONS = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

const FALLBACK_COLOR_OPTIONS: ColorFacetOption[] = [
  { value: 'name:den', label: 'Đen', hex: '#111827', count: 1 },
  { value: 'name:xam', label: 'Xám', hex: '#9ca3af', count: 1 },
  { value: 'name:xanh navy', label: 'Xanh Navy', hex: '#1e3a8a', count: 1 },
  { value: 'name:do', label: 'Đỏ', hex: '#ef4444', count: 1 },
  { value: 'name:be', label: 'Be', hex: '#f5f5dc', count: 1 },
];
const COLLAPSED_SIZE_LIMIT = 9;
const COLOR_COLUMNS = 5;
const COLOR_ROWS = 4;
const COLOR_PAGE_SIZE = COLOR_COLUMNS * COLOR_ROWS;

const FilterSidebar = ({
  selectedPriceRanges,
  selectedSizes,
  selectedColors,
  selectedGenders,
  selectedFits,
  selectedMaterials,
  sizeOptions,
  colorOptions,
  genderOptions,
  fitOptions,
  materialOptions,
  onTogglePrice,
  onToggleSize,
  onToggleColor,
  onToggleGender,
  onToggleFit,
  onToggleMaterial,
}: FilterSidebarProps) => {
  const {
    filters,
    updatePriceRange,
    updateSize,
    updateColor,
    updateGender,
    updateFit,
    updateMaterial,
  } = useFilter();

  const [openSections, setOpenSections] = useState({
    price: true,
    size: true,
    color: true,
    gender: true,
    fit: true,
    material: true,
  });
  const [showAllSizes, setShowAllSizes] = useState(false);
  const [colorPageIndex, setColorPageIndex] = useState(0);

  const sectionIds = {
    price: 'filter-price',
    size: 'filter-size',
    color: 'filter-color',
    gender: 'filter-gender',
    fit: 'filter-fit',
    material: 'filter-material',
  } as const;

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const listingDict = CLIENT_DICTIONARY.listing;
  const selectedPrice = selectedPriceRanges ?? filters.priceRanges;
  const selectedSize = selectedSizes ?? filters.sizes;
  const selectedColor = selectedColors ?? filters.colors;
  const selectedGender = selectedGenders ?? filters.genders;
  const selectedFit = selectedFits ?? filters.fits;
  const selectedMaterial = selectedMaterials ?? filters.materials;

  const resolvedSizeOptions = sizeOptions && sizeOptions.length > 0 ? sizeOptions : FALLBACK_SIZE_OPTIONS;
  const resolvedColorOptions = colorOptions && colorOptions.length > 0 ? colorOptions : FALLBACK_COLOR_OPTIONS;
  const visibleSizeOptions = useMemo(() => {
    if (showAllSizes || resolvedSizeOptions.length <= COLLAPSED_SIZE_LIMIT) {
      return resolvedSizeOptions;
    }

    const selectedSet = new Set(selectedSize);
    const selectedRows = resolvedSizeOptions.filter((option) => selectedSet.has(option));
    const remainingRows = resolvedSizeOptions.filter((option) => !selectedSet.has(option));
    const remainingSlots = Math.max(0, COLLAPSED_SIZE_LIMIT - selectedRows.length);
    return [...selectedRows, ...remainingRows.slice(0, remainingSlots)];
  }, [showAllSizes, resolvedSizeOptions, selectedSize]);
  const hiddenSizeCount = Math.max(0, resolvedSizeOptions.length - visibleSizeOptions.length);
  const colorPageCount = Math.max(1, Math.ceil(resolvedColorOptions.length / COLOR_PAGE_SIZE));
  const activeColorPageIndex = colorPageIndex % colorPageCount;

  const visibleColorOptions = useMemo(() => {
    if (resolvedColorOptions.length <= COLOR_PAGE_SIZE) {
      return resolvedColorOptions;
    }

    const start = activeColorPageIndex * COLOR_PAGE_SIZE;
    return resolvedColorOptions.slice(start, start + COLOR_PAGE_SIZE);
  }, [resolvedColorOptions, activeColorPageIndex]);

  const handlePrice = (id: string, checked: boolean) => {
    if (onTogglePrice) {
      onTogglePrice(id, checked);
      return;
    }
    updatePriceRange(id, checked);
  };

  const handleSize = (size: string, checked: boolean) => {
    if (onToggleSize) {
      onToggleSize(size, checked);
      return;
    }
    updateSize(size, checked);
  };

  const handleColor = (color: string, checked: boolean) => {
    if (onToggleColor) {
      onToggleColor(color, checked);
      return;
    }
    updateColor(color, checked);
  };

  const handleGender = (gender: string, checked: boolean) => {
    if (onToggleGender) {
      onToggleGender(gender, checked);
      return;
    }
    updateGender(gender, checked);
  };

  const handleFit = (fit: string, checked: boolean) => {
    if (onToggleFit) {
      onToggleFit(fit, checked);
      return;
    }
    updateFit(fit, checked);
  };

  const handleMaterial = (material: string, checked: boolean) => {
    if (onToggleMaterial) {
      onToggleMaterial(material, checked);
      return;
    }
    updateMaterial(material, checked);
  };

  return (
    <div className="filter-sidebar">
      <div className="filter-header">
        <h3 className="filter-title">{listingDict.filters.label}</h3>
      </div>

      <div className="filter-section">
        <button
          type="button"
          className="filter-section-header"
          onClick={() => toggleSection('price')}
          aria-expanded={openSections.price}
          aria-controls={`${sectionIds.price}-content`}
        >
          <h4 className="filter-section-title">{listingDict.filters.priceLabel || 'Khoảng giá'}</h4>
          {openSections.price ? <Minus size={16} /> : <Plus size={16} />}
        </button>
        {openSections.price && (
          <div className="filter-section-content" id={`${sectionIds.price}-content`}>
            {PRICE_RANGE_OPTIONS.map((range) => (
              <label key={range.id} className="filter-checkbox-label">
                <input
                  type="checkbox"
                  className="filter-checkbox"
                  checked={selectedPrice.includes(range.id)}
                  onChange={(event) => handlePrice(range.id, event.target.checked)}
                />
                <span>{range.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="filter-section">
        <button
          type="button"
          className="filter-section-header"
          onClick={() => toggleSection('size')}
          aria-expanded={openSections.size}
          aria-controls={`${sectionIds.size}-content`}
        >
          <h4 className="filter-section-title">{listingDict.filters.sizeLabel || 'Kích cỡ'}</h4>
          {openSections.size ? <Minus size={16} /> : <Plus size={16} />}
        </button>
        {openSections.size && (
          <div className="filter-section-content" id={`${sectionIds.size}-content`}>
            <div className="size-grid">
              {visibleSizeOptions.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`size-btn ${selectedSize.includes(size) ? 'selected' : ''}`}
                  onClick={() => handleSize(size, !selectedSize.includes(size))}
                  aria-pressed={selectedSize.includes(size)}
                >
                  {size}
                </button>
              ))}
            </div>
            {(hiddenSizeCount > 0 || (showAllSizes && resolvedSizeOptions.length > COLLAPSED_SIZE_LIMIT)) && (
              <button
                type="button"
                className="filter-more-btn"
                onClick={() => setShowAllSizes((prev) => !prev)}
              >
                {showAllSizes ? 'Thu gọn kích cỡ' : 'Xem thêm'}
                {showAllSizes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="filter-section">
        <button
          type="button"
          className="filter-section-header"
          onClick={() => toggleSection('color')}
          aria-expanded={openSections.color}
          aria-controls={`${sectionIds.color}-content`}
        >
          <h4 className="filter-section-title">{listingDict.filters.colorLabel || 'Màu sắc'}</h4>
          {openSections.color ? <Minus size={16} /> : <Plus size={16} />}
        </button>
        {openSections.color && (
          <div className="filter-section-content" id={`${sectionIds.color}-content`}>
            <div className="color-grid">
              {visibleColorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`color-btn ${selectedColor.includes(color.value) ? 'selected' : ''}`}
                  style={{
                    backgroundColor: color.hex,
                    borderColor: selectedColor.includes(color.value)
                      ? '#2b56e6'
                      : (color.hex.toLowerCase() === '#ffffff' || color.hex.toLowerCase() === '#f8fafc'
                          ? 'var(--co-gray-300)'
                          : 'transparent'),
                  }}
                  onClick={() => handleColor(color.value, !selectedColor.includes(color.value))}
                  aria-pressed={selectedColor.includes(color.value)}
                  aria-label={color.label}
                  title={color.label}
                />
              ))}
            </div>
            {colorPageCount > 1 && (
              <button
                type="button"
                className="filter-more-btn filter-more-btn--swap"
                onClick={() => setColorPageIndex((prev) => (prev + 1) % colorPageCount)}
              >
                Đổi màu
              </button>
            )}
          </div>
        )}
      </div>

      {Boolean(genderOptions?.length) && (
        <div className="filter-section">
          <button
            type="button"
            className="filter-section-header"
            onClick={() => toggleSection('gender')}
            aria-expanded={openSections.gender}
            aria-controls={`${sectionIds.gender}-content`}
          >
            <h4 className="filter-section-title">Giới tính</h4>
            {openSections.gender ? <Minus size={16} /> : <Plus size={16} />}
          </button>
          {openSections.gender && (
            <div className="filter-section-content" id={`${sectionIds.gender}-content`}>
              <div className="facet-tag-list">
                {genderOptions?.map((gender) => (
                  <button
                    key={gender}
                    type="button"
                    className={`facet-tag-btn ${selectedGender.includes(gender) ? 'selected' : ''}`}
                    onClick={() => handleGender(gender, !selectedGender.includes(gender))}
                  >
                    {formatGenderLabel(gender)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {Boolean(fitOptions?.length) && (
        <div className="filter-section">
          <button
            type="button"
            className="filter-section-header"
            onClick={() => toggleSection('fit')}
            aria-expanded={openSections.fit}
            aria-controls={`${sectionIds.fit}-content`}
          >
            <h4 className="filter-section-title">Kiểu dáng</h4>
            {openSections.fit ? <Minus size={16} /> : <Plus size={16} />}
          </button>
          {openSections.fit && (
            <div className="filter-section-content" id={`${sectionIds.fit}-content`}>
              <div className="facet-tag-list">
                {fitOptions?.map((fit) => (
                  <button
                    key={fit}
                    type="button"
                    className={`facet-tag-btn ${selectedFit.includes(fit) ? 'selected' : ''}`}
                    onClick={() => handleFit(fit, !selectedFit.includes(fit))}
                  >
                    {fit}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {Boolean(materialOptions?.length) && (
        <div className="filter-section">
          <button
            type="button"
            className="filter-section-header"
            onClick={() => toggleSection('material')}
            aria-expanded={openSections.material}
            aria-controls={`${sectionIds.material}-content`}
          >
            <h4 className="filter-section-title">Chất liệu</h4>
            {openSections.material ? <Minus size={16} /> : <Plus size={16} />}
          </button>
          {openSections.material && (
            <div className="filter-section-content" id={`${sectionIds.material}-content`}>
              <div className="facet-tag-list">
                {materialOptions?.map((material) => (
                  <button
                    key={material}
                    type="button"
                    className={`facet-tag-btn ${selectedMaterial.includes(material) ? 'selected' : ''}`}
                    onClick={() => handleMaterial(material, !selectedMaterial.includes(material))}
                  >
                    {material}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterSidebar;
