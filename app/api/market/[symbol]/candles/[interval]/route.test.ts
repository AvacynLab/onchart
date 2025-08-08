import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';

const sample = [
  {
    symbol: 'AAPL',
    interval: '1d',
    open: 1,
    high: 1,
    low: 1,
    close: 1,
    volume: 1,
    tsStart: new Date('2024-01-01T00:00:00Z'),
    tsEnd: new Date('2024-01-02T00:00:00Z'),
  },
];

// Stub modules before importing the route
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'server-only') return {};
  if (request === '@/lib/db/queries') {
    return { getCandles: async () => sample };
  }
  return originalLoad(request, parent, isMain);
};

test('returns candles for symbol and interval', async () => {
  const { GET } = await import('./route');
  const res = await GET(new Request('http://test'), {
    params: { symbol: 'AAPL', interval: '1d' },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  const expected = sample.map((c) => ({
    ...c,
    tsStart: c.tsStart.toISOString(),
    tsEnd: c.tsEnd.toISOString(),
  }));
  assert.deepStrictEqual(body, expected);
});
