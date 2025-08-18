import { auth } from '@/app/(auth)/auth';
import { createGuestUser, saveChat, saveAnalysis } from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';
import type { VisibilityType } from '@/components/visibility-selector';

/** Ensure server-side execution to access the database */
export const runtime = 'nodejs';

/**
 * POST /api/finance/news/summary
 *
 * Creates an analysis artefact that summarises the latest headlines for a
 * given symbol. Headlines are naively concatenated; a future iteration may
 * leverage an LLM for richer summaries.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const { symbol, items } = (await req.json()) as {
      symbol?: string;
      items?: { title: string; url: string; source: string }[];
    };
    if (!symbol || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'invalid payload' }), {
        status: 400,
      });
    }

    // Resolve the user initiating the request or fall back to a guest account.
    const session = await auth();
    let userId: string;
    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      const [guest] = await createGuestUser();
      userId = guest.id;
    }

    // Create a lightweight chat record to satisfy foreign-key constraints.
    const chatId = generateUUID();
    await saveChat({
      id: chatId,
      userId,
      title: `News summary ${symbol}`,
      visibility: 'private' as VisibilityType,
    });

    // Collate the headlines into a bullet list as a crude "summary".
    const summary = items.map((i) => `- ${i.title}`).join('\n');
    await saveAnalysis({
      userId,
      chatId,
      type: 'news_summary',
      input: { symbol, items },
      output: { summary },
    });

    return Response.json({ id: chatId });
  } catch (err) {
    console.error('failed to summarise news', err);
    return new Response(JSON.stringify({ error: 'failed to summarise news' }), {
      status: 500,
    });
  }
}
