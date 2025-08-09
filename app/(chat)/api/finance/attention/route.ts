import { listAttentionMarkers, saveAttentionMarker, deleteAttentionMarker } from '@/lib/db/queries';

// Ensure server-side runtime to access the database and avoid edge restrictions
export const runtime = 'nodejs';

/**
 * Manage chart annotations saved by the agent or user.
 *
 * - GET    ?chatId=&symbol=&timeframe=   -> list markers
 * - POST   { userId, chatId, symbol, timeframe, payload } -> save marker
 * - DELETE ?id=                           -> remove marker by id
 */
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get('chatId');
  const symbol = searchParams.get('symbol');
  const timeframe = searchParams.get('timeframe');

  if (!chatId || !symbol || !timeframe) {
    return new Response(JSON.stringify({ error: 'missing parameters' }), {
      status: 400,
    });
  }

  const markers = await listAttentionMarkers({ chatId, symbol, timeframe });
  return Response.json(markers);
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.json();
  const { userId, chatId, symbol, timeframe, payload } = body || {};
  if (!userId || !chatId || !symbol || !timeframe || payload === undefined) {
    return new Response(JSON.stringify({ error: 'invalid body' }), {
      status: 400,
    });
  }

  const id = await saveAttentionMarker({
    userId,
    chatId,
    symbol,
    timeframe,
    payload,
  });
  return Response.json({ id });
}

export async function DELETE(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
  }
  await deleteAttentionMarker({ id });
  return Response.json({ ok: true });
}
