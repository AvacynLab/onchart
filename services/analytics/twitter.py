"""Twitter sentiment scraping utilities for the analytics service.

This module mirrors :mod:`reddit` by periodically querying Twitter for
symbol mentions and enqueuing raw posts for sentiment analysis.  It uses
`snscrape`'s public search API, avoiding the need for official Twitter
credentials which aligns with the repository's focus on free data
sources.
"""
from __future__ import annotations

import asyncio
from datetime import timezone
from typing import Iterable
import sqlite3

from rq import Queue

try:  # pragma: no cover - optional dependency may fail on some Python versions
    import snscrape.modules.twitter as sntwitter
except Exception:  # pragma: no cover - fallback when snscrape cannot import
    sntwitter = None


class TwitterScraper:
    """Poll Twitter for symbol mentions and enqueue posts for NLP processing.

    Parameters
    ----------
    conn:
        Open :class:`sqlite3.Connection` used only to determine the database
        path for worker jobs.
    queue:
        :class:`rq.Queue` where raw posts are enqueued for the NLP worker.
    symbols:
        Iterable of ticker symbols to search for. Each symbol is queried as
        ``"$AAPL"`` style search.
    interval:
        Polling interval in seconds. Defaults to 30s to remain within
        comfortable public scraping limits.
    start_task:
        When ``True`` the scraper immediately schedules its background task.
        Tests can set this to ``False`` and call :meth:`fetch_once` manually.
    """

    def __init__(
        self,
        conn: sqlite3.Connection,
        queue: Queue,
        symbols: Iterable[str] | None = None,
        interval: int = 30,
        start_task: bool = True,
    ) -> None:
        self.queue = queue
        self.symbols = list(symbols or ["AAPL", "TSLA"])
        self.interval = interval
        self.db_path = conn.execute("PRAGMA database_list").fetchone()[2] or ""
        self._task: asyncio.Task | None = None
        if start_task:
            self._task = asyncio.create_task(self.run())

    # ------------------------------------------------------------------
    async def run(self) -> None:
        """Continuously poll Twitter at the configured interval."""

        while True:
            await self.fetch_once()
            await asyncio.sleep(self.interval)

    # ------------------------------------------------------------------
    async def fetch_once(self, limit: int = 20) -> None:
        """Fetch tweets for all configured symbols once.

        ``snscrape`` exposes a synchronous iterator.  To keep the public API
        async-friendly we execute the scraping logic in a thread pool using
        :func:`asyncio.to_thread`.
        """

        def scrape_symbol(sym: str) -> None:
            if sntwitter is None:  # snscrape not available
                return
            scraper = sntwitter.TwitterSearchScraper(f"${sym}")
            count = 0
            for tweet in scraper.get_items():  # pragma: no branch - external lib
                text = getattr(tweet, "rawContent", "")
                ts = int(tweet.date.replace(tzinfo=timezone.utc).timestamp())
                self.queue.enqueue(
                    "nlp_worker.process_post",
                    self.db_path,
                    {
                        "symbol": sym,
                        "source": "twitter",
                        "text": text,
                        "ts": ts,
                    },
                )
                count += 1
                if count >= limit:
                    break

        # Run scraping for each symbol sequentially to keep implementation
        # simple and respectful of rate limits.
        for sym in self.symbols:
            await asyncio.to_thread(scrape_symbol, sym)

    # ------------------------------------------------------------------
    def close(self) -> None:
        """Cancel the background task, if running."""

        if self._task and not self._task.done():
            self._task.cancel()
