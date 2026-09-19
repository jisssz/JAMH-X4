import pytest
from app.db import Base
from app.models.report import Report
from tests.test_report import client, engine


@pytest.fixture(autouse=True)
def setup_and_teardown_analytics_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_analytics_summary_demo_when_empty():
    res = client.get("/api/analytics/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["isDemonstrationData"] is True
    assert data["totalScans"] == 1420
    assert data["passCount"] == 1048
    assert data["reviewCount"] == 372
    assert "disclaimer" in data


def test_analytics_issues_breakdown():
    res = client.get("/api/analytics/issues?demo=true")
    assert res.status_code == 200
    data = res.json()
    assert data["isDemonstrationData"] is True
    assert len(data["items"]) >= 5
    assert data["items"][0]["field"] == "MRP / Unit Sale Price"
    assert "Rule 6(1)(e)" in data["items"][0]["ruleReference"]


def test_analytics_categories_breakdown():
    res = client.get("/api/analytics/categories?demo=true")
    assert res.status_code == 200
    data = res.json()
    assert data["isDemonstrationData"] is True
    assert len(data["items"]) >= 4
    cat_names = [c["category"] for c in data["items"]]
    assert "Packaged Foods & Staples" in cat_names


def test_analytics_trends():
    res = client.get("/api/analytics/trends?demo=true")
    assert res.status_code == 200
    data = res.json()
    assert data["isDemonstrationData"] is True
    assert len(data["items"]) >= 5


def test_analytics_brands():
    res = client.get("/api/analytics/brands?demo=true")
    assert res.status_code == 200
    data = res.json()
    assert data["isDemonstrationData"] is True
    assert len(data["items"]) >= 5
    assert "Britannia Industries Ltd" in [b["manufacturer"] for b in data["items"]]


def test_analytics_summary_live_aggregation():
    # Insert 4 reports (exceeds DEMO_THRESHOLD of 3)
    client.post("/api/report", json={"verdict": "PASS", "productName": "Parle-G", "issueCount": 0})
    client.post("/api/report", json={"verdict": "PASS", "productName": "Britannia Marie", "issueCount": 0})
    client.post("/api/report", json={"verdict": "PASS", "productName": "Tata Tea Gold", "issueCount": 0})
    client.post("/api/report", json={
        "verdict": "REVIEW",
        "productName": "Spices Pouch",
        "manufacturer": "Local Spice Co",
        "issueCount": 2,
        "issues": [
            {
                "ruleId": "LM-PCR-2011-R6-1-DA",
                "field": "mrp",
                "title": "Missing MRP",
                "severity": "critical",
                "explanation": "No MRP detected",
            },
            {
                "ruleId": "LM-PCR-2011-R6-1-G",
                "field": "consumerCare",
                "title": "Missing Consumer Helpline",
                "severity": "medium",
                "explanation": "No consumer care email",
            }
        ]
    })

    # Query summary with demo=false
    res = client.get("/api/analytics/summary?demo=false")
    assert res.status_code == 200
    data = res.json()
    assert data["isDemonstrationData"] is False
    assert data["totalScans"] == 4
    assert data["passCount"] == 3
    assert data["reviewCount"] == 1
    assert data["passRate"] == 75.0
    assert data["totalIssues"] == 2

    # Query issues with demo=false
    res_issues = client.get("/api/analytics/issues?demo=false")
    assert res_issues.status_code == 200
    issues_data = res_issues.json()
    assert issues_data["isDemonstrationData"] is False
    assert issues_data["totalIssues"] == 2
    fields = [item["field"] for item in issues_data["items"]]
    assert "mrp" in fields
    assert "consumerCare" in fields


def test_direct_analytics_route_without_api_prefix():
    res = client.get("/analytics/summary?demo=true")
    assert res.status_code == 200
    assert res.json()["isDemonstrationData"] is True
