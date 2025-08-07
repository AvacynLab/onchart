"""Basic load test for the analytics WebSocket stream."""

import pathlib
import statistics
import time
import threading
import sys

import jwt
import fakeredis.aioredis
from fastapi.testclient import TestClient
from redis.asyncio import Redis

# Ensure the service package is importable when tests run from repo root.
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from app import app  # noqa: E402


def _client_latency(client: TestClient, token: str) -> float:
    """Connect to the stream and return the ping→pong latency in seconds."""
    url = f"/ws/stream?symbols=AAPL&token={token}"
    with client.websocket_connect(url) as websocket:
        start = time.perf_counter()
        websocket.send_json({"type": "ping", "token": token})
        while True:
            message = websocket.receive_json()
            if message.get("type") == "pong":
                break
        return time.perf_counter() - start


def test_websocket_load(monkeypatch) -> None:
    """Spawn multiple clients and ensure latency percentiles meet targets."""
    # Provide a fake Redis instance so connections remain in-memory.
    monkeypatch.setattr(Redis, "from_url", lambda url: fakeredis.aioredis.FakeRedis())

    # Inject deterministic JWT secret and token for authenticated access.
    monkeypatch.setenv("JWT_SECRET", "testsecret")
    token = jwt.encode({"sub": "test"}, "testsecret", algorithm="HS256")

    latencies: list[float] = [0.0] * 20

    with TestClient(app) as client:
        def worker(i: int) -> None:
            latencies[i] = _client_latency(client, token)

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(len(latencies))]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

    median = statistics.median(latencies)
    p99 = sorted(latencies)[-1]
    assert median < 0.120
    assert p99 < 0.300
