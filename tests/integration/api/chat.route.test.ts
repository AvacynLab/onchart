import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';

// Ensure the guest quota check returns a localized assistant message
// instead of an HTTP error.
test('guest quota exceeded yields assistant message', async () => {
  const originalLoad = (Module as any)._load;
  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === 'server-only') return {};
    if (request === '@/app/(auth)/auth') {
      return {
        auth: async () => ({ user: { id: 'u1', type: 'guest' } }),
      };
    }
    if (request === '@/lib/db/queries') {
      return {
        getMessageCountByUserId: async () => 21,
        getChatById: async () => null,
      };
    }
    return originalLoad(request, parent, isMain);
  };

  const { POST } = require('../../../app/(chat)/api/chat/route');
  (Module as any)._load = originalLoad;

  const res = await POST(
    new Request('https://example.com/api/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-next-intl-locale': 'fr',
      },
      body: JSON.stringify({
        id: '00000000-0000-0000-0000-000000000000',
        message: {
          id: '00000000-0000-0000-0000-000000000001',
          role: 'user',
          parts: [{ type: 'text', text: 'salut' }],
        },
        selectedChatModel: 'gpt-5',
        selectedVisibilityType: 'public',
      }),
    }),
  );
  const text = await res.text();
  assert.match(text, /Quota invité atteint/);
});
