import asyncio
import sqlite3
import httpx
import pytest
import pathlib, sys

import fakeredis
from rq import Queue, SimpleWorker

# Ensure package import works when running tests from repo root.
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from reddit import RedditScraper  # noqa: E402
from repository import get_sentiment  # noqa: E402


@pytest.mark.asyncio
async def test_fetch_once(monkeypatch, tmp_path) -> None:
    """Scraper enqueues posts and worker stores sentiment rows."""

    db = tmp_path / "sentiment.db"
    conn = sqlite3.connect(db, check_same_thread=False)
    r = fakeredis.FakeRedis()
    q = Queue("raw_posts", connection=r)
    scraper = RedditScraper(conn, queue=q, subs=["wallstreetbets"], start_task=False)

    sample = {
        "data": {
            "children": [
                {"data": {"title": "I love $AAPL", "selftext": "", "created_utc": 1}},
                {"data": {"title": "I hate $TSLA", "selftext": "", "created_utc": 2}},
            ]
        }
    }

    async def fake_get(self, url, timeout=10):  # pragma: no cover - network mocked
        return httpx.Response(200, json=sample, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    await scraper.fetch_once()

    worker = SimpleWorker([q], connection=r)
    worker.work(burst=True)

    rows = get_sentiment(conn, "AAPL")
    assert rows and rows[0]["source"] == "wallstreetbets"
    assert 0 <= rows[0]["subjectivity"] <= 1
    assert rows[0]["score"] > 0

    rows_tsla = get_sentiment(conn, "TSLA")
    assert rows_tsla and rows_tsla[0]["score"] < 0
