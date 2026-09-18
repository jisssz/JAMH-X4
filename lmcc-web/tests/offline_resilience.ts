import assert from 'node:assert';
import { parseLabel } from '../src/services/parser/fieldParser';
import { defaultRulesEngine } from '../src/services/rules/rulesEngine';
import { submitReport, getReports, getReport } from '../src/services/api';

async function testOfflineResilience() {
  console.log('--- Verifying Scanning / Parser / Rules Engine when Backend is STOPPED ---');
  const ocrText = `
    PARLE-G ORIGINAL GLUCOSE BISCUITS
    MFD BY: PARLE PRODUCTS PVT LTD
    PLOT NO 14, INDUSTRIAL AREA, MUMBAI, MAHARASHTRA 400057
    NET WEIGHT: 250 g
    MFD: 08/2024
    MRP: ₹ 35.00 (INCL. OF ALL TAXES)
    CONSUMER CARE: 1800222211, care@parle.biz
  `;
  const label = parseLabel(ocrText);
  assert.strictEqual(label.mrp, '₹35.00');
  assert.strictEqual(label.netQuantity, '250 g');

  const verdict = defaultRulesEngine.evaluate(label);
  assert.strictEqual(verdict.overallStatus, 'PASS');
  assert.strictEqual(verdict.flaggedChecks, 0);
  console.log('✔ Core screening and parsing pipeline works 100% locally with zero backend connection!');

  console.log('\n--- Verifying Graceful Backend-Unavailable State on Report Submission ---');
  let submitFailedGracefully = false;
  try {
    await submitReport({
      verdict: 'PASS',
      productName: 'Test Product',
      issues: [],
    });
  } catch (err: any) {
    submitFailedGracefully = true;
    console.log('✔ Captured expected error on submitReport:', err.message);
    assert.ok(err.message.toLowerCase().includes('connect') || err.message.toLowerCase().includes('fetch'));
  }
  assert.strictEqual(submitFailedGracefully, true, 'submitReport must throw catchable error when server is offline');

  console.log('\n--- Verifying Graceful Backend-Unavailable State on History Retrieval ---');
  let historyFailedGracefully = false;
  try {
    await getReports();
  } catch (err: any) {
    historyFailedGracefully = true;
    console.log('✔ Captured expected error on getReports:', err.message);
    assert.ok(err.message.toLowerCase().includes('connect') || err.message.toLowerCase().includes('fetch'));
  }
  assert.strictEqual(historyFailedGracefully, true, 'getReports must throw catchable error when server is offline');

  console.log('\n--- Verifying Graceful Backend-Unavailable State on Report Detail Retrieval ---');
  let detailFailedGracefully = false;
  try {
    await getReport('non-existent-id');
  } catch (err: any) {
    detailFailedGracefully = true;
    console.log('✔ Captured expected error on getReport:', err.message);
    assert.ok(err.message.toLowerCase().includes('connect') || err.message.toLowerCase().includes('fetch'));
  }
  assert.strictEqual(detailFailedGracefully, true, 'getReport must throw catchable error when server is offline');

  console.log('\n--- ALL OFFLINE RESILIENCE VERIFICATIONS PASSED ---');
}

testOfflineResilience().catch((err) => {
  console.error('❌ Offline resilience check failed:', err);
  process.exit(1);
});
