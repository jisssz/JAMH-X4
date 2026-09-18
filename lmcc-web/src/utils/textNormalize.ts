/**
 * Normalizes raw OCR text to assist downstream regex and heuristic field parsers.
 * Preserves semantic structure while fixing common packaging OCR artifacts
 * across English, Hindi, and bilingual declarations.
 */
export function normalizeText(text: string): string {
  if (!text) return '';

  return (
    text
      // Replace non-standard whitespace and tabs
      .replace(/[\t\r\f\v]/g, ' ')

      // Normalize Devanagari numerals to standard Arabic numerals for regex consistency
      .replace(/०/g, '0')
      .replace(/१/g, '1')
      .replace(/२/g, '2')
      .replace(/३/g, '3')
      .replace(/४/g, '4')
      .replace(/५/g, '5')
      .replace(/६/g, '6')
      .replace(/७/g, '7')
      .replace(/८/g, '8')
      .replace(/९/g, '9')

      // Fix common OCR misrecognitions of Currency symbols:
      // "R$" or "R5" preceding digits or MRP
      .replace(/\b(?:R\$|R5)\s*(?=\d)/gi, '₹')
      // "Rs .", "Rs.", "R.S.", "RS", "INR", "रु", "रू" followed by digits or whitespace
      .replace(/\b(?:R\.S\.|Rs\.?|RS|INR)\s*(?=\.?\s*\d)/gi, '₹')
      .replace(/(?:रू|रु)\.?\s*(?=\d)/g, '₹')

      // Standardize M.R.P. variations (English & Hindi)
      .replace(/\bM\s*\.?\s*R\s*\.?\s*P\s*\.?:?/gi, 'MRP:')
      .replace(/(?:अधिकतम\s*खुदरा\s*मूल्य|एम\s*\.?\s*आर\s*\.?\s*पी\s*\.?|एमआरपी)\s*:?/gi, 'MRP:')

      // Standardize MFD / MFG / PKD BY variations (English & Hindi)
      .replace(/\bM\s*\.?\s*F\s*\.?\s*D\s*\.?\s*B\s*\.?\s*Y\s*:?/gi, 'MFD BY:')
      .replace(/\bM\s*\.?\s*F\s*\.?\s*G\s*\.?\s*B\s*\.?\s*Y\s*:?/gi, 'MFG BY:')
      .replace(/\bP\s*\.?\s*K\s*\.?\s*D\s*\.?\s*B\s*\.?\s*Y\s*:?/gi, 'PKD BY:')
      .replace(/(?:निर्माता|द्वारा\s*निर्मित|उत्पादक)\s*:?/gi, 'MFD BY:')
      .replace(/(?:पैकर|पैक्ड\s*बाय)\s*:?/gi, 'PKD BY:')

      // Standardize standalone MFD/MFG/PKD date prefixes (English & Hindi)
      .replace(/\b(?:MFD|MFG|PKD)\s*DATE\s*:?/gi, 'MFD:')
      .replace(/\bDATE\s*OF\s*(?:MFD|MFG|PKD|MANUFACTURE)\s*:?/gi, 'MFD:')
      .replace(/\bM\s*\.?\s*F\s*\.?\s*D\s*\.?(?!\s*BY):?/gi, 'MFD:')
      .replace(/\bM\s*\.?\s*F\s*\.?\s*G\s*\.?(?!\s*BY):?/gi, 'MFG:')
      .replace(/\bP\s*\.?\s*K\s*\.?\s*D\s*\.?(?!\s*BY):?/gi, 'PKD:')
      .replace(/(?:निर्माण\s*तिथि|उत्पादन\s*तिथि|निर्माण\s*माह)\s*:?/gi, 'MFD:')
      .replace(/(?:पैकिंग\s*तिथि|पैकिंग\s*माह)\s*:?/gi, 'PKD:')

      // Standardize NET QTY variations (English & Hindi)
      .replace(/\bNET\s+(?:QUANTITY|WT\.?|WEIGHT|VOL\.?|VOLUME)\s*:?/gi, 'NET QTY:')
      .replace(/(?:शुद्ध\s*(?:मात्रा|वजन)|कुल\s*(?:मात्रा|वजन)|नेट\s*वजन)\s*:?/gi, 'NET QTY:')

      // Standardize Hindi metric units to standard symbols
      .replace(/(\d+(?:\.\d+)?)\s*(?:ग्राम|ग्रा\.)/gu, '$1 g')
      .replace(/(\d+(?:\.\d+)?)\s*(?:किग्रा|कि\.ग्रा\.|किलो(?:ग्राम)?)/gu, '$1 kg')
      .replace(/(\d+(?:\.\d+)?)\s*(?:मि\.ली\.|मिली(?:लीटर)?)/gu, '$1 ml')
      .replace(/(\d+(?:\.\d+)?)\s*(?:लीटर)/gu, '$1 l')

      // Standardize Consumer Care variations
      .replace(/(?:ग्राहक\s*सेवा|उपभोक्ता\s*सेवा|शिकायत\s*निवारण|कस्टमर\s*केयर)\s*:?/gi, 'CUSTOMER CARE:')

      // Fix OCR misread of ".00" as ".OO", ".Oo", etc.
      .replace(/(\d+)\s*\.\s*(?:OO|Oo|oO|oo)\b/g, '$1.00')

      // Fix broken decimals in prices like "120 . 00" -> "120.00"
      .replace(/(\d+)\s*\.\s*(\d{2})\b/g, '$1.$2')

      // Fix OCR confusion in MRP numbers like "MRP 9S" -> "MRP 95"
      .replace(/\bMRP:\s*(\d+)S\b/gi, 'MRP: $15')

      // Clean multiple spaces on each line
      .split('\n')
      .map((line) => line.trim().replace(/ +/g, ' '))
      .filter((line) => line.length > 0)
      .join('\n')
  );
}
