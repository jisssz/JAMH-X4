import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_REPORT = path.resolve(__dirname, '../evaluation/reports/final_blind_acceptance_report.json');

function waitForServer(url: string, timeoutMs = 20000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error(`Timeout waiting for server at ${url}`));
        return;
      }
      http
        .get(url, (res) => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
            clearInterval(interval);
            resolve();
          }
        })
        .on('error', () => {});
    }, 250);
  });
}

export interface GroundTruthField {
  visible: boolean;
  value?: string;
  matchPattern?: RegExp;
}

export interface AcceptanceProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  photos: string[];
  groundTruth: {
    mrp: GroundTruthField;
    netQuantity: GroundTruthField;
    manufacturer: GroundTruthField;
    address: GroundTruthField;
    date: GroundTruthField;
    consumerCare: GroundTruthField;
    barcode: GroundTruthField;
  };
  expectedVerdict: 'PASS' | 'REVIEW'; // Under Rule 6, if any mandatory declaration is not visible or obscured, verdict must be REVIEW
}

export const ACCEPTANCE_DATASET: AcceptanceProduct[] = [
  {
    id: 'prod_01',
    name: 'Britannia Good Day Butter Cookies',
    brand: 'Britannia',
    category: 'Biscuits',
    photos: [
      'fixtures/complete_declaration_challenge/goodday_back.jpg',
      'fixtures/complete_declaration_challenge/goodday_back_full.jpg'
    ],
    groundTruth: {
      mrp: { visible: true, value: '10', matchPattern: /10/ },
      netQuantity: { visible: true, value: '58 g', matchPattern: /58\s*g/i },
      manufacturer: { visible: true, value: 'Britannia Industries Ltd', matchPattern: /BRITANNIA/i },
      address: { visible: true, value: 'Kolkata 700017 / Bengaluru 560048', matchPattern: /700017|560048|Kolkata|Bengaluru/i },
      date: { visible: true, value: '05/2024', matchPattern: /05\/2024|2024/ },
      consumerCare: { visible: true, value: '1800 4254449', matchPattern: /1800|4254449/ },
      barcode: { visible: true, value: '8901063012722', matchPattern: /8901063012722/ }
    },
    expectedVerdict: 'PASS'
  },
  {
    id: 'prod_02',
    name: "Lay's India's Magic Masala Potato Chips",
    brand: "Lay's / PepsiCo",
    category: 'Snacks & Confectionery',
    photos: [
      'fixtures/complete_declaration_challenge/lays_back.jpg',
      'fixtures/complete_declaration_challenge/lays_back_full.jpg'
    ],
    groundTruth: {
      mrp: { visible: true, value: '20', matchPattern: /20/ },
      netQuantity: { visible: true, value: '50 g', matchPattern: /50\s*g/i },
      manufacturer: { visible: true, value: 'PepsiCo India Holdings Pvt Ltd', matchPattern: /PEPSICO/i },
      address: { visible: true, value: 'Patiala 147001 / Gurugram', matchPattern: /147001|Patiala|Gurugram/i },
      date: { visible: true, value: '07/2024', matchPattern: /07\/2024|2024/ },
      consumerCare: { visible: true, value: '1800 224020', matchPattern: /1800\s*224020/ },
      barcode: { visible: true, value: '8901491101837', matchPattern: /8901491101837/ }
    },
    expectedVerdict: 'PASS'
  },
  {
    id: 'prod_03',
    name: 'Britannia Marie Gold Biscuits',
    brand: 'Britannia',
    category: 'Biscuits',
    photos: [
      'fixtures/complete_declaration_challenge/marie_gold_back.jpg',
      'fixtures/complete_declaration_challenge/marie_gold_back_full.jpg'
    ],
    groundTruth: {
      mrp: { visible: true, value: '15', matchPattern: /15/ },
      netQuantity: { visible: true, value: '89 g', matchPattern: /89\s*g/i },
      manufacturer: { visible: true, value: 'Britannia Industries Ltd', matchPattern: /BRITANNIA/i },
      address: { visible: true, value: 'Kolkata 700017', matchPattern: /700017|Kolkata/i },
      date: { visible: true, value: '06/2024', matchPattern: /06\/2024|2024/ },
      consumerCare: { visible: true, value: '1800 4254449', matchPattern: /1800|4254449/ },
      barcode: { visible: true, value: '8901063024824', matchPattern: /8901063024824/ }
    },
    expectedVerdict: 'PASS'
  },
  {
    id: 'prod_04',
    name: 'Sting Energy Beverage Drink',
    brand: 'PepsiCo',
    category: 'Beverages',
    photos: [
      'fixtures/complete_declaration_challenge/sting_label.jpg',
      'fixtures/complete_declaration_challenge/sting_label_full.jpg'
    ],
    groundTruth: {
      mrp: { visible: true, value: '20', matchPattern: /20/ },
      netQuantity: { visible: true, value: '250 ml', matchPattern: /250\s*ml/i },
      manufacturer: { visible: true, value: 'PepsiCo India Holdings Pvt Ltd', matchPattern: /PEPSICO/i },
      address: { visible: true, value: 'Gurugram Haryana 122002', matchPattern: /122002|Gurugram/i },
      date: { visible: true, value: '08/2024', matchPattern: /08\/2024|2024/ },
      consumerCare: { visible: true, value: '1800 224020', matchPattern: /1800\s*224020/ },
      barcode: { visible: true, value: '8901491102926', matchPattern: /8901491102926/ }
    },
    expectedVerdict: 'PASS'
  },
  {
    id: 'prod_05',
    name: 'Thums Up Charged Carbonated Drink',
    brand: 'Coca-Cola',
    category: 'Beverages',
    photos: [
      'fixtures/complete_declaration_challenge/thumsup_label.jpg',
      'fixtures/complete_declaration_challenge/thumsup_label_full.jpg'
    ],
    groundTruth: {
      mrp: { visible: true, value: '40', matchPattern: /40/ },
      netQuantity: { visible: true, value: '250 ml', matchPattern: /250\s*ml/i },
      manufacturer: { visible: true, value: 'Hindustan Coca-Cola Beverages Pvt Ltd', matchPattern: /COCA[- ]COLA/i },
      address: { visible: true, value: 'Bidadi Ramanagara 562109', matchPattern: /562109|Bidadi|Bengaluru/i },
      date: { visible: true, value: '07/2024', matchPattern: /07\/2024|2024/ },
      consumerCare: { visible: true, value: '1800 2082653', matchPattern: /1800\s*2082653|coca-cola/i },
      barcode: { visible: true, value: '8901764012232', matchPattern: /8901764012232/ }
    },
    expectedVerdict: 'PASS'
  },
  {
    id: 'prod_06',
    name: 'Tata Gemini Tea + Tata Salt Packaging',
    brand: 'Tata Consumer Products',
    category: 'Packaged Foods & Staples',
    photos: [
      'fixtures/genuine_real_photos/real_04_tata_tea_gemini.jpg',
      'fixtures/genuine_real_photos/real_13_tata_salt_care_address.jpg'
    ],
    groundTruth: {
      mrp: { visible: false },
      netQuantity: { visible: true, value: '250 g', matchPattern: /250\s*g/i },
      manufacturer: { visible: true, value: 'Tata Consumer Products Ltd', matchPattern: /TATA/i },
      address: { visible: true, value: 'Bellary Road Hebbal Bengaluru 560024', matchPattern: /560024|Hebbal|Bengaluru/i },
      date: { visible: false },
      consumerCare: { visible: true, value: '1800 3451720', matchPattern: /1800|care@tataconsumer/i },
      barcode: { visible: false }
    },
    expectedVerdict: 'REVIEW' // MRP and Date not printed on these panel photos -> MUST BE REVIEW
  },
  {
    id: 'prod_07',
    name: 'MDH Garam Masala & Biryani Masala',
    brand: 'MDH',
    category: 'Spices',
    photos: [
      'fixtures/genuine_real_photos/real_01_mdh_garam_masala.jpg',
      'fixtures/genuine_real_photos/real_15_mdh_biryani_masala.jpg'
    ],
    groundTruth: {
      mrp: { visible: false },
      netQuantity: { visible: true, value: '100 g', matchPattern: /100\s*g/i },
      manufacturer: { visible: true, value: 'Mahashian Di Hatti Pvt Ltd (MDH)', matchPattern: /HATTI|MDH/i },
      address: { visible: true, value: 'Kirti Nagar New Delhi 110015', matchPattern: /110015|Kirti Nagar|Delhi/i },
      date: { visible: false },
      consumerCare: { visible: false },
      barcode: { visible: false }
    },
    expectedVerdict: 'REVIEW' // Missing MRP and dates on rear declaration panel -> MUST BE REVIEW
  },
  {
    id: 'prod_08',
    name: 'Amul Masti Spiced Buttermilk & Amul Taaza Milk',
    brand: 'Amul',
    category: 'Beverages & Dairy',
    photos: [
      'fixtures/genuine_real_photos/real_02_amul_buttermilk.jpg',
      'fixtures/genuine_real_photos/real_14_amul_taaza_milk.jpg'
    ],
    groundTruth: {
      mrp: { visible: false },
      netQuantity: { visible: true, value: '200 ml / 500 ml', matchPattern: /200\s*ml|500\s*ml/i },
      manufacturer: { visible: true, value: 'GCMMF / Amul Dairy', matchPattern: /AMUL|GCMMF|GUJARAT/i },
      address: { visible: true, value: 'Anand 388001 Gujarat', matchPattern: /388001|Anand|Gujarat/i },
      date: { visible: false },
      consumerCare: { visible: false },
      barcode: { visible: false }
    },
    expectedVerdict: 'REVIEW' // Fresh dairy without printed MRP/date on carton body -> MUST BE REVIEW
  },
  {
    id: 'prod_09',
    name: 'Saffola Masala Oats Fine Print',
    brand: 'Marico',
    category: 'Packaged Foods & Staples',
    photos: [
      'fixtures/genuine_real_photos/real_03_saffola_masala_oats.jpg'
    ],
    groundTruth: {
      mrp: { visible: false },
      netQuantity: { visible: true, value: '38 g', matchPattern: /38\s*g/i },
      manufacturer: { visible: true, value: 'Marico Limited', matchPattern: /MARICO/i },
      address: { visible: true, value: '175 CST Road Kalina Santacruz Mumbai 400098', matchPattern: /400098|Santacruz|Kalina/i },
      date: { visible: false },
      consumerCare: { visible: true, value: '1800 222248', matchPattern: /1800|ccc@marico/i },
      barcode: { visible: false }
    },
    expectedVerdict: 'REVIEW' // Single back panel without stamped crimp MRP -> MUST BE REVIEW
  },
  {
    id: 'prod_10',
    name: 'Hyson Spices 1 KG (Complete Packaging Declaration)',
    brand: 'Hyson Agro',
    category: 'Packaged Foods & Staples',
    photos: [
      'fixtures/complete_declaration_challenge/challenge_11_original_failure_1kg.png'
    ],
    groundTruth: {
      mrp: { visible: true, value: '210', matchPattern: /210/ },
      netQuantity: { visible: true, value: '1 kg', matchPattern: /1\s*kg/i },
      manufacturer: { visible: true, value: 'Hyson Agro Food Products Pvt Ltd', matchPattern: /HYSON/i },
      address: { visible: true, value: 'Bank Road Aluva Kerala 683101', matchPattern: /683101|Aluva|Kerala/i },
      date: { visible: true, value: '18/08/2024', matchPattern: /18\/08\/2024|08\/2024/ },
      consumerCare: { visible: true, value: '0484-2621000', matchPattern: /0484|2621000/ },
      barcode: { visible: true, value: '8906012450012', matchPattern: /8906012450012/ }
    },
    expectedVerdict: 'PASS'
  }
];

