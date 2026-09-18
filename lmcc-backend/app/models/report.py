import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, JSON
from app.db import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    verdict = Column(String(10), nullable=False)  # PASS or REVIEW
    product_name = Column(String(200), nullable=True)
    mrp = Column(String(50), nullable=True)
    net_quantity = Column(String(50), nullable=True)
    manufacturer = Column(String(300), nullable=True)
    date_declaration = Column(String(50), nullable=True)
    consumer_care = Column(String(300), nullable=True)
    issue_count = Column(Integer, default=0, nullable=False)
    issues = Column(JSON, nullable=False, default=list)  # Structured issues list
    raw_ocr = Column(Text, nullable=True)
    user_remarks = Column(Text, nullable=True)
