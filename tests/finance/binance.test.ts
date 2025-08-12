import { test, expect } from '@playwright/test';
import { fetchKlinesBinance } from '../../lib/finance/sources/binance';

/**
 * Binance tests verify retry logic by simulating a transient failure on the
 * first fetch and returning sample candle data on the second attempt.
 */
test('fetchKlinesBinance retries after failure and parses candles', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = (async () => {
    calls += 1;
    if (calls === 1) {
      throw new Error('temporary');
    }
    return new Response(
      JSON.stringify([[0, '1', '2', '0.5', '1.5', '1000']]),
      { status: 200 },
    );
  }) as any;
  const data = await fetchKlinesBinance('BTCUSDT', '1m', 1);
  expect(calls).toBe(2); // ensure a retry occurred
  expect(data).toEqual([
    { time: 0, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1000 },
  ]);
  global.fetch = originalFetch;
});
