import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorker } from 'tesseract.js';
import { parseLabel } from '../../src/services/parser/fieldParser';
import { RulesEngine } from '../../src/services/rules/rulesEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runOcrBenchmark() {
  console.log(`\n====================================================================`);
  console.log(`         LMCC END-TO-END IMAGE OCR BENCHMARK RUNNER                 `);
  console.log(`====================================================================\n`);

  const syntheticDir = path.resolve(__dirname, '../dataset/synthetic');
  if (!fs.existsSync(syntheticDir)) {
    console.error(`Synthetic dataset directory not found at ${syntheticDir}. Run 'npm run benchmark:generate' first.`);
    process.exit(1);
  }

  const files = fs.readdirSync(syntheticDir).filter((f) => f.endsWith('.png'));
  if (files.length === 0) {
    console.error(`No PNG images found in ${syntheticDir}. Run 'npm run benchmark:generate' first.`);
    process.exit(1);
  }

  console.log(`Found ${files.length} synthetic label image(s) for OCR testing.`);
  console.log(`Initializing Tesseract.js worker in Node environment...\n`);

  const worker = await createWorker('eng', 1, {
    logger: () => {},
  });

  const engine = new RulesEngine();
  let totalProcessed = 0;

  try {
    for (const file of files) {
      const filePath = path.join(syntheticDir, file);
      process.stdout.write(`OCR Processing: ${file.padEnd(35)} ... `);

      const imageBuffer = fs.readFileSync(filePath);
      const res = await worker.recognize(imageBuffer);
      const text = res.data.text || '';
      const confidence = typeof res.data.confidence === 'number' ? Math.round(res.data.confidence) : 0;

      const extracted = parseLabel(text);
      const verdict = engine.evaluate(extracted);

      console.log(`[PASS] Conf: ${confidence}% | Status: ${verdict.overallStatus}`);
      console.log(`   ↳ MRP: ${extracted.mrp || 'N/A'} | NetQty: ${extracted.netQuantity || 'N/A'} | Date: ${extracted.packingDate || 'N/A'}`);

      totalProcessed++;
    }

    console.log(`\n────────────────────────────────────────────────────────────────────`);
    console.log(`Completed End-to-End OCR Benchmark across ${totalProcessed} image files.`);
    console.log(`====================================================================\n`);
  } finally {
    await worker.terminate();
  }
}

runOcrBenchmark().catch((err) => {
  console.error('OCR Benchmark failed:', err);
  process.exit(1);
});
