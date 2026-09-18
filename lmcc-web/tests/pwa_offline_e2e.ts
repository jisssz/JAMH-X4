import assert from 'node:assert';
import {
  saveLocalReport,
  getLocalReports,
  getLocalReport,
  getPendingLocalReports,
} from '../src/services/storage/localReports';
import { syncPendingReports } from '../src/services/sync/reportSync';
import { getReports, getReport, checkHealth } from '../src/services/api';

async function runPwaOfflineE2E() {
  console.log('=== Step 1: Create Report while Offline ===');
  const offlinePayload = {
    verdict: 'REVIEW' as const,
    productName: 'Offline PWA Test Snack',
    mrp: '₹40.00',
    netQuantity: '150 g',
    manufacturer: 'PWA Foods India Pvt Ltd',
    dateDeclaration: '09/2024',
    consumerCare: '1800-PWA-CARE',
    issueCount: 1,
    issues: [
      {
        ruleId: 'LM-PCR-2011-R6-1-B',
        field: 'netQuantity',
        title: 'Net Quantity Format Review',
        severity: 'major',
        detectedValue: '150 g',
        explanation: 'Metric unit font size check per First Schedule',
        evidence: 'NET WT: 150 g',
        recommendation: 'Verify physical packaging font height',
        source: 'Rule 6(1)(c)',
        gazetteReference: 'G.S.R. 202(E) dated 07-03-2011',
      },
    ],
    rawOcr: 'OFFLINE PWA TEST SNACK NET WT: 150 g MRP: 40.00',
    userRemarks: 'Created in airplane mode during field inspection',
  };

  const localReport = await saveLocalReport(offlinePayload);
  console.log('✔ Report saved to IndexedDB queue with local ID:', localReport.localId);
  assert.ok(localReport.localId.startsWith('local_'));
  assert.strictEqual(localReport.syncStatus, 'pending');

  const pendingBefore = await getPendingLocalReports();
  assert.ok(pendingBefore.some((p) => p.localId === localReport.localId));
  console.log(`✔ Verified report is in pending queue (${pendingBefore.length} pending items)`);

  console.log('\n=== Step 2: Verify Backend Connectivity ===');
  const health = await checkHealth();
  assert.strictEqual(health.status, 'ok');
  console.log('✔ Backend confirmed running and reachable:', health);

  console.log('\n=== Step 3: Trigger Background Sync to Backend ===');
  const syncResult = await syncPendingReports();
  console.log('✔ Sync completed:', syncResult);
  assert.ok(syncResult.synced >= 1);
  assert.strictEqual(syncResult.failed, 0);

  console.log('\n=== Step 4: Verify Synced Report in Storage & Server ===');
  const updatedLocal = await getLocalReport(localReport.localId);
  assert.strictEqual(updatedLocal?.syncStatus, 'synced');
  assert.ok(updatedLocal?.serverId, 'Must receive real backend server ID');
  console.log('✔ Local report updated with server ID:', updatedLocal?.serverId);

  // Query server directly to confirm round-trip persistence
  const serverReport = await getReport(updatedLocal!.serverId!);
  assert.strictEqual(serverReport.productName, 'Offline PWA Test Snack');
  assert.strictEqual(serverReport.verdict, 'REVIEW');
  assert.strictEqual(serverReport.issues[0].ruleId, 'LM-PCR-2011-R6-1-B');
  assert.ok(serverReport.issues[0].evidence?.includes('150 g'));
  console.log('✔ Server confirmed record exists in SQLite database!');

  console.log('\n=== Step 5: Verify Report Appears in History ===');
  const historyList = await getReports(10);
  const found = historyList.find((h) => h.id === updatedLocal!.serverId);
  assert.ok(found, 'Synced report must appear in history list');
  console.log('✔ Synced report successfully listed in report history');

  console.log('\n=== ALL PWA OFFLINE + SYNC VERIFICATIONS PASSED ===');
}

runPwaOfflineE2E().catch((err) => {
  console.error('❌ PWA Offline verification failed:', err);
  process.exit(1);
});
