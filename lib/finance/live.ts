import type { QuoteResult } from './sources/yahoo';
import { getCache, setCache, INTRADAY_TTL_MS } from './cache';
import { fetchWithRetry } from './request';
import { DataSourceError } from './errors';
import { headers } from 'next/headers.js';

/** Determine if the given symbol should be treated as a crypto pair. */
export function isCryptoSymbol(symbol: string): boolean {
  return symbol.includes('-') && symbol.endsWith('-USD');
}

/** Convert a hyphenated USD crypto symbol into the Binance stream format. */
function toBinanceStream(symbol: string): string {
  // BTC-USD -> btcusdt (Binance uses USDT quotes for USD pairs)
  return `${symbol.replace('-', '').toLowerCase()}t`;
}

/**
 * Subscribe to Binance WebSocket ticker updates for a given crypto symbol.
 * Returns an unsubscribe function that closes the underlying socket.
 */
export function subscribeBinanceTicker(
  symbol: string,
  cb: (quote: QuoteResult) => void,
): () => void {
  // Polling fallback using the internal quote API. Used when WebSockets are not
  // available (server-side rendering) or when the socket connection errors out.
  function startPolling(): () => void {
    let active = true;
    (async function loop() {
      while (active) {
        try {
          const quote = await fetchQuoteWithRetry(symbol, { retries: 0 });
          cb(quote);
        } catch (err) {
          console.error('binance poll error', err);
        }
        await new Promise((r) => setTimeout(r, 10_000));
      }
    })();
    return () => {
      active = false;
    };
  }

  if (typeof WebSocket === 'undefined') {
    return startPolling();
  }

  const stream = toBinanceStream(symbol);
  const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}@ticker`);

  let stopPolling: (() => void) | null = null;
  const handleFallback = (err?: unknown) => {
    if (err) console.error('binance ws error', err);
    if (!stopPolling) {
      stopPolling = startPolling();
    }
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data.toString());
    cb({
      symbol,
      price: Number(data.c),
      change: Number(data.p),
      changePercent: Number(data.P),
      marketState: 'REG', // crypto markets are always open
    });
  };
  ws.onerror = (event) => handleFallback(event);
  ws.onclose = () => handleFallback();
  return () => {
    ws.close();
    if (stopPolling) stopPolling();
  };
}

/**
 * Fetch quote with timeout and retry logic.
 * Delegates to the internal `/api/finance/quote` endpoint which proxies public
 * market data providers and caches results for a short TTL to avoid hammering
 * them. If a request takes longer than the timeout it is considered failed and
 * retried up to the specified number of attempts.
 *
 * The default timeout is kept short (2.5s) since the internal quote API
 * performs its own fallbacks. Slow responses are retried with exponential
 * backoff up to three total attempts.
*/
async function fetchQuoteWithRetry(
  symbol: string,
  {
    timeoutMs = 2_500,
    retries = 2,
    ttlMs = INTRADAY_TTL_MS,
    fetcher = fetch,
    getHeaders = headers,
  }: {
    timeoutMs?: number;
    retries?: number;
    ttlMs?: number;
    fetcher?: typeof fetch;
    getHeaders?: () => Headers | Promise<Headers>;
  } = {},
): Promise<QuoteResult> {
  const cacheKey = `live:${symbol}`;
  const cached = getCache<QuoteResult>(cacheKey);
  if (cached) return cached;

  // Build an absolute base URL when running on the server. In containers or
  // SSR environments the host information is surfaced via the forwarded
  // headers. If absent (e.g. local tests) fall back to the Vercel URL in
  // production or localhost in development.
  const h = typeof window === 'undefined' ? await getHeaders() : null;
  const baseUrl = typeof window === 'undefined'
    ? (() => {
        const proto = h?.get('x-forwarded-proto');
        const host = h?.get('x-forwarded-host');
        if (proto && host) return `${proto}://${host}`;
        if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_VERCEL_URL) {
          return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
        }
        return 'http://localhost:3000';
      })()
    : '';

  const url = `${baseUrl}/api/finance/quote?symbol=${encodeURIComponent(symbol)}`;

  // Perform manual retries for transient 5xx errors from the internal API.
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithRetry(url, {
        timeoutMs,
        retries: 0,
        fetcher,
        init: { cache: 'no-store' },
      });
      const quote = (await res.json()) as QuoteResult;
      setCache(cacheKey, quote, ttlMs);
      return quote;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = /Request failed: (502|503|504)/.test(msg);
      if (err instanceof DataSourceError && retryable && attempt < retries) {
        const baseDelay = 200 * 2 ** attempt;
        const jitter = Math.random() * 200;
        await new Promise((r) => setTimeout(r, baseDelay + jitter));
        continue;
      }
      throw err;
    }
  }
  throw new DataSourceError('failed to fetch quote', { url, attempt: retries, elapsedMs: 0 });
}

/**
 * Retrieve live quotes for a list of symbols. Each symbol is fetched in
 * parallel via the same retry/timeout policy as {@link fetchQuoteWithRetry}.
 * The helper currently performs simple polling of the internal quote API but
 * can later be extended to multiplex WebSocket streams for crypto pairs.
*/
export async function fetchLiveQuotes(
  symbols: string[],
  opts?: {
    timeoutMs?: number;
    retries?: number;
    ttlMs?: number;
    fetcher?: typeof fetch;
    getHeaders?: () => Headers;
  },
): Promise<QuoteResult[]> {
  return Promise.all(symbols.map((s) => fetchQuoteWithRetry(s, opts)));
}

export type { QuoteResult };
