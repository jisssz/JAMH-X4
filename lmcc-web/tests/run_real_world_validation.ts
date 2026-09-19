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
const IMAGES_DIR = path.resolve(__dirname, 'fixtures/unseen_real_products');
const OUTPUT_FILE = path.resolve(__dirname, '../evaluation/reports/real_world_validation_after.json');

const PRODUCT_METADATA: Record<string, { name: string; category: string; language: string }> = {
  '01_biscuit.jpg': { name: 'Britannia 5050 Biscuit', category: 'Biscuits', language: 'eng' },
  '02_chips_snack.jpg': { name: 'Haldirams Mixture Snack', category: 'Chips/Snack', language: 'eng' },
  '03_rice_grain.jpg': { name: 'Daawat Basmati Rice', category: 'Rice/Atta/Flour', language: 'eng' },
  '04_cooking_oil.jpg': { name: 'Independence Soyabean Oil 1L', category: 'Cooking Oil', language: 'eng' },
  '05_shampoo.jpg': { name: 'Head & Shoulders Shampoo', category: 'Shampoo/Cosmetic', language: 'eng' },
  '06_detergent.jpg': { name: 'Surf Excel Quick Wash', category: 'Detergent', language: 'eng' },
  '07_spice_packet.jpg': { name: 'MDH Garam Masala', category: 'Spice Packet', language: 'eng+hin' },
  '08_chocolate.jpg': { name: 'Cadbury Dairy Milk', category: 'Chocolate/Confectionery', language: 'eng' },
  '09_beverage.jpg': { name: 'Amul Masti Spiced Buttermilk', category: 'Beverage Bottle/Pack', language: 'eng+guj' },
  '10_otc_product.jpg': { name: 'Dettol Antiseptic Pack', category: 'OTC Consumer Product', language: 'eng' },
  '11_imported.jpg': { name: 'Ferrero Rocher Box', category: 'Imported Product', language: 'eng+ita' },
  '12_reflective_foil.jpg': { name: 'Haldiram Khatta Meetha Foil', category: 'Reflective Foil Package', language: 'eng' },
  '13_angled_foil.jpg': { name: 'Haldirams Aloo Bhujia (Angled)', category: 'Angled Photograph', language: 'eng' },
  '14_small_print.jpg': { name: 'Saffola Masala Oats Fine Print', category: 'Small Print Package', language: 'eng' },
  '15_regional_tea.jpg': { name: 'Tata Tea Gemini Pack', category: 'Regional Language Package', language: 'eng+tel' },
};

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

function getJpgDimensions(buf: Buffer): { width: number; height: number } {
  let i = 0;
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return { width: 0, height: 0 };
  i += 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return { width: 0, height: 0 };
    const marker = buf[i + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      const height = buf.readUInt16BE(i + 5);
      const width = buf.readUInt16BE(i + 7);
      return { width, height };
    }
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }
  return { width: 0, height: 0 };
}

interface TestRunResult {
  filename: string;
  productName: string;
  category: string;
  language: string;
  dimensions: { width: number; height: number };
  ocrAttempts: number;
  ocrConfidence: number;
  ocrQuality: string;
  processingTimeMs: number;
  mergedCharCount: number;
  rawOcrSnippet: string;
  rawOcrFull: string;
  extractedFields: {
    mrp?: string;
    netQuantity?: string;
    manufacturer?: string;
    address?: string;
    date?: string;
    consumerCare?: string;
  };
  verdict: 'PASS' | 'REVIEW';
  violations: Array<{ ruleId: string; title: string; field: string }>;
}

