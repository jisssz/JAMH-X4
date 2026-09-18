# Production Deployment Guide: Vercel & Render

**Project:** Legal Metrology Compliance Checker (LMCC)  
**Smart India Hackathon 2026** • Problem Statement: **SIH26034**  
**Team:** JAMH X4  
**Ministry:** Ministry of Consumer Affairs, Food & Public Distribution  

---

## 1. Target Deployment Architecture

```
                       ┌───────────────────────────────┐
                       │       User / SIH Jury         │
                       └───────────────┬───────────────┘
                                       │ HTTPS
                   ┌───────────────────┴───────────────────┐
                   │                                       │
        ┌──────────▼──────────┐                 ┌──────────▼──────────┐
        │   PRIMARY FRONTEND  │                 │   BACKUP FRONTEND   │
        │   Vercel Deployment │                 │ Render Static Site  │
        │  React 18 + Vite    │                 │  React 18 + Vite    │
        │  PWA / Tesseract    │                 │  PWA / Tesseract    │
        └──────────┬──────────┘                 └──────────┬──────────┘
                   │                                       │
                   │   REST API Requests (/api/report)     │
                   └───────────────────┬───────────────────┘
                                       │ HTTPS / JSON
                           ┌───────────▼───────────┐
                           │   PRIMARY BACKEND     │
                           │  Render Web Service   │
                           │   FastAPI (Python)    │
                           │    /api/health        │
                           └───────────┬───────────┘
                                       │ SQLAlchemy
                           ┌───────────▼───────────┐
                           │    SQLite Database    │
                           │     (reports.db)      │
                           └───────────────────────┘
```

### Why this architecture is optimal for SIH:
1. **Client-Side Autonomy:** All camera capture, image preprocessing, Tesseract.js OCR (WebAssembly Worker), and Rule 6 compliance screening execute **100% locally in the user's browser**. The frontend works even if the backend is temporarily offline or asleep.
2. **Dual-Frontend Redundancy:** Vercel serves as the primary ultra-fast frontend CDN. Render acts as a backup static site. If any platform experiences downtime during the SIH jury presentation, switching to the backup URL is instant.
3. **Privacy by Design:** Zero product packaging photos or video frames are transmitted to the backend. The backend strictly persists anonymous screening reports, structured violation citations, and optional user remarks.

---

## 2. Local Development Setup

### Backend (FastAPI + SQLite)
```bash
cd lmcc-backend

# 1. Create and activate Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run FastAPI with auto-reload on port 8000
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Base: `http://127.0.0.1:8000`
- Health Check: `http://127.0.0.1:8000/api/health`
- Interactive Swagger Docs: `http://127.0.0.1:8000/docs`

### Frontend (React + Vite + PWA)
```bash
cd lmcc-web

# 1. Install dependencies
npm ci

# 2. Configure environment (points to local backend by default)
cp .env.example .env

# 3. Start development server on port 5173
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 3. Vercel Frontend Deployment (Primary Frontend)

Vercel provides edge CDN delivery, instant cache invalidation, and native Vite PWA support.

### Step-by-Step Vercel Setup:
1. Sign in to [Vercel](https://vercel.com) and click **"Add New Project"**.
2. Select your connected GitHub repository: **`jisssz/JAMH-X4`**.
3. In **Project Configuration**, configure the following settings:

   - **Framework Preset:** `Vite`
   - **Root Directory:** Click *Edit* and select **`lmcc-web`**
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm ci`
4. In **Environment Variables**, add:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://your-backend-name.onrender.com` (your deployed Render backend URL)
5. Click **Deploy**.

### SPA Routing & PWA Headers (`vercel.json`)
The included `lmcc-web/vercel.json` automatically handles:
- **Clean SPA Rewrites:** Rewrites direct navigations (`/`, `/scan`, `/processing`, `/results`, `/report`, `/history`, `/history/:id`) to `/index.html` while preserving direct access to `/sw.js`, `/manifest.webmanifest`, `/tesseract/worker.min.js`, and `/assets/*`.
- **Service Worker Headers:** Sets `Cache-Control: public, max-age=0, must-revalidate` and `Service-Worker-Allowed: /` on `/sw.js` for seamless PWA updates.

---

## 4. Render Backend Deployment (FastAPI Web Service)

Render hosts the FastAPI service and SQLite database.

