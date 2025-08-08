import { initBus, pub, CHANNEL_TICK, CHANNEL_CANDLE } from '@/lib/market/bus';

/**
 * Market data worker utilities.
 *
 * The full worker will maintain a WebSocket connection to a market
 * data provider and persist ticks into the database.  In addition to the
 * tick→candle aggregation helper, this file now contains a minimal worker
 * implementation that connects to the Yahoo Finance WebSocket, stores raw
 * ticks in Postgres and periodically flushes them into multi‑timeframe
 * candle rows.  If the WebSocket feed becomes silent for more than 30 s a
 * light fallback fetches a quote from Alpha Vantage.
 */

/** A single trade tick. */
export interface Tick {
  /** Unix epoch in milliseconds when the trade occurred. */
  ts: number;
  /** Executed price. */
  price: number;
  /** Traded volume. */
  volume: number;
}

/** A single OHLCV candle covering a fixed interval. */
export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /** Interval start in epoch milliseconds. */
  ts_start: number;
  /** Interval end in epoch milliseconds. */
  ts_end: number;
}

/** Maximum number of ticks kept per symbol to bound memory usage. */
const MAX_TICKS_PER_SYMBOL = 1000;

/**
 * Aggregate a list of ticks into a single candle.
 *
 * @param ticks - Tick array occurring within the same interval.
 * @param intervalMs - Interval length in milliseconds (e.g. 60_000 for 1m).
 * @returns The computed candle or `null` when no ticks are provided.
 */
export function aggregateTicks(
  ticks: Tick[],
  intervalMs: number,
): Candle | null {
  if (!ticks.length) return null;

  // Sort ticks chronologically to ensure open/close correctness
  const sorted = [...ticks].sort((a, b) => a.ts - b.ts);
  const prices = sorted.map((t) => t.price);

  const open = sorted[0]!.price;
  const close = sorted[sorted.length - 1]!.price;
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const volume = sorted.reduce((acc, t) => acc + t.volume, 0);
  const ts_start = Math.floor(sorted[0]!.ts / intervalMs) * intervalMs;
  const ts_end = ts_start + intervalMs;

  return { open, high, low, close, volume, ts_start, ts_end };
}

/**
 * Bootstraps the market data worker.
 *
 * The worker expects the following environment variables:
 * - `POSTGRES_URL`      – connection string for the database
 * - `YAHOO_WS_URL`      – WebSocket endpoint for Yahoo Finance
 * - `ALPHA_VANTAGE_KEY` – fallback API key
 */
