let pendingImageSearchFile: File | null = null;

export const extractImageFileFromClipboard = (clipboardData: DataTransfer | null): File | null => {
  if (!clipboardData) {
    return null;
  }

  const items = Array.from(clipboardData.items || []);
  for (const item of items) {
    if (!item.type.toLowerCase().startsWith('image/')) {
      continue;
    }

    const file = item.getAsFile();
    if (file) {
      return file;
    }
  }

  return null;
};

export const imageSearchSession = {
  setPendingFile(file: File) {
    pendingImageSearchFile = file;
  },
  hasPendingFile() {
    return pendingImageSearchFile !== null;
  },
  consumePendingFile() {
    const file = pendingImageSearchFile;
    pendingImageSearchFile = null;
    return file;
  },
};
