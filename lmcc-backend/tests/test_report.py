import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app

# Setup in-memory SQLite database specifically for test isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_and_teardown_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


# ----------------------------------------------------
# 1. Health Check Test
# ----------------------------------------------------
def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ----------------------------------------------------
# 2. POST Valid PASS Report
# ----------------------------------------------------
def test_create_valid_pass_report():
    payload = {
        "verdict": "PASS",
        "productName": "Parle-G Glucose Biscuits 250g",
        "mrp": "₹35.00",
        "netQuantity": "250 g",
        "manufacturer": "Parle Products Pvt Ltd",
        "dateDeclaration": "08/2024",
        "consumerCare": "1800222211, care@parle.biz",
        "issueCount": 0,
        "issues": [],
        "rawOcr": "PARLE-G ORIGINAL GLUCOSE BISCUITS...",
        "userRemarks": "Scanned in supermarket shelf",
    }
    response = client.post("/api/report", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["status"] == "created"


# ----------------------------------------------------
# 3. POST Valid REVIEW Report with Structured Issues
# ----------------------------------------------------
def test_create_valid_review_report_with_structured_issues():
    payload = {
        "verdict": "REVIEW",
        "productName": "Unbranded Agro Dal",
        "mrp": None,
        "netQuantity": "1 kg",
        "manufacturer": "Local Agro Mills",
        "dateDeclaration": "04/2024",
        "issueCount": 2,
        "issues": [
            {
                "ruleId": "LM-PCR-2011-R6-1-DA",
                "field": "mrp",
                "title": "Maximum Retail Price (MRP)",
                "severity": "critical",
                "explanation": "Mandatory declaration under Rule 6(1)(da) was not detected.",
                "evidence": "No recognizable MRP or currency pattern (₹/Rs.) detected in OCR text.",
                "recommendation": "Inspect package to verify if MRP is printed on another panel or obscured.",
                "source": "Rule 6(1)(da), Legal Metrology (Packaged Commodities) Rules, 2011",
                "gazetteReference": "G.S.R. 629(E) dated 23-06-2017 & G.S.R. 779(E) dated 02-11-2021",
            },
            {
                "ruleId": "LM-PCR-2011-R6-1-D",
                "field": "packingDate",
                "title": "Month & Year of Manufacture / Packing (Ambiguous Context)",
                "severity": "medium",
                "detectedValue": "04/2024",
                "explanation": "Date '04/2024' was detected without explicit statutory prefix.",
                "evidence": "Found isolated date '04/2024' without preceding prefix.",
                "recommendation": "Verify whether this is manufacture date or expiry date.",
                "source": "Rule 6(1)(d), Legal Metrology (Packaged Commodities) Rules, 2011",
                "gazetteReference": "Substituted vide G.S.R. 779(E) dated 02-11-2021",
            },
        ],
        "rawOcr": "UNBRANDED AGRO DAL 1KG...",
    }
    response = client.post("/api/report", json=payload)
    assert response.status_code == 201
    report_id = response.json()["id"]

    # Verify retrieval preserves structured evidence and gazette references
    get_res = client.get(f"/api/reports/{report_id}")
    assert get_res.status_code == 200
    report_data = get_res.json()
    assert report_data["verdict"] == "REVIEW"
    assert report_data["issueCount"] == 2
    assert len(report_data["issues"]) == 2
    assert report_data["issues"][0]["ruleId"] == "LM-PCR-2011-R6-1-DA"
    assert "G.S.R. 629(E)" in report_data["issues"][0]["gazetteReference"]
    assert report_data["issues"][0]["evidence"] == "No recognizable MRP or currency pattern (₹/Rs.) detected in OCR text."


# ----------------------------------------------------
# 4. POST Missing Optional Fields (Succeeds)
# ----------------------------------------------------
def test_create_report_with_minimal_fields():
    payload = {
        "verdict": "PASS",
    }
    response = client.post("/api/report", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "id" in data


# ----------------------------------------------------
# 5. POST Invalid Verdict Rejected (e.g. ILLEGAL / LEGAL)
# ----------------------------------------------------
def test_reject_unsupported_verdict():
    for invalid_verdict in ["ILLEGAL", "LEGAL", "CERTIFIED", "COMPLIANT", "FAIL"]:
        payload = {
            "verdict": invalid_verdict,
            "productName": "Invalid Verdict Test",
        }
        response = client.post("/api/report", json=payload)
        assert response.status_code == 422, f"Verdict '{invalid_verdict}' should be rejected"


# ----------------------------------------------------
# 6. POST Oversized / Invalid Input Rejected
# ----------------------------------------------------
def test_reject_oversized_raw_ocr():
    payload = {
        "verdict": "PASS",
        "rawOcr": "A" * 60000,  # exceeds 50000 limit
    }
    response = client.post("/api/report", json=payload)
    assert response.status_code == 422


# ----------------------------------------------------
# 7. GET /api/reports (List recent reports)
# ----------------------------------------------------
def test_list_recent_reports():
    # Insert two reports
    client.post("/api/report", json={"verdict": "PASS", "productName": "Item 1"})
    client.post("/api/report", json={"verdict": "REVIEW", "productName": "Item 2"})

    response = client.get("/api/reports?limit=10")
    assert response.status_code == 200
    reports = response.json()
    assert len(reports) == 2
    assert reports[0]["productName"] == "Item 2"  # Newest first


# ----------------------------------------------------
# 8. GET Nonexistent Report Returns 404
# ----------------------------------------------------
def test_get_nonexistent_report():
    response = client.get("/api/reports/non-existent-uuid-12345")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# ----------------------------------------------------
# 9. GET /api/reports Limit Parameter Respected
# ----------------------------------------------------
def test_reports_limit_respected():
    for i in range(5):
        client.post("/api/report", json={"verdict": "PASS", "productName": f"Item {i}"})

    response = client.get("/api/reports?limit=3")
    assert response.status_code == 200
    reports = response.json()
    assert len(reports) == 3


# ----------------------------------------------------
# 10. Malicious / Special Character IDs do not Crash Server
# ----------------------------------------------------
def test_invalid_ids_do_not_crash_server():
    malicious_ids = [
        "' OR 1=1 --",
        "<script>alert(1)</script>",
        "../../etc/passwd",
        "!@#$%^&*()_+",
        " " * 10,
    ]
    for m_id in malicious_ids:
        response = client.get(f"/api/reports/{m_id}")
        assert response.status_code == 404


# ----------------------------------------------------
# 11. Idempotent Deduplication via localReportId
# ----------------------------------------------------
def test_idempotent_report_deduplication():
    local_id = "local_1726700000000_abc123"
    payload = {
        "verdict": "REVIEW",
        "productName": "Biscuits with missing MRP",
        "localReportId": local_id,
        "issueCount": 1,
        "issues": [
            {
                "ruleId": "LM-PCR-2011-R6-1-DA",
                "field": "mrp",
                "title": "Missing MRP",
                "severity": "critical",
                "explanation": "No MRP found",
            }
        ],
    }

    # First submission
    res1 = client.post("/api/report", json=payload)
    assert res1.status_code == 201
    data1 = res1.json()
    first_id = data1["id"]
    assert data1["status"] == "created"

    # Second submission with same localReportId (simulating retry or network reconnect)
    res2 = client.post("/api/report", json=payload)
    assert res2.status_code == 201
    data2 = res2.json()
    assert data2["id"] == first_id
    assert data2["status"] == "already_exists"

    # Verify reports count is 1, not duplicated
    list_res = client.get("/api/reports")
    assert list_res.status_code == 200
    reports = list_res.json()
    matching = [r for r in reports if r.get("localReportId") == local_id]
    assert len(matching) == 1
    assert matching[0]["id"] == first_id


# ----------------------------------------------------
# 12. Distinct localReportIds Create Distinct Records
# ----------------------------------------------------
def test_distinct_local_report_ids():
    res1 = client.post("/api/report", json={"verdict": "PASS", "localReportId": "local_1"})
    res2 = client.post("/api/report", json={"verdict": "PASS", "localReportId": "local_2"})
    assert res1.status_code == 201
    assert res2.status_code == 201
    assert res1.json()["id"] != res2.json()["id"]

