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
  hasProductClash?: boolean;
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
 * Known distinct commodity categories to detect mixed product scans.
 */
const COMMODITY_CATEGORIES: { category: string; tokens: RegExp }[] = [
  { category: 'tea', tokens: /\b(?:tea|chai|instant\s*tea|tea\s*leaves)\b/i },
  { category: 'salt', tokens: /\b(?:salt|namak|iodized\s*salt|rock\s*salt)\b/i },
  { category: 'buttermilk', tokens: /\b(?:buttermilk|chhaas|chaas|mattha)\b/i },
  { category: 'milk', tokens: /\b(?:toned\s*milk|pasteurized\s*milk|cow\s*milk|taaza|full\s*cream\s*milk)\b/i },
  { category: 'masala_spice', tokens: /\b(?:garam\s*masala|biryani\s*masala|chhole\s*masala|sambhar\s*masala|turmeric\s*powder|chilli\s*powder)\b/i },
  { category: 'oats', tokens: /\b(?:oats|rolled\s*oats|masala\s*oats)\b/i },
  { category: 'biscuits', tokens: /\b(?:cookies|biscuits|butter\s*cookies|marie|digestive)\b/i },
  { category: 'chips', tokens: /\b(?:potato\s*chips|chips|wafers|namkeen|bhujia)\b/i },
  { category: 'beverage', tokens: /\b(?:carbonated\s*beverage|energy\s*drink|soft\s*drink|soda|fruit\s*juice)\b/i },
  { category: 'detergent', tokens: /\b(?:detergent|washing\s*powder|laundry)\b/i },
  { category: 'antiseptic', tokens: /\b(?:antiseptic|disinfectant|handwash)\b/i },
];

/**
 * Distinct manufacturer / brand families for product clash detection.
 */
