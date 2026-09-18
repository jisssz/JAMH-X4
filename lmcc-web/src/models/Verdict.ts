import { RuleSeverity } from './Rule';

export type OverallStatus = 'PASS' | 'REVIEW';

export interface ComplianceCheck {
  ruleId: string;
  field: string;
  title: string;
  expected: string;
  detected?: string;
  passed: boolean;
  explanation: string;
  evidence?: string;
  source: string;
  gazetteReference?: string;
}

export interface PotentialViolation {
  ruleId: string;
  field: string;
  title: string;
  severity: RuleSeverity;
  detectedValue?: string;
  explanation: string;
  evidence?: string;
  recommendation: string;
  source: string;
  gazetteReference?: string;
}

export interface Verdict {
  overallStatus: OverallStatus;
  summary: string;
  timestamp: string;
  totalChecks: number;
  passedChecks: number;
  flaggedChecks: number;
  checks: ComplianceCheck[];
  potentialViolations: PotentialViolation[];
}
