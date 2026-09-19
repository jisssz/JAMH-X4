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
const IMAGES_DIR = path.resolve(__dirname, 'fixtures/genuine_real_photos');
const OUTPUT_FILE = path.resolve(__dirname, '../evaluation/reports/genuine_real_photo_validation.json');

export interface RealPhotoMeta {
  filename: string;
  productName: string;
  category: string;
  groundTruth: {
    mrp?: { visible: boolean; readable: boolean; expected: string };
    netQuantity?: { visible: boolean; readable: boolean; expected: string };
    manufacturer?: { visible: boolean; readable: boolean; expected: string };
    address?: { visible: boolean; readable: boolean; expected: string };
    date?: { visible: boolean; readable: boolean; expected: string };
    consumerCare?: { visible: boolean; readable: boolean; expected: string };
  };
}

export const GENUINE_DATASET: RealPhotoMeta[] = [
  {
    filename: 'real_01_mdh_garam_masala.jpg',
    productName: 'MDH Garam Masala (Packaging Back)',
    category: 'Spices',
    groundTruth: {
      manufacturer: { visible: true, readable: true, expected: 'HATTI' },
      address: { visible: true, readable: true, expected: '110015' },
    },
  },
  {
    filename: 'real_02_amul_buttermilk.jpg',
    productName: 'Amul Masti Spiced Buttermilk',
    category: 'Beverages',
    groundTruth: {
      netQuantity: { visible: true, readable: true, expected: '200 ml' },
    },
  },
  {
    filename: 'real_03_saffola_masala_oats.jpg',
    productName: 'Saffola Masala Oats Fine Print',
    category: 'Cereals',
    groundTruth: {
      manufacturer: { visible: true, readable: true, expected: 'MARICO' },
      address: { visible: true, readable: true, expected: 'Santacruz' },
    },
  },
  {
    filename: 'real_04_tata_tea_gemini.jpg',
    productName: 'Tata Tea Gemini Regional Pack',
    category: 'Tea/Beverages',
    groundTruth: {
      manufacturer: { visible: true, readable: true, expected: 'TATA' },
      address: { visible: true, readable: true, expected: '560024' },
    },
  },
  {
    filename: 'real_05_haldirams_mixture.jpg',
    productName: 'Haldirams Mixture Snack',
    category: 'Chips/Snack',
    groundTruth: {
      address: { visible: true, readable: true, expected: 'Powder' },
    },
  },
  {
    filename: 'real_06_haldirams_bhujia_angled.jpg',
    productName: 'Haldirams Aloo Bhujia (Angled Fold)',
    category: 'Chips/Snack',
    groundTruth: {
      address: { visible: true, readable: true, expected: 'Mohan' },
    },
  },
  {
    filename: 'real_07_dettol_antiseptic.jpg',
    productName: 'Dettol Antiseptic Pack',
    category: 'OTC Consumer',
    groundTruth: {
      address: { visible: true, readable: true, expected: 'Plot No' },
    },
  },
  {
    filename: 'real_08_independence_oil.jpg',
    productName: 'Independence Soyabean Oil 1L Pouch',
    category: 'Cooking Oil',
    groundTruth: {},
  },
  {
    filename: 'real_09_cadbury_dairy_milk.jpg',
    productName: 'Cadbury Dairy Milk (Ingredients Panel)',
    category: 'Chocolate',
    groundTruth: {},
  },
  {
    filename: 'real_10_haldiram_khatta_meetha.jpg',
    productName: 'Haldiram Khatta Meetha (Foil Pouch)',
    category: 'Foil Snack',
    groundTruth: {},
  },
  {
    filename: 'real_11_surf_excel.jpg',
    productName: 'Surf Excel Quick Wash Pouch',
    category: 'Detergent',
    groundTruth: {},
  },
  {
    filename: 'real_12_britannia_biscuit.jpg',
    productName: 'Britannia 5050 Biscuit',
    category: 'Biscuits',
    groundTruth: {},
  },
  {
    filename: 'real_13_tata_salt_care_address.jpg',
    productName: 'Tata Salt (Consumer Care & Address Panel)',
    category: 'Staples/Salt',
    groundTruth: {
      manufacturer: { visible: true, readable: true, expected: 'TATA CONSUMER' },
      address: { visible: true, readable: true, expected: 'HEBBAL' },
      consumerCare: { visible: true, readable: true, expected: 'CUSTOMER CARE' },
    },
  },
  {
    filename: 'real_14_amul_taaza_milk.jpg',
    productName: 'Amul Taaza Milk Carton',
    category: 'Dairy',
    groundTruth: {
      netQuantity: { visible: true, readable: true, expected: '500 ml' },
    },
  },
  {
    filename: 'real_15_mdh_biryani_masala.jpg',
    productName: 'MDH Biryani Masala (Packaging Back)',
    category: 'Spices',
    groundTruth: {
      manufacturer: { visible: true, readable: true, expected: 'MDH' },
      address: { visible: true, readable: true, expected: 'Delhi' },
    },
  },
];

