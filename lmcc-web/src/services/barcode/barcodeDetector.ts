import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

export interface BarcodeDetectionResult {
  rawValue: string;
  format: string;
  gs1Country?: string;
  sourcePanelId?: string;
  sourcePanelLabel?: string;
}

/**
 * Maps known GS1 barcode prefix ranges to issuing national member organizations.
 * Under Legal Metrology Rule 6, understanding the GS1 country prefix provides context
 * on the issuing GS1 national organization where the barcode was registered.
 * NOTE: GS1 prefix assignment designates the company registration member organization,
 * NOT conclusive proof of where the physical product was manufactured.
 */
export function getGs1Country(barcode: string): string | undefined {
  const digits = barcode.replace(/\D/g, '');
  if (digits.length < 3) return undefined;

  const prefix3 = parseInt(digits.substring(0, 3), 10);
  const prefix2 = parseInt(digits.substring(0, 2), 10);

  if (prefix3 === 890) return 'GS1 numbering-organization prefix associated with GS1 India';
  if (prefix3 >= 891 && prefix3 <= 899) return 'GS1 numbering-organization prefix associated with South Asia / Regional';
  if (prefix2 >= 0 && prefix2 <= 13) return 'GS1 numbering-organization prefix associated with GS1 US & Canada';
  if (prefix3 >= 300 && prefix3 <= 379) return 'GS1 numbering-organization prefix associated with GS1 France';
  if (prefix3 >= 400 && prefix3 <= 440) return 'GS1 numbering-organization prefix associated with GS1 Germany';
  if ((prefix3 >= 450 && prefix3 <= 459) || (prefix3 >= 490 && prefix3 <= 499)) return 'GS1 numbering-organization prefix associated with GS1 Japan';
  if (prefix3 >= 500 && prefix3 <= 509) return 'GS1 numbering-organization prefix associated with GS1 United Kingdom';
  if (prefix3 >= 690 && prefix3 <= 699) return 'GS1 numbering-organization prefix associated with GS1 China';
  if (prefix3 >= 760 && prefix3 <= 769) return 'GS1 numbering-organization prefix associated with GS1 Switzerland';
  if (prefix3 >= 800 && prefix3 <= 839) return 'GS1 numbering-organization prefix associated with GS1 Italy';
  if (prefix3 >= 840 && prefix3 <= 849) return 'GS1 numbering-organization prefix associated with GS1 Spain';
  if (prefix3 === 880) return 'GS1 numbering-organization prefix associated with GS1 South Korea';
  if (prefix3 === 885) return 'GS1 numbering-organization prefix associated with GS1 Thailand';
  if (prefix3 === 888) return 'GS1 numbering-organization prefix associated with GS1 Singapore';
  if (prefix3 >= 930 && prefix3 <= 939) return 'GS1 numbering-organization prefix associated with GS1 Australia';

  return undefined;
}

/**
 * Creates an HTMLImageElement from a Blob with safety timeout.
 */
function createImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load timed out'));
    }, 4000);
    img.onload = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function createScaledCanvas(img: HTMLImageElement, maxDim: number = 1400): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (w > maxDim || h > maxDim) {
    if (w > h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
  }
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(img, 0, 0, w, h);
  }
  return canvas;
}

function rotateCanvas(sourceCanvas: HTMLCanvasElement, angle: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  if (angle === 90 || angle === 270) {
    canvas.width = sourceCanvas.height;
    canvas.height = sourceCanvas.width;
  } else {
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
  }
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
  }
  return canvas;
}

function decodeCanvasWithReader(codeReader: BrowserMultiFormatReader, canvas: HTMLCanvasElement): Promise<any> {
  return new Promise((resolve) => {
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const img = new Image();
      const timer = setTimeout(() => resolve(null), 800);
      img.onload = async () => {
        clearTimeout(timer);
        try {
          const res = await codeReader.decodeFromImageElement(img);
          resolve(res);
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };
      img.src = dataUrl;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Detects 1D/2D barcodes on an image using native BarcodeDetector if available,
 * falling back gracefully to @zxing/library.
 */
export async function detectBarcode(blob: Blob): Promise<BarcodeDetectionResult | null> {
  try {
    const img = await createImageFromBlob(blob);

    // 1. Primary: Native browser BarcodeDetector API (fastest, hardware accelerated)
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const BarcodeDetectorClass = (window as unknown as { BarcodeDetector: any }).BarcodeDetector;
        const detector = new BarcodeDetectorClass({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'],
        });
        const barcodes = await detector.detect(img);
        if (barcodes && barcodes.length > 0) {
          const first = barcodes[0];
          const rawValue = first.rawValue || '';
          return {
            rawValue,
            format: (first.format || 'ean_13').toUpperCase(),
            gs1Country: getGs1Country(rawValue),
          };
        }
      } catch {
        // Fall back to ZXing if native BarcodeDetector fails or throws
      }
    }

    // 2. Fallback: ZXing BrowserMultiFormatReader with scaled canvas and orientation rotations
    if (typeof window !== 'undefined') {
      try {
        const codeReader = new BrowserMultiFormatReader();
        const baseCanvas = createScaledCanvas(img, 1400);

        // Try 0 deg orientation
        let zResult = await decodeCanvasWithReader(codeReader, baseCanvas);
        if (zResult && zResult.getText()) {
          const rawValue = zResult.getText();
          return {
            rawValue,
            format: zResult.getBarcodeFormat() ? String(zResult.getBarcodeFormat()) : 'EAN_13',
            gs1Country: getGs1Country(rawValue),
          };
        }

        // Try rotations for vertical / sideways packaging barcodes
        for (const angle of [90, 270, 180]) {
          const rotCanvas = rotateCanvas(baseCanvas, angle);
          zResult = await decodeCanvasWithReader(codeReader, rotCanvas);
          if (zResult && zResult.getText()) {
            const rawValue = zResult.getText();
            return {
              rawValue,
              format: zResult.getBarcodeFormat() ? String(zResult.getBarcodeFormat()) : 'EAN_13',
              gs1Country: getGs1Country(rawValue),
            };
          }
        }
      } catch (zxingErr) {
        if (!(zxingErr instanceof NotFoundException)) {
          // Non-fatal
        }
      }
    }
  } catch {
    // Top-level resilience: barcode lookup must never break the OCR pipeline
  }

  return null;
}

/**
 * Iterates through multiple package panels to discover any visible barcode.
 */
export async function detectBarcodeAcrossPanels(
  panels: { id: string; label: string; blob: Blob }[]
): Promise<BarcodeDetectionResult | null> {
  for (const panel of panels) {
    const result = await detectBarcode(panel.blob);
    if (result) {
      return {
        ...result,
        sourcePanelId: panel.id,
        sourcePanelLabel: panel.label,
      };
    }
  }
  return null;
}
