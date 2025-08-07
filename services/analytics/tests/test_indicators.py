"""Tests for incremental indicators and retrieval."""

import os
import sys

import pytest

# Ensure parent directory (services/analytics) is on the path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from indicators import IndicatorManager
from repository import get_indicator
from app import app
import fakeredis.aioredis
from httpx import AsyncClient, ASGITransport


def compute_rsi(prices, period):
    """Compute RSI from scratch using Wilder's smoothing for validation."""

    if len(prices) < period + 1:
        return None
    gains = []
    losses = []
    for i in range(1, period + 1):
        change = prices[i] - prices[i - 1]
        gains.append(max(change, 0))
        losses.append(max(-change, 0))
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    for i in range(period + 1, len(prices)):
        change = prices[i] - prices[i - 1]
        gain = max(change, 0)
        loss = max(-change, 0)
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100 - 100 / (1 + rs)


def compute_macd(prices):
    """Compute MACD line, signal and histogram for validation."""

    k_fast = 2 / (12 + 1)
    k_slow = 2 / (26 + 1)
    k_sig = 2 / (9 + 1)
    ema_fast = ema_slow = signal = None
    for price in prices:
        ema_fast = price if ema_fast is None else price * k_fast + ema_fast * (1 - k_fast)
        ema_slow = price if ema_slow is None else price * k_slow + ema_slow * (1 - k_slow)
        macd_line = ema_fast - ema_slow
        signal = macd_line if signal is None else macd_line * k_sig + signal * (1 - k_sig)
    hist = macd_line - signal
    return macd_line, signal, hist


def compute_bbands(prices, period=20, k=2.0):
    """Compute Bollinger Bands for validation."""

    if len(prices) < period:
        return None
    window = prices[-period:]
    mean = sum(window) / period
    variance = sum((p - mean) ** 2 for p in window) / period
    std = variance ** 0.5
    upper = mean + k * std
    lower = mean - k * std
    return upper, mean, lower


@pytest.mark.asyncio
async def test_sma_incremental_matches_full():
    """Incremental SMA should match recomputation within 0.1%."""

    redis = fakeredis.aioredis.FakeRedis()
    manager = IndicatorManager(redis, period=5)
    prices = [1, 2, 3, 4, 5, 6]
    buf = []
    for price in prices:
        buf.append(price)
        if len(buf) > 5:
            buf.pop(0)
        await manager.on_tick({"symbol": "AAPL", "ts": 0, "price": price})
        expected = sum(buf) / len(buf)
        actual = float(await redis.get("ind:AAPL:0:sma"))
        assert abs(actual - expected) / expected < 0.001

    value = await get_indicator(redis, "AAPL", 0, "sma")
    assert value == pytest.approx(expected)


@pytest.mark.asyncio
async def test_ema_incremental_matches_full():
    """Incremental EMA should match full recomputation."""

    redis = fakeredis.aioredis.FakeRedis()
    manager = IndicatorManager(redis, period=3)
    prices = [10, 11, 12, 13]
    k = 2 / (3 + 1)
    ema_full = None
    for price in prices:
        if ema_full is None:
            ema_full = price
        else:
            ema_full = price * k + ema_full * (1 - k)
        await manager.on_tick({"symbol": "MSFT", "ts": 0, "price": price})
        actual = float(await redis.get("ind:MSFT:0:ema"))
        assert abs(actual - ema_full) / ema_full < 0.001

    value = await get_indicator(redis, "MSFT", 0, "ema")
    assert value == pytest.approx(ema_full)


@pytest.mark.asyncio
async def test_rsi_incremental_matches_full():
    """Incremental RSI should match recomputation within 0.1%."""

    redis = fakeredis.aioredis.FakeRedis()
    manager = IndicatorManager(redis, period=3)
    prices = [44, 47, 48, 47, 49, 50]
    seen = []
    expected = None
    for price in prices:
        seen.append(price)
        await manager.on_tick({"symbol": "IBM", "ts": 0, "price": price})
        expected = compute_rsi(seen, 3)
        if expected is None:
            continue
        actual = float(await redis.get("ind:IBM:0:rsi"))
        assert abs(actual - expected) / expected < 0.001

    value = await get_indicator(redis, "IBM", 0, "rsi")
    assert value == pytest.approx(expected)


