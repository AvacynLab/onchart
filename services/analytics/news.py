"""RSS news scraping utilities for the analytics service.

This module defines :class:`RSSScraper` which periodically polls a set of
RSS feeds and stores the latest articles in the shared SQLite database.
Only the minimal information required by downstream consumers is persisted:
source name, article title, summary and publication timestamp.
"""

from __future__ import annotations

import asyncio
import time
from typing import Dict, Iterable
import sqlite3

import feedparser

try:  # pragma: no cover - import resolution for tests vs package
    from .repository import save_news
except ImportError:  # when executed without package context
    from repository import save_news


class RSSScraper:
    """Periodic RSS feed scraper.

    Parameters
    ----------
    conn:
        Open :class:`sqlite3.Connection` where articles should be stored.
    feeds:
        Mapping of ``source`` name to RSS feed ``URL``.
    interval:
        Polling interval in seconds. Defaults to 30 seconds to respect
        conservative rate limits (~20 req/min/source).
    start_task:
        When ``True`` the scraper immediately schedules its background task.
        Tests can set this to ``False`` and call :meth:`fetch_once` manually.
    """

    def __init__(
        self,
        conn: sqlite3.Connection,
        feeds: Dict[str, str] | None = None,
        interval: int = 30,
        start_task: bool = True,
    ) -> None:
        self.conn = conn
        self.feeds = feeds or {
            "Investing": "https://www.investing.com/rss/news.rss",
            "CNBC": "https://www.cnbc.com/id/100003114/device/rss/rss.html",
            "Bloomberg": "https://www.bloomberg.com/feed/news",
        }
        self.interval = interval
        self._task: asyncio.Task | None = None

        # Ensure destination table exists.
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS news (
                source  TEXT NOT NULL,
                title   TEXT NOT NULL,
                summary TEXT NOT NULL,
                ts      INTEGER NOT NULL,
                link    TEXT UNIQUE
            )
            """
        )
        self.conn.commit()

        if start_task:
            # Launch the polling loop in the background.
            self._task = asyncio.create_task(self.run())

    # ------------------------------------------------------------------
    async def run(self) -> None:
        """Continuously poll all feeds at the configured interval."""

        while True:
            await self.fetch_once()
            await asyncio.sleep(self.interval)

    # ------------------------------------------------------------------
    async def fetch_once(self) -> None:
        """Fetch articles from all configured feeds once."""

        for source, url in self.feeds.items():
            parsed = feedparser.parse(url)
            articles = []
            for entry in getattr(parsed, "entries", []):
                # ``published_parsed`` may be missing; fall back to current time.
                ts_struct = getattr(entry, "published_parsed", None)
                ts = int(time.mktime(ts_struct)) if ts_struct else int(time.time())
                articles.append(
                    {
                        "source": source,
                        "title": getattr(entry, "title", ""),
                        "summary": getattr(entry, "summary", ""),
                        "ts": ts,
                        "link": getattr(entry, "link", ""),
                    }
                )
            if articles:
                save_news(self.conn, articles)

    # ------------------------------------------------------------------
    def close(self) -> None:
        """Cancel the background task, if running."""

        if self._task and not self._task.done():
            self._task.cancel()

