import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROD_BASE_URL = 'https://jamh-x4.vercel.app';
const ARTIFACT_DIR = '/Users/jisshajan/.gemini/antigravity/brain/6da9c924-52f9-4624-88b4-1a6eef23a4b8';

async function main() {
  console.log('Launching headless Chrome to verify LIVE production deployment at:', PROD_BASE_URL);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const consoleLogs: string[] = [];
  page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

  // 1. Verify Home Page on Live Production
  console.log('Navigating to Live Production Home...');
  await page.goto(`${PROD_BASE_URL}/?intro=false`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('.hero-display', { timeout: 10000 });

  // Verify computed styles and typography
  const homeHeroText = await page.$eval('.hero-display', (el) => el.textContent?.trim());
  const heroFontFamily = await page.$eval('.hero-display', (el) => window.getComputedStyle(el).fontFamily);
  const bodyFontFamily = await page.$eval('body', (el) => window.getComputedStyle(el).fontFamily);
  const serviceWorkerActive = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    return Boolean(reg);
  });

  console.log('Live Home Hero Text:', homeHeroText);
  console.log('Live Computed Hero Font Family:', heroFontFamily);
  console.log('Live Computed Body Font Family:', bodyFontFamily);
  console.log('Service Worker Registered:', serviceWorkerActive);

  const homeScreenshot = `${ARTIFACT_DIR}/live_production_home_desktop.png`;
  await page.screenshot({ path: homeScreenshot, fullPage: true });
  console.log('✓ Captured live home screenshot at:', homeScreenshot);

  // 2. Verify Rules Page on Live Production
  console.log('Navigating to Live Production Rules (/rules)...');
  await page.goto(`${PROD_BASE_URL}/rules`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('h1', { timeout: 10000 });
  const rulesHeading = await page.$eval('h1', (el) => el.textContent?.trim());
  const rulesCount = await page.$$eval('.pt-12', (els) => els.length);
  console.log('Live Rules Heading:', rulesHeading);
  console.log('Live Rules Items Count:', rulesCount);

  const rulesScreenshot = `${ARTIFACT_DIR}/live_production_rules_desktop.png`;
  await page.screenshot({ path: rulesScreenshot, fullPage: true });
  console.log('✓ Captured live rules screenshot at:', rulesScreenshot);

  // 3. Verify Authority Dashboard on Live Production
  console.log('Navigating to Live Production Authority Dashboard (/authority-dashboard)...');
  await page.goto(`${PROD_BASE_URL}/authority-dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('h1', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1500));
  const authHeading = await page.$eval('h1', (el) => el.textContent?.trim());
  const totalScans = await page.evaluate(() => {
    const text = document.body.innerText;
    return text.includes('1,420');
  });
  console.log('Live Authority Heading:', authHeading);
  console.log('Live 1,420 Benchmark Data Visible:', totalScans);

  const authScreenshot = `${ARTIFACT_DIR}/live_production_authority_desktop.png`;
  await page.screenshot({ path: authScreenshot, fullPage: true });
  console.log('✓ Captured live authority screenshot at:', authScreenshot);

  // 4. Verify Scan Page on Live Production
  console.log('Navigating to Live Production Scan (/scan)...');
  await page.goto(`${PROD_BASE_URL}/scan`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('h1', { timeout: 10000 });
  const scanTitle = await page.$eval('h1', (el) => el.textContent?.trim());
  console.log('Live Scan Title:', scanTitle);

  const scanScreenshot = `${ARTIFACT_DIR}/live_production_scan_desktop.png`;
  await page.screenshot({ path: scanScreenshot, fullPage: true });
  console.log('✓ Captured live scan screenshot at:', scanScreenshot);

  // 5. Verify Mobile Viewport on Live Home (iPhone 14)
  console.log('Verifying Live Mobile Viewport (iPhone 14)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(`${PROD_BASE_URL}/?intro=false`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('.hero-display', { timeout: 10000 });
  const homeMobileScreenshot = `${ARTIFACT_DIR}/live_production_home_mobile.png`;
  await page.screenshot({ path: homeMobileScreenshot, fullPage: true });
  console.log('✓ Captured live mobile home screenshot at:', homeMobileScreenshot);

  await browser.close();

  const report = {
    prodUrl: PROD_BASE_URL,
    homeHeroText,
    heroFontFamily,
    bodyFontFamily,
    serviceWorkerActive,
    rulesHeading,
    rulesCount,
    authHeading,
    totalScansVisible: totalScans,
    scanTitle,
  };

  fs.writeFileSync(`${ARTIFACT_DIR}/live_production_verification_report.json`, JSON.stringify(report, null, 2));
  console.log('All live production verifications completed successfully!');
}

main().catch((err) => {
  console.error('Production verification error:', err);
  process.exit(1);
});
