from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.report import Report
from app.schemas.analytics import (
    AnalyticsSummary,
    IssuesBreakdown,
    IssueFrequencyItem,
    CategoriesBreakdown,
    CategoryBreakdownItem,
    TrendsResponse,
    TrendItem,
    BrandsResponse,
    BrandSurveillanceItem,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

DEMO_THRESHOLD = 3

DEMO_SUMMARY = AnalyticsSummary(
    totalScans=1420,
    passCount=1048,
    reviewCount=372,
    passRate=73.8,
    totalIssues=565,
    isDemonstrationData=True,
    lastUpdated=datetime.utcnow(),
    disclaimer="Screening observations are advisory consumer indicators. Does not constitute official judicial non-compliance.",
)

DEMO_ISSUES = [
    IssueFrequencyItem(field="MRP / Unit Sale Price", ruleReference="Rule 6(1)(e)", count=184, percentage=32.6),
    IssueFrequencyItem(field="Date of Mfg / Expiry", ruleReference="Rule 6(1)(d)", count=112, percentage=19.8),
    IssueFrequencyItem(field="Consumer Care Helpline", ruleReference="Rule 6(1)(g)", count=98, percentage=17.3),
    IssueFrequencyItem(field="Net Quantity & Fonts", ruleReference="Rule 6(1)(c) & R-7", count=76, percentage=13.5),
    IssueFrequencyItem(field="Manufacturer / Packer Address", ruleReference="Rule 6(1)(a)-(b)", count=64, percentage=11.3),
    IssueFrequencyItem(field="Multi-Panel Discrepancy", ruleReference="Rule 6 Consistency", count=31, percentage=5.5),
]

DEMO_CATEGORIES = [
    CategoryBreakdownItem(category="Packaged Foods & Staples", screenings=520, reviewCount=126, reviewRate=24.2),
    CategoryBreakdownItem(category="Snacks & Confectionery", screenings=380, reviewCount=108, reviewRate=28.4),
    CategoryBreakdownItem(category="Beverages & Dairy", screenings=240, reviewCount=52, reviewRate=21.7),
    CategoryBreakdownItem(category="Personal Care & Toiletries", screenings=180, reviewCount=56, reviewRate=31.1),
    CategoryBreakdownItem(category="Household & Cleaning", screenings=100, reviewCount=30, reviewRate=30.0),
]

DEMO_TRENDS = [
    TrendItem(period="Apr 2024", scans=140, reviews=42),
    TrendItem(period="May 2024", scans=185, reviews=51),
    TrendItem(period="Jun 2024", scans=220, reviews=58),
    TrendItem(period="Jul 2024", scans=265, reviews=69),
    TrendItem(period="Aug 2024", scans=310, reviews=78),
    TrendItem(period="Sep 2024", scans=300, reviews=74),
]

DEMO_BRANDS = [
    BrandSurveillanceItem(manufacturer="Britannia Industries Ltd", screenings=142, reviewCount=28, reviewRate=19.7),
    BrandSurveillanceItem(manufacturer="Parle Products Pvt Ltd", screenings=128, reviewCount=24, reviewRate=18.8),
    BrandSurveillanceItem(manufacturer="ITC Limited", screenings=115, reviewCount=22, reviewRate=19.1),
    BrandSurveillanceItem(manufacturer="Nestle India Ltd", screenings=98, reviewCount=19, reviewRate=19.4),
    BrandSurveillanceItem(manufacturer="Hindustan Unilever Ltd", screenings=86, reviewCount=16, reviewRate=18.6),
    BrandSurveillanceItem(manufacturer="Regional / Local Packers", screenings=310, reviewCount=148, reviewRate=47.7),
]


def should_use_demo(demo_param: Optional[bool], total_count: int) -> bool:
    if demo_param is True:
        return True
    if demo_param is False:
        return False
    return total_count < DEMO_THRESHOLD


def map_field_rule(field_name: str) -> str:
    fn = field_name.lower()
    if "mrp" in fn or "price" in fn:
        return "Rule 6(1)(e)"
    elif "date" in fn or "expiry" in fn or "mfg" in fn:
        return "Rule 6(1)(d)"
    elif "consumer" in fn or "care" in fn or "contact" in fn:
        return "Rule 6(1)(g)"
    elif "net" in fn or "quantity" in fn or "weight" in fn:
        return "Rule 6(1)(c)"
    elif "manufactur" in fn or "producer" in fn:
        return "Rule 6(1)(a)"
    elif "address" in fn or "location" in fn:
        return "Rule 6(1)(b)"
    elif "discrepancy" in fn or "panel" in fn:
        return "Rule 6 Consistency"
    return "Rule 6"


@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary(demo: Optional[bool] = Query(None), db: Session = Depends(get_db)):
    total_count = db.query(Report).count()
    if should_use_demo(demo, total_count):
        return DEMO_SUMMARY

    pass_count = db.query(Report).filter(Report.verdict == "PASS").count()
    review_count = db.query(Report).filter(Report.verdict == "REVIEW").count()
    pass_rate = round((pass_count / total_count * 100.0), 1) if total_count > 0 else 0.0

    all_reports = db.query(Report.issue_count).all()
    total_issues = sum(r.issue_count or 0 for r in all_reports)

    return AnalyticsSummary(
        totalScans=total_count,
        passCount=pass_count,
        reviewCount=review_count,
        passRate=pass_rate,
        totalIssues=total_issues,
        isDemonstrationData=False,
        lastUpdated=datetime.utcnow(),
    )


@router.get("/issues", response_model=IssuesBreakdown)
def get_issues_breakdown(demo: Optional[bool] = Query(None), db: Session = Depends(get_db)):
    total_count = db.query(Report).count()
    if should_use_demo(demo, total_count):
        return IssuesBreakdown(
            items=DEMO_ISSUES,
            totalIssues=sum(i.count for i in DEMO_ISSUES),
            isDemonstrationData=True,
        )

    field_counts: Dict[str, int] = defaultdict(int)
    all_reports = db.query(Report.issues).all()

    total_issue_count = 0
    for (issues_json,) in all_reports:
        if not issues_json or not isinstance(issues_json, list):
            continue
        for issue in issues_json:
            field = issue.get("field", "General Label") if isinstance(issue, dict) else "General Label"
            field_counts[field] += 1
            total_issue_count += 1

    items: List[IssueFrequencyItem] = []
    for field, count in sorted(field_counts.items(), key=lambda x: x[1], reverse=True):
        pct = round((count / total_issue_count * 100.0), 1) if total_issue_count > 0 else 0.0
        items.append(
            IssueFrequencyItem(
                field=field,
                ruleReference=map_field_rule(field),
                count=count,
                percentage=pct,
            )
        )

    return IssuesBreakdown(
        items=items,
        totalIssues=total_issue_count,
        isDemonstrationData=False,
    )


@router.get("/categories", response_model=CategoriesBreakdown)
def get_categories_breakdown(demo: Optional[bool] = Query(None), db: Session = Depends(get_db)):
    total_count = db.query(Report).count()
    if should_use_demo(demo, total_count):
        return CategoriesBreakdown(items=DEMO_CATEGORIES, isDemonstrationData=True)

    # For live data without explicit category tags, cluster based on product name
    category_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: {"total": 0, "reviews": 0})
    reports = db.query(Report.product_name, Report.verdict).all()

    for prod_name, verdict in reports:
        pname = (prod_name or "").lower()
        if any(w in pname for w in ["biscuit", "cookie", "rusk", "snack", "chips", "crisp", "wafer"]):
            cat = "Snacks & Confectionery"
        elif any(w in pname for w in ["tea", "coffee", "juice", "milk", "beverage", "water", "drink"]):
            cat = "Beverages & Dairy"
        elif any(w in pname for w in ["atta", "rice", "dal", "flour", "grain", "spice", "masala", "salt", "sugar", "oil"]):
            cat = "Packaged Foods & Staples"
        elif any(w in pname for w in ["soap", "shampoo", "cream", "lotion", "paste", "toothpaste"]):
            cat = "Personal Care & Toiletries"
        elif any(w in pname for w in ["detergent", "cleaner", "wash"]):
            cat = "Household & Cleaning"
        else:
            cat = "General Packaged Goods"

        category_counts[cat]["total"] += 1
        if verdict == "REVIEW":
            category_counts[cat]["reviews"] += 1

    items: List[CategoryBreakdownItem] = []
    for cat, data in sorted(category_counts.items(), key=lambda x: x[1]["total"], reverse=True):
        rate = round((data["reviews"] / data["total"] * 100.0), 1) if data["total"] > 0 else 0.0
        items.append(
            CategoryBreakdownItem(
                category=cat,
                screenings=data["total"],
                reviewCount=data["reviews"],
                reviewRate=rate,
            )
        )

    return CategoriesBreakdown(items=items, isDemonstrationData=False)


