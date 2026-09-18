import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorker } from 'tesseract.js';
import { parseLabel } from '../src/services/parser/fieldParser';
import { RulesEngine } from '../src/services/rules/rulesEngine';
import { assessOcrQuality } from '../src/services/ocr/ocrQuality';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PHOTO_DIR = path.join(__dirname, 'fixtures', 'photographic_conditions');

export interface PhotographicConditionResult {
  conditionId: string;
  conditionDescription: string;
  imageFile: string;
  ocrConfidence: number;
  ocrSignalQuality: 'GOOD' | 'FAIR' | 'POOR';
  rawOcrLength: number;
  extractedDeclarations: {
    mrp?: string;
    netQuantity?: string;
    date?: string;
    manufacturer?: string;
    address?: string;
    consumerCare?: string;
  };
  screeningVerdict: 'PASS' | 'REVIEW';
  flaggedIssueCount: number;
  status: 'PASS' | 'PARTIAL' | 'FAIL';
  operationalObservation: string;
}

const CONDITIONS = [
  {
    id: 'PHOTO-A',
    file: 'condition_A_flat_label.png',
    desc: 'Flat packaging photo (standard baseline)',
    expectedVerdict: 'PASS' as const,
  },
  {
    id: 'PHOTO-B',
    file: 'condition_B_reflective_foil.png',
    desc: 'Reflective foil pouch with bright specular glare hotspot across print',
    expectedVerdict: 'REVIEW' as const,
  },
  {
    id: 'PHOTO-C',
    file: 'condition_C_perspective_angled.png',
    desc: 'Perspective / pitch-angled packaging (camera at ~25 degree incline)',
    expectedVerdict: 'PASS' as const,
  },
  {
    id: 'PHOTO-D',
    file: 'condition_D_low_light.png',
    desc: 'Low-light / underexposed packaging (dim ambient lighting, 42% brightness)',
    expectedVerdict: 'PASS' as const,
  },
  {
    id: 'PHOTO-E',
    file: 'condition_E_blurred.png',
    desc: 'Blurred / out-of-focus packaging photo (motion blur / defocus)',
    expectedVerdict: 'REVIEW' as const,
  },
  {
    id: 'PHOTO-F',
    file: 'condition_F_curved_can.png',
    desc: 'Curved packaging (cylindrical bottle / beverage can edge compression)',
    expectedVerdict: 'PASS' as const,
  },
];

export async function runPhotographicTest(): Promise<PhotographicConditionResult[]> {
  console.log('=== Running Photographic Conditions Image OCR Test ===');
  const results: PhotographicConditionResult[] = [];

  const worker = await createWorker('eng');

  for (const cond of CONDITIONS) {
    const filePath = path.join(PHOTO_DIR, cond.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`File missing: ${filePath}`);
      continue;
    }

    const buffer = fs.readFileSync(filePath);
    const ret = await worker.recognize(buffer);
    const text = ret.data.text || '';
    const conf = Math.round(ret.data.confidence);
    const quality = assessOcrQuality(text, conf);

    const parsed = parseLabel(text);
    const engine = new RulesEngine();
    const verdict = engine.evaluate(parsed);

    const matchesExpected = verdict.overallStatus === cond.expectedVerdict;

    results.push({
      conditionId: cond.id,
      conditionDescription: cond.desc,
      imageFile: cond.file,
      ocrConfidence: conf,
      ocrSignalQuality: quality.quality,
      rawOcrLength: text.length,
      extractedDeclarations: {
        mrp: parsed.mrp,
        netQuantity: parsed.netQuantity,
        date: parsed.manufactureDate || parsed.packingDate,
        manufacturer: parsed.manufacturer,
        address: parsed.address,
        consumerCare: parsed.consumerCare,
      },
      screeningVerdict: verdict.overallStatus,
      flaggedIssueCount: verdict.flaggedChecks,
      status: matchesExpected ? 'PASS' : 'PARTIAL',
      operationalObservation: quality.reason,
    });

    console.log(
      `[${cond.id}] ${cond.file} -> Conf: ${conf}%, Quality: ${quality.quality}, Verdict: ${verdict.overallStatus} (Expected: ${cond.expectedVerdict})`
    );
  }

  await worker.terminate();
  return results;
}

runPhotographicTest()
  .then((res) => {
    console.log('\n=== PHOTOGRAPHIC CONDITIONS RESULTS ===');
    console.log(JSON.stringify(res, null, 2));
  })
  .catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
  });
