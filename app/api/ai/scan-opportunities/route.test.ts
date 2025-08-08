import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';

const sample = [{ symbol: 'AAPL', score: 0.9 }];

const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'server-only') return {};
  if (request === '@/lib/ai/tools/scan-opportunities') {
    return {
      scanOpportunities: { execute: async ({ limit }: any) => sample.slice(0, limit) },
    };
  }
  return originalLoad(request, parent, isMain);
};

test('returns opportunities list', async () => {
  const { GET } = await import('./route');
  const res = await GET(new Request('http://test?limit=1'));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, sample.slice(0, 1));
});
