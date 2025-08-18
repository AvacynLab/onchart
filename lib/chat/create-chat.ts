import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import type { VisibilityType } from '@/components/visibility-selector';

/**
 * Create a new chat on the server and seed it with the user's first message.
 *
 * The request is sent with `keepalive` so navigation can proceed without
 * waiting for the streaming response. Any network errors are swallowed to
 * prevent the dashboard from crashing during SSR.
 *
 * @param text - User message to send as the first draft.
 * @param options - Optional overrides for model/visibility and fetch impl.
 * @returns The id of the created chat.
 */
export async function createChatDraft(
  text: string,
  {
    model = DEFAULT_CHAT_MODEL,
    visibility = 'private',
    fetchImpl = fetch,
  }: {
    model?: string;
    visibility?: VisibilityType;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<string> {
  const chatId = generateUUID();
  const messageId = generateUUID();

  const body = {
    id: chatId,
    message: {
      id: messageId,
      role: 'user' as const,
      parts: [{ type: 'text' as const, text }],
    },
    selectedChatModel: model,
    selectedVisibilityType: visibility,
  };

  try {
    await fetchImpl('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch (err) {
    console.error('createChatDraft failed', err);
  }

  return chatId;
}
