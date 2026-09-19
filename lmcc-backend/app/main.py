import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import init_db
from app.routers.report import router as report_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite tables on startup
    init_db()
    yield


app = FastAPI(
    title="LMCC Reporting API",
    description="Legal Metrology Compliance Checker (SIH26034) - Automated Label Screening & Report Service",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for local development and configurable deployment origins
# Supports FRONTEND_ORIGINS (comma-separated list of deployed domains), with ALLOWED_ORIGINS fallback
raw_origins = os.getenv("FRONTEND_ORIGINS") or os.getenv("ALLOWED_ORIGINS") or ""

default_dev_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]

if raw_origins.strip():
    parsed_origins = [origin.strip().rstrip("/") for origin in raw_origins.split(",") if origin.strip()]
    # Combine user-configured origins with local development origins (preserving uniqueness)
    allowed_origins = list(dict.fromkeys(parsed_origins + default_dev_origins))
else:
    allowed_origins = default_dev_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# Register API Routers
app.include_router(report_router)


@app.get("/")
def root():
    return {
        "service": "LMCC Reporting API",
        "status": "online",
        "docs": "/docs",
        "health": "/api/health",
    }
