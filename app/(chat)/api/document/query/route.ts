import { queryDocuments } from '@/lib/db/queries';

// Force Node runtime for database access
export const runtime = 'nodejs';

/**
 * List documents such as analyses or strategies for a given asset.
 */
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const asset = searchParams.get('asset');
  if (!asset) {
    return new Response(JSON.stringify({ error: 'asset required' }), {
      status: 400,
    });
  }
  const timeframe = searchParams.get('timeframe') ?? undefined;
  const kind =
    (searchParams.get('kind') as 'analysis' | 'strategy') ?? 'analysis';
  const limit = Number(searchParams.get('limit') ?? '20');
  const offset = Number(searchParams.get('offset') ?? '0');

  const { items, total } = await queryDocuments({
    asset,
    ...(timeframe ? { timeframe } : {}),
    kind,
    limit,
    offset,
  });

  return Response.json({ items, total });
}
