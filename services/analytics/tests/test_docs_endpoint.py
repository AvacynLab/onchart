"""Tests for the research document HTTP endpoints."""

import os
import sys
import pathlib
from fastapi.testclient import TestClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app import app, streamer  # noqa: E402
from aggregator import CandleAggregator  # noqa: E402


def test_create_get_update_doc(tmp_path):
    db_path = tmp_path / "docs.db"
    agg = CandleAggregator(db_path=str(db_path), intervals=(60,), start_scheduler=False)
    streamer.aggregator = agg

    client = TestClient(app)
    resp = client.post(
        "/docs",
        json={"user_id": "u1", "type": "opportunity_scan", "data": {"foo": 1}},
    )
    assert resp.status_code == 200
    doc_id = resp.json()["id"]

    resp = client.get(f"/docs/{doc_id}")
    assert resp.status_code == 200
    assert resp.json()["data"]["foo"] == 1

    resp = client.put(
        f"/docs/{doc_id}",
        json={"type": "opportunity_scan", "data": {"foo": 2}},
    )
    assert resp.status_code == 200

    resp = client.get(f"/docs/{doc_id}")
    assert resp.json()["data"]["foo"] == 2

    agg.close()
    streamer.aggregator = None
