import { fetchOHLCYahoo } from '@/lib/finance/sources/yahoo';
import { fetchDailyStooq } from '@/lib/finance/sources/stooq';
import { fetchKlinesBinance } from '@/lib/finance/sources/binance';
import { normalizeSymbol } from '@/lib/finance/symbols';
import { getCache, setCache } from '@/lib/finance/cache';
import type { Candle } from '@/lib/finance/backtest';

/** Ensure execution on Node.js to avoid edge restrictions. */
export const runtime = 'nodejs';

/**
 * GET /api/finance/ohlc?symbol=XYZ&interval=1d&range=1mo
 *
 * Retrieves OHLC candle data for the provided symbol using Yahoo Finance as the
 * primary source. If Yahoo fails, the handler falls back to Binance for crypto
 * symbols and to Stooq for equities/indices/ETFs. Responses are cached for a
 * short TTL to avoid excessive requests to public endpoints.
 */
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const symbolParam = searchParams.get('symbol');
  const interval = searchParams.get('interval');
  const range = searchParams.get('range') || undefined;
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (!symbolParam || !interval) {
    return new Response(
      JSON.stringify({ error: 'symbol and interval parameters required' }),
      { status: 400 },
    );
  }

  const normalized = normalizeSymbol(symbolParam);
  const cacheKey = `ohlc:${normalized.yahoo}:${interval}:${range || ''}:${start || ''}:${end || ''}`;
  const cached = getCache<any>(cacheKey);
  if (cached) {
    return Response.json(cached);
  }

  try {
    const candles = await fetchOHLCYahoo(normalized.yahoo, interval, {
      range,
      start: start ? Number(start) : undefined,
      end: end ? Number(end) : undefined,
    });
    const result = { symbol: normalized.symbol, candles };
    const ttl = interval.endsWith('d') ? 300_000 : 15_000; // 5m for daily, 15s intraday
    setCache(cacheKey, result, ttl);
    return Response.json(result);
  } catch (err) {
    // Attempt fallback providers depending on asset class
    try {
      // Candle array returned by the fallback providers.
      let candles: Candle[];
      // Default cache TTL set to 5 minutes; shorter for intraday data.
      let ttl = 300_000;
      if (normalized.assetClass === 'crypto' && normalized.binance) {
        candles = await fetchKlinesBinance(normalized.binance, interval, 500);
        ttl = 15_000;
      } else {
        candles = await fetchDailyStooq(normalized.symbol);
        ttl = 300_000;
      }
      const result = { symbol: normalized.symbol, candles };
      setCache(cacheKey, result, ttl);
      return Response.json(result);
    } catch (fallbackErr) {
      return new Response(JSON.stringify({ error: 'failed to fetch ohlc' }), {
        status: 502,
      });
    }
  }
}

