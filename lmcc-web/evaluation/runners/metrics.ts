export interface ExpectedFields {
  mrp?: string | null;
  netQuantity?: string | null;
  manufacturer?: string | null;
  address?: string | null;
  packingDate?: string | null;
  consumerCare?: string | null;
}

export interface ExpectedCompliance {
  status: 'PASS' | 'REVIEW';
  flaggedCount?: number;
  violations?: string[];
}

export interface GroundTruthProduct {
  id: string;
  name: string;
  category: string;
  language: 'eng' | 'hin' | 'eng+hin' | 'mal' | 'tam' | 'kan' | 'tel';
  level: 'level_1_synthetic' | 'level_2_real' | 'level_3_multilingual' | 'level_4_adversarial';
  split: 'benchmark' | 'held_out_test';
  expectedFields: ExpectedFields;
  expectedCompliance: ExpectedCompliance;
  ocrText: string;
  imagePath?: string;
  notes?: string;
}

export interface EvaluationItemResult {
  id: string;
  name: string;
  language: string;
  level: string;
  split: string;
  fieldMatches: {
    mrp: boolean;
    netQuantity: boolean;
    manufacturer: boolean;
    address: boolean;
    packingDate: boolean;
    consumerCare: boolean;
  };
  expectedCompliance: 'PASS' | 'REVIEW';
  actualCompliance: 'PASS' | 'REVIEW';
  decisionMatch: boolean;
  isFalsePass: boolean;
  isFalseReview: boolean;
  rootCauses: string[];
}

export interface CategoryMetrics {
  total: number;
  correct: number;
  accuracyPercent: number;
}

export interface BenchmarkReport {
  timestamp: string;
  totalProducts: number;
  splits: {
    benchmarkCount: number;
    heldOutCount: number;
  };
  fieldAccuracy: {
    mrp: CategoryMetrics;
    netQuantity: CategoryMetrics;
    manufacturer: CategoryMetrics;
    address: CategoryMetrics;
    packingDate: CategoryMetrics;
    consumerCare: CategoryMetrics;
    overall: CategoryMetrics;
  };
  complianceDecision: {
    truePass: number;
    trueReview: number;
    falsePass: number;
    falseReview: number;
    falsePassRatePercent: number;
    falseReviewRatePercent: number;
    decisionAccuracyPercent: number;
  };
  byLevel: Record<string, { total: number; fieldAccuracyPercent: number; decisionAccuracyPercent: number }>;
  byLanguage: Record<string, { total: number; fieldAccuracyPercent: number; decisionAccuracyPercent: number }>;
  bySplit: Record<string, { total: number; fieldAccuracyPercent: number; decisionAccuracyPercent: number }>;
  rootCauses: Record<string, number>;
  failures: EvaluationItemResult[];
}

/**
 * Normalizes strings for tolerant comparison (case, trim, whitespace collapse).
 */
function normalizeVal(val?: string | null): string {
  if (!val) return '';
  return val.toLowerCase().replace(/[\s\r\n\t]+/g, ' ').trim();
}

/**
 * Checks if actual extracted string satisfies expected ground truth.
 */
export function matchField(actual?: string, expected?: string | null): boolean {
  if (expected === null || expected === undefined || expected === '') {
    // If expected is null/absent, actual should also be falsy/absent
    return !actual || actual.trim().length === 0;
  }
  if (!actual || actual.trim().length === 0) {
    return false;
  }

  const normActual = normalizeVal(actual);
  const normExpected = normalizeVal(expected);

  // Exact or substring match (e.g. manufacturer name contained inside full extracted string)
  if (normActual === normExpected) return true;
  if (normActual.includes(normExpected) || normExpected.includes(normActual)) return true;

  // Numerical equality for MRP (e.g. ₹120.00 vs ₹120 or Rs. 120)
  const numActual = normActual.replace(/[^0-9.]/g, '');
  const numExpected = normExpected.replace(/[^0-9.]/g, '');
  if (numActual && numExpected && parseFloat(numActual) === parseFloat(numExpected)) {
    return true;
  }

  return false;
}

/**
 * Evaluates extraction results and classifies root causes for any failures.
 */
