import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';

// Sample sentiment and candle data to drive the scan.
const sentiments = [
  { symbol: 'ABC', score: 0.9 },
  { symbol: 'XYZ', score: 0.8 },
];

const breakoutCandles = Array.from({ length: 21 }, (_, i) => ({
  open: 0,
  high: 0,
  low: 0,
  close: i < 20 ? 10 : 12,
  volume: 0,
  tsStart: new Date(),
  tsEnd: new Date(),
}));

const flatCandles = Array.from({ length: 21 }, () => ({
  open: 0,
  high: 0,
  low: 0,
  close: 10,
  volume: 0,
  tsStart: new Date(),
  tsEnd: new Date(),
}));

// Stub database queries before importing the tool.
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === '@/lib/db/queries') {
    return {
      getTopSentimentSymbols: async () => sentiments,
      getCandles: async ({ symbol }: { symbol: string }) =>
        symbol === 'ABC' ? breakoutCandles : flatCandles,
      saveDocument: async (args: any) => {
        (globalThis as any).__saved = args;
      },
    };
  }
  return originalLoad(request, parent, isMain);
};

test('scanOpportunities returns symbols breaking above EMA with positive sentiment', async () => {
  const { scanOpportunities } = await import('../scan-opportunities');
  const res = await scanOpportunities.execute({ limit: 2 });
  assert.deepStrictEqual(res, [{ symbol: 'ABC', score: 0.9 }]);
});

test('scanOpportunities can emit research-opportunity document', async () => {
  const { scanOpportunities } = await import('../scan-opportunities');
  const res: any = await scanOpportunities.execute(
    { limit: 2, emitArtifact: 'research-opportunity' },
    { session: { user: { id: 'u1' } } as any },
  );
  assert.ok(res.documentId);
  assert.equal((globalThis as any).__saved.kind, 'research-opportunity');
});
