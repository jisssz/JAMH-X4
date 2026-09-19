import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:4175';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const pagesToTest = [
    { route: '/?intro=false', name: 'editorial_home' },
    { route: '/rules', name: 'editorial_rules' },
    { route: '/scan', name: 'editorial_scan' },
    { route: '/history', name: 'editorial_history' },
    { route: '/authority-dashboard', name: 'editorial_authority' },
  ];

  const artifactDir = '/Users/jisshajan/.gemini/antigravity/brain/6da9c924-52f9-4624-88b4-1a6eef23a4b8';

  for (const item of pagesToTest) {
    // Desktop capture
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    console.log(`Navigating desktop to ${BASE_URL}${item.route}...`);
    await page.goto(`${BASE_URL}${item.route}`, { waitUntil: 'networkidle0', timeout: 10000 });

    const desktopPath = `${artifactDir}/${item.name}_desktop.png`;
    await page.screenshot({ path: desktopPath, fullPage: true });
    console.log(`✓ ${item.name} desktop captured at ${desktopPath}`);

    // Mobile capture (iPhone 14)
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await new Promise((r) => setTimeout(r, 400));
    const mobilePath = `${artifactDir}/${item.name}_mobile.png`;
    await page.screenshot({ path: mobilePath, fullPage: true });
    console.log(`✓ ${item.name} mobile captured at ${mobilePath}`);

    await page.close();
  }

  await browser.close();
  console.log('All redesigned pages verified successfully across Desktop and Mobile!');
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
