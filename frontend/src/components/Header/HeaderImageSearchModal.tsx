import { ImagePlus, X } from 'lucide-react';
import type { ClipboardEventHandler } from 'react';

interface HeaderImageSearchModalProps {
  isOpen: boolean;
  imageSearchDraft: {
    file: File;
    previewUrl: string;
  } | null;
  onClose: () => void;
  onPickImage: () => void;
  onPaste: ClipboardEventHandler<HTMLDivElement>;
  onConfirm: () => void;
}

const HeaderImageSearchModal = ({
  isOpen,
  imageSearchDraft,
  onClose,
  onPickImage,
  onPaste,
  onConfirm,
}: HeaderImageSearchModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="header-image-modal-overlay" onClick={onClose}>
      <div
        className="header-image-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Tìm kiếm bằng hình ảnh"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="header-image-modal-close"
          onClick={onClose}
          aria-label="Đóng"
        >
          <X size={18} />
        </button>

        <div className="header-image-modal-head">
          <span className="header-image-modal-eyebrow">Image Search</span>
          <h3 className="header-image-modal-title">Tìm kiếm sản phẩm bằng hình ảnh</h3>
          <p className="header-image-modal-desc">
            Dán ảnh từ clipboard hoặc tải ảnh từ máy lên. Sau khi xem lại ảnh, nhấn{' '}
            <strong>Tìm kiếm</strong> để bắt đầu.
          </p>
        </div>

        <div
          className={`header-image-dropzone ${imageSearchDraft ? 'has-preview' : ''}`}
          tabIndex={0}
          role="button"
          onClick={imageSearchDraft ? undefined : onPickImage}
          onPaste={onPaste}
          aria-label="Dán ảnh hoặc chọn ảnh để tìm kiếm"
        >
          {imageSearchDraft ? (
            <>
              <div className="header-image-dropzone-preview">
                <img src={imageSearchDraft.previewUrl} alt={imageSearchDraft.file.name} />
              </div>
              <div className="header-image-dropzone-meta">
                <div className="header-image-dropzone-label">Ảnh xem trước</div>
                <div className="header-image-dropzone-name">{imageSearchDraft.file.name}</div>
                <div className="header-image-dropzone-size">
                  {(imageSearchDraft.file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="header-image-dropzone-icon">
                <ImagePlus size={28} />
              </div>
              <div className="header-image-dropzone-title">Dán ảnh vào đây hoặc chọn ảnh từ máy</div>
              <div className="header-image-dropzone-text">
                Hỗ trợ ảnh từ clipboard với <strong>Ctrl+V</strong> hoặc <strong>Cmd+V</strong>.
              </div>
            </>
          )}
        </div>

        <div className="header-image-modal-actions">
          <button type="button" className="header-image-modal-btn secondary" onClick={onPickImage}>
            <ImagePlus size={16} />
            {imageSearchDraft ? 'Chọn ảnh khác' : 'Tải ảnh từ máy'}
          </button>
          <button type="button" className="header-image-modal-btn ghost" onClick={onClose}>
            Hủy
          </button>
          <button
            type="button"
            className="header-image-modal-btn primary"
            onClick={onConfirm}
            disabled={!imageSearchDraft}
          >
            Tìm kiếm
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeaderImageSearchModal;
