import { auth } from '@/app/(auth)/auth';
import { getChatById, getVotesByChatId, voteMessage } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

// Use Node.js runtime since this route may interact with the database or other
// Node-only libraries.
export const runtime = 'nodejs';

// When no Postgres database is configured, fall back to an in-memory store so
// tests can exercise the vote API without external dependencies.
const useMockStore = !process.env.POSTGRES_URL;
const mockVotes = new Map<
  string,
  Array<{ messageId: string; type: 'up' | 'down' }>
>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new ChatSDKError(
      'bad_request:api',
      'Parameter chatId is required.',
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:vote').toResponse();
  }

  if (useMockStore) {
    const votes = mockVotes.get(chatId) ?? [];
    return Response.json(votes, { status: 200 });
  }

  const chat = await getChatById({ id: chatId });

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:vote').toResponse();
  }

  const votes = await getVotesByChatId({ id: chatId });

  return Response.json(votes, { status: 200 });
}

export async function PATCH(request: Request) {
  const {
    chatId,
    messageId,
    type,
  }: { chatId: string; messageId: string; type: 'up' | 'down' } =
    await request.json();

  if (!chatId || !messageId || !type) {
    return new ChatSDKError(
      'bad_request:api',
      'Parameters chatId, messageId, and type are required.',
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:vote').toResponse();
  }

  if (useMockStore) {
    const existing = mockVotes.get(chatId) ?? [];
    const idx = existing.findIndex((v) => v.messageId === messageId);
    if (idx >= 0) {
      const vote = existing[idx];
      if (vote) {
        vote.type = type;
      }
    } else {
      existing.push({ messageId, type });
    }
    mockVotes.set(chatId, existing);
    return new Response('Message voted', { status: 200 });
  }

  const chat = await getChatById({ id: chatId });

  if (!chat) {
    return new ChatSDKError('not_found:vote').toResponse();
  }

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:vote').toResponse();
  }

  await voteMessage({
    chatId,
    messageId,
    type: type,
  });

  return new Response('Message voted', { status: 200 });
}
