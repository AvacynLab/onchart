"""Tests for the `/symbols` REST endpoint."""

import os
import sys
from fastapi.testclient import TestClient

# Ensure parent directory (services/analytics) is on the path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app import app, streamer
from aggregator import CandleAggregator


def test_symbols_endpoint_returns_watchlist(tmp_path):
    """Endpoint should return symbol metadata stored in SQLite."""

    db_path = tmp_path / "symbols.db"
    agg = CandleAggregator(db_path=str(db_path), intervals=(60,), start_scheduler=False)
    # Create symbols table and insert a single entry
    agg.conn.execute(
        "CREATE TABLE symbols (symbol TEXT PRIMARY KEY, name TEXT NOT NULL)"
    )
    agg.conn.execute(
        "INSERT INTO symbols(symbol, name) VALUES (?, ?)", ("AAPL", "Apple Inc.")
    )
    agg.conn.commit()
    streamer.aggregator = agg

    client = TestClient(app)
    resp = client.get("/symbols")
    assert resp.status_code == 200
    assert resp.json() == {
        "symbols": [{"symbol": "AAPL", "name": "Apple Inc."}]
    }

    agg.close()
    streamer.aggregator = None

