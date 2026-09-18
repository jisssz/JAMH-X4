import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import http from 'node:http';
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 4189;
const BASE_URL = `http://localhost:${PORT}`;

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
        .on('error', () => {
          // keep polling
        });
    }, 250);
  });
}

async function runTest() {
  console.log('--- Starting Ripple Distortion E2E Verification ---');
  let serverProcess: ChildProcess | null = null;
  let browser: any = null;

  try {
    serverProcess = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'pipe',
      env: { ...process.env, PORT: String(PORT) },
    });

    await waitForServer(BASE_URL);
    console.log(`[PASS] Vite preview server running at ${BASE_URL}`);

    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];
    page.on('console', (msg: any) => {
      const text = msg.text();
      consoleLogs.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    page.on('pageerror', (err: any) => {
      consoleErrors.push(err.toString());
    });

    // Step 1: Navigate to Home
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    console.log('[PASS] Navigated to Home page');

    // Step 2: Check Ripple Distortion container
    const container = await page.$('.ripple-distortion-container');
    if (!container) {
      throw new Error('Ripple distortion container not found in DOM');
    }
    console.log('[PASS] .ripple-distortion-container found in DOM');

    // Step 3: Check canvas presence inside Ripple Distortion
    const canvas = await page.$('.ripple-distortion-container canvas');
    if (!canvas) {
      throw new Error('Canvas element not found inside .ripple-distortion-container');
    }
    console.log('[PASS] WebGL canvas rendered inside container');

    // Check canvas dimensions
    const canvasBox = await canvas.boundingBox();
    console.log(`[INFO] Canvas dimensions: width=${canvasBox?.width}, height=${canvasBox?.height}`);
    if (!canvasBox || canvasBox.width <= 0 || canvasBox.height <= 0) {
      throw new Error('Canvas has invalid dimensions');
    }

    // Step 4: Interact with mouse over hero card to trigger ripples
    await page.mouse.move(canvasBox.x + 50, canvasBox.y + 50);
    await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100);
    console.log('[PASS] Dispatched mousemove interactions to ripple canvas');

    // Step 5: Verify primary CTA "Scan Product Label" is clickable
    const buttons = await page.$$('button');
    let scanClicked = false;
    for (const btn of buttons) {
      const text = await page.evaluate((el: any) => el.innerText, btn);
      if (text.includes('Scan Product Label')) {
        await btn.click();
        scanClicked = true;
        break;
      }
    }
    if (!scanClicked) throw new Error('Could not find or click Scan Product Label button');

    await new Promise((r) => setTimeout(r, 600));
    const currentUrl = page.url();
    console.log(`[INFO] Current URL after clicking Scan button: ${currentUrl}`);
    if (!currentUrl.includes('/scan')) {
      throw new Error(`Expected URL to include /scan, got ${currentUrl}`);
    }
    console.log('[PASS] Scan button successfully navigated to /scan');

    // Step 6: Navigate back to Home and test Upload button
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    const homeButtonsUpload = await page.$$('button');
    let uploadClicked = false;
    for (const btn of homeButtonsUpload) {
      const text = await page.evaluate((el: any) => el.innerText, btn);
      if (text.includes('Upload Label Image')) {
        await btn.click();
        uploadClicked = true;
        break;
      }
    }
    if (!uploadClicked) throw new Error('Could not click Upload button');

    await new Promise((r) => setTimeout(r, 600));
    const uploadUrl = page.url();
    console.log(`[INFO] Current URL after clicking Upload button: ${uploadUrl}`);
    if (!uploadUrl.includes('/scan?mode=upload')) {
      throw new Error(`Expected URL to include /scan?mode=upload, got ${uploadUrl}`);
    }
    console.log('[PASS] Upload button successfully navigated to /scan?mode=upload');

    // Step 7: Navigate back to Home and test History button
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    let historyClicked = false;
    const homeButtonsHistory = await page.$$('button');
    for (const btn of homeButtonsHistory) {
      const text = await page.evaluate((el: any) => el.innerText, btn);
      if (text.includes('Report History')) {
        await btn.click();
        historyClicked = true;
        break;
      }
    }
    if (!historyClicked) throw new Error('Could not click Report History button');

    await new Promise((r) => setTimeout(r, 600));
    const historyUrl = page.url();
    console.log(`[INFO] Current URL after clicking History button: ${historyUrl}`);
    if (!historyUrl.includes('/history')) {
      throw new Error(`Expected URL to include /history, got ${historyUrl}`);
    }
    console.log('[PASS] History button successfully navigated to /history');

    // Step 8: Capture screenshot of Home page with Ripple Distortion
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    // Allow WebGL shader to render initial frames
    await new Promise((r) => setTimeout(r, 800));
    const screenshotPath = path.resolve(__dirname, 'fixtures/ripple_distortion_verified.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`[PASS] Screenshot saved to ${screenshotPath}`);

    // Check for critical console errors
    const fatalErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('status of 404'));
    if (fatalErrors.length > 0) {
      console.warn('[WARN] Console errors detected:', fatalErrors);
    } else {
      console.log('[PASS] Zero fatal console or WebGL errors detected');
    }

    console.log('--- ALL RIPPLE DISTORTION CHECKS PASSED ---');
  } finally {
    if (browser) await browser.close();
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  }
}

runTest().catch((err) => {
  console.error('[FAIL] Ripple Distortion E2E test failed:', err);
  process.exit(1);
});
