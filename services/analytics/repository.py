"""Data access helpers for analytics service.

This module provides a minimal repository layer used by both the
``CandleAggregator`` and the FastAPI endpoints.  It intentionally avoids
any ORM to keep the service lightweight.
"""

from __future__ import annotations

import json
import sqlite3
from typing import List, Dict


def get_candles(
    conn: sqlite3.Connection,
    symbol: str,
    interval: int,
    limit: int = 100,
) -> List[Dict[str, float]]:
    """Return recent candles for ``symbol`` and ``interval``.

    Parameters
    ----------
    conn:
        Open :class:`sqlite3.Connection` to the analytics database.
    symbol:
        Stock ticker symbol to query.
    interval:
        Candle interval in seconds (e.g. ``300`` for 5 minutes).
    limit:
        Maximum number of rows to return (defaults to 100).

    Returns
    -------
    list of dict
        Each dictionary contains ``ts`` (epoch seconds) and OHLCV fields.
    """

    cur = conn.execute(
        """
        SELECT ts, open, high, low, close, volume
        FROM candles
        WHERE symbol = ? AND interval = ?
        ORDER BY ts DESC
        LIMIT ?
        """,
        (symbol, interval, limit),
    )
    rows = cur.fetchall()
    return [
        {
            "ts": ts,
            "open": open_,
            "high": high,
            "low": low,
            "close": close,
            "volume": volume,
        }
        for ts, open_, high, low, close, volume in rows
    ]

# ---------------------------------------------------------------------------
async def get_indicator(redis, symbol: str, interval: int, name: str) -> float | None:
    """Retrieve a cached technical indicator value from Redis.

    Parameters
    ----------
    redis:
        Async Redis client where indicator values are stored.
    symbol:
        Stock ticker symbol.
    interval:
        Logical interval identifier used when the indicator was computed.
    name:
        Indicator name (e.g. ``"sma"``).
    """

    key = f"ind:{symbol}:{interval}:{name}"
    value = await redis.get(key)
    return float(value) if value is not None else None


# ---------------------------------------------------------------------------
async def cache_tick(
    redis,
    tick: Dict[str, float],
    ttl: int = 3600,
    max_len: int = 1_000_000,
) -> None:
    """Store a market ``tick`` in a Redis list with LRU semantics.

    Parameters
    ----------
    redis:
        Async Redis client used for caching.
    tick:
        Dictionary containing ``symbol``, ``ts``, ``price`` and ``volume``.
    ttl:
        Time-to-live in seconds for the cached list.  Defaults to one hour.
    max_len:
        Maximum number of ticks to retain per symbol.  Older entries are
        trimmed once the limit is exceeded.  Defaults to one million.
    """

    symbol = tick["symbol"]
    key = f"ticks:{symbol}"
    data = json.dumps(tick)
    async with redis.pipeline() as pipe:
        pipe.lpush(key, data)
        pipe.ltrim(key, 0, max_len - 1)
        pipe.expire(key, ttl)
        await pipe.execute()


async def get_cached_ticks(redis, symbol: str, limit: int = 100) -> List[Dict[str, float]]:
    """Return recent cached ticks for ``symbol`` from Redis."""

    key = f"ticks:{symbol}"
    values = await redis.lrange(key, 0, limit - 1)
    return [json.loads(v) for v in values]


# ---------------------------------------------------------------------------
async def cache_candles(
    redis,
    symbol: str,
    interval: int,
    candles: List[Dict[str, float]],
    ttl: int = 86400,
    max_len: int = 1000,
) -> None:
    """Cache a list of candlesticks in Redis with a daily TTL.

    Parameters
    ----------
    redis:
        Async Redis client.
    symbol:
        Stock ticker symbol.
    interval:
        Candle interval in seconds.
    candles:
        Sequence of candle dictionaries sorted by most recent first.
    ttl:
        Time-to-live in seconds for the cached list (default 24 h).
    max_len:
        Maximum number of candles to retain.
    """

    key = f"cand:{symbol}:{interval}"
    if not candles:
        async with redis.pipeline() as pipe:
            pipe.delete(key)
            pipe.expire(key, ttl)
            await pipe.execute()
        return
    data = [json.dumps(c) for c in candles[:max_len]]
    async with redis.pipeline() as pipe:
        pipe.delete(key)
        pipe.rpush(key, *data)
        pipe.expire(key, ttl)
        await pipe.execute()


async def get_cached_candles(
    redis, symbol: str, interval: int, limit: int = 100
) -> List[Dict[str, float]]:
    """Retrieve cached candlesticks for ``symbol`` and ``interval``."""

    key = f"cand:{symbol}:{interval}"
    values = await redis.lrange(key, 0, limit - 1)
    return [json.loads(v) for v in values]


