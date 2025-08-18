import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';

// Capture calls to the mocked database helpers.
const chatCalls: any[] = [];
const analysisCalls: any[] = [];

test('persists a news summary analysis', async () => {
  const originalLoad = (Module as any)._load;
  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === '@/app/(auth)/auth') {
      return { auth: async () => ({ user: { id: 'user-1' } }) };
    }
    if (request === '@/lib/db/queries') {
      return {
        createGuestUser: async () => [{ id: 'guest' }],
        saveChat: (...args: any[]) => { chatCalls.push(args); },
        saveAnalysis: (...args: any[]) => { analysisCalls.push(args); },
      };
    }
    return originalLoad(request, parent, isMain);
  };

  const { POST } = require('../../../app/(chat)/api/finance/news/summary/route');
  (Module as any)._load = originalLoad;

  const body = {
    symbol: 'AAPL',
    items: [{ title: 'Apple releases product', url: 'https://example.com', source: 'Reuters' }],
  };
  const res = await POST(
    new Request('http://test/api/finance/news/summary', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );

  assert.equal(res.status, 200);
  assert.equal(chatCalls.length, 1);
  assert.equal(analysisCalls.length, 1);
});
