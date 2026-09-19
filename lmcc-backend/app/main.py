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

from typing import List
from fastapi import Request
from fastapi.responses import JSONResponse
from app.routers.report import (
    health_check,
    submit_report,
    list_reports,
    get_report,
)
from app.schemas.report import ReportResponse, ReportRead

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def vercel_routing_middleware(request: Request, call_next):
    """
    Normalizes request paths for serverless hosting environments (e.g. Vercel)
    where rewrites direct traffic to /api/index.py or strip the /api prefix.
    """
    path = request.scope.get("path", "")
    if path == "/api/index.py" or path.startswith("/api/index.py") or path.startswith("/api/index"):
        orig = (
            request.headers.get("x-matched-path")
            or request.headers.get("x-vercel-matched-path")
            or request.headers.get("x-invoke-path")
            or request.headers.get("x-forwarded-uri")
            or request.headers.get("x-original-uri")
            or request.headers.get("x-rewrite-url")
        )
        if orig and not orig.startswith("/api/index"):
            if "?" in orig:
                path_part, query_part = orig.split("?", 1)
                orig = path_part
                if not request.scope.get("query_string"):
                    request.scope["query_string"] = query_part.encode("latin1")
            request.scope["path"] = orig if orig.startswith("/") else "/" + orig
        else:
            for pfx in ("/api/index.py", "/api/index", "/index.py"):
                if path.startswith(pfx):
                    suffix = path[len(pfx):]
                    request.scope["path"] = suffix if suffix.startswith("/") else ("/" + suffix if suffix else "/")
                    break
    return await call_next(request)


# Register API Routers (under /api prefix)
app.include_router(report_router)

# Direct aliases without /api prefix to support environments where prefix is stripped
app.add_api_route("/health", health_check, methods=["GET"], tags=["health"])
app.add_api_route("/report", submit_report, methods=["POST"], response_model=ReportResponse, status_code=201, tags=["reports"])
app.add_api_route("/reports", list_reports, methods=["GET"], response_model=List[ReportRead], tags=["reports"])
app.add_api_route("/reports/{report_id}", get_report, methods=["GET"], response_model=ReportRead, tags=["reports"])


@app.get("/")
def root():
    return {
        "service": "LMCC Reporting API",
        "status": "online",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.exception_handler(404)
async def custom_404_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "detail": "Not Found",
            "debug": {
                "url_path": request.url.path,
                "scope_path": request.scope.get("path"),
                "headers": {k: v for k, v in request.headers.items() if "auth" not in k.lower() and "cookie" not in k.lower()},
            },
        },
    )

