export type DeclarationStatus = 'present_readable' | 'present_ambiguous' | 'present_ocr_failed' | 'not_present';

export interface FieldEvidenceRecord {
  field: string;
  value: string;
  normalizedValue?: string;
  sourcePanel?: string;
  sourceRegion?: string;
  rawOcrSnippet: string;
  confidence: number;
  extractionMethod: 'explicit_prefix' | 'multiline' | 'pattern' | 'context_fallback';
  status: DeclarationStatus;
}

export interface DeclarationCoverageDiagnostic {
  totalAssessed: number;
  detectedCount: number;
  coveragePercentage: number;
  fieldStatuses: Record<string, DeclarationStatus>;
}

export interface ExtractedLabel {
  rawText: string;
  mrp?: string;
  netQuantity?: string;
  manufacturer?: string;
  address?: string;
  manufactureDate?: string;
  packingDate?: string;
  expiryDate?: string;
  bestBefore?: string;
  batchNumber?: string;
  email?: string;
  productName?: string;
  ingredients?: string;
  nutritionInfo?: string;
  importer?: string;
  consumerCare?: string;
  isDateAmbiguous?: boolean;
  isFutureDate?: boolean;
  hasConflict?: boolean;
  hasProductClash?: boolean;
  conflictDetails?: string[];

  // Exact declaration source location lines (for evidence tracing)
  mrpEvidence?: string;
  netQuantityEvidence?: string;
  manufacturerEvidence?: string;
  addressEvidence?: string;
  dateEvidence?: string;
  expiryEvidence?: string;
  bestBeforeEvidence?: string;
  batchEvidence?: string;
  emailEvidence?: string;
  productNameEvidence?: string;
  ingredientsEvidence?: string;
  nutritionEvidence?: string;
  importerEvidence?: string;
  consumerCareEvidence?: string;

  // Detailed internal evidence tracking & diagnostics
  fieldEvidenceRecords?: Record<string, FieldEvidenceRecord>;
  declarationCoverage?: DeclarationCoverageDiagnostic;
}