export function evaluateProductItem(
  product: GroundTruthProduct,
  extracted: Record<string, string | undefined>,
  actualStatus: 'PASS' | 'REVIEW'
): EvaluationItemResult {
  const fieldMatches = {
    mrp: matchField(extracted.mrp, product.expectedFields.mrp),
    netQuantity: matchField(extracted.netQuantity, product.expectedFields.netQuantity),
    manufacturer: matchField(extracted.manufacturer, product.expectedFields.manufacturer),
    address: matchField(extracted.address, product.expectedFields.address),
    packingDate: matchField(extracted.packingDate || extracted.manufactureDate, product.expectedFields.packingDate),
    consumerCare: matchField(extracted.consumerCare, product.expectedFields.consumerCare),
  };

  const expectedStatus = product.expectedCompliance.status;
  const isFalsePass = expectedStatus === 'REVIEW' && actualStatus === 'PASS';
  const isFalseReview = expectedStatus === 'PASS' && actualStatus === 'REVIEW';
  const decisionMatch = expectedStatus === actualStatus;

  const rootCauses: string[] = [];

  if (isFalsePass) {
    rootCauses.push('CRITICAL:FALSE_PASS_HAZARD');
  }
  if (isFalseReview) {
    rootCauses.push('FALSE_REVIEW_UNWARRANTED_FLAG');
  }

  // Field specific failure root cause detection
  if (!fieldMatches.mrp) {
    if (product.ocrText.toLowerCase().includes('mrp') || product.ocrText.includes('₹') || product.ocrText.toLowerCase().includes('rs')) {
      rootCauses.push('MRP_PARSER_REGEX_GAP');
    } else {
      rootCauses.push('MRP_MISSING_IN_OCR');
    }
  }

  if (!fieldMatches.netQuantity) {
    if (product.ocrText.toLowerCase().includes('net') || product.ocrText.includes('kg') || product.ocrText.includes('g') || product.ocrText.includes('ml')) {
      rootCauses.push('NET_QTY_PARSER_REGEX_GAP');
    } else {
      rootCauses.push('NET_QTY_MISSING_IN_OCR');
    }
  }

  if (!fieldMatches.packingDate) {
    if (product.ocrText.toLowerCase().includes('mfd') || product.ocrText.toLowerCase().includes('pkd') || product.ocrText.toLowerCase().includes('date')) {
      rootCauses.push('DATE_COLLISION_OR_FORMAT_GAP');
    } else {
      rootCauses.push('DATE_MISSING_IN_OCR');
    }
  }

  if (!fieldMatches.manufacturer) {
    rootCauses.push('MANUFACTURER_EXTRACTION_GAP');
  }

  if (!fieldMatches.address) {
    rootCauses.push('ADDRESS_EXTRACTION_GAP');
  }

  if (!fieldMatches.consumerCare) {
    rootCauses.push('CONSUMER_CARE_EXTRACTION_GAP');
  }

  return {
    id: product.id,
    name: product.name,
    language: product.language,
    level: product.level,
    split: product.split,
    fieldMatches,
    expectedCompliance: expectedStatus,
    actualCompliance: actualStatus,
    decisionMatch,
    isFalsePass,
    isFalseReview,
    rootCauses,
  };
}

/**
 * Aggregates item results into comprehensive BenchmarkReport.
 */
