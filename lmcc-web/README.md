# Legal Metrology Compliance Checker (LMCC)

**Smart India Hackathon 2026**
- **Problem Statement**: SIH26034 — Software System to check compliance of Packaged Commodities under Legal Metrology (Packaged Commodities) Rules, 2011 by scanning products, images and labels.
- **Organization**: Ministry of Consumer Affairs, Food & Public Distribution (Department of Consumer Affairs)
- **Team**: JAMH X4
- **Architecture**: React + Vite + TypeScript + Tailwind CSS + Tesseract.js (Browser-Side OCR)

---

## 1. Overview & Architecture

LMCC is a mobile-first Progressive Web Application (PWA) designed to provide instant screening of packaged commodity labels directly inside the consumer's web browser:
1. **Camera / Upload**: Live camera viewfinder prioritizing rear (`environment`) camera with alignment guides, plus resilient image file upload fallback.
2. **Client-Side OCR**: Local text extraction powered by `tesseract.js` inside a Web Worker/WebAssembly (no external paid APIs, 100% free, runs offline once assets are cached).
3. **Defensive Field Parser**: Normalizes OCR artifacts and extracts mandatory Rule 6 declarations (MRP, Net Quantity, Packing/Mfg Date, Manufacturer Details, Consumer Care).
4. **Legal Metrology Rules Engine**: Evaluates extracted data against structured Legal Metrology (Packaged Commodities) Rules, 2011 data.
5. **Explainable Results & Reporting**: Displays `PASS` / `REVIEW` screening verdicts, specific missing declarations with legal references, raw OCR transparency, and violation logging.

---

## 2. Prerequisites
- **Node.js**: v18.0+ or v20.0+ (Tested with Node v26)
- **npm**: v9.0+ or v11.0+
- Modern Web Browser (Google Chrome, Edge, Firefox, Safari)

---

## 3. Getting Started

### Installation
```bash
cd lmcc-web
npm install
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build
```bash
npm run build
npm run preview
```

---

## 4. Camera Permissions & HTTPS Caveats

- **Localhost**: Browsers grant camera access on `http://localhost:5173` without requiring HTTPS.
- **Mobile Browsers over LAN / Production**: Modern browsers (Chrome, Safari) **require HTTPS** to access `navigator.mediaDevices.getUserMedia()`. If testing on a physical mobile device over local Wi-Fi, serve with an HTTPS tunnel (e.g. `vite --https` or ngrok), or use the built-in **"Upload Label Image"** fallback.
- **Stream Cleanup**: The application automatically terminates all active camera tracks upon component unmount or navigation to prevent camera lock and memory leaks.

---

## 5. How to Test Using Image Upload Fallback

1. Click **"Upload Label Image"** on the Home screen or the upload toggle on the Scanner screen.
2. Select any packaged product label image (e.g. biscuit, soap, snack, shampoo, or beverage label).
3. The application will process the image through Tesseract.js client-side OCR and transition to the Results screen.
4. Review the detected fields (MRP, Net Quantity, Dates, Manufacturer, Consumer Care) and inspection recommendations.

---

## 6. Automated Legal Tone & Compliance Notice

> **Important Legal Clarification**:
> LMCC is an automated screening assistant. It does **not** claim to provide legally binding determinations or declare products definitively "illegal". It flags missing or ambiguous declarations under Rule 6 for inspection and verification.

---

## 7. SIH 2026 Roadmap

| Phase | Milestone | Tech |
|---|---|---|
| **Phase 1** | Web Foundation, Camera, Tesseract OCR, Rules Engine | React + Vite + Tesseract.js |
| **Phase 2** | FastAPI Backend & SQLite Report Storage | Python + FastAPI |
| **Phase 3** | PWA Offline Caching & Installation | vite-plugin-pwa |
| **Phase 4** | Native Android/iOS Deployment with Google ML Kit | Flutter + ML Kit (Post-Hackathon) |
