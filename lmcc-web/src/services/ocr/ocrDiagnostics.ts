/**
 * Development OCR Diagnostic Facility.
 * Provides transparent, structured telemetry across the complete image -> OCR -> parser -> rules cascade.
 */

export interface OcrPassDiagnostic {
  passName: string;
  psm: number;
  inputDimensions: { width: number; height: number };
  characterCount: number;
  confidence: number;
  snippet: string;
  durationMs: number;
}

export interface OcrPipelineDiagnostic {
  originalDimensions?: { width: number; height: number };
  workingDimensions?: { width: number; height: number };
  passes: OcrPassDiagnostic[];
  mergedTextLength: number;
  extractedFieldCount: number;
  missingFields: string[];
  finalVerdict: 'PASS' | 'REVIEW';
  totalDurationMs: number;
}

export class OcrDiagnosticSession {
  private diagnostic: OcrPipelineDiagnostic = {
    passes: [],
    mergedTextLength: 0,
    extractedFieldCount: 0,
    missingFields: [],
    finalVerdict: 'REVIEW',
    totalDurationMs: 0,
  };
  private startTime: number = Date.now();

  setOriginalDimensions(width: number, height: number): void {
    this.diagnostic.originalDimensions = { width, height };
  }

  setWorkingDimensions(width: number, height: number): void {
    this.diagnostic.workingDimensions = { width, height };
  }

  recordPass(pass: OcrPassDiagnostic): void {
    this.diagnostic.passes.push(pass);
  }

  finalize(
    mergedText: string,
    extractedFields: Record<string, string | undefined>,
    finalVerdict: 'PASS' | 'REVIEW'
  ): OcrPipelineDiagnostic {
    this.diagnostic.mergedTextLength = mergedText.length;
    this.diagnostic.finalVerdict = finalVerdict;
    this.diagnostic.totalDurationMs = Date.now() - this.startTime;

    const allMandatory = ['mrp', 'netQuantity', 'manufacturer', 'address', 'packingDate', 'consumerCare'];
    const found = allMandatory.filter((f) => Boolean(extractedFields[f]));
    this.diagnostic.extractedFieldCount = found.length;
    this.diagnostic.missingFields = allMandatory.filter((f) => !extractedFields[f]);

    return this.diagnostic;
  }

  logSummary(): void {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      console.log('--- LMCC OCR CASCADE DIAGNOSTIC ---');
      console.log(`Original Size: ${this.diagnostic.originalDimensions?.width}x${this.diagnostic.originalDimensions?.height}`);
      console.log(`Passes Executed: ${this.diagnostic.passes.length}`);
      this.diagnostic.passes.forEach((p) => {
        console.log(`  • [${p.passName} | PSM ${p.psm}]: ${p.characterCount} chars, ${p.confidence}% conf in ${p.durationMs}ms`);
      });
      console.log(`Extracted Fields: ${this.diagnostic.extractedFieldCount}/6 (Missing: ${this.diagnostic.missingFields.join(', ') || 'None'})`);
      console.log(`Verdict: ${this.diagnostic.finalVerdict} (Total: ${this.diagnostic.totalDurationMs}ms)`);
      console.log('-----------------------------------');
    }
  }
}
