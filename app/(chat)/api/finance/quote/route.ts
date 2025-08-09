import { fetchQuoteYahoo } from '@/lib/finance/sources/yahoo';
import { fetchKlinesBinance } from '@/lib/finance/sources/binance';
import { normalizeSymbol } from '@/lib/finance/symbols';
import { getCache, setCache } from '@/lib/finance/cache';

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

  // Normalise symbol and derive provider specific identifiers
  const normalized = normalizeSymbol(symbolParam);
  const cacheKey = `quote:${normalized.yahoo}`;
  const cached = getCache<any>(cacheKey);
  if (cached) {
    return Response.json(cached);
  }

  try {
    const quote = await fetchQuoteYahoo(normalized.yahoo);
    setCache(cacheKey, quote, 15_000); // cache for 15 seconds
    return Response.json(quote);
  } catch (err) {
    // Yahoo may block or be unreachable; attempt Binance for crypto symbols
    if (normalized.binance) {
      try {
        const klines = await fetchKlinesBinance(normalized.binance, '1m', 1);
        const [last] = klines.slice(-1);
        const quote = {
          symbol: normalized.symbol,
          price: last.close,
          change: 0,
          changePercent: 0,
          marketState: 'REG',
        };
        setCache(cacheKey, quote, 15_000);
        return Response.json(quote);
      } catch (binanceErr) {
        // Fall through to error response below
      }
    }
    return new Response(JSON.stringify({ error: 'failed to fetch quote' }), {
      status: 502,
    });
  }
}