# ---------------------------------------------------------------------------
def get_symbols(conn: sqlite3.Connection) -> List[Dict[str, str]]:
    """Return available symbol metadata.

    The function ensures the ``symbols`` table exists and then retrieves
    all rows ordered alphabetically. Each entry contains the ticker symbol
    and its human readable name.

    Parameters
    ----------
    conn:
        Open :class:`sqlite3.Connection` to the analytics database.

    Returns
    -------
    list of dict
        Each dictionary has ``symbol`` and ``name`` keys.
    """

    # Create table on demand to keep startup simple during development.
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS symbols (
            symbol TEXT PRIMARY KEY,
            name   TEXT NOT NULL
        )
        """
    )
    cur = conn.execute(
        "SELECT symbol, name FROM symbols ORDER BY symbol"
    )
    return [{"symbol": s, "name": n} for s, n in cur.fetchall()]


# ---------------------------------------------------------------------------
def save_news(conn: sqlite3.Connection, articles: List[Dict[str, object]]) -> None:
    """Persist a batch of news articles.

    Parameters
    ----------
    conn:
        Open :class:`sqlite3.Connection` to the analytics database.
    articles:
        Iterable of dictionaries each containing ``source``, ``title``,
        ``summary``, ``ts`` and ``link`` keys.  The ``link`` field is used as
        a natural unique identifier to avoid inserting duplicates.
    """

    conn.executemany(
        """
        INSERT OR IGNORE INTO news (source, title, summary, ts, link)
        VALUES (?, ?, ?, ?, ?)
        """,
        [
            (a["source"], a["title"], a["summary"], int(a["ts"]), a.get("link", ""))
            for a in articles
        ],
    )
    conn.commit()


def get_news(conn: sqlite3.Connection, limit: int = 100) -> List[Dict[str, object]]:
    """Return recent news articles.

    Parameters
    ----------
    conn:
        Database connection to query.
    limit:
        Maximum number of rows to return (default 100).
    """

    cur = conn.execute(
        """
        SELECT source, title, summary, ts, link
        FROM news
        ORDER BY ts DESC
        LIMIT ?
        """,
        (limit,),
    )
    rows = cur.fetchall()
    return [
        {"source": s, "title": t, "summary": u, "ts": ts, "link": l}
        for s, t, u, ts, l in rows
    ]
# ---------------------------------------------------------------------------
def save_sentiment(conn: sqlite3.Connection, rows: List[Dict[str, object]]) -> None:
    """Persist Reddit/Twitter sentiment scores.

    Parameters
    ----------
    conn:
        Open :class:`sqlite3.Connection` to the analytics database.
    rows:
        Iterable of dictionaries containing ``symbol``, ``source``, ``text``,
        ``score``, ``subjectivity`` and ``ts`` keys.
    """

    # Create table lazily to simplify setup during development.
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS sentiment (
            symbol       TEXT NOT NULL,
            source       TEXT NOT NULL,
            text         TEXT NOT NULL,
            score        REAL NOT NULL,
            subjectivity REAL NOT NULL,
            ts           INTEGER NOT NULL
        )
        """
    )
    conn.executemany(
        """
        INSERT INTO sentiment (symbol, source, text, score, subjectivity, ts)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        [
            (
                r["symbol"],
                r["source"],
                r["text"],
                float(r["score"]),
                float(r["subjectivity"]),
                int(r["ts"]),
            )
            for r in rows
        ],
    )
    conn.commit()


def get_sentiment(
    conn: sqlite3.Connection, symbol: str, limit: int = 100
) -> List[Dict[str, object]]:
    """Return recent sentiment scores for ``symbol``.

    Parameters
    ----------
    conn:
        Database connection to query.
    symbol:
        Stock ticker to filter by.
    limit:
        Maximum number of rows to return (default 100).
    """

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS sentiment (
            symbol       TEXT NOT NULL,
            source       TEXT NOT NULL,
            text         TEXT NOT NULL,
            score        REAL NOT NULL,
            subjectivity REAL NOT NULL,
            ts           INTEGER NOT NULL
        )
        """
    )
    cur = conn.execute(
        """
        SELECT source, text, score, subjectivity, ts
        FROM sentiment
        WHERE symbol = ?
        ORDER BY ts DESC
        LIMIT ?
        """,
        (symbol, limit),
    )
    rows = cur.fetchall()
    return [
        {
            "source": s,
            "text": t,
            "score": sc,
            "subjectivity": sub,
            "ts": ts,
        }
        for s, t, sc, sub, ts in rows
    ]


# ---------------------------------------------------------------------------
def save_research_doc(
    conn: sqlite3.Connection,
    user_id: str,
    doc_type: str,
    data: Dict[str, object],
) -> int:
    """Persist a research document and return its identifier.

    The table is created lazily to keep development setups lightweight. The
    document ``data`` is stored as JSON text and ``ts_created`` defaults to the
    current UNIX timestamp.
    """

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS research_docs (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    TEXT NOT NULL,
            type       TEXT NOT NULL,
            json       TEXT NOT NULL,
            ts_created INTEGER NOT NULL DEFAULT (strftime('%s','now'))
        )
        """
    )
    cur = conn.execute(
        """
        INSERT INTO research_docs (user_id, type, json)
        VALUES (?, ?, ?)
        """,
        (user_id, doc_type, json.dumps(data)),
    )
    conn.commit()
    return int(cur.lastrowid)


def get_research_doc(
    conn: sqlite3.Connection, doc_id: int
) -> Dict[str, object] | None:
    """Return a stored research document by ``doc_id`` if available."""

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS research_docs (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    TEXT NOT NULL,
            type       TEXT NOT NULL,
            json       TEXT NOT NULL,
            ts_created INTEGER NOT NULL DEFAULT (strftime('%s','now'))
        )
        """
    )
    cur = conn.execute(
        """
        SELECT id, user_id, type, json, ts_created
        FROM research_docs WHERE id = ?
        """,
        (doc_id,),
    )
    row = cur.fetchone()
    if row is None:
        return None
    doc_id, user_id, doc_type, json_text, ts_created = row
    return {
        "id": doc_id,
        "user_id": user_id,
        "type": doc_type,
        "data": json.loads(json_text),
        "ts_created": ts_created,
    }


def update_research_doc(
    conn: sqlite3.Connection,
    doc_id: int,
    doc_type: str,
    data: Dict[str, object],
) -> bool:
    """Update an existing research document.

    Returns ``True`` if a row was modified, ``False`` otherwise.
    """

    cur = conn.execute(
        """
        UPDATE research_docs SET type = ?, json = ? WHERE id = ?
        """,
        (doc_type, json.dumps(data), doc_id),
    )
    conn.commit()
    return cur.rowcount > 0
