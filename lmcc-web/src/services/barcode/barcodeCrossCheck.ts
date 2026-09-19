import { ExtractedLabel } from '../../models/ExtractedLabel';
import { BarcodeDetectionResult } from './barcodeDetector';
import { ReferenceProductInfo } from './productDatabaseService';

export type ComparisonStatus = 'MATCH' | 'PARTIAL_MATCH' | 'DISCREPANCY' | 'UNAVAILABLE';
export type OverallCrossCheckStatus =
  | 'VERIFIED_MATCH'
  | 'REFERENCE_DISCREPANCY'
  | 'REFERENCE_NOT_FOUND'
  | 'NO_BARCODE_DETECTED';

export interface FieldComparison {
  field: 'manufacturer' | 'netQuantity' | 'productName';
  label: string;
  ocrValue?: string;
  referenceValue?: string;
  status: ComparisonStatus;
  note?: string;
}

export interface BarcodeCrossCheckResult {
  barcode?: BarcodeDetectionResult;
  referenceData?: ReferenceProductInfo;
  overallStatus: OverallCrossCheckStatus;
  statusTitle: string;
  statusMessage: string;
  comparisons: FieldComparison[];
  isAdvisoryOnly: true;
  disclaimer: string;
}

/**
 * Normalizes strings for loose textual matching (ignoring punctuation, legal suffixes).
 */
function cleanText(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(ltd|limited|pvt|private|inc|corp|corporation|co|company|india)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compares two manufacturer / brand strings.
 */
function compareManufacturer(ocrMfr?: string, dbBrand?: string): ComparisonStatus {
  if (!ocrMfr || !dbBrand) return 'UNAVAILABLE';

  const cleanOcr = cleanText(ocrMfr);
  const cleanDb = cleanText(dbBrand);

  if (!cleanOcr || !cleanDb) return 'UNAVAILABLE';

  if (cleanOcr === cleanDb || cleanOcr.includes(cleanDb) || cleanDb.includes(cleanOcr)) {
    return 'MATCH';
  }

  // Check token intersection
  const ocrTokens = cleanOcr.split(' ').filter((t) => t.length > 2);
  const dbTokens = cleanDb.split(' ').filter((t) => t.length > 2);
  const common = ocrTokens.filter((t) => dbTokens.includes(t));

  if (common.length > 0) {
    return 'PARTIAL_MATCH';
  }

  return 'DISCREPANCY';
}

/**
 * Normalizes net quantity to base units (g or ml) for comparison.
 */
function parseBaseQuantity(str?: string): { value: number; unit: string } | null {
  if (!str) return null;
  const match = str.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|grams?|ml|l|ltr|litres?|units?|pieces?|n)/i);
  if (!match) return null;

  let value = parseFloat(match[1]);
  let unit = match[2].toLowerCase();

  if (unit === 'kg') {
    value *= 1000;
    unit = 'g';
  } else if (unit === 'l' || unit === 'ltr' || unit === 'litres' || unit === 'litre') {
    value *= 1000;
    unit = 'ml';
  } else if (unit === 'gm' || unit === 'grams') {
    unit = 'g';
  }

  return { value, unit };
}

/**
 * Compares two quantity declarations.
 */
function compareQuantity(ocrQty?: string, dbQty?: string): ComparisonStatus {
  if (!ocrQty || !dbQty) return 'UNAVAILABLE';

  const ocrParsed = parseBaseQuantity(ocrQty);
  const dbParsed = parseBaseQuantity(dbQty);

  if (!ocrParsed || !dbParsed) return 'UNAVAILABLE';

  if (ocrParsed.unit === dbParsed.unit && Math.abs(ocrParsed.value - dbParsed.value) < 0.05) {
    return 'MATCH';
  }

  return 'DISCREPANCY';
}

/**
 * Executes a cross-check comparing OCR extracted statutory declarations with
 * external reference product metadata.
 */
