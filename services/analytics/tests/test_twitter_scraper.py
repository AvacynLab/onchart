import asyncio
import sqlite3
import pathlib, sys

import fakeredis
from rq import Queue, SimpleWorker
import pytest

# Ensure package import works when running tests from repo root.
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from twitter import TwitterScraper  # noqa: E402
from repository import get_sentiment  # noqa: E402


class DummyTweet:
    """Minimal tweet representation used for testing."""

    def __init__(self, content: str) -> None:
        from datetime import datetime, timezone

        self.rawContent = content
        self.date = datetime(1970, 1, 1, tzinfo=timezone.utc)


class DummyScraper:
    """Pretend ``snscrape`` search scraper."""

    def __init__(self, query: str) -> None:  # pragma: no cover - trivial
        self.query = query

    def get_items(self):  # pragma: no cover - simple iterator
        yield DummyTweet("I love $AAPL")


@pytest.mark.asyncio
async def test_fetch_once(monkeypatch, tmp_path) -> None:
    """Tweets are enqueued and processed into sentiment rows."""

    db = tmp_path / "sentiment.db"
    conn = sqlite3.connect(db, check_same_thread=False)
    r = fakeredis.FakeRedis()
    q = Queue("raw_posts", connection=r)
    scraper = TwitterScraper(conn, queue=q, symbols=["AAPL"], start_task=False)

    import twitter as twitter_module

    import types
    monkeypatch.setattr(
        twitter_module,
        "sntwitter",
        types.SimpleNamespace(TwitterSearchScraper=DummyScraper),
    )

    await scraper.fetch_once(limit=1)

    worker = SimpleWorker([q], connection=r)
    worker.work(burst=True)

    rows = get_sentiment(conn, "AAPL")
    assert rows and rows[0]["source"] == "twitter"
    assert rows[0]["score"] > 0
