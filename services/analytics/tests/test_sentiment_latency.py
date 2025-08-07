import os
import sys
import time
import sqlite3
import pathlib

# Ensure the analytics package is importable when tests run standalone
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from nlp_worker import process_post  # noqa: E402
from repository import get_sentiment  # noqa: E402


def test_nlp_pipeline_latency_under_minute(tmp_path):
    """Posts should be processed and stored in under one minute."""
    db_path = tmp_path / "sentiment.db"
    post = {
        "symbol": "AAPL",
        "source": "reddit",
        "text": "Great stock",
        "ts": int(time.time()),
    }

    start = time.time()
    process_post(str(db_path), post)
    elapsed = time.time() - start

    conn = sqlite3.connect(db_path)
    try:
        rows = get_sentiment(conn, "AAPL")
    finally:
        conn.close()

    assert rows, "Processed sentiment row should be saved"
    assert elapsed < 60, f"Processing took too long: {elapsed}s"
    assert time.time() - rows[0]["ts"] < 60, "Latency exceeds one minute"