@pytest.mark.asyncio
async def test_macd_incremental_matches_full():
    """Incremental MACD should match recomputation within 0.1%."""

    redis = fakeredis.aioredis.FakeRedis()
    manager = IndicatorManager(redis)
    prices = list(range(1, 60))
    seen = []
    for price in prices:
        seen.append(price)
        await manager.on_tick({"symbol": "TSLA", "ts": 0, "price": price})
        macd_line, signal, hist = compute_macd(seen)
        actual_macd = float(await redis.get("ind:TSLA:0:macd"))
        actual_sig = float(await redis.get("ind:TSLA:0:macd_signal"))
        actual_hist = float(await redis.get("ind:TSLA:0:macd_hist"))
        assert actual_macd == pytest.approx(macd_line, rel=1e-3)
        assert actual_sig == pytest.approx(signal, rel=1e-3)
        assert actual_hist == pytest.approx(hist, rel=1e-3)

    value = await get_indicator(redis, "TSLA", 0, "macd")
    assert value == pytest.approx(macd_line)


@pytest.mark.asyncio
async def test_bbands_incremental_matches_full():
    """Incremental Bollinger Bands should match full recomputation."""

    redis = fakeredis.aioredis.FakeRedis()
    manager = IndicatorManager(redis)
    prices = list(range(1, 45))
    seen = []
    for price in prices:
        seen.append(price)
        await manager.on_tick({"symbol": "AMZN", "ts": 0, "price": price})
        expected = compute_bbands(seen)
        if expected is None:
            continue
        upper, mean, lower = expected
        actual_u = float(await redis.get("ind:AMZN:0:bb_upper"))
        actual_m = float(await redis.get("ind:AMZN:0:bb_middle"))
        actual_l = float(await redis.get("ind:AMZN:0:bb_lower"))
        assert actual_u == pytest.approx(upper, rel=1e-3)
        assert actual_m == pytest.approx(mean, rel=1e-3)
        assert actual_l == pytest.approx(lower, rel=1e-3)

    value = await get_indicator(redis, "AMZN", 0, "bb_upper")
    assert value == pytest.approx(upper)


@pytest.mark.asyncio
async def test_indicator_endpoint_returns_value():
    """Endpoint should return SMA, EMA and RSI values on demand."""

    redis = fakeredis.aioredis.FakeRedis()
    app.state.redis = redis
    app.state.indicators = IndicatorManager(redis, period=3)
    # Feed enough ticks to seed RSI
    prices = [1, 2, 3, 4]
    for p in prices:
        await app.state.indicators.on_tick({"symbol": "AAPL", "ts": 0, "price": p})
    expected_rsi = compute_rsi(prices, 3)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp_sma = await ac.get("/indicators/AAPL/0")
        resp_ema = await ac.get("/indicators/AAPL/0", params={"name": "ema"})
        resp_rsi = await ac.get("/indicators/AAPL/0", params={"name": "rsi"})
    assert resp_sma.status_code == 200
    assert resp_sma.json()["sma"] == pytest.approx(sum(prices[-3:]) / 3)
    assert resp_ema.status_code == 200
    k = 2 / (3 + 1)
    ema_expected = None
    for p in prices:
        ema_expected = p if ema_expected is None else p * k + ema_expected * (1 - k)
    assert resp_ema.json()["ema"] == pytest.approx(ema_expected)
    assert resp_rsi.status_code == 200
    assert resp_rsi.json()["rsi"] == pytest.approx(expected_rsi)


@pytest.mark.asyncio
async def test_indicator_endpoint_macd_bb():
    """Endpoint should return MACD and Bollinger Band values."""

    redis = fakeredis.aioredis.FakeRedis()
    app.state.redis = redis
    app.state.indicators = IndicatorManager(redis)
    prices = list(range(1, 60))
    for p in prices:
        await app.state.indicators.on_tick({"symbol": "AAPL", "ts": 0, "price": p})
    macd_line, _, _ = compute_macd(prices)
    bb_u, _, _ = compute_bbands(prices)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp_macd = await ac.get("/indicators/AAPL/0", params={"name": "macd"})
        resp_bb = await ac.get("/indicators/AAPL/0", params={"name": "bb_upper"})
    assert resp_macd.status_code == 200
    assert resp_macd.json()["macd"] == pytest.approx(macd_line)
    assert resp_bb.status_code == 200
    assert resp_bb.json()["bb_upper"] == pytest.approx(bb_u)
