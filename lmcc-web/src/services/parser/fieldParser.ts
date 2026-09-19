import { ExtractedLabel } from '../../models/ExtractedLabel';
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

  let netQuantity: string | undefined;
  let netQuantityEvidence: string | undefined;

  let packingDate: string | undefined;
  let manufactureDate: string | undefined;
  let dateEvidence: string | undefined;

  let manufacturer: string | undefined;
  let manufacturerEvidence: string | undefined;

  let address: string | undefined;
  let addressEvidence: string | undefined;

  let consumerCare: string | undefined;
  let consumerCareEvidence: string | undefined;

  let importer: string | undefined;
  let importerEvidence: string | undefined;

  let isDateAmbiguous = false;
  let isFutureDate = false;

  // ----------------------------------------------------
  // 1. MRP Extraction (Rule 6(1)(da))
  // ----------------------------------------------------
  // Matches:
  // "MRP: ₹99", "MRP ₹ 99.00", "MRP:99", "MRP 99", "₹99 MRP", "₹99", "Rs. 99", "Rs 99", "MRP: Rs. 99 /-",
  // "MRP (INCL. OF ALL TAXES): ₹ 250.00", "MRP INCL ALL TAXES: ₹ 320.00",
  // "अधिकतम खुदरा मूल्य: ₹45.00 (सभी कर सहित)", "₹99.00", "99/-"
  const mrpExplicitRegex = /\b(?:MRP|M\.R\.P\.|MAX\.?\s*RETAIL\s*PRICE|अधिकतम\s*खुदरा\s*मूल्य|एम\.?आर\.?पी\.?)\s*:?\s*(?:\(?\s*INCL\.?(?:USIVE)?\s*(?:OF\s*)?ALL\s*TAXES\s*\)?|सभी\s*कर\s*सहित)?\s*[:\s-]*(?:₹|Rs\.?|INR)?\s*[:\s-]*(\d+(?:\.\d{1,2})?)\s*(?:\/-\s*)?(?:\(?\s*(?:INCL\.?(?:USIVE)?\s*OF\s*ALL\s*TAXES|सभी\s*कर\s*सहित)\s*\)?)?/iu;
  const mrpSuffixRegex = /(?:₹|Rs\.?|INR)\s*(\d+(?:\.\d{1,2})?)\s*(?:MRP|M\.R\.P\.)/i;
  const mrpCurrencyRegex = /(?:₹|Rs\.?)\s*(\d+(?:\.\d{1,2})?)(?:\s*\/-)?(?:\s*\(?(?:INCL\.?(?:USIVE)?\s*OF\s*ALL\s*TAXES|सभी\s*कर\s*सहित)\)?)?/iu;
  const mrpTrailingSlashRegex = /(?:₹|Rs\.?)\s*(\d+(?:\.\d{1,2})?)\s*\/-/i;

  for (const line of lines) {
    // Priority 1: Explicit MRP prefix
    if (/\b(?:MRP|M\.R\.P\.|MAX\.?\s*RETAIL\s*PRICE)\b/i.test(line) || /(?:अधिकतम\s*खुदरा\s*मूल्य|एम\.?आर\.?पी)/u.test(line)) {
      const match = line.match(mrpExplicitRegex);
      if (match && match[1]) {
        const val = parseFloat(match[1]);
        if (val > 0 && val < 500000) {
          mrp = `₹${match[1]}`;
          mrpEvidence = line.trim();
          break;
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
        break;
      }
    }
  }

  // Priority 3: Currency symbol with "inclusive of all taxes" or stand-alone currency price
  if (!mrp) {
    for (const line of lines) {
      if (/(?:INCL|TAXES|₹|Rs\.|सभी\s*कर)/iu.test(line) && !/NET|QTY|WT|WEIGHT|PHONE|CARE|PIN|ग्राम|किग्रा/iu.test(line)) {
        const match = line.match(mrpCurrencyRegex);
        if (match && match[1]) {
          const val = parseFloat(match[1]);
          // Guard: Avoid PIN codes (e.g. 400001), phone numbers, or barcode numbers
          if (val > 0 && val < 100000 && !/^\d{6}$/.test(match[1])) {
            mrp = `₹${match[1]}`;
            mrpEvidence = line.trim();
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
          break;
        }
      }
    }
  }

  // ----------------------------------------------------
  // 2. Net Quantity Extraction (Rule 6(1)(c))
  // ----------------------------------------------------
  // Standard legal units: g, gm, grams, kg, ml, l, litre, litres, pieces, units, N, ग्राम, किग्रा, आदि
  const qtyRegex = /(?:NET\s*(?:QTY|QUANTITY|WT\.?|WEIGHT|VOL\.?|VOLUME|MASS|CONTENT)?|QUANTITY|शुद्ध\s*(?:मात्रा|वजन)|मात्रा|वजन|അളവ്|തൂക്കം|നിവ്വള\s*തൂക|തൂക|నికర\s*పరిమాణం|நிகர\s*எடை)?\s*:?\s*[:\s-]*[({[\s]*(\d+(?:\.\d+)?)\s*(kg|g|gm|gms|grams|ml|l|ltr|litres?|mg|units?|pieces?|N|ग्राम|किग्रा|कि\.ग्रा\.|मि\.ली\.|लीटर)\b(?:\s*\(?(?:WHEN\s*PACKED)?\)?)?/iu;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:NET|QTY|QUANTITY|WEIGHT|VOLUME|MASS|CONTENT|gm|kg|ml|ltr|\bN\b|\bL\b|\bg\b|वजन|मात्रा|ग्राम|किग्रा|അളവ്|തൂക്കം|നിവ്വള|തൂക|నికర|పరిమాణం|நிகர|எடை)/iu.test(line)) {
      let match = line.match(qtyRegex);
      if ((!match || !match[1]) && i + 1 < lines.length) {
        // Multi-line declaration: e.g. "NET WEIGHT:" followed by "1 KG"
        const combined = `${line} ${lines[i + 1]}`;
        match = combined.match(qtyRegex);
      }

      if (match && match[1] && match[2]) {
        const num = match[1];
        let unit = match[2].toLowerCase();
        // Normalize unit naming
        if (unit === 'gm' || unit === 'gms' || unit === 'grams' || unit === 'ग्राम') unit = 'g';
        if (unit === 'ltr' || unit === 'litres' || unit === 'litre' || unit === 'लीटर') unit = 'l';
        if (unit === 'किग्रा' || unit === 'कि.ग्रा.') unit = 'kg';
        if (unit === 'मि.ली.') unit = 'ml';
        netQuantity = `${num} ${unit}`;
        netQuantityEvidence = line.trim();
        break;
      }
    }
  }

  // ----------------------------------------------------
  // 3. Date Declaration (Rule 6(1)(d))
  // ----------------------------------------------------
  // Contextual date patterns with explicit statutory prefixes
  const dayMonthYearRegex = /(?:MONTH\s*(?:&|AND)?\s*YEAR\s*OF\s*(?:MFG|MANUFACTURE|PACKING|IMPORT)|DATE\s*OF\s*(?:PKD|PACKING|PACKED|MFG|MANUFACTURE|IMPORT)|(?:PACKED|MFD|MFG|PKD)\s*:?\s*(?:ON)?|(?:MFD|MFG|PKD|IMPORT)\s*DATE|BATCH\s*(?:\/|&)?\s*(?:PKD|MFD|MFG)|IMPORTED|IMPORT|MFD|MFG|PKD|PACKED|MANUFACTURED|निर्माण|पैकिंग)\s*:?\s*[:\s-]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.](?:20\d{2}|\d{2}))/iu;
  const contextualDateRegex = /(?:MONTH\s*(?:&|AND)?\s*YEAR\s*OF\s*(?:MFG|MANUFACTURE|PACKING|IMPORT)|DATE\s*OF\s*(?:PKD|PACKING|PACKED|MFG|MANUFACTURE|IMPORT)|(?:PACKED|MFD|MFG|PKD)\s*:?\s*(?:ON)?|(?:MFD|MFG|PKD|IMPORT)\s*DATE|BATCH\s*(?:\/|&)?\s*(?:PKD|MFD|MFG)|IMPORTED|IMPORT|MFD|MFG|PKD|PACKED|MANUFACTURED|निर्माण|पैकिंग)\s*:?\s*[:\s-]*((?:0[1-9]|1[0-2]|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)[\/\-\.\s]+(?:20\d{2}|\d{2}))(?![/\-.]\d)/iu;

  for (const line of lines) {
    const dmyMatch = line.match(dayMonthYearRegex);
    if (dmyMatch && dmyMatch[1]) {
      const parts = dmyMatch[1].split(/[\/\-\.]/);
      if (parts.length === 3) {
        const monthNum = parseInt(parts[1], 10);
        const yearNum = parseYear(parts[2]);
        if (checkIsFutureDate(monthNum, yearNum)) {
          isFutureDate = true;
        }
        if (/MFD|MFG|MANUFACTURED|DATE\s*OF\s*MANUFACTURE|निर्माण/iu.test(line)) {
          manufactureDate = dmyMatch[1];
        } else {
          packingDate = dmyMatch[1];
        }
        dateEvidence = line.trim();
        break;
      }
    }

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
        break;
      }
    }
  }

  // If no contextual date was found, look for isolated dates and mark as AMBIGUOUS
  if (!packingDate && !manufactureDate) {
    const isolatedDmyRegex = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.](?:20\d{2}|\d{2}))\b/;
    const isolatedMonthYearRegex = /\b((?:0[1-9]|1[0-2])[\/\-](?:20\d{2}|\d{2}))(?![/\-.]\d)\b/;
    for (const line of lines) {
      // Don't match dates inside URLs, emails, or phone numbers
      if (!line.includes('@') && !line.includes('http') && !line.includes('www')) {
        const dmyIso = line.match(isolatedDmyRegex);
        if (dmyIso && dmyIso[1]) {
          const parts = dmyIso[1].split(/[\/\-\.]/);
          if (parts.length === 3) {
            const monthNum = parseInt(parts[1], 10);
            const yearNum = parseYear(parts[2]);
            if (checkIsFutureDate(monthNum, yearNum)) {
              isFutureDate = true;
            }
            packingDate = dmyIso[1];
            dateEvidence = line.trim();
            isDateAmbiguous = true;
            break;
          }
        }

        const isoMatch = line.match(isolatedMonthYearRegex);
        if (isoMatch && isoMatch[1]) {
          const parts = isoMatch[1].split(/[\/\-]/);
          const monthNum = parseInt(parts[0], 10);
          const yearNum = parseYear(parts[1]);
          if (checkIsFutureDate(monthNum, yearNum)) {
            isFutureDate = true;
          }
          // Mark as ambiguous because it lacks explicit statutory prefix (MFD/PKD)
          packingDate = isoMatch[1];
          dateEvidence = line.trim();
          isDateAmbiguous = true;
          break;
        }
      }
    }
  }

  // ----------------------------------------------------
  // ----------------------------------------------------
  // 4. Manufacturer, Packer & Importer (Rule 6(1)(a))
  // ----------------------------------------------------
  const mfgPrefixRegex = /(?:(?:MFD|MFG|MANUFACTURED|PRODUCED|PROCESSED|PACKED|PRE-?PACKED|MKTD|MARKETED|MADE)\s*(?:&|\+|\/|AND)?\s*(?:PKG|PACKED|MARKETED)?\s*:?\s*(?:BY|FOR)|MANUFACTURED\s*(?:&|\+|\/|AND)?\s*PACKED\s*(?:BY|FOR)|PACKED\s*(?:BY|FOR)|निर्माता|द्वारा\s*निर्मित|उत्पादक|पैकर)\s*:?\s*[:\s-]*(.*)/iu;
  const impPrefixRegex = /(?:IMPORTED\s*BY|IMPORTER|आयातक)\s*:?\s*[:\s-]*(.*)/iu;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!manufacturer && mfgPrefixRegex.test(line)) {
      const match = line.match(mfgPrefixRegex);
      if (match && match[1] && match[1].trim().length > 3) {
        manufacturer = match[1].trim().replace(/^[:\s-]+/, '');
        manufacturerEvidence = line.trim();
      } else if (i + 1 < lines.length && lines[i + 1].trim().length > 3) {
        manufacturer = lines[i + 1].trim();
        manufacturerEvidence = `${line.trim()} ${lines[i + 1].trim()}`;
      }
    }

    if (!importer && impPrefixRegex.test(line)) {
      const match = line.match(impPrefixRegex);
      if (match && match[1] && match[1].trim().length > 3) {
        importer = match[1].trim().replace(/^[:\s-]+/, '');
        importerEvidence = line.trim();
      } else if (i + 1 < lines.length && lines[i + 1].trim().length > 3) {
        importer = lines[i + 1].trim();
        importerEvidence = `${line.trim()} ${lines[i + 1].trim()}`;
      }
    }
  }

  // Fallback: If no prefixed manufacturer declaration was detected, identify corporate legal entity headers
  if (!manufacturer) {
    const corpSuffixRegex = /\b(?:PVT\.?\s*LTD\.?|PRIVATE\s*LIMITED|LIMITED|LTD\.?|LLP|FOOD\s*PRODUCTS|FOODS|AGRO\s*(?:FOODS|PRODUCTS)?|GRAINS|MILLS|SPICES|ENTERPRISES|UDYOG|INDUSTRIES|CHEMICALS|LABS|BAKERS|PRODUCTS|BEVERAGES|HERBALS|SNACKS|CONSUMER|CO\.?|CORP\.?)\b/i;
    const nonMfgLineGuard = /CONSUMER\s*(?:CARE|CELL|HELPLINE|FEEDBACK|COMPLAINT)|CUSTOMER\s*(?:CARE|SERVICE|CELL)|CARE\s*CELL|HELPLINE|FEEDBACK|COMPLAINT|EMAIL|PHONE|TOLL\s*FREE|BATCH|LIC|FSSAI|BARCODE|NET\s*(?:WEIGHT|QTY|QUANTITY|MASS|CONTENT)|MRP|PRICE|TAXES|EXP|BEST\s*BEFORE|PKD\s*DATE|MFD\s*DATE/i;

    for (const line of lines) {
      if (!nonMfgLineGuard.test(line)) {
        let candidate = line.trim();
        if (candidate.includes(',')) {
          candidate = candidate.split(',')[0].trim();
        }
        if (corpSuffixRegex.test(candidate) && candidate.length >= 4 && candidate.length <= 60) {
          manufacturer = candidate;
          manufacturerEvidence = line.trim();
          break;
        }
      }
    }
  }

  // ----------------------------------------------------
  // 5. Address Cues (Rule 6(1)(a))
  // ----------------------------------------------------
  const addressRegex = /(?:REGD\.?\s*OFFICE|AT\s*:|DOOR\s*NO|BUILDING\s*NO|PLOT\s*NO|WORKS\s*:|POST\s*BOX|P\.?O\.?|VILLAGE|IND\.?\s*AREA|INDUSTRIAL\s*AREA|ESTATE|TALUKA|TALUK|DIST\.?|SECTOR|ROAD|STREET|CITY|STATE|NEAR|कार्यालय|प्लॉट|औद्योगिक|सड़क|मार्ग|जिला|पिन)\b/iu;
  const pinRegex = /\b([1-9][0-9]{5})\b/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (addressRegex.test(line) || (pinRegex.test(line) && !line.includes('1800') && !line.includes('MRP'))) {
      let fullAddress = line.trim();
      // If line 1 does not contain the 6-digit postal PIN code, check if subsequent line(s) provide the city/state/PIN
      if (!pinRegex.test(line) && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const nonAddressLineGuard = /CONSUMER|CARE|CUSTOMER|HELPLINE|FEEDBACK|MRP|BATCH|NET\s*(?:WT|QTY|WEIGHT)|PKD|MFD|LIC|FSSAI/i;
        if (!nonAddressLineGuard.test(nextLine) && (pinRegex.test(nextLine) || /(?:KERALA|MAHARASHTRA|TAMIL\s*NADU|DELHI|KARNATAKA|GUJARAT|RAJASTHAN|UTTARAKHAND|INDIA)\b/i.test(nextLine) || (nextLine.length > 5 && nextLine.includes(',')))) {
          fullAddress += ', ' + nextLine;
        }
      }
      address = fullAddress;
      addressEvidence = fullAddress;
      break;
    }
  }

  // ----------------------------------------------------
  // 6. Consumer Care Contact Details (Rule 6(1)(e))
  // ----------------------------------------------------
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const phoneRegex = /(?:TOLL\s*FREE|HELPLINE|PHONE|TEL|CONTACT|CARE|CELL|CALL(?:\s*US)?|QUERIES|FEEDBACK|COMPLAINTS|ग्राहक\s*सेवा|उपभोक्ता\s*सेवा|हेल्पलाइन|संपर्क|കൺസ്യൂമർ|வாடிக்கையாளர்|ಗ್ರಾಹಕರ|కస్టమర్)?\s*[:\s-]*(\b1800[\s-]?\d{2,4}[\s-]?\d{3,4}\b|\b1860[\s-]?\d{2,4}[\s-]?\d{3,4}\b|(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b|\b0\d{2,4}[\s-]?\d{6,8}\b|\b[6-9]\d{9}\b)/iu;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/CUSTOMER|CONSUMER|FEEDBACK|COMPLAINT|CARE|HELPLINE|EMAIL|TOLL|QUERIES|CALL|CONTACT|TEL|PHONE|ग्राहक|उपभोक्ता|हेल्पलाइन|संपर्क|കൺസ്യൂമർ|வாடிக்கையாளர்|ಗ್ರಾಹಕರ|కస్టమర్/iu.test(line)) {
      let emailMatch = line.match(emailRegex);
      let phoneMatch = line.match(phoneRegex);

      if (!emailMatch && i + 1 < lines.length) {
        emailMatch = lines[i + 1].match(emailRegex);
      }
      if (!phoneMatch && i + 1 < lines.length) {
        phoneMatch = lines[i + 1].match(phoneRegex);
      }

      if (emailMatch && phoneMatch) {
        consumerCare = `${phoneMatch[1]}, ${emailMatch[1]}`;
        consumerCareEvidence = line.trim();
        break;
      } else if (emailMatch) {
        consumerCare = emailMatch[1];
        consumerCareEvidence = line.trim();
        break;
      } else if (phoneMatch && phoneMatch[1]) {
        consumerCare = phoneMatch[1];
        consumerCareEvidence = line.trim();
        break;
      }
    }
  }

  // Fallback: If no contextual consumer care line was found, look for explicit customer care contacts
  if (!consumerCare) {
    for (const line of lines) {
      if (line.includes('@') && !line.includes('http')) {
        const emailMatch = line.match(emailRegex);
        if (emailMatch) {
          consumerCare = emailMatch[1];
          consumerCareEvidence = line.trim();
          break;
        }
      }
      const directPhone = line.match(/(?:\+91[\s-]?[6-9]\d{4}[\s-]?\d{5}\b|\b1800[\s-]?\d{2,4}[\s-]?\d{3,4}\b)/);
      if (directPhone) {
        consumerCare = directPhone[0];
        consumerCareEvidence = line.trim();
        break;
      }
    }
  }

  return {
    rawText,
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
    isDateAmbiguous,
    isFutureDate,
  };
}
