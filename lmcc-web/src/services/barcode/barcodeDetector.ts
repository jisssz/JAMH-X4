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

  if (prefix3 === 890) return 'GS1 India prefix (GS1 member assignment)';
  if (prefix3 >= 891 && prefix3 <= 899) return 'GS1 South Asia / Regional prefix';
  if (prefix2 >= 0 && prefix2 <= 13) return 'GS1 US & Canada prefix';
  if (prefix3 >= 300 && prefix3 <= 379) return 'GS1 France prefix';
  if (prefix3 >= 400 && prefix3 <= 440) return 'GS1 Germany prefix';
  if (prefix3 >= 450 && prefix3 <= 459) return 'GS1 Japan prefix';
  if (prefix3 >= 490 && prefix3 <= 499) return 'GS1 Japan prefix';
  if (prefix3 >= 500 && prefix3 <= 509) return 'GS1 United Kingdom prefix';
  if (prefix3 >= 690 && prefix3 <= 699) return 'GS1 China prefix';
  if (prefix3 >= 760 && prefix3 <= 769) return 'GS1 Switzerland prefix';
  if (prefix3 >= 800 && prefix3 <= 839) return 'GS1 Italy prefix';
  if (prefix3 >= 840 && prefix3 <= 849) return 'GS1 Spain prefix';
  if (prefix3 >= 880 && prefix3 <= 880) return 'GS1 South Korea prefix';
  if (prefix3 >= 885 && prefix3 <= 885) return 'GS1 Thailand prefix';
  if (prefix3 >= 888 && prefix3 <= 888) return 'GS1 Singapore prefix';
  if (prefix3 >= 930 && prefix3 <= 939) return 'GS1 Australia prefix';

  return undefined;
}

/**
 * Creates an HTMLImageElement from a Blob for canvas/ZXing processing.
 */
function createImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Detects 1D/2D barcodes on an image using native BarcodeDetector if available,
 * falling back gracefully to @zxing/library.
 */
export async function detectBarcode(blob: Blob): Promise<BarcodeDetectionResult | null> {
  try {
    // 1. Primary: Native browser BarcodeDetector API (fastest, hardware accelerated)
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const BarcodeDetectorClass = (window as unknown as { BarcodeDetector: any }).BarcodeDetector;
        const detector = new BarcodeDetectorClass({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'],
        });
        const img = await createImageFromBlob(blob);
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

    // 2. Fallback: ZXing BrowserMultiFormatReader
    if (typeof window !== 'undefined') {
      try {
        const codeReader = new BrowserMultiFormatReader();
        const img = await createImageFromBlob(blob);
        const result = await codeReader.decodeFromImageElement(img);
        if (result && result.getText()) {
          const rawValue = result.getText();
          return {
            rawValue,
            format: result.getBarcodeFormat() ? String(result.getBarcodeFormat()) : 'EAN_13',
            gs1Country: getGs1Country(rawValue),
          };
        }
      } catch (zxingErr) {
        if (!(zxingErr instanceof NotFoundException)) {
          // NotFoundException is expected when no barcode is in frame
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
