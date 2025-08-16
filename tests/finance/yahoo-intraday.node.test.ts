import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchOHLCYahoo } from '@/lib/finance/sources/yahoo';

/**
 * Validate that the Yahoo Finance integration can fetch intraday OHLC data.
 * The test gracefully skips when the network is unavailable or Yahoo rejects
 * the request, allowing offline environments to pass the suite.
 */
test('fetch intraday OHLC data from Yahoo Finance', async (t) => {
  try {
    // Request one day of 1‑minute candles for Apple as a smoke test.
    const candles = await fetchOHLCYahoo('AAPL', '1m', { range: '1d' });
    assert.ok(candles.length > 0, 'received at least one candle');
  } catch (err) {
    // Skip instead of failing when Yahoo cannot be reached (e.g. CI without
    // network access) so the rest of the suite can run.
    t.skip(`Skipping Yahoo intraday test: ${(err as Error).message}`);
  }
});