function waitForServer(url: string, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error(`Timeout waiting for preview server at ${url}`));
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

export async function runGenuineRealPhotos() {
  console.log('=== GENUINE REAL PACKAGING PHOTOGRAPHS VALIDATION (15 IMAGES) ===');

  let previewProcess: ChildProcess | null = null;
  const isServerRunning = await new Promise<boolean>((resolve) => {
    http
      .get(BASE_URL, (res) => resolve(!!res.statusCode && res.statusCode < 400))
      .on('error', () => resolve(false));
  });

  if (!isServerRunning) {
    console.log('Launching Vite preview server on port 4173...');
    previewProcess = spawn('npm', ['run', 'preview', '--', '--port', '4173', '--strictPort'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
    });
    await waitForServer(BASE_URL);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--allow-running-insecure-content',
      '--window-size=1280,900',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const results: any[] = [];
  let totalTargets = 0;
  let totalCorrect = 0;
  let falsePassCount = 0;
  let falseReviewCount = 0;

  const fieldStats: Record<string, { target: number; correct: number; ocrFailures: number; parserFailures: number }> = {
    mrp: { target: 0, correct: 0, ocrFailures: 0, parserFailures: 0 },
    netQuantity: { target: 0, correct: 0, ocrFailures: 0, parserFailures: 0 },
    manufacturer: { target: 0, correct: 0, ocrFailures: 0, parserFailures: 0 },
    address: { target: 0, correct: 0, ocrFailures: 0, parserFailures: 0 },
    date: { target: 0, correct: 0, ocrFailures: 0, parserFailures: 0 },
    consumerCare: { target: 0, correct: 0, ocrFailures: 0, parserFailures: 0 },
  };

  for (let i = 0; i < GENUINE_DATASET.length; i++) {
    const item = GENUINE_DATASET[i];
    const imagePath = path.join(IMAGES_DIR, item.filename);
    console.log(`\n────────────────────────────────────────────────────────────────`);
    console.log(`[${i + 1}/${GENUINE_DATASET.length}] Testing: ${item.productName} (${item.filename}) [${item.category}]`);

    const tStart = Date.now();
    await page.goto(`${BASE_URL}/scan?mode=upload`, { waitUntil: 'networkidle0' });

    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('Could not find file input on /scan');
    await fileInput.uploadFile(imagePath);

    // Wait for "Use This Image" confirm button
    await page.waitForFunction(
      () => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.some((b) => b.textContent?.includes('Use This Image'));
      },
      { timeout: 8000 }
    );

    // Click "Use This Image"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const useBtn = btns.find((b) => b.textContent?.includes('Use This Image'));
      if (useBtn) useBtn.click();
    });

    // Wait for /results or empty OCR handling
    await page.waitForFunction(
      () => {
        const p = window.location.pathname;
        const body = document.body.innerText;
        const hasEmpty =
          body.includes('No Readable Text Detected') ||
          body.includes('No Text Recognized') ||
          body.includes('Results Unavailable') ||
          body.includes('could not complete');
        return p.includes('/results') || hasEmpty;
      },
      { timeout: 50000 }
    );

    const elapsed = Date.now() - tStart;

    // Extract results from React router state / DOM
    const pageData = await page.evaluate(() => {
      const routerState = (window.history.state as any)?.usr;
      const text = document.body.innerText;
      return {
        routerState,
        bodyText: text,
      };
    });

    const extracted = pageData.routerState?.extractedLabel || {};
    const verdictObj = pageData.routerState?.verdict || {};
    const rawText = extracted.rawText || '';
    const verdict = verdictObj.overallStatus || (pageData.bodyText.includes('COMPLIANT') ? 'PASS' : 'REVIEW');
    const ocrQuality = pageData.routerState?.ocrQuality || 'UNKNOWN';
    const ocrConfidence = pageData.routerState?.ocrConfidence ?? 0;

    const extractedFields = {
      mrp: extracted.mrp,
      netQuantity: extracted.netQuantity,
      manufacturer: extracted.manufacturer,
      address: extracted.address,
      date: extracted.manufactureDate || extracted.packingDate,
      consumerCare: extracted.consumerCare,
    };

    const itemFieldResults: Record<string, { target: boolean; expected?: string; actual?: string; correct: boolean; failureType?: 'OCR' | 'PARSER' }> = {};
    const fieldsToCheck = ['mrp', 'netQuantity', 'manufacturer', 'address', 'date', 'consumerCare'] as const;

    for (const f of fieldsToCheck) {
      const gt = (item.groundTruth as any)[f];
      if (gt && gt.visible && gt.readable) {
        fieldStats[f].target++;
        totalTargets++;

        const actualVal = (extractedFields as any)[f];
        const isCorrect = !!actualVal && actualVal.toLowerCase().includes(gt.expected.toLowerCase());

        if (isCorrect) {
          fieldStats[f].correct++;
          totalCorrect++;
          itemFieldResults[f] = { target: true, expected: gt.expected, actual: actualVal, correct: true };
        } else {
          // Check if expected text was present in raw OCR text
          const inRawOcr = rawText.toLowerCase().includes(gt.expected.toLowerCase());
          const failureType = inRawOcr ? 'PARSER' : 'OCR';

          if (failureType === 'PARSER') {
            fieldStats[f].parserFailures++;
          } else {
            fieldStats[f].ocrFailures++;
          }

          itemFieldResults[f] = { target: true, expected: gt.expected, actual: actualVal, correct: false, failureType };
        }
      } else {
        itemFieldResults[f] = { target: false, correct: false };
      }
    }

    // Safety verification: False PASS check
    if (verdict === 'PASS') {
      const missingTargets = Object.entries(itemFieldResults).filter(([_, r]) => r.target && !r.correct);
      // In complete declaration screening, all 6 declarations are legally mandatory for a full PASS
      const totalLegalDeclarations = Object.values(extractedFields).filter(Boolean).length;
      if (missingTargets.length > 0 || totalLegalDeclarations < 6) {
        falsePassCount++;
      }
    }

    console.log(`  -> Verdict: ${verdict}, Conf: ${ocrConfidence}%, Time: ${elapsed}ms`);
    console.log(`  -> Visible Field Extraction:`, Object.entries(itemFieldResults).filter(([_, r]) => r.target).map(([k, r]) => `${k}: ${r.correct ? 'PASS' : 'FAIL (' + r.failureType + ')'}`).join(', ') || 'No statutory declarations on panel');

    results.push({
      filename: item.filename,
      productName: item.productName,
      category: item.category,
      processingTimeMs: elapsed,
      ocrConfidence,
      ocrQuality,
      verdict,
      rawOcrLength: rawText.length,
      rawOcrSnippet: rawText.slice(0, 200).replace(/\n/g, ' '),
      rawOcrText: rawText,
      extractedFields,
      fieldResults: itemFieldResults,
    });
  }

  await browser.close();
  if (previewProcess) previewProcess.kill();

  const summary = {
    timestamp: new Date().toISOString(),
    totalImages: GENUINE_DATASET.length,
    totalTargets,
    totalCorrect,
    extractionAccuracy: totalTargets > 0 ? Math.round((totalCorrect / totalTargets) * 1000) / 10 : 0,
    fieldStats,
    falsePassCount,
    falseReviewCount,
    averageProcessingMs: Math.round(results.reduce((acc, r) => acc + r.processingTimeMs, 0) / results.length),
    results,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(summary, null, 2));
  console.log(`\n[SAVED] Report written to: ${OUTPUT_FILE}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`REAL-WORLD TARGET FIELD ACCURACY: ${summary.extractionAccuracy}% (${totalCorrect}/${totalTargets})`);
  console.log(`FALSE PASS (CRITICAL): ${falsePassCount}`);
  for (const [k, v] of Object.entries(fieldStats)) {
    if (v.target > 0) {
      const pct = Math.round((v.correct / v.target) * 100);
      console.log(`  ${k.padEnd(15)}: ${pct}% (${v.correct}/${v.target}) [OCR Fails: ${v.ocrFailures}, Parser Fails: ${v.parserFailures}]`);
    }
  }
  console.log('═══════════════════════════════════════════════════════════');

  return summary;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runGenuineRealPhotos().catch((err) => {
    console.error('Genuine validation error:', err);
    process.exit(1);
  });
}
