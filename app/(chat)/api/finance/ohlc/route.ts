import { fetchOHLCYahoo } from '@/lib/finance/sources/yahoo';
import { fetchDailyStooq } from '@/lib/finance/sources/stooq';
import { fetchKlinesBinance } from '@/lib/finance/sources/binance';
import { normalizeSymbol, isSupportedSymbol } from '@/lib/finance/symbols';
import {
  getCache,
  setCache,
  INTRADAY_TTL_MS,
  DAILY_TTL_MS,
} from '@/lib/finance/cache';
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

  const debug = process.env.DEBUG_FINANCE === '1';
  if (debug) {
    console.log('[finance] fetching ohlc', {
      symbol: symbolParam,
      interval,
      range,
    });
  }

  if (!symbolParam || !interval) {
    return new Response(
      JSON.stringify({ error: 'symbol and interval parameters required' }),
      { status: 400 },
    );
  }

  // Drop obviously invalid symbols early to prevent unnecessary upstream calls.
  if (!isSupportedSymbol(symbolParam)) {
    return new Response(JSON.stringify({ error: 'unsupported symbol' }), {
      status: 400,
    });
  }

  // Normalise user-provided symbols so downstream fetchers receive consistent
  // identifiers for Yahoo, Binance and Stooq. Cache key includes all query
  // parameters to avoid collisions between different intervals/ranges.
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
    const ttl = interval.endsWith('d') ? DAILY_TTL_MS : INTRADAY_TTL_MS;
    setCache(cacheKey, result, ttl);
    return Response.json(result);
  } catch (err) {
    // Attempt fallback providers depending on asset class and interval.
    try {
      let candles: Candle[];
      let ttl = INTRADAY_TTL_MS;

      if (normalized.assetClass === 'crypto' && normalized.binance) {
        // Binance provides intraday and daily candles for crypto pairs.
        const klines = await fetchKlinesBinance(
          normalized.binance,
          interval,
          500,
        );
        candles = klines.map((k) => ({
          time: k.openTime,
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
        }));
        ttl = interval === '1d' ? DAILY_TTL_MS : INTRADAY_TTL_MS;
      } else if (interval === '1d') {
        // Stooq exposes only daily candles for equities/indices/ETFs.
        candles = await fetchDailyStooq(normalized.symbol);
        ttl = DAILY_TTL_MS;
      } else {
        throw new Error('no fallback');
      }

      const result = { symbol: normalized.symbol, candles };
      setCache(cacheKey, result, ttl);
      return Response.json(result);
    } catch (fallbackErr) {
      // All sources failed; bubble up a 502 so logs reflect network reality.
      return new Response(JSON.stringify({ error: 'failed to fetch ohlc' }), {
        status: 502,
      });
    }
  }
}

