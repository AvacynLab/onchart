import { getCache, setCache, INTRADAY_TTL_MS } from '../cache';
import { rateLimit } from '../rate-limit';
import fetchWithRetry from '../request';

export interface Candle {
  time: number; // unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

/**
 * Fetch klines (candlesticks) from Binance public API.
 * @param interval Candle interval like '1m', '5m', '1h'
 * @param limit Number of candles to retrieve (default 500)
 */
export async function fetchKlinesBinance(
  symbol: string,
  interval: string,
  limit = 500,
): Promise<Candle[]> {
  const sym = normalizeSymbol(symbol);
  await rateLimit('binance');
  const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(sym)}&interval=${interval}&limit=${limit}`;
  const cached = getCache<Candle[]>(url);
  if (cached) return cached;
  const res = await fetchWithRetry(url);
  const data = (await res.json()) as any[];
  const candles = data.map((d) => ({
    time: Math.floor(d[0] / 1000),
    open: Number(d[1]),
    high: Number(d[2]),
    low: Number(d[3]),
    close: Number(d[4]),
    volume: Number(d[5]),
  }));
  setCache(url, candles, INTRADAY_TTL_MS);
  return candles;
}