### Step-by-Step Render Backend Setup:
1. Sign in to [Render](https://render.com) and navigate to **Dashboard** > **New +** > **Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Name:** `lmcc-backend` (or a unique name like `lmcc-api`)
   - **Region:** Singapore / Frankfurt / Oregon (select closest to India)
   - **Branch:** `main`
   - **Root Directory:** **`lmcc-backend`**
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`
4. In **Environment Variables**, configure:
   - `DATABASE_URL` = `sqlite:///./reports.db`
   - `FRONTEND_ORIGINS` = `https://your-vercel-domain.vercel.app,https://your-render-domain.onrender.com,http://localhost:5173,http://localhost:4173`
   - `PYTHON_VERSION` = `3.11.10`
5. In **Advanced** > **Health Check Path**, enter:
   - `/api/health`
6. Click **Create Web Service**.

> [!WARNING]
> **Render Free Tier Spin-Down & Filesystem Persistence:**
> 1. **Spin-Down:** Render free web services spin down after 15 minutes of inactivity. The first request after sleep may take ~30–50 seconds to wake up. For the SIH live presentation, open the health check URL (`/api/health`) 5 minutes beforehand to ensure it is warm.
> 2. **Ephemeral Disk:** SQLite data is stored on Render's container disk. If the container restarts or redeploys, data may reset. For a multi-region production enterprise deployment, migrate `DATABASE_URL` to Render Managed PostgreSQL (`postgresql://...`). For the SIH hackathon demonstration, SQLite is completely sufficient and requires zero database maintenance.

---

## 5. Render Frontend Deployment (Backup Static Site)

Render can also host the Vite frontend as a Static Site to provide full redundancy.

### Step-by-Step Render Frontend Setup:
1. In Render Dashboard, click **New +** > **Static Site**.
2. Connect your GitHub repository.
3. Configure:
   - **Name:** `lmcc-web`
   - **Branch:** `main`
   - **Root Directory:** **`lmcc-web`**
   - **Build Command:** `npm ci && npm run build`
   - **Publish Directory:** `dist`
4. In **Redirects / Rewrites**, add an SPA fallback rewrite:
   - **Type:** `Rewrite`
   - **Source:** `/*`
   - **Destination:** `/index.html`
5. In **Environment Variables**:
   - `VITE_API_URL` = `https://your-backend-name.onrender.com`
6. Click **Create Static Site**.

---

## 6. One-Click Blueprint Deployment (`render.yaml`)

Both the backend web service and backup frontend can be deployed simultaneously using Render's Infrastructure-as-Code Blueprint:

1. In Render Dashboard, navigate to **Blueprints** > **New Blueprint Instance**.
2. Connect the repository.
3. Render will automatically parse `render.yaml` from the root directory and create:
   - `lmcc-backend` (Web Service)
   - `lmcc-web` (Static Site)
4. Update `FRONTEND_ORIGINS` and `VITE_API_URL` once the URLs are provisioned.

---

## 7. Post-Deployment Verification Checklist

Once deployed, verify the end-to-end flow:

1. **Backend Health Check:**
   ```bash
   curl -i https://your-backend.onrender.com/api/health
   # Expected: HTTP 200 OK {"status":"healthy","database":"connected"}
   ```
2. **CORS Verification:**
   ```bash
   curl -i -X OPTIONS https://your-backend.onrender.com/api/report \
     -H "Origin: https://your-frontend.vercel.app" \
     -H "Access-Control-Request-Method: POST"
   # Expected: HTTP 200 with Access-Control-Allow-Origin: https://your-frontend.vercel.app
   ```
3. **SPA Direct Route Navigation:**
   - Open `https://your-frontend.vercel.app/scan` directly in the browser address bar. Ensure it does not return a 404 error.
   - Open `https://your-frontend.vercel.app/history` directly.
4. **PWA Assets Check:**
   - Verify `https://your-frontend.vercel.app/manifest.webmanifest` returns JSON.
   - Verify `https://your-frontend.vercel.app/sw.js` returns JavaScript.
   - Verify `https://your-frontend.vercel.app/tesseract/worker.min.js` returns JavaScript.
5. **Full End-to-End Scan:**
   - Capture or upload a product label.
   - Confirm Tesseract.js runs and displays `PASS` or `REVIEW`.
   - Submit a report and confirm it saves to Render and appears in History.
