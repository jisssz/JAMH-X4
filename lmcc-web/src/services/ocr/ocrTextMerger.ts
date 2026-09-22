/**
 * Intelligent OCR Text Stream Merger.
 * Combines character outputs from multi-scale passes and overlapping region tiles.
 * Deduplicates exact/near-duplicate lines, removes low-information noise,
 * and prioritizes statutory declaration lines.
 */

export interface OcrStreamSegment {
  text: string;
  source: string; // e.g. 'full_standard', 'full_upscaled', 'tile_top_left', etc.
  confidence?: number;
}

const STATUTORY_LINE_HINTS = [
  /\b(?:MRP|M\.R\.P|RETAIL\s*PRICE|Rs\.?|₹|INCL|TAXES|अधिकतम|मूल्य)\b/i,
  /\b(?:NET\s*(?:WT|WEIGHT|QTY|QUANTITY|VOL|VOLUME)|g|kg|gm|ml|ltr|litres?|units?|N|वजन|मात्रा)\b/i,
  /\b(?:MFD|MFG|PKD|PACKED|MANUFACTURED|PACKING|DATE|BATCH|LOT|BEST\s*BEFORE|EXP|निर्माण|पैकिंग)\b/i,
  /\b(?:MFD\s*BY|MFG\s*BY|PACKED\s*BY|PRODUCED\s*BY|PROCESSED\s*BY|MKTD\s*BY|MARKETED\s*BY|LTD|LIMITED|PVT|LLP|FOOD|AGRO|PRODUCTS|INDUSTRIES|निर्माता)\b/i,
  /\b(?:REGD|OFFICE|PLOT|WORKS|ROAD|STREET|INDUSTRIAL|AREA|DIST|STATE|PIN|CITY)\b/i,
  /\b(?:CONSUMER|CUSTOMER|CARE|CELL|HELPLINE|FEEDBACK|TOLL\s*FREE|EMAIL|TEL|PHONE|CALL|QUESTIONS|COMMENTS?|QUERIES|1-?800|1800|CHAT|SUPPORT)\b/i,
];

function isStatutoryRelevantLine(line: string): boolean {
  return STATUTORY_LINE_HINTS.some((pattern) => pattern.test(line));
}

function cleanLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

function computeLineSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const cleanA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanB = b.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanA === cleanB && cleanA.length > 0) return 0.95;
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) {
    const minLen = Math.min(cleanA.length, cleanB.length);
    const maxLen = Math.max(cleanA.length, cleanB.length);
    if (minLen > 5 && minLen / maxLen > 0.75) return 0.85;
  }
  return 0;
}

export function mergeOcrStreams(segments: OcrStreamSegment[]): string {
  if (segments.length === 0) return '';
  if (segments.length === 1) return segments[0].text.trim();

  const collectedLines: { text: string; confidence: number; isStatutory: boolean }[] = [];

  for (const segment of segments) {
    const lines = segment.text.split('\n');
    const segConf = segment.confidence ?? 60;

    for (const rawLine of lines) {
      const line = cleanLine(rawLine);
      if (line.length < 2) continue; // Skip single characters or noise artifacts

      const isStatutory = isStatutoryRelevantLine(line);

      // Check if this line or a very similar line already exists
      let isDuplicate = false;
      for (let i = 0; i < collectedLines.length; i++) {
        const existing = collectedLines[i];
        const sim = computeLineSimilarity(line, existing.text);
        if (sim >= 0.85 || (line.includes(existing.text) && existing.text.length >= 8)) {
          isDuplicate = true;
          // If the new line has more statutory keywords or better length, upgrade existing line
          if (line.length > existing.text.length && (isStatutory || existing.isStatutory)) {
            collectedLines[i] = { text: line, confidence: Math.max(segConf, existing.confidence), isStatutory: true };
          }
          break;
        }
      }

      if (!isDuplicate) {
        collectedLines.push({ text: line, confidence: segConf, isStatutory });
      }
    }
  }

  // Preserve statutory declaration lines prominently, followed by general packaging lines
  const statutoryLines = collectedLines.filter((l) => l.isStatutory).map((l) => l.text);
  const generalLines = collectedLines.filter((l) => !l.isStatutory).map((l) => l.text);

  return [...statutoryLines, ...generalLines].join('\n');
}
