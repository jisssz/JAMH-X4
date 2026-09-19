import { ExtractedLabel } from './ExtractedLabel';

export type RuleSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface Rule {
  id: string;
  field: keyof Omit<ExtractedLabel, 'rawText' | 'isDateAmbiguous' | 'isFutureDate' | 'hasConflict' | 'conflictDetails'>;
  title: string;
  description: string;
  severity: RuleSeverity;
  source: string;
  gazetteReference?: string;
  whatCanBeDetected?: string;
  legalLimitations?: string;
  enabled: boolean;
}
