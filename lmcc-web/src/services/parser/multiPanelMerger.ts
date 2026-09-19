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
 * Normalizes date strings for equality comparison (e.g. '08/2024', '08 / 2024', '08-2024' -> '08/2024').
 */
function normalizeDateStr(d?: string): string {
  if (!d) return '';
  return d
    .replace(/[\s\-\.]+/g, '/')
    .toUpperCase()
    .trim();
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
 * Merges multi-panel package OCR outputs into a single statutory declaration evidence set.
 * 
 * Safety Invariants:
 * 1. Case A: "Manufactured by ABC" and "Imported by XYZ" are separate statutory roles, NEVER a conflict.
 * 2. Case B: MFD (e.g. 08/2024) and Best Before / Expiry (e.g. 12 months) are complementary, NOT conflicting.
 * 3. Case C: Differing MRPs (₹100 vs ₹120) strictly produce a conflict and mandate REVIEW with both sources.
 * 4. Case D: Distinct factory vs corporate/importer addresses are preserved, never silently collapsed or discarded.
 * 5. Case E: Identical or re-declared values on multiple panels never trigger false conflicts.
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
  let mfgDatePanelLabel: string | undefined;
  let pkgDatePanelLabel: string | undefined;
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

    // 1. MRP (Case C & Case E)
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

    // 2. Net Quantity (Case E)
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

    // 3. Date (Case B & Case E)
    // Complementary dates (MFD vs Best Before or MFD vs PKD) are preserved without false conflicts.
    if (p.isFutureDate) isFutureDate = true;
    if (p.isDateAmbiguous) isDateAmbiguous = true;

    if (p.manufactureDate) {
      fieldsFound.push('Mfg Date');
      if (!manufactureDate) {
        manufactureDate = p.manufactureDate;
        mfgDatePanelLabel = label;
        dateEvidence = dateEvidence ? `${dateEvidence} | [${label} MFD]: ${p.dateEvidence || p.manufactureDate}` : `[${label}]: ${p.dateEvidence || p.manufactureDate}`;
        fieldOrigins.date = { panelId: item.input.panelId, panelLabel: label, value: p.manufactureDate };
      } else {
        const normA = normalizeDateStr(manufactureDate);
        const normB = normalizeDateStr(p.manufactureDate);
        if (normA && normB && normA !== normB) {
          hasConflict = true;
          conflictDetails.push(
            `Conflicting Manufacture Date: ${manufactureDate} on ${mfgDatePanelLabel} vs ${p.manufactureDate} on ${label}`
          );
        }
      }
    }

    // Only treat as explicit packing date if not identical to manufactureDate fallback
    const hasExplicitPkg = Boolean(p.packingDate && (!p.manufactureDate || p.packingDate !== p.manufactureDate));
    if (hasExplicitPkg && p.packingDate) {
      fieldsFound.push('Packing Date');
      if (!packingDate) {
        packingDate = p.packingDate;
        pkgDatePanelLabel = label;
        dateEvidence = dateEvidence ? `${dateEvidence} | [${label} PKD]: ${p.dateEvidence || p.packingDate}` : `[${label}]: ${p.dateEvidence || p.packingDate}`;
        if (!fieldOrigins.date) {
          fieldOrigins.date = { panelId: item.input.panelId, panelLabel: label, value: p.packingDate };
        }
      } else {
        const normA = normalizeDateStr(packingDate);
        const normB = normalizeDateStr(p.packingDate);
        if (normA && normB && normA !== normB) {
          hasConflict = true;
          conflictDetails.push(
            `Conflicting Packing Date: ${packingDate} on ${pkgDatePanelLabel} vs ${p.packingDate} on ${label}`
          );
        }
      }
    }

    // 4. Manufacturer (Case A & Case E)
    if (p.manufacturer) {
      fieldsFound.push('Manufacturer');
      if (!manufacturer) {
        manufacturer = p.manufacturer;
        manufacturerEvidence = `[${label}]: ${p.manufacturerEvidence || p.manufacturer}`;
        fieldOrigins.manufacturer = { panelId: item.input.panelId, panelLabel: label, value: p.manufacturer };
      } else {
        const cleanA = cleanText(manufacturer);
        const cleanB = cleanText(p.manufacturer);
        if (cleanA && cleanB && !cleanA.includes(cleanB) && !cleanB.includes(cleanA)) {
          // Combine distinct corporate entities (e.g. Producer + Marketer/Packer)
          manufacturer = `${manufacturer} / ${p.manufacturer}`;
          manufacturerEvidence = `${manufacturerEvidence} | [${label}]: ${p.manufacturerEvidence || p.manufacturer}`;
        }
      }
    }

    // 5. Importer (Case A: Completely distinct from Manufacturer)
    if (p.importer) {
      fieldsFound.push('Importer');
      if (!importer) {
        importer = p.importer;
        importerEvidence = `[${label}]: ${p.importerEvidence || p.importer}`;
        fieldOrigins.importer = { panelId: item.input.panelId, panelLabel: label, value: p.importer };
      }
    }

    // 6. Address (Case D: Preserve distinct factory vs registered addresses)
    if (p.address) {
      fieldsFound.push('Address');
      if (!address) {
        address = p.address;
        addressEvidence = `[${label}]: ${p.addressEvidence || p.address}`;
        fieldOrigins.address = { panelId: item.input.panelId, panelLabel: label, value: p.address };
      } else {
        const cleanAddrA = address.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanAddrB = p.address.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!cleanAddrA.includes(cleanAddrB) && !cleanAddrB.includes(cleanAddrA)) {
          // Preserve both addresses
          address = `${address} | [${label}]: ${p.address}`;
          addressEvidence = `${addressEvidence} | [${label}]: ${p.addressEvidence || p.address}`;
        } else if (p.address.length > address.length) {
          address = p.address;
          addressEvidence = `[${label}]: ${p.addressEvidence || p.address}`;
          fieldOrigins.address = { panelId: item.input.panelId, panelLabel: label, value: p.address };
        }
      }
    }

    // 7. Consumer Care
    if (p.consumerCare) {
      fieldsFound.push('Consumer Care');
      if (!consumerCare) {
        consumerCare = p.consumerCare;
        consumerCareEvidence = `[${label}]: ${p.consumerCareEvidence || p.consumerCare}`;
        fieldOrigins.consumerCare = { panelId: item.input.panelId, panelLabel: label, value: p.consumerCare };
      } else {
        const cleanCareA = consumerCare.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanCareB = p.consumerCare.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!cleanCareA.includes(cleanCareB) && !cleanCareB.includes(cleanCareA)) {
          consumerCare = `${consumerCare} | [${label}]: ${p.consumerCare}`;
          consumerCareEvidence = `${consumerCareEvidence} | [${label}]: ${p.consumerCareEvidence || p.consumerCare}`;
        }
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
    packingDate: packingDate || manufactureDate,
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
    hasConflict,
    conflictDetails,
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

