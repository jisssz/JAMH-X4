# LMCC OCR Accuracy Lab & Evaluation Pipeline

The **OCR Accuracy Lab** is a dedicated development and evaluation framework for the **Legal Metrology Compliance Checker (LMCC / JAMH X4)**. It provides quantitative benchmarking, field-level extraction metrics, false-positive/false-negative compliance matrices, and root-cause failure attribution.

---

## 1. Why an Accuracy Lab?

> **"Uploading random product images and testing them will improve your testing, not automatically improve the ML/OCR model."**

The LMCC pipeline consists of:
```text
  PRODUCT IMAGE / OCR TEXT
             ↓
    PREPROCESSING VARIANTS
    (Standard, High-Contrast, Grayscale)
             ↓
      TESSERACT.JS OCR
             ↓
        FIELD PARSER
  (MRP, Net Qty, Dates, Mfg, Address, Care)
             ↓
     STATUTORY RULES ENGINE
 (Legal Metrology Rules 2011 Rule 6)
             ↓
    EXPECTED VS. ACTUAL METRICS
             ↓
       EVALUATION REPORT
```

Rather than making ad-hoc changes to regexes or image filters, the Accuracy Lab gives you **hard empirical numbers**:
- Did overall field accuracy improve?
- Did the change break Devanagari numerals?
- Did it introduce an unacceptable **False PASS**?

---

## 2. Four Levels of Testing

| Level | Focus | Description |
|---|---|---|
| **Level 1 — Synthetic** | Controlled Degradation | Digital packaging layouts rendered with varying fonts, contrast curves, blur filters, and skew angles. |
| **Level 2 — Real Packaging** | Authentic Retail Samples | Packaged goods across food, snacks, beverages, cosmetics, household cleaners, and imported commodities. |
| **Level 3 — Multilingual** | Regional Scripts | Pan-India packaging declarations in English, Hindi (with Devanagari numerals), Malayalam, Tamil, Kannada, and Telugu. |
| **Level 4 — Adversarial** | Stress & Collision Tests | 13-digit EAN barcodes, 14-digit FSSAI numbers, 6-digit postal PIN codes, dual dates (MFD vs. Best Before), and dual prices (MRP vs. offer price). |

---

## 3. The Most Important Metrics

### A. Field Extraction Accuracy
Measures whether mandatory declarations are extracted truthfully without hallucinations:
- **MRP Accuracy %**
- **Net Quantity Accuracy %**
- **Manufacturer Accuracy %**
- **Address Accuracy %**
- **Date (MFD/PKD) Accuracy %**
- **Consumer Care Accuracy %**
- **Overall Field Accuracy %**

### B. Compliance Decision Safety (Critical)
In a consumer protection and regulatory screening application, **a False PASS is far more concerning than a False REVIEW**:
- **False PASS (FP)**: The system said `PASS`, but the product was non-compliant.
- **False REVIEW (FR)**: The system said `REVIEW`, but the product was compliant.

The evaluation runner tracks:
```text
FALSE PASS RATE   = (False PASS / Total Expected Non-Compliant) * 100%
FALSE REVIEW RATE = (False REVIEW / Total Expected Compliant) * 100%
```

---

## 4. Benchmark vs. Held-Out Test Set

To prevent overfitting parser regexes or image thresholds to known samples, the dataset is split:
- `benchmark`: Used for daily development and iterative tuning.
- `held_out_test`: Frozen test cases that must NEVER be tuned against directly. Only run before a release.

---

## 5. Running the Benchmarks

```bash
# 1. Run the rapid Parser & Rules Benchmark (< 2 seconds)
npm run benchmark:parser

# 2. Run the Statutory Rules Engine Truth-Table Benchmark
npm run benchmark:rules

# 3. Generate synthetic packaging label PNG fixtures
npm run benchmark:generate

# 4. Run end-to-end image OCR benchmark on synthetic fixtures
npm run benchmark:ocr

# 5. Run all benchmarks
npm run benchmark:all
```

---

## 6. Scientific Iteration Loop

```text
             DATASET (benchmark split)
                         ↓
               npm run benchmark:parser
                         ↓
                   FIND FAILURES
                         ↓
           IDENTIFY ROOT CAUSE FROM REPORT
             (e.g., DATE_COLLISION)
                         ↓
                  CHANGE ONE THING
                         ↓
                      RETEST
                         ↓
                 DID ACCURACY IMPROVE?
               ↙                       ↘
             YES                        NO
              ↓                          ↓
    Check Held-Out Set                 REVERT
    (npm run benchmark:parser)
              ↓
            KEEP
```
