import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';

const sample = {
  symbol: 'AAPL',
  json: { revenue: 1 },
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

// Stub modules before importing the route
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'server-only') return {};
  if (request === '@/lib/db/queries') {
    return { getFundamentals: async () => sample };
  }
  return originalLoad(request, parent, isMain);
};

test('returns fundamentals for symbol', async () => {
  const { GET } = await import('./route');
  const res = await GET(new Request('http://test'), {
    params: { symbol: 'AAPL' },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  const expected = {
    symbol: sample.symbol,
    json: sample.json,
    updatedAt: sample.updatedAt.toISOString(),
  };
  assert.deepStrictEqual(body, expected);
});

