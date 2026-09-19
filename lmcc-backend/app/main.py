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


from urllib.parse import urlencode


@app.middleware("http")
async def vercel_routing_middleware(request: Request, call_next):
    """
    Normalizes request paths for serverless hosting environments (e.g. Vercel)
    where rewrites direct traffic to /api/index.py?path=$1 or strip the /api prefix.
    """
    path_param = request.query_params.get("path")
    if path_param is not None:
        clean_path = path_param.strip()
        if clean_path:
            request.scope["path"] = "/" + clean_path.lstrip("/")
        else:
            request.scope["path"] = "/"
            
        # Clean internal 'path' query param so endpoint dependencies aren't polluted
        clean_params = [(k, v) for k, v in request.query_params.multi_items() if k != "path"]
        request.scope["query_string"] = urlencode(clean_params).encode("latin1")
    else:
        path = request.scope.get("path", "")
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


@app.api_route("/{full_path:path}", methods=["GET", "POST", "OPTIONS", "HEAD"])
async def catch_all_fallback(request: Request, full_path: str):
    """
    Guarantees that serverless rewrites (which may send varying URL structures)
    never fail to resolve core health check and reporting endpoints.
    """
    clean_path = full_path.strip("/").lower()
    
    # Core health check fallback: matches health, api/health, api/index.py/api/health etc.
    if clean_path.endswith("health") or "health" in clean_path:
        return {"status": "ok"}
        
    # Reports list fallback: only exact match for reports or api/reports
    if clean_path in ("reports", "api/reports") and request.method == "GET":
        from app.db import SessionLocal
        db = SessionLocal()
        try:
            return list_reports(limit=50, db=db)
        finally:
            db.close()
            
    # Root status fallback
    if not clean_path or clean_path in ("api", "api/index", "api/index.py"):
        return {
            "service": "LMCC Reporting API",
            "status": "online",
            "docs": "/docs",
            "health": "/api/health",
        }


        
    return JSONResponse(
        status_code=404,
        content={
            "detail": "Not Found",
            "captured_path": full_path,
            "scope_path": request.scope.get("path"),
        },
    )



