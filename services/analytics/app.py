"""Analytics micro-service providing real-time tick streaming.

This FastAPI application exposes an authenticated WebSocket endpoint at
``/ws/stream`` that broadcasts market ticks to connected clients.  The
current implementation simulates an upstream market feed with random data;
connectors to real public WebSocket feeds (e.g. Yahoo Finance or Finnhub)
replace the :func:`connect_public_feed` coroutine when credentials are
available.
"""

from __future__ import annotations

import asyncio
import os
import random
import time
from contextlib import suppress
from typing import Dict, Set, Iterable

import jwt

from fastapi import (
    FastAPI,
    WebSocket,
    WebSocketDisconnect,
    HTTPException,
    Request,
    Response,
)
from pydantic import BaseModel, Field

from yahoo import YahooWebSocket
from finnhub import FinnhubWebSocket
from alpha_vantage import AlphaVantageClient
from twelve_data import TwelveDataClient
from aggregator import CandleAggregator
from indicators import IndicatorManager
from news import RSSScraper
from reddit import RedditScraper
from twitter import TwitterScraper
from rq import Queue
import redis as redis_sync
try:  # pragma: no cover - import resolution for tests vs package
    from .repository import (
        get_candles as repo_get_candles,
        get_indicator as repo_get_indicator,
        get_symbols as repo_get_symbols,
        get_sentiment as repo_get_sentiment,
        save_research_doc as repo_save_research_doc,
        get_research_doc as repo_get_research_doc,
        update_research_doc as repo_update_research_doc,
        cache_tick as repo_cache_tick,
        cache_candles as repo_cache_candles,
        get_cached_candles as repo_get_cached_candles,
    )
except ImportError:  # when executed without package context
    from repository import (
        get_candles as repo_get_candles,
        get_indicator as repo_get_indicator,
        get_symbols as repo_get_symbols,
        get_sentiment as repo_get_sentiment,
        save_research_doc as repo_save_research_doc,
        get_research_doc as repo_get_research_doc,
        update_research_doc as repo_update_research_doc,
        cache_tick as repo_cache_tick,
        cache_candles as repo_cache_candles,
        get_cached_candles as repo_get_cached_candles,
    )
from redis.asyncio import Redis

app = FastAPI(title="analytics-service")

# In-memory store tracking request counts per client IP. Each value is a
# tuple ``(count, reset_ts)`` representing how many requests were received
# within the current 60 second window and when the window resets. The store
# is process-local and therefore adequate for development and small-scale
# deployments. Large clusters should back this with Redis instead.
rate_limit_hits: Dict[str, tuple[int, float]] = {}


class ResearchDocCreate(BaseModel):
    """Payload for creating a research document via the API."""

    user_id: str = Field(..., description="Identifier of the document owner")
    type: str = Field(..., description="Research document type")
    data: Dict[str, object] = Field(
        default_factory=dict, description="Arbitrary structured payload"
    )


class ResearchDocUpdate(BaseModel):
    """Payload for updating an existing research document."""

    type: str = Field(..., description="Research document type")
    data: Dict[str, object] = Field(
        default_factory=dict, description="Updated structured payload"
    )


@app.middleware("http")
async def rate_limiter(request: Request, call_next):
    """Return ``429`` when a client exceeds the configured request rate.

    The limit is defined by ``app.state.rate_limit`` (requests per 60 seconds)
    and defaults to 60. Counts are reset every minute.
    """

    now = time.time()
    limit = getattr(app.state, "rate_limit", 60)
    ip = request.client.host if request.client else "unknown"
    count, reset = rate_limit_hits.get(ip, (0, now + 60))
    if now > reset:
        count, reset = 0, now + 60
    count += 1
    rate_limit_hits[ip] = (count, reset)
    if count > limit:
        return Response(status_code=429, content="Too Many Requests")
    return await call_next(request)


@app.get("/health")
async def health() -> dict[str, str]:
    """Lightweight endpoint used by Docker health checks.

    Returns a simple JSON payload so orchestrators can determine whether the
    service is responsive without touching heavier routes.
    """

    return {"status": "ok"}


