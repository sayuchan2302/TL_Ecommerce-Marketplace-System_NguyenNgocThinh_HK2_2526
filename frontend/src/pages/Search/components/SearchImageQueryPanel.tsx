import { ImagePlus, RotateCcw } from 'lucide-react';
import type { ClipboardEventHandler, RefObject } from 'react';
import SearchImagePasteTarget from './SearchImagePasteTarget';

interface SearchImageQueryPanelProps {
  fileName: string;
  previewUrl: string;
  totalCandidates: number;
  pasteTargetRef: RefObject<HTMLDivElement | null>;
  onPickImage: () => void;
  onFocusPasteTarget: () => void;
  onClear: () => void;
  onPaste: ClipboardEventHandler<HTMLDivElement>;
}

const SearchImageQueryPanel = ({
  fileName,
  previewUrl,
  totalCandidates,
  pasteTargetRef,
  onPickImage,
  onFocusPasteTarget,
  onClear,
  onPaste,
}: SearchImageQueryPanelProps) => (
  <>
    <div className="search-visual-query">
      <div className="search-visual-query__preview">
        <img src={previewUrl} alt={fileName} />
      </div>
      <div className="search-visual-query__meta">
        <div className="search-visual-query__label">Ảnh đang dùng để tìm kiếm</div>
        <div className="search-visual-query__name">{fileName}</div>
        <div className="search-visual-query__sub">{totalCandidates} kết quả phù hợp</div>
      </div>
      <div className="search-visual-query__actions">
        <button type="button" className="search-visual-query__button" onClick={onPickImage}>
          <ImagePlus size={16} aria-hidden="true" />
          Chọn ảnh khác
        </button>
        <button type="button" className="search-visual-query__button" onClick={onFocusPasteTarget}>
          <ImagePlus size={16} aria-hidden="true" />
          Dán ảnh khác
        </button>
        <button
          type="button"
          className="search-visual-query__button search-visual-query__button--ghost"
          onClick={onClear}
        >
          <RotateCcw size={16} aria-hidden="true" />
          Xóa tìm kiếm ảnh
        </button>
      </div>
    </div>

    <SearchImagePasteTarget
      ariaLabel="Dán ảnh khác từ clipboard để tìm kiếm"
      title="Dán ảnh khác từ clipboard"
      description="Bạn có thể paste trực tiếp ảnh mới tại đây thay vì phải mở file từ máy."
      className="search-image-paste--compact"
      pasteTargetRef={pasteTargetRef}
      onClick={onFocusPasteTarget}
      onPaste={onPaste}
    />
  </>
);

export default SearchImageQueryPanel;
