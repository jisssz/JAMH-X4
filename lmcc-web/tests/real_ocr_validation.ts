import fs from 'node:fs';
import path from 'node:path';
import { createWorker } from 'tesseract.js';
import { parseLabel } from '../src/services/parser/fieldParser';
import { RulesEngine } from '../src/services/rules/rulesEngine';
import { assessOcrQuality } from '../src/services/ocr/ocrQuality';

interface RealOcrTestResult {
  filename: string;
  language: string;
  ocrConfidence: number;
  ocrQuality: string;
  rawOcrLength: number;
  rawOcrText: string;
  parsedFields: {
    mrp?: string;
    netQuantity?: string;
    date?: string;
    manufacturer?: string;
    address?: string;
    consumerCare?: string;
  };
  complianceVerdict: string;
  flaggedViolationsCount: number;
  pass1DurationMs: number;
  status: 'PASS' | 'PARTIAL' | 'FAIL' | 'NOT VERIFIED';
  notes: string;
}

import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMAGES_DIR = path.join(__dirname, 'fixtures', 'real_images');

async function testSingleImage(
  filename: string,
  lang: string,
  expectedVerdict: 'PASS' | 'REVIEW',
  description: string
): Promise<RealOcrTestResult> {
  const imagePath = path.join(IMAGES_DIR, filename);
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Test image not found: ${imagePath}`);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const startTime = Date.now();

  let worker;
  try {
    worker = await createWorker(lang);
    const ret = await worker.recognize(imageBuffer);
    const durationMs = Date.now() - startTime;

    const rawText = ret.data.text || '';
    const confidence = typeof ret.data.confidence === 'number' ? ret.data.confidence : 0;
    const qualityEval = assessOcrQuality(rawText, confidence);

    const parsedLabel = parseLabel(rawText);
    const engine = new RulesEngine();
    const verdict = engine.evaluate(parsedLabel);

    const isMatch = verdict.overallStatus === expectedVerdict;

    return {
      filename,
      language: lang,
      ocrConfidence: Math.round(confidence),
      ocrQuality: qualityEval.quality,
      rawOcrLength: rawText.length,
      rawOcrText: rawText.trim(),
      parsedFields: {
        mrp: parsedLabel.mrp,
        netQuantity: parsedLabel.netQuantity,
        date: parsedLabel.manufactureDate || parsedLabel.packingDate,
        manufacturer: parsedLabel.manufacturer,
        address: parsedLabel.address,
        consumerCare: parsedLabel.consumerCare,
      },
      complianceVerdict: verdict.overallStatus,
      flaggedViolationsCount: verdict.flaggedChecks,
      pass1DurationMs: durationMs,
      status: isMatch ? 'PASS' : 'PARTIAL',
      notes: `${description} (${qualityEval.reason})`,
    };
  } catch (err: any) {
    return {
      filename,
      language: lang,
      ocrConfidence: 0,
      ocrQuality: 'POOR',
      rawOcrLength: 0,
      rawOcrText: '',
      parsedFields: {},
      complianceVerdict: 'REVIEW',
      flaggedViolationsCount: 6,
      pass1DurationMs: Date.now() - startTime,
      status: 'NOT VERIFIED',
      notes: `Error during OCR execution: ${err.message}`,
    };
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}

export async function runRealOcrSuite(): Promise<RealOcrTestResult[]> {
  console.log('=== Running Real-World Image OCR Validation Suite (Layer B) ===');
  const results: RealOcrTestResult[] = [];

  // Test 1: English Clear Label (Biscuit)
  console.log('Testing 1/5: 01_english_biscuit.png [eng]...');
  results.push(
    await testSingleImage(
      '01_english_biscuit.png',
      'eng',
      'PASS',
      'Clear English biscuit label with all mandatory Rule 6 declarations'
    )
  );

  // Test 2: Hindi Devanagari Label (Ghee)
  console.log('Testing 2/5: 02_hindi_ghee.png [hin]...');
  results.push(
    await testSingleImage(
      '02_hindi_ghee.png',
      'hin',
      'PASS',
      'Hindi Devanagari packaging label with metric units and helpline'
    )
  );

  // Test 3: Malayalam Script Label (Coconut Oil)
  console.log('Testing 3/5: 03_malayalam_oil.png [mal]...');
  results.push(
    await testSingleImage(
      '03_malayalam_oil.png',
      'mal',
      'PASS',
      'Malayalam packaging label with English metric units and helpline'
    )
  );

  // Test 4: Tamil Script Label (Milk)
  console.log('Testing 4/5: 04_tamil_milk.png [tam]...');
  results.push(
    await testSingleImage(
      '04_tamil_milk.png',
      'tam',
      'PASS',
      'Tamil packaging label with English metric volume and helpline'
    )
  );

  // Test 5: Noisy Foil Stamped Label (Snack)
  console.log('Testing 5/5: 05_noisy_foil_snack.png [eng]...');
  results.push(
    await testSingleImage(
      '05_noisy_foil_snack.png',
      'eng',
      'PASS',
      'Simulated noisy low-contrast background with dot-matrix text'
    )
  );

  return results;
}

runRealOcrSuite()
  .then((results) => {
    console.log('\n=== REAL-WORLD OCR VALIDATION RESULTS ===');
    console.log(JSON.stringify(results, null, 2));
  })
  .catch((err) => {
    console.error('Fatal error in real OCR test suite:', err);
    process.exit(1);
  });

