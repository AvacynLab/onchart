"""Tests for the `/candles` HTTP endpoint."""

import os
import sys
from fastapi.testclient import TestClient

# Ensure parent directory (services/analytics) is on the path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app import app, streamer
from aggregator import CandleAggregator


def test_candles_endpoint_returns_data(tmp_path):
    db_path = tmp_path / "candles.db"
    # Use an aggregator without scheduler for deterministic testing
    agg = CandleAggregator(db_path=str(db_path), intervals=(60,), start_scheduler=False)
    streamer.aggregator = agg

    # Generate ticks for one minute bucket and flush
    for i in range(60):
        tick = {"symbol": "AAPL", "ts": i, "price": float(i), "volume": 1}
        agg.on_tick(tick)
    agg.flush_interval(60, now=60)

    client = TestClient(app)
    resp = client.get("/candles/AAPL/60")
    assert resp.status_code == 200
    data = resp.json()
    assert data["symbol"] == "AAPL"
    assert data["candles"][0]["open"] == 0.0

    agg.close()
    streamer.aggregator = None
