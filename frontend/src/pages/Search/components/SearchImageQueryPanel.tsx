import { ImagePlus, RotateCcw } from 'lucide-react';

interface SearchImageQueryPanelProps {
  fileName: string;
  previewUrl: string;
  totalCandidates: number;
  isLoading?: boolean;
  onPickImage: () => void;
  onClear: () => void;
}

const SearchImageQueryPanel = ({
  fileName,
  previewUrl,
  totalCandidates,
  isLoading = false,
  onPickImage,
  onClear,
}: SearchImageQueryPanelProps) => (
  <div className="search-visual-query">
    <div className="search-visual-query__preview">
      <img src={previewUrl} alt={fileName} />
    </div>
    <div className="search-visual-query__meta">
      <div className="search-visual-query__label">Ảnh đang dùng để tìm kiếm</div>
      <div className="search-visual-query__name">{fileName}</div>
      <div className="search-visual-query__sub">
        {isLoading ? 'Đang phân tích ảnh và tìm sản phẩm phù hợp...' : `${totalCandidates} kết quả phù hợp`}
      </div>
      {isLoading && (
        <div className="search-visual-query__status" role="status" aria-live="polite">
          <span className="search-visual-query__status-spinner" aria-hidden="true" />
          Hệ thống đang xử lý ảnh của bạn
        </div>
      )}
    </div>
    <div className="search-visual-query__actions">
      <button
        type="button"
        className="search-visual-query__button"
        onClick={onPickImage}
        disabled={isLoading}
      >
        <ImagePlus size={16} aria-hidden="true" />
        Chọn ảnh khác
      </button>
      <button
        type="button"
        className="search-visual-query__button search-visual-query__button--ghost"
        onClick={onClear}
        disabled={isLoading}
      >
        <RotateCcw size={16} aria-hidden="true" />
        Xóa tìm kiếm ảnh
      </button>
    </div>
  </div>
);

export default SearchImageQueryPanel;
