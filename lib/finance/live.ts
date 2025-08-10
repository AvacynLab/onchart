import type { QuoteResult } from './sources/yahoo';
import { getCache, setCache, INTRADAY_TTL_MS } from './cache';
import fetchWithRetry from './request';

/** Determine if the given symbol should be treated as a crypto pair. */
export function isCryptoSymbol(symbol: string): boolean {
  return symbol.includes('-') && symbol.endsWith('-USD');
}

/** Convert a hyphenated USD crypto symbol into the Binance stream format. */
function toBinanceStream(symbol: string): string {
  // BTC-USD -> btcusdt (Binance uses USDT quotes for USD pairs)
  return symbol.replace('-', '').toLowerCase() + 't';
}

/**
 * Subscribe to Binance WebSocket ticker updates for a given crypto symbol.
 * Returns an unsubscribe function that closes the underlying socket.
 */
export function subscribeBinanceTicker(
  symbol: string,
  cb: (quote: QuoteResult) => void,
): () => void {
  if (typeof WebSocket === 'undefined') return () => {};
  const stream = toBinanceStream(symbol);
  const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}@ticker`);
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
  ws.onerror = (err) => {
    console.error('binance ws error', err);
  };
  return () => ws.close();
}

/**
 * Fetch quote with timeout and retry logic.
 * Delegates to the internal `/api/finance/quote` endpoint which proxies public
 * market data providers and caches results for a short TTL to avoid hammering
 * them. If a request takes longer than the timeout it is considered failed and
 * retried up to the specified number of attempts.
 *
 * The default timeout is aligned with the 10s guidance for public data
 * sources, balancing responsiveness with avoiding unnecessary retries.
 */
async function fetchQuoteWithRetry(
  symbol: string,
  {
    timeoutMs = 10_000,
    retries = 2,
    ttlMs = INTRADAY_TTL_MS,
  }: { timeoutMs?: number; retries?: number; ttlMs?: number } = {},
): Promise<QuoteResult> {
  const cacheKey = `live:${symbol}`;
  const cached = getCache<QuoteResult>(cacheKey);
  if (cached) return cached;

  const baseUrl =
    typeof window === 'undefined'
      ? process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : 'http://localhost:3000'
      : '';

  const res = await fetchWithRetry(
    `${baseUrl}/api/finance/quote?symbol=${encodeURIComponent(symbol)}`,
    { timeoutMs, retries, init: { cache: 'no-store' } },
  );
  const quote = (await res.json()) as QuoteResult;
  setCache(cacheKey, quote, ttlMs);
  return quote;
}

/**
 * Retrieve live quotes for a list of symbols. Each symbol is fetched in
 * parallel via the same retry/timeout policy as {@link fetchQuoteWithRetry}.
 * The helper currently performs simple polling of the internal quote API but
 * can later be extended to multiplex WebSocket streams for crypto pairs.
*/
export async function fetchLiveQuotes(symbols: string[]): Promise<QuoteResult[]> {
  return Promise.all(symbols.map((s) => fetchQuoteWithRetry(s)));
}

export type { QuoteResult };
