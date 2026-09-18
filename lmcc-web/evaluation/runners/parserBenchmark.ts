import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLabel } from '../../src/services/parser/fieldParser';
import { RulesEngine } from '../../src/services/rules/rulesEngine';
import {
  GroundTruthProduct,
  EvaluationItemResult,
  evaluateProductItem,
  aggregateMetrics,
} from './metrics';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runParserBenchmark() {
  const groundTruthPath = path.resolve(__dirname, '../ground-truth/products.json');
  if (!fs.existsSync(groundTruthPath)) {
    console.error(`Ground truth dataset not found at ${groundTruthPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(groundTruthPath, 'utf8');
  const products: GroundTruthProduct[] = JSON.parse(rawData);

  console.log(`\n====================================================================`);
  console.log(`         LMCC OCR ACCURACY LAB — PARSER & RULES BENCHMARK           `);
  console.log(`====================================================================\n`);
  console.log(`Loaded ${products.length} ground truth product label test cases.`);

  const engine = new RulesEngine();
  const itemResults: EvaluationItemResult[] = [];

  for (const prod of products) {
    const extracted = parseLabel(prod.ocrText);
    const verdict = engine.evaluate(extracted);

    const evaluated = evaluateProductItem(
      prod,
      {
        mrp: extracted.mrp,
        netQuantity: extracted.netQuantity,
        manufacturer: extracted.manufacturer,
        address: extracted.address,
        packingDate: extracted.packingDate,
        consumerCare: extracted.consumerCare,
      },
      verdict.overallStatus
    );

    itemResults.push(evaluated);
  }

  const report = aggregateMetrics(itemResults);

  // Write reports
  const reportsDir = path.resolve(__dirname, '../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const latestJsonPath = path.join(reportsDir, 'latest.json');
  fs.writeFileSync(latestJsonPath, JSON.stringify(report, null, 2), 'utf8');

  // Format terminal summary
  let summary = `\n`;
  summary += `════════════════════════════════════════════════════════════════════\n`;
  summary += `                 LMCC ACCURACY LAB EVALUATION REPORT                \n`;
  summary += `════════════════════════════════════════════════════════════════════\n`;
  summary += `Timestamp:              ${report.timestamp}\n`;
  summary += `Total Products Tested:  ${report.totalProducts} (Benchmark: ${report.splits.benchmarkCount} | Held-Out: ${report.splits.heldOutCount})\n\n`;

  summary += `── FIELD EXTRACTION ACCURACY ───────────────────────────────────────\n`;
  summary += `  MRP:                    ${report.fieldAccuracy.mrp.accuracyPercent}% (${report.fieldAccuracy.mrp.correct}/${report.fieldAccuracy.mrp.total})\n`;
  summary += `  Net Quantity:           ${report.fieldAccuracy.netQuantity.accuracyPercent}% (${report.fieldAccuracy.netQuantity.correct}/${report.fieldAccuracy.netQuantity.total})\n`;
  summary += `  Manufacturer:           ${report.fieldAccuracy.manufacturer.accuracyPercent}% (${report.fieldAccuracy.manufacturer.correct}/${report.fieldAccuracy.manufacturer.total})\n`;
  summary += `  Address:                ${report.fieldAccuracy.address.accuracyPercent}% (${report.fieldAccuracy.address.correct}/${report.fieldAccuracy.address.total})\n`;
  summary += `  Date (MFD/PKD):         ${report.fieldAccuracy.packingDate.accuracyPercent}% (${report.fieldAccuracy.packingDate.correct}/${report.fieldAccuracy.packingDate.total})\n`;
  summary += `  Consumer Care:          ${report.fieldAccuracy.consumerCare.accuracyPercent}% (${report.fieldAccuracy.consumerCare.correct}/${report.fieldAccuracy.consumerCare.total})\n`;
  summary += `  ──────────────────────────────────────────────────────────────────\n`;
  summary += `  OVERALL FIELD ACCURACY: ${report.fieldAccuracy.overall.accuracyPercent}% (${report.fieldAccuracy.overall.correct}/${report.fieldAccuracy.overall.total})\n\n`;

  summary += `── COMPLIANCE DECISION ACCURACY ────────────────────────────────────\n`;
  summary += `  Decision Accuracy:      ${report.complianceDecision.decisionAccuracyPercent}%\n`;
  summary += `  True PASS:              ${report.complianceDecision.truePass}\n`;
  summary += `  True REVIEW:            ${report.complianceDecision.trueReview}\n`;
  summary += `  False PASS (Critical):  ${report.complianceDecision.falsePass} (Rate: ${report.complianceDecision.falsePassRatePercent}%)\n`;
  summary += `  False REVIEW:           ${report.complianceDecision.falseReview} (Rate: ${report.complianceDecision.falseReviewRatePercent}%)\n\n`;

  summary += `── ACCURACY BY TESTING LEVEL ───────────────────────────────────────\n`;
  for (const [level, data] of Object.entries(report.byLevel)) {
    summary += `  ${level.padEnd(24)}: Fields: ${String(data.fieldAccuracyPercent).padStart(5)}% | Decisions: ${String(data.decisionAccuracyPercent).padStart(5)}% (N=${data.total})\n`;
  }
  summary += `\n`;

  summary += `── ACCURACY BY LANGUAGE ────────────────────────────────────────────\n`;
  for (const [lang, data] of Object.entries(report.byLanguage)) {
    summary += `  ${lang.padEnd(24)}: Fields: ${String(data.fieldAccuracyPercent).padStart(5)}% | Decisions: ${String(data.decisionAccuracyPercent).padStart(5)}% (N=${data.total})\n`;
  }
  summary += `\n`;

  summary += `── ACCURACY BY SPLIT ───────────────────────────────────────────────\n`;
  for (const [split, data] of Object.entries(report.bySplit)) {
    summary += `  ${split.padEnd(24)}: Fields: ${String(data.fieldAccuracyPercent).padStart(5)}% | Decisions: ${String(data.decisionAccuracyPercent).padStart(5)}% (N=${data.total})\n`;
  }
  summary += `\n`;

  summary += `── ROOT CAUSE BREAKDOWN ────────────────────────────────────────────\n`;
  const rootCauseEntries = Object.entries(report.rootCauses);
  if (rootCauseEntries.length === 0) {
    summary += `  Zero root cause failures detected across all test cases!\n`;
  } else {
    for (const [rc, count] of rootCauseEntries) {
      summary += `  ${rc.padEnd(35)}: ${count} occurrence(s)\n`;
    }
  }
  summary += `════════════════════════════════════════════════════════════════════\n`;

  console.log(summary);

  const latestSummaryPath = path.join(reportsDir, 'latest_summary.txt');
  fs.writeFileSync(latestSummaryPath, summary, 'utf8');

  // Freeze baseline if baseline.json does not exist
  const baselineJsonPath = path.join(reportsDir, 'baseline.json');
  if (!fs.existsSync(baselineJsonPath)) {
    fs.writeFileSync(baselineJsonPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`[SAVED] Frozen initial baseline report to ${baselineJsonPath}`);
  }

  console.log(`[SAVED] Latest report saved to ${latestJsonPath}`);
  console.log(`[SAVED] Latest text summary saved to ${latestSummaryPath}\n`);

  if (report.complianceDecision.falsePass > 0) {
    console.warn(`[WARNING] Detected ${report.complianceDecision.falsePass} CRITICAL False PASS decisions!`);
  }
}

runParserBenchmark().catch((err) => {
  console.error('Parser benchmark failed with unhandled error:', err);
  process.exit(1);
});
