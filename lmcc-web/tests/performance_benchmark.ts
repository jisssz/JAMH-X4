import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorker } from 'tesseract.js';
import { parseLabel } from '../src/services/parser/fieldParser';
import { RulesEngine } from '../src/services/rules/rulesEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMAGES_DIR = path.join(__dirname, 'fixtures', 'real_images');

interface IterationTimings {
  iteration: number;
  t_worker_init: number;
  t_model_ready: number;
  t_ocr_pass1: number;
  t_ocr_pass2: number;
  t_parse: number;
  t_rules: number;
  t_total_unified: number;
  heapUsedMb: number;
}

function calculateMedian(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function summarizeMetric(arr: number[]) {
  return {
    min: Math.min(...arr),
    median: calculateMedian(arr),
    max: Math.max(...arr),
  };
}

async function runBenchmark(iterations = 5) {
  console.log(`=== Starting Rigorous OCR Benchmark (${iterations} Iterations) ===`);
  const imagePath1 = path.join(IMAGES_DIR, '01_english_biscuit.png');
  const imagePath2 = path.join(IMAGES_DIR, '05_noisy_foil_snack.png');
  const buffer1 = fs.readFileSync(imagePath1);
  const buffer2 = fs.readFileSync(imagePath2);

  const runs: IterationTimings[] = [];

  for (let i = 1; i <= iterations; i++) {
    const memStart = process.memoryUsage().heapUsed;

    // UNIFIED START
    const t_unified_start = Date.now();

    // 1. Worker creation
    const t0 = Date.now();
    const worker = await createWorker('eng');
    const t_worker_init = Date.now() - t0;

    // 2. Model ready
    const t1 = Date.now();
    // In Tesseract.js, createWorker('eng') loads worker + model.
    const t_model_ready = Date.now() - t1;

    // 3. OCR Pass 1 (Clear image)
    const t2 = Date.now();
    const ret1 = await worker.recognize(buffer1);
    const t_ocr_pass1 = Date.now() - t2;

    // 4. OCR Pass 2 (Simulated dual-pass on noisy image)
    const t3 = Date.now();
    await worker.recognize(buffer2);
    const t_ocr_pass2 = Date.now() - t3;

    // 5. Parse
    const t4 = Date.now();
    const parsed = parseLabel(ret1.data.text || '');
    const t_parse = Date.now() - t4;

    // 6. Rules
    const t5 = Date.now();
    const engine = new RulesEngine();
    engine.evaluate(parsed);
    const t_rules = Date.now() - t5;

    // UNIFIED END
    const t_total_unified = Date.now() - t_unified_start;

    await worker.terminate();
    const heapUsedMb = Math.round(process.memoryUsage().heapUsed / (1024 * 1024));

    runs.push({
      iteration: i,
      t_worker_init,
      t_model_ready,
      t_ocr_pass1,
      t_ocr_pass2,
      t_parse,
      t_rules,
      t_total_unified,
      heapUsedMb,
    });

    console.log(
      `Iteration ${i}/${iterations}: Worker=${t_worker_init}ms, Pass1=${t_ocr_pass1}ms, Pass2=${t_ocr_pass2}ms, Parse=${t_parse}ms, Unified Total=${t_total_unified}ms, V8 Heap=${heapUsedMb}MB`
    );
  }

  const summary = {
    iterations,
    hardwareEnvironment: 'Apple Silicon (macOS arm64)',
    timingsMs: {
      T_worker_init: summarizeMetric(runs.map((r) => r.t_worker_init)),
      T_model_ready: summarizeMetric(runs.map((r) => r.t_model_ready)),
      T_ocr_pass1: summarizeMetric(runs.map((r) => r.t_ocr_pass1)),
      T_ocr_pass2: summarizeMetric(runs.map((r) => r.t_ocr_pass2)),
      T_parse: summarizeMetric(runs.map((r) => r.t_parse)),
      T_rules: summarizeMetric(runs.map((r) => r.t_rules)),
      T_total_unified: summarizeMetric(runs.map((r) => r.t_total_unified)),
    },
    memory: {
      v8JavaScriptHeapUsedMb: summarizeMetric(runs.map((r) => r.heapUsedMb)),
      memoryMeasurementLimitationNotice:
        'Measured JavaScript heap usage reflects V8 engine memory only. WebAssembly linear memory buffers and browser process Resident Set Size (RSS) were not independently measured.',
    },
    individualRuns: runs,
  };

  console.log('\n=== STATISTICAL BENCHMARK SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
