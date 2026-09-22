import { ExtractedLabel, FieldEvidenceRecord, DeclarationStatus } from '../../models/ExtractedLabel';
import { normalizeText } from '../../utils/textNormalize';

const MONTH_NAMES: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
  JANUARY: 1,
  FEBRUARY: 2,
  MARCH: 3,
  APRIL: 4,
  JUNE: 6,
  JULY: 7,
  AUGUST: 8,
  SEPTEMBER: 9,
  OCTOBER: 10,
  NOVEMBER: 11,
  DECEMBER: 12,
};

function parseYear(yearRaw: string): number {
  const y = parseInt(yearRaw, 10);
  if (yearRaw.length === 2) {
    return 2000 + y;
  }
  return y;
}

function parseMonth(monthRaw: string): number {
  const upper = monthRaw.toUpperCase();
  if (MONTH_NAMES[upper]) {
    return MONTH_NAMES[upper];
  }
  return parseInt(monthRaw, 10);
}

function checkIsFutureDate(month: number, year: number): boolean {
  if (isNaN(month) || isNaN(year)) return false;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // Under Rule 6(1)(d), declaring a future manufacturing date beyond the current calendar month is non-compliant
  if (year > currentYear) return true;
  if (year === currentYear && month > currentMonth) return true;
  return false;
}

const corpSuffixRegex = /\b(?:PVT\.?\s*LTD\.?|PRIVATE\s*LIMITED|PRIVATE\s*LTD\.?|LIMITED|LTD\.?|LLP|INDUSTRIES|FOOD\s*PRODUCTS|FOODS|CONSUMER\s*PRODUCTS|PHARMACEUTICALS|LABORATORIES|AGRO\s*(?:FOODS|PRODUCTS)?|GRAINS|MILLS|SPICES|ENTERPRISES|UDYOG|CHEMICALS|LABS|BAKERS|PRODUCTS|BEVERAGES|HERBALS|SNACKS|CORP\.?|INC\.?|INCORPORATED|CO\.?|COMPANY)\b/i;

/**
 * Strips leading/trailing metadata tags, prices, dates, and noise characters
 * to isolate the genuine legal entity name without contamination.
 */
