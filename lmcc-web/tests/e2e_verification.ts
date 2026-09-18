import assert from 'node:assert';
import { parseLabel } from '../src/services/parser/fieldParser';
import { defaultRulesEngine } from '../src/services/rules/rulesEngine';
import { submitReport, getReports, getReport, checkHealth } from '../src/services/api';

async function runE2E() {
  console.log('--- Step 1: Verify Backend Health ---');
  const health = await checkHealth();
  assert.strictEqual(health.status, 'ok');
  console.log('✔ Backend health verified:', health);

  console.log('\n--- Step 2: Simulate Client-side OCR -> Parser -> Rules Engine ---');
  const ocrText = `
    BRITANNIA GOOD DAY BUTTER COOKIES
    MFD BY: BRITANNIA INDUSTRIES LTD
    5/1A HUNGERFORD STREET, KOLKATA, WEST BENGAL 700017
    NET WEIGHT: 100 g
    MFD: 07/2024
    MRP: ₹ 30.00 (INCL. OF ALL TAXES)
    CONSUMER CARE: 1800-4254449, feedback@britindia.com
  `;
  const label = parseLabel(ocrText);
  assert.strictEqual(label.mrp, '₹30.00');
  assert.strictEqual(label.netQuantity, '100 g');
  assert.strictEqual(label.manufactureDate, '07/2024');

  const verdict = defaultRulesEngine.evaluate(label);
  console.log('✔ Client screening completed with verdict:', verdict.overallStatus);
  assert.strictEqual(verdict.overallStatus, 'PASS');

  console.log('\n--- Step 3: Simulate Submitting Observation via api.ts ---');
  const submissionPayload = {
    verdict: verdict.overallStatus,
    productName: 'Britannia Good Day Butter Cookies',
    mrp: label.mrp,
    netQuantity: label.netQuantity,
    manufacturer: label.manufacturer,
    dateDeclaration: label.manufactureDate,
    consumerCare: label.consumerCare,
    issueCount: verdict.potentialViolations.length,
    issues: verdict.potentialViolations.map((v) => ({
      ruleId: v.ruleId,
      field: v.field,
      title: v.title,
      severity: v.severity,
      detectedValue: v.detectedValue,
      explanation: v.explanation,
      evidence: v.evidence,
      recommendation: v.recommendation,
      source: v.source,
      gazetteReference: v.gazetteReference,
    })),
    rawOcr: label.rawText,
    userRemarks: 'E2E Test Store, Bengaluru',
  };

  const submitResponse = await submitReport(submissionPayload);
  console.log('✔ Report submitted successfully. Received ID:', submitResponse.id);
  assert.ok(submitResponse.id, 'Report ID must be present');
  assert.strictEqual(submitResponse.status, 'created');

  console.log('\n--- Step 4: Verify Report History List (/api/reports) ---');
  const reportsList = await getReports(10);
  console.log(`✔ Retrieved ${reportsList.length} report(s) from history`);
  const foundReport = reportsList.find((r) => r.id === submitResponse.id);
  assert.ok(foundReport, 'Submitted report must appear in history list');
  assert.strictEqual(foundReport.productName, 'Britannia Good Day Butter Cookies');
  assert.strictEqual(foundReport.verdict, 'PASS');

  console.log('\n--- Step 5: Verify Report Detail Retrieval (/api/reports/:id) ---');
  const reportDetail = await getReport(submitResponse.id);
  assert.strictEqual(reportDetail.id, submitResponse.id);
  assert.strictEqual(reportDetail.productName, 'Britannia Good Day Butter Cookies');
  assert.strictEqual(reportDetail.mrp, '₹30.00');
  assert.strictEqual(reportDetail.netQuantity, '100 g');
  assert.strictEqual(reportDetail.userRemarks, 'E2E Test Store, Bengaluru');
  assert.ok(reportDetail.rawOcr?.includes('BRITANNIA GOOD DAY'));
  console.log('✔ All structured fields, remarks, and raw text verified in detail retrieval');

  console.log('\n--- Step 6: Test Submitting a REVIEW Case with Evidence & Gazette Citations ---');
  const reviewOcr = `
    ORGANIC PULSES
    PACKED BY: UNKNOWN PACKERS
    NET WT: 500 g
    03/2024
  `;
  const reviewLabel = parseLabel(reviewOcr);
  const reviewVerdict = defaultRulesEngine.evaluate(reviewLabel);
  assert.strictEqual(reviewVerdict.overallStatus, 'REVIEW');

  const reviewPayload = {
    verdict: reviewVerdict.overallStatus,
    productName: 'Organic Pulses (Missing MRP & Care Cell)',
    mrp: reviewLabel.mrp,
    netQuantity: reviewLabel.netQuantity,
    manufacturer: reviewLabel.manufacturer,
    dateDeclaration: reviewLabel.packingDate,
    consumerCare: reviewLabel.consumerCare,
    issueCount: reviewVerdict.potentialViolations.length,
    issues: reviewVerdict.potentialViolations.map((v) => ({
      ruleId: v.ruleId,
      field: v.field,
      title: v.title,
      severity: v.severity,
      detectedValue: v.detectedValue,
      explanation: v.explanation,
      evidence: v.evidence,
      recommendation: v.recommendation,
      source: v.source,
      gazetteReference: v.gazetteReference,
    })),
    rawOcr: reviewLabel.rawText,
    userRemarks: 'Flagged by customer during store audit',
  };

  const reviewSubmission = await submitReport(reviewPayload);
  const fetchedReviewDetail = await getReport(reviewSubmission.id);
  assert.strictEqual(fetchedReviewDetail.verdict, 'REVIEW');
  assert.ok(fetchedReviewDetail.issues.length > 0);
  assert.ok(fetchedReviewDetail.issues[0].evidence, 'Evidence must survive round-trip');
  assert.ok(fetchedReviewDetail.issues[0].gazetteReference, 'Gazette citation must survive round-trip');
  console.log('✔ Review report with evidence and gazette reference verified:', fetchedReviewDetail.issues[0].gazetteReference);

  console.log('\n--- ALL LIVE E2E CHECKS PASSED SUCCESSFULLY ---');
}

runE2E().catch((err) => {
  console.error('❌ E2E check failed:', err);
  process.exit(1);
});