export function performBarcodeCrossCheck(
  label: ExtractedLabel,
  barcode: BarcodeDetectionResult | null,
  reference: ReferenceProductInfo | null
): BarcodeCrossCheckResult {
  const disclaimer =
    'External product databases are reference sources only, not legal authorities. They do not determine statutory compliance under Legal Metrology Rules.';

  if (!barcode) {
    return {
      overallStatus: 'NO_BARCODE_DETECTED',
      statusTitle: 'No Barcode Detected',
      statusMessage:
        'No 1D/2D barcode was detected on the scanned package panel(s). This does not affect OCR-based Legal Metrology compliance screening.',
      comparisons: [],
      isAdvisoryOnly: true,
      disclaimer,
    };
  }

  if (!reference || !reference.found) {
    return {
      barcode,
      referenceData: reference || undefined,
      overallStatus: 'REFERENCE_NOT_FOUND',
      statusTitle: 'Barcode Detected (No Reference Record)',
      statusMessage: `Barcode ${barcode.rawValue} (${barcode.format}${
        barcode.gs1Country ? ` - ${barcode.gs1Country}` : ''
      }) was identified, but no matching public record was found in the reference product database.`,
      comparisons: [],
      isAdvisoryOnly: true,
      disclaimer,
    };
  }

  const comparisons: FieldComparison[] = [];

  // 1. Manufacturer / Brand Comparison
  const mfrStatus = compareManufacturer(label.manufacturer, reference.brands);
  comparisons.push({
    field: 'manufacturer',
    label: 'Manufacturer / Brand',
    ocrValue: label.manufacturer,
    referenceValue: reference.brands,
    status: mfrStatus,
    note:
      mfrStatus === 'MATCH'
        ? 'Scanned manufacturer matches reference database.'
        : mfrStatus === 'PARTIAL_MATCH'
        ? 'Shared brand entity detected between label and reference database.'
        : mfrStatus === 'DISCREPANCY'
        ? 'Declared manufacturer name differs from reference database record.'
        : 'Manufacturer declaration not available for cross-check.',
  });

  // 2. Net Quantity Comparison
  const qtyStatus = compareQuantity(label.netQuantity, reference.quantity);
  comparisons.push({
    field: 'netQuantity',
    label: 'Net Quantity',
    ocrValue: label.netQuantity,
    referenceValue: reference.quantity,
    status: qtyStatus,
    note:
      qtyStatus === 'MATCH'
        ? 'Metric net quantity matches reference database.'
        : qtyStatus === 'DISCREPANCY'
        ? 'Declared quantity differs from reference record (different pack size or variant).'
        : 'Quantity not available in reference record.',
  });

  // 3. Product Identity
  if (reference.productName) {
    comparisons.push({
      field: 'productName',
      label: 'Product Identity',
      referenceValue: reference.productName,
      status: 'MATCH',
      note: `Reference catalog identifies this barcode as "${reference.productName}".`,
    });
  }

  const hasDiscrepancy = comparisons.some((c) => c.status === 'DISCREPANCY');
  const hasMatch = comparisons.some((c) => c.status === 'MATCH' || c.status === 'PARTIAL_MATCH');

  let overallStatus: OverallCrossCheckStatus = 'VERIFIED_MATCH';
  let statusTitle = 'Product Identity Cross-Checked';
  let statusMessage =
    'Scanned label declarations align with public reference database records. This reference data is independent secondary evidence.';

  if (hasDiscrepancy) {
    overallStatus = 'REFERENCE_DISCREPANCY';
    statusTitle = 'Reference Data Advisory Discrepancy';
    statusMessage =
      'Declared manufacturer or quantity differs from external reference record. The external database is reference information only; manual verification recommended.';
  } else if (!hasMatch) {
    overallStatus = 'REFERENCE_NOT_FOUND';
    statusTitle = 'Limited Reference Data';
    statusMessage = 'Reference database record found, but insufficient overlapping declarations to compare.';
  }

  return {
    barcode,
    referenceData: reference,
    overallStatus,
    statusTitle,
    statusMessage,
    comparisons,
    isAdvisoryOnly: true,
    disclaimer,
  };
}
