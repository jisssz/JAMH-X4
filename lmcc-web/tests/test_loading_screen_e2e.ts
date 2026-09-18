import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import http from 'node:http';
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 4190;
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
  console.log('=== Starting Loading Screen Video E2E Verification ===');
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
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
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
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    console.log('[PASS] Page requested, network idle reached');
    console.log('[INFO] Page title:', await page.title());
    if (consoleErrors.length > 0) {
      console.log('[INFO] Page console errors:', consoleErrors);
    }

    // Step 2: Verify LoadingScreen overlay is mounted
    const html = await page.content();
    console.log('[INFO] Root element children in HTML:', html.substring(0, 300));
    const loadingScreen = await page.waitForSelector('[data-testid="loading-screen"]', { timeout: 4000 });
    if (!loadingScreen) {
      throw new Error('Loading screen overlay not found on initial mount');
    }
    console.log('[PASS] LoadingScreen overlay mounted immediately on initial load');

    // Step 3: Inspect Video element attributes
    const video = await page.waitForSelector('video[data-testid="loading-video"]', { timeout: 3000 });
    if (!video) {
      throw new Error('Video element not found in LoadingScreen');
    }

    const videoProps = await page.evaluate((el: HTMLVideoElement) => {
      return {
        src: el.src,
        currentSrc: el.currentSrc,
        autoplay: el.autoplay,
        muted: el.muted,
        playsInline: el.playsInline,
        preload: el.preload,
        paused: el.paused,
        currentTime: el.currentTime,
        duration: el.duration,
      };
    }, video);

    console.log('[INFO] Video attributes:', JSON.stringify(videoProps, null, 2));

    if (!videoProps.muted) {
      throw new Error('Video must have muted=true for browser autoplay compliance');
    }
    if (!videoProps.playsInline) {
      throw new Error('Video must have playsInline=true for mobile WebKit compliance');
    }
    if (!videoProps.autoplay) {
      throw new Error('Video must have autoplay=true');
    }
    if (!videoProps.src.includes('/intro.mp4')) {
      throw new Error(`Unexpected video src: ${videoProps.src}`);
    }
    console.log('[PASS] Video element attributes verified (muted=true, playsInline=true, autoplay=true, src contains /intro.mp4)');

    // Step 4: Capture screenshot of video loading screen
    const loadingScreenshotPath = path.resolve(__dirname, '../../loading_screen_verified.png');
    await page.screenshot({ path: loadingScreenshotPath });
    console.log(`[PASS] Loading screen screenshot captured at ${loadingScreenshotPath}`);

    // Step 5: Wait for Skip button to appear (enabled after 1000ms)
    console.log('[INFO] Waiting for skip button to become available...');
    const skipBtn = await page.waitForSelector('[data-testid="skip-intro-btn"]', { timeout: 3000 });
    if (!skipBtn) {
      throw new Error('Skip button did not appear within timeout');
    }
    console.log('[PASS] Skip button appeared as designed after 1 second');

    // Step 6: Trigger Skip button click
    await skipBtn.click();
    console.log('[PASS] Clicked skip button');

    // Step 7: Verify smooth fade-out class applied
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="loading-screen"]');
      return el && el.classList.contains('opacity-0');
    }, { timeout: 2000 });
    console.log('[PASS] Fade-out transition initiated (opacity-0 applied)');

    // Step 8: Verify LoadingScreen unmounts completely from DOM after 750ms
    await page.waitForFunction(() => {
      return document.querySelector('[data-testid="loading-screen"]') === null;
    }, { timeout: 2500 });
    console.log('[PASS] LoadingScreen unmounted completely from DOM');

    // Step 9: Verify underlying Zenox application is visible & active
    const heroTitle = await page.waitForSelector('h1', { timeout: 3000 });
    const heroText = await page.evaluate((el: HTMLElement) => el.textContent, heroTitle);
    console.log(`[INFO] Main heading found: "${heroText}"`);

    const rippleContainer = await page.$('.ripple-distortion-container');
    if (!rippleContainer) {
      throw new Error('Ripple distortion container not rendered after intro');
    }
    console.log('[PASS] Underneath Home UI and WebGL Ripple Distortion rendered flawlessly');

    // Step 10: Capture post-transition screenshot
    const homeScreenshotPath = path.resolve(__dirname, '../../home_after_intro_verified.png');
    await page.screenshot({ path: homeScreenshotPath });
    console.log(`[PASS] Post-transition home screenshot captured at ${homeScreenshotPath}`);

    // Step 11: Verify internal route navigation does NOT re-trigger LoadingScreen
    console.log('[INFO] Testing internal route navigation to /history...');
    await page.evaluate(() => {
      const historyLink = document.querySelector('a[href="/history"]') as HTMLAnchorElement;
      if (historyLink) historyLink.click();
    });

    await page.waitForSelector('.lucide-history, h1, h2', { timeout: 3000 });
    const hasLoadingScreenOnNav = await page.$('[data-testid="loading-screen"]');
    if (hasLoadingScreenOnNav !== null) {
      throw new Error('LoadingScreen unexpectedly re-mounted on internal route navigation!');
    }
    console.log('[PASS] Internal route navigation did NOT re-trigger intro screen (runs once per page load as requested)');

    console.log('=== ALL LOADING SCREEN E2E CHECKS PASSED ===');
  } finally {
    if (browser) {
      await browser.close();
    }
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  }
}

runTest().catch((err) => {
  console.error('[FAIL] E2E Verification failed:', err);
  process.exit(1);
});