class TickStreamer:
    """Maintain client WebSocket connections and broadcast ticks.

    The streamer keeps track of connected clients and the symbols they are
    interested in.  Incoming ticks are forwarded only to clients that
    explicitly subscribed to the tick's symbol.  Upstream market data can be
    provided either by a real feed (Yahoo/Finnhub) or by a simple simulator.
    """

    def __init__(self) -> None:
        # Mapping of WebSocket → subscribed symbols
        self.clients: Dict[WebSocket, Set[str]] = {}
        symbols_env = os.getenv("SYMBOLS", "AAPL")
        self.symbols = [s.strip().upper() for s in symbols_env.split(",") if s.strip()]
        # Select upstream feed: "sim", "yahoo" or "finnhub".
        self.feed = os.getenv("ANALYTICS_FEED", "sim")
        if os.getenv("ANALYTICS_USE_YAHOO", "0") == "1":  # legacy flag
            self.feed = "yahoo"
        self.aggregator: CandleAggregator | None = None

    async def connect_public_feed(self) -> None:
        """Forward ticks from either a real feed or a simulator."""

        if self.feed == "yahoo":
            queue: asyncio.Queue[Dict[str, float]] = asyncio.Queue()
            feed = YahooWebSocket(self.symbols)
            asyncio.create_task(feed.run(queue))
            while True:
                tick = await queue.get()
                if self.aggregator:
                    self.aggregator.on_tick(tick)
                indicators = getattr(app.state, "indicators", None)
                if indicators:
                    await indicators.on_tick(tick)
                redis = getattr(app.state, "redis", None)
                if redis:
                    await repo_cache_tick(redis, tick)
                await self.broadcast(tick)
        elif self.feed == "finnhub":
            queue: asyncio.Queue[Dict[str, float]] = asyncio.Queue()
            token = os.getenv("FINNHUB_API_KEY", "")
            feed = FinnhubWebSocket(self.symbols, token)
            asyncio.create_task(feed.run(queue))
            while True:
                tick = await queue.get()
                if self.aggregator:
                    self.aggregator.on_tick(tick)
                indicators = getattr(app.state, "indicators", None)
                if indicators:
                    await indicators.on_tick(tick)
                redis = getattr(app.state, "redis", None)
                if redis:
                    await repo_cache_tick(redis, tick)
                await self.broadcast(tick)
        else:
            while True:
                now = time.time()
                for symbol in self.symbols:
                    tick = {
                        "symbol": symbol,
                        "ts": now,
                        "price": round(100 + random.random(), 2),
                        "volume": random.randint(1, 100),
                    }
                    if self.aggregator:
                        self.aggregator.on_tick(tick)
                    indicators = getattr(app.state, "indicators", None)
                    if indicators:
                        await indicators.on_tick(tick)
                    redis = getattr(app.state, "redis", None)
                    if redis:
                        await repo_cache_tick(redis, tick)
                    await self.broadcast(tick)
                await asyncio.sleep(1)

    async def broadcast(self, message: Dict[str, float]) -> None:
        """Send a JSON message to all connected clients."""

        disconnected: Set[WebSocket] = set()
        for ws, symbols in self.clients.items():
            if message["symbol"] not in symbols:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.add(ws)
        for ws in disconnected:
            await self.disconnect(ws)

    async def register(self, websocket: WebSocket, symbols: Iterable[str]) -> None:
        """Accept and store a new client connection with its subscriptions."""

        await websocket.accept()
        self.clients[websocket] = set(symbols)

    async def disconnect(self, websocket: WebSocket) -> None:
        """Remove a client connection."""

        if websocket in self.clients:
            self.clients.pop(websocket, None)
            await websocket.close()


streamer = TickStreamer()


