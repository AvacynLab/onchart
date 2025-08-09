import {
  createResearch,
  updateResearch,
  getResearchById,
  listResearchByChatId,
} from '@/lib/db/queries';

// Force Node runtime for database access
export const runtime = 'nodejs';

/**
 * CRUD endpoint for research documents used by the finance agent.
 *
 * - GET    ?chatId= -> list docs for a chat
 * - GET    ?id=     -> fetch a document by id
 * - POST   { userId, chatId, kind, title, sections } -> create doc
 * - PATCH  { id, title?, sections? }                 -> update doc
 */
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const chatId = searchParams.get('chatId');
  if (id) {
    const doc = await getResearchById({ id });
    return Response.json(doc ?? null);
  }
  if (chatId) {
    const docs = await listResearchByChatId({ chatId });
    return Response.json(docs);
  }
  return new Response(JSON.stringify({ error: 'id or chatId required' }), {
    status: 400,
  });
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.json();
  const { userId, chatId, kind, title, sections = [] } = body || {};
  if (!userId || !chatId || !kind || !title) {
    return new Response(JSON.stringify({ error: 'invalid body' }), {
      status: 400,
    });
  }
  const created = await createResearch({ userId, chatId, kind, title, sections });
  return Response.json(created);
}

export async function PATCH(req: Request): Promise<Response> {
  const body = await req.json();
  const { id, title, sections } = body || {};
  if (!id) {
    return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
  }
  const updated = await updateResearch({ id, title, sections });
  return Response.json(updated);
}