async function runBlindAcceptance() {
  console.log('================================================================');
  console.log('      LMCC FINAL BLIND REAL-PRODUCT ACCEPTANCE TEST');
  console.log('      10 Real Indian Packaged Products | Browser End-to-End');
  console.log('================================================================\n');

  let backendProc: ChildProcess | null = null;
  let previewProc: ChildProcess | null = null;
  let browser: puppeteer.Browser | null = null;

  try {
    // 1. Launch FastAPI Backend on port 8000
    console.log('[1/3] Launching FastAPI backend...');
    const backendCwd = path.resolve(__dirname, '../../lmcc-backend');
    backendProc = spawn(
      path.resolve(backendCwd, '.venv/bin/uvicorn'),
      ['app.main:app', '--host', '127.0.0.1', '--port', '8000'],
      { cwd: backendCwd, stdio: 'pipe' }
    );
    await waitForServer('http://127.0.0.1:8000/api/health');
    console.log('✔ Backend healthy on http://127.0.0.1:8000\n');

    // 2. Launch Vite Preview Server on port 4173
    console.log('[2/3] Launching Vite preview server...');
    previewProc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'pipe',
    });
    await waitForServer(BASE_URL);
    console.log(`✔ Preview server responsive on ${BASE_URL}\n`);

    // 3. Launch Headless Google Chrome
    console.log('[3/3] Launching Headless Google Chrome...');
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900'],
    });
    const version = await browser.version();
    console.log(`✔ Chrome instance: ${version}\n`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    const resultsSummary: any[] = [];
    let totalVisibleFields = 0;
    let totalCorrectlyExtracted = 0;
    let falsePassCount = 0;
    let falseReviewCount = 0;
    let totalProcessingTimeMs = 0;

    const fieldBreakdown: Record<string, { totalVisible: number; extractedCorrectly: number; ocrFails: number; parserFails: number }> = {
      mrp: { totalVisible: 0, extractedCorrectly: 0, ocrFails: 0, parserFails: 0 },
      netQuantity: { totalVisible: 0, extractedCorrectly: 0, ocrFails: 0, parserFails: 0 },
      manufacturer: { totalVisible: 0, extractedCorrectly: 0, ocrFails: 0, parserFails: 0 },
      address: { totalVisible: 0, extractedCorrectly: 0, ocrFails: 0, parserFails: 0 },
      date: { totalVisible: 0, extractedCorrectly: 0, ocrFails: 0, parserFails: 0 },
      consumerCare: { totalVisible: 0, extractedCorrectly: 0, ocrFails: 0, parserFails: 0 },
      barcode: { totalVisible: 0, extractedCorrectly: 0, ocrFails: 0, parserFails: 0 },
    };

    console.log('────────────────────────────────────────────────────────────────');
    console.log('BEGINNING BLIND REAL-PRODUCT SCANNING SESSIONS (10 PRODUCTS)');
    console.log('────────────────────────────────────────────────────────────────\n');

    for (let idx = 0; idx < ACCEPTANCE_DATASET.length; idx++) {
      const prod = ACCEPTANCE_DATASET[idx];
      console.log(`[${idx + 1}/10] Testing: ${prod.name} (${prod.brand})`);
      console.log(`       Category: ${prod.category} | Panels: ${prod.photos.length}`);

      const tStart = Date.now();
      await page.goto(`${BASE_URL}/scan?mode=upload`, { waitUntil: 'networkidle0' });

      // Dismiss intro screen if present
      await page.keyboard.press('Escape');

      // Upload all photos belonging to this package
      for (let pIdx = 0; pIdx < prod.photos.length; pIdx++) {
        const photoRel = prod.photos[pIdx];
        const photoPath = path.resolve(__dirname, photoRel);

        const fileInput = await page.$('input[type="file"]');
        if (!fileInput) throw new Error(`File input not found for ${prod.name} panel ${pIdx + 1}`);
        await fileInput.uploadFile(photoPath);

        // Wait for "Use This Image" confirm button
        await page.waitForFunction(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          return btns.some((b) => b.textContent?.includes('Use This Image'));
        }, { timeout: 10000 });

        // Click "Use This Image"
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const useBtn = btns.find((b) => b.textContent?.includes('Use This Image'));
          if (useBtn) useBtn.click();
        });

        // Small pause between panel stagings
        await new Promise((r) => setTimeout(r, 400));
      }

      // Verify Staging Tray count
      await page.waitForFunction((expectedCount) => {
        const text = document.body.innerText;
        return text.includes(`${expectedCount} / 5 panels staged`) || expectedCount === 1;
      }, { timeout: 8000 }, prod.photos.length);

      // Click "Analyze Complete Package"
      await page.waitForFunction(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.some((b) => b.textContent?.includes('ANALYZE COMPLETE PACKAGE'));
      }, { timeout: 6000 });

      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const analyzeBtn = btns.find((b) => b.textContent?.includes('ANALYZE COMPLETE PACKAGE'));
        if (analyzeBtn) analyzeBtn.click();
      });

      // Wait for OCR pipeline completion and navigation to /results
      await page.waitForFunction(() => {
        const p = window.location.pathname;
        const text = document.body.innerText;
        return p.includes('/results') || text.includes('PACKAGE COMPLIANCE RESULT') || text.includes('Results Unavailable');
      }, { timeout: 60000 });

      const durationMs = Date.now() - tStart;
      totalProcessingTimeMs += durationMs;

      // Extract results from browser React Router state / DOM
      const pageData = await page.evaluate(() => {
        const usrState = (window.history.state as any)?.usr;
        const bodyText = document.body.innerText;
        return {
          usrState,
          bodyText,
        };
      });

      const extracted = pageData.usrState?.extractedLabel || {};
      const verdict = pageData.usrState?.verdict?.overallStatus || (pageData.bodyText.includes('COMPLIANT') ? 'PASS' : 'REVIEW');
      const rawText = extracted.rawText || '';
      const barcodeData = pageData.usrState?.barcodeCrossCheck?.barcode;
      const barcodeValue = barcodeData?.rawValue;

      // Evaluate each ground truth field
      const fieldResults: Record<string, { visible: boolean; extracted?: string; matched: boolean; failureType?: string }> = {};

      const fieldsToCheck: (keyof typeof prod.groundTruth)[] = [
        'mrp',
        'netQuantity',
        'manufacturer',
        'address',
        'date',
        'consumerCare',
        'barcode',
      ];

      for (const field of fieldsToCheck) {
        const gt = prod.groundTruth[field];
        if (!gt.visible) {
          fieldResults[field] = { visible: false, matched: true };
          continue;
        }

        fieldBreakdown[field].totalVisible++;
        totalVisibleFields++;

        let detectedStr: string | undefined = undefined;
        if (field === 'mrp') detectedStr = extracted.mrp;
        else if (field === 'netQuantity') detectedStr = extracted.netQuantity;
        else if (field === 'manufacturer') detectedStr = extracted.manufacturer;
        else if (field === 'address') detectedStr = extracted.address;
        else if (field === 'date') detectedStr = extracted.manufactureDate || extracted.packingDate;
        else if (field === 'consumerCare') detectedStr = extracted.consumerCare;
        else if (field === 'barcode') detectedStr = barcodeValue;

        const isMatched = Boolean(detectedStr && gt.matchPattern && gt.matchPattern.test(detectedStr));

        if (isMatched) {
          fieldBreakdown[field].extractedCorrectly++;
          totalCorrectlyExtracted++;
          fieldResults[field] = { visible: true, extracted: detectedStr, matched: true };
        } else {
          // Classify failure: Did OCR text contain the text, but parser missed it? Or did OCR miss the text?
          let failType = 'OCR_MISS';
          if (gt.matchPattern && gt.matchPattern.test(rawText)) {
            failType = 'PARSER_MISS';
            fieldBreakdown[field].parserFails++;
          } else {
            fieldBreakdown[field].ocrFails++;
          }
          fieldResults[field] = { visible: true, extracted: detectedStr, matched: false, failureType: failType };
        }
      }

      // Safety Audit: Check for False PASS
      // A False PASS occurs if the package was non-compliant or had missing required declarations, but the verdict was PASS
      const isFalsePass = verdict === 'PASS' && prod.expectedVerdict === 'REVIEW';
      if (isFalsePass) falsePassCount++;

      // False REVIEW check: A package with all declarations clearly visible and compliant was flagged REVIEW
      const isFalseReview = verdict === 'REVIEW' && prod.expectedVerdict === 'PASS';
      if (isFalseReview) falseReviewCount++;

      console.log(`       Outcome: Verdict=${verdict} (Expected=${prod.expectedVerdict}) | Duration=${durationMs}ms`);
      console.log(`       Extracted MRP: ${extracted.mrp || 'None'} | Qty: ${extracted.netQuantity || 'None'} | Mfg: ${extracted.manufacturer || 'None'}`);
      console.log(`       Date: ${extracted.manufactureDate || extracted.packingDate || 'None'} | Care: ${extracted.consumerCare || 'None'} | Barcode: ${barcodeValue || 'None'}`);
      console.log(`       Safety: False PASS=${isFalsePass ? 'YES (CRITICAL REGRESSION)' : 'NO (SAFE)'}\n`);

      resultsSummary.push({
        id: prod.id,
        name: prod.name,
        brand: prod.brand,
        category: prod.category,
        photosCount: prod.photos.length,
        verdict,
        expectedVerdict: prod.expectedVerdict,
        isFalsePass,
        isFalseReview,
        durationMs,
        ocrQuality: pageData.usrState?.ocrQuality,
        ocrConfidence: pageData.usrState?.ocrConfidence,
        fieldResults,
        rawTextSnippet: rawText.slice(0, 150),
      });
    }

    const overallFieldAccuracy = ((totalCorrectlyExtracted / totalVisibleFields) * 100).toFixed(1);
    const avgDurationMs = Math.round(totalProcessingTimeMs / ACCEPTANCE_DATASET.length);

    console.log('================================================================');
    console.log('              ACCEPTANCE TEST REPORT SUMMARY                    ');
    console.log('================================================================');
    console.log(`Total Products Tested:         ${ACCEPTANCE_DATASET.length}`);
    console.log(`Total Visible Ground Truth:    ${totalVisibleFields} declarations`);
    console.log(`Correctly Extracted:           ${totalCorrectlyExtracted} declarations`);
    console.log(`Measured Field Accuracy:       ${overallFieldAccuracy}%`);
    console.log(`False PASS Count:              ${falsePassCount} (ZERO TOLERANCE: ${falsePassCount === 0 ? 'SATISFIED' : 'VIOLATED'})`);
    console.log(`False REVIEW Count:            ${falseReviewCount}`);
    console.log(`Average Processing Time:       ${avgDurationMs}ms / product\n`);

    console.log('Field-by-Field Accuracy Breakdown:');
    for (const [k, v] of Object.entries(fieldBreakdown)) {
      const acc = v.totalVisible > 0 ? ((v.extractedCorrectly / v.totalVisible) * 100).toFixed(1) : 'N/A';
      console.log(`  - ${k.padEnd(14)}: ${v.extractedCorrectly}/${v.totalVisible} (${acc}%) | OCR Miss: ${v.ocrFails} | Parser Miss: ${v.parserFails}`);
    }

    // Save final report to JSON
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalProducts: ACCEPTANCE_DATASET.length,
        totalVisibleFields,
        totalCorrectlyExtracted,
        overallFieldAccuracy: `${overallFieldAccuracy}%`,
        falsePassCount,
        falseReviewCount,
        averageProcessingTimeMs: avgDurationMs,
      },
      fieldBreakdown,
      products: resultsSummary,
    };

    fs.writeFileSync(OUTPUT_REPORT, JSON.stringify(reportData, null, 2));
    console.log(`\n✔ Final acceptance report persisted to: ${OUTPUT_REPORT}`);

    if (falsePassCount > 0) {
      console.error('❌ SAFETY FAILURE: False PASS count must be zero!');
      process.exit(1);
    } else {
      console.log('🎉 SAFETY CRITERION SATISFIED: Zero False PASS across all 10 real products!\n');
    }

  } catch (err) {
    console.error('Acceptance Test Failure:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    if (previewProc) previewProc.kill('SIGTERM');
    if (backendProc) backendProc.kill('SIGTERM');
  }
}

runBlindAcceptance().catch(console.error);
