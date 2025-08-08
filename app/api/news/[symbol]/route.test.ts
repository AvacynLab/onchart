import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';

const sample = [
  {
    headline: 'Sample',
    url: 'https://example.com',
    score: 0.5,
    ts: new Date('2024-01-01T00:00:00Z'),
  },
];

// Stub modules before importing the route
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'server-only') return {};
  if (request === '@/lib/db/queries') {
    return { getLatestNews: async () => sample };
  }
  return originalLoad(request, parent, isMain);
};

test('returns news for symbol', async () => {
  const { GET } = await import('./route');
  const res = await GET(new Request('http://test'), { params: { symbol: 'AAPL' } });
  assert.equal(res.status, 200);
  const body = await res.json();
  const expected = {
    symbol: 'AAPL',
    news: sample.map((n) => ({
      headline: n.headline,
      url: n.url,
      score: n.score,
      ts: n.ts.toISOString(),
    })),
  };
  assert.deepStrictEqual(body, expected);
});
