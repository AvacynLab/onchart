"""Aggregate streaming ticks into candlesticks and persist to SQLite.

This module exposes :class:`CandleAggregator` which ingests individual
market ticks, maintains in-memory candlesticks for multiple time intervals
and periodically flushes completed candles to a SQLite database.  The
aggregation is driven by an APScheduler instance to ensure candles are
finalised even if no new tick arrives after an interval boundary.

The goal is to keep the aggregation logic lightweight and dependency-free
(except for APScheduler) so it can run inside the analytics service without
requiring an external timeseries database during early development.
"""

from __future__ import annotations

import sqlite3
import time
from typing import Dict, Tuple, Iterable

try:  # pragma: no cover - import resolution for tests vs package
    from .repository import get_candles as repo_get_candles
except ImportError:  # When running without package context
    from repository import get_candles as repo_get_candles

from apscheduler.schedulers.asyncio import AsyncIOScheduler


class CandleAggregator:
    """Real-time tick to candlestick aggregator.

    Parameters
    ----------
    db_path:
        Path to the SQLite database file used to store finalised candles.
    intervals:
        Iterable of interval lengths in seconds for which candles should be
        produced (e.g. ``300`` for 5 minutes).
    """

    def __init__(
        self,
        db_path: str = "analytics.db",
        intervals: Iterable[int] = (300, 900, 3600, 14400, 86400),
        start_scheduler: bool = True,
    ) -> None:
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS candles (
                symbol   TEXT NOT NULL,
                interval INTEGER NOT NULL,
                ts       INTEGER NOT NULL,
                open     REAL NOT NULL,
                high     REAL NOT NULL,
                low      REAL NOT NULL,
                close    REAL NOT NULL,
                volume   REAL NOT NULL,
                PRIMARY KEY (symbol, interval, ts)
            )
            """
        )
        self.conn.commit()

        self.intervals = tuple(intervals)
        # State structure: {interval: {(symbol, bucket_start): {open, high, low, close, volume}}}
        self.state: Dict[int, Dict[Tuple[str, int], Dict[str, float]]] = {i: {} for i in self.intervals}

        # Scheduler that periodically flushes completed candles to disk.
        self.scheduler = AsyncIOScheduler()
        for interval in self.intervals:
            self.scheduler.add_job(self.flush_interval, "interval", seconds=interval, args=[interval])
        if start_scheduler:
            # ``AsyncIOScheduler.start`` requires a running event loop; callers
            # such as unit tests can disable automatic start and control flushing
            # manually.
            self.scheduler.start()

    # ------------------------------------------------------------------
    def on_tick(self, tick: Dict[str, float]) -> None:
        """Update in-memory candlesticks with a new market tick.

        The ``tick`` dictionary is expected to contain ``symbol``, ``ts``
        (epoch seconds), ``price`` and ``volume`` fields.  For each tracked
        interval we compute the bucket start time and update the OHLCV values
        of the corresponding candlestick in memory.
        """

        symbol = str(tick["symbol"])
        ts = float(tick["ts"])
        price = float(tick["price"])
        volume = float(tick.get("volume", 0))

        for interval in self.intervals:
            bucket = int(ts // interval * interval)
            key = (symbol, bucket)
            candle = self.state[interval].get(key)
            if candle is None:
                # First tick for this bucket: initialise OHLCV.
                self.state[interval][key] = {
                    "open": price,
                    "high": price,
                    "low": price,
                    "close": price,
                    "volume": volume,
                }
            else:
                candle["high"] = max(candle["high"], price)
                candle["low"] = min(candle["low"], price)
                candle["close"] = price
                candle["volume"] += volume

    # ------------------------------------------------------------------
    def flush_interval(self, interval: int, now: int | None = None) -> None:
        """Persist and remove completed candles for ``interval``.

        Parameters
        ----------
        interval:
            Interval length in seconds to flush.
        now:
            Optional override of the current timestamp (epoch seconds).  When
            ``None`` the system time is used.  Candles whose bucket start is
            strictly before ``now`` rounded down to the nearest interval are
            written to the database.
        """

        now = int(now if now is not None else time.time())
        boundary = now - (now % interval)
        to_flush = [key for key in self.state[interval] if key[1] < boundary]
        for key in to_flush:
            symbol, bucket = key
            data = self.state[interval].pop(key)
            self.conn.execute(
                """
                INSERT OR REPLACE INTO candles
                (symbol, interval, ts, open, high, low, close, volume)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    symbol,
                    interval,
                    bucket,
                    data["open"],
                    data["high"],
                    data["low"],
                    data["close"],
                    data["volume"],
                ),
            )
        if to_flush:
            self.conn.commit()

    # ------------------------------------------------------------------
    def get_candles(self, symbol: str, interval: int, limit: int = 100) -> list[dict]:
        """Return recent candles for ``symbol`` and ``interval``.

        This convenience method delegates to the repository layer so that
        the rest of the application can remain agnostic of the underlying
        storage engine.
        """

        return repo_get_candles(self.conn, symbol, interval, limit)

    # ------------------------------------------------------------------
    def close(self) -> None:
        """Shut down the scheduler and close the database connection."""
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)
        self.conn.close()
