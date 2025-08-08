import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getChart } from '../get-chart';

// Ensure the tool builds the correct URL and chart specification

test('getChart returns URL and spec for symbol/interval', async () => {
  const result = await getChart.execute({ symbol: 'AAPL', interval: '1d' });
  assert.equal(result.url, '/api/market/AAPL/candles/1d');
  assert.equal(result.spec.symbol, 'AAPL');
  assert.equal(result.spec.interval, '1d');
  assert.equal(result.spec.type, 'candlestick');
});
