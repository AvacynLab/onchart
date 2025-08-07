import os
import sys

import httpx
import pytest
import fakeredis.aioredis
from httpx import AsyncClient, ASGITransport

# Ensure parent directory (services/analytics) is on the path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from alpha_vantage import AlphaVantageClient
from app import app as analytics_app


@pytest.mark.asyncio
async def test_history_endpoint_caches_response(monkeypatch):
    """Repeated calls for the same symbol/interval should hit Redis cache."""

    redis = fakeredis.aioredis.FakeRedis()
    analytics_app.state.av_client = AlphaVantageClient(redis, api_key="demo")

    calls = {"count": 0}

    original_get = httpx.AsyncClient.get

    async def fake_get(self, url, params=None, **kwargs):
        if "alphavantage.co" in url:
            calls["count"] += 1
            data = {
                "Time Series (5min)": {
                    "2023-01-01 00:00:00": {
                        "1. open": "1",
                        "2. high": "2",
                        "3. low": "0.5",
                        "4. close": "1.5",
                        "5. volume": "100",
                    }
                }
            }
            return httpx.Response(200, json=data, request=httpx.Request("GET", url))
        return await original_get(self, url, params=params, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    transport = ASGITransport(app=analytics_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp1 = await ac.get("/history", params={"symbol": "AAPL", "interval": "5min"})
        resp2 = await ac.get("/history", params={"symbol": "AAPL", "interval": "5min"})

    assert resp1.status_code == 200
    assert resp1.json()["candles"]
    assert resp1.json() == resp2.json()
    assert calls["count"] == 1


@pytest.mark.asyncio
async def test_fundamentals_endpoint(monkeypatch):
    """Fundamentals endpoint should return parsed data from API."""

    redis = fakeredis.aioredis.FakeRedis()
    analytics_app.state.av_client = AlphaVantageClient(redis, api_key="demo")

    original_get = httpx.AsyncClient.get

    async def fake_get(self, url, params=None, **kwargs):
        if "alphavantage.co" in url:
            data = {"PERatio": "15.0", "DividendYield": "0.5"}
            return httpx.Response(200, json=data, request=httpx.Request("GET", url))
        return await original_get(self, url, params=params, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    transport = ASGITransport(app=analytics_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/fundamentals", params={"symbol": "AAPL"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["PERatio"] == "15.0"
    assert "DividendYield" in body
