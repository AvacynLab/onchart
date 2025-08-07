"""Unit tests for the analytics WebSocket stream."""

import pathlib
import sys

from fastapi.testclient import TestClient
import fakeredis.aioredis
from redis.asyncio import Redis
import jwt

# Ensure the service package is importable when tests run from repo root.
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app import app  # noqa: E402


def test_stream_emits_ticks(monkeypatch) -> None:
    """Ensure that connecting to `/ws/stream` yields tick data and heartbeat."""

    fake = fakeredis.aioredis.FakeRedis()
    monkeypatch.setattr(Redis, "from_url", lambda url: fake)

    # The analytics service now requires the JWT secret to be provided via the
    # ``JWT_SECRET`` environment variable.  Tests mimic production by injecting
    # a deterministic value and encoding the client token with the same secret.
    monkeypatch.setenv("JWT_SECRET", "testsecret")
    token = jwt.encode({"sub": "test"}, "testsecret", algorithm="HS256")
    with TestClient(app) as client:
        url = f"/ws/stream?symbols=AAPL&token={token}"
        with client.websocket_connect(url) as websocket:
            websocket.send_json({"type": "ping", "token": token})
            messages = [websocket.receive_json(), websocket.receive_json()]
            assert any(m.get("symbol") == "AAPL" for m in messages)
            assert any(m.get("type") == "pong" for m in messages)
