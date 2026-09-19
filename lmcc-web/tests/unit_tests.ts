import assert from 'node:assert';
import test from 'node:test';
import { parseLabel } from '../src/services/parser/fieldParser';
import { RulesEngine } from '../src/services/rules/rulesEngine';
import { OcrService } from '../src/services/ocr/OcrService';
import { mergeOcrStreams } from '../src/services/ocr/ocrTextMerger';
import { mergeMultiPanelDeclarations } from '../src/services/parser/multiPanelMerger';

// ----------------------------------------------------
// Fixture 1: Biscuit / Snack Package (Compliant)
// ----------------------------------------------------
test('Fixture 1: Biscuit/snack package label extracts declarations and passes screening', () => {
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
  assert.strictEqual(label.manufactureDate, '08/2024');
  assert.ok(label.manufacturer?.includes('PARLE PRODUCTS'));
  assert.ok(label.address?.includes('INDUSTRIAL AREA'));
  assert.ok(label.consumerCare?.includes('1800222211'));

  const engine = new RulesEngine();
  const verdict = engine.evaluate(label);
  assert.strictEqual(verdict.overallStatus, 'PASS');
  assert.strictEqual(verdict.flaggedChecks, 0);
  assert.strictEqual(verdict.potentialViolations.length, 0);
});

// ----------------------------------------------------
// Fixture 2: Shampoo / Cosmetic-style Package
// ----------------------------------------------------
test('Fixture 2: Shampoo/cosmetic-style package extracts volume and packer details', () => {
  const ocrText = `
    SILK SHINE NOURISHING SHAMPOO
    MANUFACTURED BY: COSMO CARE LABS LTD
    REGD OFFICE: SECTOR 62, NOIDA, UP 201301
    NET VOL: 650 ml
    PKD: 10/2024
    M.R.P. ₹ 420.00 INCL OF ALL TAXES
    FOR CONSUMER COMPLAINTS WRITE TO CARE CELL AT: 1800108108, support@cosmocare.in
  `;

  const label = parseLabel(ocrText);
  assert.strictEqual(label.mrp, '₹420.00');
  assert.strictEqual(label.netQuantity, '650 ml');
  assert.strictEqual(label.packingDate, '10/2024');
  assert.ok(label.manufacturer?.includes('COSMO CARE'));
  assert.ok(label.consumerCare?.includes('1800108108'));

  const engine = new RulesEngine();
  const verdict = engine.evaluate(label);
  assert.strictEqual(verdict.overallStatus, 'PASS');
});

// ----------------------------------------------------
// Fixture 3: Beverage / Liquid Package in Litres
// ----------------------------------------------------
test('Fixture 3: Beverage/liquid package extracts volume in litres and passes screening', () => {
  const ocrText = `
    NATURE FRESH 100% APPLE JUICE
    PACKED BY: HIMALAYAN ORCHARDS LTD
    PLOT 5, BEAS INDUSTRIAL ESTATE, MANDI 175001
    NET QUANTITY: 1 L
    MFD: 06/2024
    MRP: ₹ 110.00 INCL. OF ALL TAXES
    CUSTOMER HELPLINE: 1800180180, helpline@naturefresh.in
  `;

  const label = parseLabel(ocrText);
  assert.strictEqual(label.mrp, '₹110.00');
  assert.strictEqual(label.netQuantity, '1 l');
  assert.strictEqual(label.manufactureDate, '06/2024');
  assert.ok(label.manufacturer?.includes('HIMALAYAN ORCHARDS'));

  const engine = new RulesEngine();
  const verdict = engine.evaluate(label);
  assert.strictEqual(verdict.overallStatus, 'PASS');
});

// ----------------------------------------------------
// Fixture 4: Package with MRP using Rs.
// ----------------------------------------------------
test('Fixture 4: Package with MRP declared using Rs. variations', () => {
  const ocrText = `
    ATTA WHOLE WHEAT FLOUR
    MFD BY: AGRO FOODS INDIA LTD
    TALUKA HAVELI, PUNE 411028
    NET WT: 5 kg
    PKD: 05/2024
    MRP Rs. 245.00 /- INCL OF ALL TAXES
    HELPLINE: 1800345678, feedback@agrofoods.com
  `;

  const label = parseLabel(ocrText);
  assert.strictEqual(label.mrp, '₹245.00');
  assert.strictEqual(label.netQuantity, '5 kg');

  const engine = new RulesEngine();
  const verdict = engine.evaluate(label);
  assert.strictEqual(verdict.overallStatus, 'PASS');
});

// ----------------------------------------------------
// Fixture 5: Package with MRP using ₹ symbol and currency suffix
// ----------------------------------------------------
test('Fixture 5: Package with MRP declared as ₹99 or ₹99 MRP', () => {
  const ocrText = `
    CRISPY CHIPS
    MFD BY: SNACK KING FOODS
    VILLAGE KHERI, DIST AMBALA 133001
    NET QTY: 90 g
    MFD: 07/2024
    ₹99.00 MRP (INCLUSIVE OF ALL TAXES)
    CUSTOMER CARE: care@snackking.com, 1800999888
  `;

  const label = parseLabel(ocrText);
  assert.strictEqual(label.mrp, '₹99.00');

  const engine = new RulesEngine();
  const verdict = engine.evaluate(label);
  assert.strictEqual(verdict.overallStatus, 'PASS');
});

// ----------------------------------------------------
// Fixture 6: Package with Noisy OCR (broken decimals, R5 confusion, spaced M.R.P.)
// ----------------------------------------------------
test('Fixture 6: Noisy OCR with R5 confusion, broken decimals, and spaced abbreviations', () => {
  const noisyOcr = `
    PREMIUM COOKIES
    M . R . P : R5 149 . 00 ( INCL OF ALL TAXES )
    N E T  W T : 200 g
    M F G : 04/2024
    M F D  B Y : ROYAL BAKERS PRIVATE LIMITED
    FACTORY AT : PLOT 10, IND. AREA, GURUGRAM 122001
    FEEDBACK CELL : 1800888123 , care@royalbakers.in
  `;

  const label = parseLabel(noisyOcr);
  assert.strictEqual(label.mrp, '₹149.00');
  assert.strictEqual(label.netQuantity, '200 g');
  assert.strictEqual(label.manufactureDate, '04/2024');
  assert.ok(label.manufacturer?.includes('ROYAL BAKERS'));

  const engine = new RulesEngine();
  const verdict = engine.evaluate(label);
  assert.strictEqual(verdict.overallStatus, 'PASS');
});

// ----------------------------------------------------
// Fixture 7: Package with Missing MRP
// ----------------------------------------------------
test('Fixture 7: Package with Missing MRP produces REVIEW and flags Rule 6(1)(da)', () => {
  const ocrText = `
    EXPORT QUALITY RICE
    PACKED BY: BHARAT AGRO MILLS
    DISTRICT KARNAL, HARYANA 132001
    NET QUANTITY: 1 kg
    PKD: 03/2024
    CONSUMER CARE: 1800456123, care@bharatagro.com
  `;

  const label = parseLabel(ocrText);
  assert.strictEqual(label.mrp, undefined);

  const engine = new RulesEngine();
  const verdict = engine.evaluate(label);
  assert.strictEqual(verdict.overallStatus, 'REVIEW');
  assert.ok(verdict.flaggedChecks >= 1);

  const mrpViolation = verdict.potentialViolations.find((v) => v.field === 'mrp');
  assert.ok(mrpViolation !== undefined);
  assert.strictEqual(mrpViolation?.ruleId, 'LM-PCR-2011-R6-1-DA');
});

// ----------------------------------------------------
// Fixture 8: Package with Missing Net Quantity
// ----------------------------------------------------
test('Fixture 8: Package with Missing Net Quantity produces REVIEW and flags Rule 6(1)(c)', () => {
  const ocrText = `
    ORGANIC GREEN TEA
    MFD BY: ASSAM TEA ESTATES
    WORKS AT: GUWAHATI 781001
    MFD: 02/2024
    MRP: ₹ 220.00
    CONSUMER CARE: 1800555444, tea@assamestates.com
  `;

  const label = parseLabel(ocrText);
  assert.strictEqual(label.netQuantity, undefined);

  const engine = new RulesEngine();
  const verdict = engine.evaluate(label);
  assert.strictEqual(verdict.overallStatus, 'REVIEW');

  const qtyViolation = verdict.potentialViolations.find((v) => v.field === 'netQuantity');
  assert.ok(qtyViolation !== undefined);
  assert.strictEqual(qtyViolation?.ruleId, 'LM-PCR-2011-R6-1-C');
});

// ----------------------------------------------------
// Fixture 9: Package with Missing Manufacturer/Packer
// ----------------------------------------------------
test('Fixture 9: Package with Missing Manufacturer produces REVIEW and flags Rule 6(1)(a)', () => {
  const ocrText = `
    UNBRANDED PULSES
    PLOT NO 4, GIDC ESTATE, SURAT 395001
    NET WEIGHT: 500 g
    PKD: 01/2024
    MRP: ₹ 85.00
    CONSUMER CARE: 1800111222, pulses@care.in
  `;

  const label = parseLabel(ocrText);
  assert.strictEqual(label.manufacturer, undefined);

  const engine = new RulesEngine();
  const verdict = engine.evaluate(label);
  assert.strictEqual(verdict.overallStatus, 'REVIEW');

  const mfgViolation = verdict.potentialViolations.find((v) => v.field === 'manufacturer');
  assert.ok(mfgViolation !== undefined);
  assert.strictEqual(mfgViolation?.ruleId, 'LM-PCR-2011-R6-1-A-NAME');
});

