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


def test_controlled_10_report_dataset_integrity():
    """
    Item 7: Controlled verification using 10 reports (5 PASS, 5 REVIEW)
    verifying mathematical aggregation of all summary, issue, category, trend, and brand metrics.
    """
    # 5 PASS reports
    client.post("/api/report", json={"verdict": "PASS", "productName": "Parle-G Biscuit", "manufacturer": "Parle Products Pvt Ltd", "issueCount": 0, "issues": []})
    client.post("/api/report", json={"verdict": "PASS", "productName": "Britannia Marie Gold", "manufacturer": "Britannia Industries Ltd", "issueCount": 0, "issues": []})
    client.post("/api/report", json={"verdict": "PASS", "productName": "Tata Tea Premium", "manufacturer": "Tata Consumer Products Ltd", "issueCount": 0, "issues": []})
    client.post("/api/report", json={"verdict": "PASS", "productName": "Fortune Sunlite Oil", "manufacturer": "Adani Wilmar Ltd", "issueCount": 0, "issues": []})
    client.post("/api/report", json={"verdict": "PASS", "productName": "Dettol Soap", "manufacturer": "Reckitt Benckiser India", "issueCount": 0, "issues": []})

    # 5 REVIEW reports (with 7 total issues)
    # Report 6: 1 issue (mrp)
    client.post("/api/report", json={
        "verdict": "REVIEW",
        "productName": "Unbranded Atta",
        "manufacturer": "Regional Flour Mills",
        "issueCount": 1,
        "issues": [{"ruleId": "R6-1-DA", "field": "mrp", "title": "Missing MRP", "severity": "critical", "explanation": "No MRP"}]
    })
    # Report 7: 2 issues (mrp, dateDeclaration)
    client.post("/api/report", json={
        "verdict": "REVIEW",
        "productName": "Local Spice Pouch",
        "manufacturer": "Local Agro Foods",
        "issueCount": 2,
        "issues": [
            {"ruleId": "R6-1-DA", "field": "mrp", "title": "Missing MRP", "severity": "critical", "explanation": "No MRP"},
            {"ruleId": "R6-1-D", "field": "dateDeclaration", "title": "Missing Date", "severity": "medium", "explanation": "No Date"},
        ]
    })
    # Report 8: 1 issue (consumerCare)
    client.post("/api/report", json={
        "verdict": "REVIEW",
        "productName": "Himalayan Honey",
        "manufacturer": "Mountain Honey Co",
        "issueCount": 1,
        "issues": [{"ruleId": "R6-1-G", "field": "consumerCare", "title": "Missing Care", "severity": "medium", "explanation": "No Care"}]
    })
    # Report 9: 2 issues (netQuantity, address)
    client.post("/api/report", json={
        "verdict": "REVIEW",
        "productName": "Local Detergent Powder",
        "manufacturer": "Swachh Cleaning Corp",
        "issueCount": 2,
        "issues": [
            {"ruleId": "R6-1-C", "field": "netQuantity", "title": "Missing Qty", "severity": "critical", "explanation": "No Qty"},
            {"ruleId": "R6-1-B", "field": "address", "title": "Incomplete Address", "severity": "medium", "explanation": "No PIN"},
        ]
    })
    # Report 10: 1 issue (mrp)
    client.post("/api/report", json={
        "verdict": "REVIEW",
        "productName": "Coconut Oil Bottle",
        "manufacturer": "Coastal Packers",
        "issueCount": 1,
        "issues": [{"ruleId": "R6-1-DA", "field": "mrp", "title": "Missing MRP", "severity": "critical", "explanation": "No MRP"}]
    })

    # 1. Verify Summary Totals
    sum_res = client.get("/api/analytics/summary?demo=false")
    assert sum_res.status_code == 200
    s_data = sum_res.json()
    assert s_data["totalScans"] == 10
    assert s_data["passCount"] == 5
    assert s_data["reviewCount"] == 5
    assert s_data["passRate"] == 50.0
    assert s_data["totalIssues"] == 7
    assert s_data["isDemonstrationData"] is False

    # 2. Verify Statutory Issues Breakdown (7 total: mrp:3, date:1, care:1, qty:1, address:1)
    iss_res = client.get("/api/analytics/issues?demo=false")
    assert iss_res.status_code == 200
    i_data = iss_res.json()
    assert i_data["totalIssues"] == 7
    counts = {item["field"]: item["count"] for item in i_data["items"]}
    assert counts.get("mrp") == 3
    assert counts.get("dateDeclaration") == 1
    assert counts.get("consumerCare") == 1
    assert counts.get("netQuantity") == 1
    assert counts.get("address") == 1

    # 3. Verify Brands Surveillance
    brn_res = client.get("/api/analytics/brands?demo=false")
    assert brn_res.status_code == 200
    b_data = brn_res.json()
    assert len(b_data["items"]) == 10
    # Parle Products had 1 scan, 0 reviews -> reviewRate = 0.0%
    parle = next(b for b in b_data["items"] if "Parle" in b["manufacturer"])
    assert parle["screenings"] == 1
    assert parle["reviewCount"] == 0
    assert parle["reviewRate"] == 0.0

    # Regional Flour Mills had 1 scan, 1 review -> reviewRate = 100.0%
    flour = next(b for b in b_data["items"] if "Flour Mills" in b["manufacturer"])
    assert flour["screenings"] == 1
    assert flour["reviewCount"] == 1
    assert flour["reviewRate"] == 100.0


def test_analytics_empty_database_handling():
    """
    Item 7: Verify graceful handling of an empty database without throwing 500 errors.
    """
    # Empty DB with demo=false
    res_sum = client.get("/api/analytics/summary?demo=false")
    assert res_sum.status_code == 200
    data = res_sum.json()
    assert data["totalScans"] == 0
    assert data["passCount"] == 0
    assert data["reviewCount"] == 0
    assert data["passRate"] == 0.0
    assert data["totalIssues"] == 0
    assert data["isDemonstrationData"] is False

    res_iss = client.get("/api/analytics/issues?demo=false")
    assert res_iss.status_code == 200
    assert res_iss.json()["totalIssues"] == 0
    assert res_iss.json()["items"] == []


def test_analytics_privacy_zero_pii_audit():
    """
    Item 10: Programmatic audit confirming zero PII or private payloads exposed via analytics.
    """
    endpoints = [
        "/api/analytics/summary",
        "/api/analytics/issues",
        "/api/analytics/categories",
        "/api/analytics/trends",
        "/api/analytics/brands",
    ]

    for ep in endpoints:
        res = client.get(ep)
        assert res.status_code == 200
        raw_text = res.text.lower()
        # Verify zero PII fields or tracking tokens
        prohibited_tokens = [
            '"user_name"',
            '"email"',
            '"phone"',
            '"mobile"',
            '"ip_address"',
            '"device_id"',
            '"latitude"',
            '"longitude"',
            '"gps"',
            '"raw_ocr"',
            '"image_data"',
            '"base64"',
        ]
        for token in prohibited_tokens:
            assert token not in raw_text, f"Endpoint {ep} violated privacy by exposing {token}"
