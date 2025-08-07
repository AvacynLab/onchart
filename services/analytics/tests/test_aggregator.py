"""Tests for the :mod:`aggregator` module."""

import os
import sys

# Ensure parent directory (services/analytics) is on the path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from aggregator import CandleAggregator


def test_five_minute_candle(tmp_path):
    """A stream of 100 sequential ticks should yield one 5m candle.

    The ticks simulate a steady price increase from 1 to 100 with unit volume.
    After flushing the 5-minute interval the stored candle must reflect
    expected OHLCV values.
    """

    db_path = tmp_path / "candles.db"
    agg = CandleAggregator(db_path=str(db_path), intervals=(300,), start_scheduler=False)
    ts = 0
    for i in range(100):
        agg.on_tick({"symbol": "AAPL", "ts": ts, "price": i + 1, "volume": 1})
        ts += 3  # spread ticks across 5 minutes (100 * 3s = 300s)
    # Flush as if current time is exactly at the 5 minute boundary
    agg.flush_interval(300, now=300)
    rows = agg.get_candles("AAPL", 300)
    assert rows == [
        {
            "ts": 0,
            "open": 1.0,
            "high": 100.0,
            "low": 1.0,
            "close": 100.0,
            "volume": 100.0,
        }
    ]
    agg.close()
