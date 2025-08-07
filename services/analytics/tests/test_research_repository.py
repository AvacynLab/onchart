"""Tests for storing and retrieving research documents."""

import os
import sys
import sqlite3

# Ensure parent directory is on path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from repository import (
    save_research_doc,
    get_research_doc,
    update_research_doc,
)


def test_save_get_update_research_doc(tmp_path):
    db = tmp_path / "docs.db"
    conn = sqlite3.connect(db)

    doc_id = save_research_doc(conn, "user1", "opportunity_scan", {"foo": 1})
    doc = get_research_doc(conn, doc_id)
    assert doc is not None
    assert doc["user_id"] == "user1"
    assert doc["data"]["foo"] == 1

    updated = update_research_doc(conn, doc_id, "opportunity_scan", {"foo": 2})
    assert updated
    doc = get_research_doc(conn, doc_id)
    assert doc["data"]["foo"] == 2

    conn.close()
