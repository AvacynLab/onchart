import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';

let called: any = null;
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'server-only') return {};
  if (request === '@/lib/ai/tools/highlight-price') {
    return {
      highlightPrice: { execute: async (args: any) => { called = args; } },
    };
  }
  return originalLoad(request, parent, isMain);
};

test('broadcasts highlight price', async () => {
  const { POST } = await import('./route');
  const res = await POST(
    new Request('http://test', {
      method: 'POST',
      body: JSON.stringify({ symbol: 'AAPL', price: 1, label: 'x' }),
    }),
  );
  assert.equal(res.status, 200);
  assert.deepEqual(called, { symbol: 'AAPL', price: 1, label: 'x' });
});