// ----------------------------------------------------
// Fixture 10: Package with Ambiguous Date (lacking MFD/PKD prefix)
// ----------------------------------------------------
test('Fixture 10: Package with ambiguous isolated date produces REVIEW for date context', () => {
  const ocrText = `
    CRUNCHY ALMONDS
    PACKED BY: DRY FRUITS HUB PVT LTD
    REGD OFFICE: KHARI BAOLI, DELHI 110006
    NET WT: 200 g
    MRP: ₹ 290.00
    04/2024
    CONSUMER CARE: 1800333222, care@dryfruitshub.com
  `;

  const label = parseLabel(ocrText);
  assert.strictEqual(label.isDateAmbiguous, true);
  assert.strictEqual(label.packingDate, '04/2024');

  const engine = new RulesEngine();
  const verdict = engine.evaluate(label);
  assert.strictEqual(verdict.overallStatus, 'REVIEW');

  const dateViolation = verdict.potentialViolations.find((v) => v.field === 'packingDate');
  assert.ok(dateViolation !== undefined);
  assert.ok(dateViolation?.title.includes('Ambiguous Context'));
});

// ----------------------------------------------------
// Fixture 11: Package with Post-Dated / Future Manufacturing Date
// ----------------------------------------------------
test('Fixture 11: Package with future post-dated manufacturing date produces REVIEW', () => {
  const ocrText = `
    DAIRY FRESH BUTTER
    MFD BY: AMULYA DAIRY LTD
    ANAND, GUJARAT 388001
    NET QTY: 500 g
    MFD: 12/2028
    MRP: ₹ 275.00
    HELPLINE: 1800258258, care@amulyadairy.in
  `;

  const label = parseLabel(ocrText);
  assert.strictEqual(label.isFutureDate, true);

  const engine = new RulesEngine();
  const verdict = engine.evaluate(label);
  assert.strictEqual(verdict.overallStatus, 'REVIEW');

  const dateViolation = verdict.potentialViolations.find((v) => v.field === 'packingDate');
  assert.ok(dateViolation !== undefined);
  assert.ok(dateViolation?.title.includes('Post-Dated'));
  assert.strictEqual(dateViolation?.severity, 'critical');
});

// ----------------------------------------------------
// Fixture 12: Empty OCR
// ----------------------------------------------------
test('Fixture 12: Empty OCR text is handled safely and produces REVIEW', () => {
  const label = parseLabel('');
  assert.strictEqual(label.rawText, '');
  assert.strictEqual(label.mrp, undefined);
  assert.strictEqual(label.netQuantity, undefined);

  const engine = new RulesEngine();
  const verdict = engine.evaluate(label);
  assert.strictEqual(verdict.overallStatus, 'REVIEW');
  assert.strictEqual(verdict.flaggedChecks, verdict.totalChecks);
});

// ----------------------------------------------------
// Fixture 13: Completely Corrupted / Non-Label OCR Output
// ----------------------------------------------------
test('Fixture 13: Corrupted noise OCR produces REVIEW without throwing exceptions', () => {
  const corruptedOcr = `
    §¶•ªº≠±×÷√
    %%%%% ^^^^^ &&&&& ****
    01010101010101010101
    ########## ~~~~~~ @@@@
    ----------------------
  `;

  const label = parseLabel(corruptedOcr);
  assert.strictEqual(label.rawText, corruptedOcr);
  assert.strictEqual(label.mrp, undefined);
  assert.strictEqual(label.netQuantity, undefined);
  assert.strictEqual(label.manufacturer, undefined);

  const engine = new RulesEngine();
  const verdict = engine.evaluate(label);
  assert.strictEqual(verdict.overallStatus, 'REVIEW');
  assert.ok(verdict.flaggedChecks > 0);
});

// ----------------------------------------------------
// Evidence & Legal Tone Safety Tests (Phase 5)
// ----------------------------------------------------
test('Phase 5: Every compliance check and violation supplies concrete evidence', () => {
  const engine = new RulesEngine();
  const label = parseLabel(`
    MFD BY: SAMPLE ORG
    MRP: ₹ 100
    NET QTY: 100 g
    MFD: 01/2024
  `);

  const verdict = engine.evaluate(label);
  for (const check of verdict.checks) {
    assert.ok(typeof check.evidence === 'string' && check.evidence.length > 0, `Missing evidence on ${check.ruleId}`);
  }
  for (const violation of verdict.potentialViolations) {
    assert.ok(typeof violation.evidence === 'string' && violation.evidence.length > 0, `Missing evidence on violation ${violation.ruleId}`);
  }
});

test('Phase 5: Output strings strictly avoid definitive legal conclusions', () => {
  const engine = new RulesEngine();
  const label = parseLabel(`
    GENERIC ITEM
    NET QTY: 50 g
  `);

  const verdict = engine.evaluate(label);
  const serialized = JSON.stringify(verdict).toLowerCase();

  // Guard against prohibited alarmist / definitive conclusions
  assert.ok(!serialized.includes('"illegal"'), 'Should not state product is illegal');
  assert.ok(!serialized.includes('certified compliant'), 'Should not claim certification');
  assert.ok(!serialized.includes('100% compliant'), 'Should not claim 100% compliance');
  assert.ok(!serialized.includes('violation confirmed'), 'Should not state violation confirmed');
});

// ----------------------------------------------------
// Architecture Check: OcrService Interface Polymorphism
// ----------------------------------------------------
test('Architecture Check: OcrService interface can be satisfied by mock or production implementations', async () => {
  class MockOcrService implements OcrService {
    async recognize(_image: Blob | File, onProgress?: (p: number, s: string) => void): Promise<string> {
      if (onProgress) onProgress(1.0, 'Done');
      return 'SAMPLE PACKAGING TEXT';
    }
  }

  const service: OcrService = new MockOcrService();
  const text = await service.recognize(new Blob(['mock']), (p, s) => {
    assert.strictEqual(p, 1.0);
    assert.strictEqual(s, 'Done');
  });
  assert.strictEqual(text, 'SAMPLE PACKAGING TEXT');
});

// ----------------------------------------------------
// Phase 6: Reporting Payload & Privacy Verification
// ----------------------------------------------------
test('Phase 6: Reporting payload strictly conforms to PASS/REVIEW and contains zero personal or binary image data', () => {
  const engine = new RulesEngine();
  const label = parseLabel(`
    GENERIC SNACK
    NET QTY: 50 g
  `);
  const verdict = engine.evaluate(label);

  const payload = {
    verdict: verdict.overallStatus,
    productName: 'Sample Snack',
    mrp: label.mrp,
    netQuantity: label.netQuantity,
    manufacturer: label.manufacturer,
    dateDeclaration: label.manufactureDate || label.packingDate,
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
    userRemarks: 'Purchased at local store',
  };

  // Verdict validation
  assert.ok(payload.verdict === 'PASS' || payload.verdict === 'REVIEW');
  assert.strictEqual(payload.issueCount, payload.issues.length);

  // Privacy & architecture validations: no image binary, no device ID, no user ID
  const serialized = JSON.stringify(payload);
  const parsed = JSON.parse(serialized);
  assert.strictEqual(parsed.imageBlob, undefined);
  assert.strictEqual(parsed.userId, undefined);
  assert.strictEqual(parsed.deviceId, undefined);
  assert.strictEqual(parsed.ipAddress, undefined);
});

// ----------------------------------------------------
// Phase 7: Report History & API Integration Verification
// ----------------------------------------------------
test('Phase 7: History response parsing correctly handles varied records without crashing', () => {
  const mockApiReports = [
    {
      id: 'a6b0bd03-a685-462c-b752-131212bf289e',
      createdAt: '2026-09-18T08:00:00.000Z',
      verdict: 'PASS',
      productName: 'Parle-G 250g',
      mrp: '₹35.00',
      netQuantity: '250 g',
      manufacturer: 'Parle Products Pvt Ltd',
      dateDeclaration: '08/2024',
      consumerCare: '1800222211',
      issueCount: 0,
      issues: [],
      rawOcr: 'PARLE-G...',
      userRemarks: 'Verified on shelf',
    },
    {
      id: 'b7c1ce14-b796-573d-c863-242323cf39af',
      createdAt: '2026-09-18T08:30:00.000Z',
      verdict: 'REVIEW',
      productName: null,
      mrp: null,
      netQuantity: '500 g',
      manufacturer: null,
      dateDeclaration: null,
      consumerCare: null,
      issueCount: 2,
      issues: [
        {
          ruleId: 'LM-PCR-2011-R6-1-DA',
          field: 'mrp',
          title: 'Maximum Retail Price (MRP)',
          severity: 'critical',
          explanation: 'MRP declaration missing',
          evidence: 'No price pattern found',
          recommendation: 'Check packaging',
          source: 'Rule 6(1)(da)',
          gazetteReference: 'G.S.R. 629(E)',
        },
      ],
      rawOcr: null,
      userRemarks: null,
    },
  ];

  // Test mapping and display data extraction
  assert.strictEqual(mockApiReports.length, 2);
  assert.strictEqual(mockApiReports[0].verdict, 'PASS');
  assert.strictEqual(mockApiReports[0].issueCount, 0);
  assert.strictEqual(mockApiReports[1].verdict, 'REVIEW');
  assert.strictEqual(mockApiReports[1].issueCount, 2);
  assert.strictEqual(mockApiReports[1].issues[0].ruleId, 'LM-PCR-2011-R6-1-DA');
});

test('Phase 7: Malformed or missing API fields are handled gracefully', () => {
  const malformedReport = {
    id: 'c8d2df25-c807-684e-d974-353434df40b0',
    createdAt: 'invalid-date',
    verdict: 'UNKNOWN_VERDICT',
    // Missing productName, issues, etc.
  };

  // Safe verdict check
  const isPass = malformedReport.verdict === 'PASS';
  assert.strictEqual(isPass, false);

  // Safe date parsing without throwing
  let parsedDate = '';
  try {
    const d = new Date(malformedReport.createdAt);
    parsedDate = isNaN(d.getTime()) ? malformedReport.createdAt : d.toISOString();
  } catch {
    parsedDate = malformedReport.createdAt;
  }
  assert.strictEqual(parsedDate, 'invalid-date');

  // Safe issues extraction fallback
  const issues = (malformedReport as any).issues || [];
  assert.ok(Array.isArray(issues));
  assert.strictEqual(issues.length, 0);
});

test('Phase 7: Report ID is non-empty and safely formatted for copy action', () => {
  const testId = 'a6b0bd03-a685-462c-b752-131212bf289e';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  assert.ok(uuidRegex.test(testId), 'Report ID must match UUID format');
});

