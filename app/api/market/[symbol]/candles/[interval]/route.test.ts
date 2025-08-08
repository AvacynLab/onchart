import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';

/**
 * Intervals supported by the candle route. We exercise each one to ensure the
 * handler simply forwards the query to the database layer.
 */
const intervals = ['5m', '15m', '1h', '4h', '1d'] as const;

// Stub modules before importing the route. We replace the database query with a
// deterministic implementation that echoes the requested interval so we can
// verify the route passes parameters correctly.
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'server-only') return {};
  if (request === '@/lib/db/queries') {
    return {
      getCandles: async ({ symbol, interval }: { symbol: string; interval: string }) => [
        {
          symbol,
          interval,
          open: 1,
          high: 1,
          low: 1,
          close: 1,
          volume: 1,
          tsStart: new Date('2024-01-01T00:00:00Z'),
          tsEnd: new Date('2024-01-02T00:00:00Z'),
        },
      ],
    };
  }
  return originalLoad(request, parent, isMain);
};

for (const interval of intervals) {
  test(`returns candles for ${interval}`, async () => {
    const { GET } = await import('./route');
    const res = await GET(new Request('http://test'), {
      params: { symbol: 'AAPL', interval },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    const expected = [
      {
        symbol: 'AAPL',
        interval,
        open: 1,
        high: 1,
        low: 1,
        close: 1,
        volume: 1,
        tsStart: '2024-01-01T00:00:00.000Z',
        tsEnd: '2024-01-02T00:00:00.000Z',
      },
    ];
    assert.deepStrictEqual(body, expected);
  });
}
