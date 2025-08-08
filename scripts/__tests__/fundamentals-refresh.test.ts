import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refreshFundamentals } from '../fundamentals-refresh';

// Mock environment variables used by the script
process.env.FMP_API_KEY = 'fmp';
process.env.IEX_CLOUD_KEY = 'iex';

// Helper to collect database operations for inspection
interface Operation {
  insert: any;
  update: any;
}

test('refreshFundamentals upserts combined provider data', async () => {
  const ops: Operation[] = [];
  const db = {
    insert: () => ({
      values: (val: any) => ({
        onConflictDoUpdate: ({ set }: any) => {
          ops.push({ insert: val, update: set });
          return Promise.resolve();
        },
      }),
    }),
  } as any;

  const fetchMock = async (url: string) => {
    if (url.includes('financialmodelingprep')) {
      return { json: async () => [{ revenue: 100 }] } as any;
    }
    return { json: async () => ({ peRatio: 10 }) } as any;
  };

  await refreshFundamentals(db, ['AAPL'], fetchMock);

  assert.equal(ops.length, 1);
  const { insert, update } = ops[0];
  // Ensure upserted JSON combines both providers
  assert.deepStrictEqual(insert.json, {
    fmp: { revenue: 100 },
    iex: { peRatio: 10 },
  });
  // Update payload should match insert payload
  assert.deepStrictEqual(update.json, insert.json);
  assert.equal(insert.symbol, 'AAPL');
  assert.ok(insert.updatedAt instanceof Date);
});
