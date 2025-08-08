import { scanOpportunities } from '@/lib/ai/tools/scan-opportunities';
import 'server-only';

/**
 * API endpoint exposing the `scanOpportunities` tool.
 *
 * Example: `GET /api/ai/scan-opportunities?limit=5`
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') ?? '5');
  const result = await scanOpportunities.execute({ limit });
  return Response.json(result);
}