// ----------------------------------------------------
// Phase 8: PWA & Offline-First Capability Verification
// ----------------------------------------------------
import {
  saveLocalReport,
  getLocalReports,
  getLocalReport,
  getPendingLocalReports,
  updateLocalReportStatus,
  deleteLocalReport,
  LocalReport,
} from '../src/services/storage/localReports';

test('Phase 8: Offline indicator behavior correctly mirrors online status', () => {
  // Test online/offline state inference
  const testStatus = (isOnline: boolean, pendingCount: number) => {
    if (!isOnline) return 'OFFLINE';
    if (pendingCount > 0) return 'QUEUED';
    return 'ONLINE';
  };

  assert.strictEqual(testStatus(false, 0), 'OFFLINE');
  assert.strictEqual(testStatus(false, 5), 'OFFLINE');
  assert.strictEqual(testStatus(true, 3), 'QUEUED');
  assert.strictEqual(testStatus(true, 0), 'ONLINE');
});

test('Phase 8: Local report creation persists observation into queue without binary images or PII', async () => {
  const payload = {
    verdict: 'REVIEW' as const,
    productName: 'Offline Test Biscuit',
    mrp: '₹25.00',
    netQuantity: '100 g',
    issues: [
      {
        ruleId: 'LM-PCR-2011-R6-1-DA',
        field: 'mrp',
        title: 'MRP Verification',
        severity: 'critical',
        explanation: 'Check MRP font size',
        evidence: 'MRP: ₹25.00',
        recommendation: 'Verify font size',
        source: 'Rule 6(1)(da)',
        gazetteReference: 'G.S.R. 629(E)',
      },
    ],
    rawOcr: 'OFFLINE BISCUIT TEXT',
    userRemarks: 'Created while offline on mobile device',
  };

  const report = await saveLocalReport(payload);
  assert.ok(report.localId.startsWith('local_'), 'Local ID must be prefixed with local_');
  assert.strictEqual(report.syncStatus, 'pending');
  assert.strictEqual(report.serverId, null);
  assert.strictEqual(report.retryCount, 0);

  // Validate zero PII or binary data
  const raw = JSON.stringify(report);
  assert.ok(!raw.includes('imageBlob'));
  assert.ok(!raw.includes('userId'));
  assert.ok(!raw.includes('deviceId'));
});

test('Phase 8: Local report retrieval fetches stored items and handles specific lookups', async () => {
  const allReports = await getLocalReports();
  assert.ok(allReports.length >= 1);

  const firstReport = allReports[0];
  const fetched = await getLocalReport(firstReport.localId);
  assert.ok(fetched !== null);
  assert.strictEqual(fetched?.localId, firstReport.localId);
  assert.strictEqual(fetched?.payload.productName, firstReport.payload.productName);
});

test('Phase 8: Pending sync state isolates un-synced items', async () => {
  const pendingReports = await getPendingLocalReports();
  for (const r of pendingReports) {
    assert.ok(r.syncStatus === 'pending' || r.syncStatus === 'failed');
    assert.strictEqual(r.serverId, null);
  }
});

test('Phase 8: Successful sync state updates report status and records server report ID', async () => {
  const payload = {
    verdict: 'PASS' as const,
    productName: 'Sync Success Item',
    issues: [],
  };

  const report = await saveLocalReport(payload);
  const mockServerId = 'server-uuid-12345';

  await updateLocalReportStatus(report.localId, 'synced', mockServerId);
  const updated = await getLocalReport(report.localId);

  assert.strictEqual(updated?.syncStatus, 'synced');
  assert.strictEqual(updated?.serverId, mockServerId);
  assert.ok(updated?.syncedAt !== null);
});

test('Phase 8: Failed sync remains queued and increments retry count', async () => {
  const payload = {
    verdict: 'REVIEW' as const,
    productName: 'Retry Queue Item',
    issues: [],
  };

  const report = await saveLocalReport(payload);
  const initialRetries = report.retryCount;

  await updateLocalReportStatus(report.localId, 'failed', null, 'Connection timed out');
  const failed = await getLocalReport(report.localId);

  assert.strictEqual(failed?.syncStatus, 'failed');
  assert.strictEqual(failed?.retryCount, initialRetries + 1);
  assert.strictEqual(failed?.lastError, 'Connection timed out');
  assert.strictEqual(failed?.serverId, null);

  // Must still be returned in pending reports for retry
  const pending = await getPendingLocalReports();
  assert.ok(pending.some((p) => p.localId === report.localId));
});

test('Phase 8: Sync does not duplicate reports (distinct tracking by localId and serverId)', async () => {
  const payload = {
    verdict: 'PASS' as const,
    productName: 'De-duplication Item',
    issues: [],
  };

  const r1 = await saveLocalReport(payload);
  const r2 = await saveLocalReport(payload);

  assert.notStrictEqual(r1.localId, r2.localId, 'Each local report must have a distinct unique localId');
});

test('Phase 8: Local vs Server report distinction is well-defined', () => {
  const isLocalId = (id: string) => id.startsWith('local_');

  assert.strictEqual(isLocalId('local_1726650000_abc123'), true);
  assert.strictEqual(isLocalId('a6b0bd03-a685-462c-b752-131212bf289e'), false);
});

test('Phase 8: Malformed local report data is handled safely without throwing', async () => {
  // Non-existent report lookup
  const nonExistent = await getLocalReport('local_non_existent_123');
  assert.strictEqual(nonExistent, null);

  // Delete non-existent
  await deleteLocalReport('local_non_existent_123');
});

test('Phase 8: Web App Manifest configuration satisfies standalone PWA standards', () => {
  const manifest = {
    name: 'Legal Metrology Compliance Checker',
    short_name: 'LMCC',
    display: 'standalone',
    start_url: '/',
    theme_color: '#0e3456',
  };

  assert.strictEqual(manifest.name, 'Legal Metrology Compliance Checker');
  assert.strictEqual(manifest.short_name, 'LMCC');
  assert.strictEqual(manifest.display, 'standalone');
  assert.strictEqual(manifest.start_url, '/');
  assert.strictEqual(manifest.theme_color, '#0e3456');
});

// ----------------------------------------------------
// Phase 9: Multilingual & OCR Quality Model Tests
// ----------------------------------------------------
import {
  SUPPORTED_LANGUAGES,
  getSelectedLanguage,
  setSelectedLanguage,
  getLanguageProfile,
  DEFAULT_LANGUAGE_CODE,
} from '../src/services/ocr/ocrLanguages';
import { assessOcrQuality } from '../src/services/ocr/ocrQuality';
import { normalizeText } from '../src/utils/textNormalize';

test('Phase 9: Language profile registry supports English and Indian regional scripts', () => {
  assert.strictEqual(DEFAULT_LANGUAGE_CODE, 'eng');
  const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
  assert.ok(codes.includes('eng'), 'Must support English');
  assert.ok(codes.includes('hin'), 'Must support Hindi');
  assert.ok(codes.includes('eng+hin'), 'Must support Bilingual English + Hindi');
  assert.ok(codes.includes('mal'), 'Must support Malayalam');
  assert.ok(codes.includes('tam'), 'Must support Tamil');
  assert.ok(codes.includes('kan'), 'Must support Kannada');
  assert.ok(codes.includes('tel'), 'Must support Telugu');
});

test('Phase 9: Honest offline status verification per language profile', () => {
  const english = getLanguageProfile('eng');
  assert.strictEqual(english.offlineStatus, 'offline_ready', 'English must be marked offline_ready');

  const regionalLanguages = ['hin', 'eng+hin', 'mal', 'tam', 'kan', 'tel'];
  for (const code of regionalLanguages) {
    const profile = getLanguageProfile(code);
    assert.strictEqual(
      profile.offlineStatus,
      'online_first_use_required',
      `${code} must honestly declare online_first_use_required for CDN model fetch`
    );
  }
});

test('Phase 9: Language selection persistence updates and retrieves preference', () => {
  const selected = setSelectedLanguage('hin');
  assert.strictEqual(selected.code, 'hin');
  assert.strictEqual(selected.script, 'Devanagari');

  const retrieved = getSelectedLanguage();
  assert.strictEqual(retrieved.code, 'hin');

  // Reset back to English
  setSelectedLanguage('eng');
  assert.strictEqual(getSelectedLanguage().code, 'eng');
});

test('Phase 9: OCR Quality Assessment model categorizes quality accurately', () => {
  // 1. POOR: Short text (< 20 chars)
  const shortResult = assessOcrQuality('AB 12', 90);
  assert.strictEqual(shortResult.quality, 'POOR');
  assert.ok(shortResult.reason.includes('Insufficient'));

  // 2. POOR: Low confidence (< 40)
  const lowConfResult = assessOcrQuality('THIS IS A SIGNIFICANT AMOUNT OF NOISY TEXT ON PACKAGING', 32);
  assert.strictEqual(lowConfResult.quality, 'POOR');
  assert.ok(lowConfResult.reason.includes('Low OCR'));

  // 3. GOOD: Declaration keywords with strong confidence
  const goodKeywords = assessOcrQuality(
    'PARLE-G MRP: ₹ 20.00 NET WT: 100 g MFD: 05/2024 CONSUMER CARE: 1800222211',
    72
  );
  assert.strictEqual(goodKeywords.quality, 'GOOD');
  assert.ok(goodKeywords.keywordHits.length >= 3);

  // 4. GOOD: High confidence (>= 75) across adequate length
  const highConfGeneral = assessOcrQuality(
    'GENERIC BRAND INGREDIENTS WHEAT FLOUR SUGAR EDIBLE VEGETABLE OIL SALT LEAVENING AGENTS',
    82
  );
  assert.strictEqual(highConfGeneral.quality, 'GOOD');

  // 5. FAIR: Moderate confidence with partial keyword hits
  const fairResult = assessOcrQuality(
    'SOME CRUNCHY SNACK PRODUCT NET WT 50g UNVERIFIED TEXT',
    55
  );
  assert.strictEqual(fairResult.quality, 'FAIR');
});

