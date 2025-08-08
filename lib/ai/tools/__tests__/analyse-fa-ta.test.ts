import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';

const fundamentals = { symbol: 'ABC', json: { pe: 20 }, updatedAt: new Date() };
const candles = Array.from({ length: 20 }, (_, i) => ({
  open: 0,
  high: 0,
  low: 0,
  close: i + 1,
  volume: 0,
  tsStart: new Date(),
  tsEnd: new Date(),
}));

const saved: any[] = [];
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === '@/lib/db/queries') {
    return {
      getFundamentals: async () => fundamentals,
      getCandles: async () => candles,
      saveDocument: async (doc: any) => saved.push(doc),
    };
  }
  return originalLoad(request, parent, isMain);
};

test('analyseFaTa returns strategy and chart spec', async () => {
  const { analyseFaTa } = await import('../analyse-fa-ta');
  const res = await analyseFaTa.execute({ symbol: 'ABC' }, { session: {} as any });
  assert.ok(['buy', 'wait', 'undetermined'].includes(res.strategy));
  assert.equal(res.chart.interval, '1d');
});

test('analyseFaTa can emit research-fa-ta document', async () => {
  const { analyseFaTa } = await import('../analyse-fa-ta');
  const res: any = await analyseFaTa.execute(
    { symbol: 'ABC', emitArtifact: 'research-fa-ta' },
    { session: { user: { id: 'u1' } } as any },
  );
  assert.equal(saved[0].kind, 'research-fa-ta');
  assert.equal(res.documentId, saved[0].id);
  (Module as any)._load = originalLoad;
});
