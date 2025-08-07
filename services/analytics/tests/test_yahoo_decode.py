"""Tests for Yahoo Finance message decoding."""

import base64

import pathlib
import sys

# Ensure package importable when running from repo root
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from yahoo import YahooWebSocket  # noqa: E402
from proto import quote_pb2  # noqa: E402


def test_decode_message_roundtrip() -> None:
    """Encoding a Quote proto and decoding should yield original fields."""

    quote = quote_pb2.Quote(
        id="AAPL", price=123.45, time=1_700_000_000_000, volume=42
    )
    payload = base64.b64encode(quote.SerializeToString()).decode()
    tick = YahooWebSocket.decode_message(payload)
    assert tick == {
        "symbol": "AAPL",
        "ts": 1_700_000_000.0,
        "price": 123.45,
        "volume": 42,
    }
