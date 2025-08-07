"""Tests for Finnhub message decoding."""

import json
import pathlib
import sys

# Ensure package importable when running from repo root
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from finnhub import FinnhubWebSocket  # noqa: E402


def test_decode_message() -> None:
    """Sample Finnhub payload should map to common tick schema."""

    message = json.dumps(
        {
            "type": "trade",
            "data": [
                {"s": "AAPL", "p": 123.45, "t": 1_700_000_000_000, "v": 42},
            ],
        }
    )
    ticks = FinnhubWebSocket.decode_message(message)
    assert ticks == [
        {"symbol": "AAPL", "ts": 1_700_000_000.0, "price": 123.45, "volume": 42}
    ]
