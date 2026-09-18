import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

interface SyntheticSpec {
  id: string;
  filename: string;
  title: string;
  declarations: {
    brand: string;
    product: string;
    mfg: string;
    address: string;
    netQty: string;
    date: string;
    mrp: string;
    contact: string;
  };
  style: {
    bg: string;
    color: string;
    fontFamily: string;
    contrastFilter?: string;
    blurFilter?: string;
    skewDeg?: number;
    borderStyle?: string;
  };
}

const SYNTHETIC_SPECS: SyntheticSpec[] = [
  {
    id: 'syn_01_clean',
    filename: 'syn_01_clean_standard.png',
    title: 'Clean Standard Biscuit Label',
    declarations: {
      brand: 'ABC FOODS',
      product: 'PREMIUM GLUCOSE BISCUITS',
      mfg: 'MFD BY: ABC FOODS PVT LTD',
      address: 'PLOT 42, PHASE 1, ELECTRONIC CITY, BANGALORE 560100',
      netQty: 'NET WEIGHT: 500 g',
      date: 'PKD: 06/2024',
      mrp: 'MRP: ₹ 120.00 (INCL. OF ALL TAXES)',
      contact: 'CONSUMER CARE: 1800-425-0000, care@abcfoods.com',
    },
    style: {
      bg: '#ffffff',
      color: '#000000',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      borderStyle: '2px solid #333333',
    },
  },
  {
    id: 'syn_02_dot_matrix',
    filename: 'syn_02_dot_matrix.png',
    title: 'Dot-Matrix Stamped Packaging Foil',
    declarations: {
      brand: 'ZENITH BAKERS',
      product: 'CRUNCHY CRACKERS',
      mfg: 'ZENITH BAKERS LTD',
      address: 'INDUSTRIAL ESTATE, CHENNAI 600032',
      netQty: 'NET QTY : 100 g',
      date: 'MFD . 04/2024',
      mrp: 'MRP Rs. 45.00 INCL ALL TAXES',
      contact: 'CONSUMER CELL: feedback@zenith.in',
    },
    style: {
      bg: '#e2e8f0',
      color: '#1e293b',
      fontFamily: 'Courier, monospace',
      borderStyle: '1px dashed #64748b',
    },
  },
  {
    id: 'syn_03_low_contrast',
    filename: 'syn_03_low_contrast.png',
    title: 'Low Contrast Faint Beverage Print',
    declarations: {
      brand: 'ORGANIC VIBES',
      product: 'HERBAL WELLNESS DRINK',
      mfg: 'ORGANIC VIBES LLP',
      address: 'SECTOR 18, GURGAON 122001',
      netQty: 'NET CONTENT : 200 ml',
      date: 'MFG DATE : 05/2024',
      mrp: 'MAX RETAIL PRICE ₹ 299.00 INCLUSIVE OF ALL TAXES',
      contact: 'CUSTOMER CARE : 0124-4998800',
    },
    style: {
      bg: '#d1d5db',
      color: '#6b7280',
      fontFamily: 'sans-serif',
      borderStyle: '1px solid #9ca3af',
    },
  },
  {
    id: 'syn_04_skewed_noisy',
    filename: 'syn_04_skewed_noisy.png',
    title: 'Skewed & Slightly Blurred Packaging',
    declarations: {
      brand: 'SUNSHINE SNACKS',
      product: 'ROASTED CASHEWS',
      mfg: 'MFD BY: SUNSHINE BAKERS',
      address: 'KOLKATA INDUSTRIAL ZONE 700088',
      netQty: 'NET WT: 150 g',
      date: 'PKD: 07/2024',
      mrp: 'MRP: ₹ 190.00 (INCL TAXES)',
      contact: 'HELPLINE: 1800345678',
    },
    style: {
      bg: '#f8fafc',
      color: '#0f172a',
      fontFamily: 'Arial, sans-serif',
      skewDeg: 2.5,
      blurFilter: 'blur(0.4px)',
      borderStyle: '2px solid #000',
    },
  },
];

async function generateSyntheticImages() {
  console.log(`\n====================================================================`);
  console.log(`         LMCC SYNTHETIC LABEL IMAGE GENERATOR                       `);
  console.log(`====================================================================\n`);

  const outputDir = path.resolve(__dirname, '../dataset/synthetic');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let browser: any = null;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 2 });

    for (const spec of SYNTHETIC_SPECS) {
      process.stdout.write(`Generating: ${spec.title.padEnd(45)} -> ${spec.filename} ... `);

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              margin: 0;
              padding: 40px;
              background: #111;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              box-sizing: border-box;
            }
            .label-card {
              width: 500px;
              padding: 24px;
              background-color: ${spec.style.bg};
              color: ${spec.style.color};
              font-family: ${spec.style.fontFamily};
              border: ${spec.style.borderStyle || '1px solid #ccc'};
              box-shadow: 0 4px 15px rgba(0,0,0,0.3);
              transform: rotate(${spec.style.skewDeg || 0}deg);
              filter: ${spec.style.blurFilter || 'none'};
              box-sizing: border-box;
            }
            .brand {
              font-size: 20px;
              font-weight: bold;
              letter-spacing: 1px;
              margin-bottom: 4px;
            }
            .product {
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 16px;
              text-transform: uppercase;
              border-bottom: 1px solid rgba(0,0,0,0.15);
              padding-bottom: 6px;
            }
            .declaration-row {
              font-size: 13px;
              line-height: 1.6;
              margin-bottom: 4px;
            }
            .statutory-mrp {
              font-size: 14px;
              font-weight: bold;
              margin-top: 8px;
            }
          </style>
        </head>
        <body>
          <div class="label-card" id="card">
            <div class="brand">${spec.declarations.brand}</div>
            <div class="product">${spec.declarations.product}</div>
            <div class="declaration-row">${spec.declarations.mfg}</div>
            <div class="declaration-row">${spec.declarations.address}</div>
            <div class="declaration-row">${spec.declarations.netQty}</div>
            <div class="declaration-row">${spec.declarations.date}</div>
            <div class="declaration-row statutory-mrp">${spec.declarations.mrp}</div>
            <div class="declaration-row">${spec.declarations.contact}</div>
          </div>
        </body>
        </html>
      `;

      await page.setContent(htmlContent, { waitUntil: 'load' });
      const cardEl = await page.$('#card');
      if (!cardEl) throw new Error('Card element not found in DOM');

      const outPath = path.join(outputDir, spec.filename);
      await cardEl.screenshot({ path: outPath });
      console.log(`[PASS]`);
    }

    console.log(`\n────────────────────────────────────────────────────────────────────`);
    console.log(`Successfully generated ${SYNTHETIC_SPECS.length} synthetic label image fixtures.`);
    console.log(`Target directory: ${outputDir}`);
    console.log(`====================================================================\n`);
  } finally {
    if (browser) await browser.close();
  }
}

generateSyntheticImages().catch((err) => {
  console.error('Synthetic generation failed:', err);
  process.exit(1);
});
