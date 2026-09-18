from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class IssueDetail(BaseModel):
    ruleId: str = Field(..., max_length=100)
    field: str = Field(..., max_length=50)
    title: str = Field(..., max_length=150)
    severity: str = Field(..., max_length=20)
    detectedValue: Optional[str] = Field(None, max_length=200)
    explanation: str = Field(..., max_length=1000)
    evidence: Optional[str] = Field(None, max_length=1000)
    recommendation: Optional[str] = Field(None, max_length=1000)
    source: Optional[str] = Field(None, max_length=250)
    gazetteReference: Optional[str] = Field(None, max_length=250)


class ReportCreate(BaseModel):
    verdict: str = Field(..., description="Screening verdict, must be PASS or REVIEW")
    productName: Optional[str] = Field(None, max_length=200)
    mrp: Optional[str] = Field(None, max_length=50)
    netQuantity: Optional[str] = Field(None, max_length=50)
    manufacturer: Optional[str] = Field(None, max_length=300)
    dateDeclaration: Optional[str] = Field(None, max_length=50)
    consumerCare: Optional[str] = Field(None, max_length=300)
    issueCount: Optional[int] = Field(0, ge=0, le=100)
    issues: List[IssueDetail] = Field(default_factory=list)
    rawOcr: Optional[str] = Field(None, max_length=50000)
    userRemarks: Optional[str] = Field(None, max_length=2000)
    localReportId: Optional[str] = Field(None, max_length=100)

    @field_validator("verdict")
    @classmethod
    def validate_verdict(cls, v: str) -> str:
        upper_v = v.strip().upper()
        if upper_v not in ("PASS", "REVIEW"):
            raise ValueError("Verdict must be strictly 'PASS' or 'REVIEW'. Definitive conclusions like 'ILLEGAL' or 'LEGAL' are rejected.")
        return upper_v


class ReportResponse(BaseModel):
    id: str
    status: str = "created"


class ReportRead(BaseModel):
    id: str
    createdAt: datetime
    verdict: str
    productName: Optional[str] = None
    mrp: Optional[str] = None
    netQuantity: Optional[str] = None
    manufacturer: Optional[str] = None
    dateDeclaration: Optional[str] = None
    consumerCare: Optional[str] = None
    issueCount: int
    issues: List[IssueDetail]
    rawOcr: Optional[str] = None
    userRemarks: Optional[str] = None
    localReportId: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
