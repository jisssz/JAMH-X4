import f1 from './01_biscuit.json';
import f2 from './02_shampoo.json';
import f3 from './03_beverage.json';
import f4 from './04_packaged_food.json';
import f5 from './05_household.json';
import f6 from './06_personal_care.json';
import f7 from './07_imported.json';
import f8 from './08_multi_block.json';
import f9 from './09_noisy_print.json';
import f10 from './10_bilingual.json';

export interface RealisticLabelFixture {
  id: string;
  name: string;
  category: string;
  rawOcrText: string;
  expected: {
    mrp?: string;
    netQuantity?: string;
    manufactureDate?: string;
    packingDate?: string;
    manufacturer?: string;
    importer?: string;
    address?: string;
    consumerCare?: string;
    isDateAmbiguous: boolean;
    isFutureDate: boolean;
    expectedVerdict: 'PASS' | 'REVIEW';
    flaggedCount: number;
  };
}

export const REALISTIC_LABEL_FIXTURES: RealisticLabelFixture[] = [
  f1 as RealisticLabelFixture,
  f2 as RealisticLabelFixture,
  f3 as RealisticLabelFixture,
  f4 as RealisticLabelFixture,
  f5 as RealisticLabelFixture,
  f6 as RealisticLabelFixture,
  f7 as RealisticLabelFixture,
  f8 as RealisticLabelFixture,
  f9 as RealisticLabelFixture,
  f10 as RealisticLabelFixture,
];
