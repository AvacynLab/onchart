"""Unit tests for the repository layer."""

import os
import sys
import sqlite3

# Ensure parent directory (services/analytics) is on the path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from repository import get_candles


def test_get_candles_returns_recent_rows(tmp_path):
    db = tmp_path / "candles.db"
    conn = sqlite3.connect(db)
    conn.execute(
        """
        CREATE TABLE candles (
            symbol TEXT, interval INTEGER, ts INTEGER,
            open REAL, high REAL, low REAL, close REAL, volume REAL
        )
        """
    )
    # Insert three rows with increasing timestamps
    rows = [
        ("AAPL", 60, 0, 1, 1, 1, 1, 1),
        ("AAPL", 60, 60, 2, 2, 2, 2, 2),
        ("AAPL", 60, 120, 3, 3, 3, 3, 3),
    ]
    conn.executemany(
        "INSERT INTO candles VALUES (?,?,?,?,?,?,?,?)",
        rows,
    )
    conn.commit()

    candles = get_candles(conn, "AAPL", 60, limit=2)
    # Should return the last two records ordered by timestamp descending
    assert len(candles) == 2
    assert candles[0]["ts"] == 120
    assert candles[1]["ts"] == 60
    conn.close()
