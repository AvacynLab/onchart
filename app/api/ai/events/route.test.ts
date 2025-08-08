import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';
import { EventEmitter } from 'node:events';

// Polyfill WebSocketPair for the Node test environment
class MockSocket {
  partner?: MockSocket;
  private listeners: Record<string, Array<(ev: any) => void>> = {};
  accept() {}
  send(data: any) {
    this.partner?.listeners['message']?.forEach((fn) => fn({ data }));
  }
  addEventListener(type: string, fn: (ev: any) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(fn);
  }
  close() {
    this.listeners['close']?.forEach((fn) => fn({}));
    this.partner?.listeners['close']?.forEach((fn) => fn({}));
  }
}
(global as any).WebSocketPair = class {
  0: MockSocket;
  1: MockSocket;
  constructor() {
    this[0] = new MockSocket();
    this[1] = new MockSocket();
    this[0].partner = this[1];
    this[1].partner = this[0];
  }
};

// Shared emitter instance emulating the Redis pub/sub bus
const emitter = new EventEmitter();

// Stub module resolution for server-only and bus module
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'server-only') return {};
  if (request === '@/lib/market/bus') {
    return {
      CHANNEL_AI: 'ai-events',
      pub: {
        isOpen: true,
        publish: async (channel: string, msg: string) => emitter.emit(channel, msg),
      },
      sub: {
        isOpen: true,
        subscribe: async (channel: string, handler: any) => emitter.on(channel, handler),
        unsubscribe: async (channel: string, handler: any) => emitter.off(channel, handler),
      },
      initBus: async () => {},
    };
  }
  return originalLoad(request, parent, isMain);
};

test('websocket relays ai events', async () => {
  const { GET } = await import('./route');
  const res: any = await GET(
    new Request('http://test', { headers: { upgrade: 'websocket' } }),
  );

  // The route returns 200 in this test environment to satisfy undici's Response constraints
  assert.equal(res.status, 200);
  const ws = res.webSocket as any;
  const received: string[] = [];
  ws.addEventListener('message', (ev: any) => received.push(ev.data));

  const { pub, CHANNEL_AI } = require('@/lib/market/bus');
  await pub.publish(
    CHANNEL_AI,
    JSON.stringify({ type: 'highlight-price', symbol: 'AAPL', price: 100, ts: 1 }),
  );

  assert.equal(received.length, 1);
  assert.deepEqual(JSON.parse(received[0]), {
    type: 'highlight-price',
    symbol: 'AAPL',
    price: 100,
    ts: 1,
  });

  // Ensure no messages forwarded after closing the socket
  ws.close();
  await pub.publish(
    CHANNEL_AI,
    JSON.stringify({ type: 'highlight-price', symbol: 'AAPL', price: 101, ts: 2 }),
  );
  assert.equal(received.length, 1);
});
