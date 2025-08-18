import { getCache, setCache, INTRADAY_TTL_MS } from '../cache';
import { rateLimit } from '../rate-limit';
import { fetchWithRetry } from '../request';
import { toBinancePair } from '../symbols';

/**
 * Minimal candle representation returned by Binance. Volume is omitted because
 * most consumers only require pricing information for variation calculation.
 */
export interface BinanceKline {
  /** Unix timestamp of the candle open time (seconds). */
  openTime: number;
  /** Opening price for the period. */
  open: number;
  /** Highest price during the period. */
  high: number;
  /** Lowest price during the period. */
  low: number;
  /** Closing price for the period. */
  close: number;
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
  pair: string,
  interval: string,
  limit = 500,
  fetcher: typeof fetch = fetch,
): Promise<BinanceKline[]> {
  // Normalise user supplied symbols into Binance pair format.
  const symbol = toBinancePair(pair);
  await rateLimit('binance');
  const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`;
  const cached = getCache<BinanceKline[]>(url);
  if (cached) return cached;
  const res = await fetchWithRetry(url, { fetcher });
  const data = (await res.json()) as any[];
  const candles: BinanceKline[] = data.map((d) => ({
    openTime: Math.floor(d[0] / 1000),
    open: Number(d[1]),
    high: Number(d[2]),
    low: Number(d[3]),
    close: Number(d[4]),
  }));
  setCache(url, candles, INTRADAY_TTL_MS);
  return candles;
}