async function runValidation() {
  console.log('================================================================');
  console.log('  LMCC BLACK-BOX REAL-WORLD OCR VALIDATION SUITE (15 PRODUCTS)');
  console.log('================================================================');

  let previewProcess: ChildProcess | null = null;
  let browser: puppeteer.Browser | null = null;
  const results: TestRunResult[] = [];

  try {
    console.log('\n[1/3] Starting Vite preview server on port ' + PORT + '...');
    previewProcess = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'pipe',
    });

    await waitForServer(BASE_URL);
    console.log('✔ Preview server responsive at ' + BASE_URL);

    console.log('\n[2/3] Launching Google Chrome (headless)...');
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1280,900',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    console.log('\n[3/3] Testing all 15 real packaging images through real application pipeline...');
    const imageFiles = fs.readdirSync(IMAGES_DIR).filter((f) => f.endsWith('.jpg') || f.endsWith('.png')).sort();

    for (let idx = 0; idx < imageFiles.length; idx++) {
      const filename = imageFiles[idx];
      const imagePath = path.join(IMAGES_DIR, filename);
      const meta = PRODUCT_METADATA[filename] || {
        name: filename,
        category: 'Packaged Goods',
        language: 'eng',
      };

      const buf = fs.readFileSync(imagePath);
      const dims = getJpgDimensions(buf);

      console.log(`\n────────────────────────────────────────────────────────────────`);
      console.log(`[${idx + 1}/${imageFiles.length}] Testing: ${filename} — ${meta.name} (${meta.category})`);
      console.log(`    Dimensions: ${dims.width}x${dims.height} | Size: ${buf.length} bytes`);

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
          return p.includes('/results') || body.includes('No Text Recognized') || body.includes('Results Unavailable');
        },
        { timeout: 50000 }
      );

      const durationMs = Date.now() - tStart;

      // Extract results from React router state / DOM
      const pageData = await page.evaluate(() => {
        const routerState = (window.history.state as any)?.usr;
        const text = document.body.innerText;
        return {
          routerState,
          bodyText: text,
          currentUrl: window.location.href,
        };
      });

      const extracted = pageData.routerState?.extractedLabel;
      const verdict = pageData.routerState?.verdict;
      const ocrQuality = pageData.routerState?.ocrQuality || 'UNKNOWN';
      const ocrConfidence = pageData.routerState?.ocrConfidence ?? 0;
      const ocrAttempts = pageData.routerState?.ocrAttempts ?? 1;

      const rawText = extracted?.rawText || '';
      const finalVerdict = verdict?.overallStatus || (pageData.bodyText.includes('COMPLIANT') ? 'PASS' : 'REVIEW');

      const itemResult: TestRunResult = {
        filename,
        productName: meta.name,
        category: meta.category,
        language: meta.language,
        dimensions: dims,
        ocrAttempts,
        ocrConfidence: Math.round(ocrConfidence),
        ocrQuality,
        processingTimeMs: durationMs,
        mergedCharCount: rawText.length,
        rawOcrSnippet: rawText.slice(0, 150).replace(/\n/g, ' '),
        rawOcrFull: rawText,
        extractedFields: {
          mrp: extracted?.mrp,
          netQuantity: extracted?.netQuantity,
          manufacturer: extracted?.manufacturer,
          address: extracted?.address,
          date: extracted?.packingDate || extracted?.manufactureDate,
          consumerCare: extracted?.consumerCare,
        },
        verdict: finalVerdict,
        violations: (verdict?.potentialViolations || []).map((v: any) => ({
          ruleId: v.ruleId,
          title: v.title,
          field: v.field,
        })),
      };

      results.push(itemResult);

      console.log(`    Duration: ${durationMs}ms | OCR Conf: ${itemResult.ocrConfidence}% | Chars: ${rawText.length}`);
      console.log(`    Fields Extracted:`);
      console.log(`      • MRP:          ${itemResult.extractedFields.mrp || 'Not Detected'}`);
      console.log(`      • Net Quantity: ${itemResult.extractedFields.netQuantity || 'Not Detected'}`);
      console.log(`      • Manufacturer: ${itemResult.extractedFields.manufacturer || 'Not Detected'}`);
      console.log(`      • Address:      ${itemResult.extractedFields.address || 'Not Detected'}`);
      console.log(`      • Date:         ${itemResult.extractedFields.date || 'Not Detected'}`);
      console.log(`      • ConsumerCare: ${itemResult.extractedFields.consumerCare || 'Not Detected'}`);
      console.log(`    Verdict: ${finalVerdict} (Flagged issues: ${itemResult.violations.length})`);
    }

    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n✔ Complete validation results written to ${OUTPUT_FILE}`);
  } catch (err: any) {
    console.error('Validation runner error:', err);
  } finally {
    if (browser) {
      await browser.close();
    }
    if (previewProcess) {
      previewProcess.kill();
    }
  }
}

runValidation();
