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
const IMAGES_DIR = path.resolve(__dirname, 'fixtures/complete_declaration_challenge');

export interface GroundTruthTargets {
  mrp?: { visible: boolean; readable: boolean; expected: string };
  netQuantity?: { visible: boolean; readable: boolean; expected: string };
  manufacturer?: { visible: boolean; readable: boolean; expected: string };
  address?: { visible: boolean; readable: boolean; expected: string };
  date?: { visible: boolean; readable: boolean; expected: string };
  consumerCare?: { visible: boolean; readable: boolean; expected: string };
}

export interface ChallengeImageMeta {
  filename: string;
  productName: string;
  condition: string;
  language: string;
  groundTruth: GroundTruthTargets;
}

export const CHALLENGE_DATASET: ChallengeImageMeta[] = [
  {
    filename: 'challenge_01_clean_rear_biscuit.png',
    productName: 'Parle-G Glucose Biscuits (Clean Rear)',
    condition: 'Clean rear packaging label',
    language: 'eng',
    groundTruth: {
      mrp: { visible: true, readable: true, expected: '35' },
      netQuantity: { visible: true, readable: true, expected: '250 g' },
      manufacturer: { visible: true, readable: true, expected: 'PARLE PRODUCTS' },
      address: { visible: true, readable: true, expected: 'MUMBAI' },
      date: { visible: true, readable: true, expected: '08/2024' },
      consumerCare: { visible: true, readable: true, expected: '1800222211' },
    },
  },
  {
    filename: 'challenge_02_hindi_ghee.png',
    productName: 'Patanjali Cow Ghee (Hindi Label)',
    condition: 'Hindi Devanagari + English packaging',
    language: 'hin',
    groundTruth: {
      mrp: { visible: true, readable: true, expected: '650' },
      netQuantity: { visible: true, readable: true, expected: '1' },
      manufacturer: { visible: true, readable: true, expected: 'पतंजलि' },
      address: { visible: true, readable: true, expected: '249401' },
      date: { visible: true, readable: true, expected: '08/2024' },
      consumerCare: { visible: true, readable: true, expected: '18001804104' },
    },
  },
  {
    filename: 'challenge_03_malayalam_oil.png',
    productName: 'Kera Coconut Oil (Malayalam Label)',
    condition: 'Malayalam regional packaging pouch',
    language: 'mal',
    groundTruth: {
      mrp: { visible: true, readable: true, expected: '230' },
      netQuantity: { visible: true, readable: true, expected: '1' },
      manufacturer: { visible: true, readable: true, expected: 'KERA AGRO' },
      address: { visible: true, readable: true, expected: 'ALAPPUZHA 688001' },
      date: { visible: true, readable: true, expected: '07/2024' },
      consumerCare: { visible: true, readable: true, expected: '1800425425' },
    },
  },
  {
    filename: 'challenge_04_tamil_milk.png',
    productName: 'Arokya Full Cream Milk (Tamil Label)',
    condition: 'Tamil regional dairy pack',
    language: 'tam',
    groundTruth: {
      mrp: { visible: true, readable: true, expected: '34' },
      netQuantity: { visible: true, readable: true, expected: '500 ml' },
      manufacturer: { visible: true, readable: true, expected: 'HATSUN AGRO' },
      address: { visible: true, readable: true, expected: 'CHENNAI 600001' },
      date: { visible: true, readable: true, expected: '08/2024' },
      consumerCare: { visible: true, readable: true, expected: '1800120120' },
    },
  },
  {
    filename: 'challenge_05_noisy_foil_snack.png',
    productName: 'Roasted Masala Peanuts (Noisy Foil)',
    condition: 'Textured foil pouch with small print',
    language: 'eng',
    groundTruth: {
      mrp: { visible: true, readable: true, expected: '30' },
      netQuantity: { visible: true, readable: true, expected: '70 g' },
      manufacturer: { visible: true, readable: true, expected: 'DESI CRUNCH' },
      address: { visible: true, readable: true, expected: 'JAIPUR 302013' },
      date: { visible: true, readable: true, expected: '06/2024' },
      consumerCare: { visible: true, readable: true, expected: '1800233445' },
    },
  },
  {
    filename: 'challenge_06_reflective_foil_glare.png',
    productName: 'Parle-G (Specular Foil Glare)',
    condition: 'Reflective foil pouch with flash glare hotspot',
    language: 'eng',
    groundTruth: {
      mrp: { visible: true, readable: true, expected: '35' },
      netQuantity: { visible: true, readable: true, expected: '250 g' },
      manufacturer: { visible: true, readable: true, expected: 'PARLE PRODUCTS' },
      address: { visible: true, readable: true, expected: 'MUMBAI' },
      date: { visible: true, readable: true, expected: '08/2024' },
      consumerCare: { visible: true, readable: true, expected: '1800222211' },
    },
  },
  {
    filename: 'challenge_07_perspective_angled.png',
    productName: 'Parle-G (Perspective Angled)',
    condition: 'Perspective camera angle (pitch/yaw ~25°)',
    language: 'eng',
    groundTruth: {
      mrp: { visible: true, readable: true, expected: '35' },
      netQuantity: { visible: true, readable: true, expected: '250 g' },
      manufacturer: { visible: true, readable: true, expected: 'PARLE PRODUCTS' },
      address: { visible: true, readable: true, expected: 'MUMBAI' },
      date: { visible: true, readable: true, expected: '08/2024' },
      consumerCare: { visible: true, readable: true, expected: '1800222211' },
    },
  },
  {
    filename: 'challenge_08_low_light_pantry.png',
    productName: 'Parle-G (Low Light Pantry)',
    condition: 'Low light / underexposed ambient lighting (42%)',
    language: 'eng',
    groundTruth: {
      mrp: { visible: true, readable: true, expected: '35' },
      netQuantity: { visible: true, readable: true, expected: '250 g' },
      manufacturer: { visible: true, readable: true, expected: 'PARLE PRODUCTS' },
      address: { visible: true, readable: true, expected: 'MUMBAI' },
      date: { visible: true, readable: true, expected: '08/2024' },
      consumerCare: { visible: true, readable: true, expected: '1800222211' },
    },
  },
  {
    filename: 'challenge_09_curved_cylindrical.png',
    productName: 'Parle-G (Curved Container)',
    condition: 'Curved bottle / can with edge compression',
    language: 'eng',
    groundTruth: {
      mrp: { visible: true, readable: true, expected: '35' },
      netQuantity: { visible: true, readable: true, expected: '250 g' },
      manufacturer: { visible: true, readable: true, expected: 'PARLE PRODUCTS' },
      address: { visible: true, readable: true, expected: 'MUMBAI' },
      date: { visible: true, readable: true, expected: '08/2024' },
      consumerCare: { visible: true, readable: true, expected: '1800222211' },
    },
  },
  {
    filename: 'challenge_10_defocus_dotmatrix.png',
    productName: 'Parle-G (Defocus / Blur)',
    condition: 'Blurred / motion blur stress test',
    language: 'eng',
    groundTruth: {
      manufacturer: { visible: true, readable: true, expected: 'PARLE' },
      address: { visible: true, readable: true, expected: 'MUMBA' },
    },
  },
  {
    filename: 'challenge_11_original_failure_1kg.png',
    productName: 'Hyson Spices 1 KG (Original Bug Fixture)',
    condition: 'Photographed package, Net Weight 1 KG, perspective & mixed light',
    language: 'eng',
    groundTruth: {
      mrp: { visible: true, readable: true, expected: '210' },
      netQuantity: { visible: true, readable: true, expected: '1 kg' },
      manufacturer: { visible: true, readable: true, expected: 'HYSON AGRO FOOD' },
      address: { visible: true, readable: true, expected: 'ALUVA' },
      date: { visible: true, readable: true, expected: '18/08/2024' },
      consumerCare: { visible: true, readable: true, expected: '0484-2621000' },
    },
  },
  {
    filename: 'challenge_12_spice_packet_real.jpg',
    productName: 'MDH Garam Masala (Real Photo)',
    condition: 'Real consumer packaging photo',
    language: 'eng+hin',
    groundTruth: {
      manufacturer: { visible: true, readable: true, expected: 'MAHASHIAN DI HATTI' },
      address: { visible: true, readable: true, expected: 'Kirti Nagar' },
    },
  },
  {
    filename: 'challenge_13_beverage_pack_real.jpg',
    productName: 'Amul Masti Buttermilk (Real Photo)',
    condition: 'Real consumer packaging photo',
    language: 'eng',
    groundTruth: {
      netQuantity: { visible: true, readable: true, expected: '200 ml' },
    },
  },
  {
    filename: 'challenge_14_small_print_real.jpg',
    productName: 'Saffola Masala Oats Fine Print (Real Photo)',
    condition: 'Real consumer packaging fine print',
    language: 'eng',
    groundTruth: {
      manufacturer: { visible: true, readable: true, expected: 'MARICO' },
      address: { visible: true, readable: true, expected: 'Santacruz' },
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

export async function runChallengeSet(outputJsonPath: string) {
  console.log('=== COMPLETE DECLARATION CHALLENGE SET EVALUATION ===');
  console.log(`Target images: ${CHALLENGE_DATASET.length}`);

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

  const fieldStats: Record<string, { totalTarget: number; correct: number; parserFailures: number; ocrFailures: number }> = {
    mrp: { totalTarget: 0, correct: 0, parserFailures: 0, ocrFailures: 0 },
    netQuantity: { totalTarget: 0, correct: 0, parserFailures: 0, ocrFailures: 0 },
    manufacturer: { totalTarget: 0, correct: 0, parserFailures: 0, ocrFailures: 0 },
    address: { totalTarget: 0, correct: 0, parserFailures: 0, ocrFailures: 0 },
    date: { totalTarget: 0, correct: 0, parserFailures: 0, ocrFailures: 0 },
    consumerCare: { totalTarget: 0, correct: 0, parserFailures: 0, ocrFailures: 0 },
  };

  let totalVisibleFields = 0;
  let totalCorrectFields = 0;
  let falsePassCount = 0;
  let falseReviewCount = 0;

  for (let i = 0; i < CHALLENGE_DATASET.length; i++) {
    const item = CHALLENGE_DATASET[i];
    const imagePath = path.join(IMAGES_DIR, item.filename);
    console.log(`\n────────────────────────────────────────────────────────────────`);
    console.log(`[${i + 1}/${CHALLENGE_DATASET.length}] Testing: ${item.productName} (${item.filename})`);

    const startTime = Date.now();
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
        const hasEmpty = body.includes('No Readable Text Detected') || body.includes('No Text Recognized') || body.includes('Results Unavailable') || body.includes('could not complete');
        return p.includes('/results') || hasEmpty;
      },
      { timeout: 50000 }
    );

    const elapsed = Date.now() - startTime;

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
        fieldStats[f].totalTarget++;
        totalVisibleFields++;

        const actualVal = (extractedFields as any)[f];
        const isCorrect = !!actualVal && actualVal.toLowerCase().includes(gt.expected.toLowerCase());

        if (isCorrect) {
          fieldStats[f].correct++;
          totalCorrectFields++;
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

    // False PASS safety verification:
    if (verdict === 'PASS') {
      const missingTargets = Object.entries(itemFieldResults).filter(([_, r]) => r.target && !r.correct);
      if (missingTargets.length > 0) {
        falsePassCount++;
      }
    }

    console.log(`  -> Verdict: ${verdict}, Conf: ${ocrConfidence}%, Time: ${elapsed}ms`);
    console.log(`  -> Fields:`, Object.entries(itemFieldResults).filter(([_, r]) => r.target).map(([k, r]) => `${k}: ${r.correct ? 'PASS' : 'FAIL (' + r.failureType + ')'}`).join(', '));

    results.push({
      filename: item.filename,
      productName: item.productName,
      condition: item.condition,
      language: item.language,
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
    totalImages: CHALLENGE_DATASET.length,
    totalVisibleFields,
    totalCorrectFields,
    overallFieldAccuracy: totalVisibleFields > 0 ? Math.round((totalCorrectFields / totalVisibleFields) * 1000) / 10 : 0,
    fieldStats,
    falsePassCount,
    falseReviewCount,
    averageProcessingMs: Math.round(results.reduce((acc, r) => acc + r.processingTimeMs, 0) / results.length),
    results,
  };

  fs.writeFileSync(outputJsonPath, JSON.stringify(summary, null, 2));
  console.log(`\n[SAVED] Report written to: ${outputJsonPath}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`OVERALL FIELD ACCURACY: ${summary.overallFieldAccuracy}% (${totalCorrectFields}/${totalVisibleFields})`);
  console.log(`FALSE PASS (CRITICAL): ${falsePassCount}`);
  for (const [k, v] of Object.entries(fieldStats)) {
    const pct = v.totalTarget > 0 ? Math.round((v.correct / v.totalTarget) * 100) : 0;
    console.log(`  ${k.padEnd(15)}: ${pct}% (${v.correct}/${v.totalTarget}) [OCR Fails: ${v.ocrFailures}, Parser Fails: ${v.parserFailures}]`);
  }
  console.log('═══════════════════════════════════════════════════════════');

  return summary;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outPath = process.argv[2] || path.resolve(__dirname, '../evaluation/reports/complete_declaration_challenge_before.json');
  runChallengeSet(outPath).catch((err) => {
    console.error('Challenge suite error:', err);
    process.exit(1);
  });
}
