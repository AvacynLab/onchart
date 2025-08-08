import { analyseAsset } from '@/lib/ai/tools/analyse-asset';
import { auth } from '@/app/(auth)/auth';
import 'server-only';

/**
 * API endpoint exposing the `analyseAsset` tool over HTTP.
 *
 * Usage: `GET /api/ai/analyse-asset?symbol=AAPL`
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  if (!symbol) {
    return Response.json({ error: 'symbol required' }, { status: 400 });
  }
  const emit = searchParams.get('emitArtifact') === '1';
  const session = await auth();
  const result = await analyseAsset.execute(
    { symbol, emitArtifact: emit ? 'research-asset' : undefined },
    { session },
  );
  return Response.json(result);
}
