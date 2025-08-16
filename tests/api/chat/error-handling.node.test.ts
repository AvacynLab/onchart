import { test, expect } from '@playwright/test';
import { POST } from '../../../app/(chat)/api/chat/route';
import * as authModule from '../../../app/(auth)/auth';

// Ensure unauthorized responses include a diagnostic header so clients can
// surface precise error messages without parsing the JSON body.
test('unauthorized requests set X-Error-Code header', async () => {
  const originalAuth = authModule.auth;
  (authModule as any).auth = async () => null;

  const body = {
    id: '00000000-0000-0000-0000-000000000000',
    message: {
      id: '00000000-0000-0000-0000-000000000001',
      role: 'user',
      parts: [{ type: 'text', text: 'hi' }],
    },
    selectedChatModel: 'gpt-5',
    selectedVisibilityType: 'public',
  };

  const res = await POST(
    new Request('https://example.com/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

  // The chat API always responds with a 200 status so that network requests do
  // not fail at the fetch layer. Diagnostic information is exposed via the
  // `X-Error-Code` header and JSON body instead.
  expect(res.status).toBe(200);
  expect(res.headers.get('X-Error-Code')).toBe('unauthorized:chat');
  const payload = await res.json();
  expect(payload.code).toBe('unauthorized:chat');

  (authModule as any).auth = originalAuth;
});
