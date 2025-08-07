"""Tests for the RSS news scraper."""

import asyncio
import sqlite3
import time

import feedparser

# Ensure package import works when running tests from repo root.
import pathlib, sys
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from news import RSSScraper  # noqa: E402
from repository import get_news  # noqa: E402


class DummyParsed:
    """Simple object mimicking ``feedparser.parse`` result."""

    def __init__(self) -> None:
        self.entries = [self.Entry()]

    class Entry:
        title = "Sample"
        summary = "An example article"
        link = "http://example.com/article"
        published_parsed = time.gmtime(0)


def test_fetch_once(monkeypatch) -> None:
    """Scraper stores parsed articles into the database."""

    conn = sqlite3.connect(":memory:", check_same_thread=False)
    scraper = RSSScraper(conn, {"Example": "http://example.com"}, start_task=False)

    # Avoid network by returning deterministic content.
    monkeypatch.setattr(feedparser, "parse", lambda url: DummyParsed())

    asyncio.run(scraper.fetch_once())
    rows = get_news(conn)
    assert len(rows) == 1
    assert rows[0]["source"] == "Example"
    assert rows[0]["title"] == "Sample"
