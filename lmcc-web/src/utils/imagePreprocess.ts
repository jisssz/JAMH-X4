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

/**
 * Creates an upscaled high-definition version of an image for detecting small fine-print declarations.
 */
export async function createUpscaledImage(
  imageFileOrBlob: Blob | File,
  scale: number = 2.0
): Promise<Blob> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
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

      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;

      // Cap max dimension to 3200px to keep browser WebAssembly memory usage safe
      const targetScale = Math.min(scale, 3200 / Math.max(origW, origH));
      const width = Math.round(origW * Math.max(1.0, targetScale));
      const height = Math.round(origH * Math.max(1.0, targetScale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageFileOrBlob);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Apply light contrast enhancement to accentuate glyph edges
      applyPreprocessingFilters(ctx, width, height, 'standard', true);

      canvas.toBlob(
        (blob) => resolve(blob || imageFileOrBlob),
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

export interface ImageTile {
  name: string;
  blob: Blob;
  bounds: { x: number; y: number; width: number; height: number };
}

/**
 * Generates overlapping region tiles from a package photograph.
 * Ensures small text in corners, side panels, and margins is recognized without edge cutoffs.
 */
export async function createOverlappingTiles(
  imageFileOrBlob: Blob | File
): Promise<ImageTile[]> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return [];
  }

  return new Promise((resolve) => {
    const img = new Image();
    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(imageFileOrBlob);
    } catch {
      resolve([]);
      return;
    }

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);

      const W = img.naturalWidth || img.width;
      const H = img.naturalHeight || img.height;

      // If image is already tiny, tiles won't help
      if (W < 400 || H < 400) {
        resolve([]);
        return;
      }

      // Define 5 overlapping tiles with 60% span (20% overlap across center)
      // 1. Top half / header
      // 2. Bottom half / footer (where MRP, Date, Net Qty usually reside)
      // 3. Left side panel (where Manufacturer, Address usually reside)
      // 4. Right side panel (where Consumer Care, Nutritional tables reside)
      // 5. Central declaration window
      const tileConfigs = [
        { name: 'bottom_panel', x: 0, y: Math.round(H * 0.4), w: W, h: Math.round(H * 0.6) },
        { name: 'top_panel', x: 0, y: 0, w: W, h: Math.round(H * 0.6) },
        { name: 'left_column', x: 0, y: 0, w: Math.round(W * 0.65), h: H },
        { name: 'right_column', x: Math.round(W * 0.35), y: 0, w: Math.round(W * 0.65), h: H },
        { name: 'center_core', x: Math.round(W * 0.15), y: Math.round(H * 0.2), w: Math.round(W * 0.7), h: Math.round(H * 0.6) },
      ];

      const tiles: ImageTile[] = [];
      let pending = tileConfigs.length;

      tileConfigs.forEach((config) => {
        const canvas = document.createElement('canvas');
        canvas.width = config.w;
        canvas.height = config.h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          pending--;
          if (pending === 0) resolve(tiles);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, config.x, config.y, config.w, config.h, 0, 0, config.w, config.h);
        applyPreprocessingFilters(ctx, config.w, config.h, 'standard', true);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              tiles.push({
                name: config.name,
                blob,
                bounds: { x: config.x, y: config.y, width: config.w, height: config.h },
              });
            }
            pending--;
            if (pending === 0) resolve(tiles);
          },
          'image/jpeg',
          0.92
        );
      });
    };

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve([]);
    };

    img.src = objectUrl;
  });
}

