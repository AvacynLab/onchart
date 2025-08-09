import { listFilings, searchCompanyCIK } from '@/lib/finance/sources/sec';
import { getCache, setCache } from '@/lib/finance/cache';

/** Ensure server-side execution for SEC requests */
export const runtime = 'nodejs';

/**
 * GET /api/finance/filings?ticker=XYZ&forms=10-K,10-Q
 *
 * Resolves the ticker to a CIK, lists recent filings filtered by form types
 * and caches the result briefly.
 */
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker') || undefined;
  const cik = searchParams.get('cik') || undefined;
  const formsParam = searchParams.get('forms');
  if (!ticker && !cik) {
    return new Response(JSON.stringify({ error: 'ticker or cik required' }), {
      status: 400,
    });
  }
  const forms = formsParam?.split(',').filter(Boolean) ?? ['10-K', '10-Q', '8-K'];

  let cikVal = cik;
  if (!cikVal && ticker) {
    try {
      const matches = await searchCompanyCIK(ticker);
      cikVal = matches[0]?.cik;
    } catch {
      return new Response(JSON.stringify({ error: 'failed to resolve CIK' }), {
        status: 502,
      });
    }
  }
  if (!cikVal) {
    return new Response(JSON.stringify({ error: 'CIK not found' }), {
      status: 404,
    });
  }

  const cacheKey = `filings:${cikVal}:${forms.sort().join('-')}`;
  const cached = getCache<any>(cacheKey);
  if (cached) {
    return Response.json(cached);
  }

  try {
    const filings = await listFilings(cikVal, forms);
    setCache(cacheKey, filings, 60_000); // cache 1 minute
    return Response.json(filings);
  } catch {
    return new Response(JSON.stringify({ error: 'failed to fetch filings' }), {
      status: 502,
    });
  }
}

