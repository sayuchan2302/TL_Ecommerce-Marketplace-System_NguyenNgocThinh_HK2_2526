const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const ABSOLUTE_URL_PATTERN = /^(?:https?:)?\/\//i;
const DATA_IMAGE_PATTERN = /^data:image\//i;

export const resolveAvatarSrc = (avatar?: string | null): string | undefined => {
  const value = avatar?.trim();
  if (!value) {
    return undefined;
  }

  if (ABSOLUTE_URL_PATTERN.test(value) || DATA_IMAGE_PATTERN.test(value)) {
    return value;
  }

  const looksLikeFilePath = value.startsWith('/')
    || value.includes('/')
    || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(value);
  if (!looksLikeFilePath) {
    return undefined;
  }

  if (value.startsWith('/')) {
    return API_BASE ? `${API_BASE}${value}` : value;
  }

  return API_BASE ? `${API_BASE}/${value}` : value;
};
