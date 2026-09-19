export interface ExtractedLabel {
  rawText: string;
  mrp?: string;
  netQuantity?: string;
  manufacturer?: string;
  address?: string;
  manufactureDate?: string;
  packingDate?: string;
  importer?: string;
  consumerCare?: string;
  isDateAmbiguous?: boolean;
  isFutureDate?: boolean;
  hasConflict?: boolean;
  conflictDetails?: string[];

  // Exact declaration source location lines (for evidence tracing)
  mrpEvidence?: string;
  netQuantityEvidence?: string;
  manufacturerEvidence?: string;
  addressEvidence?: string;
  dateEvidence?: string;
  importerEvidence?: string;
  consumerCareEvidence?: string;
}
