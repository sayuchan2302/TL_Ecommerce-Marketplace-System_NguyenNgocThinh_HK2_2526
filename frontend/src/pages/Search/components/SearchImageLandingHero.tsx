import { ImagePlus } from 'lucide-react';
import type { ClipboardEventHandler, RefObject } from 'react';
import SearchImagePasteTarget from './SearchImagePasteTarget';

interface SearchImageLandingHeroProps {
  pasteTargetRef: RefObject<HTMLDivElement | null>;
  onPickImage: () => void;
  onFocusPasteTarget: () => void;
  onPaste: ClipboardEventHandler<HTMLDivElement>;
}

const SearchImageLandingHero = ({
  pasteTargetRef,
  onPickImage,
  onFocusPasteTarget,
  onPaste,
}: SearchImageLandingHeroProps) => (
  <>
    <div className="search-image-entry">
      <div className="search-image-entry__content">
        <span className="search-image-entry__eyebrow">Image Search</span>
        <h3 className="search-image-entry__title">Tìm sản phẩm bằng hình ảnh</h3>
        <p className="search-image-entry__desc">
          Tải lên ảnh sản phẩm để hệ thống tìm các mẫu tương tự đang bán trên sàn.
        </p>
      </div>
      <button className="search-image-entry__button" onClick={onPickImage}>
        <ImagePlus size={18} aria-hidden="true" />
        Chọn ảnh để tìm
      </button>
    </div>

    <SearchImagePasteTarget
      ariaLabel="Dán ảnh từ clipboard để tìm kiếm"
      title="Dán ảnh từ clipboard"
      description={(
        <>
          Copy ảnh rồi nhấn <strong>Ctrl+V</strong> hoặc <strong>Cmd+V</strong> tại đây để tìm kiếm nhanh hơn.
        </>
      )}
      pasteTargetRef={pasteTargetRef}
      onClick={onFocusPasteTarget}
      onPaste={onPaste}
    />
  </>
);

export default SearchImageLandingHero;
