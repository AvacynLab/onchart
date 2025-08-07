"""Yahoo Finance WebSocket connector.

This module provides utilities to connect to Yahoo Finance's public
WebSocket feed (``wss://streamer.finance.yahoo.com``).  Incoming messages
are base64-encoded Protobuf ``Quote`` payloads which are decoded into a
common tick schema: ``{"symbol", "ts", "price", "volume"}``.

The connector performs automatic reconnection with exponential backoff
and applies a simple per-second throttling to avoid flooding downstream
consumers when message rates spike.
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
import time
from typing import Any, Dict, Iterable

import websockets

from proto import quote_pb2

logger = logging.getLogger(__name__)


class YahooWebSocket:
    """Connect to Yahoo Finance and forward decoded ticks to a queue."""

    def __init__(self, symbols: Iterable[str], *, throttle: int = 20) -> None:
        self.symbols = list(symbols)
        self.throttle = throttle
        self._tick_count = 0
        self._last_reset = time.time()

    async def run(self, queue: asyncio.Queue[Dict[str, Any]]) -> None:
        """Connect to the Yahoo stream and push decoded ticks to ``queue``."""

        url = "wss://streamer.finance.yahoo.com"
        subscribe_msg = json.dumps({"subscribe": self.symbols})
        backoff = 1
        while True:
            try:
                async with websockets.connect(url, ping_interval=20) as ws:
                    await ws.send(subscribe_msg)
                    async for raw in ws:
                        tick = self.decode_message(raw)
                        if self._allow_tick():
                            await queue.put(tick)
                backoff = 1  # reset after clean exit
            except Exception as exc:  # pragma: no cover - network errors
                logger.warning("Yahoo feed error: %s", exc)
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 30)

    def _allow_tick(self) -> bool:
        """Simple per-second throttling based on ``self.throttle``."""

        now = time.time()
        if now - self._last_reset >= 1:
            self._last_reset = now
            self._tick_count = 0
        self._tick_count += 1
        return self._tick_count <= self.throttle

    @staticmethod
    def decode_message(message: str) -> Dict[str, Any]:
        """Decode a base64-encoded Protobuf ``Quote`` message."""

        payload = base64.b64decode(message)
        quote = quote_pb2.Quote()
        quote.ParseFromString(payload)
        # Yahoo timestamps are in milliseconds since epoch
        return {
            "symbol": quote.id,
            "ts": quote.time / 1000.0,
            "price": quote.price,
            "volume": quote.volume,
        }
