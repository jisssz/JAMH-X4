/**
 * Client-side image preprocessing utility for OCR optimization.
 * Keeps memory low and enhances character definition without altering the original image.
 * Provides multiple preprocessing modes: 'standard', 'high_contrast', and 'grayscale'.
 */

export type PreprocessMode = 'standard' | 'high_contrast' | 'grayscale';

export interface PreprocessOptions {
  maxWidth?: number;
  maxHeight?: number;
  mode?: PreprocessMode;
  enhanceContrast?: boolean;
}

function applyPreprocessingFilters(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: PreprocessMode,
  enhanceContrast: boolean
): void {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;

    if (mode === 'high_contrast') {
      // Grayscale + High-contrast binarization curve
      // Enhances faint dot-matrix printing and stamped MFD/MRP on foil/metallic packaging
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        const contrast = 1.6; // +60% aggressive contrast
        const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
        let adjusted = factor * (lum - 128) + 128;
        if (adjusted < 0) adjusted = 0;
        if (adjusted > 255) adjusted = 255;

        d[i] = adjusted;
        d[i + 1] = adjusted;
        d[i + 2] = adjusted;
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (mode === 'grayscale') {
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        d[i] = lum;
        d[i + 1] = lum;
        d[i + 2] = lum;
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (enhanceContrast) {
      // Standard balanced contrast adjustment (+15%)
      const contrast = 1.15;
      const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

      for (let i = 0; i < d.length; i += 4) {
        d[i] = factor * (d[i] - 128) + 128;
        d[i + 1] = factor * (d[i + 1] - 128) + 128;
        d[i + 2] = factor * (d[i + 2] - 128) + 128;
      }
      ctx.putImageData(imgData, 0, 0);
    }
  } catch {
    // If cross-origin or ImageData fails, proceed with raw canvas render
  }
}

export async function preprocessImageForOcr(
  imageFileOrBlob: Blob | File,
  options: PreprocessOptions = {}
): Promise<Blob> {
  const {
    maxWidth = 2048,
    maxHeight = 2048,
    mode = 'standard',
    enhanceContrast = true,
  } = options;

  // In non-browser environments (e.g., node test runners), return raw blob safely
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return imageFileOrBlob;
  }

  // 1. Preferred modern path: createImageBitmap with explicit EXIF orientation handling
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(imageFileOrBlob, { imageOrientation: 'from-image' });
      let width = bitmap.width;
      let height = bitmap.height;

      // Scale down if image is gigantic (e.g., 48MP phone sensor) to avoid browser WASM memory limits
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        applyPreprocessingFilters(ctx, width, height, mode, enhanceContrast);

        return await new Promise<Blob>((resolve) => {
          canvas.toBlob(
            (blob) => resolve(blob || imageFileOrBlob),
            'image/jpeg',
            0.92
          );
        });
      }
      bitmap.close();
    } catch {
      // Fall through to Image element fallback
    }
  }

  if (typeof Image === 'undefined') {
    return imageFileOrBlob;
  }

  return new Promise((resolve) => {
    const img = new Image();
    let objectUrl: string | null = null;

    try {
      objectUrl = URL.createObjectURL(imageFileOrBlob);
    } catch {
      resolve(imageFileOrBlob);
      return;
    }

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Scale down if image is gigantic (e.g., 48MP phone sensor) to avoid browser WASM memory limits
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to raw blob if 2D context is unavailable
        resolve(imageFileOrBlob);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      applyPreprocessingFilters(ctx, width, height, mode, enhanceContrast);

      canvas.toBlob(
        (blob) => {
          resolve(blob || imageFileOrBlob);
        },
        'image/jpeg',
        0.92
      );
    };

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(imageFileOrBlob);
    };

    img.src = objectUrl;
  });
}
