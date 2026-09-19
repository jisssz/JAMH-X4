import { ExtractedLabel } from '../../models/ExtractedLabel';
import { parseLabel } from './fieldParser';

export type PanelType = 'front' | 'back' | 'crimp' | 'other';

export interface PanelOcrInput {
  panelId: string;
  panelType: PanelType;
  panelLabel: string;
  rawText: string;
  confidence: number;
  quality?: 'GOOD' | 'FAIR' | 'POOR';
}

export interface FieldOrigin {
  panelId: string;
  panelLabel: string;
  value: string;
}

export interface MultiPanelMergeResult {
  unifiedLabel: ExtractedLabel;
  unifiedRawText: string;
  averageConfidence: number;
  overallQuality: 'GOOD' | 'FAIR' | 'POOR';
  hasConflict: boolean;
  conflictDetails: string[];
  fieldOrigins: Partial<Record<'mrp' | 'netQuantity' | 'date' | 'manufacturer' | 'address' | 'consumerCare' | 'importer', FieldOrigin>>;
  panelContributions: {
    panelId: string;
    panelLabel: string;
    fieldsFound: string[];
  }[];
}

/**
 * Normalizes an MRP string to a numeric value for accurate equality checking.
 */
function normalizeMrpNumber(val?: string): number | null {
  if (!val) return null;
  const match = val.match(/(\d+(?:\.\d{1,2})?)/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Normalizes net quantity to base units (g or ml) for comparison.
 */
function normalizeQty(val?: string): { num: number; unit: string } | null {
  if (!val) return null;
  const match = val.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(kg|g|gm|grams|ml|l|ltr|litres?|units?|pieces?|n)/i);
  if (!match) return null;
  let num = parseFloat(match[1]);
  let unit = match[2].toLowerCase();
  if (unit === 'kg') {
    num *= 1000;
    unit = 'g';
  } else if (unit === 'l' || unit === 'ltr' || unit === 'litres' || unit === 'litre') {
    num *= 1000;
    unit = 'ml';
  } else if (unit === 'gm' || unit === 'grams') {
    unit = 'g';
  }
  return { num, unit };
}

/**
 * Merges multi-panel package OCR outputs into a single statutory declaration evidence set.
 * 
 * Safety Rules (Phase 6):
 * 1. Never infer missing fields. If a field is missing from all panels, it remains undefined -> REVIEW.
 * 2. If conflicting values are detected (e.g. different MRPs on crimp vs back, or different packaging dates),
 *    the conflict is recorded and flagged -> mandate REVIEW.
 * 3. Unified raw text retains panel demarcations for complete auditing transparency.
 */
export function mergeMultiPanelDeclarations(inputs: PanelOcrInput[]): MultiPanelMergeResult {
  if (!inputs || inputs.length === 0) {
    return {
      unifiedLabel: parseLabel(''),
      unifiedRawText: '',
      averageConfidence: 0,
      overallQuality: 'POOR',
      hasConflict: false,
      conflictDetails: [],
      fieldOrigins: {},
      panelContributions: [],
    };
  }

  // Parse each panel individually to isolate field origin
  const parsedPanels = inputs.map((input) => ({
    input,
    parsed: parseLabel(input.rawText),
  }));

  const panelContributions: MultiPanelMergeResult['panelContributions'] = [];
  const conflictDetails: string[] = [];
  const fieldOrigins: MultiPanelMergeResult['fieldOrigins'] = {};
  let hasConflict = false;

  let mrp: string | undefined;
  let mrpEvidence: string | undefined;
  let mrpPanelLabel: string | undefined;

  let netQuantity: string | undefined;
  let netQuantityEvidence: string | undefined;
  let netQtyPanelLabel: string | undefined;

  let packingDate: string | undefined;
  let manufactureDate: string | undefined;
  let dateEvidence: string | undefined;
  let datePanelLabel: string | undefined;
  let isDateAmbiguous = false;
  let isFutureDate = false;

  let manufacturer: string | undefined;
  let manufacturerEvidence: string | undefined;

  let address: string | undefined;
  let addressEvidence: string | undefined;

  let consumerCare: string | undefined;
  let consumerCareEvidence: string | undefined;

  let importer: string | undefined;
  let importerEvidence: string | undefined;

  // Track field presence per panel
  for (const item of parsedPanels) {
    const fieldsFound: string[] = [];
    const p = item.parsed;
    const label = item.input.panelLabel;

    // 1. MRP
    if (p.mrp) {
      fieldsFound.push('MRP');
      if (!mrp) {
        mrp = p.mrp;
        mrpEvidence = `[${label}]: ${p.mrpEvidence || p.mrp}`;
        mrpPanelLabel = label;
        fieldOrigins.mrp = { panelId: item.input.panelId, panelLabel: label, value: p.mrp };
      } else {
        const numA = normalizeMrpNumber(mrp);
        const numB = normalizeMrpNumber(p.mrp);
        if (numA !== null && numB !== null && Math.abs(numA - numB) > 0.01) {
          hasConflict = true;
          conflictDetails.push(
            `Conflicting MRP: ${mrp} on ${mrpPanelLabel} vs ${p.mrp} on ${label}`
          );
        }
      }
    }

    // 2. Net Quantity
    if (p.netQuantity) {
      fieldsFound.push('Net Quantity');
      if (!netQuantity) {
        netQuantity = p.netQuantity;
        netQuantityEvidence = `[${label}]: ${p.netQuantityEvidence || p.netQuantity}`;
        netQtyPanelLabel = label;
        fieldOrigins.netQuantity = { panelId: item.input.panelId, panelLabel: label, value: p.netQuantity };
      } else {
        const qtyA = normalizeQty(netQuantity);
        const qtyB = normalizeQty(p.netQuantity);
        if (qtyA && qtyB && (qtyA.unit !== qtyB.unit || Math.abs(qtyA.num - qtyB.num) > 0.01)) {
          hasConflict = true;
          conflictDetails.push(
            `Conflicting Net Quantity: ${netQuantity} on ${netQtyPanelLabel} vs ${p.netQuantity} on ${label}`
          );
        }
      }
    }

    // 3. Date
    const itemDate = p.manufactureDate || p.packingDate;
    if (itemDate) {
      fieldsFound.push('Date');
      if (p.isFutureDate) isFutureDate = true;
      if (p.isDateAmbiguous) isDateAmbiguous = true;

      if (!packingDate && !manufactureDate) {
        packingDate = p.packingDate;
        manufactureDate = p.manufactureDate;
        dateEvidence = `[${label}]: ${p.dateEvidence || itemDate}`;
        datePanelLabel = label;
        fieldOrigins.date = { panelId: item.input.panelId, panelLabel: label, value: itemDate };
      } else {
        const currentDate = manufactureDate || packingDate;
        if (currentDate && currentDate !== itemDate) {
          hasConflict = true;
          conflictDetails.push(
            `Conflicting Date: ${currentDate} on ${datePanelLabel} vs ${itemDate} on ${label}`
          );
        }
      }
    }

    // 4. Manufacturer
    if (p.manufacturer) {
      fieldsFound.push('Manufacturer');
      if (!manufacturer) {
        manufacturer = p.manufacturer;
        manufacturerEvidence = `[${label}]: ${p.manufacturerEvidence || p.manufacturer}`;
        fieldOrigins.manufacturer = { panelId: item.input.panelId, panelLabel: label, value: p.manufacturer };
      }
    }

    // 5. Address
    if (p.address) {
      fieldsFound.push('Address');
      if (!address) {
        address = p.address;
        addressEvidence = `[${label}]: ${p.addressEvidence || p.address}`;
        fieldOrigins.address = { panelId: item.input.panelId, panelLabel: label, value: p.address };
      } else if (!address.includes(p.address) && p.address.length > address.length) {
        address = p.address;
        addressEvidence = `[${label}]: ${p.addressEvidence || p.address}`;
        fieldOrigins.address = { panelId: item.input.panelId, panelLabel: label, value: p.address };
      }
    }

    // 6. Consumer Care
    if (p.consumerCare) {
      fieldsFound.push('Consumer Care');
      if (!consumerCare) {
        consumerCare = p.consumerCare;
        consumerCareEvidence = `[${label}]: ${p.consumerCareEvidence || p.consumerCare}`;
        fieldOrigins.consumerCare = { panelId: item.input.panelId, panelLabel: label, value: p.consumerCare };
      }
    }

    // 7. Importer
    if (p.importer) {
      fieldsFound.push('Importer');
      if (!importer) {
        importer = p.importer;
        importerEvidence = `[${label}]: ${p.importerEvidence || p.importer}`;
        fieldOrigins.importer = { panelId: item.input.panelId, panelLabel: label, value: p.importer };
      }
    }

    panelContributions.push({
      panelId: item.input.panelId,
      panelLabel: label,
      fieldsFound,
    });
  }

  const unifiedRawText = inputs
    .map((input) => `--- [PANEL: ${input.panelLabel}] ---\n${input.rawText}`)
    .join('\n\n');

  const totalConf = inputs.reduce((sum, inp) => sum + inp.confidence, 0);
  const averageConfidence = Math.round(totalConf / inputs.length);

  const hasPoor = inputs.some((inp) => inp.quality === 'POOR');
  const allGood = inputs.every((inp) => inp.quality === 'GOOD');
  const overallQuality: 'GOOD' | 'FAIR' | 'POOR' = allGood ? 'GOOD' : hasPoor ? 'POOR' : 'FAIR';

  const unifiedLabel: ExtractedLabel = {
    rawText: unifiedRawText,
    mrp,
    mrpEvidence,
    netQuantity,
    netQuantityEvidence,
    packingDate,
    manufactureDate,
    dateEvidence,
    manufacturer,
    manufacturerEvidence,
    address,
    addressEvidence,
    consumerCare,
    consumerCareEvidence,
    importer,
    importerEvidence,
    isDateAmbiguous: isDateAmbiguous || hasConflict,
    isFutureDate,
  };

  return {
    unifiedLabel,
    unifiedRawText,
    averageConfidence,
    overallQuality,
    hasConflict,
    conflictDetails,
    fieldOrigins,
    panelContributions,
  };
}

