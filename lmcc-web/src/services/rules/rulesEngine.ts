import rulesData from '../../data/legal_metrology_rules.json';
import { ExtractedLabel } from '../../models/ExtractedLabel';
import { Rule } from '../../models/Rule';
import { ComplianceCheck, OverallStatus, PotentialViolation, Verdict } from '../../models/Verdict';

export class RulesEngine {
  private rules: Rule[];

  constructor(customRules?: Rule[]) {
    this.rules = (customRules || (rulesData as Rule[])).filter((r) => r.enabled);
  }

  evaluate(label: ExtractedLabel): Verdict {
    const checks: ComplianceCheck[] = [];
    const potentialViolations: PotentialViolation[] = [];

    for (const rule of this.rules) {
      const rawVal = label[rule.field];
      const detectedVal = typeof rawVal === 'string' ? rawVal : undefined;
      const hasValue = Boolean(detectedVal && detectedVal.trim().length > 0);

      // ----------------------------------------------------
      // Rule 6(1)(d): Date Evaluation
      // ----------------------------------------------------
      if (rule.field === 'packingDate') {
        if (!hasValue) {
          const evidence = 'No month/year or manufacturing date pattern detected in OCR text; manual verification required.';
          checks.push({
            ruleId: rule.id,
            field: rule.field,
            title: rule.title,
            expected: rule.description,
            passed: false,
            explanation: `Mandatory declaration of month and year of manufacture/packing under ${rule.source} was not detected on the scanned label.`,
            evidence,
            source: rule.source,
            gazetteReference: rule.gazetteReference,
          });

          potentialViolations.push({
            ruleId: rule.id,
            field: rule.field,
            title: rule.title,
            severity: rule.severity,
            explanation: `Month and year declaration could not be detected. Rule 6(1)(d) requires pre-packaged goods to indicate when the commodity was manufactured, packed, or imported.`,
            evidence,
            recommendation: `Inspect package carefully to verify if manufacturing or packing date is embossed, stamped, or printed elsewhere on the carton or seal.`,
            source: rule.source,
            gazetteReference: rule.gazetteReference,
          });
        } else if (label.isFutureDate) {
          const evidence = `Detected date string "${detectedVal}" has a calendar month/year after current screening date.`;
          checks.push({
            ruleId: rule.id,
            field: rule.field,
            title: rule.title,
            expected: rule.description,
            detected: detectedVal,
            passed: false,
            explanation: `Detected date "${detectedVal}" appears to be in the future. Declaring post-dated manufacturing dates is contrary to Rule 6(1)(d).`,
            evidence,
            source: rule.source,
            gazetteReference: rule.gazetteReference,
          });

          potentialViolations.push({
            ruleId: rule.id,
            field: rule.field,
            title: `${rule.title} (Post-Dated)`,
            severity: 'critical',
            detectedValue: detectedVal,
            explanation: `The detected date "${detectedVal}" lies in the future relative to the current screening date. Rule 6(1)(d) prohibits post-dating of packaging commodities.`,
            evidence,
            recommendation: `Verify whether "${detectedVal}" represents an expiry/best-before date rather than a manufacturing date, or if printing error occurred.`,
            source: rule.source,
            gazetteReference: rule.gazetteReference,
          });
        } else if (label.isDateAmbiguous) {
          const evidence = `Found isolated date "${detectedVal}" without preceding prefix such as "MFD", "MFG", or "PKD".`;
          checks.push({
            ruleId: rule.id,
            field: rule.field,
            title: rule.title,
            expected: rule.description,
            detected: detectedVal,
            passed: false,
            explanation: `Isolated date "${detectedVal}" was detected but lacks statutory contextual prefix (MFD/PKD/Mfg).`,
            evidence,
            source: rule.source,
            gazetteReference: rule.gazetteReference,
          });

          potentialViolations.push({
            ruleId: rule.id,
            field: rule.field,
            title: `${rule.title} (Ambiguous Context)`,
            severity: 'medium',
            detectedValue: detectedVal,
            explanation: `Date "${detectedVal}" was detected without explicit statutory prefix (e.g. MFD, MFG, PKD). Rule 6(1)(d) requires clear indication of whether date represents manufacture, packing, or import.`,
            evidence,
            recommendation: `Verify if this date is accompanied by words such as 'Packed on' or 'Mfg date' elsewhere on the package.`,
            source: rule.source,
            gazetteReference: rule.gazetteReference,
          });
        } else {
          checks.push({
            ruleId: rule.id,
            field: rule.field,
            title: rule.title,
            expected: rule.description,
            detected: detectedVal,
            passed: true,
            explanation: `Detected on label: "${detectedVal}".`,
            evidence: `Found contextual date declaration: "${detectedVal}".`,
            source: rule.source,
            gazetteReference: rule.gazetteReference,
          });
        }
        continue;
      }

      // ----------------------------------------------------
      // Rule 6(1)(a): Address Evaluation
      // ----------------------------------------------------
      if (rule.field === 'address') {
        if (hasValue) {
          checks.push({
            ruleId: rule.id,
            field: rule.field,
            title: rule.title,
            expected: rule.description,
            detected: detectedVal,
            passed: true,
            explanation: `Address cues detected: "${detectedVal}". Note: Visual verification recommended to ensure full postal address adequacy.`,
            evidence: `Detected postal cues or PIN code: "${detectedVal}".`,
            source: rule.source,
            gazetteReference: rule.gazetteReference,
          });
        } else {
          const evidence = 'No postal PIN code, factory premises, or industrial location cues detected in scanned text; manual verification required.';
          checks.push({
            ruleId: rule.id,
            field: rule.field,
            title: rule.title,
            expected: rule.description,
            passed: false,
            explanation: `Premises or factory address cues could not be detected from the scanned label text under ${rule.source}.`,
            evidence,
            source: rule.source,
            gazetteReference: rule.gazetteReference,
          });

          potentialViolations.push({
            ruleId: rule.id,
            field: rule.field,
            title: rule.title,
            severity: rule.severity,
            explanation: `Complete address of manufacturer or packer could not be detected from the scanned text.`,
            evidence,
            recommendation: `Check physical packaging for factory premises address, registered office, or postal PIN code.`,
            source: rule.source,
            gazetteReference: rule.gazetteReference,
          });
        }
        continue;
      }

      // ----------------------------------------------------
      // Standard Mandatory Declarations (MRP, Net Qty, Mfg, Consumer Care)
      // ----------------------------------------------------
      if (hasValue) {
        let evidence = `Detected string: "${detectedVal}".`;
        if (rule.field === 'mrp') {
          evidence = label.mrpEvidence
            ? `Detected declaration line: "${label.mrpEvidence}"`
            : `Recognized price declaration: "${detectedVal}".`;
        } else if (rule.field === 'netQuantity') {
          evidence = label.netQuantityEvidence
            ? `Detected declaration line: "${label.netQuantityEvidence}"`
            : `Recognized standard metric quantity: "${detectedVal}".`;
        } else if (rule.field === 'manufacturer') {
          evidence = label.manufacturerEvidence
            ? `Detected declaration line: "${label.manufacturerEvidence}"`
            : `Recognized business entity declaration: "${detectedVal}".`;
        } else if (rule.field === 'consumerCare') {
          evidence = label.consumerCareEvidence
            ? `Detected declaration line: "${label.consumerCareEvidence}"`
            : `Recognized grievance contact / helpline: "${detectedVal}".`;
        }

        checks.push({
          ruleId: rule.id,
          field: rule.field,
          title: rule.title,
          expected: rule.description,
          detected: detectedVal,
          passed: true,
          explanation: `Detected on label: "${detectedVal}".`,
          evidence,
          source: rule.source,
          gazetteReference: rule.gazetteReference,
        });
      } else {
        let evidence = 'No reliable OCR evidence available; manual verification required.';
        if (rule.field === 'mrp') {
          evidence = 'No recognizable MRP or currency pattern (₹/Rs.) detected in OCR text; manual verification required.';
        } else if (rule.field === 'netQuantity') {
          evidence = 'No standard metric unit (g, kg, ml, l) or piece count (N) detected in OCR text; manual verification required.';
        } else if (rule.field === 'manufacturer') {
          evidence = 'No manufacturer, packer, or importer identification prefix detected; manual verification required.';
        } else if (rule.field === 'consumerCare') {
          evidence = 'No toll-free helpline, telephone contact, or grievance email detected; manual verification required.';
        }

        checks.push({
          ruleId: rule.id,
          field: rule.field,
          title: rule.title,
          expected: rule.description,
          passed: false,
          explanation: `Mandatory declaration "${rule.title}" could not be detected from the scanned label text under ${rule.source}.`,
          evidence,
          source: rule.source,
          gazetteReference: rule.gazetteReference,
        });

        potentialViolations.push({
          ruleId: rule.id,
          field: rule.field,
          title: rule.title,
          severity: rule.severity,
          detectedValue: undefined,
          explanation: `Mandatory declaration under ${rule.source} was not detected from the scanned label.`,
          evidence,
          recommendation: `Inspect package to verify if "${rule.title}" is printed on another panel, obscured by folds, or missing.`,
          source: rule.source,
          gazetteReference: rule.gazetteReference,
        });
      }
    }

    // ----------------------------------------------------
    // Multi-Panel Discrepancy & Consistency Verification
    // ----------------------------------------------------
    if (label.hasConflict && label.conflictDetails && label.conflictDetails.length > 0) {
      const conflictMsg = label.conflictDetails.join('; ');
      checks.push({
        ruleId: 'LM-PCR-2011-R6-CONSISTENCY',
        field: 'multiPanelConsistency',
        title: 'Multi-Panel Declaration Discrepancy',
        expected: 'Consistent statutory declarations across all package panels without contradictory MRP, dates, or quantities.',
        detected: conflictMsg,
        passed: false,
        explanation: `Conflicting statutory declarations were detected across physical package panels: ${conflictMsg}`,
        evidence: `Discrepant declarations found across staged panels: ${label.conflictDetails.join(' | ')}`,
        source: 'Rule 6 Consistency, Legal Metrology (Packaged Commodities) Rules, 2011',
        gazetteReference: 'G.S.R. 427(E) & G.S.R. 779(E)',
      });

      potentialViolations.push({
        ruleId: 'LM-PCR-2011-R6-CONSISTENCY',
        field: 'multiPanelConsistency',
        title: 'Multi-Panel Declaration Discrepancy',
        severity: 'critical',
        detectedValue: conflictMsg,
        explanation: `Statutory values conflict across physical package panels: ${conflictMsg}. Pre-packaged commodities cannot bear multiple inconsistent statutory declarations.`,
        evidence: `Discrepancies: ${label.conflictDetails.join(' | ')}`,
        recommendation: 'Inspect physical package panels to resolve contradictory statutory declarations (e.g. differing stamped vs printed MRP or dates).',
        source: 'Rule 6 Consistency, Legal Metrology (Packaged Commodities) Rules, 2011',
        gazetteReference: 'G.S.R. 427(E) & G.S.R. 779(E)',
      });
    }

    const totalChecks = checks.length;
    const passedChecks = checks.filter((c) => c.passed).length;
    const flaggedChecks = totalChecks - passedChecks;

    const overallStatus: OverallStatus = flaggedChecks === 0 ? 'PASS' : 'REVIEW';
    const summary =
      overallStatus === 'PASS'
        ? 'No potential declaration issue detected from the scanned label under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011.'
        : `${flaggedChecks} item(s) flagged for manual verification or potential non-compliance under Legal Metrology Rules.`;

    return {
      overallStatus,
      summary,
      timestamp: new Date().toISOString(),
      totalChecks,
      passedChecks,
      flaggedChecks,
      checks,
      potentialViolations,
    };
  }
}

export const defaultRulesEngine = new RulesEngine();
