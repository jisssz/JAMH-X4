# Legal Metrology Compliance Checker (LMCC)

**Smart India Hackathon 2026** • Problem Statement: **SIH26034**  
*Department of Consumer Affairs, Ministry of Consumer Affairs, Food and Public Distribution*  
*Team: JAMH X4*

An offline-first, client-side Progressive Web Application (PWA) to screen packaged commodity labels for mandatory declarations under **Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011**.

---

## Key Architecture Principles

- **100% Client-Side OCR & Evaluation**: Optical Character Recognition (Tesseract.js in a WebAssembly Web Worker), field parsing, and regulatory rules evaluation run entirely on the user's device. No image or video frame is uploaded to any server.
- **Offline-First PWA**: Fully functional offline. Mandatory declarations are checked locally. Reports submitted offline are queued in IndexedDB and automatically synchronized when network connectivity is restored.
- **Privacy by Design**: No user accounts, passwords, device tracking, GPS coordinates, or personal data are collected. The reporting backend persists only product label declarations, structured issues, and raw OCR snippets.
- **Evidence-Based & Non-Definitive**: Uses conservative legal tone (`PASS` / `REVIEW`). Flags missing or ambiguous declarations with exact OCR text evidence and official Gazette Notification citations (`G.S.R. 202(E)`, `G.S.R. 359(E)`, `G.S.R. 629(E)`, `G.S.R. 779(E)`).

---

## Repository Structure

```
├── lmcc-web/               # React + Vite + TypeScript + Tailwind CSS PWA Frontend
│   ├── src/
│   │   ├── components/     # Camera, Previews, Indicators, OfflineIndicator, InstallPrompt
│   │   ├── context/        # In-memory ImageContext (no binary in URLs)
│   │   ├── data/           # legal_metrology_rules.json (Gazette citations)
│   │   ├── models/         # ExtractedLabel, Rule, Verdict
│   │   ├── pages/          # Home, Scan, Processing, Results, Report, History, ReportDetail
│   │   ├── services/
│   │   │   ├── api.ts      # Typed API client for FastAPI backend
│   │   │   ├── ocr/        # TesseractOcrService (local worker, client-side)
│   │   │   ├── parser/     # Field parser (MRP, Net Qty, Dates, Mfg, Care Cell)
│   │   │   ├── rules/      # Legal Metrology rules engine
│   │   │   ├── storage/    # IndexedDB offline report queue
│   │   │   └── sync/       # Background auto-sync service
│   ├── public/             # Icons, SVG favicon, manifest, tesseract worker
│   └── tests/              # Automated unit and E2E integration tests
└── lmcc-backend/           # FastAPI + SQLite Reporting Service
    ├── app/
    │   ├── main.py         # FastAPI application with CORS & DB lifespan
    │   ├── db.py           # SQLite connection & session maker
    │   ├── models/         # SQLAlchemy Report model
    │   ├── schemas/        # Pydantic validation (PASS/REVIEW constraint)
    │   └── routers/        # /api/health, /api/report, /api/reports endpoints
    └── tests/              # Pytest test suite
```

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v20/v22)
- **Python**: 3.9+ with virtual environment support

---

### 2. Running the Backend Service

```bash
cd lmcc-backend

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend on port 8000
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend API endpoints:
- `GET http://127.0.0.1:8000/api/health` — Health check
- `POST http://127.0.0.1:8000/api/report` — Submit compliance observation
- `GET http://127.0.0.1:8000/api/reports` — Retrieve recent submissions
- `GET http://127.0.0.1:8000/api/reports/{id}` — Retrieve specific report by ID

---

### 3. Running the Frontend Development Server

```bash
cd lmcc-web

# Install dependencies
npm install

# Start Vite dev server on port 5173
npm run dev
```

Open `http://localhost:5173` in your browser.

---

### 4. Building & Running Production PWA

```bash
cd lmcc-web

# Typecheck and build production bundle with Service Worker & Manifest
npm run build

# Preview production build locally
npm run preview
```

Open `http://localhost:4173`. You can install the PWA by clicking the **Install LMCC** prompt or browser install button.

---

## PWA & Offline Behavior

1. **App Shell Pre-caching**: HTML, CSS, JavaScript bundles, application icons, and the Tesseract worker are precached by Workbox on the first load.
2. **Offline Scanning**: If network connectivity is lost, camera acquisition, photo upload, Tesseract.js OCR, label parsing, and the rules engine run 100% locally with zero degradation.
3. **Offline Report Queue**: Submitting an observation while offline automatically stores the structured payload in local **IndexedDB** (`lmcc_offline_db`) with a local reference ID (`local_...`).
4. **Auto-Synchronization**: When connection returns, the application automatically pushes queued reports to the FastAPI backend and updates them to `synced` status with their official server UUID.
5. **Report History**: Works offline by displaying local IndexedDB reports alongside clear status badges (`Pending sync`, `Synced`, `Server report`).

---

## Browser Requirements

