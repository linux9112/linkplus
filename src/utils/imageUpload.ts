/**
 * Client-side image processor that validates an uploaded image file,
 * center-crops it to a square, resizes to maxSize x maxSize, and exports
 * a compact base64 Data URI suitable for fast upload and MySQL persistence.
 */
export async function processImageFileToDataUri(
  file: File,
  maxSize = 400
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file (JPG, PNG, WebP, or GIF).');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image file is too large (max 10 MB).');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Selected file could not be decoded as an image.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const minDim = Math.min(img.width, img.height);
          const targetDim = Math.min(minDim, maxSize);
          canvas.width = targetDim;
          canvas.height = targetDim;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(String(reader.result));
            return;
          }

          // Center-crop square
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetDim, targetDim);

          const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const quality = outputType === 'image/jpeg' ? 0.86 : undefined;
          const dataUri = canvas.toDataURL(outputType, quality);
          resolve(dataUri);
        } catch (err) {
          reject(err);
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
