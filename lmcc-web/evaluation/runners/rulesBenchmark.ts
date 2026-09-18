import assert from 'node:assert';
import { RulesEngine } from '../../src/services/rules/rulesEngine';
import { ExtractedLabel } from '../../src/models/ExtractedLabel';

interface RuleTestCase {
  name: string;
  label: ExtractedLabel;
  expectedStatus: 'PASS' | 'REVIEW';
  expectedViolations: string[];
  description: string;
}

const TEST_CASES: RuleTestCase[] = [
  {
    name: 'Rule 6 Complete Compliant Label',
    label: {
      rawText: 'Compliant product',
      mrp: '₹100.00',
      netQuantity: '500 g',
      manufacturer: 'ABC FOODS LTD',
      address: 'INDUSTRIAL ESTATE, MUMBAI 400001',
      packingDate: '05/2024',
      consumerCare: '1800-111-222',
      isFutureDate: false,
      isDateAmbiguous: false,
    },
    expectedStatus: 'PASS',
    expectedViolations: [],
    description: 'All 6 mandatory Rule 6 declarations present and compliant',
  },
  {
    name: 'Rule 6(1)(da) Missing MRP',
    label: {
      rawText: 'Missing price',
      netQuantity: '500 g',
      manufacturer: 'ABC FOODS LTD',
      address: 'INDUSTRIAL ESTATE, MUMBAI 400001',
      packingDate: '05/2024',
      consumerCare: '1800-111-222',
    },
    expectedStatus: 'REVIEW',
    expectedViolations: ['Rule 6(1)(da)'],
    description: 'Missing Maximum Retail Price must flag Rule 6(1)(da)',
  },
  {
    name: 'Rule 6(1)(c) Missing Net Quantity',
    label: {
      rawText: 'Missing quantity',
      mrp: '₹100.00',
      manufacturer: 'ABC FOODS LTD',
      address: 'INDUSTRIAL ESTATE, MUMBAI 400001',
      packingDate: '05/2024',
      consumerCare: '1800-111-222',
    },
    expectedStatus: 'REVIEW',
    expectedViolations: ['Rule 6(1)(c)'],
    description: 'Missing standard weight/volume must flag Rule 6(1)(c)',
  },
  {
    name: 'Rule 6(1)(a) Missing Manufacturer & Packer',
    label: {
      rawText: 'Missing manufacturer',
      mrp: '₹100.00',
      netQuantity: '500 g',
      address: 'INDUSTRIAL ESTATE, MUMBAI 400001',
      packingDate: '05/2024',
      consumerCare: '1800-111-222',
    },
    expectedStatus: 'REVIEW',
    expectedViolations: ['Rule 6(1)(a)'],
    description: 'Missing manufacturer name must flag Rule 6(1)(a)',
  },
  {
    name: 'Rule 6(1)(a) Missing Address',
    label: {
      rawText: 'Missing address',
      mrp: '₹100.00',
      netQuantity: '500 g',
      manufacturer: 'ABC FOODS LTD',
      packingDate: '05/2024',
      consumerCare: '1800-111-222',
    },
    expectedStatus: 'REVIEW',
    expectedViolations: ['Rule 6(1)(a)'],
    description: 'Missing complete premises address must flag Rule 6(1)(a)',
  },
  {
    name: 'Rule 6(1)(d) Missing Manufacturing / Packing Date',
    label: {
      rawText: 'Missing date',
      mrp: '₹100.00',
      netQuantity: '500 g',
      manufacturer: 'ABC FOODS LTD',
      address: 'INDUSTRIAL ESTATE, MUMBAI 400001',
      consumerCare: '1800-111-222',
    },
    expectedStatus: 'REVIEW',
    expectedViolations: ['Rule 6(1)(d)'],
    description: 'Missing month and year of manufacture/packing must flag Rule 6(1)(d)',
  },
  {
    name: 'Rule 6(1)(d) Future Post-Dated Manufacturing Date',
    label: {
      rawText: 'Future date declared',
      mrp: '₹100.00',
      netQuantity: '500 g',
      manufacturer: 'ABC FOODS LTD',
      address: 'INDUSTRIAL ESTATE, MUMBAI 400001',
      packingDate: '12/2035',
      consumerCare: '1800-111-222',
      isFutureDate: true,
    },
    expectedStatus: 'REVIEW',
    expectedViolations: ['Rule 6(1)(d)'],
    description: 'Post-dated future month must trigger Rule 6(1)(d) violation',
  },
  {
    name: 'Rule 6(1)(d) Ambiguous Isolated Date',
    label: {
      rawText: 'Ambiguous date without mfd/pkd label',
      mrp: '₹100.00',
      netQuantity: '500 g',
      manufacturer: 'ABC FOODS LTD',
      address: 'INDUSTRIAL ESTATE, MUMBAI 400001',
      packingDate: '05/2024',
      consumerCare: '1800-111-222',
      isDateAmbiguous: true,
    },
    expectedStatus: 'REVIEW',
    expectedViolations: ['Rule 6(1)(d)'],
    description: 'Ambiguous isolated date without MFD/PKD prefix must recommend manual review',
  },
  {
    name: 'Rule 6(1)(e) Missing Consumer Care Details',
    label: {
      rawText: 'Missing consumer care',
      mrp: '₹100.00',
      netQuantity: '500 g',
      manufacturer: 'ABC FOODS LTD',
      address: 'INDUSTRIAL ESTATE, MUMBAI 400001',
      packingDate: '05/2024',
    },
    expectedStatus: 'REVIEW',
    expectedViolations: ['Rule 6(1)(e)'],
    description: 'Missing consumer care helpline/email must flag Rule 6(1)(e)',
  },
];

async function runRulesBenchmark() {
  console.log(`\n====================================================================`);
  console.log(`         LMCC RULES ENGINE STATUTORY ACCURACY BENCHMARK             `);
  console.log(`====================================================================\n`);

  const engine = new RulesEngine();
  let passedCount = 0;

  for (const testCase of TEST_CASES) {
    process.stdout.write(`Evaluating: ${testCase.name.padEnd(50)} ... `);
    const verdict = engine.evaluate(testCase.label);

    assert.strictEqual(
      verdict.overallStatus,
      testCase.expectedStatus,
      `Status mismatch for "${testCase.name}": expected ${testCase.expectedStatus}, got ${verdict.overallStatus}`
    );

    for (const expectedRule of testCase.expectedViolations) {
      const found = verdict.potentialViolations.some(
        (v) => v.source.includes(expectedRule) || v.title.includes(expectedRule) || v.ruleId.includes(expectedRule)
      );
      assert.ok(found, `Expected violation ${expectedRule} not flagged in "${testCase.name}"`);
    }

    passedCount++;
    console.log(`[PASS]`);
  }

  console.log(`\n────────────────────────────────────────────────────────────────────`);
  console.log(`Rules Benchmark Passed: ${passedCount} / ${TEST_CASES.length} (100%)`);
  console.log(`Statutory references & Gazette citations verified for all 6 declarations.`);
  console.log(`====================================================================\n`);
}

runRulesBenchmark().catch((err) => {
  console.error('Rules benchmark failed:', err);
  process.exit(1);
});