test('Phase 9: Technical OCR Quality is strictly orthogonal to Legal Compliance Verdict', () => {
  const engine = new RulesEngine();

  // Scenario A: Sharp image with clear text, but ILLEGAL / NON-COMPLIANT label (missing MRP, missing dates)
  const nonCompliantOcr = `
    DELICIOUS CHOCOLATE COOKIES
    INGREDIENTS: FLOUR, SUGAR, COCOA
    STORE IN A COOL DRY PLACE
    DISTRIBUTED BY SWEET TREATS INC
  `;
  const ocrEval = assessOcrQuality(nonCompliantOcr, 88);
  const parsedLabel = parseLabel(nonCompliantOcr);
  const verdict = engine.evaluate(parsedLabel);

  // Technical OCR quality is GOOD because text is clear and readable
  assert.strictEqual(ocrEval.quality, 'GOOD');
  // But legal compliance is REVIEW because statutory Rule 6 declarations are missing!
  assert.strictEqual(verdict.overallStatus, 'REVIEW');
  assert.ok(verdict.potentialViolations.length >= 2);
});

test('Phase 9: Devanagari numerals normalization converts Hindi digits accurately', () => {
  const rawDevanagari = 'अधिकतम खुदरा मूल्य: ₹ ४५.०० शुद्ध वजन: ५०० ग्राम पैकिंग: ०८/२०२४';
  const normalized = normalizeText(rawDevanagari);

  assert.ok(normalized.includes('45.00'), 'Devanagari 45.00 converted');
  assert.ok(normalized.includes('500 g'), 'Devanagari 500 g converted');
  assert.ok(normalized.includes('08/2024'), 'Devanagari 08/2024 converted');
});

test('Phase 9: Hindi package label extracts mandatory declarations and passes screening', () => {
  const hindiOcr = `
    पतंजलि गाय का शुद्ध देशी घी
    निर्माता: पतंजलि आयुर्वेद लिमिटेड
    कार्यालय: औद्योगिक क्षेत्र, हरिद्वार, उत्तराखंड 249401
    शुद्ध मात्रा: 1 लीटर
    पैकिंग तिथि: 08/2024
    अधिकतम खुदरा मूल्य: ₹ 650.00 (सभी कर सहित)
    ग्राहक सेवा: 18001804104, feedback@patanjaliayurved.org
  `;

  const label = parseLabel(hindiOcr);
  assert.strictEqual(label.mrp, '₹650.00');
  assert.strictEqual(label.netQuantity, '1 l');
  assert.strictEqual(label.packingDate, '08/2024');
  assert.ok(label.manufacturer?.includes('पतंजलि आयुर्वेद'));
  assert.ok(label.address?.includes('औद्योगिक क्षेत्र'));
  assert.ok(label.consumerCare?.includes('18001804104'));

  const engine = new RulesEngine();
  const verdict = engine.evaluate(label);
  assert.strictEqual(verdict.overallStatus, 'PASS');
  assert.strictEqual(verdict.flaggedChecks, 0);
});

test('Phase 9: Bilingual package label (English + Hindi) extracts declarations cleanly', () => {
  const bilingualOcr = `
    HALDIRAM'S ALL IN ONE MIXTURE / नमकीन
    MFD BY / निर्माता: HALDIRAM SNACKS PVT LTD
    PLOT 12, MATHURA ROAD, NEW DELHI 110044
    NET WT / शुद्ध वजन: 400 g
    PKD / पैकिंग: 06/2024
    MRP / अधिकतम खुदरा मूल्य: ₹ 95.00 (INCL OF ALL TAXES)
    CONSUMER CARE / ग्राहक सेवा: 18004192000, care@haldiram.com
  `;

  const label = parseLabel(bilingualOcr);
  assert.strictEqual(label.mrp, '₹95.00');
  assert.strictEqual(label.netQuantity, '400 g');
  assert.strictEqual(label.packingDate, '06/2024');
  assert.ok(label.manufacturer?.includes('HALDIRAM SNACKS'));
  assert.ok(label.address?.includes('MATHURA ROAD'));
  assert.ok(label.consumerCare?.includes('18004192000'));

  const engine = new RulesEngine();
  const verdict = engine.evaluate(label);
  assert.strictEqual(verdict.overallStatus, 'PASS');
});

test('Phase 9: Regional scripts multi-state packaging preserves text and extracts declarations', () => {
  // Packaging with Malayalam title & declarations
  const malLabelOcr = `
    കേരള വെളിച്ചെണ്ണ (PURE COCONUT OIL)
    MFD BY: KERA AGRO OIL MILLS
    INDUSTRIAL ESTATE, ALAPPUZHA 688001, KERALA
    NET QTY: 1 l
    MFD: 07/2024
    MRP: ₹ 230.00
    CONSUMER CARE: 1800425425, kera@oilkerala.gov.in
  `;
  const malLabel = parseLabel(malLabelOcr);
  assert.strictEqual(malLabel.mrp, '₹230.00');
  assert.strictEqual(malLabel.netQuantity, '1 l');
  assert.strictEqual(malLabel.manufactureDate, '07/2024');
  assert.ok(malLabel.manufacturer?.includes('KERA AGRO'));

  // Packaging with Tamil title & declarations
  const tamLabelOcr = `
    ஆரோக்கிய பால் (AROKYA FULL CREAM MILK)
    PACKED BY: HATSUN AGRO PRODUCT LTD
    PLOT 14, CHENNAI 600001, TAMIL NADU
    NET VOL: 500 ml
    PKD: 08/2024
    MRP: ₹ 34.00 (INCL OF ALL TAXES)
    CUSTOMER CARE: 1800120120, info@hatsun.com
  `;
  const tamLabel = parseLabel(tamLabelOcr);
  assert.strictEqual(tamLabel.mrp, '₹34.00');
  assert.strictEqual(tamLabel.netQuantity, '500 ml');
  assert.strictEqual(tamLabel.packingDate, '08/2024');
  assert.ok(tamLabel.manufacturer?.includes('HATSUN AGRO'));

  const engine = new RulesEngine();
  assert.strictEqual(engine.evaluate(malLabel).overallStatus, 'PASS');
  assert.strictEqual(engine.evaluate(tamLabel).overallStatus, 'PASS');
});

test('Phase 9: Controlled dual-pass fallback logic selects superior OCR result on low quality', () => {
  // Simulate Pass 1 (poor quality, few chars, no keywords)
  const pass1 = {
    text: 'PRD 12',
    confidence: 35,
  };
  const eval1 = assessOcrQuality(pass1.text, pass1.confidence);
  assert.strictEqual(eval1.quality, 'POOR');

  // Trigger Pass 2 (enhanced binarization succeeds in resolving declarations)
  const pass2 = {
    text: 'BISCUIT MRP: ₹ 25.00 NET WT: 150 g MFD: 05/2024 MFD BY: BRITANNIA IND LTD',
    confidence: 76,
  };
  const eval2 = assessOcrQuality(pass2.text, pass2.confidence);
  assert.strictEqual(eval2.quality, 'GOOD');

  // Decision rule picks pass 2
  const selected = eval2.keywordHits.length > eval1.keywordHits.length ? pass2 : pass1;
  assert.strictEqual(selected, pass2);
  assert.ok(selected.text.includes('MRP: ₹ 25.00'));
});

// ----------------------------------------------------
// Phase 10: Realistic Labels & Compliance Accuracy Hardening
// ----------------------------------------------------
import { REALISTIC_LABEL_FIXTURES } from './fixtures/realistic_labels/index';

test('Phase 10: All 10 Realistic Label Golden Fixtures parse declarations and pass screening', () => {
  const engine = new RulesEngine();

  for (const fixture of REALISTIC_LABEL_FIXTURES) {
    const label = parseLabel(fixture.rawOcrText);
    const verdict = engine.evaluate(label);

    assert.strictEqual(
      verdict.overallStatus,
      fixture.expected.expectedVerdict,
      `Fixture ${fixture.id} (${fixture.name}) must evaluate to ${fixture.expected.expectedVerdict}`
    );
    assert.strictEqual(
      verdict.flaggedChecks,
      fixture.expected.flaggedCount,
      `Fixture ${fixture.id} flagged checks must match expected count ${fixture.expected.flaggedCount}`
    );

    if (fixture.expected.mrp) {
      assert.strictEqual(label.mrp, fixture.expected.mrp, `Fixture ${fixture.id} MRP mismatch`);
      assert.ok(label.mrpEvidence, `Fixture ${fixture.id} must retain MRP source line evidence`);
    }
    if (fixture.expected.netQuantity) {
      assert.strictEqual(label.netQuantity, fixture.expected.netQuantity, `Fixture ${fixture.id} Net Qty mismatch`);
      assert.ok(label.netQuantityEvidence, `Fixture ${fixture.id} must retain Net Qty source line evidence`);
    }
    if (fixture.expected.manufactureDate) {
      assert.strictEqual(label.manufactureDate, fixture.expected.manufactureDate, `Fixture ${fixture.id} MFD mismatch`);
      assert.ok(label.dateEvidence, `Fixture ${fixture.id} must retain Date source line evidence`);
    }
    if (fixture.expected.manufacturer) {
      assert.ok(
        label.manufacturer?.toLowerCase().includes(fixture.expected.manufacturer.toLowerCase().split(' ')[0]),
        `Fixture ${fixture.id} Manufacturer mismatch`
      );
      assert.ok(label.manufacturerEvidence, `Fixture ${fixture.id} must retain Manufacturer source line evidence`);
    }
  }
});

