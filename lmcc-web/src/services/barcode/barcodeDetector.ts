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
 * Under Legal Metrology Rule 6, understanding if the barcode is GS1 India (890 prefix)
 * provides valuable country of origin context.
 */
export function getGs1Country(barcode: string): string | undefined {
  const digits = barcode.replace(/\D/g, '');
  if (digits.length < 3) return undefined;

  const prefix3 = parseInt(digits.substring(0, 3), 10);
  const prefix2 = parseInt(digits.substring(0, 2), 10);

  if (prefix3 === 890) return 'India (GS1 India)';
  if (prefix3 >= 891 && prefix3 <= 899) return 'South Asia / Regional GS1';
  if (prefix2 >= 0 && prefix2 <= 13) return 'United States & Canada';
  if (prefix3 >= 300 && prefix3 <= 379) return 'France';
  if (prefix3 >= 400 && prefix3 <= 440) return 'Germany';
  if (prefix3 >= 450 && prefix3 <= 459) return 'Japan';
  if (prefix3 >= 490 && prefix3 <= 499) return 'Japan';
  if (prefix3 >= 500 && prefix3 <= 509) return 'United Kingdom';
  if (prefix3 >= 690 && prefix3 <= 699) return 'China';
  if (prefix3 >= 760 && prefix3 <= 769) return 'Switzerland';
  if (prefix3 >= 800 && prefix3 <= 839) return 'Italy';
  if (prefix3 >= 840 && prefix3 <= 849) return 'Spain';
  if (prefix3 >= 880 && prefix3 <= 880) return 'South Korea';
  if (prefix3 >= 885 && prefix3 <= 885) return 'Thailand';
  if (prefix3 >= 888 && prefix3 <= 888) return 'Singapore';
  if (prefix3 >= 930 && prefix3 <= 939) return 'Australia';

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
