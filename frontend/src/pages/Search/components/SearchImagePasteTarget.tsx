import type { ClipboardEventHandler, ReactNode, RefObject } from 'react';
import { ImagePlus } from 'lucide-react';

interface SearchImagePasteTargetProps {
  ariaLabel: string;
  title: string;
  description: ReactNode;
  className?: string;
  pasteTargetRef: RefObject<HTMLDivElement | null>;
  onClick: () => void;
  onPaste: ClipboardEventHandler<HTMLDivElement>;
}

const SearchImagePasteTarget = ({
  ariaLabel,
  title,
  description,
  className = '',
  pasteTargetRef,
  onClick,
  onPaste,
}: SearchImagePasteTargetProps) => (
  <div
    ref={pasteTargetRef}
    className={`search-image-paste ${className}`.trim()}
    tabIndex={0}
    role="button"
    onClick={onClick}
    onPaste={onPaste}
    aria-label={ariaLabel}
  >
    <div className="search-image-paste__icon">
      <ImagePlus size={18} aria-hidden="true" />
    </div>
    <div className="search-image-paste__content">
      <div className="search-image-paste__title">{title}</div>
      <div className="search-image-paste__desc">{description}</div>
    </div>
  </div>
);

export default SearchImagePasteTarget;
