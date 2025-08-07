"""Background NLP worker processing raw social posts.

This module defines a RQ-compatible job that computes sentiment and
subjectivity for raw social media posts. Posts are enqueued by the
:class:`RedditScraper` into the ``raw_posts`` queue. The worker consumes these
jobs, enriches each post with scores and persists the result into SQLite via
:func:`repository.save_sentiment`.

Run the worker with ``python nlp_worker.py`` which starts a simple RQ worker
listening on the ``raw_posts`` queue. The database path and Redis URL are read
from the ``DB_PATH`` and ``REDIS_URL`` environment variables respectively.
"""

from __future__ import annotations

import os
import sqlite3
from typing import Dict

from rq import Queue, SimpleWorker
import redis
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from textblob import TextBlob

try:  # pragma: no cover - import resolution for tests vs package
    from .repository import save_sentiment
except ImportError:  # when executed without package context
    from repository import save_sentiment


analyzer = SentimentIntensityAnalyzer()


def process_post(db_path: str, post: Dict[str, object]) -> None:
    """Compute sentiment & subjectivity and persist the post.

    Parameters
    ----------
    db_path:
        Path to the SQLite database file where sentiment rows are stored.
    post:
        Dictionary containing ``symbol``, ``source``, ``text`` and ``ts`` fields.
    """

    conn = sqlite3.connect(db_path)
    try:
        text = str(post["text"])
        score = analyzer.polarity_scores(text)["compound"]
        subj = TextBlob(text).sentiment.subjectivity
        save_sentiment(
            conn,
            [
                {
                    "symbol": post["symbol"],
                    "source": post["source"],
                    "text": text,
                    "score": score,
                    "subjectivity": subj,
                    "ts": post["ts"],
                }
            ],
        )
    finally:
        conn.close()


def main() -> None:  # pragma: no cover - runtime entrypoint
    """Entrypoint that starts a blocking RQ worker."""

    redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    db_path = os.getenv("DB_PATH", "analytics.db")
    conn = redis.from_url(redis_url)
    q = Queue("raw_posts", connection=conn)
    worker = SimpleWorker([q], connection=conn)
    worker.work()


if __name__ == "__main__":  # pragma: no cover - script entry
    main()