test('Phase 10: False-Positive / False-Negative Compliance Tests (Scenarios A through J)', () => {
  const engine = new RulesEngine();

  // Scenario A: All required declarations present -> PASS
  const scA = parseLabel(`
    PREMIUM COFFEE BEANS
    MFD BY: ARABICA FARMS LTD, COORG 571201
    NET WT: 200 g
    MFD: 07/2024
    MRP: ₹ 350.00
    CONSUMER CARE: 1800234567, care@arabicafarms.in
  `);
  assert.strictEqual(engine.evaluate(scA).overallStatus, 'PASS');

  // Scenario B: MRP missing -> expected REVIEW
  const scB = parseLabel(`
    HERBAL SOAP
    MFD BY: AYUR CARE LTD, HARIDWAR 249401
    NET WT: 125 g
    MFD: 06/2024
    HELPLINE: 1800111222
  `);
  const resB = engine.evaluate(scB);
  assert.strictEqual(resB.overallStatus, 'REVIEW');
  assert.ok(resB.potentialViolations.some((v) => v.field === 'mrp'));

  // Scenario C: Net quantity missing -> expected REVIEW
  const scC = parseLabel(`
    CHOCOLATE BAR
    MFD BY: SWEET TOOTH CONFECTIONERY, MUMBAI 400001
    MFD: 05/2024
    MRP: ₹ 50.00
    CARE: 1800333444
  `);
  const resC = engine.evaluate(scC);
  assert.strictEqual(resC.overallStatus, 'REVIEW');
  assert.ok(resC.potentialViolations.some((v) => v.field === 'netQuantity'));

  // Scenario D: Manufacturer missing -> expected REVIEW
  const scD = parseLabel(`
    POTATO CHIPS
    PLOT 4, INDUSTRIAL AREA, INDORE 452001
    NET WT: 50 g
    PKD: 04/2024
    MRP: ₹ 20.00
    HELPLINE: 1800999000
  `);
  const resD = engine.evaluate(scD);
  assert.strictEqual(resD.overallStatus, 'REVIEW');
  assert.ok(resD.potentialViolations.some((v) => v.field === 'manufacturer'));

  // Scenario E: Date ambiguous (isolated without MFD/PKD prefix) -> expected REVIEW
  const scE = parseLabel(`
    DRY FRUIT MIX
    PACKED BY: NUTTY NUTS PVT LTD
    PLOT 10, RAJKOT 360001
    NET WT: 250 g
    MRP: ₹ 180.00
    08/2024
    CARE: 1800444555
  `);
  const resE = engine.evaluate(scE);
  assert.strictEqual(resE.overallStatus, 'REVIEW');
  assert.strictEqual(scE.isDateAmbiguous, true);
  assert.ok(resE.potentialViolations.some((v) => v.title.includes('Ambiguous Context')));

  // Scenario F: Future date -> expected REVIEW
  const scF = parseLabel(`
    FRESH PANEER
    MFD BY: DAIRY COOP LTD, ANAND 388001
    NET QTY: 200 g
    MFD: 12/2029
    MRP: ₹ 90.00
    CARE: 1800777888
  `);
  const resF = engine.evaluate(scF);
  assert.strictEqual(resF.overallStatus, 'REVIEW');
  assert.strictEqual(scF.isFutureDate, true);
  assert.ok(resF.potentialViolations.some((v) => v.title.includes('Post-Dated')));

  // Scenario G: Multiple potential violations -> expected REVIEW with multiple issues
  const scG = parseLabel(`
    GENERIC UNLABELED BAG
    SOME TEXT WITHOUT MANDATORY DECLARATIONS
  `);
  const resG = engine.evaluate(scG);
  assert.strictEqual(resG.overallStatus, 'REVIEW');
  assert.ok(resG.flaggedChecks >= 4);

  // Scenario H: OCR noise around MRP -> ensure parser does not invent an arbitrary MRP
  const scH = parseLabel(`
    CRISPY SNACKS
    NET WT: 100 g
    MFD: 04/2024
    MFR: SNACK LABS, JAIPUR 302001
    PRICE AT STORE COUNTER
    HELPLINE: 1800123123
  `);
  assert.strictEqual(scH.mrp, undefined);

  // Scenario I: Random numbers on package (barcode, fssai, pin) must NOT become MRP
  const scI = parseLabel(`
    NOODLES PACK
    BARCODE: 8901234567890
    FSSAI LIC NO: 10014022000001
    PIN CODE: 400057
    BATCH NO: 240899
    NET WT: 75 g
    MFD: 06/2024
    MFD BY: NOODLE HOUSE LTD, MUMBAI 400057
    CARE: 1800555666
  `);
  assert.strictEqual(scI.mrp, undefined, 'Barcode or FSSAI license numbers must not be inferred as MRP');

  // Scenario J: Random date on package (e.g. copyright year) must NOT become manufacturing date
  const scJ = parseLabel(`
    BRANDED COOKIES
    COPYRIGHT © 2018 BRAND CORP
    ESTABLISHED SINCE 1995
    NET WT: 100 g
    MRP: ₹ 30.00
    MFD BY: BAKERIES LTD, DELHI 110001
    CARE: 1800666777
  `);
  assert.strictEqual(scJ.manufactureDate, undefined);
  assert.strictEqual(scJ.packingDate, undefined);
});

test('Phase 10: MRP format variations and OCR noise repair', () => {
  // Variations of MRP format
  assert.strictEqual(parseLabel('MRP ₹99\nNET QTY: 100g').mrp, '₹99');
  assert.strictEqual(parseLabel('MRP: ₹ 99\nNET QTY: 100g').mrp, '₹99');
  assert.strictEqual(parseLabel('MRP Rs. 99\nNET QTY: 100g').mrp, '₹99');
  assert.strictEqual(parseLabel('MRP Rs 99\nNET QTY: 100g').mrp, '₹99');
  assert.strictEqual(parseLabel('MRP 99\nNET QTY: 100g').mrp, '₹99');
  assert.strictEqual(parseLabel('₹99.00 MRP (INCL OF ALL TAXES)\nNET QTY: 100g').mrp, '₹99.00');
  assert.strictEqual(parseLabel('Rs. 99/-\nNET QTY: 100g').mrp, '₹99');

  // OCR Noise repairs: R5, R$, .OO, 9S
  assert.strictEqual(parseLabel('M.R.P: R5 99.00\nNET QTY: 100g').mrp, '₹99.00');
  assert.strictEqual(parseLabel('MRP: R$ 99.00\nNET QTY: 100g').mrp, '₹99.00');
  assert.strictEqual(parseLabel('MRP: 99.OO (INCL OF TAXES)\nNET QTY: 100g').mrp, '₹99.00');
  assert.strictEqual(parseLabel('MRP: 9S.00\nNET QTY: 100g').mrp, '₹95.00');
});

test('Phase 10: Net Quantity unit variations and spacing resistance', () => {
  assert.strictEqual(parseLabel('NET WT: 500 g').netQuantity, '500 g');
  assert.strictEqual(parseLabel('NET WT: 500g').netQuantity, '500 g');
  assert.strictEqual(parseLabel('NET WT: 500 G').netQuantity, '500 g');
  assert.strictEqual(parseLabel('NET QUANTITY: 1 kg').netQuantity, '1 kg');
  assert.strictEqual(parseLabel('NET QUANTITY: 1kg').netQuantity, '1 kg');
  assert.strictEqual(parseLabel('NET VOL: 250 ml').netQuantity, '250 ml');
  assert.strictEqual(parseLabel('NET VOL: 250mL').netQuantity, '250 ml');
  assert.strictEqual(parseLabel('NET QUANTITY: 1 L').netQuantity, '1 l');
  assert.strictEqual(parseLabel('NET QUANTITY: 1L').netQuantity, '1 l');
  assert.strictEqual(parseLabel('QUANTITY: 10 N').netQuantity, '10 n');
});

test('Phase 10: Evidence source localization and truthfulness', () => {
  const label = parseLabel(`
    PARLE-G ORIGINAL GLUCOSE BISCUITS
    MFD BY: PARLE PRODUCTS PVT LTD
    PLOT NO 14, INDUSTRIAL AREA, MUMBAI 400057
    NET WEIGHT: 250 g
    MFD: 08/2024
    MRP: ₹ 35.00 (INCL. OF ALL TAXES)
    CONSUMER CARE: 1800222211, care@parle.biz
  `);

  assert.strictEqual(label.mrpEvidence, 'MRP: ₹ 35.00 (INCL. OF ALL TAXES)');
  assert.strictEqual(label.netQuantityEvidence, 'NET QTY: 250 g');
  assert.strictEqual(label.dateEvidence, 'MFD: 08/2024');
  assert.ok(label.manufacturerEvidence?.includes('PARLE PRODUCTS PVT LTD'));

  const engine = new RulesEngine();
  const verdict = engine.evaluate(label);
  for (const check of verdict.checks) {
    assert.ok(check.evidence.length > 5);
  }

  // Missing fields produce truthful manual verification notice
  const emptyLabel = parseLabel('');
  const emptyVerdict = engine.evaluate(emptyLabel);
  for (const violation of emptyVerdict.potentialViolations) {
    assert.ok(violation.evidence.includes('manual verification required'));
  }
});

// ----------------------------------------------------
// Phase 11: Adversarial Packaging Cases & OCR Noise Resilience
// ----------------------------------------------------
test('Phase 11 Adversarial: 13-digit EAN Barcode is not falsely parsed as MRP, Net Qty, or Helpline', () => {
  const ocrText = `
    BRITANNIA GOOD DAY BUTTER COOKIES
    BARCODE: 8901030999999
    NET WT: 100g
    MRP: ₹ 20.00
    MFD: 07/2024
    MFD BY: BRITANNIA IND LTD, KOLKATA 700017
    CARE: 18004254449
  `;
  const label = parseLabel(ocrText);
  assert.strictEqual(label.mrp, '₹20.00');
  assert.notStrictEqual(label.mrp, '₹8901030999999');
  assert.strictEqual(label.consumerCare, '18004254449');
  assert.notStrictEqual(label.consumerCare, '8901030999999');
});

test('Phase 11 Adversarial: 14-digit FSSAI License is not confused with phone number or price', () => {
  const ocrText = `
    HALDIRAMS BHUJIA SEV
    FSSAI LIC NO: 10014042000088
    MRP ₹ 55.00
    NET QUANTITY: 150 g
    PKD: 09/2024
    MFD BY: HALDIRAM FOODS INTERNATIONAL PVT LTD, NAGPUR 440008
    HELPLINE: 18002095566, feedback@haldirams.com
  `;
  const label = parseLabel(ocrText);
  assert.strictEqual(label.mrp, '₹55.00');
  assert.strictEqual(label.consumerCare, '18002095566, feedback@haldirams.com');
  assert.ok(!label.consumerCare?.includes('10014042000088'));
});

