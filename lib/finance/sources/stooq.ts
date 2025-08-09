import Papa from 'papaparse';
import { getCache, setCache } from '../cache';
import { rateLimit } from '../rate-limit';

export interface Candle {
  time: number; // unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function normalizeSymbol(symbol: string): string {
  let s = symbol.trim().toLowerCase();
  if (!s.includes('.')) s += '.us';
  return s;
}

/**
 * Fetch daily OHLC data from Stooq. Used as a fallback when Yahoo fails.
 * Stooq provides CSV files with historical data.
 */
export async function fetchDailyStooq(symbol: string): Promise<Candle[]> {
  const sym = normalizeSymbol(symbol);
  await rateLimit('stooq');
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(sym)}&i=d`;
  const cached = getCache<Candle[]>(url);
  if (cached) return cached;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const text = await res.text();
  const { data } = Papa.parse(text.trim(), { header: true, dynamicTyping: true });
  const candles = (data as any[]).map((row) => ({
    time: Math.floor(new Date(row.Date).getTime() / 1000),
    open: Number(row.Open),
    high: Number(row.High),
    low: Number(row.Low),
    close: Number(row.Close),
    volume: Number(row.Volume) || 0,
  }));
  setCache(url, candles, 300_000);
  return candles;
}
