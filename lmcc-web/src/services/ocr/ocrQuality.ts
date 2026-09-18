/**
 * OCR Quality Assessment Model.
 * Evaluates raw OCR character stream clarity, length, and presence of mandatory declaration cues.
 *
 * IMPORTANT DISTINCTION:
 * This evaluates TECHNICAL OCR READABILITY / SIGNAL INTEGRITY, NOT legal compliance.
 * An image with sharp OCR can have 'GOOD' OCR quality even if the product label violates Rule 6.
 * Conversely, a compliant package photographed in low light may have 'POOR' OCR quality.
 */

export type OcrQuality = 'GOOD' | 'FAIR' | 'POOR';

export interface OcrQualityAssessment {
  quality: OcrQuality;
  confidence: number;
  textLength: number;
  keywordHits: string[];
  reason: string;
}

const DECLARATION_KEYWORDS = [
  // MRP cues
  'mrp',
  'm.r.p',
  'retail price',
  'rs.',
  'rs',
  '₹',
  'incl',
  'taxes',
  'एमआरपी',
  'एम.आर.पी',
  'मूल्य',
  // Quantity cues
  'net wt',
  'net weight',
  'net qty',
  'net quantity',
  'net vol',
  'weight',
  'quantity',
  'वजन',
  'मात्रा',
  'ग्राम',
  'किग्रा',
  // Date cues
  'mfd',
  'mfg',
  'pkd',
  'packed',
  'manufactured',
  'date',
  'निर्माण',
  'पैकिंग',
  // Manufacturer cues
  'mfd by',
  'mfg by',
  'pkd by',
  'packed by',
  'marketed by',
  'manufactured by',
  'ltd',
  'pvt',
  'private',
  'limited',
  'निर्माता',
  // Consumer care cues
  'consumer care',
  'customer care',
  'feedback',
  'helpline',
  'care@',
  '1800',
  'toll free',
  'ग्राहक सेवा',
  'हेल्पलाइन',
];

/**
 * Assesses the quality of an OCR extraction result.
 */
export function assessOcrQuality(text: string, confidence: number): OcrQualityAssessment {
  const clean = (text || '').trim();
  const lower = clean.toLowerCase();
  const textLength = clean.length;

  // Find declaration keyword hits
  const keywordHits: string[] = [];
  for (const kw of DECLARATION_KEYWORDS) {
    if (lower.includes(kw) && !keywordHits.includes(kw)) {
      keywordHits.push(kw);
    }
  }

  // Very short text is immediately POOR
  if (textLength < 20) {
    return {
      quality: 'POOR',
      confidence,
      textLength,
      keywordHits,
      reason: 'Insufficient readable text extracted (< 20 characters).',
    };
  }

  // Very low confidence is POOR
  if (confidence < 40) {
    return {
      quality: 'POOR',
      confidence,
      textLength,
      keywordHits,
      reason: `Low OCR recognition confidence (${Math.round(confidence)}%).`,
    };
  }

  // Strong keyword signals + decent confidence = GOOD
  if (keywordHits.length >= 3 && confidence >= 55) {
    return {
      quality: 'GOOD',
      confidence,
      textLength,
      keywordHits,
      reason: `Clear declaration cues detected (${keywordHits.length} keywords) with strong character confidence.`,
    };
  }

  // High confidence + adequate length = GOOD
  if (confidence >= 75 && textLength >= 40) {
    return {
      quality: 'GOOD',
      confidence,
      textLength,
      keywordHits,
      reason: `High recognition confidence (${Math.round(confidence)}%) across label text.`,
    };
  }

  // Moderate confidence or some keywords = FAIR
  if (keywordHits.length >= 1 || confidence >= 50) {
    return {
      quality: 'FAIR',
      confidence,
      textLength,
      keywordHits,
      reason: `Moderate recognition confidence (${Math.round(confidence)}%) with ${keywordHits.length} declaration cues.`,
    };
  }

  // Fallback to POOR
  return {
    quality: 'POOR',
    confidence,
    textLength,
    keywordHits,
    reason: 'Weak declaration signals and low character confidence.',
  };
}