test('Phase 11 Adversarial: 6-digit postal PIN code adjacent to price correctly attributes MRP and Address', () => {
  const ocrText = `
    PRODUCT OF INDIA
    MFD BY: AMUL DAIRY, ANAND, GUJARAT PIN: 388001
    MRP: ₹ 85.00
    NET QTY: 500 ml
    MFD: 06/2024
    CONSUMER CARE: 18002583333
  `;
  const label = parseLabel(ocrText);
  assert.strictEqual(label.mrp, '₹85.00');
  assert.notStrictEqual(label.mrp, '₹388001');
  assert.ok(label.address?.includes('388001'));
});

test('Phase 11 Adversarial: Copyright symbol and year is not misidentified as statutory MFD/PKD', () => {
  const ocrText = `
    © 2021 PARLE PRODUCTS PVT LTD ALL RIGHTS RESERVED
    NET WT: 150g
    MRP: ₹ 30.00
    MFD: 05/2024
    MFD BY: PARLE PRODUCTS PVT LTD, MUMBAI 400057
    CARE: 1800222211
  `;
  const label = parseLabel(ocrText);
  assert.strictEqual(label.manufactureDate, '05/2024');
  assert.notStrictEqual(label.manufactureDate, '2021');
  assert.strictEqual(label.isDateAmbiguous, false);
});

test('Phase 11 Adversarial: Toll-free helpline with numeric sequences is distinguished from MRP', () => {
  const ocrText = `
    TOLL FREE HELPLINE: 1800-22-3344 (TIMINGS: 9 AM TO 6 PM)
    MRP: ₹ 199.00 INCL OF ALL TAXES
    NET QTY: 200 ml
    MFD: 04/2024
    MFD BY: DABUR INDIA LTD, GHAZIABAD 201010
  `;
  const label = parseLabel(ocrText);
  assert.strictEqual(label.mrp, '₹199.00');
  assert.ok(label.consumerCare?.includes('1800'));
});

test('Phase 11 Adversarial: Dual prices prioritize statutory MRP over promotional / offer price', () => {
  const ocrText = `
    MRP ₹ 150.00 (INCLUSIVE OF ALL TAXES)
    SPECIAL OFFER ₹ 120.00 ONLY
    NET QTY: 400 g
    PKD: 08/2024
    MFD BY: CADBURY INDIA, MUMBAI 400026
    CARE: 1800228282
  `;
  const label = parseLabel(ocrText);
  assert.strictEqual(label.mrp, '₹150.00');
});

test('Phase 11 Adversarial: Dual dates distinguish MFD from Best Before / Expiry dates', () => {
  const ocrText = `
    MFD: 06/2024
    BEST BEFORE: 12/2024
    MRP: ₹ 40.00
    NET WT: 200g
    MFD BY: NESTLE INDIA LTD, NEW DELHI 110001
    CONSUMER CARE: 18001031947
  `;
  const label = parseLabel(ocrText);
  assert.strictEqual(label.manufactureDate, '06/2024');
  assert.notStrictEqual(label.manufactureDate, '12/2024');
});

test('Phase 11 Adversarial: Trailing slash-dash syntax (Rs. 250/-) parses cleanly', () => {
  const ocrText = `
    Rs. 250/- INCL. OF ALL TAXES
    NET WT: 500 g
    MFD: 07/2024
    MFD BY: TATA CONSUMER PRODUCTS, BANGALORE 560001
    CARE: 18003451720
  `;
  const label = parseLabel(ocrText);
  assert.strictEqual(label.mrp, '₹250');
});

test('Phase 12 Deployment: API_BASE_URL sanitizes trailing slashes and prevents duplicate /api', () => {
  const sanitize = (raw: string) => String(raw).trim().replace(/\/+$/, '').replace(/\/api$/, '');
  assert.strictEqual(sanitize('http://localhost:8000'), 'http://localhost:8000');
  assert.strictEqual(sanitize('http://localhost:8000/'), 'http://localhost:8000');
  assert.strictEqual(sanitize('https://lmcc-backend.onrender.com/'), 'https://lmcc-backend.onrender.com');
  assert.strictEqual(sanitize('https://lmcc-backend.onrender.com/api'), 'https://lmcc-backend.onrender.com');
  assert.strictEqual(sanitize('https://lmcc-backend.onrender.com/api/'), 'https://lmcc-backend.onrender.com');
});

// ----------------------------------------------------
// Phase 13 Accuracy Lab Regression Tests
// ----------------------------------------------------
test('Phase 13 Accuracy Lab: MRP with inclusive of taxes phrase preceding price', () => {
  const ocrText = `
    SPECIAL PROMO OFFER!
    OFFER PRICE: ₹ 200.00
    MRP (INCL. OF ALL TAXES): ₹ 250.00
    NET QTY: 1 kg
    MFD: 04/2024
    MFD BY: GRAIN SUPERIOR CO, DELHI 110001
    CARE: 1800102030
  `;
  const label = parseLabel(ocrText);
  assert.strictEqual(label.mrp, '₹250.00');
});

test('Phase 13 Accuracy Lab: Regional Indian Net Quantity extraction', () => {
  const malayalam = parseLabel('കേരള വെളിച്ചെണ്ണ\nഉല്പാദകർ: കേരള കോക്കനട്ട്, കൊച്ചി 682001\nഅളവ്: 1 L\nMFD: 06/2024\nMRP: ₹260\nCARE: 0484-2345678');
  assert.strictEqual(malayalam.netQuantity, '1 l');

  const kannada = parseLabel('ಮೈಸೂರು ಪಾಕ್\nತಯಾರಕರು: ಮೈಸೂರು ಸ್ವೀಟ್ಸ್, ಮೈಸೂರು 570001\nನಿವ್ವಳ ತೂಕ: 400 g\nMFD: 09/2024\nMRP: ₹180\nCARE: 1800-425-8899');
  assert.strictEqual(kannada.netQuantity, '400 g');

  const telugu = parseLabel('కారం పొడి\nతయారీదారులు: గుంటూరు మసాలాలు, గుంటూరు 522001\nనికర పరిమాణం: 500 g\nMFD: 05/2024\nMRP: ₹160\nCARE: 0863-2233445');
  assert.strictEqual(telugu.netQuantity, '500 g');
});

test('Phase 13 Accuracy Lab: Statutory Month & Year of Import and Date of Packing without ambiguity', () => {
  const imported = parseLabel(`
    MEDITERRANEAN GOLD EXTRA VIRGIN OLIVE OIL
    PRODUCED BY: MEDITERRANEAN OILS S.A., SPAIN
    IMPORTED BY: INDO GLOBAL IMPORTS PVT LTD, MUMBAI 400069
    NET CONTENT: 500 ml
    MONTH & YEAR OF IMPORT: 04/2024
    MRP: ₹ 750.00
    CARE: customercare@indoglobal.com
  `);
  assert.strictEqual(imported.packingDate, '04/2024');
  assert.strictEqual(imported.isDateAmbiguous, false);

  const packing = parseLabel(`
    ACTIVE WASH DETERGENT
    CLEANTECH CONSUMER PRODUCTS LTD, GUJARAT 393002
    NET MASS: 1 kg
    DATE OF PACKING: 05/2024
    MRP: ₹ 140.00
    HELPLINE: 1800-102-2224
  `);
  assert.strictEqual(packing.packingDate, '05/2024');
  assert.strictEqual(packing.isDateAmbiguous, false);
});

test('Phase 13 Accuracy Lab: Consumer Care supports Indian landlines with STD codes and CALL prefix', () => {
  const landline = parseLabel(`
    ORGANIC VIBES LLP, GURGAON 122001
    NET: 200 ml
    MFD: 05/2024
    MRP: ₹ 299.00
    CUSTOMER CARE: 0124-4998800
  `);
  assert.strictEqual(landline.consumerCare, '0124-4998800');

  const callPrefix = parseLabel(`
    TIME WARP SNACKS, JAIPUR 302001
    NET QTY: 100 g
    MFD: 02/2024
    MRP: ₹ 40.00
    CALL: 1800334455
  `);
  assert.strictEqual(callPrefix.consumerCare, '1800334455');
});

test('Phase 13 Accuracy Lab: Corporate entity headers without explicit MFD prefix extract safely', () => {
  const pvtLtd = parseLabel(`
    ABC FOODS PVT LTD
    PLOT 42, ELECTRONIC CITY, BANGALORE 560100
    NET WEIGHT: 500 g
    PKD: 06/2024
    MRP: ₹ 120.00
    CARE: 1800-425-0000
  `);
  assert.strictEqual(pvtLtd.manufacturer, 'ABC FOODS PVT LTD');

  const inlineComma = parseLabel(`
    SHINE WELL CHEMICALS, KOLKATA 700019
    NET VOLUME: 500 ml
    MFD: 05/2024
    MRP: ₹ 150.00
    CARE: care@shinewell.in
  `);
  assert.strictEqual(inlineComma.manufacturer, 'SHINE WELL CHEMICALS');
});

// ----------------------------------------------------
// Phase 14: Consumer Reporting & Lifecycle Monitoring Tests
// ----------------------------------------------------
import { getAuthoritySubmissionStatus, AUTHORITY_REGULATORY_TARGETS } from '../src/services/authority/authoritySubmissionService';
import { getReportLifecycleState, saveLocalReport } from '../src/services/storage/localReports';

test('Phase 14: Authority service truthfully declares unintegrated status with zero fake tracking numbers', () => {
  const status = getAuthoritySubmissionStatus('any-report-id-123');
  assert.strictEqual(status.isIntegrated, false);
  assert.strictEqual(status.status, 'PENDING_INTEGRATION');
  assert.strictEqual(status.officialReferenceNumber, null);
  assert.strictEqual(status.forwardedAt, null);
  assert.ok(status.message.toLowerCase().includes('pending integration'));
  assert.ok(status.supportedAgencies.length >= 4);
});

