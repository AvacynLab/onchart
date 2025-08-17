import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchDailyStooq } from '../../lib/finance/sources/stooq';
import { DataSourceError } from '../../lib/finance/errors';

// Helper to override global fetch within a test
async function withMockFetch<T>(impl: typeof fetch, fn: () => Promise<T>): Promise<T> {
  const original = global.fetch;
  // @ts-expect-error override for tests
  global.fetch = impl;
  try {
    return await fn();
  } finally {
    // @ts-expect-error restore
    global.fetch = original;
  }
}

test('throws when Stooq returns less than two candles', async () => {
  const csv = 'Date,Open,High,Low,Close,Volume\n2024-01-01,10,10,10,10,0\n';
  const mock: typeof fetch = async () => new Response(csv, { status: 200 });
  await assert.rejects(
    withMockFetch(mock, () => fetchDailyStooq('AAPL')),
    DataSourceError,
  );
});

test('computes change percent from two candles', async () => {
  const csv =
    'Date,Open,High,Low,Close,Volume\n2024-01-01,10,10,10,10,0\n2024-01-02,15,15,15,15,0\n';
  const mock: typeof fetch = async () => new Response(csv, { status: 200 });
  const candles = await withMockFetch(mock, () => fetchDailyStooq('AAPL'));
  assert.equal(candles.length, 2);
  const changePercent =
    ((candles[1].close - candles[0].close) / candles[0].close) * 100;
  assert.ok(Math.abs(changePercent - 50) < 1e-6);
});