- **Modern Browsers**: Google Chrome (Android/Desktop), Safari (iOS 15+/macOS), Firefox, Edge.
- **Camera Access**: Requires `HTTPS` or `localhost` per W3C WebRTC specifications (`navigator.mediaDevices.getUserMedia`).
- **IndexedDB**: Standard in all modern browsers for offline queue storage.

---

## Automated Test Suites

### 1. Frontend Unit, Parser & Adversarial Tests
```bash
cd lmcc-web
npm test
```
*53/53 passing unit tests covering label parsing, date ambiguity, noisy OCR, rules engine, PASS/REVIEW validations, privacy constraints, IndexedDB queue, sync status, multilingual Devanagari/regional scripts, 10 Golden Realistic Category Fixtures, False-Positive/Negative Scenarios A–J, and Phase 11 Adversarial cases (13-digit barcodes, 14-digit FSSAI licenses, postal PINs, copyright years, toll-free helplines, dual prices, dual dates, trailing `/-`).*

### 2. Backend Persistence Tests
```bash
cd lmcc-backend
.venv/bin/pytest -v
```
*10/10 passing pytest tests covering health checks, report persistence, validation rejections, SQL safety, and limit handling.*

### 3. Real Browser E2E Automation (Google Chrome v153)
```bash
cd lmcc-web
npx tsx tests/browser_e2e_validation.ts
```
*Controls a genuine Google Chrome instance via Puppeteer on the production PWA build (`http://localhost:4173`). Validates Web Worker OCR in real browser DOM, `PASS` verdict, declaration extraction, offline CDP simulation, and IndexedDB report queuing.*

### 4. Photographic Conditions Suite
```bash
cd lmcc-web
npx tsx tests/photographic_conditions_test.ts
```
*Evaluates Tesseract.js against 6 packaging condition variants: flat baseline, reflective foil pouch with specular glare, perspective-angled, low-light grocery shelf, motion-blurred packaging, and curved cylindrical cans.*

### 5. Performance Benchmark (5 Iterations Unified Timing)
```bash
cd lmcc-web
npx tsx tests/performance_benchmark.ts
```
*Measures min/median/max across 5 end-to-end iterations: worker initialization (median 231ms), Pass 1 OCR (median 415ms), Pass 2 retry (median 291ms), parsing + rules (<1ms), and total unified latency (median 1,082ms).*


---

## Multilingual Support & Offline Status (Phase 9)

LMCC supports mandatory declarations printed across major Indian scripts, with honest technical offline status labeling:

| Language Profile | Script | Tesseract Code | Offline Status | Description |
| :--- | :--- | :--- | :--- | :--- |
| **English** | Latin | `eng` | **Offline Ready** | Precached worker & English traineddata cached on device. |
| **Hindi** | Devanagari | `hin` | **Online 1st Use** | Downloads `hin.traineddata` (~4 MB) on first use; cached thereafter. |
| **Bilingual** | Latin + Devanagari | `eng+hin` | **Online 1st Use** | Optimized for standard pan-India dual-language packaging. |
| **Malayalam** | Malayalam | `mal` | **Online 1st Use** | Downloads `mal.traineddata` on first scan; cached thereafter. |
| **Tamil** | Tamil | `tam` | **Online 1st Use** | Downloads `tam.traineddata` on first scan; cached thereafter. |
| **Kannada** | Kannada | `kan` | **Online 1st Use** | Downloads `kan.traineddata` on first scan; cached thereafter. |
| **Telugu** | Telugu | `tel` | **Online 1st Use** | Downloads `tel.traineddata` on first scan; cached thereafter. |

### Technical OCR Quality vs. Legal Compliance
- **Technical OCR Quality (`GOOD` / `FAIR` / `POOR`)**: Evaluates raw image clarity, character recognition confidence, and presence of mandatory declaration keyword cues.
- **Legal Compliance (`PASS` / `REVIEW`)**: Evaluates whether the declared information strictly satisfies Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011.
- *These two models operate independently*: A sharp photograph of an illegal label will have `GOOD` OCR quality but a `REVIEW` compliance verdict.

### Controlled 2-Pass OCR Retry Strategy
1. **Pass 1 (Standard)**: Runs balanced contrast optimization and character extraction.
2. **Pass 2 (High Contrast Fallback)**: If Pass 1 yields `POOR` quality or insufficient text, the engine automatically triggers an enhanced grayscale binarization pass tailored for low-contrast dot-matrix packaging stamps before selecting the superior result.

---

## Known Limitations

1. **First-Load OCR Dependency**: On the very first launch, Tesseract.js language model assets are downloaded and cached in IndexedDB (`keyval-store`) and Workbox runtime cache. Subsequent OCR operations run completely offline for English. Regional language models require an initial online scan to download traineddata before offline caching.
2. **Camera on Non-HTTPS**: Mobile browser camera access strictly requires `https://` (or `localhost` for testing). In unencrypted non-localhost environments, use the built-in **Upload Label Image** fallback.
