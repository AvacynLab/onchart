"""Alpha Vantage REST connector with caching and rate limiting."""

from __future__ import annotations

import asyncio
import os
import time
from collections import deque
from typing import Deque, Dict, List, Optional

import httpx
from redis.asyncio import Redis

API_URL = "https://www.alphavantage.co/query"
API_KEY = os.getenv("ALPHAVANTAGE_API_KEY", "demo")
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


class AlphaVantageClient:
    """Client handling requests to Alpha Vantage with Redis caching."""

    def __init__(self, redis: Redis, api_key: str = API_KEY) -> None:
        self.redis = redis
        self.api_key = api_key
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

        Returns a list of candle dictionaries sorted from newest to oldest.
        Cached for 24h to respect free-tier quotas.
        """

        cache_key = f"history:{symbol}:{interval}"
        if cached := await self._cache_get(cache_key):
            return cached  # type: ignore[return-value]

        await self.rate_limiter.acquire()
        params = {
            "function": "TIME_SERIES_INTRADAY",
            "symbol": symbol,
            "interval": interval,
            "apikey": self.api_key,
            "outputsize": "compact",
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(API_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        key = f"Time Series ({interval})"
        series: Dict[str, Dict[str, str]] = data.get(key, {})
        candles: List[Dict[str, float]] = []
        for ts, values in series.items():
            candles.append(
                {
                    "ts": ts,
                    "open": float(values.get("1. open", 0)),
                    "high": float(values.get("2. high", 0)),
                    "low": float(values.get("3. low", 0)),
                    "close": float(values.get("4. close", 0)),
                    "volume": float(values.get("5. volume", 0)),
                }
            )

        await self._cache_set(cache_key, candles)
        return candles

    async def fundamentals(self, symbol: str) -> Dict[str, str]:
        """Retrieve fundamental metrics for ``symbol``.

        The data is cached for 24 hours and rate-limited to 5 req/min.
        """

        cache_key = f"fundamentals:{symbol}"
        if cached := await self._cache_get(cache_key):
            return cached  # type: ignore[return-value]

        await self.rate_limiter.acquire()
        params = {
            "function": "OVERVIEW",
            "symbol": symbol,
            "apikey": self.api_key,
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(API_URL, params=params)
            resp.raise_for_status()
            data: Dict[str, str] = resp.json()

        await self._cache_set(cache_key, data)
        return data