@app.on_event("startup")
async def on_startup() -> None:
    """Launch background task and initialize external clients."""

    # Configure request rate limit and reset counters from previous runs.
    app.state.rate_limit = int(os.getenv("RATE_LIMIT", "60"))
    rate_limit_hits.clear()

    # Connect to Redis: an async client for caching and a sync client for RQ.
    # During tests or development the Redis service may not be available; in
    # that case fall back to an in-memory ``fakeredis`` instance so the rest of
    # the application can operate without network connectivity.
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    try:
        app.state.redis = Redis.from_url(redis_url)
        await app.state.redis.ping()
        sync_redis = redis_sync.from_url(redis_url)
    except Exception:  # pragma: no cover - exercised in tests
        import fakeredis.aioredis
        import fakeredis

        app.state.redis = fakeredis.aioredis.FakeRedis()
        sync_redis = fakeredis.FakeRedis()
    app.state.redis_sync = sync_redis
    app.state.av_client = AlphaVantageClient(app.state.redis)
    app.state.td_client = TwelveDataClient(app.state.redis)
    app.state.indicators = IndicatorManager(app.state.redis)
    db_path = os.getenv("DB_PATH", "analytics.db")
    streamer.aggregator = CandleAggregator(db_path=db_path)

    # Ensure watchlist table exists and seed default symbols.
    conn = streamer.aggregator.conn
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS symbols (
            symbol TEXT PRIMARY KEY,
            name   TEXT NOT NULL
        )
        """
    )
    default_symbols = os.getenv(
        "WATCHLIST", "AAPL:Apple Inc.,TSLA:Tesla Inc."
    ).split(",")
    rows = [tuple(item.split(":", 1)) for item in default_symbols if ":" in item]
    if rows:
        conn.executemany(
            "INSERT OR IGNORE INTO symbols (symbol, name) VALUES (?, ?)", rows
        )
        conn.commit()

    # Launch background tasks: tick feed and optional scrapers.
    app.state.feed_task = asyncio.create_task(streamer.connect_public_feed())
    enable_news = os.getenv("ENABLE_NEWS", "0") == "1"
    app.state.news_scraper = RSSScraper(
        streamer.aggregator.conn, start_task=enable_news
    )
    enable_reddit = os.getenv("ENABLE_REDDIT", "0") == "1"
    app.state.reddit_queue = Queue("raw_posts", connection=sync_redis)
    app.state.reddit_scraper = RedditScraper(
        streamer.aggregator.conn,
        queue=app.state.reddit_queue,
        start_task=enable_reddit,
    )
    enable_twitter = os.getenv("ENABLE_TWITTER", "0") == "1"
    app.state.twitter_scraper = TwitterScraper(
        streamer.aggregator.conn,
        queue=app.state.reddit_queue,
        start_task=enable_twitter,
    )


@app.on_event("shutdown")
async def on_shutdown() -> None:
    """Cancel the background feed task when the application stops."""

    feed_task = getattr(app.state, "feed_task", None)
    if feed_task:
        feed_task.cancel()
        with suppress(asyncio.CancelledError):
            await feed_task
    scraper = getattr(app.state, "news_scraper", None)
    if scraper:
        scraper.close()
    reddit = getattr(app.state, "reddit_scraper", None)
    if reddit:
        reddit.close()
    twitter = getattr(app.state, "twitter_scraper", None)
    if twitter:
        twitter.close()
    # Close Redis connection gracefully.
    redis = getattr(app.state, "redis", None)
    if redis:
        await redis.close()
    if streamer.aggregator:
        streamer.aggregator.close()


@app.websocket("/ws/stream")
async def stream_endpoint(
    ws: WebSocket,
    symbols: str,
    interval: str = "5m",
    token: str | None = None,
) -> None:
    """Authenticated WebSocket streaming endpoint.

    Parameters
    ----------
    symbols:
        Comma separated list of tickers the client wishes to receive.
    interval:
        Candle interval requested by the client (currently unused but
        reserved for future server-side optimisations).
    token:
        JWT used to authenticate the client.  The secret is provided via the
        ``JWT_SECRET`` environment variable.
    """

    # Retrieve the JWT secret from the environment.  Using a hard-coded default
    # value would defeat the purpose of signed tokens, so the variable is
    # required.  A clear runtime error makes misconfiguration obvious during
    # deployment or tests.
    secret = os.environ.get("JWT_SECRET")
    if secret is None:
        raise RuntimeError("JWT_SECRET environment variable is not set")

    try:
        if token is None:
            raise ValueError("missing token")
        jwt.decode(token, secret, algorithms=["HS256"])
    except Exception:
        # Close with policy violation code when authentication fails.
        await ws.close(code=1008)
        return

    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    await streamer.register(ws, symbol_list)
    try:
        while True:
            # Heartbeat / re-authentication: clients send {"type": "ping", "token": ...}
            data = await ws.receive_json()
            if data.get("type") == "ping":
                try:
                    jwt.decode(data.get("token", ""), secret, algorithms=["HS256"])
                    await ws.send_json({"type": "pong"})
                except Exception:
                    await ws.close(code=1008)
                    break
    except WebSocketDisconnect:
        await streamer.disconnect(ws)


@app.get("/symbols")
async def symbols_endpoint() -> Dict[str, object]:
    """Return the available symbols or user watchlist."""

    agg = streamer.aggregator
    if agg is None:
        raise HTTPException(status_code=503, detail="aggregator not initialised")
    symbols = repo_get_symbols(agg.conn)
    return {"symbols": symbols}


@app.get("/history")
async def history_endpoint(symbol: str, interval: str, provider: str = "av") -> Dict[str, object]:
    """Return historical candles for ``symbol`` using the chosen provider."""

    if provider == "twelve":
        client: AlphaVantageClient | TwelveDataClient = app.state.td_client
    else:
        client = app.state.av_client
    candles = await client.history(symbol, interval)
    return {"symbol": symbol, "interval": interval, "candles": candles}


@app.get("/fundamentals")
async def fundamentals_endpoint(symbol: str, provider: str = "av") -> Dict[str, object]:
    """Return fundamental metrics for ``symbol`` using the chosen provider."""

    if provider == "twelve":
        client: AlphaVantageClient | TwelveDataClient = app.state.td_client
    else:
        client = app.state.av_client
    data = await client.fundamentals(symbol)
    return data


@app.get("/candles/{symbol}/{interval}")
async def candles_endpoint(symbol: str, interval: int, limit: int = 100) -> Dict[str, object]:
    """Return stored candlesticks for ``symbol`` and ``interval``.

    The data is fetched from the SQLite database filled by
    :class:`CandleAggregator`.  ``limit`` controls how many recent candles are
    returned (default 100).  Results are cached in Redis for 24 hours to
    accelerate repeated queries for popular symbols.
    """

    redis = getattr(app.state, "redis", None)
    candles = []
    if redis is not None:
        candles = await repo_get_cached_candles(redis, symbol, interval, limit)
    if not candles:
        agg = streamer.aggregator
        if agg is None:
            raise HTTPException(status_code=503, detail="aggregator not initialised")
        candles = repo_get_candles(agg.conn, symbol, interval, limit)
        if redis is not None and candles:
            await repo_cache_candles(redis, symbol, interval, candles)
    return {"symbol": symbol, "interval": interval, "candles": candles}


@app.get("/indicators/{symbol}/{interval}")
async def indicators_endpoint(symbol: str, interval: int, name: str = "sma") -> Dict[str, object]:
    """Return the latest indicator value for ``symbol``."""

    redis = getattr(app.state, "redis", None)
    if redis is None:
        raise HTTPException(status_code=503, detail="redis not initialised")
    value = await repo_get_indicator(redis, symbol, interval, name)
    if value is None:
        raise HTTPException(status_code=404, detail="indicator not found")
    return {"symbol": symbol, "interval": interval, name: value}


@app.get("/sentiment/{symbol}")
async def sentiment_endpoint(symbol: str, limit: int = 100) -> Dict[str, object]:
    """Return recent sentiment scores for ``symbol``.

    The scores are produced by :class:`RedditScraper` and persisted in the
    shared SQLite database. ``limit`` controls how many rows are returned.
    """

    agg = streamer.aggregator
    if agg is None:
        raise HTTPException(status_code=503, detail="aggregator not initialised")
    rows = repo_get_sentiment(agg.conn, symbol, limit)
    return {"symbol": symbol, "sentiment": rows}


@app.post("/docs")
async def create_doc(payload: ResearchDocCreate) -> Dict[str, int]:
    """Store a research document and return its identifier."""

    agg = streamer.aggregator
    if agg is None:
        raise HTTPException(status_code=503, detail="aggregator not initialised")
    doc_id = repo_save_research_doc(agg.conn, payload.user_id, payload.type, payload.data)
    return {"id": doc_id}


@app.get("/docs/{doc_id}")
async def get_doc(doc_id: int) -> Dict[str, object]:
    """Retrieve a previously stored research document."""

    agg = streamer.aggregator
    if agg is None:
        raise HTTPException(status_code=503, detail="aggregator not initialised")
    doc = repo_get_research_doc(agg.conn, doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="document not found")
    return doc


@app.put("/docs/{doc_id}")
async def update_doc(doc_id: int, payload: ResearchDocUpdate) -> Dict[str, str]:
    """Update an existing research document in place."""

    agg = streamer.aggregator
    if agg is None:
        raise HTTPException(status_code=503, detail="aggregator not initialised")
    ok = repo_update_research_doc(agg.conn, doc_id, payload.type, payload.data)
    if not ok:
        raise HTTPException(status_code=404, detail="document not found")
    return {"status": "ok"}
