import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';

const sample = {
  score: 0.25,
  histogram: [
    { ts: new Date('2024-01-01T00:00:00Z'), score: 0.3 },
    { ts: new Date('2024-01-01T01:00:00Z'), score: 0.2 },
  ],
};

// Stub the database query before loading the route module.
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'server-only') return {};
  if (request === '@/lib/db/queries') {
    return {
      getSentiment24h: async () => sample,
    };
  }
  return originalLoad(request, parent, isMain);
};

test('returns aggregated sentiment for symbol', async () => {
  const { GET } = await import('./route');
  const res = await GET(new Request('http://test'), { params: { symbol: 'AAPL' } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepStrictEqual(body, {
    symbol: 'AAPL',
    score: sample.score,
    histogram: sample.histogram.map((h) => ({
      ts: h.ts.toISOString(),
      score: h.score,
    })),
  });
});
