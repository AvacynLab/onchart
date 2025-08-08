import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';

const fundamentals = { symbol: 'ABC', json: { pe: 20 }, updatedAt: new Date() };
const sentiment = { score: 0.5, histogram: [] };
const candles = Array.from({ length: 20 }, (_, i) => ({
  open: 0,
  high: 0,
  low: 0,
  close: i + 1,
  volume: 0,
  tsStart: new Date(),
  tsEnd: new Date(),
}));

// Stub the database before importing the tool module.
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === '@/lib/db/queries') {
    return {
      getFundamentals: async () => fundamentals,
      getSentiment24h: async () => sentiment,
      getCandles: async () => candles,
    };
  }
  return originalLoad(request, parent, isMain);
};

test('analyseAsset aggregates fundamentals, sentiment and technical data', async () => {
  const { analyseAsset } = await import('../analyse-asset');
  const res = await analyseAsset.execute({ symbol: 'ABC' });
  assert.deepStrictEqual(res.fundamentals, fundamentals);
  assert.deepStrictEqual(res.sentiment, sentiment);
  assert.equal(res.technical.trend, 'above');
  assert.ok(typeof res.technical.ema20 === 'number');
});
