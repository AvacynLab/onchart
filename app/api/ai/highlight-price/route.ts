import { highlightPrice } from '@/lib/ai/tools/highlight-price';
import 'server-only';

/**
 * API endpoint that broadcasts a highlight price event.
 *
 * Usage: `POST /api/ai/highlight-price` with JSON `{ symbol, price, label? }`
 */
export async function POST(request: Request) {
  const { symbol, price, label } = await request.json();
  if (!symbol || typeof price !== 'number') {
    return Response.json({ error: 'symbol and price required' }, { status: 400 });
  }
  await highlightPrice.execute({ symbol, price, label });
  return Response.json({ status: 'ok' });
}
