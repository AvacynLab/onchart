import { test, expect } from '@playwright/test';
import { fetchDailyStooq } from '../../lib/finance/sources/stooq';

/**
 * Stooq tests stub the CSV endpoint and force one failure to ensure the
 * retry logic in {@link fetchWithRetry} is exercised.
 */
test('fetchDailyStooq retries and parses CSV data', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = (async () => {
    calls += 1;
    if (calls === 1) {
      throw new Error('temporary');
    }
    return new Response(
      'Date,Open,High,Low,Close,Volume\n2024-01-01,1,2,0.5,1.5,1000',
      { status: 200 },
    );
  }) as any;

  const data = await fetchDailyStooq('AAPL');
  expect(calls).toBe(2);
  expect(data).toEqual([
    { time: 1704067200, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1000 },
  ]);

  global.fetch = originalFetch;
});

