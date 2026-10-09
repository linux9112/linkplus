/**
 * Client-side image validation and processing utilities.
 * Supports PNG transparency preservation, image resizing, and cropping.
 */

export interface ImageCropSettings {
  zoom: number; // 1 to 3
  offsetX: number; // in pixels
  offsetY: number; // in pixels
}

/**
 * Validates file type and size.
 */
export function validateImageFile(file: File, maxMb = 5): void {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type.toLowerCase())) {
    throw new Error('Please select a valid image file (PNG, JPG, WebP, or GIF).');
  }

  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is ${maxMb} MB.`);
  }
}

/**
 * Loads a File into an HTMLImageElement safely.
 */
export function loadImageElement(fileOrDataUri: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image. The file may be corrupt or an unsupported format.'));

    if (typeof fileOrDataUri === 'string') {
      img.src = fileOrDataUri;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = String(reader.result);
      };
      reader.onerror = () => reject(new Error('Failed to read file from disk.'));
      reader.readAsDataURL(fileOrDataUri);
    }
  });
}

/**
 * Processes and optimizes an image file to a base64 Data URI.
 * Preserves PNG transparency for logos and icons.
 */
export async function processImageFileToDataUri(
  file: File,
  maxDimension = 512,
  cropMode: 'contain' | 'cover' | 'square' = 'square'
): Promise<string> {
  validateImageFile(file, 5);

  const img = await loadImageElement(file);
  const canvas = document.createElement('canvas');

  const isPng = file.type === 'image/png';
  const outputMime = isPng ? 'image/png' : 'image/jpeg';
  const quality = isPng ? undefined : 0.88;

  if (cropMode === 'square') {
    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    const targetSize = Math.min(minDim, maxDimension);
    canvas.width = targetSize;
    canvas.height = targetSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not initialize canvas context');

    const sx = (img.naturalWidth - minDim) / 2;
    const sy = (img.naturalHeight - minDim) / 2;
    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
  } else if (cropMode === 'contain') {
    // Preserve entire image aspect ratio within bounding box
    const ratio = Math.min(maxDimension / img.naturalWidth, maxDimension / img.naturalHeight, 1);
    const targetW = Math.round(img.naturalWidth * ratio);
    const targetH = Math.round(img.naturalHeight * ratio);
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not initialize canvas context');
    ctx.drawImage(img, 0, 0, targetW, targetH);
  } else {
    // cover mode for banners/covers
    const aspect = 16 / 9;
    let sw = img.naturalWidth;
    let sh = img.naturalWidth / aspect;
    if (sh > img.naturalHeight) {
      sh = img.naturalHeight;
      sw = img.naturalHeight * aspect;
    }
    const targetW = Math.min(sw, maxDimension * 2);
    const targetH = Math.round(targetW / aspect);
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not initialize canvas context');
    const sx = (img.naturalWidth - sw) / 2;
    const sy = (img.naturalHeight - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
  }

  return canvas.toDataURL(outputMime, quality);
}

/**
 * Crops and zooms an image given user interactive settings.
 */
export async function cropImageWithSettings(
  imageSource: string | File,
  settings: ImageCropSettings,
  outputSize = 400,
  isPng = true
): Promise<string> {
  const img = await loadImageElement(imageSource);
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not initialize canvas context');

  const { zoom, offsetX, offsetY } = settings;
  const baseDim = Math.min(img.naturalWidth, img.naturalHeight);
  const cropDim = baseDim / Math.max(zoom, 1);

  // Center anchor with offsets
  const baseCenterX = img.naturalWidth / 2;
  const baseCenterY = img.naturalHeight / 2;

  const sx = Math.max(0, Math.min(img.naturalWidth - cropDim, baseCenterX - cropDim / 2 - offsetX));
  const sy = Math.max(0, Math.min(img.naturalHeight - cropDim, baseCenterY - cropDim / 2 - offsetY));

  ctx.drawImage(img, sx, sy, cropDim, cropDim, 0, 0, outputSize, outputSize);

  const outputMime = isPng ? 'image/png' : 'image/jpeg';
  return canvas.toDataURL(outputMime, isPng ? undefined : 0.88);
}
