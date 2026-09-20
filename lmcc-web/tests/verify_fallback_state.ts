import puppeteer from "puppeteer-core";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.env.PORT || 4180;
const BASE_URL = `http://localhost:${PORT}`;
const ARTIFACT_DIR = "/Users/jisshajan/.gemini/antigravity/brain/6da9c924-52f9-4624-88b4-1a6eef23a4b8";

async function main() {
  console.log("Launching Chrome with camera access disabled to test fallback UI...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--deny-permission-prompts",
    ],
  });

  const page = await browser.newPage();
  // Ensure getUserMedia fails
  await page.evaluateOnNewDocument(() => {
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException("Permission denied", "NotAllowedError"));
    }
  });

  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/scan`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));

  const fallbackPath = `${ARTIFACT_DIR}/scan_camera_unavailable_desktop.png`;
  await page.screenshot({ path: fallbackPath, fullPage: true });
  console.log("✓ Captured genuine camera unavailable fallback state at:", fallbackPath);

  // Also capture mobile fallback state
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise((r) => setTimeout(r, 500));
  const fallbackMobilePath = `${ARTIFACT_DIR}/scan_camera_unavailable_mobile.png`;
  await page.screenshot({ path: fallbackMobilePath, fullPage: true });
  console.log("✓ Captured mobile camera unavailable fallback state at:", fallbackMobilePath);

  await browser.close();
}

main().catch((err) => {
  console.error("Error verifying fallback state:", err);
  process.exit(1);
});