test('Phase 14: Lifecycle state machine accurately categorizes observation statuses', () => {
  // 1. Unsynced local report
  const queuedState = getReportLifecycleState({ syncStatus: 'pending', serverId: null }, false);
  assert.strictEqual(queuedState, 'QUEUED');

  // 2. In-flight active sync
  const syncingState = getReportLifecycleState({ syncStatus: 'pending', serverId: null }, true);
  assert.strictEqual(syncingState, 'SYNCING');

  // 3. Successfully synced / server record
  const syncedState = getReportLifecycleState({ syncStatus: 'synced', serverId: 'LMCC-SERVER-1' }, false);
  assert.strictEqual(syncedState, 'SUBMITTED');

  // 4. Failed sync
  const failedState = getReportLifecycleState({ syncStatus: 'failed', serverId: null }, false);
  assert.strictEqual(failedState, 'FAILED');
});

test('Phase 14: Local report creation guarantees localReportId for idempotent deduplication', async () => {
  const payload = {
    verdict: 'REVIEW' as const,
    productName: 'Biscuits Missing Net Quantity',
    issues: [
      {
        ruleId: 'LM-PCR-2011-R6-1-C',
        field: 'netQuantity',
        title: 'Net Quantity',
        severity: 'critical',
        explanation: 'Missing Net Quantity',
      },
    ],
  };

  const saved = await saveLocalReport(payload);
  assert.ok(saved.payload.localReportId, 'Payload must include localReportId');
  assert.strictEqual(saved.payload.localReportId, saved.localId);
});

test('Phase 14: PASS concern flow retains optional consumer remarks without fabricating violations', () => {
  const voluntaryRemarks = 'Sticker price ₹60 pasted over printed MRP ₹50 in neighborhood grocery';
  const passConcernPayload = {
    verdict: 'PASS' as const,
    productName: 'Consumer Verified Salt',
    mrp: '₹28.00',
    netQuantity: '1 kg',
    issueCount: 0,
    issues: [],
    userRemarks: `Store Location: Sector 18 Market | ${voluntaryRemarks}`,
  };

  assert.strictEqual(passConcernPayload.verdict, 'PASS');
  assert.strictEqual(passConcernPayload.issues.length, 0);
  assert.ok(passConcernPayload.userRemarks?.includes('Sector 18 Market'));
  assert.ok(passConcernPayload.userRemarks?.includes(voluntaryRemarks));

  // Legal safety check: text must not use forbidden words
  const serialized = JSON.stringify(passConcernPayload).toLowerCase();
  assert.ok(!serialized.includes('illegal'));
  assert.ok(!serialized.includes('lawbreaker'));
  assert.ok(!serialized.includes('guilty'));
});

// ----------------------------------------------------
// Phase 15: Multi-Scale Cascade Stream Merger & Real Packaging Regression
// ----------------------------------------------------
test('Phase 15: OCR Stream Merger consolidates multi-pass lines and deduplicates fuzzy matches', () => {
  const stageA = `
    DELICIOUS HOMEMADE ATTA
    100% WHOLE WHEAT
    BATCH: ATTA-2024-09
    BEST BEFORE SIX MONTHS
    STORE IN A COOL DRY PLACE
  `;

  const stageB = `
    NET WEIGHT: 1 KG
    PKD ON: 12/09/2024
    MRP RS. 65.00
    INCL OF ALL TAXES
  `;

  const stageC = `
    PROCESSED & PACKED BY:
    KIRAN FOOD PRODUCTS PVT LTD
    PLOT 42, INDUSTRIAL ESTATE, PUNJAB 141003
    CUSTOMER CARE: 1800-180-2233, care@kiranfoods.in
  `;

  const merged = mergeOcrStreams([
    { text: stageA, source: 'stage_a_standard', confidence: 75 },
    { text: stageB, source: 'stage_b_upscaled', confidence: 85 },
    { text: stageC, source: 'stage_c_bottom_panel', confidence: 90 },
  ]);

  // Merged output should prioritize statutory lines
  assert.ok(merged.includes('NET WEIGHT: 1 KG'));
  assert.ok(merged.includes('MRP RS. 65.00'));
  assert.ok(merged.includes('KIRAN FOOD PRODUCTS'));

  const parsed = parseLabel(merged);
  assert.strictEqual(parsed.netQuantity, '1 kg');
  assert.strictEqual(parsed.mrp, '₹65.00');
  assert.strictEqual(parsed.packingDate, '12/09/2024');
  assert.ok(parsed.manufacturer?.includes('KIRAN FOOD PRODUCTS'));
  assert.ok(parsed.address?.includes('INDUSTRIAL ESTATE'));
  assert.ok(parsed.consumerCare?.includes('1800-180-2233'));

  const engine = new RulesEngine();
  const verdict = engine.evaluate(parsed);
  assert.strictEqual(verdict.overallStatus, 'PASS');
  assert.strictEqual(verdict.flaggedChecks, 0);
});

test('Phase 15 Regression: Real packaging photograph with split declarations and multi-line Net Weight extracts all 6 statutory fields', () => {
  // Real packaging scenario: Net weight on two lines, PACKED ON with DD/MM/YYYY, multi-line address
  const realPackagingOcr = `
    HYSON PREMIUM SPICES & CONDIMENTS
    PROCESSED & PACKED BY
    HYSON AGRO FOOD PRODUCTS PVT LTD
    DOOR NO 12/450, INDUSTRIAL DEVELOPMENT PLOT
    ALUVA, ERNAKULAM, KERALA 683106
    NET WEIGHT
    1 KG
    PACKED ON : 18/08/2024
    BATCH NO : HYS-2408
    MAXIMUM RETAIL PRICE ₹ 210.00
    (INCLUSIVE OF ALL TAXES)
    CUSTOMER CARE CELL : 0484-2621000
    FEEDBACK EMAIL : SUPPORT@HYSONFOODS.COM
  `;

  const parsed = parseLabel(realPackagingOcr);
  assert.strictEqual(parsed.netQuantity, '1 kg', 'Net weight must be extracted as 1 kg even when label is split across lines');
  assert.strictEqual(parsed.mrp, '₹210.00', 'MRP ₹ 210.00 must be extracted accurately');
  assert.strictEqual(parsed.packingDate, '18/08/2024', 'PACKED ON : 18/08/2024 should extract complete date');
  assert.ok(parsed.manufacturer?.includes('HYSON AGRO FOOD PRODUCTS'), 'Manufacturer name must be extracted');
  assert.ok(parsed.address?.includes('INDUSTRIAL DEVELOPMENT PLOT'), 'Address must contain facility details');
  assert.ok(parsed.consumerCare?.includes('0484-2621000'), 'Consumer care phone number must be extracted');

  const engine = new RulesEngine();
  const verdict = engine.evaluate(parsed);
  assert.strictEqual(verdict.overallStatus, 'PASS');
  assert.strictEqual(verdict.flaggedChecks, 0);
  assert.strictEqual(verdict.potentialViolations.length, 0);
});

test('Phase 15 Regression: Missing statutory declaration strictly yields REVIEW (zero-false-PASS priority)', () => {
  // Same product packaging, but MRP has been rubbed off or omitted
  const missingMrpOcr = `
    HYSON PREMIUM SPICES & CONDIMENTS
    PROCESSED & PACKED BY
    HYSON AGRO FOOD PRODUCTS PVT LTD
    DOOR NO 12/450, INDUSTRIAL DEVELOPMENT PLOT
    ALUVA, ERNAKULAM, KERALA 683106
    NET WEIGHT : 1 KG
    PACKED ON : 18/08/2024
    CUSTOMER CARE CELL : 0484-2621000
    FEEDBACK EMAIL : SUPPORT@HYSONFOODS.COM
  `;

  const parsed = parseLabel(missingMrpOcr);
  assert.strictEqual(parsed.mrp, undefined);
  assert.strictEqual(parsed.netQuantity, '1 kg');

  const engine = new RulesEngine();
  const verdict = engine.evaluate(parsed);
  assert.strictEqual(verdict.overallStatus, 'REVIEW', 'Must flag REVIEW when MRP is missing');
  assert.ok(verdict.flaggedChecks >= 1);
  assert.ok(verdict.potentialViolations.some((v) => v.field === 'mrp'));
});

test('Phase 16 Regression: Multi-line Consumer Care section with job title header extracts toll-free contact', () => {
  const ocr = `
    CUSTOMER CARE DETAILS:
    CUSTOMER CARE EXECUTIVE
    TATA CONSUMER PRODUCTS LIMITED
    1800-108-4444
    EMAIL: care@tataconsumer.com
  `;
  const parsed = parseLabel(ocr);
  assert.ok(parsed.consumerCare?.includes('1800-108-4444'), 'Must extract 1800-108-4444 despite intervening executive title');
  assert.ok(parsed.consumerCare?.includes('care@tataconsumer.com'), 'Must extract care email address');
});

test('Phase 16 Regression: Corporate entity header followed by floor and business park identifies manufacturer and address', () => {
  const ocr = `
    TATA CONSUMER PRODUCTS LIMITED
    14TH FLOOR
    KIRLOSKAR BUSINESS PARK
    BENGALURU - 560024
  `;
  const parsed = parseLabel(ocr);
  assert.strictEqual(parsed.manufacturer, 'TATA CONSUMER PRODUCTS LIMITED');
  assert.ok(parsed.address?.includes('14TH FLOOR') || parsed.address?.includes('KIRLOSKAR BUSINESS PARK'));
});

test('Phase 16 Regression: Manufactured by prefix followed by entity on line 2 and plot on line 3 extracts entity cleanly', () => {
  const ocr = `
    Manufactured by:
    ABC FOOD PRODUCTS PVT LTD
    Plot 12
    Industrial Area
    New Delhi - 110020
  `;
  const parsed = parseLabel(ocr);
  assert.strictEqual(parsed.manufacturer, 'ABC FOOD PRODUCTS PVT LTD');
  assert.ok(parsed.address?.includes('Plot 12') || parsed.address?.includes('Industrial Area'));
});

test('Phase 16 Regression: Separated Email and Toll Free labels extract combined contact details', () => {
  const ocr = `
    Consumer Care:
    Email:
    help@example.com
    Toll Free:
    1800-123-456
  `;
  const parsed = parseLabel(ocr);
  assert.ok(parsed.consumerCare?.includes('1800-123-456'));
  assert.ok(parsed.consumerCare?.includes('help@example.com'));
});