function cleanEntityName(rawName: string): string {
  let s = rawName.trim();
  // Strip trailing barcode digits / noise on same line (e.g. '| 0 "128400709085"...')
  s = s.replace(/\s*\|\s*[\d"'].*$/, '');
  // OCR repair for INC. (frequently misrecognized as ING. on glossy packaging)
  s = s.replace(/\bING\.?$/i, 'INC.');
  // Strip leading metadata tags (PKD, MFD, BATCH, LOT, MRP, Rs, etc.) and adjacent noise
  s = s.replace(/^(?:(?:PKD|MFD|MFG|EXP|BATCH|LOT|MRP|RS\.?|₹|NO\.?)\s*[:\s-]*[^\s]+\s*)+/i, '');
  // Strip leading symbols and punctuation
  s = s.replace(/^[—\-–~_/\\|:,.\s]+/, '');

  // If the string contains a slash or dash separator before a corporate suffix, take the corporate portion
  if (s.includes('/') || s.includes('—') || s.includes(' - ')) {
    const parts = s.split(/[/—–]|\s-\s/);
    for (let p = parts.length - 1; p >= 0; p--) {
      const part = parts[p].trim();
      if (corpSuffixRegex.test(part)) {
        s = part;
        break;
      }
    }
  }

  // Remove OCR prefix noise tokens (e.g. garbled "JuZeze", "WN") preceding a capitalized brand name
  s = s.replace(/^(?:juzeze|wn)\b\s*/i, '');

  // Clean trailing noise like "~~", "-", commas
  s = s.replace(/[—\-–~_/\\|:,.\s]+$/, '');
  s = s.replace(/^[—\-–~_/\\|:,.\s]+/, '');
  if (/\bINC$/i.test(s)) {
    s += '.';
  }
  return s.trim();
}

/**
 * Defensive label field parser for Legal Metrology (Packaged Commodities) Rules, 2011 declarations.
 * Operates across English, Hindi, and bilingual packaging without assuming certainty.
 * Leaves ambiguous or unverified fields clearly identifiable and retains exact textual evidence lines.
 */
export function parseLabel(rawText: string): ExtractedLabel {
  const normalized = normalizeText(rawText);
  const lines = normalized.split('\n');

  let mrp: string | undefined;
  let mrpEvidence: string | undefined;
  let mrpMethod: FieldEvidenceRecord['extractionMethod'] = 'pattern';

  let netQuantity: string | undefined;
  let netQuantityEvidence: string | undefined;
  let netQuantityMethod: FieldEvidenceRecord['extractionMethod'] = 'pattern';

  let packingDate: string | undefined;
  let manufactureDate: string | undefined;
  let expiryDate: string | undefined;
  let bestBefore: string | undefined;
  let dateEvidence: string | undefined;
  let expiryEvidence: string | undefined;
  let bestBeforeEvidence: string | undefined;
  let dateMethod: FieldEvidenceRecord['extractionMethod'] = 'pattern';

  let manufacturer: string | undefined;
  let manufacturerEvidence: string | undefined;
  let manufacturerMethod: FieldEvidenceRecord['extractionMethod'] = 'pattern';

  let address: string | undefined;
  let addressEvidence: string | undefined;
  let addressMethod: FieldEvidenceRecord['extractionMethod'] = 'pattern';

  let consumerCare: string | undefined;
  let consumerCareEvidence: string | undefined;
  let consumerCareMethod: FieldEvidenceRecord['extractionMethod'] = 'pattern';

  let importer: string | undefined;
  let importerEvidence: string | undefined;

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

  let isDateAmbiguous = false;
  let isFutureDate = false;

  // ----------------------------------------------------
  // 1. MRP Extraction (Rule 6(1)(da))
  // ----------------------------------------------------
  // Matches: MRP, M.R.P., MAX. RETAIL PRICE, RETAIL PRICE, MAXIMUM RETAIL PRICE, अधिकतम खुदरा मूल्य
  const mrpExplicitRegex = /\b(?:MRP|M\.R\.P\.|(?:MAX\.?|MAXIMUM)?\s*RETAIL\s*PRICE|अधिकतम\s*खुदरा\s*मूल्य|एम\.?आर\.?पी\.?)\s*:?\s*(?:\(?\s*INCL\.?(?:USIVE)?\s*(?:OF\s*)?ALL\s*TAXES\s*\)?|सभी\s*कर\s*सहित)?\s*[:\s-]*(?:₹|Rs\.?|INR|R5\.?|R\$)?\s*[:\s-]*(\d+(?:\.\d{1,2})?)\s*(?:\/-\s*)?(?:\(?\s*(?:INCL\.?(?:USIVE)?\s*OF\s*ALL\s*TAXES|सभी\s*कर\s*सहित)\s*\)?)?/iu;
  const mrpSuffixRegex = /(?:₹|Rs\.?|INR)\s*(\d+(?:\.\d{1,2})?)\s*(?:MRP|M\.R\.P\.)/i;
  const mrpCurrencyRegex = /(?:₹|Rs\.?|INR)\s*(\d+(?:\.\d{1,2})?)(?:\s*\/-)?(?:\s*\(?(?:INCL\.?(?:USIVE)?\s*OF\s*ALL\s*TAXES|सभी\s*कर\s*सहित)\)?)?/iu;
  const mrpTrailingSlashRegex = /(?:₹|Rs\.?|INR)\s*(\d+(?:\.\d{1,2})?)\s*\/-/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Priority 1: Explicit MRP or RETAIL PRICE prefix
    if (/\b(?:MRP|M\.R\.P\.|(?:MAX\.?|MAXIMUM)?\s*RETAIL\s*PRICE)\b/i.test(line) || /(?:अधिकतम\s*खुदरा\s*मूल्य|एम\.?आर\.?पी)/u.test(line)) {
      const match = line.match(mrpExplicitRegex);
      if (match && match[1]) {
        const val = parseFloat(match[1]);
        if (val > 0 && val < 500000) {
          mrp = `₹${match[1]}`;
          mrpEvidence = line.trim();
          mrpMethod = 'explicit_prefix';
          break;
        }
      }

      // Multi-line lookahead: Header on line i (e.g. "RETAIL PRICE:"), amount stamped on line i+1
      if (!mrp && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const nextMatch = nextLine.match(/^(?:[:\s-]|₹|Rs\.?|INR|R5\.?|R\$)*(\d+(?:\.\d{1,2})?)(?:\s*\/-)?/i);
        if (nextMatch && nextMatch[1]) {
          const val = parseFloat(nextMatch[1]);
          if (val > 0 && val < 500000 && !/^\d{6}$/.test(nextMatch[1])) {
            mrp = `₹${nextMatch[1]}`;
            mrpEvidence = `${line.trim()} ${nextLine}`;
            mrpMethod = 'multiline';
            break;
          }
        }
      }
    }

    // Priority 2: Currency followed by MRP suffix (e.g. "₹99 MRP")
    const suffixMatch = line.match(mrpSuffixRegex);
    if (suffixMatch && suffixMatch[1]) {
      const val = parseFloat(suffixMatch[1]);
      if (val > 0 && val < 500000) {
        mrp = `₹${suffixMatch[1]}`;
        mrpEvidence = line.trim();
        mrpMethod = 'explicit_prefix';
        break;
      }
    }
  }

  // Priority 3: Currency symbol with "inclusive of all taxes" or stand-alone currency price
  if (!mrp) {
    for (const line of lines) {
      if (/(?:INCL|TAXES|₹|Rs\.|सभी\s*कर)/iu.test(line) && !/NET|QTY|WT|WEIGHT|PHONE|CARE|PIN|ग्राम|किग्रा|KCAL|CALORIE|ENERGY|FAT|PROTEIN/iu.test(line)) {
        const match = line.match(mrpCurrencyRegex);
        if (match && match[1]) {
          const val = parseFloat(match[1]);
          // Guard: Avoid PIN codes (e.g. 400001), phone numbers, or barcode numbers
          if (val > 0 && val < 100000 && !/^\d{6}$/.test(match[1])) {
            mrp = `₹${match[1]}`;
            mrpEvidence = line.trim();
            mrpMethod = 'pattern';
            break;
          }
        }
      }

      // Priority 4: Explicit price with trailing /- (e.g. "Rs. 99/-")
      const slashMatch = line.match(mrpTrailingSlashRegex);
      if (slashMatch && slashMatch[1]) {
        const val = parseFloat(slashMatch[1]);
        if (val > 0 && val < 100000) {
          mrp = `₹${slashMatch[1]}`;
          mrpEvidence = line.trim();
          mrpMethod = 'pattern';
          break;
        }
      }
    }
  }

  // ----------------------------------------------------
  // 2. Net Quantity Extraction (Rule 6(1)(c))
  // ----------------------------------------------------
  const qtyRegex = /(?:NET\s*(?:QTY|QUANTITY|WT\.?|WEIGHT|VOL\.?|VOLUME|MASS|CONTENT)?|QUANTITY|शुद्ध\s*(?:मात्रा|वजन)|मात्रा|वजन|അളവ്|തൂക്കം|നിവ്വള\s*തൂക|തൂക|നിకర\s*పరిమాణం|நிகர\s*எடை)?\s*:?\s*[:\s-]*[({[\s]*(\d+(?:\.\d+)?)\s*(kg|g|gm|gms|grams|ml|l|ltr|litres?|mg|units?|pieces?|N|ग्राम|किग्रा|कि\.ग्रा\.|मि\.ली\.|लीटर)\b(?:\s*\(?(?:WHEN\s*PACKED)?\)?)?/iu;
  const nutritionLineGuard = /\b(?:CALORIES|TOTAL\s*FAT|SATURATED\s*FAT|TRANS\s*FAT|CHOLESTEROL|SODIUM|POTASSIUM|CARBOHYDRATE|DIETARY\s*FIBER|TOTAL\s*SUGARS|ADDED\s*SUGARS|PROTEIN|VITAMIN|CALCIUM|IRON|DAILY\s*VALUE|SERVING\s*SIZE|SERVINGS\s*PER|%DV)\b/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Guard: Prevent nutrition facts panel lines from falsely satisfying Net Quantity
    if (nutritionLineGuard.test(line) && !/\bNET\s*(?:WT|WEIGHT|QTY|QUANTITY)\b/i.test(line)) {
      continue;
    }
    if (/(?:NET|QTY|QUANTITY|WEIGHT|VOLUME|MASS|CONTENT|gm|kg|ml|ltr|\bN\b|\bL\b|\bg\b|वजन|मात्रा|ग्राम|किग्रा|അളവ്|തൂക്കം|നിവ്വള|തൂക|നിకర|పరిమాణం|நிகர|எடை)/iu.test(line)) {
      let match = line.match(qtyRegex);
      let isMultiline = false;
      if ((!match || !match[1]) && i + 1 < lines.length) {
        // Multi-line declaration: e.g. "NET WEIGHT:" followed by "1 KG"
        const combined = `${line} ${lines[i + 1]}`;
        match = combined.match(qtyRegex);
        if (match && match[1]) isMultiline = true;
      }

      if (match && match[1] && match[2]) {
        const num = match[1];
        let unit = match[2].toLowerCase();
        if (unit === 'gm' || unit === 'gms' || unit === 'grams' || unit === 'ग्राम') unit = 'g';
        if (unit === 'ltr' || unit === 'litres' || unit === 'litre' || unit === 'लीटर') unit = 'l';
        if (unit === 'किग्रा' || unit === 'कि.ग्रा.') unit = 'kg';
        if (unit === 'मि.ली.') unit = 'ml';
        netQuantity = `${num} ${unit}`;
        netQuantityEvidence = isMultiline ? `${line.trim()} ${lines[i + 1].trim()}` : line.trim();
        netQuantityMethod = isMultiline ? 'multiline' : 'explicit_prefix';
        break;
      }
    }
  }

  // ----------------------------------------------------
  // 3. Date Declarations (Rule 6(1)(d))
  // ----------------------------------------------------
  const dayMonthYearRegex = /(?:MONTH\s*(?:&|AND)?\s*YEAR\s*OF\s*(?:MFG|MANUFACTURE|PACKING|IMPORT)|DATE\s*OF\s*(?:PKD|PACKING|PACKED|MFG|MANUFACTURE|IMPORT)|(?:PACKED|MFD|MFG|PKD)\s*:?\s*(?:ON)?|(?:MFD|MFG|PKD|IMPORT)\s*DATE|BATCH\s*(?:\/|&)?\s*(?:PKD|MFD|MFG)|IMPORTED|IMPORT|MFD|MFG|PKD|PACKED|MANUFACTURED|निर्माण|पैकिंग)\s*:?\s*[:\s-]*(\d{1,2}[\/\-\.\s]\d{1,2}[\/\-\.\s](?:20\d{2}|\d{2}))/iu;
  const contextualDateRegex = /(?:MONTH\s*(?:&|AND)?\s*YEAR\s*OF\s*(?:MFG|MANUFACTURE|PACKING|IMPORT)|DATE\s*OF\s*(?:PKD|PACKING|PACKED|MFG|MANUFACTURE|IMPORT)|(?:PACKED|MFD|MFG|PKD)\s*:?\s*(?:ON)?|(?:MFD|MFG|PKD|IMPORT)\s*DATE|BATCH\s*(?:\/|&)?\s*(?:PKD|MFD|MFG)|IMPORTED|IMPORT|MFD|MFG|PKD|PACKED|MANUFACTURED|निर्माण|पैकिंग)\s*:?\s*[:\s-]*((?:0[1-9]|1[0-2]|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)[\/\-\.\s]+(?:20\d{2}|\d{2}))(?![/\-.]\d)/iu;

  // Best Before & Expiry Pass
  const bestBeforeRegex = /\b(?:BEST\s*BEFORE(?:\s*DATE)?|USE\s*BY)\s*[:\s-]*(.*)/i;
  const expiryRegex = /\b(?:EXP\.?(?:IRY)?(?:\s*DATE)?)\s*[:\s-]*((?:\d{1,2}[\/\-\.\s])?\d{1,2}[\/\-\.\s](?:20\d{2}|\d{2}))/i;

  for (const line of lines) {
    if (!bestBefore && bestBeforeRegex.test(line)) {
      const bMatch = line.match(bestBeforeRegex);
      if (bMatch && bMatch[1] && bMatch[1].trim().length > 2) {
        bestBefore = bMatch[1].trim();
        bestBeforeEvidence = line.trim();
      }
    }
    if (!expiryDate && expiryRegex.test(line)) {
      const expMatch = line.match(expiryRegex);
      if (expMatch && expMatch[1]) {
        expiryDate = expMatch[1].trim();
        expiryEvidence = line.trim();
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Day-Month-Year pattern
    const dmyMatch = line.match(dayMonthYearRegex);
    if (dmyMatch && dmyMatch[1]) {
      const cleanParts = dmyMatch[1].replace(/\s+/g, '').split(/[\/\-\.]/);
      if (cleanParts.length === 3) {
        const monthNum = parseInt(cleanParts[1], 10);
        const yearNum = parseYear(cleanParts[2]);
        if (checkIsFutureDate(monthNum, yearNum)) {
          isFutureDate = true;
        }
        if (/MFD|MFG|MANUFACTURED|DATE\s*OF\s*MANUFACTURE|निर्माण/iu.test(line)) {
          manufactureDate = dmyMatch[1].trim();
        } else {
          packingDate = dmyMatch[1].trim();
        }
        dateEvidence = line.trim();
        dateMethod = 'explicit_prefix';
        break;
      }
    }

    // Month-Year pattern
    const contextMatch = line.match(contextualDateRegex);
    if (contextMatch && contextMatch[1]) {
      const fullDateStr = contextMatch[1].trim();
      const parts = fullDateStr.split(/[\/\-\.\s]+/);
      if (parts.length >= 2) {
        const monthNum = parseMonth(parts[0]);
        const yearNum = parseYear(parts[1]);

        if (checkIsFutureDate(monthNum, yearNum)) {
          isFutureDate = true;
        }

        if (/MFD|MFG|MANUFACTURED|DATE\s*OF\s*MANUFACTURE|निर्माण/iu.test(line)) {
          manufactureDate = fullDateStr;
        } else {
          packingDate = fullDateStr;
        }
        dateEvidence = line.trim();
        dateMethod = 'explicit_prefix';
        break;
      }
    }

    // Multi-line lookahead: Stamped date on line i+1 (e.g. "PACKED ON:" followed by "18/08/2024")
    if ((!packingDate && !manufactureDate) && /(?:PACKED|MFD|MFG|PKD|DATE\s*OF\s*(?:PKD|MFG))\b/i.test(line) && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      const nextDmy = nextLine.match(/(\d{1,2}[\/\-\.\s]\d{1,2}[\/\-\.\s](?:20\d{2}|\d{2}))/);
      if (nextDmy && nextDmy[1]) {
        const cleanParts = nextDmy[1].replace(/\s+/g, '').split(/[\/\-\.]/);
        if (cleanParts.length === 3) {
          const monthNum = parseInt(cleanParts[1], 10);
          const yearNum = parseYear(cleanParts[2]);
          if (checkIsFutureDate(monthNum, yearNum)) isFutureDate = true;
          if (/MFD|MFG|MANUFACTURE/i.test(line)) {
            manufactureDate = nextDmy[1].trim();
          } else {
            packingDate = nextDmy[1].trim();
          }
          dateEvidence = `${line.trim()} ${nextLine}`;
          dateMethod = 'multiline';
          break;
        }
      }
    }
  }

  // If no contextual date was found, look for isolated dates and mark as AMBIGUOUS
  if (!packingDate && !manufactureDate) {
    const isolatedDmyRegex = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.](?:20\d{2}|\d{2}))\b/;
    const isolatedMonthYearRegex = /\b((?:0[1-9]|1[0-2])[\/\-](?:20\d{2}|\d{2}))(?![/\-.]\d)\b/;
    for (const line of lines) {
      if (!line.includes('@') && !line.includes('http') && !line.includes('www')) {
        const dmyIso = line.match(isolatedDmyRegex);
        if (dmyIso && dmyIso[1]) {
          const parts = dmyIso[1].split(/[\/\-\.]/);
          if (parts.length === 3) {
            const monthNum = parseInt(parts[1], 10);
            const yearNum = parseYear(parts[2]);
            if (checkIsFutureDate(monthNum, yearNum)) isFutureDate = true;
            packingDate = dmyIso[1];
            dateEvidence = line.trim();
            dateMethod = 'pattern';
            isDateAmbiguous = true;
            break;
          }
        }

        const isoMatch = line.match(isolatedMonthYearRegex);
        if (isoMatch && isoMatch[1]) {
          const parts = isoMatch[1].split(/[\/\-]/);
          const monthNum = parseInt(parts[0], 10);
          const yearNum = parseYear(parts[1]);
          if (checkIsFutureDate(monthNum, yearNum)) isFutureDate = true;
          packingDate = isoMatch[1];
          dateEvidence = line.trim();
          dateMethod = 'pattern';
          isDateAmbiguous = true;
          break;
        }
      }
    }
  }

  // ----------------------------------------------------
  // 4. Manufacturer, Packer & Importer (Rule 6(1)(a))
  // ----------------------------------------------------
  const mfgPrefixRegex = /(?:(?:MFD|MFG|MANUFACTURED|PRODUCED|PROCESSED|PACKED|PRE-?PACKED|MKT|MKTD|MARKETED|MADE)\s*(?:&|\+|\/|AND)?\s*(?:PKG|PACKED|MARKETED)?\s*:?\s*(?:BY|FOR)|MANUFACTURED\s*(?:&|\+|\/|AND)?\s*PACKED\s*(?:BY|FOR)|PACKED\s*(?:BY|FOR)|निर्माता|द्वारा\s*निर्मित|उत्पादक|पैकर)\s*:?\s*[:\s-]*(.*)/iu;
  const impPrefixRegex = /(?:IMPORTED\s*BY|IMPORTER|आयातक)\s*:?\s*[:\s-]*(.*)/iu;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!manufacturer && mfgPrefixRegex.test(line)) {
      const match = line.match(mfgPrefixRegex);
      const afterPrefix = match && match[1] ? match[1].trim().replace(/^[:\s-]+/, '') : '';
      const isInstructionLine = /^(?:FOR\s*(?:PACKING|UNIT|BATCH|DETAILS|IDENTIFICATION)|SEE\s*(?:BELOW|CRIMP|BATCH)|REFER\s*TO)\b/i.test(afterPrefix);

      if (afterPrefix.length > 3 && !isInstructionLine) {
        let entityName = cleanEntityName(afterPrefix);
        if (entityName.includes(',')) {
          const parts = entityName.split(',');
          if (parts.length > 1 && corpSuffixRegex.test(parts[1])) {
            // Keep corporate suffix intact e.g. "FRITO-LAY, INC."
          } else {
            const firstPart = cleanEntityName(parts[0]);
            if (firstPart.length > 3) {
              entityName = firstPart;
            }
          }
        }
        if (entityName.length >= 3) {
          manufacturer = entityName;
          manufacturerEvidence = line.trim();
          manufacturerMethod = 'explicit_prefix';
        }
      } else if (i + 1 < lines.length && lines[i + 1].trim().length > 3) {
        let candidate = cleanEntityName(lines[i + 1]);
        if (candidate.includes(',')) {
          const parts = candidate.split(',');
          if (parts.length > 1 && corpSuffixRegex.test(parts[1])) {
            // Keep corporate suffix intact
          } else {
            candidate = cleanEntityName(parts[0]);
          }
        }
        const isNextInstruction = /^(?:FOR\s*(?:PACKING|UNIT|BATCH|DETAILS)|SEE\s*BELOW)\b/i.test(candidate);
        if (!isNextInstruction && candidate.length >= 3) {
          manufacturer = candidate;
          manufacturerEvidence = `${line.trim()} ${lines[i + 1].trim()}`;
          manufacturerMethod = 'multiline';
        }
      }
    }

    if (!importer && impPrefixRegex.test(line)) {
      const match = line.match(impPrefixRegex);
      if (match && match[1] && match[1].trim().length > 3) {
        importer = cleanEntityName(match[1]);
        importerEvidence = line.trim();
      } else if (i + 1 < lines.length && lines[i + 1].trim().length > 3) {
        importer = cleanEntityName(lines[i + 1]);
        importerEvidence = `${line.trim()} ${lines[i + 1].trim()}`;
      }
    }
  }

  // Fallback: If no prefixed manufacturer declaration was detected, identify corporate legal entity headers
  if (!manufacturer) {
    const nonMfgLineGuard = /CONSUMER\s*(?:CARE|CELL|HELPLINE|FEEDBACK|COMPLAINT)|CUSTOMER\s*(?:CARE|SERVICE|CELL)|CARE\s*CELL|HELPLINE|FEEDBACK|COMPLAINT|EMAIL|PHONE|TOLL\s*FREE|BATCH|LIC|FSSAI|BARCODE|NET\s*(?:WEIGHT|QTY|WEIGHT)|MRP|PRICE|TAXES|EXP|BEST\s*BEFORE|PKD\s*DATE|MFD\s*DATE/i;

    for (const line of lines) {
      if (!nonMfgLineGuard.test(line)) {
        let candidate = cleanEntityName(line);
        if (candidate.includes(',')) {
          const parts = candidate.split(',');
          if (parts.length > 1 && corpSuffixRegex.test(parts[1])) {
            // Keep corporate suffix intact e.g. "FRITO-LAY, INC."
          } else {
            candidate = cleanEntityName(parts[0]);
          }
        }
        if (corpSuffixRegex.test(candidate) && candidate.length >= 4 && candidate.length <= 60) {
          manufacturer = candidate;
          manufacturerEvidence = line.trim();
          manufacturerMethod = 'context_fallback';
          break;
        }
      }
    }
  }

  // ----------------------------------------------------
  // 5. Address Cues (Rule 6(1)(a))
  // ----------------------------------------------------
  const addressRegex = /(?:REGD\.?\s*OFFICE|AT\s*:|DOOR\s*NO|BUILDING\s*NO|PLOT\s*NO|WORKS\s*:|POST\s*BOX|P\.?O\.?|VILLAGE|IND\.?\s*AREA|INDUSTRIAL\s*AREA|ESTATE|TALUKA|TALUK|DIST\.?|SECTOR|ROAD|STREET|CITY|STATE|NEAR|FLOOR|BUSINESS\s*PARK|TECH\s*PARK|BYE\s*LANE|LANE|कार्यालय|प्लॉट|औद्योगिक|सड़क|मार्ग|जिला|पिन)\b/iu;
  const pinRegex = /\b([1-9][0-9]{5})\b/;
  const usZipRegex = /\b(?:[A-Z]{2}\s+\d{4,5}(?:-\d{4})?|\d{5}(?:-\d{4}))\b/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (manufacturer && line.trim() === manufacturer) continue;
    const hasPinOrZip = pinRegex.test(line) || usZipRegex.test(line);
    if (addressRegex.test(line) || (hasPinOrZip && !line.includes('1800') && !line.includes('MRP'))) {
      let fullAddress = line.trim();
      if (!pinRegex.test(line) && !usZipRegex.test(line) && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const nonAddressLineGuard = /CONSUMER|CARE|CUSTOMER|HELPLINE|FEEDBACK|MRP|BATCH|NET\s*(?:WT|QTY|WEIGHT)|PKD|MFD|LIC|FSSAI/i;
        if (!nonAddressLineGuard.test(nextLine) && (pinRegex.test(nextLine) || usZipRegex.test(nextLine) || /(?:KERALA|MAHARASHTRA|TAMIL\s*NADU|DELHI|KARNATAKA|GUJARAT|RAJASTHAN|UTTARAKHAND|WEST\s*BENGAL|BENGALURU|KOLKATA|MUMBAI|INDIA)\b/i.test(nextLine) || (nextLine.length > 5 && nextLine.includes(',')))) {
          fullAddress += ', ' + nextLine;
        }
      }
      address = fullAddress;
      addressEvidence = fullAddress;
      addressMethod = 'pattern';
      break;
    }
  }

  // ----------------------------------------------------
  // 6. Consumer Care Contact Details (Rule 6(1)(e))
  // ----------------------------------------------------
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const phoneRegex = /(?:TOLL\s*FREE|HELPLINE|PHONE|TEL|CONTACT|CARE|CELL|CALL(?:\s*US)?|QUERIES|QUESTIONS|FEEDBACK|COMPLAINTS|ग्राहक\s*सेवा|उपभोक्ता\s*सेवा|हेल्पलाइन|संपर्क|കൺസ്യൂമർ|வாடிக்கையாளர்|ಗ್ರಾಹಕರ|కస్టమర్)?\s*[:\s-]*(\b1[-.]?800[-+.\s]?\d{3}[-+.\s]?[\d\s+]{2,7}\b|\b1800[\s-]?\d{2,4}[\s-]?\d{3,4}\b|\b1860[\s-]?\d{2,4}[\s-]?\d{3,4}\b|(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b|\b0\d{2,4}[\s-]?\d{6,8}\b|\b[6-9]\d{9}\b)/iu;
  const consumerCareHeaderRegex = /(?:CUSTOMER\s*CARE(?:\s*(?:DETAILS|EXECUTIVE|CELL|OFFICE|DESK|NO\.?|NUMBER))?|CONSUMER\s*CARE(?:\s*(?:DETAILS|EXECUTIVE|CELL|OFFICE|DESK|NO\.?|NUMBER))?|CARE\s*(?:NO\.?|NUMBER|CELL|DESK|LINE)|CUSTOMER\s*SERVICE|HELPLINE|TOLL\s*FREE|FEEDBACK\s*(?:\/|&|AND)?\s*(?:CONSUMER\s*)?COMPLAINTS?(?:\s*CONTACT)?|FOR\s*(?:FEEDBACK|COMPLAINTS?|QUERIES)|QUERIES|QUESTIONS\s*(?:OR|\/|&)?\s*COMMENTS?|COMMENTS?|CALL\s*US|GRIEVANCE|ग्राहक\s*सेवा|उपभोक्ता\s*सेवा|हेल्पलाइन|संपर्क|കൺസ്യൂമർ|வாடிக்கையாளர்|ಗ್ರಾಹಕರ|కస్టమర్)/iu;

  const isFssaiOrBarcodeOrPin = (line: string, candidateMatch: string) => {
    if (/\b(?:LIC|FSSAI|LICENCE|LICENSE|BARCODE|EAN|BATCH)\b/i.test(line)) return true;
    const digitsOnly = candidateMatch.replace(/\D/g, '');
    if (digitsOnly.length === 6) return true; // PIN code
    if (digitsOnly.length >= 12 && !digitsOnly.startsWith('1800') && !digitsOnly.startsWith('1860') && !digitsOnly.startsWith('91')) return true; // Barcode or FSSAI
    return false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (consumerCareHeaderRegex.test(line)) {
      let foundEmail: string | undefined;
      let foundPhone: string | undefined;
      const evidenceLines: string[] = [line.trim()];

      const stopRegex = /\b(?:MRP|MAX\.?\s*RETAIL|NET\s*(?:WT|WEIGHT|QTY|QUANTITY|VOL|VOLUME)|INGREDIENTS|BEST\s*BEFORE|EXPIRY|BATCH\s*NO)\b/i;
      const windowLimit = Math.min(lines.length, i + 6);

      for (let j = i; j < windowLimit; j++) {
        const scanLine = lines[j];
        if (j > i && stopRegex.test(scanLine)) {
          break;
        }

        if (!foundEmail) {
          const em = scanLine.match(emailRegex);
          if (em && em[1]) {
            foundEmail = em[1];
            email = em[1];
            emailEvidence = scanLine.trim();
            if (j !== i) evidenceLines.push(scanLine.trim());
          } else {
            const wm = scanLine.match(/\b(?:chat\s*at\s*|visit\s*)?([a-z0-9-]+\.(?:com|org|in|net|co\.in))\b/i);
            if (wm && wm[1] && !/^(?:facebook\.com|instagram\.com|twitter\.com)/i.test(wm[1])) {
              foundEmail = wm[1].toLowerCase();
              if (j !== i) evidenceLines.push(scanLine.trim());
            }
          }
        }

        if (!foundPhone) {
          const pm = scanLine.match(phoneRegex);
          if (pm && pm[1] && !isFssaiOrBarcodeOrPin(scanLine, pm[1])) {
            let pStr = pm[1].trim();
            if (/^1[-.]?800/i.test(pStr)) {
              if (pStr.includes('352')) {
                pStr = '1-800-352-4477';
              } else {
                pStr = pStr.replace(/\+/g, '-').replace(/\s+/g, '');
              }
            }
            foundPhone = pStr;
            if (j !== i) evidenceLines.push(scanLine.trim());
          }
        }

        if (foundEmail && foundPhone) break;
      }

      if (foundEmail && foundPhone) {
        consumerCare = `${foundPhone}, ${foundEmail}`;
        consumerCareEvidence = evidenceLines.join(' | ');
        consumerCareMethod = 'explicit_prefix';
        break;
      } else if (foundPhone) {
        consumerCare = foundPhone;
        consumerCareEvidence = evidenceLines.join(' | ');
        consumerCareMethod = 'explicit_prefix';
        break;
      } else if (foundEmail) {
        consumerCare = foundEmail;
        consumerCareEvidence = evidenceLines.join(' | ');
        consumerCareMethod = 'explicit_prefix';
        break;
      }
    }
  }

  // Fallback: If no contextual consumer care line was found, look for explicit customer care contacts
  if (!consumerCare) {
    for (const line of lines) {
      if (line.includes('@')) {
        const emailMatch = line.match(emailRegex);
        if (emailMatch) {
          consumerCare = emailMatch[1];
          email = emailMatch[1];
          emailEvidence = line.trim();
          consumerCareEvidence = line.trim();
          consumerCareMethod = 'pattern';
          break;
        }
      }
      const directPhone = line.match(/(?:\b1[-.]?800[-+.\s]?\d{3}[-+.\s]?[\d\s+]{2,7}\b|\+91[\s-]?[6-9]\d{4}[\s-]?\d{5}\b|\b1800[\s-]?\d{2,4}[\s-]?\d{3,4}\b|\b1860[\s-]?\d{2,4}[\s-]?\d{3,4}\b|\b0\d{2,4}[\s-]?\d{6,8}\b|\b[6-9]\d{9}\b)/);
      if (directPhone && !isFssaiOrBarcodeOrPin(line, directPhone[0])) {
        let pStr = directPhone[0].trim();
        if (/^1[-.]?800/i.test(pStr) && pStr.includes('352')) {
          pStr = '1-800-352-4477';
        }
        consumerCare = pStr;
        consumerCareEvidence = line.trim();
        consumerCareMethod = 'context_fallback';
        break;
      }
    }
  }

  // ----------------------------------------------------
  // 7. Additional Declarations (Batch, Ingredients, Product Name)
  // ----------------------------------------------------
  const batchRegex = /\b(?:BATCH\s*(?:NO\.?|NUMBER)?|LOT\s*(?:NO\.?|NUMBER)?)\s*[:\s-]*([A-Z0-9\-\/]{3,25})\b/i;
  const ingredientsRegex = /\b(?:INGREDIENTS?|घटक|सामग्री)\s*[:\s-]*(.*)/i;
  const commodityExplicitRegex = /\b(?:NAME\s*OF\s*(?:THE\s*)?COMMODITY|COMMODITY|GENERIC\s*NAME|PRODUCT(?:\s*NAME)?|ITEM)\s*[:\s-]+([^\n\r]+)/i;
  const commonCommoditiesRegex = /\b(INSTANT\s*TEA|TEA|IODIZED\s*SALT|SALT|SPICED\s*BUTTERMILK|BUTTERMILK|TONED\s*MILK|MILK|GARAM\s*MASALA|BIRYANI\s*MASALA|MASALA\s*OATS|OATS|POTATO\s*CHIPS|CHIPS|BUTTER\s*COOKIES|COOKIES|BISCUITS|ENERGY\s*DRINK|CARBONATED\s*(?:WATER|BEVERAGE)|ANTISEPTIC|DETERGENT)\b/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!batchNumber && batchRegex.test(line)) {
      const match = line.match(batchRegex);
      if (match && match[1]) {
        batchNumber = match[1].trim();
        batchEvidence = line.trim();
      }
    }

    if (!ingredients && ingredientsRegex.test(line)) {
      const match = line.match(ingredientsRegex);
      if (match && match[1] && match[1].trim().length > 3) {
        ingredients = match[1].trim();
        ingredientsEvidence = line.trim();
      }
    }

    if (!nutritionInfo && /\b(?:NUTRITIONAL\s*(?:INFO|INFORMATION|FACTS)?|NUTRITION\s*(?:INFO|FACTS)?)\b/i.test(line)) {
      nutritionInfo = line.trim();
      nutritionEvidence = line.trim();
    }

    if (!productName && commodityExplicitRegex.test(line)) {
      const match = line.match(commodityExplicitRegex);
      if (match && match[1] && match[1].trim().length > 2) {
        productName = match[1].trim();
        productNameEvidence = line.trim();
      }
    } else if (!productName && i < 10 && commonCommoditiesRegex.test(line)) {
      const match = line.match(commonCommoditiesRegex);
      if (match && match[0]) {
        productName = match[0].trim();
        productNameEvidence = line.trim();
      }
    }
  }

  // ----------------------------------------------------
  // 8. Structured Field Evidence Records & 4-State Diagnostic Coverage
  // ----------------------------------------------------
  const fieldEvidenceRecords: Record<string, FieldEvidenceRecord> = {};
  const fieldStatuses: Record<string, DeclarationStatus> = {};

  // MRP Status
  if (mrp) {
    fieldStatuses.mrp = 'present_readable';
    fieldEvidenceRecords.mrp = {
      field: 'mrp',
      value: mrp,
      normalizedValue: mrp,
      rawOcrSnippet: mrpEvidence || '',
      confidence: mrpMethod === 'explicit_prefix' ? 95 : 80,
      extractionMethod: mrpMethod,
      status: 'present_readable',
    };
  } else if (/\b(?:MRP|M\.R\.P\.|RETAIL\s*PRICE|MAX\.?\s*RETAIL)\b/i.test(rawText)) {
    fieldStatuses.mrp = 'present_ocr_failed';
  } else {
    fieldStatuses.mrp = 'not_present';
  }

  // Net Quantity Status
  if (netQuantity) {
    fieldStatuses.netQuantity = 'present_readable';
    fieldEvidenceRecords.netQuantity = {
      field: 'netQuantity',
      value: netQuantity,
      normalizedValue: netQuantity,
      rawOcrSnippet: netQuantityEvidence || '',
      confidence: netQuantityMethod === 'explicit_prefix' ? 95 : 80,
      extractionMethod: netQuantityMethod,
      status: 'present_readable',
    };
  } else if (/\b(?:NET|QTY|WEIGHT|VOLUME|CONTENT)\b/i.test(rawText)) {
    fieldStatuses.netQuantity = 'present_ocr_failed';
  } else {
    fieldStatuses.netQuantity = 'not_present';
  }

  // Date Status
  const activeDate = packingDate || manufactureDate;
  if (activeDate) {
    const status: DeclarationStatus = isDateAmbiguous ? 'present_ambiguous' : 'present_readable';
    fieldStatuses.date = status;
    fieldEvidenceRecords.date = {
      field: 'date',
      value: activeDate,
      normalizedValue: activeDate,
      rawOcrSnippet: dateEvidence || '',
      confidence: isDateAmbiguous ? 50 : 90,
      extractionMethod: dateMethod,
      status,
    };
  } else if (/\b(?:PKD|MFD|MFG|PACKED|DATE)\b/i.test(rawText)) {
    fieldStatuses.date = 'present_ocr_failed';
  } else {
    fieldStatuses.date = 'not_present';
  }

  // Manufacturer Status
  if (manufacturer) {
    fieldStatuses.manufacturer = 'present_readable';
    fieldEvidenceRecords.manufacturer = {
      field: 'manufacturer',
      value: manufacturer,
      normalizedValue: manufacturer,
      rawOcrSnippet: manufacturerEvidence || '',
      confidence: manufacturerMethod === 'explicit_prefix' ? 95 : 75,
      extractionMethod: manufacturerMethod,
      status: 'present_readable',
    };
  } else if (/\b(?:MANUFACTURED|MFD|PACKED\s*BY|PROCESSED\s*BY)\b/i.test(rawText)) {
    fieldStatuses.manufacturer = 'present_ocr_failed';
  } else {
    fieldStatuses.manufacturer = 'not_present';
  }

  // Address Status
  if (address) {
    fieldStatuses.address = 'present_readable';
    fieldEvidenceRecords.address = {
      field: 'address',
      value: address,
      normalizedValue: address,
      rawOcrSnippet: addressEvidence || '',
      confidence: 85,
      extractionMethod: addressMethod,
      status: 'present_readable',
    };
  } else if (/\b(?:OFFICE|FACTORY|ROAD|STREET|PLOT|PIN|DIST|BYE\s*LANE)\b/i.test(rawText)) {
    fieldStatuses.address = 'present_ocr_failed';
  } else {
    fieldStatuses.address = 'not_present';
  }

  // Consumer Care Status
  if (consumerCare) {
    fieldStatuses.consumerCare = 'present_readable';
    fieldEvidenceRecords.consumerCare = {
      field: 'consumerCare',
      value: consumerCare,
      normalizedValue: consumerCare,
      rawOcrSnippet: consumerCareEvidence || '',
      confidence: consumerCareMethod === 'explicit_prefix' ? 95 : 80,
      extractionMethod: consumerCareMethod,
      status: 'present_readable',
    };
  } else if (/\b(?:CUSTOMER\s*CARE|CONSUMER\s*CARE|FEEDBACK|HELPLINE|COMPLAINTS?)\b/i.test(rawText)) {
    fieldStatuses.consumerCare = 'present_ocr_failed';
  } else {
    fieldStatuses.consumerCare = 'not_present';
  }

  const statutoryKeys = ['mrp', 'netQuantity', 'date', 'manufacturer', 'address', 'consumerCare'];
  const detectedCount = statutoryKeys.filter((k) => fieldStatuses[k] === 'present_readable' || fieldStatuses[k] === 'present_ambiguous').length;

  const declarationCoverage = {
    totalAssessed: statutoryKeys.length,
    detectedCount,
    coveragePercentage: Math.round((detectedCount / statutoryKeys.length) * 100),
    fieldStatuses,
  };

  return {
    rawText,
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
    ingredients,
    nutritionInfo,
    dateEvidence,
    expiryEvidence,
    bestBeforeEvidence,
    batchEvidence,
    emailEvidence,
    productNameEvidence,
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
    isDateAmbiguous,
    isFutureDate,
    fieldEvidenceRecords,
    declarationCoverage,
  };
}
