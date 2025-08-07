"""Tests for the `/sentiment` HTTP endpoint."""

import os
import sys
import pathlib
import sqlite3
from fastapi.testclient import TestClient

# Ensure parent directory (services/analytics) is on the path
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app import app, streamer  # noqa: E402
from aggregator import CandleAggregator  # noqa: E402
from repository import save_sentiment  # noqa: E402


def test_sentiment_endpoint_returns_data(tmp_path):
    """Endpoint should return stored sentiment rows."""

    db_path = tmp_path / "sentiment.db"
    agg = CandleAggregator(db_path=str(db_path), intervals=(60,), start_scheduler=False)
    streamer.aggregator = agg

    save_sentiment(
        agg.conn,
        [
            {
                "symbol": "AAPL",
                "source": "reddit",
                "text": "I love AAPL",
                "score": 0.5,
                "subjectivity": 0.75,
                "ts": 1,
            }
        ],
    )

    client = TestClient(app)
    resp = client.get("/sentiment/AAPL")
    assert resp.status_code == 200
    data = resp.json()
    assert data["symbol"] == "AAPL"
    row = data["sentiment"][0]
    assert row["score"] == 0.5
    assert row["subjectivity"] == 0.75

    agg.close()
    streamer.aggregator = None
