import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';

// Capture published messages to the Redis bus
const published: any[] = [];
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'server-only') return {};
  if (request === '@/lib/market/bus') {
    return {
      CHANNEL_AI: 'ai-events',
      pub: {
        isOpen: true,
        publish: async (_channel: string, msg: string) => {
          published.push(JSON.parse(msg));
        },
      },
      sub: { isOpen: true, subscribe: async () => {}, unsubscribe: async () => {} },
      initBus: async () => {},
    };
  }
  return originalLoad(request, parent, isMain);
};

test('POST broadcasts highlight-price event', async () => {
  const { subscribeAIEvents } = await import('@/lib/ai/event-engine');
  const { POST } = await import('./route');
  const received: any[] = [];
  const unsubscribe = subscribeAIEvents((e) => received.push(e));
  const res = await POST(
    new Request('http://test', {
      method: 'POST',
      body: JSON.stringify({ symbol: 'AAPL', price: 123 }),
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  unsubscribe();
  assert.equal(res.status, 200);
  assert.equal(received.length, 1);
  assert.equal(received[0].symbol, 'AAPL');
  assert.equal(published.length, 1);
  assert.equal(published[0].symbol, 'AAPL');
  (Module as any)._load = originalLoad;
});
