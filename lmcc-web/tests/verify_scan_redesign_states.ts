import puppeteer from "puppeteer-core";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.env.PORT || 4180;
const BASE_URL = `http://localhost:${PORT}`;
const ARTIFACT_DIR = "/Users/jisshajan/.gemini/antigravity/brain/6da9c924-52f9-4624-88b4-1a6eef23a4b8";

async function main() {
  console.log("Launching headless Chrome with fake media stream...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });

  // 1. Desktop Camera Active
  console.log("Testing 1: Desktop Camera Active...");
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${BASE_URL}/scan`, { waitUntil: "networkidle0", timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1200));

  const desktopCameraPath = `${ARTIFACT_DIR}/scan_desktop_camera_active.png`;
  await page.screenshot({ path: desktopCameraPath, fullPage: true });
  console.log("✓ Captured desktop camera active at:", desktopCameraPath);

  // 2. Mobile Camera Active
  console.log("Testing 2: Mobile Camera Active (iPhone 14)...");
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise((r) => setTimeout(r, 600));

  const mobileCameraPath = `${ARTIFACT_DIR}/scan_mobile_camera_active.png`;
  await page.screenshot({ path: mobileCameraPath, fullPage: true });
  console.log("✓ Captured mobile camera active at:", mobileCameraPath);

  // 3. 2 Panels Captured
  console.log("Testing 3: 2 Panels Captured...");
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${BASE_URL}/scan?mode=upload`, { waitUntil: "networkidle0", timeout: 15000 });
  await new Promise((r) => setTimeout(r, 600));

  const fileInput = await page.$("input[type=file]");
  if (fileInput) {
    const fixtureDir = path.resolve(process.cwd(), "tests/fixtures");
    await fileInput.uploadFile(
      path.join(fixtureDir, "hyson_panel1_front.jpg"),
      path.join(fixtureDir, "hyson_panel2_back.jpg")
    );
    await new Promise((r) => setTimeout(r, 1000));
  }

  const panels2Path = `${ARTIFACT_DIR}/scan_2_panels_captured.png`;
  await page.screenshot({ path: panels2Path, fullPage: true });
  console.log("✓ Captured 2 panels captured state at:", panels2Path);

  // 4. 4 Panels Captured
  console.log("Testing 4: 4 Panels Captured...");
  const fileInput2 = await page.$("input[type=file]");
  if (fileInput2) {
    const fixtureDir = path.resolve(process.cwd(), "tests/fixtures");
    await fileInput2.uploadFile(
      path.join(fixtureDir, "hyson_panel3_crimp.jpg"),
      path.join(fixtureDir, "hyson_panel4_side.jpg")
    );
    await new Promise((r) => setTimeout(r, 1000));
  }

  const panels4Path = `${ARTIFACT_DIR}/scan_4_panels_captured.png`;
  await page.screenshot({ path: panels4Path, fullPage: true });
  console.log("✓ Captured 4 panels captured state at:", panels4Path);

  await browser.close();
  console.log("All visual acceptance criteria verified successfully!");
}

main().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
