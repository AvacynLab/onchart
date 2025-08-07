"""Finnhub WebSocket connector.

This module connects to Finnhub's real-time WebSocket feed and forwards
trade ticks decoded into a common schema: ``{"symbol", "ts", "price",
"volume"}``.  Messages from Finnhub arrive as JSON payloads containing a
``data`` list of trade objects.  The connector automatically reconnects
with exponential backoff and performs simple per-second throttling to
limit downstream load.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any, Dict, Iterable

import websockets

logger = logging.getLogger(__name__)


class FinnhubWebSocket:
    """Connect to Finnhub and push decoded ticks to a queue."""

    def __init__(self, symbols: Iterable[str], token: str, *, throttle: int = 20) -> None:
        self.symbols = list(symbols)
        self.token = token
        self.throttle = throttle
        self._tick_count = 0
        self._last_reset = time.time()

    async def run(self, queue: asyncio.Queue[Dict[str, Any]]) -> None:
        """Connect to Finnhub and forward decoded ticks to ``queue``."""

        url = f"wss://ws.finnhub.io?token={self.token}"
        subscribe_msgs = [json.dumps({"type": "subscribe", "symbol": s}) for s in self.symbols]
        backoff = 1
        while True:
            try:
                async with websockets.connect(url, ping_interval=20) as ws:
                    for msg in subscribe_msgs:
                        await ws.send(msg)
                    async for raw in ws:
                        for tick in self.decode_message(raw):
                            if self._allow_tick():
                                await queue.put(tick)
                backoff = 1  # reset after clean exit
            except Exception as exc:  # pragma: no cover - network errors
                logger.warning("Finnhub feed error: %s", exc)
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 30)

    def _allow_tick(self) -> bool:
        """Throttle if more than ``self.throttle`` ticks arrive per second."""

        now = time.time()
        if now - self._last_reset >= 1:
            self._last_reset = now
            self._tick_count = 0
        self._tick_count += 1
        return self._tick_count <= self.throttle

    @staticmethod
    def decode_message(message: str) -> list[Dict[str, Any]]:
        """Decode a Finnhub JSON message into ticks.

        Each incoming message contains a ``data`` array of trade objects.
        The timestamps are in milliseconds since epoch.
        """

        payload = json.loads(message)
        ticks = []
        for item in payload.get("data", []):
            ticks.append(
                {
                    "symbol": item["s"],
                    "ts": item["t"] / 1000.0,
                    "price": item["p"],
                    "volume": item["v"],
                }
            )
        return ticks