export async function main(): Promise<void> {
  const { POSTGRES_URL, YAHOO_WS_URL } = process.env;
  if (!POSTGRES_URL || !YAHOO_WS_URL) {
    throw new Error('POSTGRES_URL and YAHOO_WS_URL are required');
  }

  // Connect to the Redis bus so ticks and candles can be fanned out to
  // API routes and ultimately the browser.
  await initBus();

  // Import heavy dependencies lazily so unit tests can load the aggregation
  // helper without pulling in database or WebSocket libraries.
  const [{ default: postgres }, { drizzle }] = await Promise.all([
    import('postgres'),
    import('drizzle-orm/postgres-js'),
  ]);
  const { marketTick, candle: candleTable } = await import('../lib/db/schema');
  const { getWatchlistSymbols } = await import('../lib/db/watchlist');

  const pg = postgres(POSTGRES_URL);
  const db = drizzle(pg);
  const symbols = await getWatchlistSymbols(db);

  type BufferMap = Record<string, Tick[]>;
  const buffers: BufferMap = {};
  const lastTick: Record<string, number> = {};
  // Track Alpha Vantage fallback failures to implement a basic circuit breaker.
  const fallbackFailures: Record<string, number> = {};
  const circuitOpenUntil: Record<string, number> = {};

  // Dynamically import a WebSocket implementation. If `yahoo-finance-ws` is not
  // available fall back to the generic `ws` package.
  let WebSocketImpl: any;
  try {
    // `yahoo-finance-ws` is optional; if absent, fall back to the generic `ws` package.
    // eslint-disable-next-line import/no-unresolved
    WebSocketImpl = (await import('yahoo-finance-ws')).default;
  } catch {
    WebSocketImpl = (await import('ws')).default;
  }

  /**
   * Establishes the Yahoo Finance WebSocket connection. When the connection
   * drops the function recursively reconnects with exponential backoff and a
   * small random jitter.
   */
  function connectYahoo(attempt = 0) {
    // Local copy so event handlers can mutate attempt without reassigning the parameter
    let currentAttempt = attempt;
    const ws = new WebSocketImpl(YAHOO_WS_URL);
    ws.on('open', () => {
      currentAttempt = 0;
      ws.send(JSON.stringify({ subscribe: symbols }));
    });

    ws.on('message', async (raw: any) => {
      try {
        const msg = JSON.parse(raw.toString());
        // Yahoo sometimes sends an array of ticks; normalise to single objects.
        const events = Array.isArray(msg) ? msg : [msg];
        for (const evt of events) {
          const symbol: string = evt.id ?? evt.symbol;
          if (!symbol) continue;
          const tick: Tick = {
            ts: evt.timestamp ?? Date.now(),
            price: Number(evt.price ?? evt.close ?? evt.p),
            volume: Number(evt.volume ?? evt.v ?? 0),
          };

          lastTick[symbol] = Date.now();
          if (!buffers[symbol]) buffers[symbol] = [];
          buffers[symbol]!.push(tick);
          // Bound per-symbol buffer size.
          if (buffers[symbol]!.length > MAX_TICKS_PER_SYMBOL) {
            buffers[symbol] = buffers[symbol]!.slice(-MAX_TICKS_PER_SYMBOL);
          }
          await db
            .insert(marketTick)
            .values({
              symbol,
              ts: new Date(tick.ts),
              price: tick.price,
              volume: tick.volume,
            })
            .onConflictDoNothing();

          // Fan out the tick to subscribers via Redis so live charts update.
          await pub.publish(
            CHANNEL_TICK,
            JSON.stringify({ symbol, ts: tick.ts, price: tick.price, volume: tick.volume }),
          );
        }
      } catch (err) {
        console.error('failed to process tick', err);
      }
    });

    ws.on('close', () => {
      const delay = Math.min(30_000, 2 ** currentAttempt * 1000) + Math.random() * 1000;
      setTimeout(() => connectYahoo(currentAttempt + 1), delay);
    });

    ws.on('error', () => ws.close());
  }

  // Initial connection to the Yahoo WebSocket feed.
  connectYahoo();

  const INTERVALS: Record<string, number> = {
    '5m': 5 * 60_000,
    '15m': 15 * 60_000,
    '1h': 60 * 60_000,
    '4h': 4 * 60 * 60_000,
    '1d': 24 * 60 * 60_000,
  };

  setInterval(async () => {
    const now = Date.now();
    for (const symbol of Object.keys(buffers)) {
      const ticks = buffers[symbol];
      for (const [interval, ms] of Object.entries(INTERVALS)) {
        const candle = aggregateTicks(
          ticks.filter((t) => now - t.ts <= ms),
          ms,
        );
        if (!candle) continue;
        await db
          .insert(candleTable)
          .values({
            symbol,
            interval,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume,
            tsStart: new Date(candle.ts_start),
            tsEnd: new Date(candle.ts_end),
          })
          .onConflictDoUpdate({
            target: [candleTable.symbol, candleTable.interval, candleTable.tsStart],
            set: {
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
              volume: candle.volume,
              tsEnd: new Date(candle.ts_end),
            },
          });

        // Publish the candle so WebSocket clients receive the update.
        await pub.publish(
          CHANNEL_CANDLE,
          JSON.stringify({
            symbol,
            interval,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume,
            tsStart: candle.ts_start,
            tsEnd: candle.ts_end,
          }),
        );
      }

      // Drop ticks older than one day to bound memory usage
      buffers[symbol] = ticks.filter((t) => now - t.ts <= INTERVALS['1d']);
    }

    // Fallback if no tick received for 30s
    for (const symbol of symbols) {
      if (now - (lastTick[symbol] ?? 0) > 30_000) {
        const openUntil = circuitOpenUntil[symbol];
        if (openUntil === undefined || now > openUntil) {
          await fetchAlphaVantage(
            symbol,
            db,
            buffers,
            lastTick,
            fallbackFailures,
            circuitOpenUntil,
          );
        }
      }
    }
  }, 5_000);
}

/** Fetches a quote from Alpha Vantage when the WebSocket feed stalls. */
async function fetchAlphaVantage(
  symbol: string,
  db: any,
  buffers: Record<string, Tick[]>,
  lastTick: Record<string, number>,
  failures: Record<string, number>,
  circuit: Record<string, number>,
): Promise<void> {
  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (!apiKey) return;
  try {
    const url =
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    const res = await fetch(url);
    const json = (await res.json()) as any;
    const quote = json['Global Quote'];
    if (!quote) return;
    const price = Number(quote['05. price']);
    const volume = Number(quote['06. volume'] ?? 0);
    const ts = Date.now();
    const tick: Tick = { ts, price, volume };
    if (!buffers[symbol]) buffers[symbol] = [];
    buffers[symbol]!.push(tick);
    if (buffers[symbol]!.length > MAX_TICKS_PER_SYMBOL) {
      buffers[symbol] = buffers[symbol]!.slice(-MAX_TICKS_PER_SYMBOL);
    }
    lastTick[symbol] = ts;
    const { marketTick } = await import('../lib/db/schema');
    await db
      .insert(marketTick)
      .values({ symbol, ts: new Date(ts), price, volume })
      .onConflictDoNothing();
    failures[symbol] = 0; // reset failure counter on success
  } catch (err) {
    console.error('alpha vantage fallback failed', err);
    failures[symbol] = (failures[symbol] ?? 0) + 1;
    if ((failures[symbol] ?? 0) >= 3) {
      circuit[symbol] = Date.now() + 5 * 60_000; // pause fallback for 5 minutes
      failures[symbol] = 0;
    }
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
