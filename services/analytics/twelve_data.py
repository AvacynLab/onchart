"""Twelve Data REST client with in-memory rate limiting and Redis caching.

This module mirrors the :mod:`alpha_vantage` connector but targets the
`twelvedata.com` API.  Only the subset of endpoints required by the
application is implemented.
"""

from __future__ import annotations

import asyncio
import os
import time
from collections import deque
from typing import Deque, Dict, List, Optional

import httpx
from redis.asyncio import Redis

API_URL = "https://api.twelvedata.com"
API_KEY = os.getenv("TWELVEDATA_API_KEY", "demo")
CACHE_TTL = 60 * 60 * 24  # 24h


class RateLimiter:
    """Simple in-memory rate limiter (max ``max_calls`` per ``period`` seconds)."""

    def __init__(self, max_calls: int, period: int) -> None:
        self.max_calls = max_calls
        self.period = period
        self.calls: Deque[float] = deque()
        self.lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self.lock:
            now = time.monotonic()
            while self.calls and now - self.calls[0] > self.period:
                self.calls.popleft()
            if len(self.calls) >= self.max_calls:
                sleep_for = self.period - (now - self.calls[0])
                await asyncio.sleep(sleep_for)
                now = time.monotonic()
                while self.calls and now - self.calls[0] > self.period:
                    self.calls.popleft()
            self.calls.append(time.monotonic())


class TwelveDataClient:
    """Client for Twelve Data with optional Redis caching."""

    def __init__(self, redis: Redis, api_key: str = API_KEY) -> None:
        self.redis = redis
        self.api_key = api_key
        # Free tier allows 8 requests/min; we stay under 5 for safety.
        self.rate_limiter = RateLimiter(5, 60)

    async def _cache_get(self, key: str) -> Optional[Dict | List]:
        data = await self.redis.get(key)
        if data:
            return httpx.Response(200, content=data).json()
        return None

    async def _cache_set(self, key: str, value: Dict | List) -> None:
        await self.redis.set(key, httpx.Response(200, json=value).content, ex=CACHE_TTL)

    async def history(self, symbol: str, interval: str) -> List[Dict[str, float]]:
        """Retrieve OHLCV history for ``symbol`` and ``interval``.

        The Twelve Data API returns candles with newest first.  We convert
        them to a list of dictionaries matching the Alpha Vantage format and
        cache the result for 24 hours.
        """

        cache_key = f"td:history:{symbol}:{interval}"
        if cached := await self._cache_get(cache_key):
            return cached  # type: ignore[return-value]

        await self.rate_limiter.acquire()
        params = {
            "symbol": symbol,
            "interval": interval,
            "apikey": self.api_key,
            "outputsize": 500,
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{API_URL}/time_series", params=params)
            resp.raise_for_status()
            data = resp.json()

        values: List[Dict[str, str]] = data.get("values", [])
        candles: List[Dict[str, float]] = []
        for item in values:
            candles.append(
                {
                    "ts": item.get("datetime", ""),
                    "open": float(item.get("open", 0)),
                    "high": float(item.get("high", 0)),
                    "low": float(item.get("low", 0)),
                    "close": float(item.get("close", 0)),
                    "volume": float(item.get("volume", 0)),
                }
            )

        await self._cache_set(cache_key, candles)
        return candles

    async def fundamentals(self, symbol: str) -> Dict[str, object]:
        """Retrieve fundamental metrics for ``symbol``.

        The response payload is cached for 24 hours to avoid hitting the
        free-tier rate limits.
        """

        cache_key = f"td:fundamentals:{symbol}"
        if cached := await self._cache_get(cache_key):
            return cached  # type: ignore[return-value]

        await self.rate_limiter.acquire()
        params = {"symbol": symbol, "apikey": self.api_key}
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{API_URL}/fundamentals", params=params)
            resp.raise_for_status()
            data: Dict[str, object] = resp.json()

        await self._cache_set(cache_key, data)
        return data
