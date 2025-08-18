import { parse } from 'papaparse';
import { getCache, setCache, DAILY_TTL_MS } from '../cache';
import { rateLimit } from '../rate-limit';
import { fetchWithRetry } from '../request';
import { toStooqTicker } from '../symbols';
import { DataSourceError } from '../errors';

export interface Candle {
  time: number; // unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Fetch daily OHLC data from Stooq. Used as a fallback when Yahoo fails.
 * Stooq provides CSV files with historical data.
 */
export async function fetchDailyStooq(symbol: string): Promise<Candle[]> {
  const sym = toStooqTicker(symbol).toLowerCase();
  await rateLimit('stooq');
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(sym)}&i=d`;
  const cached = getCache<Candle[]>(url);
  if (cached) return cached;
  const res = await fetchWithRetry(url);
  const text = await res.text();
  const { data } = parse(text.trim(), { header: true, dynamicTyping: true });
  const candles = (data as any[]).map((row) => ({
    time: Math.floor(new Date(row.Date).getTime() / 1000),
    open: Number(row.Open),
    high: Number(row.High),
    low: Number(row.Low),
    close: Number(row.Close),
    volume: Number(row.Volume) || 0,
  }));
  if (candles.length < 2) {
    throw new DataSourceError('Stooq returned less than 2 candles');
  }
  setCache(url, candles, DAILY_TTL_MS);
  return candles;
}
