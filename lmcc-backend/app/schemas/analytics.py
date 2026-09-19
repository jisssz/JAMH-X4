from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class AnalyticsSummary(BaseModel):
    totalScans: int = Field(..., description="Total packaged goods screened")
    passCount: int = Field(..., description="Total screenings with zero detected statutory issues")
    reviewCount: int = Field(..., description="Total screenings flagged with potential advisory issues")
    passRate: float = Field(..., description="Percentage of fully compliant screenings")
    totalIssues: int = Field(..., description="Total statutory issues identified")
    isDemonstrationData: bool = Field(False, description="True if displaying illustrative pilot demonstration data")
    lastUpdated: datetime = Field(default_factory=datetime.utcnow)
    disclaimer: str = Field(
        "Screening observations are advisory consumer indicators. Does not constitute official judicial non-compliance.",
        description="Legal safety disclaimer",
    )


class IssueFrequencyItem(BaseModel):
    field: str = Field(..., description="Statutory declaration category")
    ruleReference: str = Field(..., description="Legal Metrology (Packaged Commodities) Rules section")
    count: int = Field(..., description="Frequency of identified issues")
    percentage: float = Field(..., description="Percentage among all identified issues")


class IssuesBreakdown(BaseModel):
    items: List[IssueFrequencyItem]
    totalIssues: int
    isDemonstrationData: bool


class CategoryBreakdownItem(BaseModel):
    category: str = Field(..., description="Commodity sector / class")
    screenings: int = Field(..., description="Total packaged goods screened in sector")
    reviewCount: int = Field(..., description="Screenings with advisory review recommendation")
    reviewRate: float = Field(..., description="Percentage flagged for review")


class CategoriesBreakdown(BaseModel):
    items: List[CategoryBreakdownItem]
    isDemonstrationData: bool


class TrendItem(BaseModel):
    period: str = Field(..., description="Time period label (e.g. day or month)")
    scans: int = Field(..., description="Screenings conducted")
    reviews: int = Field(..., description="Screenings flagged for review")


class TrendsResponse(BaseModel):
    items: List[TrendItem]
    isDemonstrationData: bool


class BrandSurveillanceItem(BaseModel):
    manufacturer: str = Field(..., description="Declared manufacturer / brand label")
    screenings: int = Field(..., description="Total screenings observed")
    reviewCount: int = Field(..., description="Screenings resulting in advisory REVIEW recommendation")
    reviewRate: float = Field(..., description="Review recommendation rate percentage")


class BrandsResponse(BaseModel):
    items: List[BrandSurveillanceItem]
    isDemonstrationData: bool
    notice: str = Field(
        "Observation counts reflect crowdsourced advisory screenings. Not a regulatory violation ranking.",
        description="Neutral surveillance context notice",
    )