const BRAND_FAMILIES = [
  { brand: 'britannia', regex: /\bbritannia\b/i },
  { brand: 'pepsico', regex: /\b(?:pepsico|pepsi|lays|sting)\b/i },
  { brand: 'coca_cola', regex: /\b(?:coca[\s-]*cola|thums\s*up|sprite|fanta)\b/i },
  { brand: 'tata', regex: /\btata\b/i },
  { brand: 'mdh', regex: /\b(?:mdh|mahashian\s*di\s*hatti)\b/i },
  { brand: 'amul', regex: /\b(?:amul|gcmmf)\b/i },
  { brand: 'marico', regex: /\b(?:marico|saffola)\b/i },
  { brand: 'hyson', regex: /\bhyson\b/i },
  { brand: 'haldiram', regex: /\bhaldiram/i },
  { brand: 'nestle', regex: /\b(?:nestle|maggi)\b/i },
  { brand: 'parle', regex: /\bparle\b/i },
];

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
      hasProductClash: false,
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
  let hasProductClash = false;

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

  let expiryDate: string | undefined;
  let expiryEvidence: string | undefined;

  let bestBefore: string | undefined;
  let bestBeforeEvidence: string | undefined;

  let batchNumber: string | undefined;
  let batchEvidence: string | undefined;

  let email: string | undefined;
  let emailEvidence: string | undefined;

  let productName: string | undefined;
  let productNameEvidence: string | undefined;

  let ingredients: string | undefined;
  let ingredientsEvidence: string | undefined;

  let nutritionInfo: string | undefined;
  let nutritionEvidence: string | undefined;

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

    // 8. Batch / Expiry / Best Before / Ingredients / Product Declarations
    if (p.batchNumber && !batchNumber) {
      batchNumber = p.batchNumber;
      batchEvidence = `[${label}]: ${p.batchEvidence || p.batchNumber}`;
    }
    if (p.expiryDate && !expiryDate) {
      expiryDate = p.expiryDate;
      expiryEvidence = `[${label}]: ${p.expiryEvidence || p.expiryDate}`;
    }
    if (p.bestBefore && !bestBefore) {
      bestBefore = p.bestBefore;
      bestBeforeEvidence = `[${label}]: ${p.bestBeforeEvidence || p.bestBefore}`;
    }
    if (p.email && !email) {
      email = p.email;
      emailEvidence = `[${label}]: ${p.emailEvidence || p.email}`;
    }
    if (p.ingredients && !ingredients) {
      ingredients = p.ingredients;
      ingredientsEvidence = `[${label}]: ${p.ingredientsEvidence || p.ingredients}`;
    }
    if (p.nutritionInfo && !nutritionInfo) {
      nutritionInfo = p.nutritionInfo;
      nutritionEvidence = `[${label}]: ${p.nutritionEvidence || p.nutritionInfo}`;
    }
    if (p.productName && !productName) {
      productName = p.productName;
      productNameEvidence = `[${label}]: ${p.productNameEvidence || p.productName}`;
    }

    panelContributions.push({
      panelId: item.input.panelId,
      panelLabel: label,
      fieldsFound,
    });
  }

  // 9. Different-Product Conflict Detection across panels
  for (let i = 0; i < parsedPanels.length; i++) {
    for (let j = i + 1; j < parsedPanels.length; j++) {
      const panelA = parsedPanels[i];
      const panelB = parsedPanels[j];
      const textA = panelA.input.rawText;
      const textB = panelB.input.rawText;
      const prodA = panelA.parsed.productName;
      const prodB = panelB.parsed.productName;

      // A. Check explicit parsed product names
      if (prodA && prodB) {
        const cleanA = cleanText(prodA);
        const cleanB = cleanText(prodB);
        if (cleanA && cleanB && cleanA !== cleanB && !cleanA.includes(cleanB) && !cleanB.includes(cleanA)) {
          hasProductClash = true;
          hasConflict = true;
          conflictDetails.push(
            `These images appear to belong to different products. Please verify before analyzing. (Detected "${prodA}" on [${panelA.input.panelLabel}] vs "${prodB}" on [${panelB.input.panelLabel}])`
          );
          break;
        }
      }

      // B. Check mutually contradictory commodity categories
      let catA: string | undefined;
      let catB: string | undefined;
      for (const cat of COMMODITY_CATEGORIES) {
        if (!catA && cat.tokens.test(textA) && !cat.tokens.test(textB)) catA = cat.category;
        if (!catB && cat.tokens.test(textB) && !cat.tokens.test(textA)) catB = cat.category;
      }
      if (catA && catB && catA !== catB) {
        hasProductClash = true;
        hasConflict = true;
        conflictDetails.push(
          `These images appear to belong to different products. Please verify before analyzing. (Contradictory product types detected: ${catA} vs ${catB})`
        );
        break;
      }

      // C. Check mutually contradictory brand families
      let brandA: string | undefined;
      let brandB: string | undefined;
      for (const b of BRAND_FAMILIES) {
        if (!brandA && b.regex.test(textA) && !b.regex.test(textB)) brandA = b.brand;
        if (!brandB && b.regex.test(textB) && !b.regex.test(textA)) brandB = b.brand;
      }
      if (brandA && brandB && brandA !== brandB) {
        hasProductClash = true;
        hasConflict = true;
        conflictDetails.push(
          `These images appear to belong to different products. Please verify before analyzing. (Contradictory brands detected: ${brandA} vs ${brandB})`
        );
        break;
      }
    }
    if (hasProductClash) break;
  }

  const unifiedRawText = inputs
    .map((input) => `--- [PANEL: ${input.panelLabel}] ---\n${input.rawText}`)
    .join('\n\n');

  const totalConf = inputs.reduce((sum, inp) => sum + inp.confidence, 0);
  const averageConfidence = Math.round(totalConf / inputs.length);

  const hasPoor = inputs.some((inp) => inp.quality === 'POOR');
  const allGood = inputs.every((inp) => inp.quality === 'GOOD');
  const overallQuality: 'GOOD' | 'FAIR' | 'POOR' = allGood ? 'GOOD' : hasPoor ? 'POOR' : 'FAIR';

  // Merge field evidence records across panels
  const unifiedFieldEvidenceRecords: Record<string, import('../../models/ExtractedLabel').FieldEvidenceRecord> = {};
  for (const item of parsedPanels) {
    if (item.parsed.fieldEvidenceRecords) {
      for (const [k, ev] of Object.entries(item.parsed.fieldEvidenceRecords)) {
        if (!unifiedFieldEvidenceRecords[k] || unifiedFieldEvidenceRecords[k].status !== 'present_readable') {
          unifiedFieldEvidenceRecords[k] = {
            ...ev,
            sourcePanel: item.input.panelLabel,
          };
        }
      }
    }
  }

  const statutoryKeys = ['mrp', 'netQuantity', 'date', 'manufacturer', 'address', 'consumerCare'];
  const fieldStatuses: Record<string, import('../../models/ExtractedLabel').DeclarationStatus> = {};
  fieldStatuses.mrp = mrp ? 'present_readable' : /MRP|RETAIL\s*PRICE|Rs\./i.test(unifiedRawText) ? 'present_ocr_failed' : 'not_present';
  fieldStatuses.netQuantity = netQuantity ? 'present_readable' : /NET|QTY|WEIGHT/i.test(unifiedRawText) ? 'present_ocr_failed' : 'not_present';
  const activeDate = packingDate || manufactureDate;
  fieldStatuses.date = activeDate ? (isDateAmbiguous ? 'present_ambiguous' : 'present_readable') : /PKD|MFD|DATE/i.test(unifiedRawText) ? 'present_ocr_failed' : 'not_present';
  fieldStatuses.manufacturer = manufacturer ? 'present_readable' : /MANUFACTURED|MFD|PACKED\s*BY/i.test(unifiedRawText) ? 'present_ocr_failed' : 'not_present';
  fieldStatuses.address = address ? 'present_readable' : /OFFICE|FACTORY|PLOT|ROAD|PIN/i.test(unifiedRawText) ? 'present_ocr_failed' : 'not_present';
  fieldStatuses.consumerCare = consumerCare ? 'present_readable' : /CUSTOMER\s*CARE|FEEDBACK|HELPLINE/i.test(unifiedRawText) ? 'present_ocr_failed' : 'not_present';

  const detectedCount = statutoryKeys.filter((k) => fieldStatuses[k] === 'present_readable' || fieldStatuses[k] === 'present_ambiguous').length;

  const declarationCoverage = {
    totalAssessed: statutoryKeys.length,
    detectedCount,
    coveragePercentage: Math.round((detectedCount / statutoryKeys.length) * 100),
    fieldStatuses,
  };

  const unifiedLabel: ExtractedLabel = {
    rawText: unifiedRawText,
    mrp,
    mrpEvidence,
    netQuantity,
    netQuantityEvidence,
    packingDate: packingDate || manufactureDate,
    manufactureDate,
    expiryDate,
    bestBefore,
    batchNumber,
    email,
    productName,
    productNameEvidence,
    ingredients,
    nutritionInfo,
    dateEvidence,
    expiryEvidence,
    bestBeforeEvidence,
    batchEvidence,
    emailEvidence,
    ingredientsEvidence,
    nutritionEvidence,
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
    hasProductClash,
    conflictDetails,
    fieldEvidenceRecords: unifiedFieldEvidenceRecords,
    declarationCoverage,
  };

  return {
    unifiedLabel,
    unifiedRawText,
    averageConfidence,
    overallQuality,
    hasConflict,
    hasProductClash,
    conflictDetails,
    fieldOrigins,
    panelContributions,
  };
}

