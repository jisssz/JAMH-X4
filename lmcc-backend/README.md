# LMCC Reporting Backend

FastAPI & SQLite reporting service for the **Legal Metrology Compliance Checker (LMCC)** (SIH Problem Statement SIH26034, Team JAMH X4).

---

## 1. Architectural Role
- **Client-Side Screening Integrity**: OCR (Tesseract.js), field parsing, and Legal Metrology rule checks run **100% locally in the browser**.
- **Backend Responsibilities**:
  - Receive submitted screening observations (`POST /api/report`).
  - Persist observations in SQLite (`reports.db`).
  - Retrieve recent reports (`GET /api/reports`) and specific reports (`GET /api/reports/{id}`).
  - Provide service health monitoring (`GET /api/health`).
- **Zero Personal Data**: Does not store user accounts, user phone numbers, user email addresses, IP addresses, or device IDs. Only stores product-related declarations and observed issues.
- **Client-Side Image Privacy**: Product label images remain on the client device.

---

## 2. Prerequisites
- Python 3.9+ or 3.11+
- pip

---

## 3. Local Setup & Execution

### Setup Virtual Environment
```bash
cd lmcc-backend
python3 -m venv .venv

# On macOS/Linux:
source .venv/bin/activate

# On Windows (cmd/powershell):
# .venv\Scripts\activate
```

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Start Server
```bash
uvicorn app.main:app --reload --port 8000
```

The server will be active at:
- **API Base**: [http://localhost:8000](http://localhost:8000)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Interactive OpenAPI Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 4. Running Backend Tests
```bash
pytest
```

---

## 5. Docker Deployment
```bash
docker build -t lmcc-backend .
docker run -p 8000:8000 lmcc-backend
```

---

## 6. Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./reports.db` | SQLAlchemy database connection string |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed CORS origins for frontend |
| `PORT` | `8000` | Server listening port |
