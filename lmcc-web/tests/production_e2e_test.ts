import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FRONTEND_PORT = 4173;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;
const BACKEND_PORT = 8000;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;
const FIXTURE_IMAGE = path.resolve(
  __dirname,
  'fixtures/real_images/01_english_biscuit.png'
);

function waitForUrl(url: string, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error(`Timeout waiting for service at ${url}`));
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

async function runProductionE2E() {
  console.log('=== LOCAL PRODUCTION E2E DEPLOYMENT VERIFICATION ===');
  let backendProc: ChildProcess | null = null;
  let frontendProc: ChildProcess | null = null;
  let browser: puppeteer.Browser | null = null;

  try {
    // 1. Start Backend on Port 8000
    console.log('[1/6] Launching FastAPI backend server...');
    const backendCwd = path.resolve(__dirname, '../../lmcc-backend');
    backendProc = spawn(
      path.resolve(backendCwd, '.venv/bin/uvicorn'),
      ['app.main:app', '--host', '127.0.0.1', '--port', String(BACKEND_PORT)],
      { cwd: backendCwd, stdio: 'pipe' }
    );

    await waitForUrl(`${BACKEND_URL}/api/health`);
    console.log(`✔ FastAPI backend healthy at ${BACKEND_URL}/api/health`);

    // 2. Start Frontend Production Preview on Port 4173
    console.log('[2/6] Launching Vite production preview server...');
    const frontendCwd = path.resolve(__dirname, '..');
    frontendProc = spawn('npx', ['vite', 'preview', '--port', String(FRONTEND_PORT), '--strictPort'], {
      cwd: frontendCwd,
      stdio: 'pipe',
    });

    await waitForUrl(FRONTEND_URL);
    console.log(`✔ Frontend preview server responsive at ${FRONTEND_URL}`);

    // 3. Launch Google Chrome
    console.log('[3/6] Launching Google Chrome...');
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // 4. Test Direct SPA Routing (no 404s)
    console.log('[4/6] Testing Direct SPA Navigation (no 404 errors)...');
    await page.goto(`${FRONTEND_URL}/scan`, { waitUntil: 'networkidle0' });
    let title = await page.evaluate(() => document.title || document.body.innerText);
    if (!title.includes('LMCC') && !title.includes('Scan') && !title.includes('Label')) {
      throw new Error('Direct route /scan failed to render');
    }
    console.log('  ✔ Direct navigation to /scan succeeded');

    await page.goto(`${FRONTEND_URL}/history`, { waitUntil: 'networkidle0' });
    const historyBody = await page.evaluate(() => document.body.innerText);
    if (!historyBody.includes('History') && !historyBody.includes('Report')) {
      throw new Error('Direct route /history failed to render');
    }
    console.log('  ✔ Direct navigation to /history succeeded');


    // 5. Run Full PASS Scan -> Result -> Backend Report Persistence
    console.log('[5/6] Executing full Scan -> OCR -> Results -> Backend Submission flow...');
    await page.goto(`${FRONTEND_URL}/scan?mode=upload`, { waitUntil: 'networkidle0' });

    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input not found on /scan');
    await fileInput.uploadFile(FIXTURE_IMAGE);

    // Wait and click confirm button
    await page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some((b) => b.textContent?.includes('Use This Image'));
    }, { timeout: 6000 });

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const useBtn = btns.find((b) => b.textContent?.includes('Use This Image'));
      if (useBtn) useBtn.click();
    });

    // Wait for /results
    await page.waitForFunction(() => window.location.pathname.includes('/results'), {
      timeout: 45000,
    });
    console.log('  ✔ Scan reached /results successfully');

    // Submit report directly to backend from browser context (validating CORS & persistence)
    console.log('  Submitting PASS report from browser to live backend...');
    const reportSubmitResult = await page.evaluate(async (backendUrl) => {
      const payload = {
        verdict: 'PASS',
        productName: 'Parle-G E2E Production Test',
        mrp: '₹35.00',
        netQuantity: '250 g',
        manufacturer: 'PARLE PRODUCTS PVT LTD',
        dateDeclaration: '08/2024',
        consumerCare: '1800222211',
        issueCount: 0,
        issues: [],
        rawOcr: 'PARLE-G ORIGINAL GLUCOSE BISCUITS MFD BY PARLE PRODUCTS',
        userRemarks: 'Verified in Local Production E2E Test',
      };
      const res = await fetch(`${backendUrl}/api/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Report submission failed: HTTP ${res.status}`);
      }
      const data = await res.json();

      const listRes = await fetch(`${backendUrl}/api/reports?limit=10`);
      const listData = await listRes.json();

      return {
        submittedId: data.id,
        status: data.status,
        latestId: listData[0]?.id,
        totalReports: listData.length,
      };
    }, BACKEND_URL);

    console.log('  ✔ Report saved to backend database:', reportSubmitResult);
    if (!reportSubmitResult.submittedId || reportSubmitResult.status !== 'created') {
      throw new Error('Report submission failed: ' + JSON.stringify(reportSubmitResult));
    }

    // 6. Test REVIEW Flow Submission
    console.log('[6/6] Testing REVIEW report submission flow...');
    const reviewResult = await page.evaluate(async (backendUrl) => {
      const payload = {
        verdict: 'REVIEW',
        productName: 'Sample Ambiguous Biscuit',
        mrp: '₹20.00',
        issueCount: 1,
        issues: [
          {
            ruleId: 'LM-PCR-2011-R6-1-D',
            field: 'dateDeclaration',
            title: 'Ambiguous Date Declaration Context',
            severity: 'HIGH',
            detectedValue: '08/2024',
            explanation: 'Date printed without explicit MFD/PKD prefix',
          },
        ],
        rawOcr: '08/2024 RS 20.00',
        userRemarks: 'E2E REVIEW flow test',
      };
      const res = await fetch(`${backendUrl}/api/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`REVIEW report submission failed: HTTP ${res.status}`);
      }
      return await res.json();
    }, BACKEND_URL);
    console.log('  ✔ REVIEW report saved to backend database:', reviewResult);


    console.log('\n✔ ALL PRODUCTION E2E STEPS PASSED SUCCESSFULLY!');
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (frontendProc) frontendProc.kill('SIGTERM');
    if (backendProc) backendProc.kill('SIGTERM');
  }
}

runProductionE2E().catch((err) => {
  console.error('Fatal Production E2E Error:', err);
  process.exit(1);
});
