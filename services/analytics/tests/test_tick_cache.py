"""Tests for Redis tick caching helpers."""

import asyncio
import fakeredis.aioredis
import pytest

from repository import (
    cache_tick,
    get_cached_ticks,
    cache_candles,
    get_cached_candles,
)


@pytest.mark.asyncio
async def test_cache_tick_lru_and_ttl():
    """Ticks are trimmed to ``max_len`` and expire after ``ttl`` seconds."""

    redis = fakeredis.aioredis.FakeRedis()
    base = {"symbol": "AAPL", "price": 1.0, "volume": 1.0}
    # Insert three ticks but keep only the last two
    for i in range(3):
        tick = base | {"ts": i}
        await cache_tick(redis, tick, ttl=1, max_len=2)
    ticks = await get_cached_ticks(redis, "AAPL")
    assert len(ticks) == 2
    assert ticks[0]["ts"] == 2 and ticks[1]["ts"] == 1
    ttl = await redis.ttl("ticks:AAPL")
    assert 0 < ttl <= 1
    await asyncio.sleep(1.1)
    ticks = await get_cached_ticks(redis, "AAPL")
    assert ticks == []


@pytest.mark.asyncio
async def test_cache_candles_ttl():
    """Cached candles persist for the configured TTL."""

    redis = fakeredis.aioredis.FakeRedis()
    candles = [
        {"ts": 0, "open": 1, "high": 1, "low": 1, "close": 1, "volume": 1}
    ]
    await cache_candles(redis, "AAPL", 60, candles, ttl=1, max_len=10)
    cached = await get_cached_candles(redis, "AAPL", 60)
    assert cached == candles
    ttl = await redis.ttl("cand:AAPL:60")
    assert 0 < ttl <= 1
    await asyncio.sleep(1.1)
    cached = await get_cached_candles(redis, "AAPL", 60)
    assert cached == []