@router.get("/trends", response_model=TrendsResponse)
def get_trends(demo: Optional[bool] = Query(None), db: Session = Depends(get_db)):
    total_count = db.query(Report).count()
    if should_use_demo(demo, total_count):
        return TrendsResponse(items=DEMO_TRENDS, isDemonstrationData=True)

    # Group live reports by day
    trend_dict: Dict[str, Dict[str, int]] = defaultdict(lambda: {"scans": 0, "reviews": 0})
    reports = db.query(Report.created_at, Report.verdict).order_by(Report.created_at.asc()).all()

    for dt, verdict in reports:
        period_key = dt.strftime("%d %b %Y") if dt else "Recent"
        trend_dict[period_key]["scans"] += 1
        if verdict == "REVIEW":
            trend_dict[period_key]["reviews"] += 1

    items = [
        TrendItem(period=k, scans=v["scans"], reviews=v["reviews"])
        for k, v in trend_dict.items()
    ]

    return TrendsResponse(items=items, isDemonstrationData=False)


@router.get("/brands", response_model=BrandsResponse)
def get_brands_surveillance(demo: Optional[bool] = Query(None), db: Session = Depends(get_db)):
    total_count = db.query(Report).count()
    if should_use_demo(demo, total_count):
        return BrandsResponse(items=DEMO_BRANDS, isDemonstrationData=True)

    brand_dict: Dict[str, Dict[str, int]] = defaultdict(lambda: {"scans": 0, "reviews": 0})
    reports = db.query(Report.manufacturer, Report.product_name, Report.verdict).all()

    for mfg, prod, verdict in reports:
        label = (mfg or prod or "Unspecified Packaged Good").strip()
        if len(label) > 40:
            label = label[:37] + "..."
        brand_dict[label]["scans"] += 1
        if verdict == "REVIEW":
            brand_dict[label]["reviews"] += 1

    items: List[BrandSurveillanceItem] = []
    for brand, data in sorted(brand_dict.items(), key=lambda x: x[1]["scans"], reverse=True)[:10]:
        rate = round((data["reviews"] / data["scans"] * 100.0), 1) if data["scans"] > 0 else 0.0
        items.append(
            BrandSurveillanceItem(
                manufacturer=brand,
                screenings=data["scans"],
                reviewCount=data["reviews"],
                reviewRate=rate,
            )
        )

    return BrandsResponse(items=items, isDemonstrationData=False)
