import { fetchQuoteYahoo } from '@/lib/finance/sources/yahoo';
import { fetchKlinesBinance } from '@/lib/finance/sources/binance';
import { fetchDailyStooq } from '@/lib/finance/sources/stooq';
import { normalizeSymbol, isSupportedSymbol } from '@/lib/finance/symbols';
import { getCache, setCache, TTL_INTRADAY_MS, TTL_DAILY_MS } from '@/lib/finance/cache';

/** Ensure server-side execution to avoid edge limitations */
export const runtime = 'nodejs';

/**
 * GET /api/finance/quote?symbol=XYZ
 *
 * Retrieves the latest price quote for the provided symbol. The handler first
 * attempts to fetch data from Yahoo Finance and falls back to Binance for
 * crypto pairs if Yahoo fails. Responses are cached for a short TTL to avoid
 * hammering public endpoints.
 */
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const symbolParam = searchParams.get('symbol');
  if (!symbolParam) {
    return new Response(JSON.stringify({ error: 'symbol parameter required' }), {
      status: 400,
    });
  }

  // Reject obviously malformed symbols to avoid unnecessary network calls.
  if (!isSupportedSymbol(symbolParam)) {
    return new Response(JSON.stringify({ error: 'unsupported symbol' }), {
      status: 400,
    });
  }

  // Normalise symbol and derive provider specific identifiers
  const normalized = normalizeSymbol(symbolParam);
  const cacheKey = `quote:${normalized.yahoo}`;
  const cached = getCache<any>(cacheKey);
  if (cached) {
    return Response.json(cached);
  }

  try {
    const quote = await fetchQuoteYahoo(normalized.yahoo);
    const payload = { ...quote, source: 'yahoo' as const };
    setCache(cacheKey, payload, TTL_INTRADAY_MS);
    if (process.env.NODE_ENV !== 'production') {
      console.info('[quote]', normalized.symbol, 'yahoo', 200);
    }
    return Response.json(payload);
  } catch (err) {
    // Yahoo may block or be unreachable; attempt Binance for crypto symbols
    if (normalized.binance) {
      try {
        const klines = await fetchKlinesBinance(
          normalized.binance,
          '1m',
          2,
        );
        const [prev, last] = klines.slice(-2);
        const change = last.close - prev.close;
        const quote = {
          symbol: normalized.symbol,
          price: last.close,
          change,
          changePercent: (change / prev.close) * 100,
          marketState: 'REG',
          source: 'binance' as const,
        };
        setCache(cacheKey, quote, TTL_INTRADAY_MS);
        if (process.env.NODE_ENV !== 'production') {
          console.info('[quote]', normalized.symbol, 'binance', 200);
        }
        return Response.json(quote);
      } catch (binanceErr) {
        // Fall through to equity fallback below
      }
    }
    // For non-crypto symbols, attempt daily Stooq fallback
    try {
      const candles = await fetchDailyStooq(normalized.symbol);
      const [prev, last] = candles.slice(-2);
      const change = last.close - prev.close;
      const quote = {
        symbol: normalized.symbol,
        price: last.close,
        change,
        changePercent: (change / prev.close) * 100,
        marketState: 'CLOSED',
        source: 'stooq' as const,
      };
      setCache(cacheKey, quote, TTL_DAILY_MS);
      if (process.env.NODE_ENV !== 'production') {
        console.info('[quote]', normalized.symbol, 'stooq', 200);
      }
      return Response.json(quote);
    } catch (stooqErr) {
      // continue to final error
    }
    if (process.env.NODE_ENV !== 'production') {
      console.info('[quote]', normalized.symbol, 'none', 502);
    }
    return new Response(JSON.stringify({ error: 'failed to fetch quote' }), {
      status: 502,
    });
  }
}
