from fastapi.testclient import TestClient
from app import app


def test_health_endpoint_returns_ok():
    """Health endpoint should confirm the service is running."""
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
