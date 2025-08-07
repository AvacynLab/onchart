"""Reddit sentiment scraping utilities for the analytics service.

This module defines :class:`RedditScraper` which periodically polls Reddit
subreddits, extracts ticker mentions and enqueues raw posts for asynchronous
NLP processing.  A separate worker consumes the ``raw_posts`` queue and
computes sentiment and subjectivity scores before persisting them to the
database.  The scraper focuses on lightweight development usage and therefore
relies on Reddit's public JSON endpoints.
"""

from __future__ import annotations

import asyncio
import re
import time
from typing import Iterable
import sqlite3

import httpx
from rq import Queue


class RedditScraper:
    """Periodic Reddit scraper computing sentiment per ticker.

    Parameters
    ----------
    conn:
        Open :class:`sqlite3.Connection` where sentiment rows are stored.
    subs:
        Iterable of subreddit names to poll. Defaults to a couple of popular
        finance communities.
    interval:
        Polling interval in seconds. 30 seconds keeps well below Reddit's
        public rate limits.
    start_task:
        When ``True`` the scraper immediately schedules its background task.
        Tests can set this to ``False`` and call :meth:`fetch_once` manually.
    """

    def __init__(
        self,
        conn: sqlite3.Connection,
        queue: Queue,
        subs: Iterable[str] | None = None,
        interval: int = 30,
        start_task: bool = True,
    ) -> None:
        self.conn = conn
        self.queue = queue
        self.subs = list(subs or ["wallstreetbets", "stocks"])
        self.interval = interval
        self._task: asyncio.Task | None = None
        # Determine database file path for the worker jobs.
        self.db_path = conn.execute("PRAGMA database_list").fetchone()[2] or ""

        if start_task:
            self._task = asyncio.create_task(self.run())

    # ------------------------------------------------------------------
    async def run(self) -> None:
        """Continuously poll subreddits at the configured interval."""

        while True:
            await self.fetch_once()
            await asyncio.sleep(self.interval)

    # ------------------------------------------------------------------
    async def fetch_once(self) -> None:
        """Fetch posts from all configured subreddits once."""

        headers = {"User-Agent": "onchart-bot"}
        async with httpx.AsyncClient(headers=headers) as client:
            for sub in self.subs:
                url = f"https://www.reddit.com/r/{sub}/new.json?limit=50"
                resp = await client.get(url, timeout=10)
                if resp.status_code != 200:
                    continue
                data = resp.json()
                for child in data.get("data", {}).get("children", []):
                    post = child.get("data", {})
                    text = f"{post.get('title', '')} {post.get('selftext', '')}"
                    ts = int(post.get("created_utc", time.time()))
                    # Extract tickers written as $AAPL using a simple regex.
                    for match in set(re.findall(r"\$[A-Z]{1,5}", text)):
                        symbol = match[1:]
                        self.queue.enqueue(
                            "nlp_worker.process_post",
                            self.db_path,
                            {
                                "symbol": symbol,
                                "source": sub,
                                "text": text,
                                "ts": ts,
                            },
                        )

    # ------------------------------------------------------------------
    def close(self) -> None:
        """Cancel the background task, if running."""

        if self._task and not self._task.done():
            self._task.cancel()
