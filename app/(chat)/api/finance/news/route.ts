import { fetchRssFeeds } from '@/lib/finance/sources/news';
import { getCache, setCache } from '@/lib/finance/cache';

/** Ensure server-side execution to avoid edge limitations */
export const runtime = 'nodejs';

/**
 * GET /api/finance/news?symbol=XYZ
 *
 * Aggregates public RSS feeds for a given symbol or keyword and
 * returns items sorted by publication date. Results are cached
 * briefly to reduce repeated network requests.
 */
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || undefined;
  const query = searchParams.get('query') || undefined;
  const windowParam = searchParams.get('window');
  if (!symbol && !query) {
    return new Response(JSON.stringify({ error: 'symbol or query required' }), {
      status: 400,
    });
  }
  const term = symbol || query || '';
  const window = windowParam ? Number(windowParam) : undefined;
  const cacheKey = `news:${term}:${window ?? 'all'}`;
  const cached = getCache<any>(cacheKey);
  if (cached) {
    return Response.json(cached);
  }

  try {
    const items = await fetchRssFeeds(term, window);
    setCache(cacheKey, items, 60_000); // cache 1 minute
    return Response.json(items);
  } catch {
    return new Response(JSON.stringify({ error: 'failed to fetch news' }), {
      status: 502,
    });
  }
}