export function aggregateMetrics(results: EvaluationItemResult[]): BenchmarkReport {
  const total = results.length;
  let benchmarkCount = 0;
  let heldOutCount = 0;

  const fields = ['mrp', 'netQuantity', 'manufacturer', 'address', 'packingDate', 'consumerCare'] as const;
  const fieldCounts: Record<typeof fields[number], { total: number; correct: number }> = {
    mrp: { total: 0, correct: 0 },
    netQuantity: { total: 0, correct: 0 },
    manufacturer: { total: 0, correct: 0 },
    address: { total: 0, correct: 0 },
    packingDate: { total: 0, correct: 0 },
    consumerCare: { total: 0, correct: 0 },
  };

  let totalFieldChecks = 0;
  let totalFieldCorrect = 0;

  let truePass = 0;
  let trueReview = 0;
  let falsePass = 0;
  let falseReview = 0;

  const byLevel: Record<string, { total: number; fieldCorrect: number; fieldTotal: number; decisionCorrect: number }> = {};
  const byLanguage: Record<string, { total: number; fieldCorrect: number; fieldTotal: number; decisionCorrect: number }> = {};
  const bySplit: Record<string, { total: number; fieldCorrect: number; fieldTotal: number; decisionCorrect: number }> = {};
  const rootCauses: Record<string, number> = {};

  for (const r of results) {
    if (r.split === 'benchmark') benchmarkCount++;
    if (r.split === 'held_out_test') heldOutCount++;

    // Decision counters
    if (r.expectedCompliance === 'PASS' && r.actualCompliance === 'PASS') truePass++;
    else if (r.expectedCompliance === 'REVIEW' && r.actualCompliance === 'REVIEW') trueReview++;
    else if (r.isFalsePass) falsePass++;
    else if (r.isFalseReview) falseReview++;

    // Root causes
    for (const rc of r.rootCauses) {
      rootCauses[rc] = (rootCauses[rc] || 0) + 1;
    }

    // Init slice records
    for (const [key, map] of [
      [r.level, byLevel],
      [r.language, byLanguage],
      [r.split, bySplit],
    ] as const) {
      if (!map[key]) {
        map[key] = { total: 0, fieldCorrect: 0, fieldTotal: 0, decisionCorrect: 0 };
      }
      map[key].total++;
      if (r.decisionMatch) map[key].decisionCorrect++;
    }

    // Per field stats
    for (const f of fields) {
      fieldCounts[f].total++;
      totalFieldChecks++;
      if (r.fieldMatches[f]) {
        fieldCounts[f].correct++;
        totalFieldCorrect++;
        byLevel[r.level].fieldCorrect++;
        byLanguage[r.language].fieldCorrect++;
        bySplit[r.split].fieldCorrect++;
      }
      byLevel[r.level].fieldTotal++;
      byLanguage[r.language].fieldTotal++;
      bySplit[r.split].fieldTotal++;
    }
  }

  const calcCategory = (c: { total: number; correct: number }): CategoryMetrics => ({
    total: c.total,
    correct: c.correct,
    accuracyPercent: c.total > 0 ? Math.round((c.correct / c.total) * 1000) / 10 : 0,
  });

  const totalExpectedPass = truePass + falseReview;
  const totalExpectedReview = trueReview + falsePass;

  const falsePassRatePercent = totalExpectedReview > 0 ? Math.round((falsePass / totalExpectedReview) * 1000) / 10 : 0;
  const falseReviewRatePercent = totalExpectedPass > 0 ? Math.round((falseReview / totalExpectedPass) * 1000) / 10 : 0;
  const decisionAccuracyPercent = total > 0 ? Math.round(((truePass + trueReview) / total) * 1000) / 10 : 0;

  const mapSlices = (map: Record<string, { total: number; fieldCorrect: number; fieldTotal: number; decisionCorrect: number }>) => {
    const res: Record<string, { total: number; fieldAccuracyPercent: number; decisionAccuracyPercent: number }> = {};
    for (const [k, v] of Object.entries(map)) {
      res[k] = {
        total: v.total,
        fieldAccuracyPercent: v.fieldTotal > 0 ? Math.round((v.fieldCorrect / v.fieldTotal) * 1000) / 10 : 0,
        decisionAccuracyPercent: v.total > 0 ? Math.round((v.decisionCorrect / v.total) * 1000) / 10 : 0,
      };
    }
    return res;
  };

  return {
    timestamp: new Date().toISOString(),
    totalProducts: total,
    splits: { benchmarkCount, heldOutCount },
    fieldAccuracy: {
      mrp: calcCategory(fieldCounts.mrp),
      netQuantity: calcCategory(fieldCounts.netQuantity),
      manufacturer: calcCategory(fieldCounts.manufacturer),
      address: calcCategory(fieldCounts.address),
      packingDate: calcCategory(fieldCounts.packingDate),
      consumerCare: calcCategory(fieldCounts.consumerCare),
      overall: {
        total: totalFieldChecks,
        correct: totalFieldCorrect,
        accuracyPercent: totalFieldChecks > 0 ? Math.round((totalFieldCorrect / totalFieldChecks) * 1000) / 10 : 0,
      },
    },
    complianceDecision: {
      truePass,
      trueReview,
      falsePass,
      falseReview,
      falsePassRatePercent,
      falseReviewRatePercent,
      decisionAccuracyPercent,
    },
    byLevel: mapSlices(byLevel),
    byLanguage: mapSlices(byLanguage),
    bySplit: mapSlices(bySplit),
    rootCauses,
    failures: results.filter((r) => !r.decisionMatch || Object.values(r.fieldMatches).some((v) => !v)),
  };
}
