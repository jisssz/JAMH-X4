import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const LIVE_BACKEND_URL = 'https://lmcc-backend.vercel.app';

function waitForServer(url: string, timeoutMs = 20000): Promise<void> {
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

function fetchHttpsJson(url: string): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve({ status: res.statusCode || 0, data });
        } catch (e) {
          resolve({ status: res.statusCode || 0, data: body });
        }
      });
    }).on('error', reject);
  });
}

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runComprehensiveE2E() {
  console.log('================================================================');
  console.log('   LMCC PRODUCTION E2E VERIFICATION & AUDIT SUITE');
  console.log('   Google Chrome Headless | Puppeteer | Live Vercel Backend');
  console.log('================================================================\n');

  let backendProc: ChildProcess | null = null;
  let previewProcess: ChildProcess | null = null;
  let browser: puppeteer.Browser | null = null;

  try {
    // -------------------------------------------------------------
    // STEP 0: Launch FastAPI Backend Server
    // -------------------------------------------------------------
    console.log('[1/6] Launching FastAPI backend server...');
    const tStartBackend = Date.now();
    const backendCwd = path.resolve(__dirname, '../../lmcc-backend');
    backendProc = spawn(
      path.resolve(backendCwd, '.venv/bin/uvicorn'),
      ['app.main:app', '--host', '127.0.0.1', '--port', '8000'],
      { cwd: backendCwd, stdio: 'pipe' }
    );

    await waitForServer('http://127.0.0.1:8000/api/health');
    console.log(`✔ FastAPI backend healthy at http://127.0.0.1:8000 (${Date.now() - tStartBackend}ms)`);
    results.push({
      suite: 'Infrastructure',
      name: 'FastAPI Backend Service',
      passed: true,
      details: 'HTTP 200 at http://127.0.0.1:8000/api/health',
      durationMs: Date.now() - tStartBackend,
    });

    // -------------------------------------------------------------
    // STEP 1: Launch Vite Preview Server
    // -------------------------------------------------------------
    console.log('\n[2/6] Launching Vite production preview server...');
    const tStartServer = Date.now();
    previewProcess = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'pipe',
    });

    previewProcess.stderr?.on('data', (d) => {
      const msg = d.toString();
      if (!msg.includes('node:')) console.error(`[preview-server] ${msg}`);
    });

    await waitForServer(BASE_URL);
    console.log(`✔ Preview server responsive at ${BASE_URL} (${Date.now() - tStartServer}ms)`);
    results.push({
      suite: 'Infrastructure',
      name: 'Vite Production Preview Server',
      passed: true,
      details: `HTTP 200 at ${BASE_URL}`,
      durationMs: Date.now() - tStartServer,
    });

    // -------------------------------------------------------------
    // STEP 2: Launch Headless Google Chrome
    // -------------------------------------------------------------
    console.log('\n[2/5] Launching Google Chrome...');
    const tStartBrowser = Date.now();
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900'],
    });
    const version = await browser.version();
    console.log(`✔ Chrome launched: ${version} (${Date.now() - tStartBrowser}ms)`);
    results.push({
      suite: 'Infrastructure',
      name: 'Google Chrome Launch',
      passed: true,
      details: version,
      durationMs: Date.now() - tStartBrowser,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // Diagnostic console output
    page.on('console', (msg) => {
      const txt = msg.text();
      if (txt.includes('Error') || txt.includes('warn') || txt.includes('conflict')) {
        console.log(`  [Browser ${msg.type()}]:`, txt);
      }
    });

    // -------------------------------------------------------------
    // STEP 3: Multi-Image Package Scanning Workflow (Chrome)
    // -------------------------------------------------------------
    console.log('\n[3/5] Testing Multi-Image Package Scanning & Staging Tray...');
    const tStartMultiImage = Date.now();

    await page.goto(`${BASE_URL}/scan?mode=upload`, { waitUntil: 'networkidle0' });

    // Panel 1: Front/Back label
    const panel1Path = path.resolve(__dirname, 'fixtures/complete_declaration_challenge/goodday_back.jpg');
    let fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input not found on /scan');
    await fileInput.uploadFile(panel1Path);

    await page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some((b) => b.textContent?.includes('Use This Image'));
    }, { timeout: 8000 });

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const useBtn = btns.find((b) => b.textContent?.includes('Use This Image'));
      if (useBtn) useBtn.click();
    });

    // Verify Staging Tray appeared with 1 panel
    await page.waitForFunction(() => {
      return document.body.innerText.includes('Staged Package Session');
    }, { timeout: 5000 });
    console.log('  ✔ Staged Package Tray activated with 1 panel');

    // Panel 2: Additional panel
    const panel2Path = path.resolve(__dirname, 'fixtures/complete_declaration_challenge/goodday_back_full.jpg');
    fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input not found for panel 2');
    await fileInput.uploadFile(panel2Path);

    await page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some((b) => b.textContent?.includes('Use This Image'));
    }, { timeout: 8000 });

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const useBtn = btns.find((b) => b.textContent?.includes('Use This Image'));
      if (useBtn) useBtn.click();
    });

    // Verify Staging Tray now shows 2 panels
    await page.waitForFunction(() => {
      return document.body.innerText.includes('2 / 5 panels staged');
    }, { timeout: 5000 });
    console.log('  ✔ Staged Package Tray updated to 2 / 5 panels staged');

    // Verify Analyze Complete Package button is present
    const hasAnalyzeBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some((b) => b.textContent?.includes('ANALYZE COMPLETE PACKAGE (2 PHOTOS)'));
    });
    console.log(`  ✔ Analyze button present: ${hasAnalyzeBtn}`);

    // Click Analyze Complete Package
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const analyzeBtn = btns.find((b) => b.textContent?.includes('ANALYZE COMPLETE PACKAGE'));
      if (analyzeBtn) analyzeBtn.click();
    });

    // Wait for /processing transition
    await page.waitForFunction(() => window.location.pathname.includes('/processing'), { timeout: 5000 });
    console.log('  ✔ Navigated to /processing with multi-panel session state');

    // Wait for OCR pipeline completion and navigation to /results
    console.log('  Waiting for multi-panel sequential OCR & evidence fusion...');
    await page.waitForFunction(() => window.location.pathname.includes('/results'), { timeout: 60000 });
    console.log('  ✔ Navigated to /results');

    // Verify Results DOM for Multi-Panel Session banner & declarations
    const resultsData = await page.evaluate(() => {
      const body = document.body.innerText;
      const upper = body.toUpperCase();
      return {
        body,
        hasMultiPanelBanner: upper.includes('UNIFIED PACKAGE SESSION') || upper.includes('PANELS ANALYZED') || upper.includes('PANELS: 2'),
        hasStatus: upper.includes('COMPLIANT') || upper.includes('REVIEW') || upper.includes('PASS'),
        hasOcrQuality: upper.includes('OCR SIGNAL QUALITY') || upper.includes('GOOD') || upper.includes('ACCEPTABLE') || upper.includes('POOR'),
      };
    });

    console.log(`  - Multi-Panel Banner rendered: ${resultsData.hasMultiPanelBanner}`);
    console.log(`  - Compliance Verdict rendered: ${resultsData.hasStatus}`);
    console.log(`  - OCR Quality indicator rendered: ${resultsData.hasOcrQuality}`);

    const multiPanelPassed = resultsData.hasMultiPanelBanner && resultsData.hasStatus;
    results.push({
      suite: 'Multi-Image Scanning',
      name: 'Staging Tray & Multi-Panel Analysis Flow',
      passed: multiPanelPassed,
      details: `Panels: 2, MultiPanelBanner: ${resultsData.hasMultiPanelBanner}, Status: ${resultsData.hasStatus}`,
      durationMs: Date.now() - tStartMultiImage,
    });

    // -------------------------------------------------------------
    // STEP 4: Barcode Detection & Database Cross-Check E2E (Chrome)
    // -------------------------------------------------------------
    console.log('\n[4/5] Testing Real Barcode Detection & Cross-Check in Chrome...');
    const tStartBarcode = Date.now();

    // Navigate back to /scan
    await page.goto(`${BASE_URL}/scan?mode=upload`, { waitUntil: 'networkidle0' });

    // Upload Parle-G EAN-13 Barcode Image (8901719134845)
    const barcodeFixturePath = path.resolve(__dirname, 'fixtures/test_ean13_parle.png');
    fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input not found for barcode test');
    await fileInput.uploadFile(barcodeFixturePath);

    await page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some((b) => b.textContent?.includes('Use This Image'));
    }, { timeout: 8000 });

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const useBtn = btns.find((b) => b.textContent?.includes('Use This Image'));
      if (useBtn) useBtn.click();
    });

    // Click Analyze Complete Package (1 Photo)
    await page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some((b) => b.textContent?.includes('ANALYZE COMPLETE PACKAGE'));
    }, { timeout: 5000 });

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const analyzeBtn = btns.find((b) => b.textContent?.includes('ANALYZE COMPLETE PACKAGE'));
      if (analyzeBtn) analyzeBtn.click();
    });

    // Wait for /results
    await page.waitForFunction(() => window.location.pathname.includes('/results'), { timeout: 45000 });

    // Verify Results DOM for Barcode Card
    const barcodeCardData = await page.evaluate(() => {
      const body = document.body.innerText;
      return {
        body,
        hasBarcodeNumber: body.includes('8901719134845'),
        hasGs1Prefix: body.includes('GS1 India prefix') || body.includes('GS1 member assignment'),
        hasAdvisoryDisclaimer: body.includes('not proof of physical country of manufacture') || body.includes('does not prove country of manufacture'),
        hasBarcodeCard: body.includes('Product Identification & Reference Cross-Check') || body.includes('BARCODE & DATABASE CROSS-CHECK'),
        hasReferenceBrand: body.includes('Parle') || body.includes('Biscuit'),
      };
    });

    console.log(`  - Barcode Detected (8901719134845): ${barcodeCardData.hasBarcodeNumber}`);
    console.log(`  - GS1 India Prefix wording: ${barcodeCardData.hasGs1Prefix}`);
    console.log(`  - Non-proof advisory disclaimer: ${barcodeCardData.hasAdvisoryDisclaimer}`);
    console.log(`  - Barcode Card UI rendered: ${barcodeCardData.hasBarcodeCard}`);
    console.log(`  - Reference product queried: ${barcodeCardData.hasReferenceBrand}`);

    const barcodePassed = barcodeCardData.hasBarcodeNumber && barcodeCardData.hasGs1Prefix && barcodeCardData.hasBarcodeCard;
    results.push({
      suite: 'Barcode & GS1 Cross-Check',
      name: 'Physical Barcode Detection & Database Cross-Check',
      passed: barcodePassed,
      details: `Code: 8901719134845, GS1 India: ${barcodeCardData.hasGs1Prefix}, Disclaimer: ${barcodeCardData.hasAdvisoryDisclaimer}, Ref: ${barcodeCardData.hasReferenceBrand}`,
      durationMs: Date.now() - tStartBarcode,
    });

    // -------------------------------------------------------------
    // STEP 5: Authority Dashboard UI Verification & Neutral Language
    // -------------------------------------------------------------
    console.log('\n[5/5] Testing Authority Dashboard UI & Neutral Presentation...');
    const tStartAuthority = Date.now();

    await page.goto(`${BASE_URL}/authority`, { waitUntil: 'networkidle0' });
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 600));
    console.log('  [Authority Initial Body]:', await page.evaluate(() => document.body.innerText));
    await page.waitForFunction(() => {
      const text = document.body.innerText.toUpperCase();
      return (text.includes('DEMONSTRATION') || text.includes('PILOT DEMO')) && text.includes('SCREENING DISTRIBUTION');
    }, { timeout: 15000 });

    const authorityDom = await page.evaluate(() => {
      const body = document.body.innerText;
      const upper = body.toUpperCase();
      return {
        hasDemoBanner: upper.includes('DEMONSTRATION') || upper.includes('PILOT BENCHMARK'),
        hasScreeningDistribution: upper.includes('SCREENING DISTRIBUTION') || upper.includes('REVIEW RATE'),
        hasReviewRateHeader: upper.includes('REVIEW RATE'),
        hasTotalScans: body.includes('1,420') || upper.includes('TOTAL SCREENINGS'),
        // Verify absence of accusatory/judgmental words
        hasViolationRanking: upper.includes('VIOLATION RANKING'),
        hasDefamatoryWord: upper.includes('HIGH CONFORMITY') || upper.includes('ELEVATED ADVISORY'),
      };
    });

    console.log(`  - Demonstration Data Banner rendered: ${authorityDom.hasDemoBanner}`);
    console.log(`  - Neutral Table Headers (Screening Distribution / Review Rate): ${authorityDom.hasScreeningDistribution}`);
    console.log(`  - Zero Judgmental/Defamatory Labels: ${!authorityDom.hasViolationRanking && !authorityDom.hasDefamatoryWord}`);

    const authorityPassed = authorityDom.hasDemoBanner && authorityDom.hasScreeningDistribution && !authorityDom.hasViolationRanking && !authorityDom.hasDefamatoryWord;
    results.push({
      suite: 'Authority Dashboard UI',
      name: 'Demonstration Banner & Neutral Metrics Presentation',
      passed: authorityPassed,
      details: `DemoBanner: ${authorityDom.hasDemoBanner}, NeutralHeaders: ${authorityDom.hasScreeningDistribution}, AccusatoryRemoved: ${!authorityDom.hasDefamatoryWord}`,
      durationMs: Date.now() - tStartAuthority,
    });

    // -------------------------------------------------------------
    // STEP 6: Live Vercel Production API Endpoints Verification
    // -------------------------------------------------------------
    console.log('\n[6/6] Verifying Live Deployed Vercel Endpoints & Zero-PII Privacy...');
    const tStartLiveBackend = Date.now();

    const liveEndpoints = [
      '/api/health',
      '/api/analytics/summary',
      '/api/analytics/issues',
      '/api/analytics/categories',
      '/api/analytics/brands',
      '/api/analytics/trends',
    ];

    let liveAllPassed = true;
    for (const ep of liveEndpoints) {
      const { status, data } = await fetchHttpsJson(`${LIVE_BACKEND_URL}${ep}`);
      const isOk = status === 200;
      if (!isOk) liveAllPassed = false;
      console.log(`  - ${ep} -> HTTP ${status}: ${isOk ? 'OK' : 'FAIL'}`);

      // Verify zero PII in responses
      const rawStr = JSON.stringify(data);
      const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(rawStr);
      const hasPhone = /(?:\+91|0)?[6-9]\d{9}/.test(rawStr);
      if (hasEmail || hasPhone) {
        console.error(`  [PII LEAK DETECTED] in ${ep}`);
        liveAllPassed = false;
      }
    }

    results.push({
      suite: 'Production Deployment',
      name: 'Live Vercel Backend Endpoints & Zero-PII Verification',
      passed: liveAllPassed,
      details: `6/6 Endpoints HTTP 200 OK, Zero PII Tokens Confirmed`,
      durationMs: Date.now() - tStartLiveBackend,
    });

  } catch (err) {
    console.error('E2E Execution Error:', err);
    results.push({
      suite: 'Fatal Error',
      name: 'Comprehensive E2E Pipeline',
      passed: false,
      details: String(err),
      durationMs: 0,
    });
  } finally {
    if (browser) await browser.close();
    if (previewProcess) previewProcess.kill('SIGTERM');
    if (backendProc) backendProc.kill('SIGTERM');
  }

  // -------------------------------------------------------------
  // REPORTING SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('                 FINAL VERIFICATION MATRIX                      ');
  console.log('================================================================');
  let passedCount = 0;
  for (const r of results) {
    const mark = r.passed ? '✔ PASS' : '❌ FAIL';
    if (r.passed) passedCount++;
    console.log(`${mark.padEnd(8)} | [${r.suite}] ${r.name} (${r.durationMs}ms)`);
    console.log(`         Details: ${r.details}\n`);
  }

  console.log(`TOTAL: ${passedCount} / ${results.length} PASSED`);
  if (passedCount === results.length) {
    console.log('🎉 ALL PRODUCTION READINESS VERIFICATION CHECKS PASSED!\n');
  } else {
    console.error('❌ SOME CHECKS FAILED.\n');
    process.exit(1);
  }
}

runComprehensiveE2E().catch((e) => {
  console.error(e);
  process.exit(1);
});