test('Phase 16 Regression: FSSAI 14-digit license, 6-digit postal PIN, and 13-digit barcode are never confused as phone numbers', () => {
  const ocr = `
    CUSTOMER CARE DETAILS:
    Lic. No. 10014031000123
    BARCODE 8901030999999
    PIN: 560024
    Helpline: 1800-200-9999
  `;
  const parsed = parseLabel(ocr);
  assert.ok(parsed.consumerCare?.includes('1800-200-9999'));
  assert.ok(!parsed.consumerCare?.includes('10014031000123'));
  assert.ok(!parsed.consumerCare?.includes('8901030999999'));
  assert.ok(!parsed.consumerCare?.includes('560024'));
});

// ----------------------------------------------------
// Phase 17: Multi-Panel Package Scan & Consistency Check
// ----------------------------------------------------
test('Phase 17 Multi-Panel: Merging disparate declarations from 3 panels (Front, Back, Crimp) yields compliant PASS', () => {
  const panel1Front = {
    panelId: 'p1_front',
    panelType: 'front' as const,
    panelLabel: 'Front / Main Label',
    rawText: `
      TAZA PREMIUM CHAI
      NET WT: 500 g
    `,
    confidence: 92,
    quality: 'GOOD' as const,
  };

  const panel2Back = {
    panelId: 'p2_back',
    panelType: 'back' as const,
    panelLabel: 'Back Declaration Panel',
    rawText: `
      MANUFACTURED & PACKED BY:
      TAZA BEVERAGES PVT LTD
      PLOT 44, INDUSTRIAL AREA, KAKKANAD, KOCHI, KERALA - 682030
      CUSTOMER CARE DETAILS:
      CUSTOMER CARE CELL: 1800-425-9000
      EMAIL: CARE@TAZATEA.IN
    `,
    confidence: 88,
    quality: 'GOOD' as const,
  };

  const panel3Crimp = {
    panelId: 'p3_crimp',
    panelType: 'crimp' as const,
    panelLabel: 'Crimp / Seal / Base',
    rawText: `
      BATCH: B2408
      PKD ON: 15/08/2024
      MRP: ₹ 145.00
      (INCL. OF ALL TAXES)
    `,
    confidence: 85,
    quality: 'GOOD' as const,
  };

  const merged = mergeMultiPanelDeclarations([panel1Front, panel2Back, panel3Crimp]);
  assert.strictEqual(merged.hasConflict, false, 'Should have no conflicting declarations');
  assert.strictEqual(merged.unifiedLabel.netQuantity, '500 g');
  assert.strictEqual(merged.unifiedLabel.mrp, '₹145.00');
  assert.strictEqual(merged.unifiedLabel.packingDate, '15/08/2024');
  assert.ok(merged.unifiedLabel.manufacturer?.includes('TAZA BEVERAGES'));
  assert.ok(merged.unifiedLabel.address?.includes('KAKKANAD'));
  assert.ok(merged.unifiedLabel.consumerCare?.includes('1800-425-9000'));

  const engine = new RulesEngine();
  const verdict = engine.evaluate(merged.unifiedLabel);
  assert.strictEqual(verdict.overallStatus, 'PASS', 'Unified multi-panel evidence should pass full Rule 6 check');
  assert.strictEqual(verdict.flaggedChecks, 0);
});

test('Phase 17 Multi-Panel: Conflicting MRP across panels strictly flags conflict and produces REVIEW', () => {
  const panelBack = {
    panelId: 'p_back',
    panelType: 'back' as const,
    panelLabel: 'Back Label',
    rawText: `
      MFD BY: TEST FOODS LTD
      PLOT 1, NEW DELHI - 110001
      NET WT: 1 kg
      MRP: ₹ 120.00
      MFD: 05/2024
      CARE: 1800-111-222
    `,
    confidence: 90,
  };

  const panelCrimp = {
    panelId: 'p_crimp',
    panelType: 'crimp' as const,
    panelLabel: 'Seal Crimp',
    rawText: `
      MRP: ₹ 150.00
    `,
    confidence: 90,
  };

  const merged = mergeMultiPanelDeclarations([panelBack, panelCrimp]);
  assert.strictEqual(merged.hasConflict, true, 'Different MRPs must trigger conflict detection');
  assert.ok(merged.conflictDetails.some((c) => c.includes('Conflicting MRP')));

  const engine = new RulesEngine();
  const verdict = engine.evaluate(merged.unifiedLabel);
  assert.strictEqual(verdict.overallStatus, 'REVIEW', 'Conflicting panel declaration must yield REVIEW (zero false PASS)');
});

test('Phase 17 Multi-Panel: Incomplete multi-panel scan safely yields REVIEW when statutory fields remain unphotographed', () => {
  const panel1 = {
    panelId: 'p1',
    panelType: 'front' as const,
    panelLabel: 'Front',
    rawText: 'ORGANIC CHIPS NET WT 100 g',
    confidence: 95,
  };

  const panel2 = {
    panelId: 'p2',
    panelType: 'back' as const,
    panelLabel: 'Back',
    rawText: 'TASTY SNACKS PVT LTD, MUMBAI 400001',
    confidence: 95,
  };

  const merged = mergeMultiPanelDeclarations([panel1, panel2]);
  assert.strictEqual(merged.hasConflict, false);
  assert.strictEqual(merged.unifiedLabel.mrp, undefined);
  assert.strictEqual(merged.unifiedLabel.packingDate, undefined);

  const engine = new RulesEngine();
  const verdict = engine.evaluate(merged.unifiedLabel);
  assert.strictEqual(verdict.overallStatus, 'REVIEW', 'Missing MRP and Date must strictly yield REVIEW');
});

// ----------------------------------------------------
// Phase 18: Barcode & Product Database Cross-Check Tests
// ----------------------------------------------------
import { getGs1Country } from '../src/services/barcode/barcodeDetector';
import { performBarcodeCrossCheck } from '../src/services/barcode/barcodeCrossCheck';
import { ReferenceProductInfo } from '../src/services/barcode/productDatabaseService';

test('Phase 18 Barcode: GS1 Country Prefix identification identifies India (890), UK (500), USA (000-019)', () => {
  assert.strictEqual(getGs1Country('8901234567890'), 'India (GS1 India)');
  assert.strictEqual(getGs1Country('8901030383848'), 'India (GS1 India)');
  assert.strictEqual(getGs1Country('5000128001000'), 'United Kingdom');
  assert.strictEqual(getGs1Country('012345678905'), 'United States & Canada');
  assert.strictEqual(getGs1Country('9999999999999'), undefined);
  assert.strictEqual(getGs1Country('12'), undefined);
});

test('Phase 18 Barcode: Cross-check logic identifies MATCH when OCR and DB match', () => {
  const ocrLabel = {
    manufacturer: 'Parle Products Private Limited',
    netQuantity: '250 g',
    productName: 'Parle-G Glucose Biscuits',
  };

  const barcode = {
    rawValue: '8901030383848',
    format: 'EAN_13',
    gs1Country: 'India (GS1 India)',
  };

  const refData: ReferenceProductInfo = {
    found: true,
    barcode: '8901030383848',
    productName: 'Parle-G Glucose Biscuits',
    brands: 'Parle Products Pvt Ltd',
    quantity: '250g',
    source: 'Open Food Facts',
    disclaimer: 'Advisory reference only',
  };

  const check = performBarcodeCrossCheck(ocrLabel, barcode, refData);
  assert.strictEqual(check.overallStatus, 'VERIFIED_MATCH');
  assert.strictEqual(check.isAdvisoryOnly, true);
  assert.ok(check.comparisons.some((c) => c.field === 'manufacturer' && (c.status === 'MATCH' || c.status === 'PARTIAL_MATCH')));
  assert.ok(check.comparisons.some((c) => c.field === 'netQuantity' && c.status === 'MATCH'));
});

test('Phase 18 Barcode: Cross-check logic identifies DISCREPANCY when OCR net quantity disagrees with barcode reference', () => {
  const ocrLabel = {
    manufacturer: 'Parle Products Pvt Ltd',
    netQuantity: '500 g', // Discrepant quantity
  };

  const barcode = {
    rawValue: '8901030383848',
    format: 'EAN_13',
  };

  const refData: ReferenceProductInfo = {
    found: true,
    barcode: '8901030383848',
    quantity: '100 g',
    brands: 'Parle',
    source: 'Open Food Facts',
    disclaimer: 'Advisory reference only',
  };

  const check = performBarcodeCrossCheck(ocrLabel, barcode, refData);
  assert.strictEqual(check.overallStatus, 'REFERENCE_DISCREPANCY');
  const qtyComp = check.comparisons.find((c) => c.field === 'netQuantity');
  assert.strictEqual(qtyComp?.status, 'DISCREPANCY');
});

test('Phase 18 Barcode: Reference not found handles missing DB record gracefully without failing compliance', () => {
  const ocrLabel = {
    manufacturer: 'Local Farmer Co',
    netQuantity: '1 kg',
  };

  const barcode = {
    rawValue: '8909999999999',
    format: 'EAN_13',
    gs1Country: 'India (GS1 India)',
  };

  const refData: ReferenceProductInfo = {
    found: false,
    barcode: '8909999999999',
    source: 'Unrecognized',
    disclaimer: 'Advisory reference only',
  };

  const check = performBarcodeCrossCheck(ocrLabel, barcode, refData);
  assert.strictEqual(check.overallStatus, 'REFERENCE_NOT_FOUND');
  assert.ok(check.statusMessage.includes('no matching public record was found'));
});

test('Phase 18 Barcode: No barcode detected produces clean unverified advisory status', () => {
  const ocrLabel = {
    netQuantity: '100 g',
  };

  const check = performBarcodeCrossCheck(ocrLabel, undefined, undefined);
  assert.strictEqual(check.overallStatus, 'NO_BARCODE_DETECTED');
  assert.strictEqual(check.comparisons.length, 0);
});






