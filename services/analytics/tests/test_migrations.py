"""Tests for database migrations."""

import sqlite3
from pathlib import Path

from alembic import command
from alembic.config import Config


def test_alembic_creates_tables(tmp_path: Path) -> None:
    """Run Alembic migrations and ensure all tables and indexes exist."""

    db_path = tmp_path / "test.db"
    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")
    cfg.set_main_option(
        "script_location", str(Path(__file__).resolve().parents[1] / "alembic")
    )
    command.upgrade(cfg, "head")

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    tables = {row[0] for row in cur.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {"ticks", "candles", "news", "sentiment", "research_docs"} <= tables

    def index_names(table: str) -> set[str]:
        cur.execute(f"PRAGMA index_list({table})")
        return {row[1] for row in cur.fetchall()}

    assert "idx_ticks_symbol_ts" in index_names("ticks")
    assert "idx_candles_symbol_ts" in index_names("candles")
    assert "idx_sentiment_symbol_ts" in index_names("sentiment")
    assert "idx_news_ts" in index_names("news")
    conn.close()
