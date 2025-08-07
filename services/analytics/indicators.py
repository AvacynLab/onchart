"""Incremental technical indicators stored in Redis."""

from __future__ import annotations

from collections import deque
from math import sqrt
from typing import Dict

from redis.asyncio import Redis


class IndicatorManager:
    """Maintain rolling indicators for multiple symbols.

    The manager computes incremental technical indicators directly from
    incoming tick prices and persists the most recent values in Redis.  It
    currently maintains:

    * Simple moving average (SMA)
    * Exponential moving average (EMA)
    * Relative Strength Index (RSI, Wilder's smoothing)
    * Moving Average Convergence Divergence (MACD)
    * Bollinger Bands (20-period, 2σ)

    Caching values in Redis allows other components (e.g. HTTP endpoints) to
    retrieve up-to-date indicators without sharing in-memory state.

    Parameters
    ----------
    redis:
        Redis client used for caching indicator values.
    period:
        Number of ticks over which to compute moving averages.
    interval:
        Logical interval identifier included in Redis keys. ``0`` represents
        raw tick-based indicators.
    """

    def __init__(self, redis: Redis, period: int = 14, interval: int = 0) -> None:
        self.redis = redis
        self.period = period
        self.interval = interval

        # Keep per-symbol rolling buffers and running sums for O(1) SMA updates.
        self._buffers: Dict[str, deque[float]] = {}
        self._sums: Dict[str, float] = {}

        # Per-symbol exponential moving averages.  ``_k`` is the smoothing factor
        # (2 / (period + 1)) used for incremental EMA updates.
        self._emas: Dict[str, float] = {}
        self._k = 2 / (period + 1)

        # --- RSI state -------------------------------------------------
        # Previous price to derive the price delta per symbol.
        self._prev_price: Dict[str, float] = {}
        # Wilder's smoothed average gain and loss.
        self._avg_gain: Dict[str, float] = {}
        self._avg_loss: Dict[str, float] = {}
        # Buffers used only during the warm-up period to compute the first
        # average gain/loss over ``period`` price changes.
        self._gain_buf: Dict[str, deque[float]] = {}
        self._loss_buf: Dict[str, deque[float]] = {}

        # --- MACD state -----------------------------------------------
        # Separate EMAs for the fast (12) and slow (26) periods plus the
        # signal line (9-period EMA of the MACD line).
        self._ema_fast: Dict[str, float] = {}
        self._ema_slow: Dict[str, float] = {}
        self._macd_signal: Dict[str, float] = {}
        self._k_fast = 2 / (12 + 1)
        self._k_slow = 2 / (26 + 1)
        self._k_sig = 2 / (9 + 1)

        # --- Bollinger Bands state ------------------------------------
        # Rolling window to compute mean and standard deviation for the
        # classic 20-period Bollinger Bands with 2 standard deviations.
        self._bb_buf: Dict[str, deque[float]] = {}
        self._bb_sum: Dict[str, float] = {}
        self._bb_sum_sq: Dict[str, float] = {}
        self._bb_period = 20
        self._bb_k = 2.0

    # ------------------------------------------------------------------
    async def on_tick(self, tick: Dict[str, float]) -> None:
        """Update indicator state with a new tick."""

        symbol = str(tick["symbol"])
        price = float(tick["price"])

        # ---------------------------- SMA -------------------------------
        buf = self._buffers.setdefault(symbol, deque())
        current_sum = self._sums.get(symbol, 0.0)

        if len(buf) == self.period:
            # Remove oldest price from buffer and running sum.
            removed = buf.popleft()
            current_sum -= removed

        buf.append(price)
        current_sum += price
        self._sums[symbol] = current_sum

        sma = current_sum / len(buf)
        await self.redis.set(self._key(symbol, "sma"), sma)

        # ---------------------------- EMA -------------------------------
        prev_ema = self._emas.get(symbol)
        if prev_ema is None:
            ema = price  # Seed EMA with the first price.
        else:
            ema = price * self._k + prev_ema * (1 - self._k)
        self._emas[symbol] = ema
        await self.redis.set(self._key(symbol, "ema"), ema)

        # ---------------------------- RSI -------------------------------
        prev = self._prev_price.get(symbol)
        if prev is not None:
            change = price - prev
            gain = max(change, 0.0)
            loss = max(-change, 0.0)

            if symbol not in self._avg_gain:
                # Warm-up phase: collect ``period`` deltas to seed the
                # initial average gain and loss.
                g_buf = self._gain_buf.setdefault(symbol, deque())
                l_buf = self._loss_buf.setdefault(symbol, deque())
                g_buf.append(gain)
                l_buf.append(loss)
                if len(g_buf) == self.period:
                    avg_gain = sum(g_buf) / self.period
                    avg_loss = sum(l_buf) / self.period
                    self._avg_gain[symbol] = avg_gain
                    self._avg_loss[symbol] = avg_loss
                    rs = avg_gain / avg_loss if avg_loss else float("inf")
                    rsi = 100 - 100 / (1 + rs) if avg_loss else 100.0
                    await self.redis.set(self._key(symbol, "rsi"), rsi)
            else:
                # Wilder's smoothing for subsequent periods.
                avg_gain = self._avg_gain[symbol] = (
                    (self._avg_gain[symbol] * (self.period - 1) + gain) / self.period
                )
                avg_loss = self._avg_loss[symbol] = (
                    (self._avg_loss[symbol] * (self.period - 1) + loss) / self.period
                )
                if avg_loss == 0:
                    rsi = 100.0
                else:
                    rs = avg_gain / avg_loss
                    rsi = 100 - 100 / (1 + rs)
                await self.redis.set(self._key(symbol, "rsi"), rsi)

        # ---------------------------- MACD ------------------------------
        ema_fast_prev = self._ema_fast.get(symbol)
        if ema_fast_prev is None:
            ema_fast = price
        else:
            ema_fast = price * self._k_fast + ema_fast_prev * (1 - self._k_fast)
        self._ema_fast[symbol] = ema_fast

        ema_slow_prev = self._ema_slow.get(symbol)
        if ema_slow_prev is None:
            ema_slow = price
        else:
            ema_slow = price * self._k_slow + ema_slow_prev * (1 - self._k_slow)
        self._ema_slow[symbol] = ema_slow

        macd_line = ema_fast - ema_slow
        signal_prev = self._macd_signal.get(symbol)
        if signal_prev is None:
            signal = macd_line
        else:
            signal = macd_line * self._k_sig + signal_prev * (1 - self._k_sig)
        self._macd_signal[symbol] = signal
        hist = macd_line - signal
        await self.redis.mset({
            self._key(symbol, "macd"): macd_line,
            self._key(symbol, "macd_signal"): signal,
            self._key(symbol, "macd_hist"): hist,
        })

        # ----------------------- Bollinger Bands -----------------------
        bb_buf = self._bb_buf.setdefault(symbol, deque())
        bb_sum = self._bb_sum.get(symbol, 0.0)
        bb_sum_sq = self._bb_sum_sq.get(symbol, 0.0)

        if len(bb_buf) == self._bb_period:
            old = bb_buf.popleft()
            bb_sum -= old
            bb_sum_sq -= old * old

        bb_buf.append(price)
        bb_sum += price
        bb_sum_sq += price * price
        self._bb_sum[symbol] = bb_sum
        self._bb_sum_sq[symbol] = bb_sum_sq

        if len(bb_buf) == self._bb_period:
            mean = bb_sum / self._bb_period
            variance = bb_sum_sq / self._bb_period - mean * mean
            std = sqrt(variance) if variance > 0 else 0.0
            upper = mean + self._bb_k * std
            lower = mean - self._bb_k * std
            await self.redis.mset({
                self._key(symbol, "bb_upper"): upper,
                self._key(symbol, "bb_middle"): mean,
                self._key(symbol, "bb_lower"): lower,
            })

        # Store last price for next delta computation.
        self._prev_price[symbol] = price

    # ------------------------------------------------------------------
    def _key(self, symbol: str, name: str) -> str:
        return f"ind:{symbol}:{self.interval}:{name}"
