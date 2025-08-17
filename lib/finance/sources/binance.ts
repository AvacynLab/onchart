import { getCache, setCache, TTL_INTRADAY_MS } from '../cache';
import { rateLimit } from '../rate-limit';
import { fetchWithRetry } from '../request';
import { toBinancePair } from '../symbols';

/** Minimal kline structure returned by Binance. */
export interface Kline {
  openTime: number; // unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Fetch klines (candlesticks) from Binance's public REST API. The dashboard
 * streams live crypto quotes via WebSocket, but historical candles are pulled
 * using this keyless endpoint as a fallback when WebSocket data is
 * unavailable.
 *
 * @param interval Candle interval like '1m', '5m', '1h'
 * @param limit Number of candles to retrieve (default 500)
 */
export async function fetchKlinesBinance(
  symbol: string,
  interval: string,
  limit = 500,
  fetcher: typeof fetch = fetch,
): Promise<Kline[]> {
  const pair = toBinancePair(symbol);
  await rateLimit('binance');
  const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(pair)}&interval=${interval}&limit=${limit}`;
  const cached = getCache<Kline[]>(url);
  if (cached) return cached;
  const res = await fetchWithRetry(url, { fetcher });
  const data = (await res.json()) as any[];
  const candles = data.map((d) => ({
    openTime: Math.floor(d[0] / 1000),
    open: Number(d[1]),
    high: Number(d[2]),
    low: Number(d[3]),
    close: Number(d[4]),
    volume: Number(d[5]),
  }));
  setCache(url, candles, TTL_INTRADAY_MS);
  return candles;
}
