import importlib

from fastapi.testclient import TestClient


def test_rate_limit_exceeded(monkeypatch):
    """Ensure middleware returns 429 when exceeding per-IP quota."""

    # Configure a very small limit for the test environment before importing
    # the application module so the middleware picks it up.
    monkeypatch.setenv("RATE_LIMIT", "2")
    import services.analytics.app as app_module
    importlib.reload(app_module)

    with TestClient(app_module.app) as client:
        # Two requests are allowed.
        assert client.get("/candles/AAPL/60").status_code == 200
        assert client.get("/candles/AAPL/60").status_code == 200
        # The third one exceeds the quota and should be rejected.
        response = client.get("/candles/AAPL/60")
        assert response.status_code == 429
