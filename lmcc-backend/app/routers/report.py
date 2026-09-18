from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.report import Report
from app.schemas.report import ReportCreate, ReportResponse, ReportRead

router = APIRouter(prefix="/api", tags=["reports"])


@router.get("/health")
def health_check():
    """Health check endpoint confirming backend service availability."""
    return {"status": "ok"}


@router.post("/report", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def submit_report(payload: ReportCreate, db: Session = Depends(get_db)):
    """
    Submits a client-screened Legal Metrology compliance observation report.
    Persists structured declarations and issues without collecting personal user data.
    Provides idempotent deduplication using client-assigned localReportId.
    """
    try:
        # Idempotent deduplication check: if localReportId is provided, return existing if already recorded
        if payload.localReportId:
            existing = db.query(Report).filter(Report.local_report_id == payload.localReportId).first()
            if existing:
                return ReportResponse(id=existing.id, status="already_exists")

        # Convert Pydantic issues into JSON-serializable list of dicts
        issues_data = [issue.model_dump() for issue in payload.issues]

        db_report = Report(
            verdict=payload.verdict,
            product_name=payload.productName,
            mrp=payload.mrp,
            net_quantity=payload.netQuantity,
            manufacturer=payload.manufacturer,
            date_declaration=payload.dateDeclaration,
            consumer_care=payload.consumerCare,
            issue_count=payload.issueCount or len(issues_data),
            issues=issues_data,
            raw_ocr=payload.rawOcr,
            user_remarks=payload.userRemarks,
            local_report_id=payload.localReportId,
        )
        db.add(db_report)
        db.commit()
        db.refresh(db_report)

        return ReportResponse(id=db_report.id, status="created")
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record compliance report in database. Please retry.",
        ) from e


@router.get("/reports", response_model=List[ReportRead])
def list_reports(
    limit: int = Query(50, ge=1, le=100, description="Number of recent reports to retrieve"),
    db: Session = Depends(get_db),
):
    """Retrieves recent screening reports ordered by submission date."""
    reports = db.query(Report).order_by(Report.created_at.desc()).limit(limit).all()

    results = []
    for r in reports:
        results.append(
            ReportRead(
                id=r.id,
                createdAt=r.created_at,
                verdict=r.verdict,
                productName=r.product_name,
                mrp=r.mrp,
                netQuantity=r.net_quantity,
                manufacturer=r.manufacturer,
                dateDeclaration=r.date_declaration,
                consumerCare=r.consumer_care,
                issueCount=r.issue_count,
                issues=r.issues or [],
                rawOcr=r.raw_ocr,
                userRemarks=r.user_remarks,
                localReportId=r.local_report_id,
            )
        )
    return results


@router.get("/reports/{report_id}", response_model=ReportRead)
def get_report(report_id: str, db: Session = Depends(get_db)):
    """Retrieves a single screening report by unique identifier."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID '{report_id}' was not found.",
        )

    return ReportRead(
        id=report.id,
        createdAt=report.created_at,
        verdict=report.verdict,
        productName=report.product_name,
        mrp=report.mrp,
        netQuantity=report.net_quantity,
        manufacturer=report.manufacturer,
        dateDeclaration=report.date_declaration,
        consumerCare=report.consumer_care,
        issueCount=report.issue_count,
        issues=report.issues or [],
        rawOcr=report.raw_ocr,
        userRemarks=report.user_remarks,
        localReportId=report.local_report_id,
    )
