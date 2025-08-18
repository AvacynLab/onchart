import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchKlinesBinance } from '../../lib/finance/sources/binance';

// Binance variation calculation relies on at least two klines.
test('fetchKlinesBinance returns typed klines allowing variation calculation', async () => {
  const mockData = [
    // open time, open, high, low, close, volume
    [0, '100', '120', '90', '100', '0'],
    [60, '110', '130', '105', '110', '0'],
  ];
  const mockFetch: typeof fetch = async () =>
    new Response(JSON.stringify(mockData), { status: 200 });

  const klines = await fetchKlinesBinance('BTC-USD', '1m', 2, mockFetch);
  assert.equal(klines.length, 2);
  assert.deepEqual(klines[0], {
    openTime: 0,
    open: 100,
    high: 120,
    low: 90,
    close: 100,
  });
  const change = klines[1].close - klines[0].close;
  assert.equal(change, 10);
});
