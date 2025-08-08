import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';

const sample = { fundamentals: {}, sentiment: {}, technical: { lastClose: 1, ema20: 1, trend: 'above' } };

// Stub tool module before importing route
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'server-only') return {};
  if (request === '@/lib/ai/tools/analyse-asset') {
    return {
      analyseAsset: { execute: async ({ symbol }: any) => ({ ...sample, symbol }) },
    };
  }
  return originalLoad(request, parent, isMain);
};

test('returns asset analysis', async () => {
  const { GET } = await import('./route');
  const res = await GET(new Request('http://test?symbol=AAPL'));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, { ...sample, symbol: 'AAPL' });
});
