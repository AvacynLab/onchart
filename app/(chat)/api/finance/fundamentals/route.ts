import { fetchCompanyFacts, searchCompanyCIK } from '@/lib/finance/sources/sec';
import { getCache, setCache } from '@/lib/finance/cache';

/** Ensure server-side execution for SEC requests */
export const runtime = 'nodejs';

/**
 * GET /api/finance/fundamentals?ticker=XYZ
 *
 * Resolves the provided ticker to a CIK via the SEC, fetches
 * company facts and derives simple ratios. Responses are cached
 * to avoid hammering the public SEC endpoints.
 */
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker') || undefined;
  const cik = searchParams.get('cik') || undefined;
  if (!ticker && !cik) {
    return new Response(JSON.stringify({ error: 'ticker or cik required' }), {
      status: 400,
    });
  }

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

  const cacheKey = `fundamentals:${cikVal}`;
  const cached = getCache<any>(cacheKey);
  if (cached) {
    return Response.json(cached);
  }

  try {
    const facts = await fetchCompanyFacts(cikVal);
    const ratios: Record<string, number> = {};
    if (facts.assets && facts.liabilities) {
      ratios.debtToAssets = facts.liabilities / facts.assets;
    }
    const out = { cik: cikVal, ...facts, ...ratios };
    setCache(cacheKey, out, 24 * 60 * 60 * 1000); // cache 1 day
    return Response.json(out);
  } catch {
    return new Response(JSON.stringify({ error: 'failed to fetch fundamentals' }), {
      status: 502,
    });
  }
}

